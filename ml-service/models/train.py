"""
SAMSOM — Cambodia-Specific ML Training Script
══════════════════════════════════════════════
Owner: Srun Vireakyuth (Person 4)
Run:   python models/train.py

Currency: USD (standard for Cambodia — ABA & ACLEDA both operate in USD)
Market:   Phnom Penh / Cambodia student demographics

Trains:
  Model 1 — Spending Predictor  → spending_model.pkl
  Model 2 — Debt Risk Scorer    → risk_model.pkl
"""

import os
import json
import numpy as np
import pandas as pd
import joblib
from datetime import datetime
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, r2_score

np.random.seed(42)

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR   = os.path.join(os.path.dirname(OUTPUT_DIR), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

print("=" * 62)
print("  SAMSOM ML Training Pipeline")
print("  Cambodia Student Financial Data (USD)")
print("  Phnom Penh cost-of-living calibrated")
print("=" * 62)


# ═══════════════════════════════════════════════════════════════
# CAMBODIA COST-OF-LIVING REFERENCE (Phnom Penh, 2025)
# ═══════════════════════════════════════════════════════════════
#
#  Street food meal (bun, rice, noodles)   $0.50 – $2.00
#  Restaurant meal                          $3.00 – $8.00
#  Boba tea / coffee                        $1.00 – $3.00
#  Tuk-tuk short ride                       $1.00 – $3.00
#  Grab ride (medium)                       $2.00 – $5.00
#  Monthly motorbike petrol                 $15   – $30
#  Room rent (student shared)               $80   – $180
#  Room rent (own room)                     $150  – $350
#  Grocery shop (weekly)                    $10   – $25
#  Mobile top-up / data plan               $5    – $15
#  Clothing (Aeon Mall, Sorya)              $10   – $60
#  Electronics instalment (BNPL)            $20   – $120/month
#  Gym membership                           $20   – $40
#  Cinema ticket                            $4    – $8
#
# ═══════════════════════════════════════════════════════════════

# ── 5 Cambodian student personas ─────────────────────────────
#
# (name, income_min, income_max, bnpl_prob, bnpl_max_ratio,
#  savings_max_ratio, loan_max, description)
#
PERSONAS = [
    # Broke — family village, minimal allowance, no job
    ('broke',        80,  200, 0.10, 0.50, 0.04, 1,
     'Village family allowance, studying in Phnom Penh'),

    # Allowance — city family, parents support fully
    ('allowance',   200,  350, 0.30, 0.65, 0.08, 2,
     'Phnom Penh family allowance, no job'),

    # Part-time — works evenings/weekends (tutor, cafe, admin)
    ('part_time',   350,  550, 0.50, 0.60, 0.12, 3,
     'Part-time job + family support'),

    # Fresh grad — first job, NGO / garment / hospitality
    ('fresh_grad',  500,  900, 0.55, 0.55, 0.18, 3,
     'First job, 0-2 years experience'),

    # Young prof — IT / banking / international NGO
    ('young_prof',  900, 1800, 0.45, 0.45, 0.28, 4,
     'Professional job, 2-5 years experience'),
]

N_PER_PERSONA = 400   # 400 × 5 = 2,000 total

# ── Spending category weights per persona ─────────────────────
# Food is highest for broke students (street food every meal)
# Shopping/BNPL rises as income rises (Aeon Mall effect)
CATEGORY_WEIGHTS = {
    'broke':      {'food':0.50,'transport':0.18,'shopping':0.08,'bnpl':0.08,'entertainment':0.05,'other':0.11},
    'allowance':  {'food':0.42,'transport':0.17,'shopping':0.13,'bnpl':0.12,'entertainment':0.08,'other':0.08},
    'part_time':  {'food':0.36,'transport':0.15,'shopping':0.18,'bnpl':0.16,'entertainment':0.09,'other':0.06},
    'fresh_grad': {'food':0.30,'transport':0.13,'shopping':0.22,'bnpl':0.20,'entertainment':0.10,'other':0.05},
    'young_prof': {'food':0.26,'transport':0.12,'shopping':0.24,'bnpl':0.20,'entertainment':0.12,'other':0.06},
}

# ── Cambodia-specific BNPL platforms & typical amounts ────────
# Atome:    $20–$150 per plan (3 instalments)
# Kredivo:  $30–$200 per plan (3–6 instalments)
# ABA BNPL: $50–$300 per plan (varies)
# Pi Pay:   $10–$80  per plan

BNPL_PLATFORMS = {
    'broke':      {'min': 10,  'max': 60},
    'allowance':  {'min': 20,  'max': 100},
    'part_time':  {'min': 30,  'max': 150},
    'fresh_grad': {'min': 40,  'max': 220},
    'young_prof': {'min': 50,  'max': 350},
}


def generate_student(persona_name, income_min, income_max,
                     bnpl_prob, bnpl_max_ratio,
                     savings_max_ratio, loan_max, description):
    """Generate one Cambodian student's monthly financial profile."""

    income = np.random.uniform(income_min, income_max)
    weights = CATEGORY_WEIGHTS[persona_name]
    bnpl_range = BNPL_PLATFORMS[persona_name]

    # ── BNPL & loans ──────────────────────────────────────────
    has_bnpl = np.random.random() < bnpl_prob
    if has_bnpl:
        num_loans  = np.random.randint(1, loan_max + 1)
        # Each loan is a separate BNPL plan
        loan_amounts = [
            np.random.uniform(bnpl_range['min'], bnpl_range['max'])
            for _ in range(num_loans)
        ]
        bnpl_total = sum(loan_amounts)
        # Cap at bnpl_max_ratio of income
        bnpl_total = min(bnpl_total, income * bnpl_max_ratio)
    else:
        num_loans  = 0
        bnpl_total = 0.0

    # ── Savings ───────────────────────────────────────────────
    # High BNPL → low savings (inverse relationship)
    bnpl_penalty = (bnpl_total / income) * 0.6 if income > 0 else 0
    max_save = income * max(0, savings_max_ratio - bnpl_penalty)
    savings  = max(0, np.random.uniform(0, max_save))

    # ── Budget (what student plans to spend this month) ────────
    # Cambodian students typically budget 75–92% of income
    # High BNPL students budget less for discretionary spending
    budget_ratio = np.random.uniform(0.75, 0.92) - (bnpl_total / income) * 0.15
    budget_ratio = max(0.60, budget_ratio)
    budget = income * budget_ratio

    # ── Day in month ──────────────────────────────────────────
    day = np.random.randint(1, 31)

    # ── Simulate daily spending realistically ─────────────────
    daily_spends = []
    base_daily   = budget / 30

    for d in range(1, day + 1):

        # Weekend effect (Sat/Sun = more spending in Phnom Penh)
        is_weekend   = (d % 7) in [0, 6]
        weekend_mult = np.random.uniform(1.15, 1.70) if is_weekend else 1.0

        # Payday effect — first 3 days of month, students spend more
        is_payday_window = d <= 3
        payday_mult = np.random.uniform(1.20, 1.60) if is_payday_window else 1.0

        # Month-end crunch — last 5 days, broke students cut back
        is_month_end = d >= 26
        if is_month_end and persona_name in ['broke', 'allowance']:
            crunch_mult = np.random.uniform(0.50, 0.80)
        else:
            crunch_mult = 1.0

        # Random big-spend event (Aeon Mall trip, birthday dinner, etc.)
        big_event = np.random.random() < 0.10
        event_mult = np.random.uniform(1.8, 4.0) if big_event else 1.0

        daily = (base_daily
                 * weekend_mult
                 * payday_mult
                 * crunch_mult
                 * event_mult
                 * np.random.uniform(0.65, 1.35))

        daily_spends.append(daily)

    total_spent_so_far = sum(daily_spends)
    avg_daily_spend    = total_spent_so_far / day if day > 0 else 0

    # ── Category breakdown of spend so far ────────────────────
    food_spend          = total_spent_so_far * weights['food']          * np.random.uniform(0.88, 1.12)
    transport_spend     = total_spent_so_far * weights['transport']     * np.random.uniform(0.88, 1.12)
    shopping_spend      = total_spent_so_far * weights['shopping']      * np.random.uniform(0.88, 1.12)
    bnpl_spend          = (bnpl_total / 3) if has_bnpl else 0   # monthly instalment paid so far
    entertainment_spend = total_spent_so_far * weights['entertainment'] * np.random.uniform(0.88, 1.12)

    # ── Actual month-end total (LABEL for Model 1) ────────────
    remaining_days = 30 - day

    # Last week of month: broke students slow down, others maintain pace
    if remaining_days <= 7 and persona_name in ['broke', 'allowance']:
        end_mult = np.random.uniform(0.80, 1.00)
    elif remaining_days <= 7:
        end_mult = np.random.uniform(0.95, 1.20)
    else:
        end_mult = np.random.uniform(0.92, 1.08)

    projected          = total_spent_so_far + (avg_daily_spend * remaining_days * end_mult)
    actual_month_total = projected * np.random.uniform(0.90, 1.10)
    actual_month_total = max(actual_month_total, total_spent_so_far)

    # ── Derived ratios ────────────────────────────────────────
    bnpl_ratio    = bnpl_total / income     if income > 0 else 0
    savings_ratio = savings    / income     if income > 0 else 0
    spend_ratio   = total_spent_so_far / budget if budget > 0 else 0

    # ── Risk score (LABEL for Model 2) ───────────────────────
    # Cambodia-specific weights:
    # BNPL ratio is the biggest danger for Cambodian students
    # because informal debt carries higher social/family consequences
    overspend_penalty = max(0, spend_ratio - 0.85) * 35
    savings_bonus     = savings_ratio * 15

    risk_raw = (
        bnpl_ratio          * 52.0   +   # heaviest weight — BNPL is #1 risk
        num_loans           *  8.5   +   # each plan adds complexity
        overspend_penalty            +   # danger zone above 85% of budget
        (1 - min(savings_ratio, 0.3)) * 7.0 -  # low savings penalty
        savings_bonus                +   # reward for saving
        np.random.normal(0, 3.5)         # real-world noise
    )
    risk_score = float(np.clip(risk_raw, 0, 100))

    return {
        # Model 1 features
        'total_spent_so_far':   round(total_spent_so_far,   2),
        'day_of_month':         day,
        'avg_daily_spend':      round(avg_daily_spend,       2),
        'food_spend':           round(food_spend,            2),
        'transport_spend':      round(transport_spend,       2),
        'shopping_spend':       round(shopping_spend,        2),
        'bnpl_spend':           round(bnpl_spend,            2),
        'entertainment_spend':  round(entertainment_spend,   2),
        'days_remaining':       30 - day,
        'budget':               round(budget,                2),
        'spend_ratio':          round(spend_ratio,           3),

        # Model 2 features
        'income':               round(income,                2),
        'bnpl_total':           round(bnpl_total,            2),
        'num_loans':            num_loans,
        'savings':              round(savings,               2),
        'bnpl_ratio':           round(bnpl_ratio,            3),
        'savings_ratio':        round(savings_ratio,         3),

        # Metadata
        'persona':              persona_name,
        'has_bnpl':             int(has_bnpl),
        'description':          description,

        # Labels
        'actual_month_total':   round(actual_month_total,   2),
        'risk_score':           round(risk_score,           2),
    }


# ── Generate all students ─────────────────────────────────────
print(f"\n📦 Generating {N_PER_PERSONA * len(PERSONAS):,} Cambodian student records...\n")

records = []
for (name, imin, imax, bp, br, sr, lm, desc) in PERSONAS:
    for _ in range(N_PER_PERSONA):
        records.append(generate_student(name, imin, imax, bp, br, sr, lm, desc))
    avg_income = (imin + imax) / 2
    print(f"   ✅ {name:12s}  ${imin}–${imax}/mo  |  {desc}")

df = pd.DataFrame(records)
print(f"\n   Total: {len(df):,} rows, {len(df.columns)} columns")

# Save dataset
csv_path = os.path.join(DATA_DIR, 'cambodia_students.csv')
df.to_csv(csv_path, index=False)
print(f"\n💾 Dataset saved → {csv_path}")

# ── Dataset summary ───────────────────────────────────────────
print("\n📊 Cambodia Dataset Summary (USD):")
print(f"   Income range:        ${df['income'].min():.0f} – ${df['income'].max():.0f}/month")
print(f"   Avg monthly budget:  ${df['budget'].mean():.0f}")
print(f"   Avg monthly spend:   ${df['actual_month_total'].mean():.0f}")
print(f"   Students with BNPL:  {df['has_bnpl'].mean()*100:.0f}%")
print(f"   Avg BNPL debt:       ${df['bnpl_total'].mean():.0f}")
print(f"   Avg BNPL ratio:      {df['bnpl_ratio'].mean()*100:.0f}% of income")
print(f"   Avg savings:         ${df['savings'].mean():.0f}/month")

print(f"\n   Spend by persona:")
for name, grp in df.groupby('persona'):
    print(f"     {name:12s}  avg ${grp['actual_month_total'].mean():.0f}/mo"
          f"  |  income avg ${grp['income'].mean():.0f}")

risk_dist = pd.cut(df['risk_score'],
                   bins=[0, 20, 40, 60, 80, 100],
                   labels=['SAFE','LOW','MEDIUM','HIGH','CRITICAL'])
print(f"\n   Risk distribution:")
for label, count in risk_dist.value_counts().sort_index().items():
    pct = count / len(df) * 100
    bar = '█' * (count // 35)
    print(f"     {label:8s}: {count:5d} ({pct:4.1f}%)  {bar}")


# ═══════════════════════════════════════════════════════════════
# MODEL 1 — SPENDING PREDICTOR
# ═══════════════════════════════════════════════════════════════

print("\n" + "=" * 62)
print("  MODEL 1 — Spending Predictor (USD, Cambodia)")
print("=" * 62)

SPEND_FEATURES = [
    'total_spent_so_far',
    'day_of_month',
    'avg_daily_spend',
    'food_spend',
    'transport_spend',
    'shopping_spend',
    'bnpl_spend',
    'entertainment_spend',
    'days_remaining',
    'budget',
    'spend_ratio',
]

X1 = df[SPEND_FEATURES]
y1 = df['actual_month_total']

X1_tr, X1_te, y1_tr, y1_te = train_test_split(X1, y1, test_size=0.20, random_state=42)

try:
    from xgboost import XGBRegressor
    m1 = XGBRegressor(n_estimators=300, learning_rate=0.05, max_depth=5,
                      min_child_weight=3, subsample=0.8, colsample_bytree=0.8,
                      reg_alpha=0.1, reg_lambda=1.0, random_state=42, verbosity=0)
    algo = 'XGBoost'
except ImportError:
    m1 = GradientBoostingRegressor(n_estimators=300, learning_rate=0.05,
                                   max_depth=5, min_samples_leaf=3,
                                   subsample=0.8, random_state=42)
    algo = 'GradientBoosting (XGBoost equivalent)'

print(f"\n   Algorithm:  {algo}")
print(f"   Train rows: {len(X1_tr):,}   Test rows: {len(X1_te):,}")
print("   Training... ", end='', flush=True)
m1.fit(X1_tr, y1_tr)
print("done!")

y1_pred = m1.predict(X1_te)
mae1    = mean_absolute_error(y1_te, y1_pred)
r2_1    = r2_score(y1_te, y1_pred)
cv1     = -cross_val_score(m1, X1, y1, cv=5,
                            scoring='neg_mean_absolute_error').mean()

print(f"""
   ┌──────────────────────────────────────┐
   │  Test MAE:       ${mae1:>7.2f} / month   │
   │  R² Score:        {r2_1:>8.4f}          │
   │  5-Fold CV MAE:  ${cv1:>7.2f} / month   │
   └──────────────────────────────────────┘""")

print("\n   Feature importance:")
imp1 = sorted(zip(SPEND_FEATURES, m1.feature_importances_), key=lambda x: -x[1])
for feat, imp in imp1:
    if imp > 0.001:
        bar = '█' * int(imp * 55)
        print(f"     {feat:25s}  {imp:.3f}  {bar}")

# Per-persona accuracy
print("\n   MAE by student persona:")
test_idx = X1_te.index
test_personas = df.loc[test_idx, 'persona']
for persona in ['broke','allowance','part_time','fresh_grad','young_prof']:
    mask  = test_personas == persona
    if mask.sum() == 0:
        continue
    p_mae = mean_absolute_error(y1_te[mask], y1_pred[mask.values])
    avg_i = df[df['persona']==persona]['income'].mean()
    pct   = p_mae / df[df['persona']==persona]['actual_month_total'].mean() * 100
    print(f"     {persona:12s}  MAE=${p_mae:6.2f}  ({pct:.1f}% of avg spend)  avg income=${avg_i:.0f}")

# Example predictions
print("\n   Sample predictions (test set):")
print(f"   {'Actual':>8}  {'Predicted':>9}  {'Error':>8}  {'Day':>4}  {'Persona'}")
print("   " + "─" * 52)
tmp = X1_te.copy()
tmp['actual']    = y1_te.values
tmp['predicted'] = y1_pred
tmp['persona']   = df.loc[X1_te.index, 'persona'].values
for _, row in tmp.head(10).iterrows():
    err = row['predicted'] - row['actual']
    print(f"   ${row['actual']:>7.2f}  ${row['predicted']:>8.2f}  {err:>+7.2f}"
          f"  {int(row['day_of_month']):>4}  {row['persona']}")

# Save
joblib.dump(m1,             os.path.join(OUTPUT_DIR, 'spending_model.pkl'))
joblib.dump(SPEND_FEATURES, os.path.join(OUTPUT_DIR, 'spend_features.pkl'))
print(f"\n   ✅ spending_model.pkl saved")


# ═══════════════════════════════════════════════════════════════
# MODEL 2 — DEBT RISK SCORER
# ═══════════════════════════════════════════════════════════════

print("\n" + "=" * 62)
print("  MODEL 2 — Debt Risk Scorer (USD, Cambodia)")
print("=" * 62)

RISK_FEATURES = [
    'income',
    'bnpl_total',
    'num_loans',
    'savings',
    'bnpl_ratio',
    'savings_ratio',
    'spend_ratio',
    'has_bnpl',
]

X2 = df[RISK_FEATURES]
y2 = df['risk_score']

X2_tr, X2_te, y2_tr, y2_te = train_test_split(X2, y2, test_size=0.20, random_state=42)

try:
    from xgboost import XGBRegressor
    m2 = XGBRegressor(n_estimators=300, learning_rate=0.05, max_depth=4,
                      min_child_weight=3, subsample=0.8, colsample_bytree=0.8,
                      reg_alpha=0.05, reg_lambda=1.0, random_state=42, verbosity=0)
except ImportError:
    m2 = GradientBoostingRegressor(n_estimators=300, learning_rate=0.05,
                                   max_depth=4, min_samples_leaf=3,
                                   subsample=0.8, random_state=42)

print(f"\n   Algorithm:  {algo}")
print(f"   Train rows: {len(X2_tr):,}   Test rows: {len(X2_te):,}")
print("   Training... ", end='', flush=True)
m2.fit(X2_tr, y2_tr)
print("done!")

y2_pred = np.clip(m2.predict(X2_te), 0, 100)
mae2    = mean_absolute_error(y2_te, y2_pred)
r2_2    = r2_score(y2_te, y2_pred)
cv2     = -cross_val_score(m2, X2, y2, cv=5,
                            scoring='neg_mean_absolute_error').mean()

print(f"""
   ┌──────────────────────────────────────┐
   │  Test MAE:        {mae2:>6.2f} points      │
   │  R² Score:        {r2_2:>8.4f}          │
   │  5-Fold CV MAE:   {cv2:>6.2f} points      │
   └──────────────────────────────────────┘""")

print("\n   Feature importance:")
imp2 = sorted(zip(RISK_FEATURES, m2.feature_importances_), key=lambda x: -x[1])
for feat, imp in imp2:
    bar = '█' * int(imp * 55)
    print(f"     {feat:20s}  {imp:.3f}  {bar}")

# Tier accuracy
def tier(s):
    if s >= 80: return 'CRITICAL'
    if s >= 60: return 'HIGH'
    if s >= 40: return 'MEDIUM'
    if s >= 20: return 'LOW'
    return 'SAFE'

actual_tiers    = [tier(s) for s in y2_te]
predicted_tiers = [tier(s) for s in y2_pred]
tier_acc        = sum(a == p for a, p in zip(actual_tiers, predicted_tiers)) / len(actual_tiers)
print(f"\n   Tier classification accuracy: {tier_acc*100:.1f}%")

# Real Cambodian student examples
print("\n   Real Cambodian student profiles → risk scores:")
print(f"   {'Profile':38s}  {'Score':>6}  {'Tier'}")
print("   " + "─" * 60)

examples = [
    # (description, income, bnpl_total, num_loans, savings, bnpl_ratio, savings_ratio, spend_ratio, has_bnpl)
    ("Village student, no BNPL, $120/mo",       120,  0,   0, 5,   0.00, 0.04, 0.88, 0),
    ("City student, 1 Atome plan $40",          280, 40,   1, 10,  0.14, 0.04, 0.85, 1),
    ("Part-timer, 2 BNPL plans $130 total",     420,130,   2, 20,  0.31, 0.05, 0.90, 1),
    ("Fresh grad, responsible saver",           650, 80,   1,120,  0.12, 0.18, 0.72, 1),
    ("Fresh grad, 3 BNPL plans, no savings",    650,380,   3,  0,  0.58, 0.00, 1.05, 1),
    ("IT worker, good habits",                  950,150,   1,250,  0.16, 0.26, 0.68, 1),
    ("IT worker, lifestyle inflation",          950,580,   3, 20,  0.61, 0.02, 0.98, 1),
    ("NGO worker, maxed out BNPL",              700,560,   4,  0,  0.80, 0.00, 1.15, 1),
    ("Young prof, debt spiral",                1200,1050,  4,  0,  0.88, 0.00, 1.20, 1),
    ("Young prof, financially healthy",        1200, 200,  1,350,  0.17, 0.29, 0.65, 1),
]

for desc, inc, bt, nl, sv, br, sr, spr, hb in examples:
    row = pd.DataFrame([{
        'income':inc,'bnpl_total':bt,'num_loans':nl,'savings':sv,
        'bnpl_ratio':br,'savings_ratio':sr,'spend_ratio':spr,'has_bnpl':hb
    }])[RISK_FEATURES]
    score = float(np.clip(m2.predict(row)[0], 0, 100))
    print(f"   {desc:38s}  {score:>6.1f}  {tier(score)}")

# Save
joblib.dump(m2,             os.path.join(OUTPUT_DIR, 'risk_model.pkl'))
joblib.dump(RISK_FEATURES,  os.path.join(OUTPUT_DIR, 'risk_features.pkl'))
print(f"\n   ✅ risk_model.pkl saved")


# ═══════════════════════════════════════════════════════════════
# METADATA
# ═══════════════════════════════════════════════════════════════

metadata = {
    'generated_at': datetime.now().isoformat(),
    'currency': 'USD',
    'market': 'Cambodia (Phnom Penh)',
    'training_samples': len(df),
    'personas': {p[0]: {'income_range': f'${p[1]}–${p[2]}/month', 'description': p[6]}
                 for p in PERSONAS},
    'model_1': {
        'name': 'Spending Predictor',
        'algorithm': algo,
        'features': SPEND_FEATURES,
        'test_mae_usd': round(mae1, 2),
        'r2_score': round(r2_1, 4),
        'cv_mae_usd': round(cv1, 2),
    },
    'model_2': {
        'name': 'Debt Risk Scorer',
        'algorithm': algo,
        'features': RISK_FEATURES,
        'test_mae_points': round(mae2, 2),
        'r2_score': round(r2_2, 4),
        'cv_mae_points': round(cv2, 2),
        'tier_accuracy_pct': round(tier_acc * 100, 1),
        'tiers': {
            '0–19':  'SAFE',
            '20–39': 'LOW',
            '40–59': 'MEDIUM',
            '60–79': 'HIGH',
            '80–100':'CRITICAL'
        },
    }
}

meta_path = os.path.join(OUTPUT_DIR, 'model_metadata.json')
with open(meta_path, 'w') as f:
    json.dump(metadata, f, indent=2)
print(f"   ✅ model_metadata.json saved")


# ═══════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════

print(f"""
{"=" * 62}
  TRAINING COMPLETE — Cambodia Student Models (USD)
{"=" * 62}

  Dataset: {len(df):,} students across {len(PERSONAS)} personas
  Market:  Phnom Penh, Cambodia
  Currency: USD

  MODEL 1 — Spending Predictor
    MAE:  ${mae1:.2f}/month   R²: {r2_1:.4f}

  MODEL 2 — Debt Risk Scorer
    MAE:  {mae2:.2f} points   R²: {r2_2:.4f}
    Tier accuracy: {tier_acc*100:.1f}%

  Files saved:
    data/cambodia_students.csv
    models/spending_model.pkl
    models/risk_model.pkl
    models/spend_features.pkl
    models/risk_features.pkl
    models/model_metadata.json

  Next step → python api/main.py
""")
