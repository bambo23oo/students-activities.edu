import { createSupabaseContext } from 'npm:@supabase/server@1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors });

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const { data: ctx, error: authError } = await createSupabaseContext(req, { auth: 'user' });
    if (authError || !ctx?.userClaims?.id) return json({ error: 'Unauthorized' }, 401);
    const adminId = ctx.userClaims.id;
    const { data: actor, error: actorError } = await ctx.supabase
      .from('user_access')
      .select('role,can_reset_student_password')
      .eq('user_id', adminId).single();
    if (actorError || actor?.role !== 'staff' || actor.can_reset_student_password !== true) {
      return json({ error: 'Forbidden' }, 403);
    }

    let studentId: string;
    try { studentId = (await req.json()).studentId; }
    catch { return json({ error: 'Invalid request' }, 400); }
    if (typeof studentId !== 'string' || !/^\d{12}$/.test(studentId)) {
      return json({ error: 'Invalid student ID' }, 400);
    }

    const admin = ctx.supabaseAdmin;
    const { data: target, error: targetError } = await admin.from('user_access')
      .select('user_id').eq('role', 'student').eq('student_id', studentId).single();
    if (targetError || !target) return json({ error: 'Student account not found' }, 404);

    // Close existing journal access before setting the temporary password.
    // The auth.users trigger leaves password_rotated=false for this admin reset.
    const { error: lockError } = await admin.from('user_access').update({
      password_rotated: false, password_reset_pending: true
    }).eq('user_id', target.user_id).eq('role', 'student');
    if (lockError) return json({ error: 'Could not lock student account' }, 500);

    const { error: resetError } = await admin.auth.admin.updateUserById(target.user_id, {
      password: studentId
    });
    if (resetError) return json({ error: 'Password reset failed; account remains locked' }, 500);

    // Keep the account closed even if another password event raced the reset.
    const { error: finalLockError } = await admin.from('user_access').update({
      password_rotated: false, password_reset_pending: false
    }).eq('user_id', target.user_id).eq('role', 'student');
    if (finalLockError) {
      console.error('Student password reset final lock failed:', finalLockError.message);
      return json({ error: 'Password changed but account lock could not be verified' }, 500);
    }

    const { error: auditError } = await admin.from('student_password_reset_audit').insert({
      admin_user_id: adminId, student_id: studentId
    });
    if (auditError) console.error('Password reset audit insert failed:', auditError.message);
    return json({ ok: true });
  }
};
