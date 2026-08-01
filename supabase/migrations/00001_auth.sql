-- Profiles table
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text not null,
  bio text,
  avatar_url text,
  github_url text,
  linkedin_url text,
  skills text[] default '{}',
  institution text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "profiles are publicly readable"
  on public.profiles for select using (true);

create policy "users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "users update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Activities table (required by the signup trigger)
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

alter table public.activities enable row level security;

create policy "activities are publicly readable"
  on public.activities for select using (true);

create index idx_activities_user_id on public.activities(user_id);
create index idx_activities_user_created on public.activities(user_id, created_at desc);

-- Trigger function: creates profile + initial activity on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    new.raw_user_meta_data ->> 'full_name'
  );

  insert into public.activities (user_id, type, metadata)
  values (
    new.id,
    'joined_azenion',
    jsonb_build_object(
      'username', new.raw_user_meta_data ->> 'username'
    )
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
