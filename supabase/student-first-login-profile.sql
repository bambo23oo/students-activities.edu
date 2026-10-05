-- Apply after student-password-onboarding.sql. No check-in rows are modified.
begin;

alter table public.students add column if not exists prefix text;
alter table public.students add column if not exists first_name text;
alter table public.students add column if not exists last_name text;
alter table public.students add column if not exists year integer;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'students_year_range') then
    alter table public.students add constraint students_year_range
      check (year is null or year between 1 and 6) not valid;
  end if;
end $$;

alter table public.user_access
  add column if not exists onboarding_completed boolean not null default false;
alter table public.user_access
  add column if not exists can_reset_student_password boolean not null default false;
alter table public.user_access
  add column if not exists password_reset_pending boolean not null default false;
create table if not exists public.student_password_reset_audit (
  id bigint generated always as identity primary key,
  admin_user_id uuid not null references auth.users(id),
  student_id text not null references public.students(id),
  reset_at timestamptz not null default now()
);
alter table public.student_password_reset_audit enable row level security;
revoke all on public.student_password_reset_audit from anon, authenticated;
-- The staff account explicitly designated by the project owner is the reset admin.
update public.user_access ua set can_reset_student_password = true
from auth.users u
where ua.user_id = u.id and ua.role = 'staff'
  and lower(u.email) = 'srisuda.com@npu.ac.th';

create or replace function private.mark_student_password_rotated()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password then
    update public.user_access
    set password_rotated = not password_reset_pending,
        password_reset_pending = false
    where user_id = new.id and role = 'student';
  end if;
  return new;
end;
$$;
alter table public.student_contact
  add column if not exists profile_photo_path text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'student_contact_own_photo') then
    alter table public.student_contact add constraint student_contact_own_photo
      check (profile_photo_path is null or profile_photo_path like student_id || '/%') not valid;
  end if;
end $$;

-- A changed first password permits only onboarding data until the required
-- profile is complete. The existing check-in and reflection policies use
-- actor_role/actor_student_id, so they remain closed during onboarding.
create or replace function private.actor_role()
returns text language sql stable security definer set search_path = '' as $$
  select case
    when role = 'student' and (not password_rotated or not onboarding_completed) then null
    else role end
  from public.user_access where user_id = (select auth.uid())
$$;
create or replace function private.actor_student_id()
returns text language sql stable security definer set search_path = '' as $$
  select case when password_rotated and onboarding_completed then student_id else null end
  from public.user_access where user_id = (select auth.uid())
$$;
create or replace function private.onboarding_student_id()
returns text language sql stable security definer set search_path = '' as $$
  select student_id from public.user_access
  where user_id = (select auth.uid()) and role = 'student' and password_rotated
$$;
revoke all on function private.onboarding_student_id() from public;
grant execute on function private.onboarding_student_id() to authenticated;

drop policy if exists "Students read own roster for onboarding" on public.students;
create policy "Students read own roster for onboarding" on public.students
  for select to authenticated using (id = (select private.onboarding_student_id()));
drop policy if exists "Students update own roster for onboarding" on public.students;
create policy "Students update own roster for onboarding" on public.students
  for update to authenticated
  using (id = (select private.onboarding_student_id()))
  with check (id = (select private.onboarding_student_id()));

create or replace function private.guard_student_roster_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select private.onboarding_student_id()) = old.id then
    if (to_jsonb(new) - 'name' - 'prefix' - 'first_name' - 'last_name' - 'major' - 'year')
       is distinct from
       (to_jsonb(old) - 'name' - 'prefix' - 'first_name' - 'last_name' - 'major' - 'year') then
      raise exception 'Only own profile fields may be changed';
    end if;
    if trim(coalesce(new.prefix, '')) = '' or trim(coalesce(new.first_name, '')) = ''
       or trim(coalesce(new.last_name, '')) = '' or trim(coalesce(new.major, '')) = ''
       or new.year not between 1 and 6
       or new.name is distinct from new.prefix || new.first_name || ' ' || new.last_name then
      raise exception 'Required student profile fields are incomplete';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists guard_student_roster_update on public.students;
create trigger guard_student_roster_update before update on public.students
  for each row execute function private.guard_student_roster_update();

drop policy if exists "Students read university contact during onboarding" on public.student_contact;
create policy "Students read university contact during onboarding" on public.student_contact
  for select to authenticated using (student_id = (select private.onboarding_student_id()));
drop policy if exists "Students add university contact" on public.student_contact;
create policy "Students add university contact" on public.student_contact
  for insert to authenticated with check (
    student_id = (select private.onboarding_student_id()) and verified_at is null);
drop policy if exists "Students edit university contact" on public.student_contact;
create policy "Students edit university contact" on public.student_contact
  for update to authenticated
  using (student_id = (select private.onboarding_student_id()))
  with check (student_id = (select private.onboarding_student_id()) and verified_at is null);

create or replace function private.guard_student_contact_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select private.onboarding_student_id()) = old.student_id then
    if new.student_id is distinct from old.student_id or new.verified_at is not null then
      raise exception 'Contact ownership or verification cannot be changed';
    end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('student-photos', 'student-photos', false, 1048576,
  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = false, file_size_limit = 1048576,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Students upload own profile photo" on storage.objects;
create policy "Students upload own profile photo" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'student-photos'
    and (storage.foldername(name))[1] = (select private.onboarding_student_id()));
drop policy if exists "Students read own profile photo" on storage.objects;
create policy "Students read own profile photo" on storage.objects
  for select to authenticated using (
    bucket_id = 'student-photos'
    and (storage.foldername(name))[1] = (select private.onboarding_student_id()));
drop policy if exists "Students replace own profile photo" on storage.objects;
create policy "Students replace own profile photo" on storage.objects
  for update to authenticated
  using (bucket_id = 'student-photos'
    and (storage.foldername(name))[1] = (select private.onboarding_student_id()))
  with check (bucket_id = 'student-photos'
    and (storage.foldername(name))[1] = (select private.onboarding_student_id()));

create or replace function public.complete_student_onboarding()
returns boolean language plpgsql security definer set search_path = '' as $$
declare sid text := private.onboarding_student_id();
begin
  if sid is null then raise exception 'Change your first password before onboarding'; end if;
  if not exists (
    select 1 from public.students s
    join public.student_contact c on c.student_id = s.id
    join storage.objects photo on photo.bucket_id = 'student-photos'
      and photo.name = c.profile_photo_path
    where s.id = sid and trim(coalesce(s.prefix, '')) <> ''
      and trim(coalesce(s.first_name, '')) <> ''
      and trim(coalesce(s.last_name, '')) <> ''
      and trim(coalesce(s.major, '')) <> ''
      and s.year between 1 and 6
      and c.university_email ~* '^[A-Z0-9._%+\-]+@npu[.]ac[.]th$'
  ) then raise exception 'Required student profile fields are incomplete'; end if;
  update public.user_access set onboarding_completed = true
  where user_id = (select auth.uid()) and role = 'student' and password_rotated;
  return found;
end;
$$;
revoke all on function public.complete_student_onboarding() from public, anon;
grant execute on function public.complete_student_onboarding() to authenticated;

commit;
