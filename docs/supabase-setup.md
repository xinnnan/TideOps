# Supabase Setup

This app is intended for a public GitHub repository with private runtime configuration. Keep secrets out of git and put real values only in `.env.local`.

## 1. Create the Supabase Project

1. Create a new Supabase project.
2. In `Project Settings -> API`, copy:
   - `Project URL`
   - `Publishable key`
3. In `Authentication -> Providers -> Email`, enable email/password sign-in.
4. For local testing only, you can disable email confirmation if you want faster account setup.
5. If you want branded sign-up and password-reset emails, follow [supabase-email-templates.md](./supabase-email-templates.md).

## 2. Configure Local Environment

Create `.env.local` in the project root:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Rules:

- Commit `.env.example`, never `.env.local`.
- Do not put `service_role` in the browser app.
- Do not paste secrets into source files, migrations, or README content.

## 3. Run the Database Migration

Use either the Supabase SQL Editor or the Supabase CLI.

### Option A: SQL Editor

Open the file below and run it in the SQL Editor:

- `supabase/migrations/20260404233000_init_mvp.sql`

This migration creates:

- Auth-linked `public.profiles`
- Configurable `companies`, `clients`, `sites`, and `projects`
- `project_company_shares` for cross-company sharing
- Attendance, leave, safety, report, incident, and audit tables
- RLS policies
- An `auth.users -> public.profiles` trigger for automatic profile bootstrap

### Option B: Supabase CLI

```bash
supabase link --project-ref your-project-ref
supabase db push
```

## 4. Create the First User

In `Authentication -> Users`, create your first user with email and password.

After the user is created, the migration trigger should automatically insert a row into `public.profiles`.

Check it with:

```sql
select id, email, role, home_company_id
from public.profiles
order by created_at desc;
```

The first user will default to:

- `role = service_engineer`
- `home_company_id = null`

That is expected.

## 5. Bootstrap the First Company and First Operations Manager

Before the app admin screen can manage workspace data, create the first company and promote the first user.

### Step 5.1 Create the first company

```sql
insert into public.companies (
  name,
  legal_name,
  primary_color,
  support_email,
  brand_line
)
values (
  'Your Company',
  'Your Company LLC',
  '#0f766e',
  'ops@yourcompany.com',
  'Field Service Delivery'
)
returning id, name;
```

### Step 5.2 Promote the first user

Replace the placeholders before running:

```sql
update public.profiles
set
  role = 'operations_manager',
  home_company_id = 'YOUR_COMPANY_UUID'
where email = 'YOUR_LOGIN_EMAIL';
```

At this point, that user can log in and use the app admin screen to create:

- Additional companies
- Clients
- Sites
- Projects
- Project sharing relationships
- Customer-facing delivery brand per project

## 6. Configure Multi-Company Projects

Inside the TideOps admin screen:

1. Create all internal companies first.
2. Create the client.
3. Create the site.
4. Create the project.
5. Set:
   - `Managing company`
   - `Customer-facing brand`
   - `Shared companies` if the project should be visible across multiple companies

Semantics:

- `Managing company`: the internal owner of the project
- `Customer-facing brand`: the brand rendered in customer-visible delivery flows
- `Shared companies`: additional companies that should be able to work the project

## 7. Assign Users to Companies

Every user should have a `home_company_id`.

Example:

```sql
update public.profiles
set home_company_id = 'COMPANY_UUID'
where email = 'engineer@yourcompany.com';
```

Users can already access projects when their home company is:

- The managing company
- The customer-facing company
- A shared company on the project

## 8. Optional: Add Explicit Project Assignments

The current UI already works with company-based project visibility. If you also want explicit project staffing, insert rows into `public.project_assignments`.

Example:

```sql
insert into public.project_assignments (
  user_id,
  project_id,
  assignment_role,
  start_date,
  active
)
values (
  'USER_UUID',
  'PROJECT_UUID',
  'Lead Technician',
  current_date,
  true
);
```

## 9. Run the App

```bash
npm install
npm run dev
```

Open:

- [http://localhost:3000/login](http://localhost:3000/login)

Sign in with the user you created in Supabase Auth.

## 10. Security Checklist

- Keep `.env.local` local only.
- Never commit the Supabase service role key.
- Do not expose database passwords in any frontend code.
- Keep all privileged bootstrap SQL inside the Supabase dashboard or your private terminal session.
- If you need server-only automation later, store its secrets in server-only env vars, not `NEXT_PUBLIC_*`.

## 11. Useful Queries

See current users:

```sql
select id, full_name, email, role, home_company_id
from public.profiles
order by created_at;
```

See projects with brand and sharing:

```sql
select
  p.id,
  p.name,
  manager.name as managing_company,
  brand.name as customer_facing_brand,
  p.is_shared
from public.projects p
join public.companies manager on manager.id = p.managing_company_id
join public.companies brand on brand.id = p.customer_facing_company_id
order by p.created_at desc;
```

See shared companies:

```sql
select
  p.name as project_name,
  c.name as shared_company,
  pcs.active
from public.project_company_shares pcs
join public.projects p on p.id = pcs.project_id
join public.companies c on c.id = pcs.company_id
order by p.name, c.name;
```
