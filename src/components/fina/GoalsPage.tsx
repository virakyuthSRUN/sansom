import { GOALS } from '@/lib/constants';
import RingChart from './RingChart';

const GoalsPage = () => {
  return (
    <div className="flex flex-col gap-3.5 animate-slide-up">
      <h1 className="text-lg font-bold text-foreground font-display">Savings Goals</h1>

      {/* AI Plan Banner */}
      <div className="gradient-primary rounded-2xl p-4 text-primary-foreground">
        <p className="text-[11px] font-bold opacity-80 mb-1.5">✨ AI SAVINGS PLAN</p>
        <p className="text-[13px] leading-relaxed">
          Save <b>RM 200/month</b> across your 3 goals. At this rate, your Emergency Fund is reached by <b>June 2026</b>!
        </p>
      </div>

      {/* Goals */}
      {GOALS.map(g => {
        const pct = Math.round((g.saved / g.target) * 100);
        const remaining = g.target - g.saved;
        const months = Math.ceil(remaining / 200);
        return (
          <div key={g.id} className="bg-card rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-3">
                <div className="w-[46px] h-[46px] rounded-xl flex items-center justify-center text-[22px]" style={{ background: `${g.color}18` }}>
                  {g.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{g.name}</p>
                  <p className="text-[11px] text-muted-foreground">Target by {g.deadline}</p>
                </div>
              </div>
              <RingChart pct={pct} size={56} color={g.color} stroke={6} label={`${pct}%`} />
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-xs text-muted-foreground">Saved: <b className="text-foreground">RM {g.saved.toLocaleString()}</b></span>
              <span className="text-xs text-muted-foreground">Goal: <b className="text-foreground">RM {g.target.toLocaleString()}</b></span>
            </div>
            <div className="h-2 bg-border rounded-full overflow-hidden mb-2.5">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${g.color}90, ${g.color})` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-muted-foreground">RM {remaining.toLocaleString()} left · ~{months} months</span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: `${g.color}18`, color: g.color }}>
                On Track ✓
              </span>
            </div>
          </div>
        );
      })}

      {/* Add Goal */}
      <div className="border-2 border-dashed border-border rounded-2xl p-5 flex items-center justify-center gap-2 cursor-pointer hover:border-primary transition-colors">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center text-primary text-lg font-bold">+</div>
        <p className="text-[13px] font-semibold text-muted-foreground">Add a new savings goal</p>
      </div>
    </div>
  );
};

export default GoalsPage;
