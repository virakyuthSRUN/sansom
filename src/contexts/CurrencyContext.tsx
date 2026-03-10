import { createContext, useContext, useState, ReactNode } from 'react';

export type CurrencyCode = 'MYR' | 'USD' | 'SGD' | 'IDR';

interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  label: string;
  rate: number; // rate relative to MYR (base)
}

export const CURRENCIES: CurrencyConfig[] = [
  { code: 'MYR', symbol: 'RM', label: 'Malaysian Ringgit', rate: 1 },
  { code: 'USD', symbol: '$', label: 'US Dollar', rate: 0.21 },
  { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar', rate: 0.29 },
  { code: 'IDR', symbol: 'Rp', label: 'Indonesian Rupiah', rate: 3400 },
];

interface CurrencyContextType {
  currency: CurrencyConfig;
  setCurrencyCode: (code: CurrencyCode) => void;
  format: (amountInRM: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [code, setCode] = useState<CurrencyCode>(() => {
    return (localStorage.getItem('fina-currency') as CurrencyCode) || 'MYR';
  });

  const currency = CURRENCIES.find(c => c.code === code) || CURRENCIES[0];

  const setCurrencyCode = (newCode: CurrencyCode) => {
    setCode(newCode);
    localStorage.setItem('fina-currency', newCode);
  };

  const format = (amountInRM: number) => {
    const converted = amountInRM * currency.rate;
    if (currency.code === 'IDR') {
      return `${currency.symbol} ${Math.round(converted).toLocaleString()}`;
    }
    return `${currency.symbol} ${converted.toFixed(2)}`;
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrencyCode, format }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
};
