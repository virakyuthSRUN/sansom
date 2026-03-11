import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { type PageId, NAV_ITEMS } from '@/lib/constants';
import Dashboard from '@/components/fina/Dashboard';
import ChatPage from '@/components/fina/ChatPage';
import TrackerPage from '@/components/fina/TrackerPage';
import DebtGoalsPage from '@/components/fina/DebtGoalsPage';
import SettingsPage from '@/components/fina/SettingsPage';
import { Home, Sparkles, BarChart3, Shield, Settings, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NAV_ICONS: Record<PageId, React.ElementType> = {
  home: Home,
  chat: Sparkles,
  tracker: BarChart3,
  debtgoals: Shield,
  settings: Settings,
};

const PAGE_TITLES: Record<PageId, string> = {
  home: 'SAMSOM',
  chat: 'AI Advisor',
  tracker: 'Tracker',
  debtgoals: 'Debt & Goals',
  settings: 'Settings',
};

const Index = () => {
  const [page, setPage] = useState<PageId>('home');
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Get user display name
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <div className="flex min-h-screen bg-background">
      <div className="w-full max-w-2xl mx-auto flex flex-col min-h-screen lg:max-w-4xl xl:max-w-5xl">
        {/* Header with User Info */}
        <div className="px-4 sm:px-6 pt-3 pb-3 flex justify-between items-center flex-shrink-0 bg-card/80 backdrop-blur-sm sticky top-0 z-10 border-b border-border">
          <h1 className="text-xl font-extrabold text-foreground font-display tracking-tight">
            {PAGE_TITLES[page]}
          </h1>
          
          <div className="flex items-center gap-3">
            {/* User Info (hidden on mobile) */}
            <div className="hidden sm:flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                <User className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs text-muted-foreground max-w-[120px] truncate">
                {displayName}
              </span>
            </div>

            {/* Sign Out Button */}
            <button
              onClick={handleSignOut}
              className="w-[38px] h-[38px] rounded-xl bg-accent flex items-center justify-center hover:bg-accent/80 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 text-primary" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {page === 'home' && <Dashboard setPage={setPage} />}
          {page === 'chat' && <ChatPage />}
          {page === 'tracker' && <TrackerPage />}
          {page === 'debtgoals' && <DebtGoalsPage />}
          {page === 'settings' && <SettingsPage />}
        </div>

        {/* Bottom Nav */}
        <div className="bg-card/80 backdrop-blur-sm border-t border-border px-1 pt-1 pb-safe flex justify-around items-end flex-shrink-0 sticky bottom-0 z-10"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}>
          {NAV_ITEMS.map(n => {
            const Icon = NAV_ICONS[n.id];
            const isCenter = n.id === 'chat';
            const isActive = page === n.id;

            if (isCenter) {
              return (
                <button
                  key={n.id}
                  onClick={() => setPage(n.id)}
                  className="flex flex-col items-center gap-0.5 -mt-5"
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                    isActive
                      ? 'gradient-primary shadow-primary'
                      : 'bg-primary/90 shadow-primary/50 hover:bg-primary'
                  }`}>
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <span className={`text-[9px] tracking-wide ${
                    isActive ? 'font-bold text-primary' : 'font-medium text-muted-foreground'
                  }`}>
                    {n.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={n.id}
                onClick={() => setPage(n.id)}
                className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-colors ${
                  isActive ? 'bg-accent' : 'hover:bg-accent/50'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-[9px] tracking-wide ${
                  isActive ? 'font-bold text-primary' : 'font-medium text-muted-foreground'
                }`}>
                  {n.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Index;