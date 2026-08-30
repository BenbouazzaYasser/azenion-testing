-- Migration: 00107_user_settings_language
-- Adds preferred language for site-wide translation.

alter table public.user_settings
  add column if not exists language text not null default 'en';

-- Optional check: allow known codes plus 'en' default (loosely validated in app)
-- Keep permissive to avoid blocking future language additions.
comment on column public.user_settings.language is 'Preferred UI language code (e.g. en, fr, es). Used for site-wide translation.';
