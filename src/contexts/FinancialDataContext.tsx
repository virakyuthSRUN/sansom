// contexts/FinancialDataContext.tsx
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
    transactions: Transaction[];
    isConnected: boolean;
  }) => void;
}

const defaultMonthlyTrend = [
  { label: "Oct", val: 820 },
  { label: "Nov", val: 950 },
  { label: "Dec", val: 1100 },
  { label: "Jan", val: 780 },
  { label: "Feb", val: 890 },
  { label: "Mar", val: 620, active: true },
];

const getDefaultData = (monthlyBudget: number): FinancialData => ({
  balance: 0,
  moneyIn: 50000,
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
});

// ← FIX: single line, no multi-line generic
const FinancialDataContext = createContext<FinancialDataContextType | undefined>(undefined);

// ── Risk helper ───────────────────────────────────────────────────────
const calcRisk = (rate: number): "LOW" | "MEDIUM" | "HIGH" =>
  rate < 15 ? "LOW" : rate <= 25 ? "MEDIUM" : "HIGH";

export const FinancialDataProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { profile } = useUserProfile();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FinancialData>(() =>
    getDefaultData(profile?.monthly_budget || 50000),
  );

  useEffect(() => {
    if (profile?.monthly_budget) {
      setData((prev) => ({
        ...prev,
        monthlyBudget: profile.monthly_budget,
        spendPct: prev.isBankConnected
          ? Math.round((prev.monthlySpent / profile.monthly_budget) * 100)
          : 0,
      }));
    }
  }, [profile]);

  const updateFromTracker = (trackerData: {
    totalSpent: number;
    transactions: Transaction[];
    isConnected: boolean;
  }) => {
    if (trackerData.isConnected) {
      setData((prev) => ({
        ...prev,
        isBankConnected: true,
        monthlySpent: trackerData.totalSpent,
        transactions: trackerData.transactions,
        spendPct: Math.round(
          (trackerData.totalSpent / prev.monthlyBudget) * 100,
        ),
        moneyOut: trackerData.totalSpent,
        balance: (prev.moneyIn || 14000) - trackerData.totalSpent,
        aiTip: generateAITip(
          trackerData.totalSpent,
          prev.monthlyBudget,
          trackerData.transactions,
        ),
        monthlyTrend: updateMonthlyTrend(trackerData.transactions),
      }));

      try {
        const trackerUserId = localStorage.getItem("tracker_user_id");
        if (trackerUserId) {
          localStorage.setItem(
            `financial-data-${trackerUserId}`,
            JSON.stringify({
              totalSpent: trackerData.totalSpent,
              transactions: trackerData.transactions,
            }),
          );
        }
      } catch (error) {
        console.error("Error storing financial data:", error);
      }
    } else {
      // Keep BNPLs and goals when disconnecting
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
  ): string => {
    if (totalSpent === 0)
      return "Start tracking your spending to get personalized insights!";
    const percentage = (totalSpent / budget) * 100;
    if (percentage > 80)
      return `You've used ${percentage.toFixed(0)}% of your budget. Consider reducing non-essential spending for the rest of the month.`;
    if (percentage > 50)
      return `You're at ${percentage.toFixed(0)}% of your budget. You're on track for a balanced month!`;
    return `Great job! You've only used ${percentage.toFixed(0)}% of your budget. Keep up the good work!`;
  };

  const updateMonthlyTrend = (
    transactions: Transaction[],
  ): typeof defaultMonthlyTrend => {
    return defaultMonthlyTrend.map((item, index) => ({
      ...item,
      val:
        index === 5
          ? Math.round(transactions.reduce((sum, t) => sum + t.amount, 0))
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
      const newMonthlySpent = prev.monthlySpent + transaction.amount;
      return {
        ...prev,
        transactions: [newTransaction, ...prev.transactions],
        monthlySpent: newMonthlySpent,
        spendPct: Math.round((newMonthlySpent / prev.monthlyBudget) * 100),
        moneyOut: newMonthlySpent,
        balance: (prev.moneyIn || 14000) - newMonthlySpent,
      };
    });
  };

  // ── NEW: Add BNPL ─────────────────────────────────────────────────
  const addBNPL = (bnpl: Omit<BNPL, "risk">) => {
    setData((prev) => ({
      ...prev,
      bnpls: [...prev.bnpls, { ...bnpl, risk: calcRisk(bnpl.rate) }],
      bnplCount: prev.bnplCount + 1,
    }));
  };

  // ── NEW: Remove BNPL ──────────────────────────────────────────────
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
        addBNPL,        // ← NEW
        removeBNPL,     // ← NEW
        updateFromTracker,
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