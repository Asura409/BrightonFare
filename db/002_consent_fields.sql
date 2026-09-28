-- Run this once if you already ran db/schema.sql before the consent update.
alter table public.outreach_contacts
  add column if not exists last_name text,
  add column if not exists phone text,
  add column if not exists phone_contact_opt_in boolean not null default false,
  add column if not exists phone_consented_at timestamptz,
  add column if not exists consent_at timestamptz,
  add column if not exists consent_version text;

-- Existing contacts remain valid without a consent record; do not infer consent for them.
