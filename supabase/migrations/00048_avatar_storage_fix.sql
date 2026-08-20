-- Fix avatar storage ownership policies.
--
-- The upload path is `avatars/<user_id>/<file>` (see actions/profile.actions.ts),
-- so storage.foldername(name) returns ['avatars', '<user_id>'].
-- The previous policies compared (foldername(name))[1] against auth.uid(),
-- which always evaluated to 'avatars' != auth.uid(), rejecting every upload
-- with "new row violates row-level security policy".
--
-- New policies require the exact layout avatars/<own-uid>/<file>:
--   folder[1] = 'avatars'           (bucket layout prefix)
--   folder[2] = auth.uid()          (owner folder must match the caller)

drop policy if exists "users can upload their own avatar" on storage.objects;
create policy "users can upload their own avatar"
  on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = (auth.uid())::text
  );

drop policy if exists "users can update their own avatar" on storage.objects;
create policy "users can update their own avatar"
  on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = (auth.uid())::text
  );

drop policy if exists "users can delete their own avatar" on storage.objects;
create policy "users can delete their own avatar"
  on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = 'avatars'
    and (storage.foldername(name))[2] = (auth.uid())::text
  );
