import { supabase } from './supabase';

export interface CompanySettings {
  id: string;
  company_name_ar: string;
  company_name_en?: string;
  vat_number: string;
  company_address?: string;
  logo_url?: string;
  vat_rate: number;
  notification_days_before_expiry: number;
}

let cachedSettings: CompanySettings | null = null;

export async function getCompanySettings(): Promise<CompanySettings> {
  if (cachedSettings) return cachedSettings;

  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .limit(1)
    .single();

  if (error || !data) {
    return {
      id: '',
      company_name_ar: 'شركة عقارات للإدارة والتأجير',
      vat_number: '310123456700003',
      company_address: 'الرياض، المملكة العربية السعودية',
      vat_rate: 0.15,
      notification_days_before_expiry: 90,
    };
  }

  cachedSettings = data;
  return data;
}

export function clearSettingsCache() {
  cachedSettings = null;
}
