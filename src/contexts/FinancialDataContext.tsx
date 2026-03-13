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
  isBankConnected: boolean; // Add this to track connection status
  
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
  updateFromTracker: (trackerData: { 
    totalSpent: number; 
    transactions: Transaction[];
    isConnected: boolean;
  }) => void; // Add this to receive data from tracker
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

// Default empty state (no bank connected)
const getDefaultData = (monthlyBudget: number): FinancialData => ({
  balance: 0,
  moneyIn: 0,
  moneyOut: 0,
  monthlySpent: 0,
  monthlyBudget: monthlyBudget,
  spendPct: 0,
  isBankConnected: false, // Initially not connected
  debtRisk: 'LOW',
  debtScore: 0,
  bnplCount: 0,
  bnpls: [],
  goals: GOALS.map(g => ({ ...g, id: g.id.toString() })),
  transactions: [],
  aiTip: "Connect your bank account to see personalized insights.",
  monthlyTrend: defaultMonthlyTrend.map(t => ({ ...t, val: 0 })), // Zero out the trend data
});

const FinancialDataContext = createContext<FinancialDataContextType | undefined>(undefined);

export const FinancialDataProvider = ({ children }: { children: React.ReactNode }) => {
  const { profile } = useUserProfile();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FinancialData>(() => 
    getDefaultData(profile?.monthly_budget || 5000)
  );

  // Update budget when profile changes
  useEffect(() => {
    if (profile?.monthly_budget) {
      setData(prev => ({
        ...prev,
        monthlyBudget: profile.monthly_budget,
        spendPct: prev.isBankConnected ? Math.round((prev.monthlySpent / profile.monthly_budget) * 100) : 0
      }));
    }
  }, [profile]);

  // This function will be called by TrackerPage when bank is connected
  const updateFromTracker = (trackerData: { 
    totalSpent: number; 
    transactions: Transaction[];
    isConnected: boolean;
  }) => {
    if (trackerData.isConnected) {
      // Bank is connected - update with real data
      setData(prev => ({
        ...prev,
        isBankConnected: true,
        monthlySpent: trackerData.totalSpent,
        transactions: trackerData.transactions,
        spendPct: Math.round((trackerData.totalSpent / prev.monthlyBudget) * 100),
        // Update moneyOut to match spending
        moneyOut: trackerData.totalSpent,
        // Update balance (assuming moneyIn remains constant for demo)
        balance: (prev.moneyIn || 14000) - trackerData.totalSpent,
        // Update AI tip based on real data
        aiTip: generateAITip(trackerData.totalSpent, prev.monthlyBudget, trackerData.transactions),
        // Update monthly trend with real data if available
        monthlyTrend: updateMonthlyTrend(trackerData.transactions),
      }));

      // Store transactions in localStorage for persistence
      try {
        const trackerUserId = localStorage.getItem('tracker_user_id');
        if (trackerUserId) {
          localStorage.setItem(
            `financial-data-${trackerUserId}`, 
            JSON.stringify({
              totalSpent: trackerData.totalSpent,
              transactions: trackerData.transactions
            })
          );
        }
      } catch (error) {
        console.error('Error storing financial data:', error);
      }
    } else {
      // Bank is not connected - reset to default
      setData(prev => ({
        ...getDefaultData(prev.monthlyBudget),
        goals: prev.goals, // Keep goals
      }));
    }
  };

  // Helper function to generate AI tip based on real data
  const generateAITip = (totalSpent: number, budget: number, transactions: Transaction[]): string => {
    if (totalSpent === 0) {
      return "Start tracking your spending to get personalized insights!";
    }
    
    const percentage = (totalSpent / budget) * 100;
    
    if (percentage > 80) {
      return `You've used ${percentage.toFixed(0)}% of your budget. Consider reducing non-essential spending for the rest of the month.`;
    } else if (percentage > 50) {
      return `You're at ${percentage.toFixed(0)}% of your budget. You're on track for a balanced month!`;
    } else {
      return `Great job! You've only used ${percentage.toFixed(0)}% of your budget. Keep up the good work!`;
    }
  };

  // Helper function to update monthly trend
  const updateMonthlyTrend = (transactions: Transaction[]): typeof defaultMonthlyTrend => {
    // This is a simplified version - you'd want to group by month properly
    const currentMonth = new Date().getMonth();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    return defaultMonthlyTrend.map((item, index) => ({
      ...item,
      val: index === 5 ? Math.round(transactions.reduce((sum, t) => sum + t.amount, 0)) : item.val,
      active: index === 5,
    }));
  };

  const refreshData = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Error refreshing financial data:', error);
    } finally {
      setLoading(false);
    }
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
    // This should only be used for manual cash transactions
    const newTransaction: Transaction = {
      ...transaction,
      id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    
    setData(prev => {
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

  return (
    <FinancialDataContext.Provider value={{
      data,
      refreshData,
      loading,
      updateGoal,
      addTransaction,
      updateFromTracker, // Expose this function
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