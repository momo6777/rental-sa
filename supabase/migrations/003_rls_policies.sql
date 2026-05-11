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