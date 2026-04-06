do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'field media owner read'
  ) then
    drop policy "field media owner read" on storage.objects;
  end if;

  create policy "field media owner read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'field-media'
    and owner_id = auth.uid()::text
  );
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'field media owner update'
  ) then
    drop policy "field media owner update" on storage.objects;
  end if;

  create policy "field media owner update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'field-media'
    and owner_id = auth.uid()::text
  )
  with check (
    bucket_id = 'field-media'
    and owner_id = auth.uid()::text
  );
end
$$;

do $$
begin
  if exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'field media owner delete'
  ) then
    drop policy "field media owner delete" on storage.objects;
  end if;

  create policy "field media owner delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'field-media'
    and owner_id = auth.uid()::text
  );
end
$$;
