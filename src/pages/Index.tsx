import { useState } from 'react';
import { NAV_ITEMS, type PageId } from '@/lib/constants';
import Dashboard from '@/components/fina/Dashboard';
import ChatPage from '@/components/fina/ChatPage';
import TrackerPage from '@/components/fina/TrackerPage';
import DebtPage from '@/components/fina/DebtPage';
import GoalsPage from '@/components/fina/GoalsPage';

const PAGE_TITLES: Record<PageId, string> = {
  home: 'FINA',
  chat: 'AI Advisor',
  tracker: 'Tracker',
  debt: 'Debt Risk',
  goals: 'Goals',
};

const PAGE_ICONS: Record<PageId, string> = {
  home: '💚',
  chat: '✨',
  tracker: '📊',
  debt: '⚠️',
  goals: '🎯',
};

const Index = () => {
  const [page, setPage] = useState<PageId>('home');

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-[390px] h-[780px] bg-card rounded-[40px] flex flex-col overflow-hidden relative"
        style={{ boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 0 0 8px hsl(var(--border))' }}>

        {/* Status Bar */}
        <div className="bg-card px-6 pt-3 pb-2 flex justify-between items-center flex-shrink-0">
          <span className="text-[11px] font-bold text-foreground">9:41</span>
          <div className="w-[100px] h-[22px] bg-foreground rounded-[30px] mx-auto" />
          <div className="text-[11px] text-foreground flex gap-1">
            <span>●●●</span><span>WiFi</span><span>🔋</span>
          </div>
        </div>

        {/* Header */}
        <div className="px-5 pt-1 pb-3 flex justify-between items-center flex-shrink-0">
          <h1 className="text-xl font-extrabold text-foreground font-display tracking-tight">{PAGE_TITLES[page]}</h1>
          <div className="w-[38px] h-[38px] rounded-xl gradient-primary flex items-center justify-center text-base shadow-primary">
            {PAGE_ICONS[page]}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 pb-2">
          {page === 'home' && <Dashboard setPage={setPage} />}
          {page === 'chat' && <ChatPage />}
          {page === 'tracker' && <TrackerPage />}
          {page === 'debt' && <DebtPage />}
          {page === 'goals' && <GoalsPage />}
        </div>

        {/* Bottom Nav */}
        <div className="bg-card border-t border-border px-2 pt-2 pb-4 flex justify-around flex-shrink-0">
          {NAV_ITEMS.map(n => (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors ${
                page === n.id ? 'bg-accent' : 'hover:bg-accent/50'
              }`}
            >
              <span className="text-lg leading-none">{n.icon}</span>
              <span className={`text-[9px] tracking-wide ${
                page === n.id ? 'font-bold text-primary' : 'font-medium text-muted-foreground'
              }`}>
                {n.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;
