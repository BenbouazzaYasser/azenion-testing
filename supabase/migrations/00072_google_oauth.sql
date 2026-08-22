-- ── Google OAuth support ───────────────────────────────────────────────────
-- OAuth sign-ins (e.g. Google) do not supply a `username` in the user
-- metadata, but public.profiles.username is NOT NULL. Regenerate the signup
-- trigger so it falls back to a unique username derived from the email when
-- none is provided, and carries over Google's display name + avatar.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_meta jsonb;
  v_email_local text;
  v_username text;
begin
  v_meta := coalesce(new.raw_user_meta_data, '{}'::jsonb);

  v_username := nullif(v_meta ->> 'username', '');
  if v_username is null then
    v_email_local := nullif(split_part(coalesce(new.email, ''), '@', 1), '');
    v_username := coalesce(v_email_local, 'user') || '_' || substr(md5(new.id::text), 1, 8);
  end if;

  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    v_username,
    coalesce(nullif(v_meta ->> 'full_name', ''), v_email_local, v_username),
    coalesce(nullif(v_meta ->> 'avatar_url', ''), nullif(v_meta ->> 'picture', ''))
  );

  insert into public.activities (user_id, type, metadata)
  values (
    new.id,
    'joined_azenion',
    jsonb_build_object('username', v_username)
  );

  return new;
end;
$$;
