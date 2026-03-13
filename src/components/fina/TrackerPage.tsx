import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import DynamicIcon from './DynamicIcon';
import { Bot, AlertTriangle, Plus, X, RefreshCw, Banknote, Unlink, CheckCircle, XCircle } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

declare global {
  interface Window {
    TellerConnect: {
      setup: (config: any) => {
        open: () => void;
      };
    };
  }
}

// Types and constants
const FILTERS = ['All', 'Food', 'Transport', 'Shopping', 'BNPL', 'Entertainment', 'Other'];
const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'BNPL', 'Other'];

const CAT_ICONS: Record<string, { icon: string; color: string }> = {
  Food: { icon: 'UtensilsCrossed', color: '#ff6b35' },
  Transport: { icon: 'Car', color: '#3b82f6' },
  Shopping: { icon: 'ShoppingBag', color: '#f97316' },
  Entertainment: { icon: 'Gamepad2', color: '#8b5cf6' },
  BNPL: { icon: 'CreditCard', color: '#ff4757' },
  Other: { icon: 'Wallet', color: '#6b7280' },
};

// Generate a random 3-digit number for the user ID
const generateRandomUserId = () => {
  const randomNum = Math.floor(Math.random() * 900) + 100;
  return `student-${randomNum}`;
};

// Store the generated ID in localStorage to persist across sessions
const getOrCreateUserId = () => {
  const STORAGE_KEY = 'tracker_user_id';
  let userId = localStorage.getItem(STORAGE_KEY);
  
  if (!userId) {
    userId = generateRandomUserId();
    localStorage.setItem(STORAGE_KEY, userId);
    console.log('🆕 Generated new user ID:', userId);
  } else {
    console.log('🔄 Using existing user ID:', userId);
  }
  
  return userId;
};

const TrackerPage = () => {
  const { format } = useCurrency();
  const queryClient = useQueryClient();
  const { data: financialData, addTransaction, refreshData } = useFinancialData();
  
  // Initialize user ID once when component mounts
  const [userId] = useState(() => getOrCreateUserId());
  
  // Local state
  const [activeFilter, setActiveFilter] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [cashEntries, setCashEntries] = useState<any[]>([]);
  const [newEntry, setNewEntry] = useState({ name: '', amount: '', cat: 'Food' });
  const [connecting, setConnecting] = useState(false);
  
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // Log the user ID for debugging
  useEffect(() => {
    console.log('🔑 Current user ID:', userId);
  }, [userId]);

  // Query to check connection status
  const { 
    data: connectionData,
    isLoading: connectionLoading,
    refetch: refetchConnection
  } = useQuery({
    queryKey: ['bankConnection', userId],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/teller/status/${userId}`);
      const data = await response.json();
      console.log(`📡 Connection status for ${userId}:`, data);
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  // Query for transactions
  const { 
    data: bankData,
    isLoading: transactionsLoading,
    isFetching,
    refetch: refetchTransactions
  } = useQuery({
    queryKey: ['bankTransactions', userId],
    queryFn: async () => {
      console.log(`📡 Fetching transactions for ${userId}...`);
      const response = await fetch(`${API_BASE_URL}/api/teller/transactions/${userId}`);
      const data = await response.json();
      console.log(`📡 Transactions response for ${userId}:`, data);
      
      if (data.success) {
        const formatted = data.transactions?.map((t: any) => ({
          id: t.id,
          name: t.description || t.name,
          amount: t.amount,
          cat: t.category || 'Other',
          date: new Date(t.date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          }),
          icon: CAT_ICONS[t.category || 'Other']?.icon || 'Wallet',
          color: CAT_ICONS[t.category || 'Other']?.color || '#6b7280',
          bank: t.bank,
          pending: t.pending,
        })) || [];
        
        return {
          transactions: formatted,
          bankName: data.bankName
        };
      }
      
      return { transactions: [], bankName: '' };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    enabled: connectionData?.connected === true,
  });

  const isConnected = connectionData?.connected === true;
  const bankName = connectionData?.bankName || bankData?.bankName || '';
  
  // Combine bank transactions with existing financial data transactions and cash entries
  const bankTransactions = bankData?.transactions || [];
  const allTransactions = useMemo(() => {
    // Use financial data transactions as base, then add bank transactions and cash entries
    const baseTransactions = financialData.transactions || [];
    
    // Create a Set of existing transaction IDs to avoid duplicates
    const existingIds = new Set(baseTransactions.map(t => t.id));
    
    // Add bank transactions that aren't already in the list
    const newBankTransactions = bankTransactions.filter(t => !existingIds.has(t.id));
    
    // Add cash entries
    const allCashEntries = cashEntries.filter(t => !existingIds.has(t.id));
    
    return [...newBankTransactions, ...allCashEntries, ...baseTransactions];
  }, [bankTransactions, cashEntries, financialData.transactions]);

  const filteredTransactions = activeFilter === 'All' 
    ? allTransactions 
    : allTransactions.filter(t => t.cat === activeFilter);

  // Calculate category spend from all transactions
  const categorySpend = allTransactions.reduce((acc: Record<string, number>, t: any) => {
    const cat = t.cat || 'Other';
    acc[cat] = (acc[cat] || 0) + t.amount;
    return acc;
  }, {});

  const totalSpent = allTransactions.reduce((sum: number, t: any) => sum + t.amount, 0);

  const loadTellerScript = () => {
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
                userId: userId
              })
            });
            
            const callbackData = await callbackResponse.json();
            console.log('📡 Callback response:', callbackData);
            
            if (callbackData.success) {
              await refetchConnection();
              await refetchTransactions();
              await refreshData(); // Refresh dashboard data
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
      await fetch(`${API_BASE_URL}/api/teller/disconnect/${userId}`, { method: 'POST' });
      queryClient.removeQueries({ queryKey: ['bankTransactions', userId] });
      await refetchConnection();
      await refreshData(); // Refresh dashboard data
    } catch (error) {
      console.error('Error disconnecting bank:', error);
    }
  };

  const addCashTransaction = () => {
    if (!newEntry.name.trim() || !newEntry.amount) return;
    
    const catInfo = CAT_ICONS[newEntry.cat] || CAT_ICONS.Other;
    const amount = parseFloat(newEntry.amount);
    
    // Create a truly unique ID for cash transactions
    const uniqueId = `cash-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const newCashEntry = {
      id: uniqueId,
      name: newEntry.name,
      amount: amount,
      cat: newEntry.cat,
      date: 'Today',
      icon: catInfo.icon,
      color: catInfo.color,
      isCash: true,
    };
    
    // Add to local state
    setCashEntries(prev => [...prev, newCashEntry]);
    
    // Add to global financial data context (this will update dashboard)
    addTransaction(newCashEntry);
    
    // Reset form
    setNewEntry({ name: '', amount: '', cat: 'Food' });
    setShowAddForm(false);
    
    // Sync to backend
    fetch(`${API_BASE_URL}/api/transactions/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId,
        name: newEntry.name,
        amount: amount,
        category: newEntry.cat,
      }),
    }).catch(err => console.error('Failed to sync cash transaction:', err));
  };

  const getAIPrediction = () => {
    if (!isConnected && allTransactions.length === 0) {
      return "Connect your bank or add transactions to see AI-powered predictions.";
    }
    
    const dailyAvg = totalSpent / 30 || 0;
    const projectedTotal = dailyAvg * 30;
    const budget = financialData.monthlyBudget || 900;
    const overUnder = projectedTotal - budget;
    
    if (overUnder > 0) {
      return `At your current pace you'll spend ${format(projectedTotal)} this month — ${format(overUnder)} over budget.`;
    } else {
      return `Great job! You're on track to spend ${format(projectedTotal)} this month — ${format(Math.abs(overUnder))} under budget.`;
    }
  };

  // Option to reset user ID (useful for testing)
  const resetUserId = () => {
    const newId = generateRandomUserId();
    localStorage.setItem('tracker_user_id', newId);
    window.location.reload(); // Simple reload to reset all queries
  };

  return (
    <div className="flex flex-col gap-3.5 animate-slide-up">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-bold text-foreground font-display">Spending Tracker</h1>
        <div className="flex gap-2">
          {isConnected && (
            <button
              onClick={() => {
                refetchTransactions();
                refreshData();
              }}
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
          {/* Optional: Add reset button for testing */}
          <button
            onClick={resetUserId}
            className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center"
            title="Reset User ID (Testing Only)"
          >
            <RefreshCw className="w-4 h-4 text-primary" />
          </button>
        </div>
      </div>

      {/* Display current user ID for debugging (remove in production) */}
      <div className="text-[10px] text-muted-foreground px-1">
        User: {userId} · Budget: {format(financialData.monthlyBudget)}
      </div>

      {/* Bank Connection Status */}
      {isConnected ? (
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
      ) : (
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
      )}

      {/* Add Cash Transaction Form */}
      {showAddForm && (
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
            <button
              onClick={addCashTransaction}
              className="w-full gradient-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm shadow-primary"
            >
              Add Transaction
            </button>
          </div>
        </div>
      )}

      {/* AI Prediction */}
      <div className="rounded-2xl p-4 border-[1.5px] border-info/30" style={{ background: 'linear-gradient(135deg, hsl(217 100% 96%), hsl(162 80% 97%))' }}>
        <p className="text-[11px] text-info font-bold mb-1.5 flex items-center gap-1">
          <Bot className="w-3.5 h-3.5" /> AI PREDICTION
        </p>
        <p className="text-[13px] text-foreground leading-relaxed">
          {getAIPrediction()}
        </p>
      </div>

      {/* Category Breakdown */}
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
                <span className="text-xs font-bold" style={{ color: cat === 'BNPL' ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))' }}>
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

      {/* Filters */}
      {allTransactions.length > 0 && (
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
      )}

      {/* Transactions */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        {connectionLoading ? (
          <div className="text-center py-8 text-muted-foreground">Checking connection...</div>
        ) : !isConnected && allTransactions.length === 0 ? (
          <div className="text-center py-8">
            <Banknote className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-foreground mb-2">No Transactions Yet</p>
            <p className="text-xs text-muted-foreground mb-4">
              Connect your bank account or add a cash transaction
            </p>
            <button
              onClick={connectBank}
              className="gradient-primary text-primary-foreground rounded-xl px-4 py-2 text-xs font-semibold"
            >
              Connect Bank
            </button>
          </div>
        ) : transactionsLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No transactions found for this filter</div>
        ) : (
          <div className="space-y-2">
            {filteredTransactions.map((t: any) => (
              <div key={t.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${t.color}18` }}>
                    <DynamicIcon name={t.icon} className="w-5 h-5" style={{ color: t.color }} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">{t.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${t.color}18`, color: t.color }}>
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
                <p className="text-sm font-bold" style={{ color: t.cat === 'BNPL' ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))' }}>
                  −{format(t.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackerPage;