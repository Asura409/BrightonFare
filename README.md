# BrightonFare

A standalone student outreach form for City4Christ. A representative shows the QR code in person; the QR opens this form. On submission, the student receives one introduction email with a link to the public [I'm New page](https://city4christ.org/im-new/). The form does not enrol anyone in ongoing mail.

## Stack

- Next.js on Vercel: form and server endpoint
- Supabase Postgres: submission and email delivery record
- Resend: one-time welcome email

## Setup

1. Create a Supabase project, install the [Supabase CLI](https://supabase.com/docs/guides/cli), authenticate with `supabase login`, link the project with `supabase link --project-ref YOUR_PROJECT_REF`, and apply the tracked migrations with `supabase db push`. The current migration is in `supabase/migrations/`. The legacy SQL files in `db/` are retained for reference and manual recovery only.
2. Verify a domain you control with Resend. Set `EMAIL_FROM` to an address on that verified domain. Configure its DNS records as instructed by Resend.
3. Copy `.env.example` to `.env.local`, then fill in `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `RESEND_API_KEY` and `EMAIL_FROM`. Create a dedicated `sb_secret_...` key under Supabase Settings > API Keys and keep it and the Resend API key server-side. The older `SUPABASE_SERVICE_ROLE_KEY` is accepted as a fallback during migration.
4. Run `npm install` and `npm run dev`.
5. Deploy the repository to Vercel, set the same environment variables there, and add a subdomain such as `connect.city4christ.org` to the Vercel project. Add the DNS record Vercel specifies in Cloudflare.
6. Test with an address you own. Verify the email, its reply address and link, the saved contact row, a duplicate submission, and the mobile form. Only then generate the QR code using the final HTTPS form URL.

## Production-style local testing with Docker

The Docker image runs the optimized Next.js standalone server, matching the production runtime more closely than `npm run dev`.

1. Create the Docker environment file:

   ```sh
   cp .env.docker.example .env.docker.local
   ```

2. Replace the placeholders in `.env.docker.local` with the same Supabase, Resend and sender values used in production. The local file is ignored by Git and its values are injected only when the container starts.
3. Build and start the app:

   ```sh
   docker compose up --build
   ```

4. Open [http://localhost:3000](http://localhost:3000), submit the form with an email address you control, then verify the database row and welcome email.
5. Stop the environment with `docker compose down`. To use another host port, change `APP_PORT` in `.env.docker.local`.

This setup intentionally connects to the configured hosted Supabase and Resend services so the form, database write and email delivery follow the same path as production. Use a separate Supabase project and Resend test sender if you do not want local tests to touch production data.

The server uses a Supabase secret key, with legacy service role JWT support. The table has row-level security enabled with no public policies. The form requires explicit consent for one introductory email and separately asks permission to save a phone number for one follow-up call or text. The server records the consent time and wording version; it does not save a phone number without that separate choice. A unique normalized email prevents duplicate records. Resend's idempotency key prevents accidental duplicate welcome messages during retries. A honeypot field reduces basic form spam; for a large public campaign, add a managed bot challenge and request rate limits.

If a delivery fails, the record is marked `failed`; the student can submit again. The site does not provide an admin console: authorized staff can review rows in Supabase. Set a retention process for these contacts before the campaign goes live and update the privacy notice with your precise policy and provider details.
