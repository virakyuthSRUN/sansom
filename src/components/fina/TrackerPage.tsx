import { useState } from 'react';
import { EXPENSES } from '@/lib/constants';
import DynamicIcon from './DynamicIcon';
import { Bot, AlertTriangle, Plus, X } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

const CAT_SPEND = [
  { cat: 'Shopping', amt: 89.9, color: '#f97316', pct: 28 },
  { cat: 'Food', amt: 42.5, color: '#ff6b35', pct: 20 },
  { cat: 'BNPL', amt: 150, color: '#ff4757', pct: 30 },
  { cat: 'Transport', amt: 12, color: '#3b82f6', pct: 12 },
  { cat: 'Others', amt: 45, color: '#8b5cf6', pct: 10 },
];

const FILTERS = ['All', 'Food', 'Transport', 'Shopping', 'BNPL', 'Entertainment'];
const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Entertainment', 'BNPL', 'Other'];

interface CashEntry {
  id: number;
  name: string;
  amount: number;
  cat: string;
  date: string;
  icon: string;
  color: string;
}

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
  const [activeFilter, setActiveFilter] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
  const [newEntry, setNewEntry] = useState({ name: '', amount: '', cat: 'Food' });

  const allExpenses = [...EXPENSES, ...cashEntries];
  const filtered = activeFilter === 'All' ? allExpenses : allExpenses.filter(e => e.cat === activeFilter);

  const addCashTransaction = () => {
    if (!newEntry.name.trim() || !newEntry.amount) return;
    const catInfo = CAT_ICONS[newEntry.cat] || CAT_ICONS.Other;
    setCashEntries(prev => [...prev, {
      id: Date.now(),
      name: newEntry.name,
      amount: parseFloat(newEntry.amount),
      cat: newEntry.cat,
      date: 'Today',
      icon: catInfo.icon,
      color: catInfo.color,
    }]);
    setNewEntry({ name: '', amount: '', cat: 'Food' });
    setShowAddForm(false);
  };

  return (
    <div className="flex flex-col gap-3.5 animate-slide-up">
      <div className="flex justify-between items-center">
        <h1 className="text-lg font-bold text-foreground font-display">Spending Tracker</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-primary"
        >
          {showAddForm ? <X className="w-4 h-4 text-primary-foreground" /> : <Plus className="w-4 h-4 text-primary-foreground" />}
        </button>
      </div>

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
      <div className="rounded-2xl p-4 border-[1.5px] border-info/30" style={{ background: 'linear-gradient(135deg, hsl(217 100% 96%), hsl(162 80% 97%))' }}>
        <p className="text-[11px] text-info font-bold mb-1.5 flex items-center gap-1">
          <Bot className="w-3.5 h-3.5" /> AI PREDICTION
        </p>
        <p className="text-[13px] text-foreground leading-relaxed">
          At your current pace you'll spend <span className="font-bold text-destructive">{format(920)}</span> this month — <span className="font-bold">{format(20)} over budget</span>. Cut 1 food delivery to stay safe.
        </p>
      </div>

      {/* Category Breakdown */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <p className="text-[13px] font-bold text-foreground mb-3.5">By Category</p>
        {CAT_SPEND.map(c => (
          <div key={c.cat} className="mb-2.5">
            <div className="flex justify-between mb-1">
              <span className="text-xs text-foreground font-medium">{c.cat}</span>
              <span className="text-xs font-bold" style={{ color: c.cat === 'BNPL' ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))' }}>
                {format(c.amt)}
              </span>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${c.pct * 3}%`, background: c.color }} />
            </div>
          </div>
        ))}
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
        {filtered.map((e, i) => (
          <div
            key={e.id}
            className={`flex items-center justify-between px-1.5 py-2.5 rounded-lg hover:bg-muted/50 transition-colors ${
              i < filtered.length - 1 ? 'border-b border-border' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${e.color}18` }}>
                <DynamicIcon name={e.icon} className="w-5 h-5" style={{ color: e.color }} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">{e.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${e.color}18`, color: e.color }}>{e.cat}</span>
                  <span className="text-[10px] text-muted-foreground">{e.date}</span>
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
        ))}
      </div>
    </div>
  );
};

export default TrackerPage;
