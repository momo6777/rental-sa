export interface Property {
  id: string;
  name_ar: string;
  name_en?: string;
  type: 'residential' | 'commercial';
  city: string;
  district: string;
  parcel_number?: string;
  deed_number?: string;
  total_units: number;
  created_at: string;
}

export interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  floor?: number;
  area_sqm: number;
  type: 'apartment' | 'office' | 'shop' | 'villa';
  status: 'available' | 'rented' | 'maintenance';
  rent_price: number;
  is_commercial: boolean;
  created_at: string;
}

export interface Tenant {
  id: string;
  full_name_ar: string;
  full_name_en?: string;
  national_id?: string;
  iqama_number?: string;
  nationality: string;
  phone: string;
  email?: string;
  absher_verified: boolean;
  created_at: string;
}

export interface Contract {
  id: string;
  unit_id: string;
  tenant_id: string;
  start_date: string;
  end_date: string;
  rent_amount: number;
  payment_frequency: 'monthly' | 'quarterly' | 'yearly';
  status: 'active' | 'expired' | 'terminated';
  ejar_contract_number?: string;
  contract_number?: string;
  vat_included: boolean;
  deposit_amount: number;
  created_at: string;
}

export interface Payment {
  id: string;
  contract_id: string;
  amount: number;
  vat_amount: number;
  total_amount: number;
  due_date: string;
  paid_date?: string;
  status: 'pending' | 'paid' | 'overdue';
  payment_method: 'sadad' | 'transfer' | 'cash';
  sadad_reference?: string;
  invoice_number?: string;
  created_at: string;
}

export interface MaintenanceRequest {
  id: string;
  unit_id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'completed';
  reported_by: string;
  assigned_to?: string;
  cost?: number;
  completed_at?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  role: 'admin' | 'accountant';
  full_name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'contract_expiry' | 'payment_overdue' | 'maintenance_urgent' | 'info';
  is_read: boolean;
  related_id?: string;
  created_at: string;
}