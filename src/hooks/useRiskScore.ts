import { useState } from 'react';

const ML_API = import.meta.env.VITE_ML_API_URL || 'http://localhost:8000';

export interface RiskResult {
  risk_score: number;
  score:      number;
  label:      string;
  color:      string;
  advice:     string;
  bnpl_pct:   number;
  source:     string;
}

export interface RiskParams {
  income:       number;
  bnpl_total:   number;
  num_loans:    number;
  savings:      number;
  spend_ratio?: number;
}

export const useRiskScore = () => {
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState<RiskResult | null>(null);
  const [error,   setError]   = useState<string | null>(null);

  const calculate = async (params: RiskParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${ML_API}/risk-score`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          income:        params.income,
          bnpl_total:    params.bnpl_total,
          num_loans:     params.num_loans,
          savings:       params.savings,
          bnpl_ratio:    params.income > 0 ? params.bnpl_total / params.income : 0,
          savings_ratio: params.income > 0 ? params.savings    / params.income : 0,
          spend_ratio:   params.spend_ratio ?? 0.85,
          has_bnpl:      params.bnpl_total > 0 ? 1 : 0,
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data: RiskResult = await res.json();
      setResult(data);
    } catch (e) {
      setError('ML service unreachable — using local estimate.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setResult(null); setError(null); };

  return { calculate, result, loading, error, reset };
};