-- Migration: 00099_user_settings_language
--
-- Adds an explicit interface-language preference ("en" | "fr") to the
-- centralized user settings row. NULL means "no explicit choice yet", in
-- which case the browser/device language is used. Once set, the stored
-- preference always takes precedence over automatic device detection.

alter table public.user_settings
  add column if not exists language text;

alter table public.user_settings
  add constraint user_settings_language_check
  check (language is null or language in ('en', 'fr'));

comment on column public.user_settings.language is
  'Interface language preference. NULL = not chosen yet (browser language applies).';
