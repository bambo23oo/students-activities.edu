-- Let staff close an outstanding check-in on a later day of a multi-day activity.
-- This migration does not change or remove any existing check-in or scan event.
begin;

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
  v_latest_type text;
  v_legacy_check_in boolean;
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

  -- Serialize scans for this student and activity across staff devices.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext(p_activity_id), pg_catalog.hashtext(p_student_id)
  );

  -- A repeated checkout should be a warning, even after its entry has closed.
  select * into v_event from public.activity_scan_events
  where activity_id = p_activity_id and student_id = p_student_id
    and scan_date = v_date and scan_type = p_scan_type;
  if found then
    return jsonb_build_object('status', 'duplicate', 'scan_date', v_date,
      'scanned_at', v_event.scanned_at, 'scanner_station', v_event.scanner_station);
  end if;

  if p_scan_type = 'check_out' then
    select scan_type into v_latest_type from public.activity_scan_events
    where activity_id = p_activity_id and student_id = p_student_id
    order by scanned_at desc, id desc limit 1;

    -- Before scan events existed, a legacy participation record was the entry.
    -- Read it as evidence only; do not fabricate an event or alter that record.
    if v_latest_type is null then
      select exists (
        select 1 from public.check_in_logs
        where activity_id = p_activity_id and student_id = p_student_id
      ) into v_legacy_check_in;
    end if;
    if v_latest_type is distinct from 'check_in' and
       not (v_latest_type is null and coalesce(v_legacy_check_in, false)) then
      return jsonb_build_object('status', 'missing_check_in', 'scan_date', v_date);
    end if;
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

commit;
