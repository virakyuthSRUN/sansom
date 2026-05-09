"""
SAMSOM — ML Service API
════════════════════════════════════════════════════════
Run:   python api/main.py
Docs:  http://localhost:8000/docs

Endpoints:
  GET  /health        — check if models are loaded
  POST /predict       — Model 1: spending prediction
  POST /risk-score    — Model 2: debt risk score (0–100)
"""

import os
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="SAMSOM ML Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load models ───────────────────────────────────────────────────────
MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'models')

try:
    spending_model  = joblib.load(os.path.join(MODEL_DIR, 'spending_model.pkl'))
    risk_model      = joblib.load(os.path.join(MODEL_DIR, 'risk_model.pkl'))
    spend_features  = joblib.load(os.path.join(MODEL_DIR, 'spend_features.pkl'))
    risk_features   = joblib.load(os.path.join(MODEL_DIR, 'risk_features.pkl'))
    MODELS_LOADED   = True
    print("✅ SAMSOM ML models loaded successfully")
except FileNotFoundError as e:
    MODELS_LOADED  = False
    spend_features = []
    risk_features  = []
    print(f"⚠️  Models not found — using fallback. Run models/train.py first!")
    print(f"   Missing: {e}")


# ── Helpers ───────────────────────────────────────────────────────────

def score_to_label(score: int) -> str:
    if score >= 80: return "CRITICAL"
    if score >= 60: return "HIGH"
    if score >= 40: return "MEDIUM"
    if score >= 20: return "LOW"
    return "SAFE"

def score_to_color(score: int) -> str:
    if score >= 80: return "#ff4757"
    if score >= 60: return "#f97316"
    if score >= 40: return "#ffb300"
    if score >= 20: return "#3b82f6"
    return "#00c896"

def score_to_advice(score: int, bnpl_total: float, income: float) -> str:
    bnpl_pct = round((bnpl_total / income * 100) if income > 0 else 0)
    if score >= 80:
        return (
            f"Critical risk. Your BNPL debt is {bnpl_pct}% of your income. "
            f"Stop all new BNPL immediately. Contact CMA Cambodia or a financial counsellor now."
        )
    if score >= 60:
        return (
            f"High risk. Your BNPL is {bnpl_pct}% of income — aim to get this below 20%. "
            f"Pay off your smallest plan first to reduce the number of active loans."
        )
    if score >= 40:
        return (
            f"Medium risk. Watch your spending carefully. "
            f"Try not to add any new BNPL plans until existing ones are cleared."
        )
    if score >= 20:
        return (
            "Low risk. You're managing well. "
            "Keep saving and clear BNPL plans before the interest-free period ends."
        )
    return (
        "You are in great financial shape! "
        "Consider putting your savings into an ABA or ACLEDA fixed deposit to grow your money."
    )

def fallback_predict(total_spent: float, day: int, budget: float) -> float:
    """Simple rule-based fallback if model not loaded."""
    daily = total_spent / day if day > 0 else total_spent
    return round(daily * 30, 2)

def fallback_risk(income: float, bnpl_total: float, num_loans: int, savings: float) -> int:
    """Simple rule-based fallback if model not loaded."""
    if income <= 0:
        return 50
    bnpl_ratio    = bnpl_total / income
    savings_ratio = savings / income
    score = int(bnpl_ratio * 52 + num_loans * 8.5 - savings_ratio * 15)
    return max(0, min(score, 100))


# ════════════════════════════════════════════════════════════════════
# SCHEMAS
# ════════════════════════════════════════════════════════════════════

# ── Model 1 — /predict ───────────────────────────────────────────────
class PredictRequest(BaseModel):
    # These 11 fields match EXACTLY what train.py trained on
    total_spent_so_far:   float
    day_of_month:         int
    avg_daily_spend:      float
    food_spend:           float = 0.0
    transport_spend:      float = 0.0
    shopping_spend:       float = 0.0
    bnpl_spend:           float = 0.0
    entertainment_spend:  float = 0.0
    days_remaining:       int
    budget:               float
    spend_ratio:          float

class PredictResponse(BaseModel):
    predicted_total:  float          # end-of-month spend prediction
    daily_avg:        float          # average daily spend
    over_budget_by:   float          # positive = over, negative = under
    budget:           float
    source:           str = "xgboost"


# ── Model 2 — /risk-score ────────────────────────────────────────────
class RiskRequest(BaseModel):
    # These 8 fields match EXACTLY what train.py trained on
    income:         float
    bnpl_total:     float = 0.0
    num_loans:      int   = 0
    savings:        float = 0.0
    bnpl_ratio:     float = 0.0    # can be auto-calculated if 0
    savings_ratio:  float = 0.0    # can be auto-calculated if 0
    spend_ratio:    float = 0.85   # default to average if not provided
    has_bnpl:       int   = 0      # 1 = has BNPL, 0 = none

class RiskResponse(BaseModel):
    risk_score:  float             # 0–100 continuous
    score:       int               # rounded integer for display
    label:       str               # SAFE / LOW / MEDIUM / HIGH / CRITICAL
    color:       str               # hex color for UI
    advice:      str               # personalised advice text
    bnpl_pct:    float             # bnpl as % of income
    source:      str = "xgboost"


# ════════════════════════════════════════════════════════════════════
# ENDPOINTS
# ════════════════════════════════════════════════════════════════════

@app.get("/health")
def health():
    return {
        "status": "ok",
        "models_loaded": MODELS_LOADED,
        "spend_features": spend_features,
        "risk_features": risk_features,
    }


@app.post("/predict", response_model=PredictResponse)
def predict_spending(req: PredictRequest):
    """
    Model 1 — Spending Predictor
    Send current month spending data → get end-of-month prediction
    """
    if req.day_of_month <= 0:
        raise HTTPException(status_code=400, detail="day_of_month must be > 0")

    daily_avg = req.total_spent_so_far / req.day_of_month

    if MODELS_LOADED:
        # Build feature dataframe in exact same order as training
        features = pd.DataFrame([{
            'total_spent_so_far':  req.total_spent_so_far,
            'day_of_month':        req.day_of_month,
            'avg_daily_spend':     req.avg_daily_spend,
            'food_spend':          req.food_spend,
            'transport_spend':     req.transport_spend,
            'shopping_spend':      req.shopping_spend,
            'bnpl_spend':          req.bnpl_spend,
            'entertainment_spend': req.entertainment_spend,
            'days_remaining':      req.days_remaining,
            'budget':              req.budget,
            'spend_ratio':         req.spend_ratio,
        }])[spend_features]   # enforce exact column order

        predicted = float(spending_model.predict(features)[0])
        predicted = max(predicted, req.total_spent_so_far)   # can't spend less than already spent
        source = "xgboost"
    else:
        predicted = fallback_predict(req.total_spent_so_far, req.day_of_month, req.budget)
        source = "fallback"

    over_budget_by = round(predicted - req.budget, 2)

    return PredictResponse(
        predicted_total  = round(predicted, 2),
        daily_avg        = round(daily_avg, 2),
        over_budget_by   = over_budget_by,
        budget           = req.budget,
        source           = source,
    )


@app.post("/risk-score", response_model=RiskResponse)
def calculate_risk(req: RiskRequest):
    """
    Model 2 — Debt Risk Scorer
    Send financial profile → get 0–100 risk score + advice
    """
    if req.income <= 0:
        raise HTTPException(status_code=400, detail="income must be > 0")

    # Auto-calculate ratios if not provided
    bnpl_ratio    = req.bnpl_ratio    if req.bnpl_ratio    > 0 else (req.bnpl_total / req.income)
    savings_ratio = req.savings_ratio if req.savings_ratio > 0 else (req.savings    / req.income)
    has_bnpl      = 1 if req.bnpl_total > 0 else req.has_bnpl

    if MODELS_LOADED:
        features = pd.DataFrame([{
            'income':        req.income,
            'bnpl_total':    req.bnpl_total,
            'num_loans':     req.num_loans,
            'savings':       req.savings,
            'bnpl_ratio':    bnpl_ratio,
            'savings_ratio': savings_ratio,
            'spend_ratio':   req.spend_ratio,
            'has_bnpl':      has_bnpl,
        }])[risk_features]   # enforce exact column order

        raw = float(risk_model.predict(features)[0])
        risk_score = float(np.clip(raw, 0, 100))
        source = "xgboost"
    else:
        risk_score = float(fallback_risk(req.income, req.bnpl_total, req.num_loans, req.savings))
        source = "fallback"

    score  = max(0, min(int(round(risk_score)), 100))
    label  = score_to_label(score)
    color  = score_to_color(score)
    advice = score_to_advice(score, req.bnpl_total, req.income)
    bnpl_pct = round((req.bnpl_total / req.income * 100) if req.income > 0 else 0, 1)

    return RiskResponse(
        risk_score = round(risk_score, 2),
        score      = score,
        label      = label,
        color      = color,
        advice     = advice,
        bnpl_pct   = bnpl_pct,
        source     = source,
    )


# ── Run ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
