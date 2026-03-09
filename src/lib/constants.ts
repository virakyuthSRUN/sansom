export const EXPENSES = [
  { id: 1, cat: 'Food', icon: '🍜', name: 'Grab Food', amount: 24.5, date: 'Today', color: '#ff6b35' },
  { id: 2, cat: 'Transport', icon: '🚗', name: 'Grab Car', amount: 12.0, date: 'Today', color: '#3b82f6' },
  { id: 3, cat: 'Shopping', icon: '🛍️', name: 'Shopee', amount: 89.9, date: 'Yesterday', color: '#f97316' },
  { id: 4, cat: 'Food', icon: '☕', name: 'Starbucks', amount: 18.0, date: 'Yesterday', color: '#ff6b35' },
  { id: 5, cat: 'BNPL', icon: '💳', name: 'Atome Payment', amount: 150.0, date: 'Mon', color: '#ff4757' },
  { id: 6, cat: 'Entertainment', icon: '🎮', name: 'Steam', amount: 45.0, date: 'Sun', color: '#8b5cf6' },
];

export const GOALS = [
  { id: 1, name: 'New Laptop', icon: '💻', target: 3500, saved: 1200, color: '#3b82f6', deadline: 'Aug 2026' },
  { id: 2, name: 'Trip to Bali', icon: '✈️', target: 2000, saved: 650, color: '#f97316', deadline: 'Dec 2026' },
  { id: 3, name: 'Emergency Fund', icon: '🛡️', target: 1000, saved: 800, color: '#00c896', deadline: 'Jun 2026' },
];

export type PageId = 'home' | 'chat' | 'tracker' | 'debt' | 'goals';

export const NAV_ITEMS: { id: PageId; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: 'Home' },
  { id: 'chat', icon: '✨', label: 'AI Chat' },
  { id: 'tracker', icon: '📊', label: 'Tracker' },
  { id: 'debt', icon: '⚠️', label: 'Debt Risk' },
  { id: 'goals', icon: '🎯', label: 'Goals' },
];
