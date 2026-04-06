do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'attendance_logs'
      and policyname = 'operations managers can delete attendance logs'
  ) then
    create policy "operations managers can delete attendance logs"
    on public.attendance_logs
    for delete
    to authenticated
    using (public.is_operations_manager());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'safety_checkins'
      and policyname = 'operations managers can delete safety checkins'
  ) then
    create policy "operations managers can delete safety checkins"
    on public.safety_checkins
    for delete
    to authenticated
    using (public.is_operations_manager());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'daily_reports'
      and policyname = 'operations managers can delete daily reports'
  ) then
    create policy "operations managers can delete daily reports"
    on public.daily_reports
    for delete
    to authenticated
    using (public.is_operations_manager());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'incidents'
      and policyname = 'operations managers can delete incidents'
  ) then
    create policy "operations managers can delete incidents"
    on public.incidents
    for delete
    to authenticated
    using (public.is_operations_manager());
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'operations managers can delete field media'
  ) then
    create policy "operations managers can delete field media"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'field-media'
      and public.is_operations_manager()
    );
  end if;
end
$$;
