import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeColor = 'green' | 'blue' | 'purple' | 'red';

interface ThemeContextType {
  darkMode: boolean;
  toggleDarkMode: () => void;
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_COLORS: Record<ThemeColor, { primary: string; primaryDark: string; accent: string; accentFg: string; ring: string; success: string; successLight: string }> = {
  green: {
    primary: '162 100% 39%',
    primaryDark: '162 100% 33%',
    accent: '162 80% 95%',
    accentFg: '162 100% 33%',
    ring: '162 100% 39%',
    success: '162 100% 39%',
    successLight: '162 80% 95%',
  },
  blue: {
    primary: '217 91% 60%',
    primaryDark: '217 91% 50%',
    accent: '217 100% 96%',
    accentFg: '217 91% 50%',
    ring: '217 91% 60%',
    success: '217 91% 60%',
    successLight: '217 100% 96%',
  },
  purple: {
    primary: '280 80% 55%',
    primaryDark: '280 80% 45%',
    accent: '280 80% 96%',
    accentFg: '280 80% 45%',
    ring: '280 80% 55%',
    success: '280 80% 55%',
    successLight: '280 80% 96%',
  },
  red: {
    primary: '0 72% 51%',
    primaryDark: '0 72% 41%',
    accent: '0 72% 96%',
    accentFg: '0 72% 41%',
    ring: '0 72% 51%',
    success: '0 72% 51%',
    successLight: '0 72% 96%',
  },
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('sansom-dark') === 'true');
  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => (localStorage.getItem('sansom-theme') as ThemeColor) || 'green');

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('sansom-dark', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const root = document.documentElement;
    const colors = THEME_COLORS[themeColor];
    root.style.setProperty('--primary', colors.primary);
    root.style.setProperty('--primary-dark', colors.primaryDark);
    root.style.setProperty('--accent', colors.accent);
    root.style.setProperty('--accent-foreground', colors.accentFg);
    root.style.setProperty('--ring', colors.ring);
    root.style.setProperty('--success', colors.success);
    root.style.setProperty('--success-light', colors.successLight);
    localStorage.setItem('sansom-theme', themeColor);

    // Update gradient
    const h = colors.primary.split(' ')[0];
    root.style.setProperty('--gradient-primary', `linear-gradient(135deg, hsl(${colors.primary}), hsl(${parseInt(h) + 24}, 100%, 33%))`);
  }, [themeColor]);

  const toggleDarkMode = () => setDarkMode(p => !p);
  const setThemeColor = (c: ThemeColor) => setThemeColorState(c);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, themeColor, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};
