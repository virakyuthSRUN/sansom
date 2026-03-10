import { useState } from 'react';
import { NAV_ITEMS, type PageId } from '@/lib/constants';
import Dashboard from '@/components/fina/Dashboard';
import ChatPage from '@/components/fina/ChatPage';
import TrackerPage from '@/components/fina/TrackerPage';
import DebtPage from '@/components/fina/DebtPage';
import GoalsPage from '@/components/fina/GoalsPage';
import SettingsPage from '@/components/fina/SettingsPage';
import DynamicIcon from '@/components/fina/DynamicIcon';
import { Heart, Sparkles, BarChart3, AlertTriangle, Target, Settings } from 'lucide-react';

const PAGE_TITLES: Record<PageId, string> = {
  home: 'FINA',
  chat: 'AI Advisor',
  tracker: 'Tracker',
  debt: 'Debt Risk',
  goals: 'Goals',
  settings: 'Settings',
};

const PAGE_HEADER_ICONS: Record<PageId, React.ReactNode> = {
  home: <Heart className="w-5 h-5 text-primary-foreground" />,
  chat: <Sparkles className="w-5 h-5 text-primary-foreground" />,
  tracker: <BarChart3 className="w-5 h-5 text-primary-foreground" />,
  debt: <AlertTriangle className="w-5 h-5 text-primary-foreground" />,
  goals: <Target className="w-5 h-5 text-primary-foreground" />,
  settings: <Settings className="w-5 h-5 text-primary-foreground" />,
};

const Index = () => {
  const [page, setPage] = useState<PageId>('home');

  return (
    <div className="flex min-h-screen bg-background">
      <div className="w-full max-w-lg mx-auto flex flex-col min-h-screen">
        {/* Header */}
        <div className="px-4 sm:px-6 pt-3 pb-3 flex justify-between items-center flex-shrink-0 bg-card/80 backdrop-blur-sm sticky top-0 z-10 border-b border-border">
          <h1 className="text-xl font-extrabold text-foreground font-display tracking-tight">{PAGE_TITLES[page]}</h1>
          <div className="w-[38px] h-[38px] rounded-xl gradient-primary flex items-center justify-center shadow-primary">
            {PAGE_HEADER_ICONS[page]}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {page === 'home' && <Dashboard setPage={setPage} />}
          {page === 'chat' && <ChatPage />}
          {page === 'tracker' && <TrackerPage />}
          {page === 'debt' && <DebtPage />}
          {page === 'goals' && <GoalsPage />}
          {page === 'settings' && <SettingsPage />}
        </div>

        {/* Bottom Nav */}
        <div className="bg-card/80 backdrop-blur-sm border-t border-border px-1 pt-2 pb-safe flex justify-around flex-shrink-0 sticky bottom-0 z-10"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}>
          {NAV_ITEMS.map(n => (
            <button
              key={n.id}
              onClick={() => setPage(n.id)}
              className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-colors ${
                page === n.id ? 'bg-accent' : 'hover:bg-accent/50'
              }`}
            >
              <DynamicIcon name={n.icon} className={`w-5 h-5 ${page === n.id ? 'text-primary' : 'text-muted-foreground'}`} />
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
