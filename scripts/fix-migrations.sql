-- Fix: use WHERE NOT EXISTS instead of ON CONFLICT
insert into supabase_migrations.schema_migrations (name, statements)
select '001_initial.sql', '{22}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = '001_initial.sql');

insert into supabase_migrations.schema_migrations (name, statements)
select '002_functions.sql', '{1}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = '002_functions.sql');

insert into supabase_migrations.schema_migrations (name, statements)
select '003_rls_policies.sql', '{30}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = '003_rls_policies.sql');

insert into supabase_migrations.schema_migrations (name, statements)
select '004_company_settings.sql', '{6}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = '004_company_settings.sql');

insert into supabase_migrations.schema_migrations (name, statements)
select '005_maintenance_images.sql', '{5}'
where not exists (select 1 from supabase_migrations.schema_migrations where name = '005_maintenance_images.sql');
