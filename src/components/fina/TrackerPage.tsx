import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EXPENSES } from '@/lib/constants';
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
// Types for bank transactions
interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  merchant: string;
  paymentMethod: string;
  bank?: string;
  pending?: boolean;
}

interface CashEntry {
  id: number;
  name: string;
  amount: number;
  cat: string;
  date: string;
  icon: string;
  color: string;
  isCash?: boolean;
}

// Combined transaction type
interface BaseTransaction {
  id: string | number;
  name: string;
  amount: number;
  cat: string;
  date: string;
  icon: string;
  color: string;
}

interface BankTransactionItem extends BaseTransaction {
  isBank: true;
  bank: string;
  pending?: boolean;
  isCash?: never;
}

interface CashTransactionItem extends BaseTransaction {
  isCash: true;
  isBank?: never;
  bank?: never;
  pending?: never;
}

type TransactionItem = BankTransactionItem | CashTransactionItem;

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

const TrackerPage = () => {
  const { format } = useCurrency();
  const queryClient = useQueryClient();
  
  // Local state
  const [activeFilter, setActiveFilter] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [newEntry, setNewEntry] = useState({ name: '', amount: '', cat: 'Food' });
  
  // Teller state
  const [tellerConnected, setTellerConnected] = useState(false);
  const [bankName, setBankName] = useState('');
  const [needsConnect, setNeedsConnect] = useState(false);
  
  // Category spend data
  const [categorySpend, setCategorySpend] = useState<Record<string, number>>({});
  const [totalSpent, setTotalSpent] = useState(0);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  // React Query for bank transactions - data stays cached between tab switches!
  const { 
    data: bankData,
    isLoading,
    isFetching,
    error,
    refetch 
  } = useQuery({
    queryKey: ['bankTransactions', 'student-123'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/teller/transactions/student-123`);
      const data = await response.json();
      
      if (data.needsConnect) {
        setTellerConnected(false);
        setNeedsConnect(true);
        return { transactions: [], bankName: '' };
      }
      
      if (data.success) {
        const formatted = data.transactions.map((t: any) => ({
          id: t.id,
          name: t.description,
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
        }));
        
        setTellerConnected(true);
        setBankName(data.bankName);
        setNeedsConnect(false);
        
        return {
          transactions: formatted,
          bankName: data.bankName
        };
      }
      
      return { transactions: [], bankName: '' };
    },
    // 🚀 These options make tab switching instant!
    staleTime: 5 * 60 * 1000, // Data stays fresh for 5 minutes
    gcTime: 10 * 60 * 1000,   // Cache persists for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch when switching tabs
    refetchOnMount: false, // Use cached data when component remounts
    retry: 1, // Retry failed requests once
  });

  // Extract transactions from query data
  const bankTransactions = bankData?.transactions || [];

  // Update category spend whenever transactions change
  useEffect(() => {
    calculateCategorySpend();
  }, [bankTransactions, cashEntries]);

  const calculateCategorySpend = () => {
    const spend: Record<string, number> = {};
    let total = 0;
    
    // Add bank transactions
    bankTransactions.forEach((t: any) => {
      const category = t.cat || 'Other';
      const amount = t.amount;
      spend[category] = (spend[category] || 0) + amount;
      total += amount;
    });
    
    // Add cash entries
    cashEntries.forEach(e => {
      spend[e.cat] = (spend[e.cat] || 0) + e.amount;
      total += e.amount;
    });
    
    setCategorySpend(spend);
    setTotalSpent(total);
  };

  const addCashTransaction = () => {
    if (!newEntry.name.trim() || !newEntry.amount) return;
    const catInfo = CAT_ICONS[newEntry.cat] || CAT_ICONS.Other;
    const newCashEntry: CashEntry = {
      id: Date.now(),
      name: newEntry.name,
      amount: parseFloat(newEntry.amount),
      cat: newEntry.cat,
      date: 'Today',
      icon: catInfo.icon,
      color: catInfo.color,
      isCash: true,
    };
    setCashEntries(prev => [...prev, newCashEntry]);
    setNewEntry({ name: '', amount: '', cat: 'Food' });
    setShowAddForm(false);
    
    // Optional: Send cash transaction to backend
    fetch(`${API_BASE_URL}/api/transactions/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newEntry.name,
        amount: parseFloat(newEntry.amount),
        category: newEntry.cat,
      }),
    }).catch(err => console.error('Failed to sync cash transaction:', err));
  };

  // Combine and sort all transactions
  const allTransactions = (): TransactionItem[] => {
    const bank: BankTransactionItem[] = bankTransactions.map((t: any) => ({
      id: t.id,
      name: t.name,
      amount: t.amount,
      cat: t.cat,
      date: t.date,
      icon: t.icon,
      color: t.color,
      isBank: true,
      bank: t.bank,
      pending: t.pending,
    }));
    
    const cash: CashTransactionItem[] = cashEntries.map(e => ({
      id: e.id,
      name: e.name,
      amount: e.amount,
      cat: e.cat,
      date: 'Today',
      icon: e.icon,
      color: e.color,
      isCash: true,
    }));
    
    return [...bank, ...cash].sort((a, b) => {
      if (a.date === 'Today' && b.date !== 'Today') return -1;
      if (b.date === 'Today' && a.date !== 'Today') return 1;
      return 0;
    });
  };

  const filteredTransactions = (): TransactionItem[] => {
    const all = allTransactions();
    if (activeFilter === 'All') return all;
    return all.filter(t => t.cat === activeFilter);
  };

  // Manual refresh function
  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['bankTransactions', 'student-123'] });
    refetch();
  };

  // Load Teller Connect script (keep your existing function)
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

  // Connect bank function (keep your existing function)
  const connectBank = async () => {
    // ... your existing connectBank code
  };

  // Disconnect bank function
  const disconnectBank = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/teller/disconnect/student-123`, {
        method: 'POST'
      });
      setTellerConnected(false);
      setBankName('');
      // Clear React Query cache
      queryClient.removeQueries({ queryKey: ['bankTransactions', 'student-123'] });
    } catch (error) {
      console.error('Error disconnecting bank:', error);
    }
  };

  // Calculate AI prediction
  const getAIPrediction = () => {
    const dailyAvg = totalSpent / 30 || 0;
    const projectedTotal = dailyAvg * 30;
    const budget = 900;
    const overUnder = projectedTotal - budget;
    
    if (overUnder > 0) {
      return `At your current pace you'll spend ${format(projectedTotal)} this month — ${format(overUnder)} over budget. Cut 1 ${categorySpend.Food ? 'food delivery' : 'expense'} to stay safe.`;
    } else {
      return `Great job! You're on track to spend ${format(projectedTotal)} this month — ${format(Math.abs(overUnder))} under budget. Keep it up!`;
    }
  };

  return (
    <div className="flex flex-col gap-3.5 animate-slide-up">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-bold text-foreground font-display">Spending Tracker</h1>
        <div className="flex gap-2">
          {tellerConnected && (
            <button
              onClick={handleRefresh}
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

      {/* Bank Connection UI */}
      {!tellerConnected && !needsConnect && (
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
              className="gradient-primary text-primary-foreground rounded-xl px-4 py-2 text-xs font-semibold"
            >
              Connect Bank
            </button>
          </div>
        </div>
      )}

      {needsConnect && !tellerConnected && (
        <div className="rounded-2xl p-4 shadow-sm border border-warning/30 bg-warning/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <XCircle className="w-5 h-5 text-warning" />
              <div>
                <p className="text-[13px] font-bold">No Bank Connected</p>
                <p className="text-[10px] text-muted-foreground">
                  Connect to see your real transactions
                </p>
              </div>
            </div>
            <button
              onClick={connectBank}
              className="bg-warning text-white rounded-xl px-4 py-2 text-xs font-semibold"
            >
              Connect
            </button>
          </div>
        </div>
      )}

      {tellerConnected && (
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
      {!isLoading && (
        <div className="rounded-2xl p-4 border-[1.5px] border-info/30" style={{ background: 'linear-gradient(135deg, hsl(217 100% 96%), hsl(162 80% 97%))' }}>
          <p className="text-[11px] text-info font-bold mb-1.5 flex items-center gap-1">
            <Bot className="w-3.5 h-3.5" /> AI PREDICTION
          </p>
          <p className="text-[13px] text-foreground leading-relaxed">
            {getAIPrediction()}
          </p>
        </div>
      )}

      {/* Category Breakdown */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <p className="text-[13px] font-bold text-foreground mb-3.5">By Category</p>
        {Object.entries(categorySpend).map(([cat, amt]) => {
          const percentage = totalSpent > 0 ? Math.round((amt / totalSpent) * 100) : 0;
          const color = CAT_ICONS[cat]?.color || '#6b7280';
          return (
            <div key={cat} className="mb-2.5">
              <div className="flex justify-between mb-1">
                <span className="text-xs text-foreground font-medium">{cat}</span>
                <span className="text-xs font-bold" style={{ color: cat === 'BNPL' ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))' }}>
                  {format(amt)}
                </span>
              </div>
              <div className="h-1.5 bg-border rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${percentage}%`, background: color }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters */}
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

      {/* Transactions */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
        ) : filteredTransactions().length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No transactions found</div>
        ) : (
          filteredTransactions().map((e, i) => (
            <div
              key={e.id}
              className={`flex items-center justify-between px-1.5 py-2.5 rounded-lg hover:bg-muted/50 transition-colors ${
                i < filteredTransactions().length - 1 ? 'border-b border-border' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${e.color}18` }}>
                  <DynamicIcon name={e.icon} className="w-5 h-5" style={{ color: e.color }} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-foreground">{e.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${e.color}18`, color: e.color }}>
                      {e.cat}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{e.date}</span>
                    {e.isBank && e.bank && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {e.bank}
                      </span>
                    )}
                    {e.isBank && e.pending && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning">
                        Pending
                      </span>
                    )}
                    {e.isCash && (
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-warning/10 text-warning">
                        Cash
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold" style={{ color: e.cat === 'BNPL' ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))' }}>
                  −{format(e.amount)}
                </p>
                {e.cat === 'BNPL' && (
                  <p className="text-[9px] text-destructive font-semibold flex items-center gap-0.5 justify-end">
                    DEBT <AlertTriangle className="w-3 h-3" />
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TrackerPage;