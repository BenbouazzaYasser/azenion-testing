-- Migration: 00096_auto_grant_core_team_role
--
-- Automatically grants `core_team_member` to newly created profiles whose
-- username or full_name matches one of the known core team members
-- (ziyad, yasser, mayssae, ayoub, adil, meriem).
--
-- 00093 granted the role only to profiles that existed at migration time.
-- New signups get no platform roles by default, so this trigger makes the
-- grant self-serve for the named members without an admin having to run SQL
-- every time one of them registers.

create or replace function public.grant_core_team_on_signup()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_role_id uuid;
  v_name text;
  v_matches boolean := false;
  v_members text[] := array['ziyad', 'yasser', 'mayssae', 'ayoub', 'adil', 'meriem'];
begin
  if new.username is null and new.full_name is null then
    return new;
  end if;

  foreach v_name in array v_members loop
    if (new.username is not null and lower(btrim(new.username)) like '%' || v_name || '%')
       or (new.full_name is not null and lower(btrim(new.full_name)) like '%' || v_name || '%') then
      v_matches := true;
      exit;
    end if;
  end loop;

  if not v_matches then
    return new;
  end if;

  select id into v_role_id
  from public.roles
  where name = 'core_team_member';

  if v_role_id is not null then
    insert into public.user_roles (user_id, role_id)
    values (new.id, v_role_id)
    on conflict (user_id, role_id) do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_grant_core_team_on_signup on public.profiles;
create trigger trg_grant_core_team_on_signup
  after insert on public.profiles
  for each row execute function public.grant_core_team_on_signup();

-- Backfill: also apply the same rule to existing profiles that were missed
-- (accounts created between 00093 and now, or profiles that didn't match at
-- 00093 time because they had no row yet).
do $$
declare
  v_role_id uuid;
  v_name text;
  v_members text[] := array['ziyad', 'yasser', 'mayssae', 'ayoub', 'adil', 'meriem'];
begin
  select id into v_role_id
  from public.roles
  where name = 'core_team_member';

  if v_role_id is null then
    raise notice 'core_team_member role not found; skipping backfill';
    return;
  end if;

  foreach v_name in array v_members loop
    insert into public.user_roles (user_id, role_id)
    select p.id, v_role_id
    from public.profiles p
    where (lower(btrim(p.username)) like '%' || v_name || '%'
       or lower(btrim(p.full_name)) like '%' || v_name || '%')
      and not exists (
        select 1 from public.user_roles ur
        where ur.user_id = p.id and ur.role_id = v_role_id
      );
  end loop;
end;
$$;