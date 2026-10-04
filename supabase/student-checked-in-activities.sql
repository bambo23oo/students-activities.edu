-- Student activity rows are visible only when the student has a check-in.
-- Staff and approvers keep their existing activity-management access.
-- This migration changes a SELECT policy only; it never edits check-in data.
begin;

alter policy "Members can read activities" on public.activities
  using (
    (select private.actor_role()) in ('staff', 'approver')
    or (
      (select private.actor_role()) = 'student'
      and exists (
        select 1 from public.check_in_logs log
        where log.activity_id = activities.id
          and log.student_id = (select private.actor_student_id())
      )
    )
  );

commit;
