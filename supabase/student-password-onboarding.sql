-- Password onboarding for provisioned student accounts. Apply before importing
-- any ID/password accounts. Existing Google/staff accounts remain usable.
begin;

alter table public.user_access
  add column if not exists password_rotated boolean not null default true;

-- This flag is set by Auth's password update, never by the browser. Until it is
-- set, all application data and private images remain inaccessible to a student.
create or replace function private.mark_student_password_rotated()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password then
    update public.user_access
       set password_rotated = true
     where user_id = new.id and role = 'student' and password_rotated = false;
  end if;
  return new;
end;
$$;
drop trigger if exists mark_student_password_rotated on auth.users;
create trigger mark_student_password_rotated
  after update of encrypted_password on auth.users
  for each row execute function private.mark_student_password_rotated();

create or replace function private.actor_role()
returns text language sql stable security definer set search_path = '' as $$
  select case when role = 'student' and not password_rotated then null else role end
  from public.user_access where user_id = (select auth.uid())
$$;

create or replace function private.actor_student_id()
returns text language sql stable security definer set search_path = '' as $$
  select case when password_rotated then student_id else null end
  from public.user_access where user_id = (select auth.uid())
$$;

-- Contact email is separate from the Auth login alias. It is intentionally
-- labelled unverified until a future university email verification is in place.
create table if not exists public.student_contact (
  student_id text primary key references public.students(id) on delete cascade,
  university_email text not null check (
    university_email ~* '^[A-Z0-9._%+\-]+@npu[.]ac[.]th$'
  ),
  verified_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.student_contact enable row level security;
revoke all on public.student_contact from anon, authenticated;
grant select, insert, update on public.student_contact to authenticated;
drop policy if exists "Students and staff read university contact" on public.student_contact;
create policy "Students and staff read university contact" on public.student_contact
  for select to authenticated using (
    student_id = (select private.actor_student_id())
    or (select private.actor_role()) in ('staff', 'approver')
  );
drop policy if exists "Students add university contact" on public.student_contact;
create policy "Students add university contact" on public.student_contact
  for insert to authenticated with check (
    student_id = (select private.actor_student_id())
    and verified_at is null
  );
drop policy if exists "Students edit university contact" on public.student_contact;
create policy "Students edit university contact" on public.student_contact
  for update to authenticated
  using (student_id = (select private.actor_student_id()))
  with check (student_id = (select private.actor_student_id()) and verified_at is null);

-- Prevent a student from claiming a confirmed email or changing row ownership.
create or replace function private.guard_student_contact_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if (select private.actor_role()) = 'student' then
    if new.student_id is distinct from old.student_id
       or new.verified_at is not null then
      raise exception 'Contact ownership or verification cannot be changed';
    end if;
    new.updated_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists guard_student_contact_update on public.student_contact;
create trigger guard_student_contact_update before update on public.student_contact
  for each row execute function private.guard_student_contact_update();

commit;
