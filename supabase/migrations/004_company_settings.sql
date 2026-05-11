-- Create company_settings table for ZATCA compliance and system configuration
create table company_settings (
  id uuid primary key default uuid_generate_v4(),
  company_name_ar text not null default 'شركة عقارات للإدارة والتأجير',
  company_name_en text default 'Real Estate Management Co.',
  vat_number text not null default '310123456700003',
  company_address text default 'الرياض، المملكة العربية السعودية',
  logo_url text,
  vat_rate numeric not null default 0.15 check (vat_rate >= 0 and vat_rate <= 1),
  notification_days_before_expiry int not null default 90,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table company_settings enable row level security;

-- Admin can read/write all
create policy "admin_all_company_settings" on company_settings
  for all using (auth.jwt() ->> 'role' = 'admin')
  with check (auth.jwt() ->> 'role' = 'admin');

-- Accountant can read only
create policy "accountant_read_company_settings" on company_settings
  for select using (auth.jwt() ->> 'role' = 'accountant');

-- Insert default record
insert into company_settings (company_name_ar, vat_number, company_address)
values ('شركة عقارات للإدارة والتأجير', '310123456700003', 'الرياض، المملكة العربية السعودية');

-- Updated_at trigger
create trigger update_company_settings_updated_at before update on company_settings
  for each row execute procedure moddatetime (updated_at);
