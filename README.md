# TideOps

TideOps is a field operations workspace for service teams. It keeps the daily flow in one place:

- clock in and out
- complete the safety check-in before work
- submit a short daily report before leaving
- capture incidents with item-level photos
- manage companies, customers, sites, projects, and user access

The app is mobile-first, bilingual (`English` / `中文`), and backed by real Supabase data.

## What The App Covers

- Attendance with leave requests and team summaries
- Safety check-in with task types, hazards, and briefing suggestions
- Daily reports with numbered items and per-item photo attachments
- Incidents with numbered items, follow-up tracking, and PDF export
- Admin workspace for users, structure, project sharing, customer-facing company display, and account/password management

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Create your local env file:

```bash
cp .env.example .env.local
```

3. Fill in only the browser-safe Supabase values in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

4. Start the app:

```bash
npm run dev
```

Then open [http://localhost:3000/login](http://localhost:3000/login).

## Supabase Setup

Full setup steps are in [docs/supabase-setup.md](./docs/supabase-setup.md).

Short version:

1. Create a Supabase project.
2. Enable email/password sign-in.
3. Run the SQL files in `supabase/migrations`.
4. Create the first auth user.
5. Promote that user to `operations_manager` and set `home_company_id`.
6. Add the TideOps email templates from `supabase/templates/`.

## Deploy To Vercel

1. Import this repository into Vercel.
2. Add the same two env vars in `Project Settings -> Environment Variables`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Deploy.
4. Copy the Vercel production URL.
5. In Supabase `Authentication -> URL Configuration`, add the Vercel URL to:
   - `Site URL`
   - redirect allow list
6. Make sure the allow list includes:
   - `/login`
   - `/reset-password`

## Security Notes

- This repository is public.
- Keep real runtime values only in `.env.local` or in Vercel project env vars.
- Do not commit `SUPABASE_SERVICE_ROLE_KEY`.
- `.env.local` is ignored by git.
- `field_service_safety_reporting_prd.md` stays local and is ignored by git.

## Project Structure

- `src/app` routes and page entry points
- `src/components` app shell, providers, and UI building blocks
- `src/lib` types, i18n, workspace mapping, PDF export, and Supabase helpers
- `supabase/migrations` schema, RLS, and auth/profile bootstrap SQL
- `supabase/templates` email templates for confirmation and password recovery
- `docs` setup notes for Supabase and email templates
