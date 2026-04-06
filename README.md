# TideOps

TideOps is a mobile-first field service operations workspace built from the local PRD. The current app is wired for real Supabase data and models:

- Configurable multi-company workspace
- Project-level customer-facing delivery brand
- Project sharing across selected companies
- Attendance, leave, safety, daily reporting, and incident capture

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- Supabase Auth + Postgres + RLS

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Then open [http://localhost:3000/login](http://localhost:3000/login).

## Supabase Setup

Full setup and bootstrap steps are in [`docs/supabase-setup.md`](./docs/supabase-setup.md).

The short version:

1. Create a Supabase project.
2. Put only browser-safe values in `.env.local`.
3. Run the SQL migration in `supabase/migrations`.
4. Create the first auth user in Supabase.
5. Promote that user to `operations_manager` and assign a home company with SQL.
6. Sign in to TideOps and manage companies, clients, sites, and projects from the app.

## Security Notes

- `.env.local` is ignored by git. Keep secrets there only.
- Do not commit the Supabase service role key.
- The browser app only needs `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `field_service_safety_reporting_prd.md` stays local and is ignored by git.

## Structure

- `src/app` route screens and login flow
- `src/components` app shell, providers, and UI primitives
- `src/lib` domain types, i18n, workspace mapping, and Supabase client helpers
- `supabase/migrations` schema, RLS policies, and auth-profile bootstrap trigger
- `docs/supabase-setup.md` secure Supabase configuration guide
