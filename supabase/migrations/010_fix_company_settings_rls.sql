-- Fix company_settings RLS policies: use EXISTS subquery like 003_rls_policies.sql
-- auth.jwt() ->> 'role' returns the database role ('authenticated'), not the app role

drop policy if exists "admin_all_company_settings" on company_settings;
drop policy if exists "accountant_read_company_settings" on company_settings;

create policy "company_settings_admin_all" on company_settings
  for all using (
    exists (select 1 from profiles where profiles.user_id = auth.uid() and profiles.role = 'admin')
  )
  with check (
    exists (select 1 from profiles where profiles.user_id = auth.uid() and profiles.role = 'admin')
  );

create policy "company_settings_accountant_read" on company_settings
  for select using (
    exists (select 1 from profiles where profiles.user_id = auth.uid() and profiles.role = 'accountant')
  );
