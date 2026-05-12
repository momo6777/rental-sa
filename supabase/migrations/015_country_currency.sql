-- Add country and currency fields to company_settings for SA/EG toggle
alter table company_settings
  add column if not exists country text not null default 'SA' check (country in ('SA', 'EG')),
  add column if not exists currency text not null default 'SAR' check (currency in ('SAR', 'EGP'));

-- Update default address based on country
update company_settings set
  country = 'SA',
  currency = 'SAR',
  company_address = 'الرياض، المملكة العربية السعودية'
where country = 'SA' and company_address is null;

-- Allow accountant to read new columns (existing policy covers all columns)

-- Add fawry payment method to payments check constraint
alter table payments
  drop constraint if exists payments_payment_method_check;

alter table payments
  add constraint payments_payment_method_check
  check (payment_method in ('sadad', 'transfer', 'cash', 'fawry'));

-- Add fawry_reference column for Egypt payments
alter table payments
  add column if not exists fawry_reference text;
