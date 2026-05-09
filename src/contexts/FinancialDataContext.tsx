import React, { createContext, useContext, useState, useEffect } from "react";
import { useUserProfile } from "./UserProfileContext";
import { GOALS } from "@/lib/constants";

export interface Transaction {
  id: string;
  name: string;
  amount: number;
  cat: string;
  date: string;
  icon: string;
  color: string;
  bank?: string;
  pending?: boolean;
  isCash?: boolean;
}

export interface Goal {
  id: string;
  name: string;
  icon: string;
  target: number;
  saved: number;
  color: string;
  deadline: string;
}

export interface BNPL {
  name: string;
  platform: string;
  amount: number;
  monthly: number;
  rate: number;
  status: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
}

export interface FinancialData {
  balance: number;
  moneyIn: number;
  moneyOut: number;
  monthlySpent: number;
  monthlyBudget: number;
  spendPct: number;
  isBankConnected: boolean;
  debtRisk: "LOW" | "MEDIUM" | "HIGH";
  debtScore: number;
  bnplCount: number;
  bnpls: BNPL[];
  goals: Goal[];
  transactions: Transaction[];
  aiTip: string;
  monthlyTrend: { label: string; val: number; active?: boolean }[];
  startingBalance: number;
}

interface FinancialDataContextType {
  data: FinancialData;
  refreshData: () => Promise<void>;
  loading: boolean;
  updateGoal: (goalId: string, savedAmount: number) => void;
  addTransaction: (transaction: Omit<Transaction, "id">) => void;
  addBNPL: (bnpl: Omit<BNPL, "risk">) => void;
  removeBNPL: (index: number) => void;
  updateFromTracker: (trackerData: {
    totalSpent: number;
    totalIncome: number;
    transactions: Transaction[];
    isConnected: boolean;
    startingBalance: number;
  }) => void;
  updateStartingBalance: (balance: number) => void;
}

const defaultMonthlyTrend = [
  { label: "Oct", val: 820 },
  { label: "Nov", val: 950 },
  { label: "Dec", val: 1100 },
  { label: "Jan", val: 780 },
  { label: "Feb", val: 890 },
  { label: "Mar", val: 620, active: true },
];

// No hardcoded budget — always comes from profile or 0
const getDefaultData = (monthlyBudget: number): FinancialData => ({
  balance: 0,
  moneyIn: 0,
  moneyOut: 0,
  monthlySpent: 0,
  monthlyBudget,
  spendPct: 0,
  isBankConnected: false,
  debtRisk: "LOW",
  debtScore: 0,
  bnplCount: 0,
  bnpls: [],
  goals: GOALS.map((g) => ({ ...g, id: g.id.toString() })),
  transactions: [],
  aiTip: "Connect your bank account to see personalized insights.",
  monthlyTrend: defaultMonthlyTrend.map((t) => ({ ...t, val: 0 })),
  startingBalance: 0,
});

const FinancialDataContext = createContext<FinancialDataContextType | undefined>(undefined);

const calcRisk = (rate: number): "LOW" | "MEDIUM" | "HIGH" =>
  rate < 15 ? "LOW" : rate <= 25 ? "MEDIUM" : "HIGH";

export const FinancialDataProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { profile } = useUserProfile();
  const [loading, setLoading] = useState(false);

  // Use profile budget if available, otherwise 0 (no hardcoded fallback)
  const [data, setData] = useState<FinancialData>(() =>
    getDefaultData(profile?.monthly_budget ?? 0),
  );

  // Sync monthlyBudget whenever profile changes
  useEffect(() => {
    if (profile?.monthly_budget != null) {
      setData((prev) => {
        const budget = profile.monthly_budget;
        return {
          ...prev,
          monthlyBudget: budget,
          // Recalculate spendPct with the new budget
          spendPct:
            budget > 0
              ? Math.round((prev.monthlySpent / budget) * 100)
              : 0,
        };
      });
    }
  }, [profile?.monthly_budget]);

  const updateStartingBalance = (balance: number) => {
    setData((prev) => ({
      ...prev,
      startingBalance: balance,
      // Recalculate balance: starting + income - spending
      balance: balance + prev.moneyIn - prev.moneyOut,
    }));
  };

  const updateFromTracker = (trackerData: {
    totalSpent: number;
    totalIncome: number;
    transactions: Transaction[];
    isConnected: boolean;
    startingBalance: number;
  }) => {
    if (trackerData.isConnected) {
      setData((prev) => {
        const budget = prev.monthlyBudget;
        // Core balance formula: starting + income - spending
        const currentBalance =
          trackerData.startingBalance +
          trackerData.totalIncome -
          trackerData.totalSpent;

        return {
          ...prev,
          isBankConnected: true,
          monthlySpent: trackerData.totalSpent,
          moneyIn: trackerData.totalIncome,
          moneyOut: trackerData.totalSpent,
          transactions: trackerData.transactions,
          startingBalance: trackerData.startingBalance,
          balance: currentBalance,
          spendPct:
            budget > 0
              ? Math.round((trackerData.totalSpent / budget) * 100)
              : 0,
          aiTip: generateAITip(
            trackerData.totalSpent,
            budget,
            trackerData.transactions,
            trackerData.totalIncome,
            trackerData.startingBalance,
          ),
          monthlyTrend: updateMonthlyTrend(trackerData.transactions),
        };
      });

      try {
        const trackerUserId = localStorage.getItem("tracker_user_id");
        if (trackerUserId) {
          localStorage.setItem(
            `financial-data-${trackerUserId}`,
            JSON.stringify({
              totalSpent: trackerData.totalSpent,
              totalIncome: trackerData.totalIncome,
              transactions: trackerData.transactions,
              startingBalance: trackerData.startingBalance,
            }),
          );
        }
      } catch (error) {
        console.error("Error storing financial data:", error);
      }
    } else {
      // On disconnect: reset to defaults but keep goals, BNPLs, and budget
      setData((prev) => ({
        ...getDefaultData(prev.monthlyBudget),
        goals: prev.goals,
        bnpls: prev.bnpls,
        bnplCount: prev.bnplCount,
      }));
    }
  };

  const generateAITip = (
    totalSpent: number,
    budget: number,
    transactions: Transaction[],
    totalIncome: number,
    startingBalance: number,
  ): string => {
    if (totalSpent === 0 && totalIncome === 0)
      return "Start tracking your spending to get personalized insights!";

    const currentBalance = startingBalance + totalIncome - totalSpent;

    if (currentBalance < 0) {
      return `⚠️ Your balance is negative. Consider reducing expenses or adding income.`;
    }

    // Only show budget tip if budget is configured
    if (budget > 0) {
      const percentage = (totalSpent / budget) * 100;
      if (percentage > 80)
        return `You've used ${percentage.toFixed(0)}% of your budget. Consider reducing non-essential spending.`;
      if (percentage > 50)
        return `You're at ${percentage.toFixed(0)}% of your budget. You're on track for a balanced month!`;
      return `Great job! You've only used ${percentage.toFixed(0)}% of your budget. Keep it up!`;
    }

    // No budget set — tip based on cash flow
    const netFlow = totalIncome - totalSpent;
    if (netFlow < 0)
      return `You're spending more than you're earning this month. Review your expenses.`;
    const savingsRate =
      totalIncome > 0 ? ((netFlow / totalIncome) * 100).toFixed(0) : "0";
    return `You're saving ${savingsRate}% of your income this month. Great work!`;
  };

  const updateMonthlyTrend = (
    transactions: Transaction[],
  ): typeof defaultMonthlyTrend => {
    return defaultMonthlyTrend.map((item, index) => ({
      ...item,
      val:
        index === 5
          ? Math.round(
              transactions
                .filter((t) => t.amount < 0)
                .reduce((sum, t) => sum + Math.abs(t.amount), 0),
            )
          : item.val,
      active: index === 5,
    }));
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Error refreshing financial data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateGoal = (goalId: string, savedAmount: number) => {
    setData((prev) => ({
      ...prev,
      goals: prev.goals.map((g) =>
        g.id === goalId ? { ...g, saved: savedAmount } : g,
      ),
    }));
  };

  const addTransaction = (transaction: Omit<Transaction, "id">) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    setData((prev) => {
      // Cash transactions are outflows (amount is already negative in tracker)
      const spentDelta = Math.abs(transaction.amount);
      const newMoneyOut = prev.moneyOut + spentDelta;
      const newMonthlySpent = prev.monthlySpent + spentDelta;
      return {
        ...prev,
        transactions: [newTransaction, ...prev.transactions],
        monthlySpent: newMonthlySpent,
        moneyOut: newMoneyOut,
        spendPct:
          prev.monthlyBudget > 0
            ? Math.round((newMonthlySpent / prev.monthlyBudget) * 100)
            : 0,
        // Balance decreases on spending
        balance: prev.startingBalance + prev.moneyIn - newMoneyOut,
      };
    });
  };

  const addBNPL = (bnpl: Omit<BNPL, "risk">) => {
    setData((prev) => ({
      ...prev,
      bnpls: [...prev.bnpls, { ...bnpl, risk: calcRisk(bnpl.rate) }],
      bnplCount: prev.bnplCount + 1,
    }));
  };

  const removeBNPL = (index: number) => {
    setData((prev) => ({
      ...prev,
      bnpls: prev.bnpls.filter((_, i) => i !== index),
      bnplCount: Math.max(0, prev.bnplCount - 1),
    }));
  };

  return (
    <FinancialDataContext.Provider
      value={{
        data,
        refreshData,
        loading,
        updateGoal,
        addTransaction,
        addBNPL,
        removeBNPL,
        updateFromTracker,
        updateStartingBalance,
      }}
    >
      {children}
    </FinancialDataContext.Provider>
  );
};

export const useFinancialData = () => {
  const context = useContext(FinancialDataContext);
  if (!context) {
    throw new Error(
      "useFinancialData must be used within FinancialDataProvider",
    );
  }
  return context;
};