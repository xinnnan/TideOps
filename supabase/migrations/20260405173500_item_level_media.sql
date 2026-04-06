alter table public.daily_reports
add column if not exists major_tasks_items_json jsonb not null default '[]'::jsonb;

alter table public.daily_reports
add column if not exists blocker_items_json jsonb not null default '[]'::jsonb;

alter table public.daily_reports
add column if not exists next_day_plan_items_json jsonb not null default '[]'::jsonb;

alter table public.incidents
add column if not exists fact_items_json jsonb not null default '[]'::jsonb;

alter table public.incidents
add column if not exists immediate_action_items_json jsonb not null default '[]'::jsonb;

alter table public.incidents
add column if not exists follow_up_items_json jsonb not null default '[]'::jsonb;
