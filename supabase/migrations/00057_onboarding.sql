-- Migration: 00057_onboarding
--
-- Adds first-time onboarding persistence to `profiles`.
--
--   * `onboarding_step`             — the step to resume from if onboarding was
--                                     started but not finished (null when the
--                                     user has never started or has completed).
--   * `onboarding_completed_at`     — set once the flow has been completed; when
--                                     non-null the onboarding never reappears.

alter table public.profiles
  add column if not exists onboarding_step text,
  add column if not exists onboarding_completed_at timestamptz;