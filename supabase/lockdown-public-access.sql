-- Emergency access lockdown for project tmtohbsrcqmlxhaaenbt.
-- Does not delete rows or tables. Existing browser clients using only the anon key
-- will no longer be able to read or write these four tables until role-based
-- authentication policies are installed.
begin;

alter table public.students enable row level security;
alter table public.activities enable row level security;
alter table public.check_in_logs enable row level security;
alter table public.reflections enable row level security;

drop policy if exists "Allow public access to students" on public.students;
drop policy if exists "Allow public access to activities" on public.activities;
drop policy if exists "Allow public access to check_in_logs" on public.check_in_logs;
drop policy if exists "Allow public access to reflections" on public.reflections;

commit;
