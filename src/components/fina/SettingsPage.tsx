import { useState } from 'react';
import { User, DollarSign, Bell, Shield, LogOut, ChevronRight, Check, Moon, Sun, Palette } from 'lucide-react';
import { useCurrency, CURRENCIES, type CurrencyCode } from '@/contexts/CurrencyContext';

const SettingsPage = () => {
  const { currency, setCurrencyCode } = useCurrency();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className="flex flex-col gap-3.5 animate-slide-up">
      <h1 className="text-lg font-bold text-foreground font-display">Settings</h1>

      {/* Profile Card */}
      <div className="bg-card rounded-2xl p-5 shadow-sm flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-primary">
          <User className="w-8 h-8 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <p className="text-[15px] font-bold text-foreground">Aisha Binti Ahmad</p>
          <p className="text-[12px] text-muted-foreground">aisha.ahmad@email.com</p>
          <p className="text-[11px] text-primary font-semibold mt-1">Free Plan</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground" />
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
              onClick={() => setCurrencyCode(c.code)}
              className={`flex items-center gap-2.5 p-3 rounded-xl border-[1.5px] transition-all text-left ${
                currency.code === c.code
                  ? 'border-primary bg-accent'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
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
      </div>

      {/* Preferences */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <p className="text-[13px] font-bold text-foreground mb-3.5">Preferences</p>

        {/* Notifications Toggle */}
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
              <Bell className="w-4.5 h-4.5 text-primary" />
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
              {darkMode ? <Moon className="w-4.5 h-4.5 text-primary" /> : <Sun className="w-4.5 h-4.5 text-primary" />}
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
              <Palette className="w-4.5 h-4.5 text-primary" />
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
        {[
          { icon: Shield, label: 'Privacy & Security', sub: 'Password, 2FA' },
          { icon: LogOut, label: 'Log Out', sub: 'Sign out of FINA', destructive: true },
        ].map((item, i) => (
          <div
            key={i}
            className={`flex items-center justify-between py-3 cursor-pointer ${
              i < 1 ? 'border-b border-border' : ''
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                item.destructive ? 'bg-destructive/10' : 'bg-accent'
              }`}>
                <item.icon className={`w-4.5 h-4.5 ${item.destructive ? 'text-destructive' : 'text-primary'}`} />
              </div>
              <div>
                <p className={`text-[13px] font-semibold ${item.destructive ? 'text-destructive' : 'text-foreground'}`}>{item.label}</p>
                <p className="text-[10px] text-muted-foreground">{item.sub}</p>
              </div>
            </div>
            <ChevronRight className={`w-4 h-4 ${item.destructive ? 'text-destructive' : 'text-muted-foreground'}`} />
          </div>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground text-center pb-4">FINA v1.0 · Made with care</p>
    </div>
  );
};

export default SettingsPage;
