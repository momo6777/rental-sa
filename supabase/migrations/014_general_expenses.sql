create table general_expenses (
  id uuid primary key default gen_random_uuid(),
  description text not null,
  amount numeric not null check (amount >= 0),
  category text not null,
  expense_date date not null,
  notes text,
  created_by uuid references profiles(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table general_expenses enable row level security;

create policy "authenticated_read_general_expenses" on general_expenses
  for select using (auth.role() = 'authenticated');

create policy "authenticated_insert_general_expenses" on general_expenses
  for insert with check (auth.role() = 'authenticated');

create policy "authenticated_update_general_expenses" on general_expenses
  for update using (auth.role() = 'authenticated');

create policy "authenticated_delete_general_expenses" on general_expenses
  for delete using (auth.role() = 'authenticated');
