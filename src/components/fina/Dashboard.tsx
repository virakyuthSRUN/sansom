import { EXPENSES } from '@/lib/constants';
import type { PageId } from '@/lib/constants';
import RingChart from './RingChart';
import BarChart from './BarChart';
import DynamicIcon from './DynamicIcon';
import { ArrowUpRight, ArrowDownRight, AlertTriangle, Sparkles, ChevronRight } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

interface DashboardProps {
  setPage: (page: PageId) => void;
}

const Dashboard = ({ setPage }: DashboardProps) => {
  const { format } = useCurrency();
  const spendPct = 68;
  const monthData = [
    { label: 'Oct', val: 820 }, { label: 'Nov', val: 950 },
    { label: 'Dec', val: 1100 }, { label: 'Jan', val: 780 },
    { label: 'Feb', val: 890 }, { label: 'Mar', val: 620, active: true },
  ];

  return (
    <div className="flex flex-col gap-4 animate-slide-up">
      {/* Hero Balance Card */}
      <div className="gradient-primary rounded-3xl p-5 sm:p-6 text-primary-foreground relative overflow-hidden">
        <div className="absolute -top-5 -right-5 w-28 h-28 rounded-full bg-white/[0.08]" />
        <div className="absolute -bottom-8 right-8 w-20 h-20 rounded-full bg-white/[0.06]" />
        <p className="text-xs opacity-80 font-medium mb-1">Good morning, Aisha</p>
        <p className="text-[11px] opacity-70 mb-4">Here's your financial snapshot</p>
        <p className="text-[13px] opacity-85 font-medium mb-1.5">Total Balance</p>
        <p className="text-[28px] sm:text-[34px] font-bold tracking-tight font-display">{format(2840.50)}</p>
        <div className="flex gap-3 sm:gap-4 mt-4">
          {[
            { label: 'Income', value: format(1800), Icon: ArrowUpRight, bg: 'rgba(255,255,255,0.2)' },
            { label: 'Expenses', value: format(620), Icon: ArrowDownRight, bg: 'rgba(255,80,80,0.25)' },
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

      {/* Budget + Spending Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card rounded-2xl p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center gap-2">
          <p className="text-[11px] text-muted-foreground font-semibold self-start">Monthly Budget</p>
          <RingChart pct={spendPct} size={88} label={`${spendPct}%`} sub="used" />
          <p className="text-[11px] text-muted-foreground text-center">
            {format(620)} <span className="text-foreground font-semibold">/ {format(900)}</span>
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
        onClick={() => setPage('debt')}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-[42px] h-[42px] rounded-xl bg-warning-light flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" style={{ color: '#d97706' }} />
            </div>
            <div>
              <p className="text-[13px] font-bold" style={{ color: '#d97706' }}>Debt Risk: MEDIUM</p>
              <p className="text-[11px] text-muted-foreground">2 active BNPL plans detected</p>
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
          <p className="text-xs font-bold text-primary">FINA's Tip of the Day</p>
        </div>
        <p className="text-[13px] text-foreground leading-relaxed">
          "You're spending <b>{format(89)}</b> more on food this month vs last month. Try cooking 2x a week to save {format(120)}."
        </p>
        <p className="text-[11px] text-primary mt-2 font-semibold">Ask FINA more →</p>
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
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${e.color}18` }}>
                <DynamicIcon name={e.icon} className="w-4 h-4" style={{ color: e.color }} />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-foreground">{e.name}</p>
                <p className="text-[10px] text-muted-foreground">{e.cat} · {e.date}</p>
              </div>
            </div>
            <p className="text-[13px] font-bold" style={{ color: e.cat === 'BNPL' ? 'hsl(var(--destructive))' : 'hsl(var(--foreground))' }}>
              −{format(e.amount)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
