import { createContext, useContext, useState, ReactNode } from 'react';
import { GOALS as DEFAULT_GOALS } from '@/lib/constants';

export interface Goal {
  id: number;
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
  removeGoal: (id: number) => void;
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined);

export const GoalsProvider = ({ children }: { children: ReactNode }) => {
  const [goals, setGoals] = useState<Goal[]>(() => {
    const stored = localStorage.getItem('samsom-goals');
    return stored ? JSON.parse(stored) : DEFAULT_GOALS;
  });

  const persist = (g: Goal[]) => {
    setGoals(g);
    localStorage.setItem('samsom-goals', JSON.stringify(g));
  };

  const addGoal = (goal: Omit<Goal, 'id'>) => {
    const newGoal = { ...goal, id: Date.now() };
    persist([...goals, newGoal]);
  };

  const removeGoal = (id: number) => {
    persist(goals.filter(g => g.id !== id));
  };

  return (
    <GoalsContext.Provider value={{ goals, addGoal, removeGoal }}>
      {children}
    </GoalsContext.Provider>
  );
};

export const useGoals = () => {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error('useGoals must be used within GoalsProvider');
  return ctx;
};
