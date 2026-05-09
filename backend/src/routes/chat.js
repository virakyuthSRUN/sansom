const express = require("express");
const router = express.Router();
const GroqService = require("../services/groq-service");

// Currency exchange rates (relative to MYR)
const EXCHANGE_RATES = {
  MYR: 1,
  USD: 0.21,
  KHR: 850,
  IDR: 3400,
};

// Convert amount from MYR to target currency
const convertCurrency = (amountInMYR, currencyCode) => {
  const rate = EXCHANGE_RATES[currencyCode] || 1;
  return amountInMYR * rate;
};

// Initialize Groq service
console.log("🔑 Initializing Groq service with API key:", !!process.env.GROQ_API_KEY);
const groq = new GroqService(process.env.GROQ_API_KEY);

// POST /api/chat
router.post("/", async (req, res) => {
  try {
    const { userId, message, context, currency } = req.body;

    // Get currency code and symbol (default to MYR)
    const currencyCode = currency?.code || "MYR";
    const currencySymbol = currency?.symbol || "RM";

    console.log("=".repeat(50));
    console.log("📨 Chat request received:");
    console.log("User:", userId);
    console.log("Message:", message);
    console.log("Currency:", currency);
    
    // Log all context data received
    console.log("📊 Full Context from frontend:", {
      startingBalance: context?.startingBalance,
      totalIncome: context?.totalIncome,
      totalSpent: context?.totalSpent,
      currentBalance: context?.currentBalance,
      netCashFlow: context?.netCashFlow,
      savingsRate: context?.savingsRate,
      monthlyBudget: context?.monthlyBudget,
      hasBudget: context?.hasBudget,
      bnplCount: context?.bnplCount,
      bnplTotal: context?.bnplTotal,
      bnplMonthly: context?.bnplMonthly,
      dtiRatio: context?.dtiRatio,
      debtRiskScore: context?.debtRiskScore,
      debtRisk: context?.debtRisk,
      transactionCount: context?.transactionCount,
    });
    console.log("=".repeat(50));

    // Extract ALL data from context (use frontend-provided values)
    const startingBalance = Number(context?.startingBalance) || 0;
    const totalIncome = Number(context?.totalIncome) || 0;
    const totalSpent = Number(context?.totalSpent) || 0;
    const currentBalance = Number(context?.currentBalance) || 0;
    const netCashFlow = Number(context?.netCashFlow) || 0;
    const savingsRate = Number(context?.savingsRate) || 0;
    const monthlyBudget = Number(context?.monthlyBudget) || 0;
    const hasBudget = context?.hasBudget || false;
    const bnplCount = Number(context?.bnplCount) || 0;
    const bnplTotal = Number(context?.bnplTotal) || 0;
    const bnplMonthly = Number(context?.bnplMonthly) || 0;
    const dtiRatio = Number(context?.dtiRatio) || 0;
    const debtRiskScore = Number(context?.debtRiskScore) || 0;
    const debtRisk = context?.debtRisk || "LOW";

    // Convert amounts to selected currency
    const spentConverted = convertCurrency(totalSpent, currencyCode);
    const budgetConverted = convertCurrency(monthlyBudget, currencyCode);
    const remainingConverted = convertCurrency(monthlyBudget - totalSpent, currencyCode);
    const balanceConverted = convertCurrency(currentBalance, currencyCode);
    const bnplTotalConverted = convertCurrency(bnplTotal, currencyCode);
    const bnplMonthlyConverted = convertCurrency(bnplMonthly, currencyCode);
    const incomeConverted = convertCurrency(totalIncome, currencyCode);
    const netCashFlowConverted = convertCurrency(netCashFlow, currencyCode);

    // Calculate spending percentage
    const spentPercent = monthlyBudget > 0 ? (totalSpent / monthlyBudget) * 100 : 0;

    // Determine if over budget
    const isOverBudget = totalSpent > monthlyBudget;
    const overspentAmount = isOverBudget ? totalSpent - monthlyBudget : 0;

    console.log("📊 Processed AI Context (converted to selected currency):", {
      startingBalance: startingBalance,
      totalIncome: incomeConverted.toFixed(2),
      totalSpent: spentConverted.toFixed(2),
      currentBalance: balanceConverted.toFixed(2),
      netCashFlow: netCashFlowConverted.toFixed(2),
      savingsRate: savingsRate.toFixed(1) + "%",
      monthlyBudget: budgetConverted.toFixed(2),
      hasBudget,
      bnplCount,
      bnplTotal: bnplTotalConverted.toFixed(2),
      bnplMonthly: bnplMonthlyConverted.toFixed(2),
      dtiRatio: dtiRatio.toFixed(1) + "%",
      debtRiskScore,
      debtRisk,
      spentPercent: spentPercent.toFixed(1) + "%",
      isOverBudget,
      overspentAmount: overspentAmount.toFixed(2),
      currencySymbol,
      currencyCode,
    });

    const aiContext = {
      // Financial summary
      startingBalance: startingBalance,
      totalIncome: incomeConverted,
      totalSpent: spentConverted,
      currentBalance: balanceConverted,
      netCashFlow: netCashFlowConverted,
      savingsRate: savingsRate,
      
      // Budget info
      monthlyBudget: budgetConverted,
      hasBudget: hasBudget,
      remainingBudget: Math.max(0, budgetConverted - spentConverted),
      spentPercent: spentPercent,
      isOverBudget: isOverBudget,
      overspentAmount: overspentAmount,
      
      // BNPL info
      bnplCount: bnplCount,
      bnplTotal: bnplTotalConverted,
      bnplMonthly: bnplMonthlyConverted,
      dtiRatio: dtiRatio,
      
      // Risk assessment (use frontend-calculated values)
      riskScore: debtRiskScore,
      debtRisk: debtRisk,
      
      // Transactions
      recentTransactions: context?.recentTransactions || [],
      transactionCount: context?.transactionCount || 0,
      
      // Currency
      currencySymbol: currencySymbol,
      currencyCode: currencyCode,
    };

    const advice = await groq.getAdvice(aiContext, message);

    res.json({ success: true, response: advice });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get AI response",
    });
  }
});

module.exports = router;