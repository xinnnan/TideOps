do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'operations managers can read field media'
  ) then
    create policy "operations managers can read field media"
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'field-media'
      and public.is_operations_manager()
    );
  end if;
end
$$;
