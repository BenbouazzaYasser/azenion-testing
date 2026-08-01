-- Branches table
create table if not exists public.branches (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  full_name text,
  description text,
  logo_url text,
  cover_url text,
  city text,
  created_at timestamptz default now()
);

alter table public.branches enable row level security;

create policy "branches are publicly readable"
  on public.branches for select using (true);

-- Branch members table
create table if not exists public.branch_members (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'moderator', 'admin')),
  joined_at timestamptz default now()
);

alter table public.branch_members enable row level security;

create policy "branch members are publicly readable"
  on public.branch_members for select using (true);

create policy "users can join a branch as themselves"
  on public.branch_members for insert with check (auth.uid() = user_id);

create policy "users can leave their own branch"
  on public.branch_members for delete using (auth.uid() = user_id);

create index idx_branch_members_branch_id on public.branch_members(branch_id);
create unique index idx_branch_members_user_id on public.branch_members(user_id);

-- Seed EMSI and FSR branches
insert into public.branches (slug, name, full_name, description, city)
values
  ('emsi', 'EMSI', 'École Marocaine des Sciences de l''Ingénieur', 'The EMSI branch brings together engineering students who want to move past theory and start shipping — from firmware to full-stack products.', 'Rabat'),
  ('fsr', 'FSR', 'Faculté des Sciences de Rabat', 'The FSR branch is home to students turning scientific curiosity into working software, research tooling, and early-stage projects.', 'Rabat')
on conflict (slug) do nothing;

-- RPC: join_branch
create or replace function public.join_branch(p_branch_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_existing_id uuid;
  v_branch_name text;
  v_branch_slug text;
begin
  -- Check if user already has a branch membership
  select id into v_existing_id
  from public.branch_members
  where user_id = auth.uid();

  -- If they have one, delete it (effectively switching branches)
  if v_existing_id is not null then
    delete from public.branch_members where id = v_existing_id;
  end if;

  -- Get branch info for the activity
  select name, slug into v_branch_name, v_branch_slug
  from public.branches
  where id = p_branch_id;

  -- Insert new membership
  insert into public.branch_members (branch_id, user_id)
  values (p_branch_id, auth.uid());

  -- Log activity
  insert into public.activities (user_id, type, metadata)
  values (
    auth.uid(),
    'joined_branch',
    jsonb_build_object(
      'branch_id', p_branch_id,
      'branch_name', v_branch_name,
      'branch_slug', v_branch_slug
    )
  );
end;
$$;

-- RPC: leave_branch
create or replace function public.leave_branch()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_membership_id uuid;
  v_branch_id uuid;
  v_branch_name text;
  v_branch_slug text;
begin
  select m.id, m.branch_id, b.name, b.slug
  into v_membership_id, v_branch_id, v_branch_name, v_branch_slug
  from public.branch_members m
  join public.branches b on b.id = m.branch_id
  where m.user_id = auth.uid();

  if v_membership_id is not null then
    delete from public.branch_members where id = v_membership_id;

    insert into public.activities (user_id, type, metadata)
    values (
      auth.uid(),
      'left_branch',
      jsonb_build_object(
        'branch_id', v_branch_id,
        'branch_name', v_branch_name,
        'branch_slug', v_branch_slug
      )
    );
  end if;
end;
$$;
