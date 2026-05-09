import { useState, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DynamicIcon from "./DynamicIcon";
import {
  Bot,
  Plus,
  X,
  RefreshCw,
  Banknote,
  Unlink,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Edit2,
  Save,
} from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useUserProfile } from "@/contexts/UserProfileContext";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { getOrCreateTrackerUserId } from "@/lib/userId";

// ============================================================================
// Types & Constants
// ============================================================================

declare global {
  interface Window {
    TellerConnect: {
      setup: (config: any) => { open: () => void };
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
  transactionType?: "inflow" | "outflow";
  runningBalance?: number;
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

const FILTERS = [
  "All",
  "Food",
  "Transport",
  "Shopping",
  "BNPL",
  "Entertainment",
  "Other",
] as const;
const CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "BNPL",
  "Other",
] as const;

type Category = (typeof CATEGORIES)[number];
type Filter = (typeof FILTERS)[number];

const CAT_ICONS: Record<Category, { icon: string; color: string }> = {
  Food: { icon: "UtensilsCrossed", color: "#ff6b35" },
  Transport: { icon: "Car", color: "#3b82f6" },
  Shopping: { icon: "ShoppingBag", color: "#f97316" },
  Entertainment: { icon: "Gamepad2", color: "#8b5cf6" },
  BNPL: { icon: "CreditCard", color: "#ff4757" },
  Other: { icon: "Wallet", color: "#6b7280" },
};

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
const USER_ID = getOrCreateTrackerUserId();

// ============================================================================
// Helpers
// ============================================================================

const loadTellerScript = (): Promise<boolean> =>
  new Promise((resolve, reject) => {
    if (window.TellerConnect) {
      resolve(true);
      return;
    }
    const s = document.createElement("script");
    s.src = "https://cdn.teller.io/connect/connect.js";
    s.async = true;
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error("Failed to load Teller Connect"));
    document.body.appendChild(s);
  });

const formatTransactionDate = (date: string | Date): string =>
  new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

const calculateCategorySpend = (
  txs: Transaction[],
): Record<Category, number> =>
  txs.reduce(
    (acc, t) => {
      const cat = (t.cat as Category) || "Other";
      if (t.amount < 0) acc[cat] = (acc[cat] || 0) + Math.abs(t.amount);
      return acc;
    },
    {} as Record<Category, number>,
  );

// ============================================================================
// Component
// ============================================================================

const TrackerPage = () => {
  // format() converts from MYR → selected currency for DISPLAY only
  // All stored values stay in MYR
  const { format, currency } = useCurrency();
  const queryClient = useQueryClient();
  const { profile } = useUserProfile();
  const { updateFromTracker, addTransaction: addToFinancialData } =
    useFinancialData();

  // --------------------------------------------------------------------------
  // UI State
  // --------------------------------------------------------------------------
  const [activeFilter, setActiveFilter] = useState<Filter>("All");
  const [showAddForm, setShowAddForm] = useState(false);
  const [cashEntries, setCashEntries] = useState<Transaction[]>([]);
  const [newEntry, setNewEntry] = useState({
    name: "",
    amount: "",
    cat: "Food" as Category,
  });
  const [connecting, setConnecting] = useState(false);

  // Starting balance — stored & computed in MYR internally
  const [startingBalance, setStartingBalance] = useState<number>(0);
  const [balanceLoaded, setBalanceLoaded] = useState(false);
  const [editingBalance, setEditingBalance] = useState(false);
  // tempBalance is what the user types — in DISPLAY currency
  const [tempBalance, setTempBalance] = useState<string>("");

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------
  const {
    data: connectionData = { connected: false },
    isLoading: connectionLoading,
    refetch: refetchConnection,
  } = useQuery<ConnectionStatus>({
    queryKey: ["bankConnection", USER_ID],
    queryFn: async () => {
      const r = await fetch(`${API_BASE_URL}/api/teller/status/${USER_ID}`);
      return r.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const {
    data: bankData = { transactions: [], bankName: "" },
    isLoading: transactionsLoading,
    isFetching,
    refetch: refetchTransactions,
  } = useQuery<BankData>({
    queryKey: ["bankTransactions", USER_ID],
    queryFn: async () => {
      const r = await fetch(
        `${API_BASE_URL}/api/teller/transactions/${USER_ID}`,
      );
      const data = await r.json();
      if (!data.success) return { transactions: [], bankName: "" };
      const formatted = (data.transactions || []).map((t: any) => ({
        id: t.id,
        name: t.description || t.name,
        amount:
          t.type === "outflow" ? -Math.abs(t.amount) : Math.abs(t.amount),
        cat: t.category || "Other",
        date: formatTransactionDate(t.date),
        icon: CAT_ICONS[t.category as Category]?.icon || "Wallet",
        color: CAT_ICONS[t.category as Category]?.color || "#6b7280",
        bank: t.bank,
        pending: t.pending,
        transactionType: t.type,
      }));
      return { transactions: formatted, bankName: data.bankName };
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    enabled: connectionData?.connected === true,
  });

  // --------------------------------------------------------------------------
  // Derived
  // --------------------------------------------------------------------------
  const isConnected = connectionData?.connected === true;
  const bankName = connectionData?.bankName || bankData?.bankName || "";
  const bankTxs = bankData?.transactions || [];
  const monthlyBudget = profile?.monthly_budget ?? 0;

  // --------------------------------------------------------------------------
  // Load starting balance from localStorage ONCE (stored in MYR)
  // --------------------------------------------------------------------------
  useEffect(() => {
    const saved = localStorage.getItem(`starting-balance-${USER_ID}`);
    if (saved !== null && !isNaN(parseFloat(saved))) {
      setStartingBalance(parseFloat(saved));
    }
    setBalanceLoaded(true);
  }, []);

  // Persist MYR value whenever it changes
  useEffect(() => {
    if (!balanceLoaded) return;
    localStorage.setItem(
      `starting-balance-${USER_ID}`,
      startingBalance.toString(),
    );
  }, [startingBalance, balanceLoaded]);

  // --------------------------------------------------------------------------
  // Cash entries persistence
  // --------------------------------------------------------------------------
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`cash-entries-${USER_ID}`);
      if (stored) setCashEntries(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    if (cashEntries.length > 0) {
      localStorage.setItem(
        `cash-entries-${USER_ID}`,
        JSON.stringify(cashEntries),
      );
    }
  }, [cashEntries]);

  // --------------------------------------------------------------------------
  // Financial calculations (all in MYR)
  // --------------------------------------------------------------------------
  const allTransactions = useMemo(
    () => [...bankTxs, ...cashEntries],
    [bankTxs, cashEntries],
  );

  const filteredTransactions = useMemo(
    () =>
      activeFilter === "All"
        ? allTransactions
        : allTransactions.filter((t) => t.cat === activeFilter),
    [allTransactions, activeFilter],
  );

  const categorySpend = useMemo(
    () => calculateCategorySpend(bankTxs),
    [bankTxs],
  );

  const totalSpent = useMemo(
    () =>
      bankTxs.reduce((s, t) => (t.amount < 0 ? s + Math.abs(t.amount) : s), 0),
    [bankTxs],
  );
  const totalIncome = useMemo(
    () => bankTxs.reduce((s, t) => (t.amount > 0 ? s + t.amount : s), 0),
    [bankTxs],
  );
  const netCashFlow = totalIncome - totalSpent;

  // Core formula — all in MYR
  const currentBalance = startingBalance + totalIncome - totalSpent;

  // Running balance per transaction
  const transactionsWithBalance = useMemo(() => {
    const sorted = [...bankTxs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    let bal = startingBalance;
    return sorted.map((t) => {
      bal += t.amount;
      return { ...t, runningBalance: bal };
    });
  }, [bankTxs, startingBalance]);

  // --------------------------------------------------------------------------
  // Sync to FinancialDataContext (only after localStorage load)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!balanceLoaded) return;
    updateFromTracker({
      totalSpent,
      totalIncome,
      transactions: bankTxs,
      isConnected,
      startingBalance,
    });
  }, [
    totalSpent,
    totalIncome,
    bankTxs,
    isConnected,
    startingBalance,
    balanceLoaded,
    updateFromTracker,
  ]);

  // --------------------------------------------------------------------------
  // Starting balance handlers
  // User edits in DISPLAY currency → stored internally as MYR
  // --------------------------------------------------------------------------
  const handleEditStartingBalance = () => {
    // Convert stored MYR → display currency for the input field
    const inDisplayCurrency = startingBalance * currency.rate;
    setTempBalance(
      currency.code === "IDR" || currency.code === "KHR"
        ? Math.round(inDisplayCurrency).toString()
        : inDisplayCurrency.toFixed(2),
    );
    setEditingBalance(true);
  };

  const handleSaveStartingBalance = () => {
    const parsed = parseFloat(tempBalance);
    if (!isNaN(parsed)) {
      // Convert display currency → MYR for internal storage
      const inMYR = parsed / currency.rate;
      setStartingBalance(inMYR);
    }
    setEditingBalance(false);
    setTempBalance("");
  };

  // --------------------------------------------------------------------------
  // Bank connection handlers
  // --------------------------------------------------------------------------
  const connectBank = async () => {
    setConnecting(true);
    try {
      const configRes = await fetch(`${API_BASE_URL}/api/teller/config`);
      const configData = await configRes.json();
      if (!configData.success) throw new Error("Failed to get Teller config");
      await loadTellerScript();
      const tc = window.TellerConnect.setup({
        applicationId: configData.config.applicationId,
        environment: configData.config.environment,
        products: configData.config.products,
        onInit: () => {},
        onSuccess: async (enrollment: any) => {
          try {
            const cb = await fetch(`${API_BASE_URL}/api/teller/callback`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                accessToken: enrollment.accessToken,
                enrollment: enrollment.enrollment,
                userId: USER_ID,
              }),
            });
            const cbData = await cb.json();
            if (cbData.success) {
              await refetchConnection();
              await refetchTransactions();
            }
          } catch (e) {
            console.error("Callback error:", e);
          } finally {
            setConnecting(false);
          }
        },
        onExit: () => setConnecting(false),
        onError: () => setConnecting(false),
      });
      tc.open();
    } catch {
      setConnecting(false);
    }
  };

  const disconnectBank = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/teller/disconnect/${USER_ID}`, {
        method: "POST",
      });
      queryClient.removeQueries({ queryKey: ["bankTransactions", USER_ID] });
      await refetchConnection();
      setCashEntries([]);
      localStorage.removeItem(`cash-entries-${USER_ID}`);
    } catch {}
  };

  // --------------------------------------------------------------------------
  // Cash transaction handler
  // User inputs in display currency → stored as MYR
  // --------------------------------------------------------------------------
  const addCashTransaction = () => {
    if (!newEntry.name.trim() || !newEntry.amount) return;
    const catInfo = CAT_ICONS[newEntry.cat] || CAT_ICONS.Other;
    // Convert display currency input → MYR for storage
    const amountInDisplayCurrency = parseFloat(newEntry.amount);
    const amountInMYR = amountInDisplayCurrency / currency.rate;
    const entry: Transaction = {
      id: `cash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: newEntry.name,
      amount: -amountInMYR, // outflow = negative MYR
      cat: newEntry.cat,
      date: "Today",
      icon: catInfo.icon,
      color: catInfo.color,
      isCash: true,
      transactionType: "outflow",
    };
    setCashEntries((prev) => [...prev, entry]);
    addToFinancialData(entry);
    setNewEntry({ name: "", amount: "", cat: "Food" });
    setShowAddForm(false);
    fetch(`${API_BASE_URL}/api/transactions/manual`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: USER_ID,
        name: newEntry.name,
        amount: amountInMYR,
        category: newEntry.cat,
        currency: currency.code,
      }),
    }).catch(() => {});
  };

  // --------------------------------------------------------------------------
  // AI Prediction
  // --------------------------------------------------------------------------
  const getAIPrediction = (): string => {
    if (!isConnected) return "Connect your bank to see AI-powered predictions.";
    if (totalSpent === 0 && totalIncome === 0)
      return "No transactions yet this month.";

    const now = new Date();
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
    ).getDate();
    const currentDay = now.getDate();
    const projectedSpending = (totalSpent / currentDay) * daysInMonth;
    const projectedIncome = (totalIncome / currentDay) * daysInMonth;
    const projectedNet = projectedIncome - projectedSpending;
    const savingsRate = totalIncome > 0 ? (netCashFlow / totalIncome) * 100 : 0;

    if (totalIncome === 0)
      return `⚠️ No income detected. You've spent ${format(totalSpent)}.`;

    if (monthlyBudget > 0) {
      const projectedOver = projectedSpending - monthlyBudget;
      if (projectedOver > 0) {
        return `⚠️ At this pace, you'll exceed your ${format(monthlyBudget)} budget by ${format(projectedOver)}. Savings rate: ${savingsRate.toFixed(1)}%.`;
      }
    }

    if (projectedNet < 0) {
      return `⚠️ Spending more than you earn. Projected net loss: ${format(Math.abs(projectedNet))}. Savings rate: ${savingsRate.toFixed(1)}%.`;
    }

    return `✅ On track to save ${format(projectedNet)} this month (${savingsRate.toFixed(1)}% savings rate). Spent ${format(totalSpent)}${monthlyBudget > 0 ? ` of your ${format(monthlyBudget)} budget` : " so far"}.`;
  };

  const getBudgetStatus = () => {
    if (monthlyBudget <= 0)
      return {
        color: "text-muted-foreground",
        message: "No budget set",
        percentage: 0,
      };
    const pct = (totalSpent / monthlyBudget) * 100;
    if (pct >= 100)
      return {
        color: "text-destructive",
        message: "Budget exceeded!",
        percentage: pct,
      };
    if (pct >= 80)
      return {
        color: "text-warning",
        message: "Close to budget limit",
        percentage: pct,
      };
    if (pct >= 50)
      return {
        color: "text-primary",
        message: "Halfway through budget",
        percentage: pct,
      };
    return {
      color: "text-success",
      message: "Well within budget",
      percentage: pct,
    };
  };
  const budgetStatus = getBudgetStatus();

  // --------------------------------------------------------------------------
  // Render helpers
  // --------------------------------------------------------------------------
  const renderConnectionStatus = () =>
    isConnected ? (
      <div className="rounded-2xl p-4 shadow-sm border border-green-500/30 bg-green-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium">Connected to {bankName}</span>
            <CheckCircle className="w-4 h-4 text-green-500" />
          </div>
          <button
            onClick={disconnectBank}
            className="text-destructive hover:text-destructive/80 text-xs flex items-center gap-1"
          >
            <Unlink className="w-3 h-3" /> Disconnect
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
            {connecting ? "Connecting..." : "Connect Bank"}
          </button>
        </div>
      </div>
    );

  const renderAddForm = () =>
    !showAddForm ? null : (
      <div className="bg-card rounded-2xl p-4 shadow-sm border-[1.5px] border-primary/30 animate-slide-up">
        <p className="text-[13px] font-bold text-foreground mb-3">
          Add Cash Transaction
        </p>
        <div className="flex flex-col gap-2.5">
          <input
            value={newEntry.name}
            onChange={(e) =>
              setNewEntry((p) => ({ ...p, name: e.target.value }))
            }
            placeholder="Description (e.g. Lunch)"
            className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-border text-[13px] text-foreground outline-none focus:border-primary transition-colors bg-card"
          />
          <input
            value={newEntry.amount}
            onChange={(e) =>
              setNewEntry((p) => ({ ...p, amount: e.target.value }))
            }
            placeholder={`Amount (${currency.symbol})`}
            type="number"
            step="0.01"
            className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-border text-[13px] text-foreground outline-none focus:border-primary transition-colors bg-card"
          />
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setNewEntry((p) => ({ ...p, cat: c }))}
                className={`text-[11px] px-3 py-1 rounded-full border-[1.5px] transition-all ${newEntry.cat === c ? "border-primary bg-accent text-primary font-semibold" : "border-border bg-card text-muted-foreground"}`}
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
              onClick={() => {
                setNewEntry({ name: "", amount: "", cat: "Food" });
                setShowAddForm(false);
              }}
              className="px-4 py-3 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );

  const renderTransactions = () => {
    if (connectionLoading)
      return (
        <div className="text-center py-8 text-muted-foreground">
          Checking connection...
        </div>
      );
    if (!isConnected)
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
    if (transactionsLoading)
      return (
        <div className="text-center py-8 text-muted-foreground">
          Loading transactions...
        </div>
      );
    if (filteredTransactions.length === 0)
      return (
        <div className="text-center py-8 text-muted-foreground">
          No transactions found for this filter
        </div>
      );

    const toShow =
      activeFilter === "All"
        ? transactionsWithBalance
        : transactionsWithBalance.filter((t) => t.cat === activeFilter);

    return (
      <div className="space-y-2">
        {toShow.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${t.color}18` }}
              >
                <DynamicIcon
                  name={t.icon}
                  className="w-5 h-5"
                  style={{ color: t.color }}
                />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">
                  {t.name}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: `${t.color}18`, color: t.color }}
                  >
                    {t.cat}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {t.date}
                  </span>
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
                  {t.transactionType && (
                    <span
                      className={`text-[8px] px-1.5 py-0.5 rounded-full ${t.transactionType === "inflow" ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}
                    >
                      {t.transactionType === "inflow"
                        ? "💰 Income"
                        : "💸 Spent"}
                    </span>
                  )}
                </div>
                {t.runningBalance !== undefined && (
                  <p className="text-[9px] text-muted-foreground mt-0.5">
                    Balance: {format(t.runningBalance)}
                  </p>
                )}
              </div>
            </div>
            <p
              className={`text-sm font-bold ${t.amount > 0 ? "text-green-600" : "text-red-600"}`}
            >
              {t.amount > 0
                ? `+${format(t.amount)}`
                : `−${format(Math.abs(t.amount))}`}
            </p>
          </div>
        ))}
      </div>
    );
  };

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-3.5 animate-slide-up pb-20">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-bold text-foreground font-display">
          Spending Tracker
        </h1>
        <div className="flex gap-2">
          {isConnected && (
            <button
              onClick={() => refetchTransactions()}
              disabled={isFetching}
              className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center"
              title="Refresh"
            >
              <RefreshCw
                className={`w-4 h-4 text-primary ${isFetching ? "animate-spin" : ""}`}
              />
            </button>
          )}
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-primary"
          >
            {showAddForm ? (
              <X className="w-4 h-4 text-primary-foreground" />
            ) : (
              <Plus className="w-4 h-4 text-primary-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* Financial Summary */}
      {isConnected && (
        <div className="space-y-3">
          {/* Starting Balance */}
          <div className="bg-card rounded-2xl p-4 shadow-sm border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Banknote className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">
                    Starting Balance
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    Balance before tracked transactions
                  </p>
                </div>
              </div>
              {!editingBalance ? (
                <button
                  onClick={handleEditStartingBalance}
                  className="text-[10px] text-primary hover:underline flex items-center gap-1"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              ) : (
                <button
                  onClick={handleSaveStartingBalance}
                  className="text-[10px] text-green-600 hover:underline flex items-center gap-1"
                >
                  <Save className="w-3 h-3" /> Save
                </button>
              )}
            </div>
            {!editingBalance ? (
              <p
                className={`text-xl font-bold ${startingBalance >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {format(startingBalance)}
              </p>
            ) : (
              <div>
                <input
                  type="number"
                  step="0.01"
                  value={tempBalance}
                  onChange={(e) => setTempBalance(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && handleSaveStartingBalance()
                  }
                  className="w-full px-3 py-2 rounded-xl border-[1.5px] border-primary text-[13px] text-foreground outline-none focus:border-primary transition-colors bg-card"
                  placeholder={`Enter amount in ${currency.code}`}
                  autoFocus
                />
                <p className="text-[9px] text-muted-foreground mt-1 px-1">
                  Enter in {currency.symbol} ({currency.code})
                </p>
              </div>
            )}
          </div>

          {/* Current Balance */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl p-4 shadow-sm border border-primary/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <Banknote className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground">
                  Current Balance
                </p>
                <p className="text-[9px] text-muted-foreground">
                  Starting + Income − Spending
                </p>
              </div>
            </div>
            <p
              className={`text-2xl font-bold ${currentBalance >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {format(currentBalance)}
            </p>
          </div>

          {/* Income vs Spending */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-2xl p-4 shadow-sm border border-green-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">
                    Total Money In
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    Money received
                  </p>
                </div>
              </div>
              <p className="text-xl font-bold text-green-600">
                +{format(totalIncome)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                from {bankTxs.filter((t) => t.amount > 0).length} transactions
              </p>
            </div>
            <div className="bg-card rounded-2xl p-4 shadow-sm border border-red-500/20">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">
                    Total Money Out
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    Money spent
                  </p>
                </div>
              </div>
              <p className="text-xl font-bold text-red-600">
                −{format(totalSpent)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                from {bankTxs.filter((t) => t.amount < 0).length} transactions
              </p>
            </div>
          </div>

          {/* Net Cash Flow */}
          <div
            className={`rounded-2xl p-4 shadow-sm ${netCashFlow >= 0 ? "bg-green-500/5 border border-green-500/30" : "bg-red-500/5 border border-red-500/30"}`}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-muted-foreground">
                Net Cash Flow (This Month)
              </p>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-card">
                Income − Spending
              </span>
            </div>
            <p
              className={`text-xl font-bold ${netCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {netCashFlow >= 0 ? "+" : "−"}
              {format(Math.abs(netCashFlow))}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {netCashFlow >= 0
                ? `✓ Saved ${format(netCashFlow)} this month`
                : `✗ Spent ${format(Math.abs(netCashFlow))} more than earned`}
            </p>
            {totalIncome > 0 && (
              <div className="mt-2 pt-2 border-t border-border/50">
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">Savings Rate</span>
                  <span className="font-semibold">
                    {Math.round((netCashFlow / totalIncome) * 100)}% of income
                    saved
                  </span>
                </div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-700"
                    style={{
                      width: `${Math.max(0, Math.min(100, (netCashFlow / totalIncome) * 100))}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Budget — only if configured */}
          {monthlyBudget > 0 && (
            <div className="bg-card rounded-2xl p-4 shadow-sm border border-primary/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-muted-foreground">
                  Monthly Budget Goal
                </span>
                <span className="text-xs font-medium">
                  {budgetStatus.message}
                </span>
              </div>
              <div className="flex justify-between items-baseline mb-2">
                <span className="text-2xl font-bold">{format(totalSpent)}</span>
                <span className="text-sm text-muted-foreground">
                  of {format(monthlyBudget)}
                </span>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden mb-1">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${totalSpent / monthlyBudget >= 1 ? "bg-destructive" : totalSpent / monthlyBudget >= 0.8 ? "bg-warning" : "bg-primary"}`}
                  style={{
                    width: `${Math.min((totalSpent / monthlyBudget) * 100, 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Spent: {format(totalSpent)}</span>
                <span>
                  Remaining: {format(Math.max(0, monthlyBudget - totalSpent))}
                </span>
              </div>
              {totalSpent > monthlyBudget && (
                <p className="text-[10px] text-destructive mt-2">
                  ⚠️ Overspent by {format(totalSpent - monthlyBudget)}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Connection Status */}
      {renderConnectionStatus()}

      {/* Add Form */}
      {renderAddForm()}

      {/* AI Prediction */}
      {isConnected ? (
        <div
          className="rounded-2xl p-4 border-[1.5px] border-info/30"
          style={{
            background:
              "linear-gradient(135deg, hsl(217 100% 96%), hsl(162 80% 97%))",
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] text-info font-bold flex items-center gap-1">
              <Bot className="w-3.5 h-3.5" /> AI PREDICTION
            </p>
            {monthlyBudget > 0 && (
              <span
                className={`text-[10px] font-semibold ${budgetStatus.color}`}
              >
                {Math.round((totalSpent / monthlyBudget) * 100)}% of budget used
              </span>
            )}
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
            Connect your bank account to see AI-powered spending predictions and
            insights.
          </p>
        </div>
      )}

      {/* Category Breakdown */}
      {isConnected && (
        <div className="bg-card rounded-2xl p-4 shadow-sm">
          <p className="text-[13px] font-bold text-foreground mb-3.5">
            Spending by Category
          </p>
          {CATEGORIES.map((cat) => {
            const amount = categorySpend[cat] || 0;
            const percentage =
              totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0;
            const color = CAT_ICONS[cat]?.color || "#6b7280";
            return (
              <div key={cat} className="mb-2.5">
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-foreground font-medium">
                    {cat}
                  </span>
                  <span
                    className="text-xs font-bold"
                    style={{
                      color:
                        cat === "BNPL"
                          ? "hsl(var(--destructive))"
                          : "hsl(var(--foreground))",
                    }}
                  >
                    {format(amount)}
                  </span>
                </div>
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${percentage}%`,
                      background: color,
                      opacity: amount === 0 ? 0.3 : 1,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filters */}
      {isConnected && allTransactions.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`text-[11px] px-3 py-1 rounded-full border-[1.5px] transition-all ${activeFilter === f ? "border-primary bg-accent text-primary font-semibold" : "border-border bg-card text-muted-foreground"}`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Transactions */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <p className="text-[13px] font-bold text-foreground mb-3.5">
          Transactions
        </p>
        {renderTransactions()}
      </div>
    </div>
  );
};

export default TrackerPage;