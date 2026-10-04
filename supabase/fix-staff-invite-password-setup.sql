-- Supabase can update the generated password hash while accepting an invite.
-- That transition must not unlock the roster before the invited staff member
-- chooses a password in the application.
begin;

create or replace function private.mark_password_rotated()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.email_confirmed_at is not null
     and new.encrypted_password is distinct from old.encrypted_password then
    update public.user_access
       set password_rotated = true
     where user_id = new.id and password_rotated = false;
  end if;
  return new;
end;
$$;

commit;
