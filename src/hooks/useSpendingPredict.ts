import { useState } from 'react';

const ML_API = import.meta.env.VITE_ML_API_URL || 'http://localhost:8000';

export interface PredictResult {
  predicted_total: number;
  daily_avg:       number;
  over_budget_by:  number;
  budget:          number;
  source:          string;
}

export interface PredictParams {
  total_spent_so_far:  number;
  day_of_month:        number;
  avg_daily_spend:     number;
  food_spend:          number;
  transport_spend:     number;
  shopping_spend:      number;
  bnpl_spend:          number;
  entertainment_spend: number;
  days_remaining:      number;
  budget:              number;
  spend_ratio:         number;
}

export const useSpendingPredict = () => {
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<PredictResult | null>(null);
  const [error,    setError]    = useState<string | null>(null);

  const predict = async (params: PredictParams) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${ML_API}/predict`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(params),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data: PredictResult = await res.json();
      setResult(data);
    } catch {
      setError('ML prediction unavailable — using local estimate.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  return { predict, result, loading, error };
};