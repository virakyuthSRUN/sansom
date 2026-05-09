<div align="center">

# 🤖 SAMSOM
### Smart AI Money Companion

**BorNEO HackWknd 26** · Technical Track · Case Study 7: AI for Financial Literacy

🇰🇭 Cambodia-first · ASEAN-scalable

[![SDG 4](https://img.shields.io/badge/SDG%204-Quality%20Education-red)](https://sdgs.un.org/goals/goal4)
[![SDG 1](https://img.shields.io/badge/SDG%201-No%20Poverty-orange)](https://sdgs.un.org/goals/goal1)

</div>

---

## 📋 Table of Contents

- [About](#about)
- [Team](#team)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Clone the Repository](#1-clone-the-repository)
  - [2. Environment Variables](#2-environment-variables)
  - [3. Run the ML Service](#3-run-the-ml-service)
  - [4. Run the Backend](#4-run-the-backend)
  - [5. Run the Frontend](#5-run-the-frontend)
- [ML Models](#ml-models)
- [Refinement Changelog](#refinement-changelog)
- [AI Disclosure](#ai-disclosure)
- [Submission Links](#submission-links)

---

## About

SAMSOM is a Cambodia-first AI-powered financial literacy app targeting ASEAN youth — specifically addressing the growing BNPL (Buy Now, Pay Later) debt crisis among students and young professionals.

**The Problem:** Over 67% of Southeast Asian youth aged 18–35 use BNPL services, with many falling into debt cycles they don't fully understand. In Cambodia, platforms like Atome, Kredivo, ABA BNPL, and Pi Pay are rapidly growing among students with limited financial education.

**Our Solution:** SAMSOM combines two AI systems working together:

| AI Layer | Tool | What it does |
|---|---|---|
| Conversational AI | Groq API | Personal financial coach — gives advice in plain language based on real spending data |
| Predictive ML | XGBoost Model 1 | Forecasts your end-of-month total spend from current transactions |
| Risk Scoring ML | XGBoost Model 2 | Calculates personalised BNPL debt risk score (0–100) across 5 tiers |

**Core Features:**
- 🏦 Real-time bank sync (ABA, ACLEDA via Teller API)
- 📊 AI spending forecast — XGBoost-powered monthly prediction
- ⚠️ BNPL debt risk scanner — 5-tier score (SAFE → CRITICAL)
- 💬 Groq AI chat — context-aware financial coaching
- 🎯 Savings goal tracker with AI milestone predictions
- 💵 Manual cash transaction logging

---

## Team

| Name | Role | Responsibilities |
|------|------|-----------------|
| **Hieng Dara** | Lead + Frontend | Project lead, UI/UX, React frontend, integration |
| **Van Meysorng** | Frontend + Video | Frontend development, demo video production |
| **Chhea Muoyheang** | Backend + AI | Node.js backend, Groq API, Teller bank sync |
| **Srun Vireakyuth** | ML + Report | XGBoost models, FastAPI service, project report |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + TypeScript + Tailwind CSS |
| Backend | Node.js + Express |
| AI Chat | Groq API |
| ML Models | Python 3.9 + XGBoost + scikit-learn + FastAPI |
| Database | Supabase (PostgreSQL) |
| Bank Sync | Teller API |
| Frontend Deploy | Vercel |
| Backend Deploy | Railway |
| ML Deploy | Render |

---

## Project Structure

```
sansom/
│
├── 📁 backend/                          # Node.js + Express API server
│   ├── certs/
│   │   ├── certificate.pem              # SSL certificate
│   │   └── private_key.pem             # SSL private key
│   ├── src/
│   │   ├── data/
│   │   │   └── mock-transactions.json  # Mock bank data for demo
│   │   ├── middleware/
│   │   │   └── auth.js                 # Authentication middleware
│   │   ├── routes/
│   │   │   ├── budget.js               # Budget management endpoints
│   │   │   ├── chat.js                 # Groq AI chat endpoint
│   │   │   ├── teller.js               # Bank sync (ABA / ACLEDA)
│   │   │   └── transactions.js         # Transaction CRUD endpoints
│   │   ├── services/
│   │   │   ├── claude-service.js       # Anthropic Claude API integration
│   │   │   ├── gemini-service.js       # Gemini (fallback AI)
│   │   │   ├── groq-service.js         # Groq (primary AI)
│   │   │   └── teller-service.js       # Teller bank API service
│   │   ├── utils/
│   │   │   ├── categorize.js           # Auto-categorise transactions
│   │   │   └── risk-calculator.js      # Rule-based risk fallback
│   │   ├── index.js                    # Express app entry point
│   │   └── test-env.js                 # Environment variable checker
│   └── package.json
│
├── 📁 ml-service/                       # Python ML microservice
│   ├── api/
│   │   └── main.py                     # FastAPI server — 2 ML endpoints
│   ├── models/
│   │   ├── train.py                    # Training script (run once)
│   │   ├── spending_model.pkl          # Trained Model 1: Spending Predictor
│   │   ├── risk_model.pkl              # Trained Model 2: Debt Risk Scorer
│   │   ├── spend_features.pkl          # Feature order for Model 1
│   │   ├── risk_features.pkl           # Feature order for Model 2
│   │   └── model_metadata.json        # Performance metrics
│   ├── data/
│   │   └── cambodia_students.csv      # 2,000 synthetic training records
│   └── requirements.txt
│
├── 📁 src/                              # React frontend (Vite — lives at root)
│   └── components/
│       └── fina/                       # Main app screens
│           ├── AddGoalDialog.tsx        # Add savings goal dialog
│           ├── BarChart.tsx             # Bar chart component
│           ├── ChatPage.tsx             # Groq AI chat screen
│           ├── Dashboard.tsx            # Main dashboard
│           ├── DebtGoalsPage.tsx        # Debt + Goals combined page
│           ├── DebtPage.tsx             # BNPL debt risk scanner (ML)
│           ├── DynamicIcon.tsx          # Dynamic icon renderer
│           ├── GoalsPage.tsx            # Savings goals tracker
│           ├── RingChart.tsx            # Ring/donut chart
│           ├── SettingsPage.tsx         # App settings
│           └── TrackerPage.tsx          # Spending tracker (ML forecast)
│
├── .env                                # Frontend env vars (Vite)
├── package.json                        # Frontend dependencies
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── README.md
```

---

## Getting Started

> ⚠️ You need **3 terminal windows** open simultaneously for the full app to work.

### Prerequisites

| Tool | Minimum Version | Check |
|------|----------------|-------|
| Node.js | v18+ | `node --version` |
| npm | v9+ | `npm --version` |
| Python | 3.9+ | `python3 --version` |
| pip | latest | `pip3 --version` |
| Git | any | `git --version` |

---

### 1. Clone the Repository

```bash
git clone https://github.com/virakyuthSRUN/sansom.git
cd sansom
```

---

### 2. Environment Variables

You need **two** `.env` files — one at the root for the frontend, one inside `backend/` for the server.

#### `sansom/.env` — Frontend (root of project)

Create this file at the **root** of the project:

```env
VITE_SUPABASE_URL=https://wkbltllppoozpgvrgjfg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrYmx0bGxwcG9venBndnJnamZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTQxMDcsImV4cCI6MjA4ODgzMDEwN30.fEERpIYZGVNrQRt6gBLYZQtKxIT67-f0X3PZIp75KmE
VITE_ML_API_URL=http://localhost:8000
```

#### `sansom/backend/.env` — Backend (inside backend/ folder)

Create this file inside the `backend/` folder:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://wkbltllppoozpgvrgjfg.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrYmx0bGxwcG9venBndnJnamZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyNTQxMDcsImV4cCI6MjA4ODgzMDEwN30.fEERpIYZGVNrQRt6gBLYZQtKxIT67-f0X3PZIp75KmE
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrYmx0bGxwcG9venBndnJnamZnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI1NDEwNywiZXhwIjoyMDg4ODMwMTA3fQ.4SbL77yB7qY_8GQe9ogIoRaaw53SoUfRerzzUqak8SY

# AI Services Configuration
GEMINI_API_KEY=AIzaSyDePEzOpzTgClzOeaoDG3vy-pUHZkDSVI4
GROQ_API_KEY=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

# Teller Configuration (Banking API)
TELLER_APP_ID=app_ppnhqv8vomq54misqa000
TELLER_CERT_PATH=./certs/certificate.pem
TELLER_KEY_PATH=./certs/private_key.pem
TELLER_ENVIRONMENT=sandbox
```

> ⚠️ Never commit `.env` files to GitHub. Both are already in `.gitignore`.

---

### 3. Run the ML Service

```bash
# Terminal 1
cd sansom/ml-service

# Install Python dependencies
pip3 install fastapi uvicorn scikit-learn pandas numpy joblib xgboost

# First time only — train the models (~30 seconds)
# This generates spending_model.pkl, risk_model.pkl, and feature files
python3 models/train.py

# Start the FastAPI ML server
python3 api/main.py
```

**Expected output:**
```
✅ SAMSOM ML models loaded successfully
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

✅ ML service running at `http://localhost:8000`  
📖 Swagger API docs at `http://localhost:8000/docs`

**Quick test to confirm it works:**
```bash
# Test Model 1 — Spending Predictor
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{
    "total_spent_so_far": 120.0,
    "day_of_month": 13,
    "avg_daily_spend": 9.23,
    "food_spend": 55.0,
    "transport_spend": 18.0,
    "shopping_spend": 25.0,
    "bnpl_spend": 10.0,
    "entertainment_spend": 8.0,
    "days_remaining": 17,
    "budget": 280.0,
    "spend_ratio": 0.43
  }'
# → {"predicted_total":286.5,"daily_avg":9.23,"over_budget_by":6.5,"source":"xgboost"}

# Test Model 2 — Debt Risk Scorer
curl -X POST http://localhost:8000/risk-score \
  -H "Content-Type: application/json" \
  -d '{
    "income": 420.0,
    "bnpl_total": 130.0,
    "num_loans": 2,
    "savings": 20.0,
    "bnpl_ratio": 0.31,
    "savings_ratio": 0.048,
    "spend_ratio": 0.90,
    "has_bnpl": 1
  }'
# → {"score":37,"label":"LOW","color":"#3b82f6","advice":"...","source":"xgboost"}
```

---

### 4. Run the Backend

```bash
# Terminal 2
cd sansom/backend

# Install Node.js dependencies
npm install

# Start the backend server with hot reload
npm run dev
```

**Expected output:**
```
Server running on http://localhost:5000
```

✅ Backend running at `http://localhost:5000`

---

### 5. Run the Frontend

The React + Vite frontend lives at the **root** of the project — there is no separate frontend folder.

```bash
# Terminal 3
cd sansom

# Install frontend dependencies
npm install

# Start the Vite development server
npm run dev
```

**Expected output:**
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:8080/
```

✅ Frontend running at `http://localhost:8080`

Open your browser at **`http://localhost:8080`** 🚀

---

### All Three Together

```
┌──────────────────────────┬──────────────────────────┬──────────────────────────┐
│  Terminal 1 — ML         │  Terminal 2 — Backend    │  Terminal 3 — Frontend   │
├──────────────────────────┼──────────────────────────┼──────────────────────────┤
│  cd sansom/ml-service    │  cd sansom/backend       │  cd sansom               │
│  pip3 install ...        │  npm install             │  npm install             │
│  python3 api/main.py     │  npm run dev             │  npm run dev             │
│                          │                          │                          │
│  → localhost:8000        │  → localhost:5000        │  → localhost:8080        │
└──────────────────────────┴──────────────────────────┴──────────────────────────┘
```

---

## ML Models

### Model 1 — Spending Predictor

Predicts end-of-month total spend from current transaction data.

- **Algorithm:** XGBoost Gradient Boosting Regressor
- **Input:** 11 features (spending by category, day of month, budget, spend ratio)
- **Output:** Predicted end-of-month total in USD
- **Performance:** MAE $40.25/month · R² = 0.9879

### Model 2 — Debt Risk Scorer

Scores BNPL debt risk from 0–100 across 5 tiers.

- **Algorithm:** XGBoost Gradient Boosting Regressor
- **Input:** 8 features (income, BNPL total, number of loans, savings, ratios)
- **Output:** Score 0–100 + tier + colour + personalised advice

| Score | Tier | Meaning |
|-------|------|---------|
| 0–19 | 🟢 SAFE | Excellent financial health |
| 20–39 | 🔵 LOW | Managing well, stay aware |
| 40–59 | 🟡 MEDIUM | Caution — review spending |
| 60–79 | 🟠 HIGH | Risk — reduce BNPL now |
| 80–100 | 🔴 CRITICAL | Danger — seek help immediately |

- **Performance:** MAE 2.92 points · R² = 0.9717 · Tier accuracy 89%

### Training Data

- **2,000 synthetic records** calibrated to Phnom Penh, Cambodia cost-of-living
- **5 student personas:** broke ($80–200/mo) · allowance ($200–350/mo) · part-time ($350–550/mo) · fresh graduate ($500–900/mo) · young professional ($900–1800/mo)
- **Cambodia-specific:** Atome, Kredivo, ABA BNPL, Pi Pay amounts · street food $0.50–2 · tuk-tuk $1–3 · shared room $80–180
- **Behavioural patterns:** Payday spending spike (day 1–3), month-end crunch (day 26–30), weekend uplift

---

## Refinement Changelog

> 📄 Full 4-page Refinement Changelog document is included in the submission folder.

### Overview

Between the preliminary submission and the final round, Team SAMSOM made **6 targeted technical improvements** and completed **3 forms of external validation**. Every change was intentional — designed to strengthen the product, validate assumptions with real users, and ensure SAMSOM is ready for real-world deployment.

| | Count | What |
|---|---|---|
| ⚙️ Technical | **6** | Core improvements shipped |
| ✓ Validation | **3** | External validation methods |
| 👥 Interviews | **73** | Real target users interviewed |

---

### ⚙️ Technical Improvements

| # | Area | Before | After |
|---|------|--------|-------|
| 1 | **Bank Sync** | Expenses only — income missing | Full income + expenses sync — complete financial view |
| 2 | **Bug Fix** | Transactions displaying incorrectly or missing | All transactions rendering accurately in Tracker |
| 3 | **Groq AI** | Not connected to user financial data | Receives balance, budget, BNPL, ML score per message |
| 4 | **XGBoost ML** | Models trained but disconnected from UI | Spending Predictor + Risk Scorer live in app |
| 5 | **Supabase** | Data not persisting between sessions | Transactions, goals, BNPL plans stored and queried live |
| 6 | **UI + GitHub** | Rough UI, outdated README, local only | Polished mobile-first UI, full README, repo pushed |

---

### ✓ Validation Completed

#### 01 — User Interviews: Problem, Solution & Pricing

73 direct interviews conducted with university students across Cambodia. Three core problems confirmed by real users.

| Criteria | Finding | Result |
|----------|---------|--------|
| **Pain Points** | 91% had no real-time view of finances across accounts and BNPL | ✅ Problem Validated |
| **Solution Fit** | 88% confirmed SAMSOM directly addresses their problems | ✅ Solution Validated |
| **Pricing** | 83% willing to pay $1.99/month — "less than a coffee for something genuinely useful" | ✅ Pricing Validated |

#### 02 — AI Review: Risk Scoring Methodology

AI-assisted review of the XGBoost risk scoring approach confirmed the methodology is sound. BNPL ratio, number of loans, and spend ratio validated as correct primary predictors. Tier thresholds confirmed as appropriate for ASEAN student income ranges.

#### 03 — Board of Advisors: Strategic Direction

Board of advisors reviewed the full product, business model, and ASEAN expansion roadmap. Market fit confirmed. Cambodia-first strategy validated as the correct entry point. Phase 2 Malaysia and Indonesia expansion timeline confirmed as realistic.

---

> *"Every change was intentional. Every validation was real. SAMSOM today is a fundamentally stronger product than what we submitted in March."*

---

## AI Disclosure

This project uses the following AI tools in compliance with BorNEO HackWknd 26 AI disclosure requirements:

| AI Tool | Version | Purpose | Location in App |
|---------|---------|---------|----------------|
| **Groq API** | Latest | Conversational financial coaching | Chat screen |
| **XGBoost Model 1** | Trained on 2,000 records | Monthly spending prediction | Tracker screen — AI banner |
| **XGBoost Model 2** | Trained on 2,000 records | BNPL debt risk scoring | Debt screen — Risk Simulator |
| **Claude** | `claude-sonnet-4-6` | Development assistance | Used during development only |

**Responsible AI Statement:** All AI-generated content is clearly labelled in the UI with "AI" or "XGBoost" badges. SAMSOM does not make financial decisions on behalf of users — it provides education, awareness, and guidance only. No real personal financial data was used to train the ML models. All synthetic training data was generated specifically for this project.

**Compliance Declaration:** All AI tool usage has been fully disclosed above in accordance with BorNEO HackWknd 26 competition rules.

---

## Submission Links

| Item | Link |
|------|------|
| 🔗 GitHub Repository | https://github.com/virakyuthSRUN/sansom |
| 📄 Project Report + Pitch Video | [Google Drive](https://drive.google.com/drive/folders/1ejBW92yZMl0dSF5Gmgbv8dza4eMhFXm0?usp=sharing) |
| 🎬 Demo + Pitching Video | [YouTube](https://youtu.be/KDchzWbo_nI) |

---

<div align="center">

Built with ❤️ in Cambodia 🇰🇭 for ASEAN Youth

**SAMSOM — Smart AI Money Companion**

BorNEO HackWknd 26 · Technical Track · SDG 4 Quality Education · SDG 1 No Poverty

</div>
