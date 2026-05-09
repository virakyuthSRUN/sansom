import { createContext, useContext, useState, useEffect } from 'react';
import { GOALS as DEFAULT_GOALS } from '@/lib/constants';

export interface Goal {
  id: string;
  name: string;
  icon: string;
  target: number;
  saved: number;
  color: string;
  deadline: string;
}

interface GoalsContextType {
  goals: Goal[];
  addGoal: (goal: Omit<Goal, 'id'>) => void;
  removeGoal: (id: string) => void;
  updateGoal: (id: string, updates: Partial<Goal>) => void;
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined);

const sanitizeGoal = (g: any): Goal => ({
  ...g,
  saved: Math.round(Number(g.saved) * 100) / 100,
  target: Math.round(Number(g.target) * 100) / 100,
});

export const GoalsProvider = ({ children }: { children: React.ReactNode }) => {
  const [goals, setGoals] = useState<Goal[]>(() => {
    try {
      const saved = localStorage.getItem('sansom-goals');
      return saved
        ? JSON.parse(saved).map(sanitizeGoal)
        : DEFAULT_GOALS.map(sanitizeGoal);
    } catch {
      return DEFAULT_GOALS.map(sanitizeGoal);
    }
  });

  useEffect(() => {
    localStorage.setItem('sansom-goals', JSON.stringify(goals));
  }, [goals]);

  const addGoal = (goal: Omit<Goal, 'id'>) => {
    const newGoal = sanitizeGoal({ ...goal, id: Date.now().toString() });
    setGoals(prev => [...prev, newGoal]);
  };

  const removeGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const updateGoal = (id: string, updates: Partial<Goal>) => {
    setGoals(prev =>
      prev.map(g => g.id === id ? sanitizeGoal({ ...g, ...updates }) : g)
    );
  };

  return (
    <GoalsContext.Provider value={{ goals, addGoal, removeGoal, updateGoal }}>
      {children}
    </GoalsContext.Provider>
  );
};

export const useGoals = () => {
  const context = useContext(GoalsContext);
  if (context === undefined) {
    throw new Error('useGoals must be used within GoalsProvider');
  }
  return context;
};