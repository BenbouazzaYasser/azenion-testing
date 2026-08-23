-- Migration: 00090_welcome_email_sent
--
-- Adds a boolean flag to atomically track whether the post-signup welcome
-- email has already been sent, enabling idempotent delivery via a
-- claim-and-set RPC so that concurrent requests cannot send duplicate emails.
--
-- Idempotency mechanism:
--   public.claim_welcome_email(user_uuid)
--     returns boolean
--     — returns true if this call claimed the email (it had not been sent yet)
--     — returns false if the email was already claimed/sent by another request
--     — internally performs: UPDATE profiles SET welcome_email_sent = true
--       WHERE id = p_user_id AND welcome_email_sent = false
--     — if the UPDATE affected 0 rows, the flag was already true → return false
--
-- SECURITY
--   Follows the caller-identity convention from 00081/00082: an authenticated
--   caller may only claim the row whose id equals auth.uid(). The service role
--   (used by server-side QA/admin flows) may claim any row. This prevents one
--   user from flipping another user's welcome_email_sent flag (a would-be
--   DoS against their welcome email).
--
-- Usage after Supabase email confirmation:
--   1. User signs up → Supabase sends confirmation email automatically
--   2. User clicks confirmation link → email_confirmed_at is set
--   3. Callback or on-page load calls claim_welcome_email(user.id)
--   4. If claim returns true → send welcome email via Resend
--   5. If claim returns false → welcome email was already sent; skip

-- ── Table ────────────────────────────────────────────────────────────────

alter table public.profiles add column if not exists welcome_email_sent boolean default false;

-- ── RPC: claim_welcome_email ─────────────────────────────────────────────

create or replace function public.claim_welcome_email(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Attempt to set welcome_email_sent = true only if it was false AND the
  -- caller owns the row (or is the service role). The WHERE clause makes
  -- the claim atomic: concurrent requests cannot both observe false.
  update public.profiles
  set welcome_email_sent = true
  where id = p_user_id
    and welcome_email_sent = false
    and (p_user_id = auth.uid() or auth.role() = 'service_role');

  -- FOUND is true only when the UPDATE affected a row, i.e. this call won.
  if found then
    return true;  -- this request claimed the email
  else
    return false; -- already claimed/sent by another request (or not owned)
  end if;
end;
$$;

revoke all on function public.claim_welcome_email(uuid) from public;
grant execute on function public.claim_welcome_email(uuid) to authenticated;
grant execute on function public.claim_welcome_email(uuid) to service_role;

-- ── RPC: reset_welcome_email_claim ──────────────────────────────────────
--
-- Reopens the welcome-email slot after a Resend send failure so the next
-- callback visit can retry. Same caller-identity guard as the claim above.
create or replace function public.reset_welcome_email_claim(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set welcome_email_sent = false
  where id = p_user_id
    and welcome_email_sent = true
    and (p_user_id = auth.uid() or auth.role() = 'service_role');

  if found then
    return true; -- flag was true and was reset to false
  else
    return false; -- flag was already false (no-op) or not owned
  end if;
end;
$$;

revoke all on function public.reset_welcome_email_claim(uuid) from public;
grant execute on function public.reset_welcome_email_claim(uuid) to authenticated;
grant execute on function public.reset_welcome_email_claim(uuid) to service_role;