import fs from 'node:fs';
import { REAL_FACULTY_ACTIVITIES } from '../src/data/realActivities.ts';

const quote = value => value == null ? 'null' : `'${String(value).replaceAll("'", "''")}'`;
const fields = [
  ['id', 'id'], ['name', 'name'], ['date', 'date'], ['end_date', 'endDate'],
  ['location', 'location'], ['description', 'description'], ['status', 'status'],
  ['hours', 'hours'], ['category', 'category'], ['year_level', 'yearLevel'],
  ['cohort', 'cohort'], ['schedule_status', 'scheduleStatus'],
  ['original_schedule', 'originalSchedule'], ['new_schedule', 'newSchedule'],
  ['duration', 'duration']
];

if (REAL_FACULTY_ACTIVITIES.length !== 18 || new Set(REAL_FACULTY_ACTIVITIES.map(a => a.id)).size !== 18) {
  throw new Error('Expected exactly 18 distinct faculty activities');
}

const ddl = `-- Add editable activity details and copy the 18 bundled faculty activities into
-- the central database. Existing cloud activities are never overwritten.
begin;
alter table public.activities add column if not exists start_time text;
alter table public.activities add column if not exists end_time text;
alter table public.activities add column if not exists category text;
alter table public.activities add column if not exists year_level text;
alter table public.activities add column if not exists cohort text;
alter table public.activities add column if not exists points numeric;
alter table public.activities add column if not exists capacity integer;
alter table public.activities add column if not exists assigned_staff_emails text[] not null default '{}';
alter table public.activities add column if not exists self_check_in_allowed boolean not null default false;
alter table public.activities add column if not exists schedule_status text;
alter table public.activities add column if not exists original_schedule text;
alter table public.activities add column if not exists new_schedule text;
alter table public.activities add column if not exists duration text;
alter table public.activities add column if not exists note text;
alter table public.activities add column if not exists is_imported boolean not null default false;
alter table public.activities add column if not exists source text;
create index if not exists activities_by_cohort_date on public.activities(cohort, date);
do $$
declare table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array['activities', 'check_in_logs', 'reflections', 'students'] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = table_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end loop;
  end if;
end;
$$;
\n`;
const columns = [...fields.map(([column]) => column), 'is_imported', 'source'];
const rows = REAL_FACULTY_ACTIVITIES.map(activity => {
  const values = fields.map(([column, property]) => column === 'hours' ? String(activity[property] ?? 0) : quote(column === 'status' ? 'completed' : activity[property]));
  values.push('true', "'imported'");
  return `  (${values.join(', ')})`;
});
const sql = ddl + `insert into public.activities (${columns.join(', ')}) values\n${rows.join(',\n')}\non conflict (id) do nothing;\ncommit;\n`;
fs.writeFileSync(new URL('../supabase/activity-management.sql', import.meta.url), sql);
console.log(`Generated migration for ${rows.length} activities`);
