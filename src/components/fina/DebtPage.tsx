import { useState } from 'react';
import RingChart from './RingChart';

const BNPLS = [
  { name: 'Atome', platform: 'Shopee', amount: 300, monthly: 100, rate: 18, status: 'Active', risk: 'MEDIUM' as const },
  { name: 'GrabPay Later', platform: 'Grab', amount: 150, monthly: 75, rate: 24, status: 'Active', risk: 'HIGH' as const },
];

const getColor = (s: number) => s <= 30 ? '#00c896' : s <= 60 ? '#ffb300' : '#ff4757';
const getLabel = (s: number) => s <= 30 ? 'LOW RISK' : s <= 60 ? 'MEDIUM RISK' : 'HIGH RISK';
const getBg = (s: number) => s <= 30 ? 'hsl(var(--success-light))' : s <= 60 ? 'hsl(var(--warning-light))' : 'hsl(0 72% 96%)';

const DebtPage = () => {
  const score = 52;
  const [checked, setChecked] = useState({ income: '', savings: '', bnpl: '', loans: '' });
  const [simScore, setSimScore] = useState<number | null>(null);

  const simulate = () => {
    const i = parseFloat(checked.income) || 1500;
    const bn = parseFloat(checked.bnpl) || 0;
    const lo = parseFloat(checked.loans) || 0;
    const ratio = ((bn + lo) / i) * 100;
    setSimScore(Math.min(100, Math.round(ratio * 1.8)));
  };

  return (
    <div className="flex flex-col gap-3.5 animate-slide-up">
      <h1 className="text-lg font-bold text-foreground font-display">Debt Risk Scanner</h1>

      {/* Main Score */}
      <div
        className="bg-card rounded-2xl p-6 flex items-center gap-5 border-2"
        style={{ background: getBg(score), borderColor: `${getColor(score)}30` }}
      >
        <RingChart pct={score} size={96} color={getColor(score)} bg="#e8e8e8" stroke={9} label={`${score}`} sub="/ 100" />
        <div className="flex-1">
          <p className="text-[11px] text-muted-foreground font-semibold mb-1">YOUR DEBT RISK SCORE</p>
          <p className="text-[22px] font-extrabold font-display" style={{ color: getColor(score) }}>{getLabel(score)}</p>
          <p className="text-xs text-foreground leading-relaxed mt-1.5">
            You have 2 active BNPL plans. Your debt-to-income ratio is <b>25%</b> — approaching the danger zone of 30%.
          </p>
        </div>
      </div>

      {/* Active BNPLs */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <p className="text-[13px] font-bold text-foreground mb-3.5">Active BNPL / Loans</p>
        {BNPLS.map((b, i) => (
          <div key={i} className={`bg-muted rounded-xl p-3.5 ${i < BNPLS.length - 1 ? 'mb-2.5' : ''}`}>
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
              {[['Outstanding', `RM ${b.amount}`], ['Monthly', `RM ${b.monthly}`], ['Status', b.status]].map(([l, v]) => (
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
        <p className="text-[13px] font-bold text-foreground mb-1">🧮 Risk Simulator</p>
        <p className="text-[11px] text-muted-foreground mb-3.5">Enter your details to get a personalised risk score</p>
        <div className="grid grid-cols-2 gap-2.5 mb-3.5">
          {[
            ['Monthly Income (RM)', 'income', 'e.g. 1500'],
            ['Monthly Savings (RM)', 'savings', 'e.g. 300'],
            ['Total BNPL (RM)', 'bnpl', 'e.g. 450'],
            ['Other Loans (RM)', 'loans', 'e.g. 0'],
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
              {simScore <= 30 ? "✅ Great job! You're managing debt responsibly."
                : simScore <= 60 ? "⚠️ Be careful. Try to reduce BNPL spending this month."
                : "🚨 High risk! Stop all new BNPL immediately and focus on paying off existing debt."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebtPage;
