create sequence if not exists public.safety_checkin_record_number_seq
start with 100001;

create sequence if not exists public.daily_report_record_number_seq
start with 200001;

create sequence if not exists public.incident_record_number_seq
start with 300001;

alter table public.safety_checkins
add column if not exists record_number bigint;

alter table public.daily_reports
add column if not exists record_number bigint;

alter table public.incidents
add column if not exists record_number bigint;

alter table public.safety_checkins
alter column record_number set default nextval('public.safety_checkin_record_number_seq');

alter table public.daily_reports
alter column record_number set default nextval('public.daily_report_record_number_seq');

alter table public.incidents
alter column record_number set default nextval('public.incident_record_number_seq');

update public.safety_checkins
set record_number = nextval('public.safety_checkin_record_number_seq')
where record_number is null;

update public.daily_reports
set record_number = nextval('public.daily_report_record_number_seq')
where record_number is null;

update public.incidents
set record_number = nextval('public.incident_record_number_seq')
where record_number is null;

select setval(
  'public.safety_checkin_record_number_seq',
  greatest(coalesce((select max(record_number) from public.safety_checkins), 100000), 100000),
  true
);

select setval(
  'public.daily_report_record_number_seq',
  greatest(coalesce((select max(record_number) from public.daily_reports), 200000), 200000),
  true
);

select setval(
  'public.incident_record_number_seq',
  greatest(coalesce((select max(record_number) from public.incidents), 300000), 300000),
  true
);

alter sequence public.safety_checkin_record_number_seq
owned by public.safety_checkins.record_number;

alter sequence public.daily_report_record_number_seq
owned by public.daily_reports.record_number;

alter sequence public.incident_record_number_seq
owned by public.incidents.record_number;

alter table public.safety_checkins
drop constraint if exists safety_checkins_author_user_id_project_id_date_key;

alter table public.daily_reports
drop constraint if exists daily_reports_author_user_id_project_id_date_key;

create unique index if not exists idx_safety_checkins_record_number_unique
on public.safety_checkins(record_number);

create unique index if not exists idx_daily_reports_record_number_unique
on public.daily_reports(record_number);

create unique index if not exists idx_incidents_record_number_unique
on public.incidents(record_number);
