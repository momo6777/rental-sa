import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { getCompanySettings, clearSettingsCache, CompanySettings } from './companySettings';
import { getCountryConfig, CountryConfig, formatCurrency as fmtCurrency, CurrencyCode } from './countryConfig';

export interface SettingsContextValue {
  settings: CompanySettings;
  countryConfig: CountryConfig;
  formatCurrency: (amount: number) => string;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const s = await getCompanySettings();
    setSettings(s);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const countryConfig = settings ? getCountryConfig(settings.country) : getCountryConfig('SA');

  const formatCurrency = useCallback(
    (amount: number) => fmtCurrency(amount, (settings?.currency || 'SAR') as CurrencyCode),
    [settings?.currency]
  );

  const refreshSettings = useCallback(async () => {
    clearSettingsCache();
    await load();
  }, [load]);

  if (loading || !settings) {
    return null;
  }

  return (
    <SettingsContext.Provider value={{ settings, countryConfig, formatCurrency, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
