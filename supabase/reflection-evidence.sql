-- Private evidence images. Students may upload only under their verified ID;
-- staff and approvers may read images for their review duties.
begin;
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kpa-evidence', 'kpa-evidence', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

drop policy if exists "Students upload own KPA evidence" on storage.objects;
create policy "Students upload own KPA evidence" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'kpa-evidence'
    and (select private.actor_role()) = 'student'
    and (storage.foldername(name))[1] = (select private.actor_student_id())
  );

drop policy if exists "Members read permitted KPA evidence" on storage.objects;
create policy "Members read permitted KPA evidence" on storage.objects
  for select to authenticated using (
    bucket_id = 'kpa-evidence'
    and (
      (storage.foldername(name))[1] = (select private.actor_student_id())
      or (select private.actor_role()) in ('staff', 'approver')
    )
  );

drop policy if exists "Students remove own KPA evidence" on storage.objects;
create policy "Students remove own KPA evidence" on storage.objects
  for delete to authenticated using (
    bucket_id = 'kpa-evidence'
    and (select private.actor_role()) = 'student'
    and (storage.foldername(name))[1] = (select private.actor_student_id())
  );

create or replace function public.review_reflection(
  p_reflection_id text, p_status text, p_reason text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  actor text := private.actor_role();
  current_status text;
  target_log_id text;
begin
  select r.status, r.log_id into current_status, target_log_id
  from public.reflections r where r.id = p_reflection_id for update;
  if not found then raise exception 'Reflection not found'; end if;
  if actor = 'staff' and current_status = 'pending_step1'
     and p_status in ('pending_step2', 'rejected') then
    update public.reflections set status = p_status,
      reject_reason = case when p_status = 'rejected' then coalesce(p_reason, 'กรุณาแก้ไขข้อมูล') else null end
    where id = p_reflection_id;
    update public.check_in_logs set staff_status = case when p_status = 'rejected' then 'rejected' else 'verified' end
    where id = target_log_id;
  elsif actor = 'approver' and current_status = 'pending_step2'
     and p_status in ('approved', 'rejected') then
    update public.reflections set status = p_status,
      reject_reason = case when p_status = 'rejected' then coalesce(p_reason, 'กรุณาแก้ไขข้อมูล') else null end
    where id = p_reflection_id;
    update public.check_in_logs set exec_status = case when p_status = 'rejected' then 'rejected' else 'approved' end
    where id = target_log_id;
  else
    raise exception 'Review is not permitted for this role or status';
  end if;
  if not found then raise exception 'Check-in not found'; end if;
end;
$$;
revoke all on function public.review_reflection(text, text, text) from public, anon;
grant execute on function public.review_reflection(text, text, text) to authenticated;
commit;
