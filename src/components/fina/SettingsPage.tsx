import { useState } from "react";
import {
  User,
  DollarSign,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Check,
  Moon,
  Sun,
  Palette,
} from "lucide-react";
import {
  useCurrency,
  CURRENCIES,
  type CurrencyCode,
} from "@/contexts/CurrencyContext";
import { useTheme, type ThemeColor } from "@/contexts/ThemeContext";
import { useFinancialData } from "@/contexts/FinancialDataContext";
import { useUserProfile } from "@/contexts/UserProfileContext";

const THEME_OPTIONS: { color: ThemeColor; label: string; hsl: string }[] = [
  { color: "green", label: "Green", hsl: "hsl(162,100%,39%)" },
  { color: "blue", label: "Blue", hsl: "hsl(217,91%,60%)" },
  { color: "purple", label: "Purple", hsl: "hsl(280,80%,55%)" },
  { color: "red", label: "Red", hsl: "hsl(0,72%,51%)" },
];

const SettingsPage = () => {
  const { currency, setCurrencyCode, format } = useCurrency();
  const { darkMode, toggleDarkMode, themeColor, setThemeColor } = useTheme();
  const { data: financialData } = useFinancialData();
  const { profile } = useUserProfile();

  const [notifications, setNotifications] = useState(true);
  const [saving, setSaving] = useState(false);

  // No hardcoded fallback for budget — 0 means unset
  const userData = {
    name: profile?.full_name || "User",
    email: profile?.email || "user@gmail.com",
    phone: profile?.phone || "+60 12-345 6789",
    plan: "Free Plan",
    memberSince: profile?.created_at
      ? new Date(profile.created_at).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })
      : "March 2026",
    monthlyBudget: profile?.monthly_budget ?? 0,
  };

  const handleCurrencyChange = async (code: CurrencyCode) => {
    setSaving(true);
    setCurrencyCode(code);
    setTimeout(() => setSaving(false), 500);
  };

  const monthlySpent = financialData?.monthlySpent || 0;
  const monthlyBudget = userData.monthlyBudget;
  const hasBudget = monthlyBudget > 0;

  // Use totalBalance (starting + income) as denominator when no budget set
  const totalBalance = financialData?.balance || 0;
  const totalIncome = financialData?.moneyIn || 0;
  const referenceAmount = hasBudget
    ? monthlyBudget
    : totalBalance > 0
      ? totalBalance
      : totalIncome;

  const spentPercentage =
    referenceAmount > 0
      ? Math.min(Math.round((monthlySpent / referenceAmount) * 100), 100)
      : 0;

  const remaining = hasBudget
    ? Math.max(0, monthlyBudget - monthlySpent)
    : Math.max(0, referenceAmount - monthlySpent);

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
            <p className="text-[15px] font-bold text-foreground">
              {userData.name}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {userData.email}
            </p>
            <p className="text-[11px] text-primary font-semibold mt-1">
              {userData.plan}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-1">
          <div className="bg-muted rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground mb-0.5">Phone</p>
            <p className="text-[12px] font-semibold text-foreground">
              {userData.phone}
            </p>
          </div>
          <div className="bg-muted rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground mb-0.5">
              Member Since
            </p>
            <p className="text-[12px] font-semibold text-foreground">
              {userData.memberSince}
            </p>
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
            <p className="text-[11px] text-muted-foreground">
              Choose your preferred currency
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => handleCurrencyChange(c.code as CurrencyCode)}
              disabled={saving}
              className={`flex items-center gap-2.5 p-3 rounded-xl border-[1.5px] transition-all text-left ${
                currency.code === c.code
                  ? "border-primary bg-accent"
                  : "border-border bg-card hover:border-primary/50"
              } ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex-1">
                <p
                  className={`text-[13px] font-bold ${currency.code === c.code ? "text-primary" : "text-foreground"}`}
                >
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
          <p className="text-[10px] text-primary mt-2 text-center">
            Saving preference...
          </p>
        )}
      </div>

      {/* Budget / Balance Overview */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <p className="text-[13px] font-bold text-foreground mb-3.5">
          {hasBudget ? "Budget Overview" : "Balance Overview"}
        </p>

        {hasBudget ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                Monthly Budget
              </span>
              <span className="text-sm font-bold text-foreground">
                {format(monthlyBudget)}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                Spent this month
              </span>
              <span className="text-sm font-semibold text-foreground">
                {format(monthlySpent)}
              </span>
            </div>
            <div className="h-1.5 bg-border rounded-full overflow-hidden mb-1.5">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  spentPercentage >= 100
                    ? "bg-destructive"
                    : spentPercentage >= 80
                      ? "bg-warning"
                      : "bg-primary"
                }`}
                style={{ width: `${spentPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-muted-foreground">
                Used: {spentPercentage}%
              </span>
              <span className="text-muted-foreground">
                Remaining: {format(remaining)}
              </span>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                Current Balance
              </span>
              <span className="text-sm font-bold text-foreground">
                {format(totalBalance)}
              </span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                Spent this month
              </span>
              <span className="text-sm font-semibold text-foreground">
                {format(monthlySpent)}
              </span>
            </div>
            {referenceAmount > 0 && (
              <>
                <div className="h-1.5 bg-border rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-700"
                    style={{ width: `${spentPercentage}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-muted-foreground">
                    {spentPercentage}% of balance spent
                  </span>
                  <span className="text-muted-foreground">
                    Remaining: {format(remaining)}
                  </span>
                </div>
              </>
            )}
            <p className="text-[10px] text-muted-foreground mt-2">
              Set a monthly budget in your profile to track spending goals.
            </p>
          </>
        )}
      </div>

      {/* Preferences */}
      <div className="bg-card rounded-2xl p-4 shadow-sm">
        <p className="text-[13px] font-bold text-foreground mb-3.5">
          Preferences
        </p>

        {/* Notifications Toggle */}
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">
                Notifications
              </p>
              <p className="text-[10px] text-muted-foreground">
                Budget alerts & tips
              </p>
            </div>
          </div>
          <button
            onClick={() => setNotifications(!notifications)}
            className={`w-11 h-6 rounded-full transition-all relative ${notifications ? "bg-primary" : "bg-border"}`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${notifications ? "left-[22px]" : "left-0.5"}`}
            />
          </button>
        </div>

        {/* Dark Mode Toggle */}
        <div className="flex items-center justify-between py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
              {darkMode ? (
                <Moon className="w-4 h-4 text-primary" />
              ) : (
                <Sun className="w-4 h-4 text-primary" />
              )}
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">
                Dark Mode
              </p>
              <p className="text-[10px] text-muted-foreground">
                {darkMode ? "On" : "Off"}
              </p>
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className={`w-11 h-6 rounded-full transition-all relative ${darkMode ? "bg-primary" : "bg-border"}`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-sm absolute top-0.5 transition-all ${darkMode ? "left-[22px]" : "left-0.5"}`}
            />
          </button>
        </div>

        {/* Theme Color */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
              <Palette className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">
                Theme Color
              </p>
              <p className="text-[10px] text-muted-foreground capitalize">
                {themeColor}
              </p>
            </div>
          </div>
          <div className="flex gap-1.5">
            {THEME_OPTIONS.map((t) => (
              <button
                key={t.color}
                onClick={() => setThemeColor(t.color)}
                className={`w-6 h-6 rounded-full border-2 transition-all ${themeColor === t.color ? "border-foreground scale-110" : "border-transparent"}`}
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

        <div className="flex items-center justify-between py-3 border-b border-border cursor-pointer hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-foreground">
                Privacy & Security
              </p>
              <p className="text-[10px] text-muted-foreground">
                Manage your account
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </div>

        <div className="flex items-center justify-between py-3 cursor-pointer hover:bg-destructive/5 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
              <LogOut className="w-4 h-4 text-destructive" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-destructive">
                Log Out
              </p>
              <p className="text-[10px] text-muted-foreground">
                Sign out of SAMSOM
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-destructive" />
        </div>
      </div>

      {/* Session Info */}
      <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
        <p className="text-[10px] text-muted-foreground text-center">
          Signed in as{" "}
          <span className="text-foreground font-medium">{userData.email}</span>
        </p>
        <p className="text-[9px] text-muted-foreground text-center mt-1">
          User ID: {profile?.id || "user123"}
        </p>
      </div>

      <p className="text-[10px] text-muted-foreground text-center pb-4">
        SAMSOM v1.0 · Smart AI Money Companion
      </p>
    </div>
  );
};

export default SettingsPage;