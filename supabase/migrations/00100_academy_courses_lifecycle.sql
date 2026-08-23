-- Migration: 00100_academy_courses_lifecycle
-- Extends public.courses with lifecycle status, pricing, and trust constraints.
-- Run after 00096_course_details_and_final_gate.sql.
-- Does NOT modify any existing column, table, or function outside public.courses.

-- ── Columns: courses lifecycle and pricing ───────────────────────────────────

alter table public.courses
  add column if not exists status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),
  add column if not exists is_free boolean not null default true,
  add column if not exists price_cents integer not null default 0 check (price_cents >= 0),
  add column if not exists currency text not null default 'usd'
    check (currency in ('usd', 'eur', 'gbp'));

-- ── CHECK invariant: free courses have price_cents = 0, paid courses have price_cents > 0 ───────────────────────────────

do $$
begin
  perform 1
  from public.courses
  where (is_free = true  and price_cents != 0)
     or (is_free = false and price_cents = 0);
  if found then
    raise exception 'Existing course data violates the free/paid pricing invariant. Fix data before applying this migration.';
  end if;
end
$$;

-- ── Index for status-based queries ─────────────────────────────────────────

create index if not exists idx_courses_status on public.courses(status);

-- ── Trigger: enforce free/paid pricing invariant on every update ─────────────

create or replace function public.ensure_free_no_price()
returns trigger
language plpgsql
stable
as $$
begin
  if new.is_free = true and (new.price_cents != 0 or new.currency is null) then
    raise exception 'Free courses must have price_cents = 0';
  end if;
  if new.is_free = false and new.price_cents <= 0 then
    raise exception 'Paid courses must have price_cents > 0';
  end if;
  return new;
end
$$;

create trigger ensure_free_price
  before update on public.courses
  for each row
  execute function public.ensure_free_no_price();

-- ── Comment ─────────────────────────────────────────────────────────────────

comment on column public.courses.status is 'Course lifecycle status: draft | published | archived';
comment on column public.courses.is_free is 'Whether the course is free or paid; independent of status';
comment on column public.courses.price_cents is 'Price in cents; 0 for free courses, > 0 for paid courses; no artificial ceiling';
comment on column public.courses.currency is 'Currency for priced courses; usd, eur, or gbp';