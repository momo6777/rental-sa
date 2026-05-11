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
