-- Create storage bucket for company logos
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload logos
create policy "auth_upload_logos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'logos');

create policy "auth_read_logos" on storage.objects
  for select to authenticated
  using (bucket_id = 'logos');

create policy "auth_delete_logos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'logos');
