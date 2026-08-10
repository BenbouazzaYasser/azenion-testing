-- Migration: 00065_fix_branch_logo_mapping
--
-- The FSR branch pointed at the EMSI-branded logo file
-- (a748e2fa…, authored as "Azenion Infinity 1.0 EMSI.svg") while EMSI
-- pointed at the generic Azenion infinity mark (d66ec35f…). Swap the
-- branch → logo mapping so each branch renders its own logo:
--   · EMSI  → the EMSI-branded infinity variant
--   · FSR   → the generic Azenion infinity mark
-- The logo files themselves are unchanged; only the data mapping is fixed.

update public.branches
set logo_url = case
  when slug = 'emsi' then
    'https://kyhlpbgobvfewvrqtqfn.supabase.co/storage/v1/object/public/branch-assets/00000000-0000-0000-0000-000000000000/logos/a748e2fa-c7da-48b4-8773-b24699e12584.svg'
  when slug = 'fsr' then
    'https://kyhlpbgobvfewvrqtqfn.supabase.co/storage/v1/object/public/branch-assets/00000000-0000-0000-0000-000000000000/logos/d66ec35f-83ba-40cc-addd-879ca5708213.svg'
end
where slug in ('emsi', 'fsr');
