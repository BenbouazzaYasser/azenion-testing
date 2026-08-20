-- Storage bucket for user avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Allow public read access to avatars
create policy "avatars are publicly readable"
  on storage.objects for select using (bucket_id = 'avatars');

-- Allow authenticated users to upload to their own folder
create policy "users can upload their own avatar"
  on storage.objects for insert with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to update their own avatar
create policy "users can update their own avatar"
  on storage.objects for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow users to delete their own avatar
create policy "users can delete their own avatar"
  on storage.objects for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
