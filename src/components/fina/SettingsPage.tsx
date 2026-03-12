import { User, DollarSign, Bell, Shield, LogOut, ChevronRight, Check, Moon, Sun, Palette, Camera, X, Save } from 'lucide-react';
import { useCurrency, CURRENCIES } from '@/contexts/CurrencyContext';
import { useTheme, type ThemeColor } from '@/contexts/ThemeContext';
import { useState } from 'react';

const THEME_OPTIONS: { color: ThemeColor; label: string; hsl: string }[] = [
  { color: 'green', label: 'Green', hsl: 'hsl(162,100%,39%)' },
  { color: 'blue', label: 'Blue', hsl: 'hsl(217,91%,60%)' },
  { color: 'purple', label: 'Purple', hsl: 'hsl(280,80%,55%)' },
  { color: 'red', label: 'Red', hsl: 'hsl(0,72%,51%)' },
];

interface Profile {
  name: string;
  email: string;
  phone: string;
  plan: string;
}

const SettingsPage = () => {
  const { currency, setCurrencyCode } = useCurrency();
  const { darkMode, toggleDarkMode, themeColor, setThemeColor } = useTheme();
  const [notifications, setNotifications] = useState(true);

  const [profile, setProfile] = useState<Profile>(() => {
    const stored = localStorage.getItem('samsom-profile');
    return stored ? JSON.parse(stored) : { name: 'Hieng Dara', email: 'dara@samsom.app', phone: '+60 12-345 6789', plan: 'Free Plan' };
  });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Profile>(profile);

  const saveProfile = () => {
    setProfile(draft);
    localStorage.setItem('samsom-profile', JSON.stringify(draft));
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraft(profile);
    setEditing(false);
  };

  return (
    <div className="flex flex-col gap-3.5 animate-slide-up">
      <h1 className="text-lg font-bold text-foreground font-display">Settings</h1>

      {/* Profile Card - Editable */}
      <div className="bg-card rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-primary">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
            {editing && (
              <button className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md">
                <Camera className="w-3 h-3 text-primary-foreground" />
              </button>
            )}
          </div>
          <div className="flex-1">
            {!editing ? (
              <>
                <p className="text-[15px] font-bold text-foreground">{profile.name}</p>
                <p className="text-[12px] text-muted-foreground">{profile.email}</p>
                <p className="text-[11px] text-primary font-semibold mt-1">{profile.plan}</p>
              </>
            ) : (
              <p className="text-[13px] font-bold text-foreground">Edit Profile</p>
            )}
          </div>
          {!editing ? (
            <button
              onClick={() => { setDraft(profile); setEditing(true); }}
              className="text-[12px] font-semibold text-primary bg-accent px-3 py-1.5 rounded-lg hover:bg-accent/80 transition-colors"
            >
              Edit
            </button>
          ) : (
            <div className="flex gap-1.5">
              <button onClick={cancelEdit} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
              <button onClick={saveProfile} className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors">
                <Save className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
          )}
        </div>

        {editing && (
          <div className="flex flex-col gap-2.5 animate-slide-up">
            {[
              { label: 'Full Name', key: 'name' as const, placeholder: 'Your name' },
              { label: 'Email', key: 'email' as const, placeholder: 'your@email.com' },
              { label: 'Phone', key: 'phone' as const, placeholder: '+60 12-345 6789' },
            ].map(field => (
              <div key={field.key}>
                <p className="text-[10px] text-muted-foreground mb-1 font-semibold">{field.label}</p>
                <input
                  className="w-full px-3 py-2.5 rounded-xl border-[1.5px] border-border text-[13px] text-foreground outline-none focus:border-primary transition-colors bg-background"
                  placeholder={field.placeholder}
                  value={draft[field.key]}
                  onChange={e => setDraft(p => ({ ...p, [field.key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        )}

        {!editing && (
          <div className="grid grid-cols-2 gap-3 mt-1">
            <div className="bg-muted rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground mb-0.5">Phone</p>
              <p className="text-[12px] font-semibold text-foreground">{profile.phone}</p>
            </div>
            <div className="bg-muted rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground mb-0.5">Plan</p>
              <p className="text-[12px] font-semibold text-primary">{profile.plan}</p>
            </div>
          </div>
        )}
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
              {currency.code === c.code && <Check className="w-4 h-4 text-primary flex-shrink-0" />}
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
              />
            ))}
          </div>
        </div>
      </div>

      {/* Account */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <p className="text-[13px] font-bold text-foreground mb-3.5">Account</p>
        {[
          { icon: Shield, label: 'Privacy & Security', sub: 'Password, 2FA' },
          { icon: LogOut, label: 'Log Out', sub: 'Sign out of SAMSOM', destructive: true },
        ].map((item, i) => (
          <div key={i} className={`flex items-center justify-between py-3 cursor-pointer ${i < 1 ? 'border-b border-border' : ''}`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.destructive ? 'bg-destructive/10' : 'bg-accent'}`}>
                <item.icon className={`w-4 h-4 ${item.destructive ? 'text-destructive' : 'text-primary'}`} />
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

      <p className="text-[10px] text-muted-foreground text-center pb-4">SAMSOM v1.0 · Smart AI Money Companion</p>
    </div>
  );
};

export default SettingsPage;
