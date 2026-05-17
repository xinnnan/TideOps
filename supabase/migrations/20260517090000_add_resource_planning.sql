create table if not exists public.resource_people (
  id uuid primary key default gen_random_uuid(),
  linked_user_id uuid references public.profiles(id) on delete set null,
  display_name text not null,
  resource_type text not null default 'placeholder',
  home_company_id uuid references public.companies(id),
  title text,
  skills_json jsonb not null default '[]'::jsonb,
  capacity_hours_per_day numeric(4,2) not null default 8,
  active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resource_people_type_check check (resource_type in ('platform_user', 'placeholder')),
  constraint resource_people_capacity_check check (capacity_hours_per_day >= 0 and capacity_hours_per_day <= 24)
);

create unique index if not exists idx_resource_people_linked_user_id_unique
on public.resource_people(linked_user_id)
where linked_user_id is not null;

create index if not exists idx_resource_people_home_company_id
on public.resource_people(home_company_id);

create table if not exists public.resource_allocations (
  id uuid primary key default gen_random_uuid(),
  resource_id uuid not null references public.resource_people(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  planned_hours_per_day numeric(4,2) not null default 8,
  allocation_percent integer not null default 100,
  role_label text,
  status text not null default 'tentative',
  notes text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resource_allocations_dates_check check (start_date <= end_date),
  constraint resource_allocations_hours_check check (planned_hours_per_day > 0 and planned_hours_per_day <= 24),
  constraint resource_allocations_percent_check check (allocation_percent > 0 and allocation_percent <= 200),
  constraint resource_allocations_status_check check (status in ('tentative', 'confirmed'))
);

create index if not exists idx_resource_allocations_resource_date
on public.resource_allocations(resource_id, start_date, end_date);

create index if not exists idx_resource_allocations_project_date
on public.resource_allocations(project_id, start_date, end_date);

drop trigger if exists set_resource_people_updated_at on public.resource_people;
create trigger set_resource_people_updated_at
before update on public.resource_people
for each row execute function public.set_updated_at();

drop trigger if exists set_resource_allocations_updated_at on public.resource_allocations;
create trigger set_resource_allocations_updated_at
before update on public.resource_allocations
for each row execute function public.set_updated_at();

create or replace function public.sync_resource_person_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.resource_people (
    linked_user_id,
    display_name,
    resource_type,
    home_company_id,
    title,
    active,
    created_by
  )
  values (
    new.id,
    new.full_name,
    'platform_user',
    new.home_company_id,
    new.title,
    coalesce(new.status, 'active') <> 'inactive',
    new.id
  )
  on conflict (linked_user_id)
  where linked_user_id is not null
  do update set
    display_name = excluded.display_name,
    home_company_id = excluded.home_company_id,
    title = excluded.title,
    active = excluded.active,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_resource_person_after_profile_change on public.profiles;
create trigger sync_resource_person_after_profile_change
after insert or update of full_name, home_company_id, title, status on public.profiles
for each row execute function public.sync_resource_person_from_profile();

insert into public.resource_people (
  linked_user_id,
  display_name,
  resource_type,
  home_company_id,
  title,
  active,
  created_by
)
select
  profile.id,
  profile.full_name,
  'platform_user',
  profile.home_company_id,
  profile.title,
  coalesce(profile.status, 'active') <> 'inactive',
  profile.id
from public.profiles profile
on conflict (linked_user_id)
where linked_user_id is not null
do update set
  display_name = excluded.display_name,
  home_company_id = excluded.home_company_id,
  title = excluded.title,
  active = excluded.active,
  updated_at = now();

alter table public.resource_people enable row level security;
alter table public.resource_allocations enable row level security;

drop policy if exists "operations managers can read resource people" on public.resource_people;
create policy "operations managers can read resource people"
on public.resource_people
for select
to authenticated
using (public.is_operations_manager());

drop policy if exists "operations managers can mutate resource people" on public.resource_people;
create policy "operations managers can mutate resource people"
on public.resource_people
for all
to authenticated
using (public.is_operations_manager())
with check (public.is_operations_manager());

drop policy if exists "operations managers can read resource allocations" on public.resource_allocations;
create policy "operations managers can read resource allocations"
on public.resource_allocations
for select
to authenticated
using (public.is_operations_manager());

drop policy if exists "operations managers can mutate resource allocations" on public.resource_allocations;
create policy "operations managers can mutate resource allocations"
on public.resource_allocations
for all
to authenticated
using (public.is_operations_manager())
with check (public.is_operations_manager());
