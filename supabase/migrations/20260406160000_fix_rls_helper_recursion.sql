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
