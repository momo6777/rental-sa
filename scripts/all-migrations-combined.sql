-- Create extensions
create extension if not exists "uuid-ossp";

-- Create profiles table linked to auth.users
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  user_id uuid unique not null,
  role text check (role in ('admin', 'accountant')) not null,
  full_name text not null,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create properties table
create table properties (
  id uuid primary key default uuid_generate_v4(),
  name_ar text not null,
  name_en text,
  type text check (type in ('residential', 'commercial')) not null,
  city text not null,
  district text not null,
  parcel_number text,
  deed_number text,
  total_units integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create units table
create table units (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid references properties on delete cascade not null,
  unit_number text not null,
  floor integer,
  area_sqm numeric not null,
  type text check (type in ('apartment', 'office', 'shop', 'villa')) not null,
  status text check (status in ('available', 'rented', 'maintenance')) not null default 'available',
  rent_price numeric not null check (rent_price >= 0),
  is_commercial boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create tenants table
create table tenants (
  id uuid primary key default uuid_generate_v4(),
  full_name_ar text not null,
  full_name_en text,
  national_id text,
  iqama_number text,
  nationality text not null,
  phone text not null,
  email text,
  absher_verified boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create contracts table
create table contracts (
  id uuid primary key default uuid_generate_v4(),
  unit_id uuid references units on delete cascade not null,
  tenant_id uuid references tenants on delete cascade not null,
  start_date date not null,
  end_date date not null,
  rent_amount numeric not null check (rent_amount >= 0),
  payment_frequency text check (payment_frequency in ('monthly', 'quarterly', 'yearly')) not null,
  status text check (status in ('active', 'expired', 'terminated')) not null default 'active',
  ejar_contract_number text unique,
  vat_included boolean not null default false,
  deposit_amount numeric not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create payments table
create table payments (
  id uuid primary key default uuid_generate_v4(),
  contract_id uuid references contracts on delete cascade not null,
  amount numeric not null check (amount >= 0),
  vat_amount numeric not null default 0,
  total_amount numeric not null check (total_amount >= 0),
  due_date date not null,
  paid_date date,
  status text check (status in ('pending', 'paid', 'overdue')) not null default 'pending',
  payment_method text check (payment_method in ('sadad', 'transfer', 'cash')) not null,
  sadad_reference text,
  invoice_number text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create maintenance_requests table
create table maintenance_requests (
  id uuid primary key default uuid_generate_v4(),
  unit_id uuid references units on delete cascade not null,
  title text not null,
  description text not null,
  priority text check (priority in ('low', 'medium', 'high', 'urgent')) not null,
  status text check (status in ('open', 'in_progress', 'completed')) not null default 'open',
  reported_by text not null,
  assigned_to uuid references auth.users,
  cost numeric check (cost >= 0),
  completed_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create notifications table
create table notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  message text not null,
  type text check (type in ('contract_expiry', 'payment_overdue', 'maintenance_urgent', 'info')) not null,
  is_read boolean not null default false,
  related_id uuid,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table profiles enable row level security;
alter table properties enable row level security;
alter table units enable row level security;
alter table tenants enable row level security;
alter table contracts enable row level security;
alter table payments enable row level security;
alter table maintenance_requests enable row level security;
alter table notifications enable row level security;

-- Create updated_at triggers
create trigger update_profiles_updated_at before update on profiles
  for each row execute procedure moddatetime (updated_at);

create trigger update_properties_updated_at before update on properties
  for each row execute procedure moddatetime (updated_at);

create trigger update_units_updated_at before update on units
  for each row execute procedure moddatetime (updated_at);

create trigger update_tenants_updated_at before update on tenants
  for each row execute procedure moddatetime (updated_at);

create trigger update_contracts_updated_at before update on contracts
  for each row execute procedure moddatetime (updated_at);

create trigger update_payments_updated_at before update on payments
  for each row execute procedure moddatetime (updated_at);

create trigger update_maintenance_requests_updated_at before update on maintenance_requests
  for each row execute procedure moddatetime (updated_at);

create trigger update_notifications_updated_at before update on notifications
  for each row execute procedure moddatetime (updated_at);

-- Create indexes for better performance
create index idx_properties_type on properties(type);
create index idx_units_status on units(status);
create index idx_units_property_id on units(property_id);
create index idx_contracts_status on contracts(status);
create index idx_contracts_dates on contracts(start_date, end_date);
create index idx_payments_status on payments(status);
create index idx_payments_due_date on payments(due_date);
create index idx_maintenance_requests_status on maintenance_requests(status);
create index idx_notifications_user_id on notifications(user_id);
create index idx_notifications_is_read on notifications(is_read);

-- Insert initial admin user (password will need to be set through auth)
-- This is just for the profile, actual auth user needs to be created through Supabase auth

-- === END OF 001_initial.sql ===

-- Create the moddatetime function for updated_at triggers
create or replace function moddatetime()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language 'plpgsql';

-- === END OF 002_functions.sql ===

-- RLS Policies for profiles
create policy "profiles_select_own" on profiles
  for select using (auth.uid() = user_id);

create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = user_id);

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = user_id);

-- RLS Policies for properties
create policy "properties_select_all" on properties
  for select using (true);

create policy "properties_insert_admin" on properties
  for insert with check (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "properties_update_admin" on properties
  for update using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "properties_delete_admin" on properties
  for delete using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid() and profiles.role = 'admin'
    )
  );

-- RLS Policies for units
create policy "units_select_all" on units
  for select using (true);

create policy "units_insert_admin" on units
  for insert with check (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "units_update_admin" on units
  for update using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "units_delete_admin" on units
  for delete using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid() and profiles.role = 'admin'
    )
  );

-- RLS Policies for tenants
create policy "tenants_select_all" on tenants
  for select using (true);

create policy "tenants_insert_admin" on tenants
  for insert with check (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "tenants_update_admin" on tenants
  for update using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "tenants_delete_admin" on tenants
  for delete using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid() and profiles.role = 'admin'
    )
  );

-- RLS Policies for contracts
create policy "contracts_select_all" on contracts
  for select using (true);

create policy "contracts_insert_admin" on contracts
  for insert with check (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "contracts_update_admin" on contracts
  for update using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "contracts_delete_admin" on contracts
  for delete using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid() and profiles.role = 'admin'
    )
  );

-- RLS Policies for payments
create policy "payments_select_all" on payments
  for select using (true);

create policy "payments_insert_all" on payments
  for insert with check (true);

create policy "payments_update_admin_accountant" on payments
  for update using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid() and profiles.role in ('admin', 'accountant')
    )
  );

create policy "payments_delete_admin" on payments
  for delete using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid() and profiles.role = 'admin'
    )
  );

-- RLS Policies for maintenance_requests
create policy "maintenance_requests_select_all" on maintenance_requests
  for select using (true);

create policy "maintenance_requests_insert_admin" on maintenance_requests
  for insert with check (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "maintenance_requests_update_admin" on maintenance_requests
  for update using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid() and profiles.role = 'admin'
    )
  );

create policy "maintenance_requests_delete_admin" on maintenance_requests
  for delete using (
    exists (
      select 1 from profiles
      where profiles.user_id = auth.uid() and profiles.role = 'admin'
    )
  );

-- RLS Policies for notifications
create policy "notifications_select_own" on notifications
  for select using (auth.uid() = user_id);

create policy "notifications_insert_own" on notifications
  for insert with check (auth.uid() = user_id);

create policy "notifications_update_own" on notifications
  for update using (auth.uid() = user_id);

create policy "notifications_delete_own" on notifications
  for delete using (auth.uid() = user_id);

-- === END OF 003_rls_policies.sql ===

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


-- === END OF 004_company_settings.sql ===

-- Add image support to maintenance_requests
alter table maintenance_requests
  add column if not exists image_url text;

-- Create storage bucket for maintenance images
insert into storage.buckets (id, name, public)
values ('maintenance', 'maintenance', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to maintenance bucket
create policy "auth_upload_maintenance" on storage.objects
  for insert with check (
    bucket_id = 'maintenance'
    and auth.role() = 'authenticated'
  );

-- Allow authenticated users to read maintenance images
create policy "auth_read_maintenance" on storage.objects
  for select using (
    bucket_id = 'maintenance'
    and auth.role() = 'authenticated'
  );


-- === END OF 005_maintenance_images.sql ===

