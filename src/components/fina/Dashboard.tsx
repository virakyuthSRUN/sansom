import { EXPENSES, GOALS } from '@/lib/constants'; // Import GOALS from constants
import type { PageId } from '@/lib/constants';
import RingChart from './RingChart';
import BarChart from './BarChart';
import DynamicIcon from './DynamicIcon';
import { ArrowUpRight, ArrowDownRight, AlertTriangle, Sparkles, ChevronRight, Plus } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

interface DashboardProps {
  setPage: (page: PageId) => void;
}

// Dummy data
const DUMMY_DATA = {
  balance: 12004,
  moneyIn: 14000,
  moneyOut: 1996,
  monthlySpent: 620,
  monthlyBudget: 900,
  spendPct: 68,
  debtRisk: 'MEDIUM',
  bnplCount: 2,
  aiTip: "Cooking and eating in will help you save more money. You're spending $89 more on food this month vs last month."
};

const monthData = [
  { label: 'Oct', val: 820 }, { label: 'Nov', val: 950 },
  { label: 'Dec', val: 1100 }, { label: 'Jan', val: 780 },
  { label: 'Feb', val: 890 }, { label: 'Mar', val: 620, active: true },
];

const Dashboard = ({ setPage }: DashboardProps) => {
  const { format } = useCurrency();
  
  // Use GOALS from constants - same as DebtGoalsPage
  const goals = GOALS;

  return (
    <div className="flex flex-col gap-4 animate-slide-up">
      {/* Hero Balance Card */}
      <div className="gradient-primary rounded-3xl p-5 sm:p-6 text-primary-foreground relative overflow-hidden">
        <div className="absolute -top-5 -right-5 w-28 h-28 rounded-full bg-white/[0.08]" />
        <div className="absolute -bottom-8 right-8 w-20 h-20 rounded-full bg-white/[0.06]" />
        <p className="text-xs opacity-80 font-medium mb-1">Hello, Dara 👋</p>
        <p className="text-[11px] opacity-70 mb-4">Here's your financial snapshot</p>
        <p className="text-[13px] opacity-85 font-medium mb-1.5">Balance</p>
        <p className="text-[28px] sm:text-[34px] font-bold tracking-tight font-display">{format(DUMMY_DATA.balance)}</p>
        <div className="flex gap-3 sm:gap-4 mt-4">
          {[
            { label: 'Money in', value: format(DUMMY_DATA.moneyIn), Icon: ArrowUpRight, bg: 'rgba(255,255,255,0.2)' },
            { label: 'Money out', value: format(DUMMY_DATA.moneyOut), Icon: ArrowDownRight, bg: 'rgba(255,80,80,0.25)' },
          ].map(item => (
            <div key={item.label} className="rounded-xl px-3 sm:px-3.5 py-2 flex-1" style={{ background: item.bg }}>
              <p className="text-[10px] opacity-80 mb-0.5 flex items-center gap-1">
                <item.Icon className="w-3 h-3" /> {item.label}
              </p>
              <p className="text-sm sm:text-base font-bold">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Savings Goals Row */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <div>
            <p className="text-[13px] font-bold text-foreground">Savings Goals</p>
            {goals.length > 0 ? (
              <p className="text-[11px] text-muted-foreground">
                {format(goals.reduce((s, g) => s + g.saved, 0))}{' '}
                <span className="text-foreground font-medium">out of {format(goals.reduce((s, g) => s + g.target, 0))}</span>
              </p>
            ) : (
              <p className="text-[11px] text-muted-foreground">No goals yet</p>
            )}
          </div>
          <button className="text-[11px] text-primary font-semibold" onClick={() => setPage('debtgoals')}>
            {goals.length > 0 ? 'See all' : 'Add goal'}
          </button>
        </div>
        <div className="flex gap-3 items-center">
          {goals.slice(0, 4).map(g => {
            const pct = Math.round((g.saved / g.target) * 100);
            return (
              <button key={g.id} onClick={() => setPage('debtgoals')} className="flex flex-col items-center gap-1.5 group">
                <div className="relative">
                  <RingChart pct={pct} size={48} color={g.color} stroke={4} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <DynamicIcon name={g.icon} className="w-4 h-4" style={{ color: g.color }} />
                  </div>
                </div>
                <span className="text-[9px] text-muted-foreground group-hover:text-primary transition-colors">{g.name.split(' ')[0]}</span>
              </button>
            );
          })}
          {goals.length === 0 && (
            <button onClick={() => setPage('debtgoals')} className="flex flex-col items-center gap-1.5">
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-border flex items-center justify-center hover:border-primary transition-colors">
                <Plus className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-[9px] text-muted-foreground">Add Goal</span>
            </button>
          )}
        </div>
      </div>

      {/* Budget + Spending Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center gap-2">
          <p className="text-[11px] text-muted-foreground font-semibold self-start">Monthly Budget</p>
          <RingChart pct={DUMMY_DATA.spendPct} size={88} label={`${DUMMY_DATA.spendPct}%`} sub="used" />
          <p className="text-[11px] text-muted-foreground text-center">
            {format(DUMMY_DATA.monthlySpent)} <span className="text-foreground font-semibold">/ {format(DUMMY_DATA.monthlyBudget)}</span>
          </p>
        </div>
        <div className="bg-card rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-[11px] text-muted-foreground font-semibold mb-3">Spending Trend</p>
          <BarChart data={monthData} />
        </div>
      </div>

      {/* Debt Risk Alert */}
      <div
        className="bg-card rounded-2xl p-4 border-[1.5px] border-warning/30 cursor-pointer shadow-sm hover:shadow-md transition-all"
        style={{ background: 'linear-gradient(135deg, hsl(38 100% 97%), hsl(0 0% 100%))' }}
        onClick={() => setPage('debtgoals')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-[42px] h-[42px] rounded-xl bg-warning-light flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" style={{ color: '#d97706' }} />
            </div>
            <div>
              <p className="text-[13px] font-bold" style={{ color: '#d97706' }}>Debt Risk: {DUMMY_DATA.debtRisk}</p>
              <p className="text-[11px] text-muted-foreground">{DUMMY_DATA.bnplCount} active BNPL plans detected</p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5" style={{ color: '#d97706' }} />
        </div>
      </div>

      {/* AI Tip */}
      <div
        className="bg-card rounded-2xl p-4 border-[1.5px] border-accent cursor-pointer shadow-sm hover:shadow-md transition-all"
        onClick={() => setPage('chat')}
      >
        <div className="flex items-center gap-2.5 mb-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xs font-bold text-primary">SANSOM's Tip</p>
        </div>
        <p className="text-[13px] text-foreground leading-relaxed">
          "{DUMMY_DATA.aiTip}"
        </p>
        <p className="text-[11px] text-primary mt-2 font-semibold">Ask SANSOM more →</p>
      </div>

      {/* Recent Transactions */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <div className="flex justify-between items-center mb-3.5">
          <p className="text-[13px] font-bold text-foreground">Recent Transactions</p>
          <button className="text-[11px] text-primary font-semibold" onClick={() => setPage('tracker')}>See all →</button>
        </div>
        {EXPENSES.slice(0, 3).map(e => (
          <div key={e.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-b-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${e.color}18` }}>
                <DynamicIcon name={e.icon} className="w-5 h-5" style={{ color: e.color }} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">{e.name}</p>
                <p className="text-[10px] text-muted-foreground">{e.cat}</p>
              </div>
            </div>
            <p className="text-[13px] font-bold" style={{ color: e.cat === 'BNPL' ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))' }}>
              −{format(e.amount)}
            </p>
          </div>
        ))}
      </div>

      {/* Top 3 Spends */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <p className="text-[13px] font-bold text-foreground mb-3">Top 3 spends this month</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: 'UtensilsCrossed', label: 'Food', amount: 210.57, color: '#ff6b35' },
            { icon: 'ShoppingBag', label: 'Shopping', amount: 73.20, color: '#f97316' },
            { icon: 'Gamepad2', label: 'Fun', amount: 63.10, color: '#8b5cf6' },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-3 flex flex-col items-center gap-1.5" style={{ background: `${item.color}10` }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${item.color}20` }}>
                <DynamicIcon name={item.icon} className="w-4 h-4" style={{ color: item.color }} />
              </div>
              <p className="text-[12px] font-bold text-foreground">{format(item.amount)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;