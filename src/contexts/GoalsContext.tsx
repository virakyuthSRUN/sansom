import { createContext, useContext, useState, useEffect } from 'react';

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

// Default goals from your constants
import { GOALS as DEFAULT_GOALS } from '@/lib/constants';

export const GoalsProvider = ({ children }: { children: React.ReactNode }) => {
  const [goals, setGoals] = useState<Goal[]>(() => {
    const saved = localStorage.getItem('sansom-goals');
    return saved ? JSON.parse(saved) : DEFAULT_GOALS;
  });

  useEffect(() => {
    localStorage.setItem('sansom-goals', JSON.stringify(goals));
  }, [goals]);

  const addGoal = (goal: Omit<Goal, 'id'>) => {
    const newGoal = {
      ...goal,
      id: Date.now().toString(),
    };
    setGoals(prev => [...prev, newGoal]);
  };

  const removeGoal = (id: string) => {
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const updateGoal = (id: string, updates: Partial<Goal>) => {
    setGoals(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
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