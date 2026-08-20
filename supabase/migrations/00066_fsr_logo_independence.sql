-- Migration: 00066_fsr_logo_independence
--
-- FSR's logo was re-uploaded to a file (340a7fb0…, stored under the FSR
-- branch folder) that is byte-for-byte identical to EMSI's branded logo
-- (a748e2fa…, "Azenion Infinity 1.0 EMSI.svg"). Both branches therefore
-- rendered the same mark even though their logo_url values were distinct.
--
-- Restore independence by pointing FSR back at the generic Azenion infinity
-- mark (d66ec35f…), the same value assigned by migration 00065. EMSI keeps
-- its own branded logo. No logo files are changed; only the data mapping.
-- (No-op on environments where migration 00065 already applied and FSR was
-- not subsequently re-uploaded.)

update public.branches
set logo_url =
    'https://kyhlpbgobvfewvrqtqfn.supabase.co/storage/v1/object/public/branch-assets/00000000-0000-0000-0000-000000000000/logos/d66ec35f-83ba-40cc-addd-879ca5708213.svg'
where slug = 'fsr';
