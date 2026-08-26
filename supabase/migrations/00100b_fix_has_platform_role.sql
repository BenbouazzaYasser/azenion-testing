-- Fix: Ensure has_platform_role function exists
-- This should have been created in 00100, but may have failed

-- Drop if exists to recreate
drop function if exists public.has_platform_role(text, uuid);
drop function if exists public.has_platform_role(text);

-- Recreate the function
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
    public.is_platform_admin()  -- No parameter, uses auth.uid() internally
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
