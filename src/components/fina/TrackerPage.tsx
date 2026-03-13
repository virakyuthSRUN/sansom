import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import DynamicIcon from './DynamicIcon';
import { 
  Bot, AlertTriangle, Plus, X, RefreshCw, 
  Banknote, Unlink, CheckCircle, XCircle, User 
} from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import { getOrCreateTrackerUserId } from '@/lib/userId';

// ============================================================================
// Types & Constants
// ============================================================================

declare global {
  interface Window {
    TellerConnect: {
      setup: (config: any) => {
        open: () => void;
      };
    };
  }
}

interface Transaction {
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

interface BankData {
  transactions: Transaction[];
  bankName: string;
}

interface ConnectionStatus {
  connected: boolean;
  bankName?: string;
  error?: string;
}

const FILTERS = ['All', 'Food', 'Transport', 'Shopping', 'BNPL', 'Entertainment', 'Other'] as const;
const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'BNPL', 'Other'] as const;

type Category = typeof CATEGORIES[number];
type Filter = typeof FILTERS[number];

const CAT_ICONS: Record<Category, { icon: string; color: string }> = {
  Food: { icon: 'UtensilsCrossed', color: '#ff6b35' },
  Transport: { icon: 'Car', color: '#3b82f6' },
  Shopping: { icon: 'ShoppingBag', color: '#f97316' },
  Entertainment: { icon: 'Gamepad2', color: '#8b5cf6' },
  BNPL: { icon: 'CreditCard', color: '#ff4757' },
  Other: { icon: 'Wallet', color: '#6b7280' },
};

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Get or create consistent user ID
const USER_ID = getOrCreateTrackerUserId();

// ============================================================================
// Helper Functions
// ============================================================================

const loadTellerScript = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    if (window.TellerConnect) {
      resolve(true);
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdn.teller.io/connect/connect.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Failed to load Teller Connect'));
    document.body.appendChild(script);
  });
};

const formatTransactionDate = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric' 
  });
};

const calculateCategorySpend = (transactions: Transaction[]): Record<Category, number> => {
  return transactions.reduce((acc, t) => {
    const cat = (t.cat as Category) || 'Other';
    acc[cat] = (acc[cat] || 0) + t.amount;
    return acc;
  }, {} as Record<Category, number>);
};

// ============================================================================
// Main Component
// ============================================================================

const TrackerPage = () => {
  const { format } = useCurrency();
  const queryClient = useQueryClient();
  const { profile } = useUserProfile();
  const { updateFromTracker, addTransaction: addToFinancialData } = useFinancialData();
  
  // --------------------------------------------------------------------------
  // State
  // --------------------------------------------------------------------------
  
  const [activeFilter, setActiveFilter] = useState<Filter>('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [cashEntries, setCashEntries] = useState<Transaction[]>([]);
  const [newEntry, setNewEntry] = useState({ name: '', amount: '', cat: 'Food' as Category });
  const [connecting, setConnecting] = useState(false);
  const [showUserId, setShowUserId] = useState(false);
  
  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------
  
  // Query to check connection status
  const { 
    data: connectionData = { connected: false },
    isLoading: connectionLoading,
    refetch: refetchConnection
  } = useQuery<ConnectionStatus>({
    queryKey: ['bankConnection', USER_ID],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/teller/status/${USER_ID}`);
      const data = await response.json();
      console.log('📡 Connection status:', data);
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Query for transactions
  const { 
    data: bankData = { transactions: [], bankName: '' },
    isLoading: transactionsLoading,
    isFetching,
    refetch: refetchTransactions
  } = useQuery<BankData>({
    queryKey: ['bankTransactions', USER_ID],
    queryFn: async () => {
      console.log('📡 Fetching transactions...');
      const response = await fetch(`${API_BASE_URL}/api/teller/transactions/${USER_ID}`);
      const data = await response.json();
      console.log('📡 Transactions response:', data);
      
      if (!data.success) {
        return { transactions: [], bankName: '' };
      }
      
      const formatted = (data.transactions || []).map((t: any) => ({
        id: t.id,
        name: t.description || t.name,
        amount: t.amount,
        cat: t.category || 'Other',
        date: formatTransactionDate(t.date),
        icon: CAT_ICONS[t.category as Category]?.icon || 'Wallet',
        color: CAT_ICONS[t.category as Category]?.color || '#6b7280',
        bank: t.bank,
        pending: t.pending,
      }));
      
      return {
        transactions: formatted,
        bankName: data.bankName
      };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    enabled: connectionData?.connected === true,
  });

  // --------------------------------------------------------------------------
  // Derived State
  // --------------------------------------------------------------------------
  
  const isConnected = connectionData?.connected === true;
  const bankName = connectionData?.bankName || bankData?.bankName || '';
  const bankTransactions = bankData?.transactions || [];
  
  // Combine bank and cash transactions
  const allTransactions = useMemo(() => {
    return [...bankTransactions, ...cashEntries];
  }, [bankTransactions, cashEntries]);

  const filteredTransactions = useMemo(() => {
    return activeFilter === 'All' 
      ? allTransactions 
      : allTransactions.filter(t => t.cat === activeFilter);
  }, [allTransactions, activeFilter]);

  // Calculate category spend
  const categorySpend = useMemo(() => {
    return calculateCategorySpend(bankTransactions);
  }, [bankTransactions]);

  const totalSpent = useMemo(() => {
    return bankTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [bankTransactions]);

  // Get user's monthly budget from profile (default to 5000 if not set)
  const monthlyBudget = profile?.monthly_budget || 5000;

  // --------------------------------------------------------------------------
  // Sync with FinancialDataContext
  // --------------------------------------------------------------------------
  
  // Update FinancialData whenever bank connection status or transactions change
  useEffect(() => {
    updateFromTracker({
      totalSpent,
      transactions: bankTransactions,
      isConnected
    });
  }, [totalSpent, bankTransactions, isConnected, updateFromTracker]);

  // Load cash transactions from localStorage on mount
  useEffect(() => {
    const loadCashEntries = () => {
      try {
        const storedCash = localStorage.getItem(`cash-entries-${USER_ID}`);
        if (storedCash) {
          const parsed = JSON.parse(storedCash);
          setCashEntries(parsed);
        }
      } catch (error) {
        console.error('Error loading cash entries:', error);
      }
    };

    loadCashEntries();
  }, [USER_ID]);

  // Save cash entries to localStorage whenever they change
  useEffect(() => {
    if (cashEntries.length > 0) {
      localStorage.setItem(`cash-entries-${USER_ID}`, JSON.stringify(cashEntries));
    }
  }, [cashEntries, USER_ID]);

  // --------------------------------------------------------------------------
  // Event Handlers
  // --------------------------------------------------------------------------
  
  const connectBank = async () => {
    setConnecting(true);
    
    try {
      const configResponse = await fetch(`${API_BASE_URL}/api/teller/config`);
      const configData = await configResponse.json();
      
      if (!configData.success) {
        throw new Error('Failed to get Teller config');
      }
      
      await loadTellerScript();
      
      const tellerConnect = window.TellerConnect.setup({
        applicationId: configData.config.applicationId,
        environment: configData.config.environment,
        products: configData.config.products,
        onInit: () => console.log('Teller Connect initialized'),
        onSuccess: async (enrollment) => {
          console.log('✅ Bank connected:', enrollment);
          
          try {
            const callbackResponse = await fetch(`${API_BASE_URL}/api/teller/callback`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                accessToken: enrollment.accessToken,
                enrollment: enrollment.enrollment,
                userId: USER_ID
              })
            });
            
            const callbackData = await callbackResponse.json();
            console.log('📡 Callback response:', callbackData);
            
            if (callbackData.success) {
              await refetchConnection();
              await refetchTransactions();
            }
          } catch (error) {
            console.error('Callback error:', error);
          } finally {
            setConnecting(false);
          }
        },
        onExit: () => {
          console.log('User closed Teller Connect');
          setConnecting(false);
        },
        onError: (error) => {
          console.error('Teller Connect error:', error);
          setConnecting(false);
        }
      });
      
      tellerConnect.open();
    } catch (error) {
      console.error('Failed to connect bank:', error);
      setConnecting(false);
    }
  };

  const disconnectBank = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/teller/disconnect/${USER_ID}`, { method: 'POST' });
      queryClient.removeQueries({ queryKey: ['bankTransactions', USER_ID] });
      await refetchConnection();
      
      // Clear cash entries when disconnecting
      setCashEntries([]);
      localStorage.removeItem(`cash-entries-${USER_ID}`);
      
    } catch (error) {
      console.error('Error disconnecting bank:', error);
    }
  };

  const addCashTransaction = () => {
    if (!newEntry.name.trim() || !newEntry.amount) return;
    
    const catInfo = CAT_ICONS[newEntry.cat] || CAT_ICONS.Other;
    const amount = parseFloat(newEntry.amount);
    
    const newCashEntry: Transaction = {
      id: `cash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newEntry.name,
      amount,
      cat: newEntry.cat,
      date: 'Today',
      icon: catInfo.icon,
      color: catInfo.color,
      isCash: true,
    };
    
    setCashEntries(prev => [...prev, newCashEntry]);
    
    // Also add to FinancialData
    addToFinancialData(newCashEntry);
    
    setNewEntry({ name: '', amount: '', cat: 'Food' });
    setShowAddForm(false);
    
    // Sync to backend
    fetch(`${API_BASE_URL}/api/transactions/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: USER_ID,
        name: newEntry.name,
        amount,
        category: newEntry.cat,
      }),
    }).catch(err => console.error('Failed to sync cash transaction:', err));
  };

  const resetForm = () => {
    setNewEntry({ name: '', amount: '', cat: 'Food' });
    setShowAddForm(false);
  };

  // Copy user ID to clipboard
  const copyUserIdToClipboard = () => {
    navigator.clipboard.writeText(USER_ID);
    alert('User ID copied to clipboard!');
  };

  // --------------------------------------------------------------------------
  // AI Prediction Functions
  // --------------------------------------------------------------------------
  
  const getAIPrediction = (): string => {
    if (!isConnected) {
      return "Connect your bank to see AI-powered predictions.";
    }
    
    if (totalSpent === 0) {
      return "No transactions yet this month. Start spending to see AI predictions!";
    }
    
    // Calculate days in current month
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    
    // Calculate daily average and projection
    const dailyAvg = totalSpent / currentDay;
    const projectedTotal = dailyAvg * daysInMonth;
    const remaining = monthlyBudget - totalSpent;
    const projectedOverUnder = projectedTotal - monthlyBudget;
    
    // Calculate pace
    const pace = (totalSpent / monthlyBudget) * 100;
    
    if (projectedOverUnder > 0) {
      return `⚠️ At your current pace (${pace.toFixed(1)}% of budget used), you'll spend ${format(projectedTotal)} this month — ${format(projectedOverUnder)} over your ${format(monthlyBudget)} budget. Consider reducing daily spending by ${format(projectedOverUnder / (daysInMonth - currentDay))}/day to stay on track.`;
    } else {
      return `✅ Great job! You're on track to spend ${format(projectedTotal)} this month — ${format(Math.abs(projectedOverUnder))} under your ${format(monthlyBudget)} budget. You have ${format(remaining)} left for the remaining ${daysInMonth - currentDay} days.`;
    }
  };

  const getBudgetStatus = (): { color: string; message: string } => {
    const percentage = (totalSpent / monthlyBudget) * 100;
    
    if (percentage >= 100) {
      return { color: 'text-destructive', message: 'Budget exceeded!' };
    } else if (percentage >= 80) {
      return { color: 'text-warning', message: 'Warning: Close to budget limit' };
    } else if (percentage >= 50) {
      return { color: 'text-primary', message: 'Halfway through budget' };
    } else {
      return { color: 'text-success', message: 'Well within budget' };
    }
  };

  const budgetStatus = getBudgetStatus();

  // --------------------------------------------------------------------------
  // Render Helpers
  // --------------------------------------------------------------------------
  
  const renderConnectionStatus = () => {
    if (isConnected) {
      return (
        <div className="rounded-2xl p-4 shadow-sm border border-green-500/30 bg-green-500/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-medium">
                Connected to {bankName}
              </span>
              <CheckCircle className="w-4 h-4 text-green-500" />
            </div>
            <button
              onClick={disconnectBank}
              className="text-destructive hover:text-destructive/80 text-xs flex items-center gap-1"
            >
              <Unlink className="w-3 h-3" />
              Disconnect
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-card rounded-2xl p-4 shadow-sm border border-primary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Banknote className="w-5 h-5 text-primary" />
            <div>
              <p className="text-[13px] font-bold">Connect Your Bank</p>
              <p className="text-[10px] text-muted-foreground">
                Get real-time transactions automatically
              </p>
            </div>
          </div>
          <button
            onClick={connectBank}
            disabled={connecting}
            className="gradient-primary text-primary-foreground rounded-xl px-4 py-2 text-xs font-semibold disabled:opacity-50"
          >
            {connecting ? 'Connecting...' : 'Connect Bank'}
          </button>
        </div>
      </div>
    );
  };

  const renderAddForm = () => {
    if (!showAddForm) return null;
    
    return (
      <div className="bg-card rounded-2xl p-4 shadow-sm border-[1.5px] border-primary/30 animate-slide-up">
        <p className="text-[13px] font-bold text-foreground mb-3">Add Cash Transaction</p>
        <div className="flex flex-col gap-2.5">
          <input
            value={newEntry.name}
            onChange={e => setNewEntry(p => ({ ...p, name: e.target.value }))}
            placeholder="Description (e.g. Lunch)"
            className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-border text-[13px] text-foreground outline-none focus:border-primary transition-colors bg-card"
          />
          <input
            value={newEntry.amount}
            onChange={e => setNewEntry(p => ({ ...p, amount: e.target.value }))}
            placeholder="Amount"
            type="number"
            step="0.01"
            className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-border text-[13px] text-foreground outline-none focus:border-primary transition-colors bg-card"
          />
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setNewEntry(p => ({ ...p, cat: c }))}
                className={`text-[11px] px-3 py-1 rounded-full border-[1.5px] transition-all ${
                  newEntry.cat === c
                    ? 'border-primary bg-accent text-primary font-semibold'
                    : 'border-border bg-card text-muted-foreground'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={addCashTransaction}
              className="flex-1 gradient-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm shadow-primary"
            >
              Add Transaction
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-3 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCategoryBreakdown = () => (
    <div className="bg-card rounded-2xl p-4 shadow-sm">
      <p className="text-[13px] font-bold text-foreground mb-3.5">By Category</p>
      {CATEGORIES.map(cat => {
        const amount = categorySpend[cat] || 0;
        const percentage = totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
        const color = CAT_ICONS[cat]?.color || '#6b7280';
        
        return (
          <div key={cat} className="mb-2.5">
            <div className="flex justify-between mb-1">
              <span className="text-xs text-foreground font-medium">{cat}</span>
              <span className="text-xs font-bold" style={{ 
                color: cat === 'BNPL' ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))' 
              }}>
                {format(amount)}
              </span>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-700" 
                style={{ 
                  width: `${percentage}%`, 
                  background: color,
                  opacity: amount === 0 ? 0.3 : 1
                }} 
              />
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderFilters = () => {
    if (!isConnected || allTransactions.length === 0) return null;
    
    return (
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`text-[11px] px-3 py-1 rounded-full border-[1.5px] transition-all ${
              activeFilter === f
                ? 'border-primary bg-accent text-primary font-semibold'
                : 'border-border bg-card text-muted-foreground'
            }`}
          >
            {f}
          </button>
        ))}
      </div>
    );
  };

  const renderTransactions = () => {
    if (connectionLoading) {
      return <div className="text-center py-8 text-muted-foreground">Checking connection...</div>;
    }
    
    if (!isConnected) {
      return (
        <div className="text-center py-8">
          <Banknote className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-foreground mb-2">No Bank Connected</p>
          <p className="text-xs text-muted-foreground mb-4">
            Connect your bank account to see your transactions
          </p>
          <button
            onClick={connectBank}
            className="gradient-primary text-primary-foreground rounded-xl px-4 py-2 text-xs font-semibold"
          >
            Connect Bank
          </button>
        </div>
      );
    }
    
    if (transactionsLoading) {
      return <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>;
    }
    
    if (filteredTransactions.length === 0) {
      return <div className="text-center py-8 text-muted-foreground">No transactions found for this filter</div>;
    }
    
    return (
      <div className="space-y-2">
        {filteredTransactions.map((t) => (
          <div 
            key={t.id} 
            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${t.color}18` }}>
                <DynamicIcon name={t.icon} className="w-5 h-5" style={{ color: t.color }} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">{t.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" 
                    style={{ background: `${t.color}18`, color: t.color }}>
                    {t.cat}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{t.date}</span>
                  {t.pending && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning">
                      Pending
                    </span>
                  )}
                  {t.isCash && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-accent/30 text-primary">
                      Cash
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-sm font-bold" style={{ 
              color: t.cat === 'BNPL' ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))' 
            }}>
              −{format(t.amount)}
            </p>
          </div>
        ))}
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // Main Render
  // --------------------------------------------------------------------------
  
  return (
    <div className="flex flex-col gap-3.5 animate-slide-up">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-foreground font-display">Spending Tracker</h1>
          
          {/* User ID Badge - Clickable to copy */}
          <button
            onClick={copyUserIdToClipboard}
            onMouseEnter={() => setShowUserId(true)}
            onMouseLeave={() => setShowUserId(false)}
            className="relative group"
          >
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent/50 text-[10px] text-muted-foreground hover:bg-accent transition-colors">
              <User className="w-3 h-3" />
              <span className="font-mono">{USER_ID}</span>
            </div>
            
            {/* Tooltip */}
            {showUserId && (
              <div className="absolute top-full left-0 mt-1 px-2 py-1 bg-popover text-popover-foreground text-[9px] rounded shadow-lg whitespace-nowrap">
                Click to copy user ID
              </div>
            )}
          </button>
        </div>
        
        <div className="flex gap-2">
          {isConnected && (
            <button
              onClick={() => refetchTransactions()}
              disabled={isFetching}
              className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center"
              title="Refresh bank transactions"
            >
              <RefreshCw className={`w-4 h-4 text-primary ${isFetching ? 'animate-spin' : ''}`} />
            </button>
          )}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-primary"
          >
            {showAddForm ? <X className="w-4 h-4 text-primary-foreground" /> : <Plus className="w-4 h-4 text-primary-foreground" />}
          </button>
        </div>
      </div>

      {/* Budget Summary Card - Only show when connected */}
      {isConnected && (
        <div className="bg-card rounded-2xl p-4 shadow-sm border border-primary/20">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground">Monthly Budget</span>
            <span className="text-xs font-medium">{budgetStatus.message}</span>
          </div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-2xl font-bold">{format(totalSpent)}</span>
            <span className="text-sm text-muted-foreground">of {format(monthlyBudget)}</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden mb-1">
            <div 
              className={`h-full rounded-full transition-all duration-700 ${
                (totalSpent / monthlyBudget) >= 1 ? 'bg-destructive' :
                (totalSpent / monthlyBudget) >= 0.8 ? 'bg-warning' : 'bg-primary'
              }`}
              style={{ width: `${Math.min((totalSpent / monthlyBudget) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Spent: {format(totalSpent)}</span>
            <span>Remaining: {format(monthlyBudget - totalSpent)}</span>
          </div>
        </div>
      )}

      {/* Bank Connection Status */}
      {renderConnectionStatus()}

      {/* Add Cash Transaction Form */}
      {renderAddForm()}

      {/* AI Prediction - Only show full prediction when connected */}
      {isConnected ? (
        <div className="rounded-2xl p-4 border-[1.5px] border-info/30" 
             style={{ background: 'linear-gradient(135deg, hsl(217 100% 96%), hsl(162 80% 97%))' }}>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] text-info font-bold flex items-center gap-1">
              <Bot className="w-3.5 h-3.5" /> AI PREDICTION
            </p>
            <span className={`text-[10px] font-semibold ${budgetStatus.color}`}>
              {Math.round((totalSpent / monthlyBudget) * 100)}% used
            </span>
          </div>
          <p className="text-[13px] text-foreground leading-relaxed">
            {getAIPrediction()}
          </p>
        </div>
      ) : (
        <div className="rounded-2xl p-4 border-[1.5px] border-border bg-card/50">
          <p className="text-[11px] text-muted-foreground font-bold mb-1.5 flex items-center gap-1">
            <Bot className="w-3.5 h-3.5" /> AI PREDICTION
          </p>
          <p className="text-[13px] text-muted-foreground leading-relaxed">
            Connect your bank account to see AI-powered spending predictions and insights.
          </p>
        </div>
      )}

      {/* Category Breakdown - Only show when connected */}
      {isConnected && renderCategoryBreakdown()}

      {/* Filters */}
      {renderFilters()}

      {/* Transactions */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        {renderTransactions()}
      </div>
    </div>
  );
};

export default TrackerPage;