import { useState, useEffect } from "react";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { useGoals } from "@/contexts/GoalsContext";
import RingChart from "./RingChart";
import DynamicIcon from "./DynamicIcon";
import AddGoalDialog from "./AddGoalDialog";
import type { Goal } from "@/contexts/GoalsContext";
import { useRiskScore } from "@/hooks/useRiskScore";
import AddBNPLDialog from "./AddBNPLDialog";
import {
  Calculator,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  Plus,
  Check,
  Trash2,
  PiggyBank,
  Pencil,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";
import EditGoalDialog from "./EditGoalDialog";

// ── Helpers ───────────────────────────────────────────────────────────
const MYR_TO_USD = 0.21;

const getColor = (s: number) =>
  s >= 80
    ? "#ff4757"
    : s >= 60
      ? "#f97316"
      : s >= 40
        ? "#ffb300"
        : s >= 20
          ? "#3b82f6"
          : "#00c896";

const getLabel = (s: number) =>
  s >= 80
    ? "CRITICAL"
    : s >= 60
      ? "HIGH RISK"
      : s >= 40
        ? "MEDIUM RISK"
        : s >= 20
          ? "LOW RISK"
          : "SAFE";

const getBg = (s: number) =>
  s >= 60
    ? "hsl(0 72% 96%)"
    : s >= 40
      ? "hsl(var(--warning-light))"
      : "hsl(var(--success-light))";

const RiskIcon = ({ score }: { score: number }) => {
  if (score >= 60) return <AlertOctagon className="w-4 h-4 inline mr-1" />;
  if (score >= 40) return <AlertTriangle className="w-4 h-4 inline mr-1" />;
  return <CheckCircle className="w-4 h-4 inline mr-1" />;
};

type Tab = "debt" | "goals";

const DebtGoalsPage = () => {
  const { format, currency } = useCurrency();
  const { data, addBNPL, removeBNPL } = useFinancialData();
  const { goals, addGoal, removeGoal, updateGoal } = useGoals();
  const {
    calculate,
    result: mlResult,
    loading: mlLoading,
    error: mlError,
  } = useRiskScore();

  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [tab, setTab] = useState<Tab>("debt");
  const [checked, setChecked] = useState({
    income: "",
    savings: "",
    bnpl: "",
    loans: "",
  });
  const [simScore, setSimScore] = useState<number | null>(null);
  const [simResult, setSimResult] = useState<typeof mlResult>(null);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [showAddBNPL, setShowAddBNPL] = useState(false);

  // ── Auto-score on page load using real BNPL data ──────────────────
  const [autoScore, setAutoScore] = useState<typeof mlResult>(null);
  const [autoLoading, setAutoLoading] = useState(false);

  useEffect(() => {
    const runAutoScore = async () => {
      const totalBnpl = data.bnpls.reduce((acc, b) => acc + b.amount, 0);
      const income = data.moneyIn;
      if (income <= 0) return;

      setAutoLoading(true);
      try {
        const res = await fetch(
          `${import.meta.env.VITE_ML_API_URL || "http://localhost:8000"}/risk-score`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              income: income * MYR_TO_USD,
              bnpl_total: totalBnpl * MYR_TO_USD,
              num_loans: data.bnplCount,
              savings: (income - data.moneyOut) * MYR_TO_USD,
              bnpl_ratio: income > 0 ? totalBnpl / income : 0,
              savings_ratio:
                income > 0 ? Math.max(0, income - data.moneyOut) / income : 0,
              spend_ratio: income > 0 ? data.moneyOut / income : 0.85,
              has_bnpl: totalBnpl > 0 ? 1 : 0,
            }),
          },
        );
        if (res.ok) {
          const d = await res.json();
          setAutoScore(d);
        }
      } catch {
        // silently fail — card falls back to static data
      } finally {
        setAutoLoading(false);
      }
    };

    runAutoScore();
  }, [data.moneyIn, data.moneyOut, data.bnplCount]);

  // Use auto ML score for the main card, fallback to static
  const mainScore = autoScore?.score ?? data.debtScore;
  const mainLabel = autoScore?.label ?? getLabel(data.debtScore);
  const mainColor = autoScore?.color ?? getColor(data.debtScore);
  const mainAdvice = autoScore?.advice ?? null;

  // Computed debt-to-income ratio from real data
  const totalBnplMYR = data.bnpls.reduce((acc, b) => acc + b.amount, 0);
  const totalMonthlyMYR = data.bnpls.reduce((acc, b) => acc + b.monthly, 0);
  const dtiRatio =
    data.moneyIn > 0 ? Math.round((totalMonthlyMYR / data.moneyIn) * 100) : 0;

  // ── Simulator ─────────────────────────────────────────────────────
  const simulate = async () => {
    const incomeDisplay = parseFloat(checked.income) || 0;
    const bnplDisplay = parseFloat(checked.bnpl) || 0;
    const loansDisplay = parseFloat(checked.loans) || 0;
    const savingsDisplay = parseFloat(checked.savings) || 0;

    const incomeUSD = (incomeDisplay / currency.rate) * MYR_TO_USD;
    const bnplUSD = (bnplDisplay / currency.rate) * MYR_TO_USD;
    const loansUSD = (loansDisplay / currency.rate) * MYR_TO_USD;
    const savingsUSD = (savingsDisplay / currency.rate) * MYR_TO_USD;

    if (incomeUSD <= 0) return;

    // local fallback
    const ratio = ((bnplUSD + loansUSD) / incomeUSD) * 100;
    setSimScore(Math.min(100, Math.round(ratio * 1.8)));
    setSimResult(null);

    await calculate({
      income: incomeUSD,
      bnpl_total: bnplUSD + loansUSD,
      num_loans: data.bnplCount || (bnplUSD > 0 ? 1 : 0),
      savings: savingsUSD,
      spend_ratio: incomeUSD > 0 ? (bnplUSD + loansUSD) / incomeUSD : 0.85,
    });
  };

  // Keep simResult in sync with mlResult
  useEffect(() => {
    if (mlResult) setSimResult(mlResult);
  }, [mlResult]);

  const displayScore = simResult?.score ?? simScore;

  // ── Deposit ───────────────────────────────────────────────────────
  const handleDeposit = (id: string) => {
    const amtInDisplay = parseFloat(depositAmount);
    if (!amtInDisplay || amtInDisplay <= 0) return;
    const goal = goals.find((g) => g.id === id);
    if (!goal) return;

    const amtInMYR = amtInDisplay / currency.rate;
    const currentSaved = Number(goal.saved);
    const currentTarget = Number(goal.target);
    const remaining = currentTarget - currentSaved;
    const actual = Math.min(amtInMYR, remaining);
    const newSaved = parseFloat((currentSaved + actual).toFixed(2));

    updateGoal(id, { saved: newSaved });
    setDepositGoalId(null);
    setDepositAmount("");
  };

  const remainingInDisplay = (g: Goal) => (g.target - g.saved) / currency.rate;

  const totalSaved = goals.reduce((acc, g) => acc + Number(g.saved), 0);
  const totalTarget = goals.reduce((acc, g) => acc + Number(g.target), 0);
  const monthlySuggested = 200;

  return (
    <div className="flex flex-col gap-3.5 animate-slide-up">
      {/* Tab Switcher */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {[
          { id: "debt" as Tab, label: "Debt Risk", icon: AlertTriangle },
          { id: "goals" as Tab, label: "Goals", icon: PiggyBank },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${
              tab === t.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "debt" ? (
        <>
          {/* ── Main Score Card (ML-powered) ── */}
          <div
            className="bg-card rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-5 border-2"
            style={{
              background: getBg(mainScore),
              borderColor: `${mainColor}30`,
            }}
          >
            {autoLoading ? (
              <div className="w-24 h-24 rounded-full bg-muted animate-pulse flex-shrink-0" />
            ) : (
              <RingChart
                pct={mainScore}
                size={96}
                color={mainColor}
                bg="#e8e8e8"
                stroke={9}
                label={`${mainScore}`}
                sub="/ 100"
              />
            )}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <p className="text-[11px] text-muted-foreground font-semibold">
                  YOUR DEBT RISK SCORE
                </p>
                {autoScore && (
                  <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    🤖 ML
                  </span>
                )}
              </div>
              <p
                className="text-[22px] font-extrabold font-display"
                style={{ color: mainColor }}
              >
                {mainLabel}
              </p>

              {/* Dynamic stats from real data */}
              <div className="flex gap-3 mt-2 justify-center sm:justify-start">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">
                    Active BNPLs
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {data.bnplCount}
                  </p>
                </div>
                <div className="w-px bg-border" />
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">
                    Total Debt
                  </p>
                  <p className="text-sm font-bold text-foreground">
                    {format(totalBnplMYR)}
                  </p>
                </div>
                <div className="w-px bg-border" />
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground">
                    Debt/Income
                  </p>
                  <p
                    className="text-sm font-bold"
                    style={{
                      color:
                        dtiRatio > 30
                          ? "#ff4757"
                          : dtiRatio > 20
                            ? "#ffb300"
                            : "#00c896",
                    }}
                  >
                    {dtiRatio}%
                  </p>
                </div>
              </div>

              {mainAdvice && (
                <p className="text-xs text-foreground leading-relaxed mt-2">
                  {mainAdvice}
                </p>
              )}
            </div>
          </div>

          {/* ── BNPL List ── */}
          <div className="bg-card rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3.5">
              <p className="text-[13px] font-bold text-foreground">
                Active BNPL / Loans
              </p>
              <button
                onClick={() => setShowAddBNPL(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Plan
              </button>
            </div>

            {data.bnpls.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No active BNPL plans
              </p>
            ) : (
              data.bnpls.map((b, i) => (
                <div
                  key={i}
                  className={`bg-muted rounded-xl p-3.5 ${i < data.bnpls.length - 1 ? "mb-2.5" : ""}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-[13px] font-bold text-foreground">
                        {b.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {b.platform} · {b.rate}% p.a.
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          background:
                            b.risk === "HIGH"
                              ? "hsl(0 72% 96%)"
                              : "hsl(var(--warning-light))",
                          color:
                            b.risk === "HIGH"
                              ? "hsl(var(--destructive))"
                              : "hsl(var(--warning))",
                        }}
                      >
                        {b.risk}
                      </span>
                      <button
                        onClick={() => removeBNPL(i)}
                        className="w-6 h-6 rounded-lg bg-card flex items-center justify-center hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      ["Outstanding", format(b.amount)],
                      ["Monthly", format(b.monthly)],
                      ["Status", b.status],
                    ].map(([l, v]) => (
                      <div key={l} className="text-center">
                        <p className="text-[9px] text-muted-foreground mb-0.5">
                          {l}
                        </p>
                        <p className="text-xs font-bold text-foreground">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}

            {data.bnpls.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                <p className="text-[11px] text-muted-foreground">
                  Total monthly payments
                </p>
                <p className="text-[13px] font-bold text-foreground">
                  {format(totalMonthlyMYR)}
                </p>
              </div>
            )}
          </div>
          {/* Dialog */}
          <AddBNPLDialog
            open={showAddBNPL}
            onClose={() => setShowAddBNPL(false)}
            onAdd={(bnpl) => {
              addBNPL(bnpl);
              setShowAddBNPL(false);
            }}
          />

          {/* ── Risk Simulator ── */}
          <div className="bg-card rounded-2xl p-4 shadow-sm">
            <p className="text-[13px] font-bold text-foreground mb-1 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-muted-foreground" /> Risk
              Simulator
            </p>
            <p className="text-[11px] text-muted-foreground mb-3.5">
              Enter your details to get a personalised ML risk score
            </p>
            <div className="grid grid-cols-2 gap-2.5 mb-3.5">
              {[
                [`Monthly Income (${currency.symbol})`, "income", "e.g. 1500"],
                [`Monthly Savings (${currency.symbol})`, "savings", "e.g. 300"],
                [`Total BNPL (${currency.symbol})`, "bnpl", "e.g. 450"],
                [`Other Loans (${currency.symbol})`, "loans", "e.g. 0"],
              ].map(([label, key, ph]) => (
                <div key={key}>
                  <p className="text-[10px] text-muted-foreground mb-1 font-semibold">
                    {label}
                  </p>
                  <input
                    className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-border text-[13px] text-foreground outline-none focus:border-primary transition-colors bg-card"
                    placeholder={ph}
                    value={checked[key as keyof typeof checked]}
                    onChange={(e) =>
                      setChecked((p) => ({ ...p, [key]: e.target.value }))
                    }
                  />
                </div>
              ))}
            </div>

            <button
              onClick={simulate}
              disabled={mlLoading}
              className="w-full gradient-primary text-primary-foreground rounded-xl py-3.5 font-semibold text-sm shadow-primary hover:shadow-primary-hover transition-all disabled:opacity-70"
            >
              {mlLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Analysing with ML...
                </span>
              ) : (
                "Calculate My Risk Score"
              )}
            </button>

            {mlError && (
              <p className="mt-2 text-[10px] text-amber-500 flex items-center gap-1">
                ⚠️ {mlError}
              </p>
            )}

            {(simResult || simScore !== null) &&
              !mlLoading &&
              displayScore !== null && (
                <div
                  className="mt-3.5 p-3.5 rounded-xl border-[1.5px] animate-slide-up"
                  style={{
                    background: getBg(displayScore),
                    borderColor: `${getColor(displayScore)}30`,
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] text-muted-foreground font-semibold">
                      YOUR SIMULATED SCORE
                    </p>
                    <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {simResult?.source === "xgboost"
                        ? "🤖 XGBoost ML"
                        : "📐 Local estimate"}
                    </span>
                  </div>

                  <p
                    className="text-2xl font-extrabold"
                    style={{ color: getColor(displayScore) }}
                  >
                    {displayScore}/100 —{" "}
                    {simResult?.label ?? getLabel(displayScore)}
                  </p>

                  {simResult?.bnpl_pct !== undefined &&
                    simResult.bnpl_pct > 0 && (
                      <div className="flex items-center gap-1.5 mt-1">
                        {simResult.bnpl_pct > 30 ? (
                          <TrendingUp className="w-3.5 h-3.5 text-destructive" />
                        ) : (
                          <TrendingDown className="w-3.5 h-3.5 text-green-500" />
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          BNPL is{" "}
                          <b className="text-foreground">
                            {simResult.bnpl_pct}%
                          </b>{" "}
                          of your income
                          {simResult.bnpl_pct > 30 && (
                            <span className="text-destructive">
                              {" "}
                              (target: below 30%)
                            </span>
                          )}
                        </p>
                      </div>
                    )}

                  <p className="text-xs text-foreground mt-1.5 leading-relaxed">
                    <RiskIcon score={displayScore} />
                    {simResult?.advice ??
                      (displayScore >= 60
                        ? "High risk! Stop all new BNPL immediately and focus on paying off existing debt."
                        : displayScore >= 40
                          ? "Be careful. Try to reduce BNPL spending this month."
                          : "Great job! You're managing debt responsibly.")}
                  </p>
                </div>
              )}
          </div>

          {/* ── Tips ── */}
          <div className="bg-accent/10 rounded-2xl p-4 border border-accent/30">
            <p className="text-[11px] font-bold text-primary mb-2">
              💡 TIPS TO REDUCE DEBT
            </p>
            <ul className="text-xs text-foreground space-y-1.5 list-disc list-inside">
              <li>
                Pay more than the minimum on your highest interest plan first
              </li>
              <li>Consider consolidating multiple BNPL plans</li>
              <li>Avoid taking new BNPL until existing ones are paid off</li>
              <li>Set up automatic payments to avoid late fees</li>
            </ul>
          </div>
        </>
      ) : (
        <>
          {/* ── Summary Banner ── */}
          <div className="gradient-primary rounded-2xl p-4 text-primary-foreground">
            <p className="text-[11px] font-bold opacity-80 mb-1.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> AI SAVINGS PLAN
            </p>
            <p className="text-[13px] leading-relaxed">
              Save <b>{format(monthlySuggested)}/month</b> across your{" "}
              {goals.length} goal{goals.length !== 1 ? "s" : ""}. You've saved{" "}
              <b>{format(totalSaved)}</b> of <b>{format(totalTarget)}</b> total.
            </p>
            <div className="mt-3 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white/70 rounded-full transition-all duration-1000"
                style={{
                  width: `${totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0}%`,
                }}
              />
            </div>
            <p className="text-[10px] opacity-70 mt-1">
              {totalTarget > 0
                ? Math.round((totalSaved / totalTarget) * 100)
                : 0}
              % of total target reached
            </p>
          </div>

          {/* ── Goals List ── */}
          {goals.map((g) => {
            const saved = Number(g.saved);
            const target = Number(g.target);
            const pct = Math.min(100, Math.round((saved / target) * 100));
            const remainingMYR = target - saved;
            const months =
              remainingMYR > 0 ? Math.ceil(remainingMYR / monthlySuggested) : 0;
            const isComplete = pct >= 100;
            const isDepositing = depositGoalId === g.id;

            return (
              <div
                key={g.id}
                className="bg-card rounded-2xl p-4 sm:p-5 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-[46px] h-[46px] rounded-xl flex items-center justify-center"
                      style={{ background: `${g.color}18` }}
                    >
                      <DynamicIcon
                        name={g.icon}
                        className="w-6 h-6"
                        style={{ color: g.color }}
                      />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {g.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        Target by {g.deadline}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <RingChart
                      pct={pct}
                      size={52}
                      color={isComplete ? "#00c896" : g.color}
                      stroke={6}
                      label={`${pct}%`}
                    />
                    <button
                      onClick={() => setEditGoal(g)}
                      className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-accent transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => removeGoal(g.id)}
                      className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between mb-2">
                  <span className="text-xs text-muted-foreground">
                    Saved: <b className="text-foreground">{format(saved)}</b>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Goal: <b className="text-foreground">{format(target)}</b>
                  </span>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden mb-2.5">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${pct}%`,
                      background: isComplete
                        ? "#00c896"
                        : `linear-gradient(90deg, ${g.color}90, ${g.color})`,
                    }}
                  />
                </div>

                <div className="flex justify-between items-center mb-3">
                  <span className="text-[11px] text-muted-foreground">
                    {isComplete
                      ? "🎉 Goal reached!"
                      : `${format(remainingMYR)} left · ~${months} month${months !== 1 ? "s" : ""}`}
                  </span>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5"
                    style={{
                      background: isComplete ? "#00c89618" : `${g.color}18`,
                      color: isComplete ? "#00c896" : g.color,
                    }}
                  >
                    {isComplete ? "Complete" : "On Track"}{" "}
                    <Check className="w-3 h-3" />
                  </span>
                </div>

                {!isComplete &&
                  (isDepositing ? (
                    <div className="flex gap-2 animate-slide-up">
                      <div className="flex-1 flex flex-col gap-1">
                        <input
                          type="number"
                          className="w-full px-3 py-2 rounded-xl border-[1.5px] border-border text-[13px] text-foreground bg-card outline-none focus:border-primary transition-colors"
                          placeholder={`Amount (${currency.symbol})`}
                          value={depositAmount}
                          min={0}
                          max={remainingInDisplay(g)}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          autoFocus
                        />
                        {parseFloat(depositAmount) > remainingInDisplay(g) && (
                          <p className="text-[10px] text-amber-500 px-1">
                            Max deposit is {format(remainingMYR)} — will be
                            capped automatically.
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeposit(g.id)}
                        className="px-4 py-2 rounded-xl gradient-primary text-primary-foreground text-[13px] font-semibold"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setDepositGoalId(null);
                          setDepositAmount("");
                        }}
                        className="px-3 py-2 rounded-xl bg-muted text-muted-foreground text-[13px]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDepositGoalId(g.id)}
                      className="w-full py-2 rounded-xl border-[1.5px] text-[13px] font-semibold transition-all hover:opacity-80"
                      style={{
                        borderColor: `${g.color}50`,
                        color: g.color,
                        background: `${g.color}08`,
                      }}
                    >
                      + Add Funds
                    </button>
                  ))}
              </div>
            );
          })}

          {goals.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <PiggyBank className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold">No goals yet</p>
              <p className="text-xs mt-1">Add your first savings goal below</p>
            </div>
          )}

          <button
            onClick={() => setShowAddGoal(true)}
            className="border-2 border-dashed border-border rounded-2xl p-5 flex items-center justify-center gap-2 cursor-pointer hover:border-primary transition-colors w-full"
          >
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Plus className="w-4 h-4 text-primary" />
            </div>
            <p className="text-[13px] font-semibold text-muted-foreground">
              Add a new savings goal
            </p>
          </button>

          <AddGoalDialog
            open={showAddGoal}
            onClose={() => setShowAddGoal(false)}
            onGoalAdded={(goal) => {
              addGoal(goal);
              setShowAddGoal(false);
            }}
          />
          <EditGoalDialog
            open={editGoal !== null}
            goal={editGoal}
            onClose={() => setEditGoal(null)}
            onGoalUpdated={(id, updates) => {
              updateGoal(id, updates);
              setEditGoal(null);
            }}
          />
        </>
      )}
    </div>
  );
};

export default DebtGoalsPage;
