-- Activity scan modes. Existing check_in_logs remain untouched and continue to
-- represent one participation record per student/activity for the journal.
begin;

alter table public.activities
  add column if not exists scan_mode text not null default 'single';

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.activities'::regclass
      and conname = 'activities_scan_mode_check'
  ) then
    alter table public.activities
      add constraint activities_scan_mode_check
      check (scan_mode in ('single', 'in_out'));
  end if;
end $$;

create table if not exists public.activity_scan_events (
  id uuid primary key default gen_random_uuid(),
  activity_id text not null references public.activities(id) on delete restrict,
  student_id text not null references public.students(id) on delete restrict,
  scan_date date not null,
  scan_type text not null check (scan_type in ('check_in', 'check_out')),
  scanned_at timestamptz not null default now(),
  method text not null check (method in ('usb', 'camera', 'manual')),
  scanner_station text,
  scanned_by uuid not null references auth.users(id),
  unique (activity_id, student_id, scan_date, scan_type)
);

create index if not exists activity_scan_events_recent
  on public.activity_scan_events(activity_id, scan_date, scanned_at desc);

alter table public.activity_scan_events enable row level security;
revoke all on public.activity_scan_events from anon, authenticated;
grant select on public.activity_scan_events to authenticated;
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'activity_scan_events'
      and policyname = 'Staff and owner can read scan events'
  ) then
    create policy "Staff and owner can read scan events" on public.activity_scan_events
      for select to authenticated using (
        (select private.actor_role()) in ('staff', 'approver') or
        student_id = (select private.actor_student_id())
      );
  end if;
end $$;

-- The single RPC is the authority for mode, activity state, date and ordering.
-- It makes first check-in + the participation record one atomic transaction.
create or replace function public.record_activity_scan(
  p_activity_id text,
  p_student_id text,
  p_scan_type text,
  p_method text,
  p_scanner_station text default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_activity public.activities%rowtype;
  v_date date := (clock_timestamp() at time zone 'Asia/Bangkok')::date;
  v_event public.activity_scan_events%rowtype;
begin
  if auth.uid() is null or not exists (
    select 1 from public.user_access
    where user_id = auth.uid() and role = 'staff'
  ) then
    raise exception 'Only staff may record activity scans' using errcode = '42501';
  end if;
  if p_scan_type not in ('check_in', 'check_out') or
     p_method not in ('usb', 'camera', 'manual') or
     p_student_id !~ '^[0-9]{12}$' or
     length(coalesce(p_scanner_station, '')) > 120 then
    raise exception 'Invalid scan details' using errcode = '22023';
  end if;

  select * into v_activity from public.activities
    where id = p_activity_id for share;
  if not found or v_activity.status <> 'active' then
    return jsonb_build_object('status', 'closed');
  end if;
  if v_activity.scan_mode <> 'in_out' then
    return jsonb_build_object('status', 'wrong_mode');
  end if;
  if not exists (select 1 from public.students where id = p_student_id) then
    return jsonb_build_object('status', 'unknown_student');
  end if;

  if p_scan_type = 'check_out' and not exists (
    select 1 from public.activity_scan_events
    where activity_id = p_activity_id and student_id = p_student_id
      and scan_date = v_date and scan_type = 'check_in'
  ) then
    return jsonb_build_object('status', 'missing_check_in', 'scan_date', v_date);
  end if;

  insert into public.activity_scan_events
    (activity_id, student_id, scan_date, scan_type, method, scanner_station, scanned_by)
  values
    (p_activity_id, p_student_id, v_date, p_scan_type, p_method,
     nullif(trim(p_scanner_station), ''), auth.uid())
  on conflict (activity_id, student_id, scan_date, scan_type) do nothing
  returning * into v_event;

  if v_event.id is null then
    select * into v_event from public.activity_scan_events
    where activity_id = p_activity_id and student_id = p_student_id
      and scan_date = v_date and scan_type = p_scan_type;
    return jsonb_build_object('status', 'duplicate', 'scan_date', v_date,
      'scanned_at', v_event.scanned_at, 'scanner_station', v_event.scanner_station);
  end if;

  if p_scan_type = 'check_in' then
    insert into public.check_in_logs
      (id, student_id, activity_id, timestamp, method,
       staff_status, exec_status, scanner_station)
    values
      ('chk_' || p_activity_id || '_' || p_student_id,
       p_student_id, p_activity_id,
       to_char(v_event.scanned_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
       p_method, 'verified', 'pending', v_event.scanner_station)
    on conflict (student_id, activity_id) do nothing;
  end if;

  return jsonb_build_object('status', 'recorded', 'scan_date', v_date,
    'scanned_at', v_event.scanned_at, 'scan_type', p_scan_type);
end;
$$;

revoke all on function public.record_activity_scan(text, text, text, text, text)
  from public, anon;
grant execute on function public.record_activity_scan(text, text, text, text, text)
  to authenticated;

commit;
