import { useState } from 'react';
import { useFinancialData } from '@/contexts/FinancialDataContext';
import RingChart from './RingChart';
import DynamicIcon from './DynamicIcon';
import AddGoalDialog from './AddGoalDialog';
import { Calculator, CheckCircle, AlertTriangle, AlertOctagon, Sparkles, Plus, Check } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';

const getColor = (s: number) => s <= 30 ? '#00c896' : s <= 60 ? '#ffb300' : '#ff4757';
const getLabel = (s: number) => s <= 30 ? 'LOW RISK' : s <= 60 ? 'MEDIUM RISK' : 'HIGH RISK';
const getBg = (s: number) => s <= 30 ? 'hsl(var(--success-light))' : s <= 60 ? 'hsl(var(--warning-light))' : 'hsl(0 72% 96%)';

const RiskIcon = ({ score }: { score: number }) => {
  if (score <= 30) return <CheckCircle className="w-4 h-4 inline mr-1" />;
  if (score <= 60) return <AlertTriangle className="w-4 h-4 inline mr-1" />;
  return <AlertOctagon className="w-4 h-4 inline mr-1" />;
};

type Tab = 'debt' | 'goals';

const DebtGoalsPage = () => {
  const { format, currency } = useCurrency();
  const { data, updateGoal } = useFinancialData();
  const [tab, setTab] = useState<Tab>('debt');
  const [checked, setChecked] = useState({ income: '', savings: '', bnpl: '', loans: '' });
  const [simScore, setSimScore] = useState<number | null>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);

  const simulate = () => {
    const i = parseFloat(checked.income) || 1500;
    const bn = parseFloat(checked.bnpl) || 0;
    const lo = parseFloat(checked.loans) || 0;
    const ratio = ((bn + lo) / i) * 100;
    setSimScore(Math.min(100, Math.round(ratio * 1.8)));
  };

  const addGoal = (newGoal: any) => {
    const goalWithId = {
      ...newGoal,
      id: `goal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
    // This would need to be implemented in the context
    // For now, just show the dialog
    setShowAddGoal(false);
  };

  return (
    <div className="flex flex-col gap-3.5 animate-slide-up">
      {/* Tab Switcher */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {([
          { id: 'debt' as Tab, label: 'Debt Risk', icon: AlertTriangle },
          { id: 'goals' as Tab, label: 'Goals', icon: Check },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${
              tab === t.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'debt' ? (
        <>
          {/* Main Score */}
          <div
            className="bg-card rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-5 border-2"
            style={{ background: getBg(data.debtScore), borderColor: `${getColor(data.debtScore)}30` }}
          >
            <RingChart pct={data.debtScore} size={96} color={getColor(data.debtScore)} bg="#e8e8e8" stroke={9} label={`${data.debtScore}`} sub="/ 100" />
            <div className="flex-1 text-center sm:text-left">
              <p className="text-[11px] text-muted-foreground font-semibold mb-1">YOUR DEBT RISK SCORE</p>
              <p className="text-[22px] font-extrabold font-display" style={{ color: getColor(data.debtScore) }}>{getLabel(data.debtScore)}</p>
              <p className="text-xs text-foreground leading-relaxed mt-1.5">
                You have {data.bnplCount} active BNPL plans. Your debt-to-income ratio is <b>25%</b> — approaching the danger zone of 30%.
              </p>
            </div>
          </div>

          {/* Active BNPLs */}
          <div className="bg-card rounded-2xl p-4 shadow-sm">
            <p className="text-[13px] font-bold text-foreground mb-3.5">Active BNPL / Loans</p>
            {data.bnpls.map((b, i) => (
              <div key={i} className={`bg-muted rounded-xl p-3.5 ${i < data.bnpls.length - 1 ? 'mb-2.5' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-[13px] font-bold text-foreground">{b.name}</p>
                    <p className="text-[11px] text-muted-foreground">{b.platform} · {b.rate}% p.a.</p>
                  </div>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      background: b.risk === 'HIGH' ? 'hsl(0 72% 96%)' : 'hsl(var(--warning-light))',
                      color: b.risk === 'HIGH' ? 'hsl(var(--destructive))' : 'hsl(var(--warning))',
                    }}
                  >
                    {b.risk}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[['Outstanding', format(b.amount)], ['Monthly', format(b.monthly)], ['Status', b.status]].map(([l, v]) => (
                    <div key={l} className="text-center">
                      <p className="text-[9px] text-muted-foreground mb-0.5">{l}</p>
                      <p className="text-xs font-bold text-foreground">{v}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Simulator */}
          <div className="bg-card rounded-2xl p-4 shadow-sm">
            <p className="text-[13px] font-bold text-foreground mb-1 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-muted-foreground" /> Risk Simulator
            </p>
            <p className="text-[11px] text-muted-foreground mb-3.5">Enter your details to get a personalised risk score</p>
            <div className="grid grid-cols-2 gap-2.5 mb-3.5">
              {[
                [`Monthly Income (${currency.symbol})`, 'income', 'e.g. 1500'],
                [`Monthly Savings (${currency.symbol})`, 'savings', 'e.g. 300'],
                [`Total BNPL (${currency.symbol})`, 'bnpl', 'e.g. 450'],
                [`Other Loans (${currency.symbol})`, 'loans', 'e.g. 0'],
              ].map(([label, key, ph]) => (
                <div key={key}>
                  <p className="text-[10px] text-muted-foreground mb-1 font-semibold">{label}</p>
                  <input
                    className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-border text-[13px] text-foreground outline-none focus:border-primary transition-colors bg-card"
                    placeholder={ph}
                    value={checked[key as keyof typeof checked]}
                    onChange={e => setChecked(p => ({ ...p, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <button onClick={simulate} className="w-full gradient-primary text-primary-foreground rounded-xl py-3.5 font-semibold text-sm shadow-primary hover:shadow-primary-hover transition-all">
              Calculate My Risk Score
            </button>
            {simScore !== null && (
              <div
                className="mt-3.5 p-3.5 rounded-xl border-[1.5px] animate-slide-up"
                style={{ background: getBg(simScore), borderColor: `${getColor(simScore)}30` }}
              >
                <p className="text-[11px] text-muted-foreground font-semibold mb-1">YOUR SIMULATED SCORE</p>
                <p className="text-2xl font-extrabold" style={{ color: getColor(simScore) }}>{simScore}/100 — {getLabel(simScore)}</p>
                <p className="text-xs text-foreground mt-1.5 leading-relaxed">
                  <RiskIcon score={simScore} />
                  {simScore <= 30 ? "Great job! You're managing debt responsibly."
                    : simScore <= 60 ? "Be careful. Try to reduce BNPL spending this month."
                    : "High risk! Stop all new BNPL immediately and focus on paying off existing debt."}
                </p>
              </div>
            )}
          </div>

          {/* Debt Tips */}
          <div className="bg-accent/10 rounded-2xl p-4 border border-accent/30">
            <p className="text-[11px] font-bold text-primary mb-2">💡 TIPS TO REDUCE DEBT</p>
            <ul className="text-xs text-foreground space-y-1.5 list-disc list-inside">
              <li>Pay more than the minimum on your highest interest plan first</li>
              <li>Consider consolidating multiple BNPL plans</li>
              <li>Avoid taking new BNPL until existing ones are paid off</li>
              <li>Set up automatic payments to avoid late fees</li>
            </ul>
          </div>
        </>
      ) : (
        <>
          {/* AI Plan Banner */}
          <div className="gradient-primary rounded-2xl p-4 text-primary-foreground">
            <p className="text-[11px] font-bold opacity-80 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> AI SAVINGS PLAN
            </p>
            <p className="text-[13px] leading-relaxed">
              Save <b>{format(200)}/month</b> across your {data.goals.length} goals. At this rate, your Emergency Fund is reached by <b>June 2026</b>!
            </p>
          </div>

          {/* Goals */}
          {data.goals.map(g => {
            const pct = Math.round((g.saved / g.target) * 100);
            const remaining = g.target - g.saved;
            const months = Math.ceil(remaining / 200);
            return (
              <div key={g.id} className="bg-card rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-[46px] h-[46px] rounded-xl flex items-center justify-center" style={{ background: `${g.color}18` }}>
                      <DynamicIcon name={g.icon} className="w-6 h-6" style={{ color: g.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">{g.name}</p>
                      <p className="text-[11px] text-muted-foreground">Target by {g.deadline}</p>
                    </div>
                  </div>
                  <RingChart pct={pct} size={56} color={g.color} stroke={6} label={`${pct}%`} />
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Saved: <b className="text-foreground">{format(g.saved)}</b></span>
                  <span className="text-xs text-muted-foreground">Goal: <b className="text-foreground">{format(g.target)}</b></span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden mb-2.5">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${g.color}90, ${g.color})` }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-muted-foreground">{format(remaining)} left · ~{months} months</span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5" style={{ background: `${g.color}18`, color: g.color }}>
                    On Track <Check className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}

          {/* Add Goal Button */}
          <button
            onClick={() => setShowAddGoal(true)}
            className="border-2 border-dashed border-border rounded-2xl p-5 flex items-center justify-center gap-2 cursor-pointer hover:border-primary transition-colors w-full"
          >
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Plus className="w-4 h-4 text-primary" />
            </div>
            <p className="text-[13px] font-semibold text-muted-foreground">Add a new savings goal</p>
          </button>

          {/* Add Goal Dialog */}
          <AddGoalDialog 
            open={showAddGoal} 
            onClose={() => setShowAddGoal(false)}
            onGoalAdded={addGoal}
          />
        </>
      )}
    </div>
  );
};

export default DebtGoalsPage;