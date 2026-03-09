export const EXPENSES = [
  { id: 1, cat: 'Food', icon: 'UtensilsCrossed', name: 'Grab Food', amount: 24.5, date: 'Today', color: '#ff6b35' },
  { id: 2, cat: 'Transport', icon: 'Car', name: 'Grab Car', amount: 12.0, date: 'Today', color: '#3b82f6' },
  { id: 3, cat: 'Shopping', icon: 'ShoppingBag', name: 'Shopee', amount: 89.9, date: 'Yesterday', color: '#f97316' },
  { id: 4, cat: 'Food', icon: 'Coffee', name: 'Starbucks', amount: 18.0, date: 'Yesterday', color: '#ff6b35' },
  { id: 5, cat: 'BNPL', icon: 'CreditCard', name: 'Atome Payment', amount: 150.0, date: 'Mon', color: '#ff4757' },
  { id: 6, cat: 'Entertainment', icon: 'Gamepad2', name: 'Steam', amount: 45.0, date: 'Sun', color: '#8b5cf6' },
];

export const GOALS = [
  { id: 1, name: 'New Laptop', icon: 'Laptop', target: 3500, saved: 1200, color: '#3b82f6', deadline: 'Aug 2026' },
  { id: 2, name: 'Trip to Bali', icon: 'Plane', target: 2000, saved: 650, color: '#f97316', deadline: 'Dec 2026' },
  { id: 3, name: 'Emergency Fund', icon: 'ShieldCheck', target: 1000, saved: 800, color: '#00c896', deadline: 'Jun 2026' },
];

export type PageId = 'home' | 'chat' | 'tracker' | 'debt' | 'goals';

export const NAV_ITEMS: { id: PageId; icon: string; label: string }[] = [
  { id: 'home', icon: 'Home', label: 'Home' },
  { id: 'chat', icon: 'Sparkles', label: 'AI Chat' },
  { id: 'tracker', icon: 'BarChart3', label: 'Tracker' },
  { id: 'debt', icon: 'AlertTriangle', label: 'Debt Risk' },
  { id: 'goals', icon: 'Target', label: 'Goals' },
];
