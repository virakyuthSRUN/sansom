const express = require("express");
const router = express.Router();
const TellerService = require("../services/teller-service");
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client (NO AWAIT HERE - this is synchronous)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

// Initialize Teller service (NO AWAIT HERE)
let tellerService;
try {
  tellerService = new TellerService();
} catch (error) {
  console.error("❌ Failed to initialize TellerService:", error.message);
}

/**
 * GET /api/teller/config
 */
router.get("/config", (req, res) => {
  // No async needed here - just returning config
  if (!process.env.TELLER_APP_ID) {
    return res.status(500).json({
      success: false,
      error: "Teller not configured",
    });
  }

  res.json({
    success: true,
    config: {
      applicationId: process.env.TELLER_APP_ID,
      environment: process.env.TELLER_ENVIRONMENT || "sandbox",
      products: ["transactions", "balance"],
    },
  });
});

/**
 * POST /api/teller/callback
 */
router.post("/callback", async (req, res) => {
  // ✅ async here is correct
  try {
    const { accessToken, enrollment, userId } = req.body;

    if (!accessToken || !enrollment || !userId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    // Fetch initial accounts
    const accounts = await tellerService.getAccounts(accessToken); // ✅ await inside async function

    // Store token in Supabase
    const { error: upsertError } = await supabase // ✅ await inside async function
      .from("bank_connections")
      .upsert({
        user_id: userId,
        access_token: accessToken,
        institution_name: enrollment.institution.name,
        institution_id: enrollment.institution.id,
        enrollment_id: enrollment.id,
        status: "active",
        last_sync: new Date().toISOString(),
        connected_at: new Date().toISOString(),
        accounts: accounts,
      });

    if (upsertError) {
      console.error("❌ Supabase upsert error:", upsertError);
      return res.status(500).json({
        success: false,
        error: "Failed to save connection",
      });
    }

    console.log(
      `✅ User ${userId} connected to ${enrollment.institution.name}`,
    );

    res.json({
      success: true,
      accounts,
      bankName: enrollment.institution.name,
      message: `Successfully connected to ${enrollment.institution.name}`,
    });
  } catch (error) {
    console.error("❌ Teller callback error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process bank connection",
    });
  }
});

// Helper function (this is fine - it's a function declaration)
async function getUserToken(userId) {
  // ✅ async function is correct
  const { data, error } = await supabase // ✅ await inside async function
    .from("bank_connections")
    .select("access_token, institution_name, connected_at")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (error || !data) {
    return null;
  }

  return {
    accessToken: data.access_token,
    institution: { name: data.institution_name },
    connectedAt: data.connected_at,
  };
}

// GET /api/teller/accounts/:userId
router.get("/accounts/:userId", async (req, res) => {
  // ✅ async here
  try {
    const { userId } = req.params;
    const tokenData = await getUserToken(userId); // ✅ await inside async function

    if (!tokenData) {
      return res.status(404).json({
        success: false,
        error: "No bank connected",
        needsConnect: true,
      });
    }

    const accounts = await tellerService.getAccounts(tokenData.accessToken); // ✅ await

    res.json({
      success: true,
      accounts,
      bankName: tokenData.institution.name,
    });
  } catch (error) {
    console.error("❌ Get accounts error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch accounts",
    });
  }
});

router.get("/transactions/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { fromDate, toDate } = req.query;
    const tokenData = await getUserToken(userId);

    if (!tokenData) {
      return res.status(404).json({
        success: false,
        error: "No bank connected",
        needsConnect: true,
      });
    }

    // Get all transactions with optional date filters
    const options = {};
    if (fromDate) options.fromDate = fromDate;
    if (toDate) options.toDate = toDate;

    const transactions = await tellerService.getAllTransactions(
      tokenData.accessToken,
      options,
    );

    // Calculate category breakdown
    const { categoryTotals, totalSpent } =
      tellerService.calculateCategorySpend(transactions);

    // Store transactions in Supabase (optional - for history)
    if (transactions.length > 0) {
      const transactionsToStore = transactions.map((t) => ({
        user_id: userId,
        transaction_id: t.id,
        date: t.date,
        description: t.description,
        amount: t.amount,
        category: t.category,
        merchant: t.merchant,
        bank: t.bank,
        raw_data: t,
      }));

      // Insert in batches to avoid rate limits
      for (let i = 0; i < transactionsToStore.length; i += 50) {
        const batch = transactionsToStore.slice(i, i + 50);
        await supabase
          .from("transactions")
          .upsert(batch, { onConflict: "transaction_id" });
      }
    }

    res.json({
      success: true,
      transactions,
      categoryBreakdown: categoryTotals,
      totalSpent,
      bankName: tokenData.institution.name,
      count: transactions.length,
    });
  } catch (error) {
    console.error("❌ Get transactions error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch transactions",
    });
  }
});

/**
 * GET /api/teller/balances/:userId
 * Get balances for all user accounts
 */
router.get("/balances/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const tokenData = await getUserToken(userId);

    if (!tokenData) {
      return res.status(404).json({
        success: false,
        error: "No bank connected",
        needsConnect: true,
      });
    }

    // Get all accounts first
    const accounts = await tellerService.getAccounts(tokenData.accessToken);

    // Get balances for each account
    const balances = [];
    for (const account of accounts) {
      const balance = await tellerService.getBalances(
        tokenData.accessToken,
        account.id,
      );
      balances.push({
        accountId: account.id,
        accountName: account.name,
        accountType: account.type,
        lastFour: account.last_four,
        balance,
        institution: account.institution.name,
      });
    }

    // Calculate total balance
    const totalBalance = balances.reduce((sum, acc) => {
      return sum + (acc.balance.ledger || 0);
    }, 0);

    res.json({
      success: true,
      balances,
      totalBalance,
      bankName: tokenData.institution.name,
    });
  } catch (error) {
    console.error("❌ Get balances error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch balances",
    });
  }
});

/**
 * POST /api/teller/disconnect/:userId
 * Disconnect bank account
 */
router.post("/disconnect/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    // Update status in Supabase instead of deleting
    const { error } = await supabase
      .from("bank_connections")
      .update({
        status: "disconnected",
        disconnected_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      console.error("❌ Supabase disconnect error:", error);
      return res.status(500).json({
        success: false,
        error: "Failed to disconnect",
      });
    }

    console.log(`✅ User ${userId} disconnected from bank`);

    res.json({
      success: true,
      message: "Bank disconnected successfully",
    });
  } catch (error) {
    console.error("❌ Disconnect error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to disconnect",
    });
  }
});

/**
 * GET /api/teller/status/:userId
 * Check connection status
 */
router.get("/status/:userId", async (req, res) => {
  const { userId } = req.params;

  const { data, error } = await supabase
    .from("bank_connections")
    .select("institution_name, connected_at, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  res.json({
    success: true,
    connected: !!data,
    bankName: data?.institution_name || null,
    connectedAt: data?.connected_at || null,
  });
});

module.exports = router;
