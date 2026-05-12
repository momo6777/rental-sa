-- Add missing updated_at columns to tables that have triggers but no column
alter table properties
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

alter table units
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

alter table tenants
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

alter table contracts
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

alter table payments
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

alter table maintenance_requests
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;

alter table notifications
  add column if not exists updated_at timestamp with time zone default timezone('utc'::text, now()) not null;
