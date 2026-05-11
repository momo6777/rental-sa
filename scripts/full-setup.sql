-- =============================================
-- COMPLETE DB SETUP (safe to run multiple times)
-- =============================================

-- 1. moddatetime function
create or replace function moddatetime()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 2. Create tables (if not exists)
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  user_id uuid unique not null,
  role text check (role in ('admin', 'accountant')) not null,
  full_name text not null,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists properties (
  id uuid primary key default uuid_generate_v4(),
  name_ar text not null, name_en text,
  type text check (type in ('residential', 'commercial')) not null,
  city text not null, district text not null,
  parcel_number text, deed_number text,
  total_units integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists units (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties on delete cascade not null,
  unit_number text not null, floor integer, area_sqm numeric not null,
  type text check (type in ('apartment','office','shop','villa')) not null,
  status text check (status in ('available','rented','maintenance')) not null default 'available',
  rent_price numeric not null check (rent_price >= 0),
  is_commercial boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists tenants (
  id uuid primary key default uuid_generate_v4(),
  full_name_ar text not null, full_name_en text,
  national_id text, iqama_number text,
  nationality text not null, phone text not null, email text,
  absher_verified boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists contracts (
  id uuid primary key default uuid_generate_v4(),
  unit_id uuid references units on delete cascade not null,
  tenant_id uuid references tenants on delete cascade not null,
  start_date date not null, end_date date not null,
  rent_amount numeric not null check (rent_amount >= 0),
  payment_frequency text check (payment_frequency in ('monthly','quarterly','yearly')) not null,
  status text check (status in ('active','expired','terminated')) not null default 'active',
  ejar_contract_number text unique,
  vat_included boolean not null default false,
  deposit_amount numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  contract_id uuid references contracts on delete cascade not null,
  amount numeric not null check (amount >= 0),
  vat_amount numeric not null default 0,
  total_amount numeric not null check (total_amount >= 0),
  due_date date not null, paid_date date,
  status text check (status in ('pending','paid','overdue')) not null default 'pending',
  payment_method text check (payment_method in ('sadad','transfer','cash')) not null,
  sadad_reference text, invoice_number text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists maintenance_requests (
  id uuid primary key default uuid_generate_v4(),
  unit_id uuid references units on delete cascade not null,
  title text not null, description text not null,
  priority text check (priority in ('low','medium','high','urgent')) not null,
  status text check (status in ('open','in_progress','completed')) not null default 'open',
  reported_by text not null,
  assigned_to uuid references auth.users,
  cost numeric check (cost >= 0),
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  title text not null, message text not null,
  type text check (type in ('contract_expiry','payment_overdue','maintenance_urgent','info')) not null,
  is_read boolean not null default false,
  related_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table if not exists company_settings (
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

-- 3. Enable RLS
alter table profiles enable row level security;
alter table properties enable row level security;
alter table units enable row level security;
alter table tenants enable row level security;
alter table contracts enable row level security;
alter table payments enable row level security;
alter table maintenance_requests enable row level security;
alter table notifications enable row level security;
alter table company_settings enable row level security;

-- 4. Create updated_at triggers
drop trigger if exists update_profiles_updated_at on profiles;
create trigger update_profiles_updated_at before update on profiles for each row execute procedure moddatetime (updated_at);
drop trigger if exists update_properties_updated_at on properties;
create trigger update_properties_updated_at before update on properties for each row execute procedure moddatetime (updated_at);
drop trigger if exists update_units_updated_at on units;
create trigger update_units_updated_at before update on units for each row execute procedure moddatetime (updated_at);
drop trigger if exists update_tenants_updated_at on tenants;
create trigger update_tenants_updated_at before update on tenants for each row execute procedure moddatetime (updated_at);
drop trigger if exists update_contracts_updated_at on contracts;
create trigger update_contracts_updated_at before update on contracts for each row execute procedure moddatetime (updated_at);
drop trigger if exists update_payments_updated_at on payments;
create trigger update_payments_updated_at before update on payments for each row execute procedure moddatetime (updated_at);
drop trigger if exists update_maintenance_requests_updated_at on maintenance_requests;
create trigger update_maintenance_requests_updated_at before update on maintenance_requests for each row execute procedure moddatetime (updated_at);
drop trigger if exists update_notifications_updated_at on notifications;
create trigger update_notifications_updated_at before update on notifications for each row execute procedure moddatetime (updated_at);
drop trigger if exists update_company_settings_updated_at on company_settings;
create trigger update_company_settings_updated_at before update on company_settings for each row execute procedure moddatetime (updated_at);

-- 5. Indexes
create index if not exists idx_properties_type on properties(type);
create index if not exists idx_units_status on units(status);
create index if not exists idx_units_property_id on units(property_id);
create index if not exists idx_contracts_status on contracts(status);
create index if not exists idx_contracts_dates on contracts(start_date, end_date);
create index if not exists idx_payments_status on payments(status);
create index if not exists idx_payments_due_date on payments(due_date);
create index if not exists idx_maintenance_requests_status on maintenance_requests(status);
create index if not exists idx_notifications_user_id on notifications(user_id);
create index if not exists idx_notifications_is_read on notifications(is_read);

-- 6. RLS Policies
drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_insert_own" on profiles;
drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_select_own" on profiles for select using (auth.uid() = user_id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = user_id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = user_id);

drop policy if exists "properties_select_all" on properties;
drop policy if exists "properties_insert_admin" on properties;
drop policy if exists "properties_update_admin" on properties;
drop policy if exists "properties_delete_admin" on properties;
create policy "properties_select_all" on properties for select using (true);
create policy "properties_insert_admin" on properties for insert with check (exists (select 1 from profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));
create policy "properties_update_admin" on properties for update using (exists (select 1 from profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));
create policy "properties_delete_admin" on properties for delete using (exists (select 1 from profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "units_select_all" on units;
drop policy if exists "units_insert_admin" on units;
drop policy if exists "units_update_admin" on units;
drop policy if exists "units_delete_admin" on units;
create policy "units_select_all" on units for select using (true);
create policy "units_insert_admin" on units for insert with check (exists (select 1 from profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));
create policy "units_update_admin" on units for update using (exists (select 1 from profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));
create policy "units_delete_admin" on units for delete using (exists (select 1 from profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "tenants_select_all" on tenants;
drop policy if exists "tenants_insert_admin" on tenants;
drop policy if exists "tenants_update_admin" on tenants;
drop policy if exists "tenants_delete_admin" on tenants;
create policy "tenants_select_all" on tenants for select using (true);
create policy "tenants_insert_admin" on tenants for insert with check (exists (select 1 from profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));
create policy "tenants_update_admin" on tenants for update using (exists (select 1 from profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));
create policy "tenants_delete_admin" on tenants for delete using (exists (select 1 from profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "contracts_select_all" on contracts;
drop policy if exists "contracts_insert_admin" on contracts;
drop policy if exists "contracts_update_admin" on contracts;
drop policy if exists "contracts_delete_admin" on contracts;
create policy "contracts_select_all" on contracts for select using (true);
create policy "contracts_insert_admin" on contracts for insert with check (exists (select 1 from profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));
create policy "contracts_update_admin" on contracts for update using (exists (select 1 from profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));
create policy "contracts_delete_admin" on contracts for delete using (exists (select 1 from profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "payments_select_all" on payments;
drop policy if exists "payments_insert_all" on payments;
drop policy if exists "payments_update_admin_accountant" on payments;
drop policy if exists "payments_delete_admin" on payments;
create policy "payments_select_all" on payments for select using (true);
create policy "payments_insert_all" on payments for insert with check (true);
create policy "payments_update_admin_accountant" on payments for update using (exists (select 1 from profiles where profiles.user_id = auth.uid() and profiles.role in ('admin', 'accountant')));
create policy "payments_delete_admin" on payments for delete using (exists (select 1 from profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "maintenance_requests_select_all" on maintenance_requests;
drop policy if exists "maintenance_requests_insert_admin" on maintenance_requests;
drop policy if exists "maintenance_requests_update_admin" on maintenance_requests;
drop policy if exists "maintenance_requests_delete_admin" on maintenance_requests;
create policy "maintenance_requests_select_all" on maintenance_requests for select using (true);
create policy "maintenance_requests_insert_admin" on maintenance_requests for insert with check (exists (select 1 from profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));
create policy "maintenance_requests_update_admin" on maintenance_requests for update using (exists (select 1 from profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));
create policy "maintenance_requests_delete_admin" on maintenance_requests for delete using (exists (select 1 from profiles where profiles.user_id = auth.uid() and profiles.role = 'admin'));

drop policy if exists "notifications_select_own" on notifications;
drop policy if exists "notifications_insert_own" on notifications;
drop policy if exists "notifications_update_own" on notifications;
drop policy if exists "notifications_delete_own" on notifications;
create policy "notifications_select_own" on notifications for select using (auth.uid() = user_id);
create policy "notifications_insert_own" on notifications for insert with check (auth.uid() = user_id);
create policy "notifications_update_own" on notifications for update using (auth.uid() = user_id);
create policy "notifications_delete_own" on notifications for delete using (auth.uid() = user_id);

drop policy if exists "admin_all_company_settings" on company_settings;
drop policy if exists "accountant_read_company_settings" on company_settings;
create policy "admin_all_company_settings" on company_settings for all using (auth.jwt() ->> 'role' = 'admin') with check (auth.jwt() ->> 'role' = 'admin');
create policy "accountant_read_company_settings" on company_settings for select using (auth.jwt() ->> 'role' = 'accountant');

-- 7. Default company settings row
insert into company_settings (company_name_ar, vat_number, company_address)
select 'شركة عقارات للإدارة والتأجير', '310123456700003', 'الرياض، المملكة العربية السعودية'
where not exists (select 1 from company_settings limit 1);

-- 8. Maintenance image support
alter table maintenance_requests add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('maintenance', 'maintenance', true)
on conflict (id) do nothing;

drop policy if exists "auth_upload_maintenance" on storage.objects;
drop policy if exists "auth_read_maintenance" on storage.objects;
create policy "auth_upload_maintenance" on storage.objects for insert with check (bucket_id = 'maintenance' and auth.role() = 'authenticated');
create policy "auth_read_maintenance" on storage.objects for select using (bucket_id = 'maintenance' and auth.role() = 'authenticated');

-- 9. Mark migrations as applied
insert into supabase_migrations.schema_migrations (name, statements)
values ('001_initial.sql', 22) on conflict (name) do nothing;
insert into supabase_migrations.schema_migrations (name, statements)
values ('002_functions.sql', 1) on conflict (name) do nothing;
insert into supabase_migrations.schema_migrations (name, statements)
values ('003_rls_policies.sql', 30) on conflict (name) do nothing;
insert into supabase_migrations.schema_migrations (name, statements)
values ('004_company_settings.sql', 6) on conflict (name) do nothing;
insert into supabase_migrations.schema_migrations (name, statements)
values ('005_maintenance_images.sql', 5) on conflict (name) do nothing;

-- 10. Enable pgcrypto
create extension if not exists pgcrypto;
