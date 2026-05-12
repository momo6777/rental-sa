-- Create maintenance_expenses table for multiple expenses per maintenance request
create table maintenance_expenses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references maintenance_requests on delete cascade not null,
  description text not null,
  amount numeric not null check (amount >= 0),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS: enable row level security
alter table maintenance_expenses enable row level security;

-- RLS policies
create policy "authenticated_read_maintenance_expenses" on maintenance_expenses
  for select using (auth.role() = 'authenticated');

create policy "authenticated_insert_maintenance_expenses" on maintenance_expenses
  for insert with check (auth.role() = 'authenticated');

create policy "authenticated_update_maintenance_expenses" on maintenance_expenses
  for update using (auth.role() = 'authenticated');

create policy "authenticated_delete_maintenance_expenses" on maintenance_expenses
  for delete using (auth.role() = 'authenticated');
