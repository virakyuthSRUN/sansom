import { useState } from 'react';
import { User, DollarSign, Bell, Shield, LogOut, ChevronRight, Check, Moon, Sun, Palette } from 'lucide-react';
import { useCurrency, CURRENCIES, type CurrencyCode } from '@/contexts/CurrencyContext';
import { useTheme, type ThemeColor } from '@/contexts/ThemeContext';

const THEME_OPTIONS: { color: ThemeColor; label: string; hsl: string }[] = [
  { color: 'green', label: 'Green', hsl: 'hsl(162,100%,39%)' },
  { color: 'blue', label: 'Blue', hsl: 'hsl(217,91%,60%)' },
  { color: 'purple', label: 'Purple', hsl: 'hsl(280,80%,55%)' },
  { color: 'red', label: 'Red', hsl: 'hsl(0,72%,51%)' },
];

// Dummy user data
const DUMMY_USER = {
  name: 'User',
  email: 'user@gmail.com',
  phone: '+60 12-345 6789',
  plan: 'Free Plan',
  memberSince: 'March 2026',
  monthlyBudget: 900,
};

const SettingsPage = () => {
  const { currency, setCurrencyCode } = useCurrency();
  const { darkMode, toggleDarkMode, themeColor, setThemeColor } = useTheme();
  
  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);

  const handleCurrencyChange = async (code: CurrencyCode) => {
    setSaving(true);
    setCurrencyCode(code);
    // Simulate API call
    setTimeout(() => setSaving(false), 500);
  };

  // Format date
  const formatDate = (dateString?: string) => {
    return dateString || 'N/A';
  };

  return (
    <div className="flex flex-col gap-3.5 animate-slide-up">

      {/* Profile Card */}
      <div className="bg-card rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-primary">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-[15px] font-bold text-foreground">{DUMMY_USER.name}</p>
            <p className="text-[12px] text-muted-foreground">{DUMMY_USER.email}</p>
            <p className="text-[11px] text-primary font-semibold mt-1">{DUMMY_USER.plan}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-1">
          <div className="bg-muted rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground mb-0.5">Phone</p>
            <p className="text-[12px] font-semibold text-foreground">{DUMMY_USER.phone}</p>
          </div>
          <div className="bg-muted rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground mb-0.5">Member Since</p>
            <p className="text-[12px] font-semibold text-foreground">{DUMMY_USER.memberSince}</p>
          </div>
        </div>
      </div>

      {/* Currency Selection */}
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
              onClick={() => handleCurrencyChange(c.code as CurrencyCode)}
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
              {currency.code === c.code && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
            </button>
          ))}
        </div>
        {saving && (
          <p className="text-[10px] text-primary mt-2 text-center">Saving preference...</p>
        )}
      </div>

      {/* Budget Overview */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <p className="text-[13px] font-bold text-foreground mb-3.5">Budget Overview</p>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Monthly Budget</span>
          <span className="text-sm font-bold text-foreground">
            {currency.symbol}{DUMMY_USER.monthlyBudget.toFixed(2)}
          </span>
        </div>
        <div className="h-2 bg-border rounded-full overflow-hidden">
          <div 
            className="h-full rounded-full bg-primary transition-all duration-700"
            style={{ width: '68%' }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">
          $620 spent of $900 budget
        </p>
      </div>

      {/* Preferences */}
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
            className={`w-11 h-6 rounded-full transition-all relative ${notifications ? 'bg-primary' : 'bg-border'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${notifications ? 'left-[22px]' : 'left-0.5'}`} />
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
              <p className="text-[10px] text-muted-foreground">{darkMode ? 'On' : 'Off'}</p>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`w-11 h-6 rounded-full transition-all relative ${darkMode ? 'bg-primary' : 'bg-border'}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${darkMode ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>

        {/* Theme Color */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
              <Palette className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">Theme Color</p>
              <p className="text-[10px] text-muted-foreground capitalize">{themeColor}</p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {THEME_OPTIONS.map(t => (
              <button
                key={t.color}
                onClick={() => setThemeColor(t.color)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${themeColor === t.color ? 'border-foreground scale-110' : 'border-transparent'}`}
                style={{ background: t.hsl }}
                title={t.label}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <p className="text-[13px] font-bold text-foreground mb-3.5">Account</p>
        
        {/* Privacy & Security */}
        <div className="flex items-center justify-between py-3 border-b border-border cursor-pointer hover:bg-accent/50 transition-colors">
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
        <div className="flex items-center justify-between py-3 cursor-pointer hover:bg-destructive/5 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
              <LogOut className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-destructive">Log Out</p>
              <p className="text-[10px] text-muted-foreground">Sign out of SANSOM</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-destructive" />
        </div>
      </div>

      {/* Session Info */}
      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
        <p className="text-[10px] text-muted-foreground text-center">
          Signed in as <span className="text-foreground font-medium">{DUMMY_USER.email}</span>
        </p>
        <p className="text-[9px] text-muted-foreground text-center mt-1">
          User ID: user123
        </p>
      </div>

      <p className="text-[10px] text-muted-foreground text-center pb-4">
        SANSOM v1.0 · Smart AI Money Companion
      </p>
    </div>
  );
};

export default SettingsPage;