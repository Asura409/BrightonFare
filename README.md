# BrightonFare

A standalone student outreach form for City4Christ. A representative shows the QR code in person; the QR opens this form. On submission, the student receives one introduction email with a link to the public [I'm New page](https://city4christ.org/im-new/). The form does not enrol anyone in ongoing mail.

## Stack

- Next.js on Vercel: form and server endpoint
- Supabase Postgres: submission and email delivery record
- Resend: one-time welcome email

## Setup

1. Create a Supabase project and run `db/schema.sql` in its SQL editor. If you ran the previous version of that file already, run `db/002_consent_fields.sql` instead.
2. Verify a domain you control with Resend. Set `EMAIL_FROM` to an address on that verified domain. Configure its DNS records as instructed by Resend.
3. Copy `.env.example` to `.env.local`, then fill in `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `RESEND_API_KEY` and `EMAIL_FROM`. Create a dedicated `sb_secret_...` key under Supabase Settings > API Keys and keep it and the Resend API key server-side. The older `SUPABASE_SERVICE_ROLE_KEY` is accepted as a fallback during migration.
4. Run `npm install` and `npm run dev`.
5. Deploy the repository to Vercel, set the same environment variables there, and add a subdomain such as `connect.city4christ.org` to the Vercel project. Add the DNS record Vercel specifies in Cloudflare.
6. Test with an address you own. Verify the email, its reply address and link, the saved contact row, a duplicate submission, and the mobile form. Only then generate the QR code using the final HTTPS form URL.

The server uses a Supabase secret key, with legacy service role JWT support. The table has row-level security enabled with no public policies. The form requires explicit consent for one introductory email and separately asks permission to save a phone number for one follow-up call or text. The server records the consent time and wording version; it does not save a phone number without that separate choice. A unique normalized email prevents duplicate records. Resend's idempotency key prevents accidental duplicate welcome messages during retries. A honeypot field reduces basic form spam; for a large public campaign, add a managed bot challenge and request rate limits.

If a delivery fails, the record is marked `failed`; the student can submit again. The site does not provide an admin console: authorized staff can review rows in Supabase. Set a retention process for these contacts before the campaign goes live and update the privacy notice with your precise policy and provider details.
