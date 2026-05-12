export type CountryCode = 'SA' | 'EG';
export type CurrencyCode = 'SAR' | 'EGP';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  nameAr: string;
  nameArUnit: string;
  nameArSubunit: string;
}

export interface CountryConfig {
  code: CountryCode;
  nameAr: string;
  currency: CurrencyInfo;
  vatRate: number;
  taxAuthorityAr: string;
  paymentMethods: { value: string; label: string }[];
  locale: string;
}

export const COUNTRY_CONFIGS: Record<CountryCode, CountryConfig> = {
  SA: {
    code: 'SA',
    nameAr: 'السعودية',
    currency: {
      code: 'SAR',
      symbol: 'ر.س',
      nameAr: 'ريال سعودي',
      nameArUnit: 'ريالاً',
      nameArSubunit: 'هللة',
    },
    vatRate: 0.15,
    taxAuthorityAr: 'هيئة الزكاة والضريبة والجمارك',
    paymentMethods: [
      { value: 'cash', label: 'نقود' },
      { value: 'transfer', label: 'تحويل' },
      { value: 'sadad', label: 'سداد' },
    ],
    locale: 'ar-SA',
  },
  EG: {
    code: 'EG',
    nameAr: 'مصر',
    currency: {
      code: 'EGP',
      symbol: 'ج.م',
      nameAr: 'جنيه مصري',
      nameArUnit: 'جنيهاً',
      nameArSubunit: 'قرش',
    },
    vatRate: 0.14,
    taxAuthorityAr: 'مصلحة الضرائب المصرية',
    paymentMethods: [
      { value: 'cash', label: 'نقود' },
      { value: 'transfer', label: 'تحويل' },
      { value: 'fawry', label: 'فوري' },
    ],
    locale: 'ar-EG',
  },
};

export function getCountryConfig(code: CountryCode): CountryConfig {
  return COUNTRY_CONFIGS[code] || COUNTRY_CONFIGS.SA;
}

export function getCurrencyConfig(code: CurrencyCode): CurrencyInfo {
  for (const c of Object.values(COUNTRY_CONFIGS)) {
    if (c.currency.code === code) return c.currency;
  }
  return COUNTRY_CONFIGS.SA.currency;
}

export function formatCurrency(amount: number, currencyCode: CurrencyCode): string {
  const currency = getCurrencyConfig(currencyCode);
  return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency.symbol}`;
}

export function currencySymbol(currencyCode: CurrencyCode): string {
  return getCurrencyConfig(currencyCode).symbol;
}
