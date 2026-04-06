create extension if not exists pgcrypto;

create type public.app_role as enum ('operations_manager', 'service_engineer');
create type public.project_status as enum ('planning', 'active', 'paused');
create type public.attendance_status as enum (
  'present',
  'partial',
  'missing_clock_out',
  'missing_clock_in',
  'leave'
);
create type public.leave_status as enum (
  'draft',
  'submitted',
  'approved',
  'rejected',
  'cancelled'
);
create type public.leave_type as enum (
  'vacation',
  'sick',
  'personal',
  'unpaid',
  'other'
);
create type public.record_status as enum (
  'draft',
  'submitted',
  'completed',
  'reviewed',
  'archived'
);
create type public.incident_status as enum ('open', 'under_review', 'closed');
create type public.incident_severity as enum ('low', 'medium', 'high');
create type public.issue_status as enum (
  'resolved',
  'monitoring',
  'pending',
  'escalated'
);
create type public.contact_type as enum (
  'customer',
  'internal',
  'site_contact',
  'project_contact'
);
create type public.visibility_scope as enum ('internal_only', 'customer_facing');

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  legal_name text not null,
  brand_line text,
  logo_url text,
  primary_color text,
  email_footer text,
  support_email text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  external_code text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  address text,
  timezone text not null default 'America/New_York',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, name)
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null,
  managing_company_id uuid not null references public.companies(id),
  customer_facing_company_id uuid not null references public.companies(id),
  is_shared boolean not null default false,
  status public.project_status not null default 'planning',
  shift_start_time time,
  shift_end_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (site_id, name)
);

create table public.project_company_shares (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, company_id)
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role public.app_role not null default 'service_engineer',
  title text,
  home_company_id uuid references public.companies(id),
  phone text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  assignment_role text not null,
  start_date date not null,
  end_date date,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  client_id uuid references public.clients(id),
  site_id uuid references public.sites(id),
  project_id uuid references public.projects(id),
  name text not null,
  company text,
  email text not null,
  phone text,
  title text,
  contact_type public.contact_type not null,
  visibility_scope public.visibility_scope not null default 'internal_only',
  created_by uuid not null references public.profiles(id),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  home_company_id uuid not null references public.companies(id),
  project_id uuid references public.projects(id),
  service_company_id uuid references public.companies(id),
  date date not null,
  clock_in_time timestamptz,
  clock_out_time timestamptz,
  clock_in_location text,
  clock_out_location text,
  note text,
  attendance_status public.attendance_status not null default 'partial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references public.profiles(id) on delete cascade,
  home_company_id uuid not null references public.companies(id),
  leave_type public.leave_type not null,
  start_date date not null,
  end_date date not null,
  partial_day_flag boolean not null default false,
  reason text,
  status public.leave_status not null default 'draft',
  manager_comment text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leave_requests_dates_check check (start_date <= end_date)
);

create table public.safety_checkins (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  site_id uuid not null references public.sites(id),
  project_id uuid not null references public.projects(id),
  render_company_id uuid not null references public.companies(id),
  date date not null,
  shift text not null,
  author_user_id uuid not null references public.profiles(id),
  facilitator text,
  planned_start_time time,
  planned_end_time time,
  task_types_json jsonb not null default '[]'::jsonb,
  hazard_flags_json jsonb not null default '[]'::jsonb,
  ppe_flags_json jsonb not null default '[]'::jsonb,
  briefing_topic text,
  notes text,
  status public.record_status not null default 'draft',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (author_user_id, project_id, date)
);

create table public.daily_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  site_id uuid not null references public.sites(id),
  project_id uuid not null references public.projects(id),
  render_company_id uuid not null references public.companies(id),
  safety_checkin_id uuid references public.safety_checkins(id),
  date date not null,
  shift text not null,
  author_user_id uuid not null references public.profiles(id),
  major_tasks text,
  start_time time,
  end_time time,
  labor_hours numeric(6,2),
  issue_summary text,
  corrective_action text,
  issue_status public.issue_status not null default 'pending',
  next_day_plan text,
  blockers text,
  status public.record_status not null default 'draft',
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (author_user_id, project_id, date)
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id),
  site_id uuid not null references public.sites(id),
  project_id uuid not null references public.projects(id),
  render_company_id uuid not null references public.companies(id),
  reporter_user_id uuid not null references public.profiles(id),
  occurred_at timestamptz not null,
  incident_type text not null,
  severity public.incident_severity not null,
  description text not null,
  immediate_action text,
  escalation_required boolean not null default false,
  corrective_action text,
  status public.incident_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id),
  entity_type text not null,
  entity_id text not null,
  action text not null,
  old_value_json jsonb,
  new_value_json jsonb,
  created_at timestamptz not null default now()
);

create index idx_sites_client_id on public.sites(client_id);
create index idx_projects_client_id on public.projects(client_id);
create index idx_projects_site_id on public.projects(site_id);
create index idx_projects_managing_company_id on public.projects(managing_company_id);
create index idx_projects_customer_facing_company_id on public.projects(customer_facing_company_id);
create index idx_project_company_shares_project_id on public.project_company_shares(project_id);
create index idx_project_company_shares_company_id on public.project_company_shares(company_id);
create index idx_project_assignments_user_id on public.project_assignments(user_id);
create index idx_project_assignments_project_id on public.project_assignments(project_id);
create index idx_contacts_project_id on public.contacts(project_id);
create index idx_contacts_created_by on public.contacts(created_by);
create index idx_attendance_logs_user_date on public.attendance_logs(user_id, date desc);
create index idx_leave_requests_requester_dates on public.leave_requests(requester_user_id, start_date desc);
create index idx_safety_checkins_project_date on public.safety_checkins(project_id, date desc);
create index idx_daily_reports_project_date on public.daily_reports(project_id, date desc);
create index idx_incidents_project_status on public.incidents(project_id, status);
create index idx_audit_logs_entity on public.audit_logs(entity_type, entity_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.sync_project_shared_flag()
returns trigger
language plpgsql
as $$
declare
  target_project_id uuid;
begin
  target_project_id := coalesce(new.project_id, old.project_id);

  update public.projects
  set is_shared = exists (
    select 1
    from public.project_company_shares
    where project_id = target_project_id
      and active
  )
  where id = target_project_id;

  return coalesce(new, old);
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, title)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(new.email, ''), '@', 1)),
    coalesce(new.email, ''),
    nullif(new.raw_user_meta_data ->> 'title', '')
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      title = coalesce(public.profiles.title, excluded.title),
      updated_at = now();

  return new;
end;
$$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.current_home_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select home_company_id
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.is_operations_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'operations_manager', false);
$$;

create or replace function public.has_active_assignment(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_assignments assignment
    where assignment.project_id = project_uuid
      and assignment.user_id = auth.uid()
      and assignment.active
      and (assignment.end_date is null or assignment.end_date >= current_date)
  );
$$;

create or replace function public.can_access_project(project_uuid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects project
    where project.id = project_uuid
      and (
        public.is_operations_manager()
        or public.has_active_assignment(project.id)
        or project.managing_company_id = public.current_home_company_id()
        or project.customer_facing_company_id = public.current_home_company_id()
        or exists (
          select 1
          from public.project_company_shares share
          where share.project_id = project.id
            and share.company_id = public.current_home_company_id()
            and share.active
        )
      )
  );
$$;

create trigger set_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

create trigger set_clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create trigger set_sites_updated_at
before update on public.sites
for each row execute function public.set_updated_at();

create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger set_project_company_shares_updated_at
before update on public.project_company_shares
for each row execute function public.set_updated_at();

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_project_assignments_updated_at
before update on public.project_assignments
for each row execute function public.set_updated_at();

create trigger set_contacts_updated_at
before update on public.contacts
for each row execute function public.set_updated_at();

create trigger set_attendance_logs_updated_at
before update on public.attendance_logs
for each row execute function public.set_updated_at();

create trigger set_leave_requests_updated_at
before update on public.leave_requests
for each row execute function public.set_updated_at();

create trigger set_safety_checkins_updated_at
before update on public.safety_checkins
for each row execute function public.set_updated_at();

create trigger set_daily_reports_updated_at
before update on public.daily_reports
for each row execute function public.set_updated_at();

create trigger set_incidents_updated_at
before update on public.incidents
for each row execute function public.set_updated_at();

create trigger sync_project_shared_flag_after_insert
after insert on public.project_company_shares
for each row execute function public.sync_project_shared_flag();

create trigger sync_project_shared_flag_after_update
after update on public.project_company_shares
for each row execute function public.sync_project_shared_flag();

create trigger sync_project_shared_flag_after_delete
after delete on public.project_company_shares
for each row execute function public.sync_project_shared_flag();

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.companies enable row level security;
alter table public.clients enable row level security;
alter table public.sites enable row level security;
alter table public.projects enable row level security;
alter table public.project_company_shares enable row level security;
alter table public.profiles enable row level security;
alter table public.project_assignments enable row level security;
alter table public.contacts enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.leave_requests enable row level security;
alter table public.safety_checkins enable row level security;
alter table public.daily_reports enable row level security;
alter table public.incidents enable row level security;
alter table public.audit_logs enable row level security;

create policy "accessible companies are readable"
on public.companies
for select
to authenticated
using (
  public.is_operations_manager()
  or id = public.current_home_company_id()
  or exists (
    select 1
    from public.projects project
    where (
      project.managing_company_id = public.companies.id
      or project.customer_facing_company_id = public.companies.id
    )
      and public.can_access_project(project.id)
  )
  or exists (
    select 1
    from public.project_company_shares share
    where share.company_id = public.companies.id
      and share.active
      and public.can_access_project(share.project_id)
  )
);

create policy "operations managers can mutate companies"
on public.companies
for all
to authenticated
using (public.is_operations_manager())
with check (public.is_operations_manager());

create policy "accessible clients are readable"
on public.clients
for select
to authenticated
using (
  public.is_operations_manager()
  or exists (
    select 1
    from public.projects project
    where project.client_id = public.clients.id
      and public.can_access_project(project.id)
  )
);

create policy "operations managers can mutate clients"
on public.clients
for all
to authenticated
using (public.is_operations_manager())
with check (public.is_operations_manager());

create policy "accessible sites are readable"
on public.sites
for select
to authenticated
using (
  public.is_operations_manager()
  or exists (
    select 1
    from public.projects project
    where project.site_id = public.sites.id
      and public.can_access_project(project.id)
  )
);

create policy "operations managers can mutate sites"
on public.sites
for all
to authenticated
using (public.is_operations_manager())
with check (public.is_operations_manager());

create policy "project visibility follows assignments and sharing"
on public.projects
for select
to authenticated
using (
  public.is_operations_manager()
  or public.has_active_assignment(id)
  or managing_company_id = public.current_home_company_id()
  or customer_facing_company_id = public.current_home_company_id()
  or exists (
    select 1
    from public.project_company_shares share
    where share.project_id = public.projects.id
      and share.company_id = public.current_home_company_id()
      and share.active
  )
);

create policy "operations managers can mutate projects"
on public.projects
for all
to authenticated
using (public.is_operations_manager())
with check (public.is_operations_manager());

create policy "project share visibility follows project access"
on public.project_company_shares
for select
to authenticated
using (
  public.is_operations_manager()
  or company_id = public.current_home_company_id()
  or public.can_access_project(project_id)
);

create policy "operations managers can mutate project shares"
on public.project_company_shares
for all
to authenticated
using (public.is_operations_manager())
with check (public.is_operations_manager());

create policy "users can read own profile and operations can read all"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_operations_manager());

create policy "operations managers can insert profiles"
on public.profiles
for insert
to authenticated
with check (public.is_operations_manager());

create policy "operations managers can update profiles"
on public.profiles
for update
to authenticated
using (public.is_operations_manager())
with check (public.is_operations_manager());

create policy "users can read own assignments and operations can read all"
on public.project_assignments
for select
to authenticated
using (user_id = auth.uid() or public.is_operations_manager());

create policy "operations managers can mutate assignments"
on public.project_assignments
for all
to authenticated
using (public.is_operations_manager())
with check (public.is_operations_manager());

create policy "contacts are readable to creator, project viewers, and operations"
on public.contacts
for select
to authenticated
using (
  public.is_operations_manager()
  or created_by = auth.uid()
  or (project_id is not null and public.can_access_project(project_id))
);

create policy "operations managers can mutate contacts"
on public.contacts
for all
to authenticated
using (public.is_operations_manager())
with check (public.is_operations_manager());

create policy "users can read own attendance and operations can read all"
on public.attendance_logs
for select
to authenticated
using (user_id = auth.uid() or public.is_operations_manager());

create policy "users can insert own attendance and operations can insert all"
on public.attendance_logs
for insert
to authenticated
with check (user_id = auth.uid() or public.is_operations_manager());

create policy "users can update own attendance and operations can update all"
on public.attendance_logs
for update
to authenticated
using (user_id = auth.uid() or public.is_operations_manager())
with check (user_id = auth.uid() or public.is_operations_manager());

create policy "operations managers can delete attendance logs"
on public.attendance_logs
for delete
to authenticated
using (public.is_operations_manager());

create policy "users can read own leave requests and operations can read all"
on public.leave_requests
for select
to authenticated
using (requester_user_id = auth.uid() or public.is_operations_manager());

create policy "users can insert own leave requests and operations can insert all"
on public.leave_requests
for insert
to authenticated
with check (requester_user_id = auth.uid() or public.is_operations_manager());

create policy "operations managers can update leave requests"
on public.leave_requests
for update
to authenticated
using (public.is_operations_manager())
with check (public.is_operations_manager());

create policy "users can read own safety checkins and operations can read all"
on public.safety_checkins
for select
to authenticated
using (author_user_id = auth.uid() or public.is_operations_manager());

create policy "users can insert own safety checkins and operations can insert all"
on public.safety_checkins
for insert
to authenticated
with check (author_user_id = auth.uid() or public.is_operations_manager());

create policy "users can update own safety checkins and operations can update all"
on public.safety_checkins
for update
to authenticated
using (author_user_id = auth.uid() or public.is_operations_manager())
with check (author_user_id = auth.uid() or public.is_operations_manager());

create policy "operations managers can delete safety checkins"
on public.safety_checkins
for delete
to authenticated
using (public.is_operations_manager());

create policy "users can read own daily reports and operations can read all"
on public.daily_reports
for select
to authenticated
using (author_user_id = auth.uid() or public.is_operations_manager());

create policy "users can insert own daily reports and operations can insert all"
on public.daily_reports
for insert
to authenticated
with check (author_user_id = auth.uid() or public.is_operations_manager());

create policy "users can update own daily reports and operations can update all"
on public.daily_reports
for update
to authenticated
using (author_user_id = auth.uid() or public.is_operations_manager())
with check (author_user_id = auth.uid() or public.is_operations_manager());

create policy "operations managers can delete daily reports"
on public.daily_reports
for delete
to authenticated
using (public.is_operations_manager());

create policy "users can read own incidents and operations can read all"
on public.incidents
for select
to authenticated
using (reporter_user_id = auth.uid() or public.is_operations_manager());

create policy "users can insert own incidents and operations can insert all"
on public.incidents
for insert
to authenticated
with check (reporter_user_id = auth.uid() or public.is_operations_manager());

create policy "users can update own incidents and operations can update all"
on public.incidents
for update
to authenticated
using (reporter_user_id = auth.uid() or public.is_operations_manager())
with check (reporter_user_id = auth.uid() or public.is_operations_manager());

create policy "operations managers can delete incidents"
on public.incidents
for delete
to authenticated
using (public.is_operations_manager());

create policy "operations can read audit logs"
on public.audit_logs
for select
to authenticated
using (public.is_operations_manager());

create policy "authenticated users can insert own audit logs"
on public.audit_logs
for insert
to authenticated
with check (actor_user_id = auth.uid());
