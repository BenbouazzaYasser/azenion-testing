-- Fix: Ensure has_platform_role function exists and is_platform_admin overload exists
-- 00100 introduced has_platform_role(p_role, p_user_id) calling is_platform_admin(uuid) which
-- did not exist in 00028 (which only has is_platform_admin()). This patch ensures both exist.

create or replace function public.is_platform_admin(p_user_id uuid)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from public.platform_admins where user_id = p_user_id
  );
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select public.is_platform_admin(auth.uid());
$$;

grant execute on function public.is_platform_admin(uuid) to anon, authenticated, service_role;
grant execute on function public.is_platform_admin() to anon, authenticated, service_role;

-- Drop if exists to recreate
drop function if exists public.has_platform_role(text, uuid);
drop function if exists public.has_platform_role(text);

-- Recreate the function (correctly checks p_user_id, not just auth.uid())
create or replace function public.has_platform_role(
  p_role_name text,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select
    public.is_platform_admin(p_user_id)
    or exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.user_id = p_user_id
        and r.name = p_role_name
    );
$$;

grant execute on function public.has_platform_role(text, uuid)
  to anon, authenticated, service_role;
