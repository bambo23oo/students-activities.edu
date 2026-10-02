-- Apply only after Supabase Auth users have been enrolled and mapped in
-- public.user_access. This migration does not create users or send email.
-- The public website remains reachable; only authenticated, mapped users can
-- access student records. Run in the Supabase SQL Editor as the project owner.

begin;

create schema if not exists private;

-- The live project predates fields used by the application. Existing rows are
-- preserved; 0 hours avoids granting unverified transcript credit.
alter table public.activities add column if not exists hours numeric not null default 0;
alter table public.check_in_logs add column if not exists staff_status text not null default 'pending';
alter table public.check_in_logs add column if not exists exec_status text not null default 'pending';
alter table public.check_in_logs add column if not exists scanner_station text;
alter table public.check_in_logs add column if not exists student_note text;
alter table public.check_in_logs add column if not exists audit_trail jsonb;
alter table public.reflections add column if not exists evidence_path text;

-- This unique index is essential for simultaneous scans. Resolve any existing
-- duplicates before applying the migration; a conflict rolls back everything.
create unique index if not exists check_in_one_per_student_activity
  on public.check_in_logs(student_id, activity_id);
create index if not exists check_in_by_student on public.check_in_logs(student_id);
create index if not exists check_in_by_activity on public.check_in_logs(activity_id);
create index if not exists reflection_by_student on public.reflections(student_id);

create table if not exists public.user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('student', 'staff', 'approver')),
  student_id text references public.students(id),
  constraint student_role_mapping check (
    (role = 'student' and student_id is not null) or
    (role in ('staff', 'approver') and student_id is null)
  )
);
create unique index if not exists user_access_student_unique
  on public.user_access(student_id) where student_id is not null;

alter table public.user_access enable row level security;
alter table public.students enable row level security;
alter table public.activities enable row level security;
alter table public.check_in_logs enable row level security;
alter table public.reflections enable row level security;

create or replace function private.actor_role()
returns text language sql stable security definer set search_path = ''
as $$
  select role from public.user_access where user_id = (select auth.uid())
$$;

create or replace function private.actor_student_id()
returns text language sql stable security definer set search_path = ''
as $$
  select student_id from public.user_access where user_id = (select auth.uid())
$$;

revoke all on schema private from public;
revoke all on function private.actor_role() from public;
revoke all on function private.actor_student_id() from public;
grant usage on schema private to authenticated;
grant execute on function private.actor_role() to authenticated;
grant execute on function private.actor_student_id() to authenticated;

revoke all on public.user_access, public.students, public.activities,
  public.check_in_logs, public.reflections from anon, authenticated;
grant select on public.user_access to authenticated;
grant select, insert, update on public.students, public.activities,
  public.check_in_logs, public.reflections to authenticated;

drop policy if exists "Allow public access to students" on public.students;
drop policy if exists "Allow public access to activities" on public.activities;
drop policy if exists "Allow public access to check_in_logs" on public.check_in_logs;
drop policy if exists "Allow public access to reflections" on public.reflections;

drop policy if exists "Users can read own access" on public.user_access;
create policy "Users can read own access" on public.user_access
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "Students and staff can read students" on public.students;
create policy "Students and staff can read students" on public.students
  for select to authenticated using (
    id = (select private.actor_student_id()) or
    (select private.actor_role()) in ('staff', 'approver')
  );
drop policy if exists "Staff can add students" on public.students;
create policy "Staff can add students" on public.students
  for insert to authenticated with check (
    (select private.actor_role()) in ('staff', 'approver')
  );
drop policy if exists "Staff can update students" on public.students;
create policy "Staff can update students" on public.students
  for update to authenticated
  using ((select private.actor_role()) in ('staff', 'approver'))
  with check ((select private.actor_role()) in ('staff', 'approver'));

drop policy if exists "Members can read activities" on public.activities;
create policy "Members can read activities" on public.activities
  for select to authenticated using ((select private.actor_role()) is not null);
drop policy if exists "Staff can add activities" on public.activities;
create policy "Staff can add activities" on public.activities
  for insert to authenticated with check (
    (select private.actor_role()) in ('staff', 'approver')
  );
drop policy if exists "Staff can update activities" on public.activities;
create policy "Staff can update activities" on public.activities
  for update to authenticated
  using ((select private.actor_role()) in ('staff', 'approver'))
  with check ((select private.actor_role()) in ('staff', 'approver'));

drop policy if exists "Members can read checkins" on public.check_in_logs;
create policy "Members can read checkins" on public.check_in_logs
  for select to authenticated using (
    student_id = (select private.actor_student_id()) or
    (select private.actor_role()) in ('staff', 'approver')
  );
drop policy if exists "Staff can record checkins" on public.check_in_logs;
create policy "Staff can record checkins" on public.check_in_logs
  for insert to authenticated with check (
    (select private.actor_role()) = 'staff' and exec_status = 'pending'
  );
drop policy if exists "Staff can review checkins" on public.check_in_logs;
create policy "Staff can review checkins" on public.check_in_logs
  for update to authenticated
  using ((select private.actor_role()) = 'staff')
  with check ((select private.actor_role()) = 'staff');
drop policy if exists "Approvers can approve checkins" on public.check_in_logs;
create policy "Approvers can approve checkins" on public.check_in_logs
  for update to authenticated
  using ((select private.actor_role()) = 'approver')
  with check ((select private.actor_role()) = 'approver');

create or replace function private.guard_checkin_update()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare actor text := private.actor_role();
begin
  if actor = 'staff' then
    if (to_jsonb(new) - 'staff_status' - 'student_note' - 'audit_trail' - 'scanner_station')
       is distinct from
       (to_jsonb(old) - 'staff_status' - 'student_note' - 'audit_trail' - 'scanner_station') then
      raise exception 'Staff cannot change check-in identity or executive approval';
    end if;
  elsif actor = 'approver' then
    if (to_jsonb(new) - 'exec_status' - 'audit_trail')
       is distinct from
       (to_jsonb(old) - 'exec_status' - 'audit_trail') then
      raise exception 'Approver cannot change check-in identity or staff review';
    end if;
  else
    raise exception 'Not authorized to update check-ins';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_checkin_update on public.check_in_logs;
create trigger guard_checkin_update before update on public.check_in_logs
  for each row execute function private.guard_checkin_update();

drop policy if exists "Members can read reflections" on public.reflections;
create policy "Members can read reflections" on public.reflections
  for select to authenticated using (
    student_id = (select private.actor_student_id()) or
    (select private.actor_role()) in ('staff', 'approver')
  );
drop policy if exists "Students can submit reflections" on public.reflections;
create policy "Students can submit reflections" on public.reflections
  for insert to authenticated with check (
    (select private.actor_role()) = 'student' and
    student_id = (select private.actor_student_id()) and
    status in ('draft', 'pending_step1') and
    exists (
      select 1 from public.check_in_logs c
      where c.id = public.reflections.log_id
        and c.student_id = (select private.actor_student_id())
        and c.activity_id = public.reflections.activity_id
    )
  );
drop policy if exists "Students can edit unsent reflections" on public.reflections;
create policy "Students can edit unsent reflections" on public.reflections
  for update to authenticated
  using (
    (select private.actor_role()) = 'student' and
    student_id = (select private.actor_student_id()) and status in ('draft', 'rejected')
  )
  with check (
    (select private.actor_role()) = 'student' and
    student_id = (select private.actor_student_id()) and status in ('draft', 'pending_step1')
  );
drop policy if exists "Staff can review reflections" on public.reflections;
create policy "Staff can review reflections" on public.reflections
  for update to authenticated
  using ((select private.actor_role()) = 'staff' and status = 'pending_step1')
  with check ((select private.actor_role()) = 'staff' and status in ('pending_step2', 'rejected'));
drop policy if exists "Approvers can approve reflections" on public.reflections;
create policy "Approvers can approve reflections" on public.reflections
  for update to authenticated
  using ((select private.actor_role()) = 'approver' and status = 'pending_step2')
  with check ((select private.actor_role()) = 'approver' and status in ('approved', 'rejected'));

create or replace function private.guard_reflection_update()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare actor text := private.actor_role();
begin
  if actor = 'student' then
    if (to_jsonb(new) - 'status' - 'k_knowledge' - 'p_skill' - 'a_attitude'
        - 'moral' - 'submitted_at' - 'updated_at' - 'evidence_path')
       is distinct from
       (to_jsonb(old) - 'status' - 'k_knowledge' - 'p_skill' - 'a_attitude'
        - 'moral' - 'submitted_at' - 'updated_at' - 'evidence_path') then
      raise exception 'Student cannot change review fields or reflection identity';
    end if;
  elsif actor in ('staff', 'approver') then
    if (to_jsonb(new) - 'status' - 'feedback' - 'reject_reason' - 'updated_at')
       is distinct from
       (to_jsonb(old) - 'status' - 'feedback' - 'reject_reason' - 'updated_at') then
      raise exception 'Reviewer cannot change student reflection content or identity';
    end if;
  else
    raise exception 'Not authorized to update reflections';
  end if;
  return new;
end;
$$;
drop trigger if exists guard_reflection_update on public.reflections;
create trigger guard_reflection_update before update on public.reflections
  for each row execute function private.guard_reflection_update();

commit;

-- Assign access only from a trusted administration session after users are
-- created and verified. Example (replace UUID and student ID; never put this in
-- browser code):
-- insert into public.user_access(user_id, role, student_id)
-- values ('00000000-0000-0000-0000-000000000000', 'student', '66309010001');
