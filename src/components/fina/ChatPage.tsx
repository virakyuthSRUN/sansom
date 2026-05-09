import { useState, useEffect, useRef } from "react";
import { Send, Trash2 } from "lucide-react";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { getOrCreateChatUserId } from "@/lib/userId";

interface ChatResponse {
  success: boolean;
  response: string;
}

interface Msg {
  role: "user" | "ai";
  text: string;
  timestamp?: number;
}

// Define the complete financial data interface
interface CompleteFinancialData {
  startingBalance: number;
  totalIncome: number;
  totalSpent: number;
  currentBalance: number;
  netCashFlow: number;
  monthlyBudget: number;
  bnplCount: number;
  bnplTotal: number;
  bnplMonthly: number;
  riskScore: number;
  savingsRate: number;
  transactions: any[];
  bnpls: any[]; // Add bnpls array
}
const getRiskLevel = (score: number) => {
  if (score >= 80) {
    return {
      label: "CRITICAL",
      color: "text-red-600",
    };
  }

  if (score >= 60) {
    return {
      label: "HIGH",
      color: "text-orange-500",
    };
  }

  if (score >= 40) {
    return {
      label: "MEDIUM",
      color: "text-yellow-500",
    };
  }

  if (score >= 20) {
    return {
      label: "LOW",
      color: "text-blue-500",
    };
  }

  return {
    label: "SAFE",
    color: "text-green-600",
  };
};
const SUGGESTIONS = [
  "How's my spending?",
  "Am I at risk of debt?",
  "How do I save for a trip?",
  "What's BNPL risk?",
  "Can I afford a new purchase?",
  "Review my budget",
];

// Generate welcome message with personalized real data
const generateWelcomeMessage = (
  name: string,
  monthlySpent: number,
  monthlyBudget: number,
  debtRisk: string,
  bnplCount: number,
  currentBalance: number,
  netCashFlow: number,
  formatCurrency: (amount: number) => string,
) => {
  const hasBudget = monthlyBudget > 0;
  const spentPct = hasBudget
    ? Math.round((monthlySpent / monthlyBudget) * 100)
    : 0;
  const remaining = hasBudget ? monthlyBudget - monthlySpent : 0;

  const budgetLine = hasBudget
    ? `• You've spent ${formatCurrency(monthlySpent)} this month (${spentPct}% of your ${formatCurrency(monthlyBudget)} budget)\n• Remaining budget: ${formatCurrency(remaining)}`
    : `• You've spent ${formatCurrency(monthlySpent)} this month (no budget set yet)`;

  const bnplLine =
    bnplCount > 0
      ? `\n• ${bnplCount} active BNPL plan${bnplCount !== 1 ? "s" : ""} detected`
      : `\n• No active BNPL plans`;

  const balanceLine = `\n• Current balance: ${formatCurrency(currentBalance)}`;
  const cashFlowLine =
    netCashFlow >= 0
      ? `• Net savings this month: +${formatCurrency(netCashFlow)}`
      : `• Net deficit this month: ${formatCurrency(netCashFlow)}`;

  return `Hi ${name}! 👋 I'm SAMSOM, your AI financial advisor.

Here's your current financial snapshot:
${budgetLine}${bnplLine}${balanceLine}${cashFlowLine}
- Debt risk level: ${debtRisk}

I can help you with:
- Budget tracking and analysis
- Spending insights
- Debt management advice
- Savings goals
- BNPL risk assessment

What specific financial question can I help you with today?`;
};

const CHAT_STORAGE_KEY = "sansom-chat-history";

// Helper function to calculate debt risk score
const calculateDebtRiskScore = (
  income: number,
  bnpls: any[],
  monthlySpent: number,
  monthlyBudget: number,
): number => {
  const bnplCount = bnpls.length;

  // If there are NO BNPL plans, score should be 0
  if (bnplCount === 0) {
    return 0;
  }

  if (income <= 0) return bnplCount * 10;

  const totalMonthlyBnpl = bnpls.reduce(
    (sum, b) => sum + (b.monthly || b.amount / 3),
    0,
  );
  const totalBnplDebt = bnpls.reduce((sum, b) => sum + b.amount, 0);
  const dtiRatio = (totalMonthlyBnpl / income) * 100;
  const bnplDebtRatio = (totalBnplDebt / income) * 100;
  const spendingRatio =
    monthlyBudget > 0
      ? (monthlySpent / monthlyBudget) * 100
      : (monthlySpent / (income || 1)) * 100;

  let score = 0;

  // Factor 1: BNPL count (max 30 points)
  if (bnplCount >= 4) score += 30;
  else if (bnplCount === 3) score += 25;
  else if (bnplCount === 2) score += 18;
  else if (bnplCount === 1) score += 10;

  // Factor 2: Debt-to-income ratio (max 35 points)
  if (dtiRatio > 50) score += 35;
  else if (dtiRatio > 40) score += 30;
  else if (dtiRatio > 30) score += 25;
  else if (dtiRatio > 25) score += 20;
  else if (dtiRatio > 20) score += 15;
  else if (dtiRatio > 15) score += 10;
  else if (dtiRatio > 10) score += 5;

  // Factor 3: BNPL debt relative to income (max 20 points)
  if (bnplDebtRatio > 60) score += 20;
  else if (bnplDebtRatio > 45) score += 15;
  else if (bnplDebtRatio > 30) score += 10;
  else if (bnplDebtRatio > 15) score += 5;

  // Factor 4: Spending behavior (max 15 points)
  if (spendingRatio > 100) score += 15;
  else if (spendingRatio > 90) score += 12;
  else if (spendingRatio > 75) score += 8;
  else if (spendingRatio > 60) score += 5;

  return Math.min(100, Math.round(score));
};

const ChatPage = () => {
  const { data: financialData, refreshData } = useFinancialData();
  const { profile } = useUserProfile();
  const { format: formatCurrency, currency } = useCurrency();

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [userId] = useState(() => getOrCreateChatUserId());

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // Get complete financial data from tracker
  const getCompleteFinancialData = (): CompleteFinancialData => {
    try {
      const trackerUserId = localStorage.getItem("tracker_user_id");
      console.log("🔍 Tracker User ID:", trackerUserId);

      if (trackerUserId) {
        // Get starting balance
        const startingBalanceStr = localStorage.getItem(
          `starting-balance-${trackerUserId}`,
        );
        const startingBalance = startingBalanceStr
          ? parseFloat(startingBalanceStr)
          : 0;

        // Get stored tracker data
        const storedData = localStorage.getItem(
          `financial-data-${trackerUserId}`,
        );
        console.log("💾 Raw stored data:", storedData);

        let totalSpent = 0;
        let totalIncome = 0;
        let transactions: any[] = [];

        if (storedData) {
          const data = JSON.parse(storedData);
          totalSpent = data.totalSpent || 0;
          totalIncome = data.totalIncome || 0;
          transactions = data.transactions || [];
        }

        // Get cash entries
        const cashEntriesStr = localStorage.getItem(
          `cash-entries-${trackerUserId}`,
        );
        const cashEntries = cashEntriesStr ? JSON.parse(cashEntriesStr) : [];

        // Get BNPL data from context
        const bnplsFromContext = financialData.bnpls || [];
        const bnplTotal = bnplsFromContext.reduce(
          (sum, plan) => sum + plan.amount,
          0,
        );
        const bnplMonthly = bnplsFromContext.reduce(
          (sum, plan) => sum + (plan.monthly || plan.amount / 3),
          0,
        );

        // Calculate current balance
        const currentBalance = startingBalance + totalIncome - totalSpent;
        const netCashFlow = totalIncome - totalSpent;

        // Get monthly budget from profile
        const monthlyBudget = profile?.monthly_budget || 0;

        // Calculate debt risk score
        const riskScore = calculateDebtRiskScore(
          totalIncome,
          bnplsFromContext,
          totalSpent,
          monthlyBudget,
        );

        // Calculate savings rate
        const savingsRate =
          totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;

        console.log("💰 Complete Financial Data:", {
          startingBalance,
          totalIncome,
          totalSpent,
          currentBalance,
          netCashFlow,
          monthlyBudget,
          bnplCount: bnplsFromContext.length,
          bnplTotal,
          bnplMonthly,
          riskScore,
          savingsRate,
          cashEntriesCount: cashEntries.length,
          transactionsCount: transactions.length,
        });

        return {
          startingBalance,
          totalIncome,
          totalSpent,
          currentBalance,
          netCashFlow,
          monthlyBudget,
          bnplCount: bnplsFromContext.length,
          bnplTotal,
          bnplMonthly,
          riskScore,
          savingsRate,
          transactions: [...transactions, ...cashEntries],
          bnpls: bnplsFromContext, // Include bnpls array
        };
      }
    } catch (error) {
      console.error("Error reading tracker data:", error);
    }

    // Fallback to context data
    const bnplsFromContext = financialData.bnpls || [];
    const bnplTotal = bnplsFromContext.reduce(
      (sum, plan) => sum + plan.amount,
      0,
    );
    const bnplMonthly = bnplsFromContext.reduce(
      (sum, plan) => sum + (plan.monthly || plan.amount / 3),
      0,
    );
    const riskScore = calculateDebtRiskScore(
      financialData.moneyIn,
      bnplsFromContext,
      financialData.monthlySpent,
      financialData.monthlyBudget,
    );
    const netCashFlow =
      (financialData.moneyIn || 0) - financialData.monthlySpent;
    const savingsRate =
      (financialData.moneyIn || 0) > 0
        ? (netCashFlow / (financialData.moneyIn || 1)) * 100
        : 0;

    console.log("⚠️ Using fallback context data:", {
      monthlySpent: financialData.monthlySpent,
      monthlyBudget: financialData.monthlyBudget,
      balance: financialData.balance,
      bnplCount: bnplsFromContext.length,
      bnplTotal,
      bnplMonthly,
      riskScore,
      savingsRate,
    });

    return {
      startingBalance: financialData.startingBalance || 0,
      totalIncome: financialData.moneyIn || 0,
      totalSpent: financialData.monthlySpent,
      currentBalance: financialData.balance,
      netCashFlow: netCashFlow,
      monthlyBudget: financialData.monthlyBudget,
      bnplCount: bnplsFromContext.length,
      bnplTotal,
      bnplMonthly,
      riskScore,
      savingsRate,
      transactions: financialData.transactions || [],
      bnpls: bnplsFromContext,
    };
  };

  // Get personalized welcome with complete data
  const getPersonalizedWelcome = () => {
    const name = profile?.full_name?.split(" ")[0] || "Student";
    const financialDataComplete = getCompleteFinancialData();

    const debtRiskLevel =
      financialDataComplete.riskScore >= 60
        ? "HIGH"
        : financialDataComplete.riskScore >= 30
          ? "MEDIUM"
          : "LOW";

    return generateWelcomeMessage(
      name,
      financialDataComplete.totalSpent,
      financialDataComplete.monthlyBudget,
      debtRiskLevel,
      financialDataComplete.bnplCount,
      financialDataComplete.currentBalance,
      financialDataComplete.netCashFlow,
      formatCurrency,
    );
  };

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedChats = localStorage.getItem(`${CHAT_STORAGE_KEY}-${userId}`);
    if (savedChats) {
      try {
        const parsed = JSON.parse(savedChats);
        setMsgs(parsed);
      } catch (e) {
        console.error("Failed to parse saved chat history:", e);
        setMsgs([
          { role: "ai", text: getPersonalizedWelcome(), timestamp: Date.now() },
        ]);
      }
    } else {
      setMsgs([
        { role: "ai", text: getPersonalizedWelcome(), timestamp: Date.now() },
      ]);
    }
  }, [userId]);

  // Save to localStorage whenever messages change
  useEffect(() => {
    if (msgs.length > 0) {
      localStorage.setItem(
        `${CHAT_STORAGE_KEY}-${userId}`,
        JSON.stringify(msgs),
      );
    }
  }, [msgs, userId]);

  // Refresh data periodically to stay in sync
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [refreshData]);

  const send = async (text: string) => {
    if (!text.trim() || typing) return;

    const userMsg: Msg = { role: "user", text, timestamp: Date.now() };
    setMsgs((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    try {
      // Get complete financial data
      const financialDataComplete = getCompleteFinancialData();

      // Calculate debt-to-income ratio
      const dtiRatio =
        financialDataComplete.totalIncome > 0
          ? (financialDataComplete.bnplMonthly /
              financialDataComplete.totalIncome) *
            100
          : 0;

      const requestBody = {
        userId: userId,
        message: text,
        currency: {
          code: currency.code,
          symbol: currency.symbol,
        },
        context: {
          // Financial summary
          startingBalance: financialDataComplete.startingBalance,
          totalIncome: financialDataComplete.totalIncome,
          totalSpent: financialDataComplete.totalSpent,
          currentBalance: financialDataComplete.currentBalance,
          netCashFlow: financialDataComplete.netCashFlow,
          savingsRate: financialDataComplete.savingsRate,

          // Budget info
          monthlyBudget: financialDataComplete.monthlyBudget,
          hasBudget: financialDataComplete.monthlyBudget > 0,

          // BNPL info
          bnplCount: financialDataComplete.bnplCount,
          bnplTotal: financialDataComplete.bnplTotal,
          bnplMonthly: financialDataComplete.bnplMonthly,
          dtiRatio: dtiRatio,
          bnpls: financialDataComplete.bnpls, // Now this exists

          // Risk assessment
          debtRiskScore: financialDataComplete.riskScore,
          debtRisk:
            financialDataComplete.riskScore >= 60
              ? "HIGH"
              : financialDataComplete.riskScore >= 30
                ? "MEDIUM"
                : "LOW",

          // Transactions
          recentTransactions: financialDataComplete.transactions.slice(-10),
          transactionCount: financialDataComplete.transactions.length,
        },
      };

      console.log(
        "📤 Sending complete financial data to backend:",
        JSON.stringify(requestBody, null, 2),
      );

      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data: ChatResponse = await response.json();
      console.log("📥 Received from backend:", data);

      const aiMsg: Msg = {
        role: "ai",
        text: data.success
          ? data.response
          : "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: Date.now(),
      };

      setMsgs((prev) => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      setMsgs((prev) => [
        ...prev,
        {
          role: "ai",
          text: "Network error. Please check your connection and try again.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear all chat history?")) {
      const welcomeMsg: Msg = {
        role: "ai",
        text: getPersonalizedWelcome(),
        timestamp: Date.now(),
      };
      setMsgs([welcomeMsg]);
      localStorage.setItem(
        `${CHAT_STORAGE_KEY}-${userId}`,
        JSON.stringify([welcomeMsg]),
      );
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, typing]);

  // Get latest financial data for header display
  const latestFinancialData = getCompleteFinancialData();
  const debtRiskLevel =
    latestFinancialData.riskScore >= 60
      ? "HIGH"
      : latestFinancialData.riskScore >= 30
        ? "MEDIUM"
        : "LOW";

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="pb-3 border-b border-border mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center">
              <img
                src="public/favicon.ico"
                alt="Logo"
                className="w-7 h-7 object-contain"
              />
            </div>
            <div>
              <p className="text-[15px] font-bold text-foreground">
                SAMSOM AI Advisor
              </p>
              <p className="text-[11px] text-primary font-medium">
                ● Online · Powered by AI
              </p>
            </div>
          </div>

          {msgs.length > 1 && (
            <button
              onClick={clearHistory}
              className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-destructive/10 transition-colors group"
              title="Clear chat history"
            >
              <Trash2 className="w-4 h-4 text-muted-foreground group-hover:text-destructive" />
            </button>
          )}
        </div>

        {/* Real-time financial snapshot from tracker */}
        <div className="mt-2 grid grid-cols-3 gap-2 text-[10px]">
          <div className="bg-muted/50 rounded-lg p-1.5 text-center">
            <p className="text-muted-foreground">Balance</p>
            <p
              className={`font-bold ${latestFinancialData.currentBalance >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatCurrency(latestFinancialData.currentBalance)}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-1.5 text-center">
            <p className="text-muted-foreground">Spent</p>
            <p className="font-bold text-red-600">
              {formatCurrency(latestFinancialData.totalSpent)}
              {latestFinancialData.monthlyBudget > 0 &&
                ` / ${formatCurrency(latestFinancialData.monthlyBudget)}`}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-1.5 text-center">
            <p className="text-muted-foreground">Risk</p>
            <p
              className={`font-bold ${
                debtRiskLevel === "HIGH"
                  ? "text-destructive"
                  : debtRiskLevel === "MEDIUM"
                    ? "text-warning"
                    : "text-primary"
              }`}
            >
              {debtRiskLevel}
              {latestFinancialData.bnplCount > 0 &&
                ` (${latestFinancialData.bnplCount} BNPL)`}
            </p>
          </div>
        </div>

        {/* Additional stats */}
        <div className="mt-2 flex justify-between text-[9px] text-muted-foreground">
          <span>
            💰 Income: {formatCurrency(latestFinancialData.totalIncome)}
          </span>
          <span>
            💸 Net: {latestFinancialData.netCashFlow >= 0 ? "+" : ""}
            {formatCurrency(latestFinancialData.netCashFlow)}
          </span>
          <span>📊 Savings: {latestFinancialData.savingsRate.toFixed(0)}%</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-2.5 pb-2">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`flex animate-slide-up ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.role === "ai" && (
              <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center mr-1.5 flex-shrink-0 self-end">
                <img
                  src="public/favicon.ico"
                  alt="Logo"
                  className="w-5 h-5 object-contain"
                />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line ${
                m.role === "user"
                  ? "gradient-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground border border-border rounded-bl-sm"
              }`}
            >
              {m.text}
              {m.timestamp && (
                <div className="text-[8px] mt-1 opacity-50">
                  {new Date(m.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center mr-1.5 flex-shrink-0 self-end">
              <img
                src="public/favicon.ico"
                alt="Logo"
                className="w-5 h-5 object-contain"
              />
            </div>
            <div className="bg-muted border border-border rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-pulse"
                  style={{ animationDelay: `${i * 0.2}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div className="border-t border-border pt-3">
        <div className="flex gap-1.5 flex-wrap mb-2.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-[10px] px-2.5 py-1 rounded-full border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="Ask SAMSOM about your finances..."
            className="flex-1 px-3.5 py-3 rounded-xl border-[1.5px] border-border text-sm text-foreground outline-none focus:border-primary transition-colors bg-card"
          />
          <button
            onClick={() => send(input)}
            disabled={typing || !input.trim()}
            className="gradient-primary text-primary-foreground rounded-xl px-4 py-3 font-semibold text-sm shadow-primary hover:shadow-primary-hover transition-all flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
