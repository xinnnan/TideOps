# TideOps

TideOps is a field operations workspace for service teams.

It is built to support the real day-to-day flow on site:

- clock in before work
- complete the safety check-in before the shift starts
- submit a short daily report before leaving
- capture incidents with clear follow-up and photos
- keep companies, customers, sites, projects, and user access in one place

The app is mobile-first, supports both `English` and `中文`, and runs on real Supabase data.

## Who It Is For

TideOps is designed for two main roles:

- `Service engineers`
  They use the app for attendance, safety check-ins, daily reports, incidents, leave requests, and account updates.
- `Operations managers`
  They can do the same field workflows, and also manage users, companies, customers, sites, projects, assignments, summaries, approvals, and record cleanup.

## What Users Can Do

### Field Workflow

- Clock in and out
- Submit leave requests
- Complete safety check-ins with task types, hazards, PPE, and briefing topics
- Write short daily reports with item-level photos
- Log incidents with item-level photos and follow-up actions
- Export safety check-ins, daily reports, and incidents as PDF

### Operations Workflow

- Review attendance and leave
- View weekly and monthly summaries
- Manage platform users and project assignments
- Manage companies, customers, sites, and projects
- Control project sharing and customer-facing delivery company display
- Delete incorrect attendance, safety, report, and incident records when needed

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Create your local environment file

```bash
cp .env.example .env.local
```

3. Add the browser-safe Supabase values to `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

4. Start the app

```bash
npm run dev
```

Then open [http://localhost:3000/login](http://localhost:3000/login).

## First-Time Supabase Setup

Detailed setup notes are in [docs/supabase-setup.md](./docs/supabase-setup.md).

The short version:

1. Create a Supabase project.
2. Enable email/password sign-in.
3. Run the SQL files in `supabase/migrations`.
4. Create the first auth user.
5. Promote that user to `operations_manager` and set `home_company_id`.
6. Add the TideOps email templates from `supabase/templates`.

## Deploy To Vercel

1. Import this repository into Vercel.
2. Add these environment variables in `Project Settings -> Environment Variables`:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Deploy the project.
4. Copy the production URL.
5. In Supabase `Authentication -> URL Configuration`, update:
   - `Site URL`
   - redirect allow list
6. Make sure the allow list includes at least:
   - `/login`
   - `/reset-password`

## Notes For Public Repositories

- This repository is public.
- Keep real runtime values only in `.env.local` or Vercel environment variables.
- Do not commit `SUPABASE_SERVICE_ROLE_KEY`.
- `.env.local` is ignored by git.
- `field_service_safety_reporting_prd.md` stays local and is ignored by git.

## Helpful Files

- [docs/supabase-setup.md](./docs/supabase-setup.md)
- [docs/supabase-email-templates.md](./docs/supabase-email-templates.md)
- [supabase/migrations](./supabase/migrations)
- [supabase/templates](./supabase/templates)

## Current App Areas

- `Attendance`
- `Safety`
- `Daily Report`
- `Incident`
- `Admin`

If you are deploying this for the first time, start with Supabase setup, then deploy to Vercel, then test:

- login
- forgot password
- reset password
- attendance
- safety check-in
- daily report
- incident export
