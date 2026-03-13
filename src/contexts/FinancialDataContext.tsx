// contexts/FinancialDataContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useUserProfile } from './UserProfileContext';
import { EXPENSES, GOALS } from '@/lib/constants';

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
  risk: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface FinancialData {
  // Balance & Money Flow
  balance: number;
  moneyIn: number;
  moneyOut: number;
  
  // Budget
  monthlySpent: number;
  monthlyBudget: number;
  spendPct: number;
  
  // Debt
  debtRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  debtScore: number;
  bnplCount: number;
  bnpls: BNPL[];
  
  // Goals
  goals: Goal[];
  
  // Transactions
  transactions: Transaction[];
  
  // AI Insights
  aiTip: string;
  
  // Monthly trend data
  monthlyTrend: { label: string; val: number; active?: boolean }[];
}

interface FinancialDataContextType {
  data: FinancialData;
  refreshData: () => Promise<void>;
  loading: boolean;
  updateGoal: (goalId: string, savedAmount: number) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
}

const defaultBNPLs: BNPL[] = [
  { name: 'Atome', platform: 'Shopee', amount: 300, monthly: 100, rate: 18, status: 'Active', risk: 'MEDIUM' },
  { name: 'GrabPay Later', platform: 'Grab', amount: 150, monthly: 75, rate: 24, status: 'Active', risk: 'HIGH' },
];

const defaultMonthlyTrend = [
  { label: 'Oct', val: 820 }, 
  { label: 'Nov', val: 950 },
  { label: 'Dec', val: 1100 }, 
  { label: 'Jan', val: 780 },
  { label: 'Feb', val: 890 }, 
  { label: 'Mar', val: 620, active: true },
];

const FinancialDataContext = createContext<FinancialDataContextType | undefined>(undefined);

export const FinancialDataProvider = ({ children }: { children: React.ReactNode }) => {
  const { profile } = useUserProfile();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FinancialData>({
    balance: 12004,
    moneyIn: 14000,
    moneyOut: 1996,
    monthlySpent: 620,
    monthlyBudget: profile?.monthly_budget || 900,
    spendPct: 68,
    debtRisk: 'MEDIUM',
    debtScore: 52,
    bnplCount: 2,
    bnpls: defaultBNPLs,
    goals: GOALS.map(g => ({ ...g, id: g.id.toString() })), // Ensure IDs are strings
    transactions: EXPENSES.map(e => ({ ...e, id: e.id.toString() })),
    aiTip: "Cooking and eating in will help you save more money. You're spending $89 more on food this month vs last month.",
    monthlyTrend: defaultMonthlyTrend,
  });

  // Update budget when profile changes
  useEffect(() => {
    if (profile?.monthly_budget && profile.monthly_budget !== data.monthlyBudget) {
      setData(prev => ({
        ...prev,
        monthlyBudget: profile.monthly_budget || 900,
        spendPct: Math.round((prev.monthlySpent / (profile.monthly_budget || 900)) * 100)
      }));
    }
  }, [profile]);

  const refreshData = async () => {
    setLoading(true);
    try {
      // Here you would fetch from your API
      // const response = await fetch('/api/financial-data');
      // const freshData = await response.json();
      // setData(freshData);
      
      // For now, just simulate a refresh
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Update with any new calculations
      setData(prev => ({
        ...prev,
        spendPct: Math.round((prev.monthlySpent / prev.monthlyBudget) * 100),
        debtScore: calculateDebtScore(prev.bnpls, prev.monthlyBudget),
        debtRisk: calculateDebtRisk(prev.bnpls, prev.monthlyBudget),
      }));
    } catch (error) {
      console.error('Error refreshing financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDebtScore = (bnpls: BNPL[], budget: number): number => {
    const totalDebt = bnpls.reduce((sum, b) => sum + b.amount, 0);
    const ratio = (totalDebt / budget) * 100;
    return Math.min(100, Math.round(ratio * 1.8));
  };

  const calculateDebtRisk = (bnpls: BNPL[], budget: number): 'LOW' | 'MEDIUM' | 'HIGH' => {
    const score = calculateDebtScore(bnpls, budget);
    if (score <= 30) return 'LOW';
    if (score <= 60) return 'MEDIUM';
    return 'HIGH';
  };

  const updateGoal = (goalId: string, savedAmount: number) => {
    setData(prev => ({
      ...prev,
      goals: prev.goals.map(g => 
        g.id === goalId ? { ...g, saved: savedAmount } : g
      )
    }));
  };

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    
    setData(prev => ({
      ...prev,
      transactions: [newTransaction, ...prev.transactions],
      // Update monthly spent
      monthlySpent: prev.monthlySpent + transaction.amount,
      spendPct: Math.round(((prev.monthlySpent + transaction.amount) / prev.monthlyBudget) * 100),
    }));
  };

  return (
    <FinancialDataContext.Provider value={{
      data,
      refreshData,
      loading,
      updateGoal,
      addTransaction,
    }}>
      {children}
    </FinancialDataContext.Provider>
  );
};

export const useFinancialData = () => {
  const context = useContext(FinancialDataContext);
  if (!context) {
    throw new Error('useFinancialData must be used within FinancialDataProvider');
  }
  return context;
};