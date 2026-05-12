-- Fix: TG_OP returns UPPERCASE ('INSERT', 'DELETE', 'UPDATE')
-- Previous migration used lowercase which caused all conditions to fail

create or replace function sync_property_units()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    update properties
    set total_units = (select count(*) from units where property_id = new.property_id)
    where id = new.property_id;
    return new;
  elsif tg_op = 'DELETE' then
    update properties
    set total_units = (select count(*) from units where property_id = old.property_id)
    where id = old.property_id;
    return old;
  elsif tg_op = 'UPDATE' and old.property_id <> new.property_id then
    update properties
    set total_units = (select count(*) from units where property_id = old.property_id)
    where id = old.property_id;
    update properties
    set total_units = (select count(*) from units where property_id = new.property_id)
    where id = new.property_id;
    return new;
  end if;
end;
$$;
