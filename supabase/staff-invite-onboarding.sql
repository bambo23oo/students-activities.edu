-- Staff invited by email must choose a password before any roster or check-in
-- records are exposed. Existing accounts with password_rotated=true are unchanged.
begin;

create or replace function private.mark_password_rotated()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password then
    update public.user_access
       set password_rotated = true
     where user_id = new.id and password_rotated = false;
  end if;
  return new;
end;
$$;

drop trigger if exists mark_student_password_rotated on auth.users;
drop trigger if exists mark_password_rotated on auth.users;
create trigger mark_password_rotated
  after update of encrypted_password on auth.users
  for each row execute function private.mark_password_rotated();

create or replace function private.actor_role()
returns text language sql stable security definer set search_path = '' as $$
  select case when password_rotated then role else null end
  from public.user_access where user_id = (select auth.uid())
$$;

commit;
