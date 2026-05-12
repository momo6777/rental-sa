-- Add image and deed URL columns to properties
alter table properties
  add column if not exists image_url text,
  add column if not exists deed_url text;

-- Create storage bucket for property images
insert into storage.buckets (id, name, public)
values ('property_images', 'property_images', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to property_images bucket
create policy "auth_upload_property_images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'property_images');

create policy "auth_read_property_images" on storage.objects
  for select to authenticated
  using (bucket_id = 'property_images');

create policy "auth_delete_property_images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'property_images');

-- Function to update total_units based on actual unit count
create or replace function sync_property_units()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'insert' then
    update properties
    set total_units = (select count(*) from units where property_id = new.property_id)
    where id = new.property_id;
    return new;
  elsif tg_op = 'delete' then
    update properties
    set total_units = (select count(*) from units where property_id = old.property_id)
    where id = old.property_id;
    return old;
  elsif tg_op = 'update' and old.property_id <> new.property_id then
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

-- Trigger to auto-sync total_units on units changes
drop trigger if exists trg_sync_property_units on units;
create trigger trg_sync_property_units
  after insert or delete or update of property_id
  on units
  for each row
  execute function sync_property_units();

-- RPC functions for frontend usage (backup calls from code)
create or replace function increment_property_units(prop_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update properties
  set total_units = total_units + 1
  where id = prop_id;
end;
$$;

create or replace function decrement_property_units(prop_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update properties
  set total_units = greatest(0, total_units - 1)
  where id = prop_id;
end;
$$;
