-- Run once in the Supabase SQL editor. Keep the service role key on the server only.
create table if not exists public.outreach_contacts (
  id uuid primary key default gen_random_uuid(),
  first_name text not null check (length(first_name) between 1 and 80),
  email text not null unique check (email = lower(email)),
  source text not null default 'brighton-university-qr',
  welcome_status text not null default 'pending' check (welcome_status in ('pending', 'sent', 'failed')),
  welcome_sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.outreach_contacts enable row level security;
-- No public policies: only the server-side service role may read/write submissions.
