import { useState } from 'react';
import { type PageId, NAV_ITEMS } from '@/lib/constants';
import Dashboard from '@/components/fina/Dashboard';
import ChatPage from '@/components/fina/ChatPage';
import TrackerPage from '@/components/fina/TrackerPage';
import DebtGoalsPage from '@/components/fina/DebtGoalsPage';
import SettingsPage from '@/components/fina/SettingsPage';
import { Home, Sparkles, BarChart3, Shield, Settings } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

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
  const isMobile = useIsMobile();

  const renderPage = () => {
    switch (page) {
      case 'home': return <Dashboard setPage={setPage} />;
      case 'chat': return <ChatPage />;
      case 'tracker': return <TrackerPage />;
      case 'debtgoals': return <DebtGoalsPage />;
      case 'settings': return <SettingsPage />;
    }
  };

  // Desktop: sidebar on left
  if (!isMobile) {
    return (
      <div className="flex min-h-screen bg-background">
        {/* Sidebar */}
        <aside className="w-[220px] bg-card border-r border-border flex flex-col py-6 px-3 flex-shrink-0 sticky top-0 h-screen">
          <div className="flex items-center gap-2.5 px-3 mb-8">
            <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-primary">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-extrabold text-foreground font-display tracking-tight">SAMSOM</span>
          </div>

          <nav className="flex flex-col gap-1 flex-1">
            {NAV_ITEMS.map(n => {
              const Icon = NAV_ICONS[n.id];
              const isActive = page === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => setPage(n.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all text-left ${
                    isActive
                      ? 'bg-accent text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                  {n.label}
                </button>
              );
            })}
          </nav>

          <p className="text-[10px] text-muted-foreground text-center mt-auto">SAMSOM v1.0</p>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-screen">
          <div className="px-6 pt-4 pb-3 flex justify-between items-center flex-shrink-0 bg-card/80 backdrop-blur-sm sticky top-0 z-10 border-b border-border">
            <h1 className="text-xl font-extrabold text-foreground font-display tracking-tight">{PAGE_TITLES[page]}</h1>
            <div className="w-[38px] h-[38px] rounded-xl gradient-primary flex items-center justify-center shadow-primary">
              {(() => { const Icon = NAV_ICONS[page]; return <Icon className="w-5 h-5 text-primary-foreground" />; })()}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-4 max-w-4xl mx-auto w-full">
            {renderPage()}
          </div>
        </div>
      </div>
    );
  }

  // Mobile/Tablet: bottom nav
  return (
    <div className="flex min-h-screen bg-background">
      <div className="w-full max-w-2xl mx-auto flex flex-col min-h-screen">
        {/* Header */}
        <div className="px-4 sm:px-6 pt-3 pb-3 flex justify-between items-center flex-shrink-0 bg-card/80 backdrop-blur-sm sticky top-0 z-10 border-b border-border">
          <h1 className="text-xl font-extrabold text-foreground font-display tracking-tight">{PAGE_TITLES[page]}</h1>
          <div className="w-[38px] h-[38px] rounded-xl gradient-primary flex items-center justify-center shadow-primary">
            {(() => { const Icon = NAV_ICONS[page]; return <Icon className="w-5 h-5 text-primary-foreground" />; })()}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {renderPage()}
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
                <button key={n.id} onClick={() => setPage(n.id)} className="flex flex-col items-center gap-0.5 -mt-5">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
                    isActive ? 'gradient-primary shadow-primary' : 'bg-primary/90 shadow-primary/50 hover:bg-primary'
                  }`}>
                    <Icon className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <span className={`text-[9px] tracking-wide ${isActive ? 'font-bold text-primary' : 'font-medium text-muted-foreground'}`}>
                    {n.label}
                  </span>
                </button>
              );
            }

            return (
              <button
                key={n.id}
                onClick={() => setPage(n.id)}
                className={`flex flex-col items-center gap-0.5 px-2 py-2 rounded-xl transition-colors ${isActive ? 'bg-accent' : 'hover:bg-accent/50'}`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-[9px] tracking-wide ${isActive ? 'font-bold text-primary' : 'font-medium text-muted-foreground'}`}>
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
