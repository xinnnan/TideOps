alter table public.daily_reports
add column if not exists field_crew_json jsonb not null default '[]'::jsonb;

update public.daily_reports
set field_crew_json = '[]'::jsonb
where field_crew_json is null;
