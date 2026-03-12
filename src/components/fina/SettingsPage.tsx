import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, DollarSign, Bell, Shield, LogOut, ChevronRight, Check, Moon, Sun, Palette } from 'lucide-react';
import { useCurrency, CURRENCIES, type CurrencyCode } from '@/contexts/CurrencyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/contexts/UserProfileContext';

const SettingsPage = () => {
  const { currency, setCurrencyCode } = useCurrency();
  const { user, signOut } = useAuth();
  const { profile, loading, updateProfile } = useUserProfile();
  const navigate = useNavigate();
  
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleCurrencyChange = async (code: CurrencyCode) => {
    setCurrencyCode(code);
    
    // Save to user profile in Supabase
    setSaving(true);
    await updateProfile({ currency: code });
    setSaving(false);
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-3.5 animate-slide-up">
        <h1 className="text-lg font-bold text-foreground font-display">Settings</h1>
        <div className="bg-card rounded-2xl p-8 shadow-sm flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5 animate-slide-up">
      <h1 className="text-lg font-bold text-foreground font-display">Settings</h1>

      {/* Profile Card - Now with REAL user data */}
      <div 
        onClick={() => navigate('/profile')}
        className="bg-card rounded-2xl p-5 shadow-sm flex items-center gap-4 cursor-pointer hover:bg-accent/50 transition-colors"
      >
        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-primary">
          <User className="w-8 h-8 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-[15px] font-bold text-foreground">
            {profile?.full_name || user?.user_metadata?.full_name || 'User'}
          </p>
          <p className="text-[12px] text-muted-foreground">
            {profile?.email || user?.email}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] text-primary font-semibold">Free Plan</span>
            <span className="text-[9px] text-muted-foreground">
              Joined {formatDate(profile?.created_at)}
            </span>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
      </div>

      {/* Currency Selection - Now saves to Supabase */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <div className="flex items-center gap-2.5 mb-3.5">
          <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-foreground">Currency</p>
            <p className="text-[11px] text-muted-foreground">Choose your preferred currency</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {CURRENCIES.map(c => (
            <button
              key={c.code}
              onClick={() => handleCurrencyChange(c.code)}
              disabled={saving}
              className={`flex items-center gap-2.5 p-3 rounded-xl border-[1.5px] transition-all text-left ${
                currency.code === c.code
                  ? 'border-primary bg-accent'
                  : 'border-border bg-card hover:border-primary/50'
              } ${saving ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex-1">
                <p className={`text-[13px] font-bold ${currency.code === c.code ? 'text-primary' : 'text-foreground'}`}>
                  {c.symbol} ({c.code})
                </p>
                <p className="text-[10px] text-muted-foreground">{c.label}</p>
              </div>
              {currency.code === c.code && (
                <Check className="w-4 h-4 text-primary flex-shrink-0" />
              )}
            </button>
          ))}
        </div>
        {saving && (
          <p className="text-[10px] text-primary mt-2 text-center">Saving preference...</p>
        )}
      </div>

      {/* Budget Overview - NEW SECTION with real data */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <p className="text-[13px] font-bold text-foreground mb-3.5">Budget Overview</p>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Monthly Budget</span>
          <span className="text-sm font-bold text-foreground">
            {currency.symbol}{profile?.monthly_budget?.toFixed(2) || '900.00'}
          </span>
        </div>
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: '45%' }} // This would come from actual spending data
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          Based on your spending patterns
        </p>
        <button
          onClick={() => navigate('/profile')}
          className="w-full mt-3 text-xs text-primary font-semibold py-2 hover:underline"
        >
          Adjust Budget →
        </button>
      </div>

      {/* Preferences - Keep as is */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <p className="text-[13px] font-bold text-foreground mb-3.5">Preferences</p>

        {/* Notifications Toggle */}
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Notifications</p>
              <p className="text-[10px] text-muted-foreground">Budget alerts & tips</p>
            </div>
          </div>
          <button
            onClick={() => setNotifications(!notifications)}
            className={`w-11 h-6 rounded-full transition-all relative ${
              notifications ? 'bg-primary' : 'bg-border'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${
              notifications ? 'left-[22px]' : 'left-0.5'
            }`} />
          </button>
        </div>

        {/* Dark Mode Toggle */}
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
              {darkMode ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-primary" />}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Dark Mode</p>
              <p className="text-[10px] text-muted-foreground">Coming soon</p>
            </div>
          </div>
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`w-11 h-6 rounded-full transition-all relative ${
              darkMode ? 'bg-primary' : 'bg-border'
            }`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${
              darkMode ? 'left-[22px]' : 'left-0.5'
            }`} />
          </button>
        </div>

        {/* Theme */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
              <Palette className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Theme Color</p>
              <p className="text-[10px] text-muted-foreground">Default green</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {['hsl(162,100%,39%)', 'hsl(217,91%,60%)', 'hsl(280,80%,55%)', 'hsl(0,72%,51%)'].map((color, i) => (
              <div
                key={i}
                className={`w-6 h-6 rounded-full border-2 ${i === 0 ? 'border-foreground' : 'border-transparent'}`}
                style={{ background: color }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Security & Account */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <p className="text-[13px] font-bold text-foreground mb-3.5">Account</p>
        
        {/* Privacy & Security */}
        <div
          onClick={() => navigate('/profile')}
          className="flex items-center justify-between py-3 border-b border-border cursor-pointer hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Privacy & Security</p>
              <p className="text-[10px] text-muted-foreground">Manage your account</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>

        {/* Log Out */}
        <div
          onClick={handleSignOut}
          className="flex items-center justify-between py-3 cursor-pointer hover:bg-destructive/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
              <LogOut className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-destructive">Log Out</p>
              <p className="text-[10px] text-muted-foreground">Sign out of SAMSOM</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-destructive" />
        </div>
      </div>

      {/* Session Info */}
      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
        <p className="text-[10px] text-muted-foreground text-center">
          Signed in as <span className="text-foreground font-medium">{user?.email}</span>
        </p>
        <p className="text-[9px] text-muted-foreground text-center mt-1">
          User ID: {user?.id?.substring(0, 8)}...
        </p>
      </div>

      <p className="text-[10px] text-muted-foreground text-center pb-4">
        SAMSOM v1.0 · Smart AI Money Companion
      </p>
    </div>
  );
};

export default SettingsPage;