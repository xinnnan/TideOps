alter table public.daily_reports
add column if not exists attachments_json jsonb not null default '[]'::jsonb;

alter table public.incidents
add column if not exists attachments_json jsonb not null default '[]'::jsonb;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'field-media',
  'field-media',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'field media authenticated upload'
  ) then
    create policy "field media authenticated upload"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'field-media'
      and (storage.foldername(name))[1] = auth.uid()::text
    );
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
      and policyname = 'field media owner read'
  ) then
    create policy "field media owner read"
    on storage.objects
    for select
    to authenticated
    using (
      bucket_id = 'field-media'
      and owner_id = auth.uid()::text
    );
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
      and policyname = 'field media owner update'
  ) then
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
      and policyname = 'field media owner delete'
  ) then
    create policy "field media owner delete"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'field-media'
      and owner_id = auth.uid()::text
    );
  end if;
end
$$;
