-- Storage bucket for team logos
insert into storage.buckets (id, name, public)
values ('team-logos', 'team-logos', true)
on conflict (id) do nothing;

-- Allow public read access to team logos
create policy "team logos are publicly readable"
  on storage.objects for select using (bucket_id = 'team-logos');

-- Allow team owners to upload logos to their team's folder
create policy "team owners can upload logos"
  on storage.objects for insert with check (
    bucket_id = 'team-logos'
    and exists (
      select 1 from public.team_members
      where team_members.team_id = (storage.foldername(name))[1]::uuid
        and team_members.user_id = auth.uid()
        and team_members.role = 'owner'
    )
  );

-- Allow team owners to update their logo
create policy "team owners can update logos"
  on storage.objects for update using (
    bucket_id = 'team-logos'
    and exists (
      select 1 from public.team_members
      where team_members.team_id = (storage.foldername(name))[1]::uuid
        and team_members.user_id = auth.uid()
        and team_members.role = 'owner'
    )
  );

-- Allow team owners to delete their logo
create policy "team owners can delete logos"
  on storage.objects for delete using (
    bucket_id = 'team-logos'
    and exists (
      select 1 from public.team_members
      where team_members.team_id = (storage.foldername(name))[1]::uuid
        and team_members.user_id = auth.uid()
        and team_members.role = 'owner'
    )
  );
