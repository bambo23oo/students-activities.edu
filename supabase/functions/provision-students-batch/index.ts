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
    const { data: actor, error: actorError } = await ctx.supabase.from('user_access')
      .select('role,can_reset_student_password').eq('user_id', ctx.userClaims.id).single();
    if (actorError || actor?.role !== 'staff' || actor.can_reset_student_password !== true) {
      return json({ error: 'Forbidden' }, 403);
    }

    let startAfter = '';
    try { startAfter = (await req.json()).startAfter || ''; }
    catch { return json({ error: 'Invalid request' }, 400); }
    if (typeof startAfter !== 'string' || (startAfter && !/^\d{12}$/.test(startAfter))) {
      return json({ error: 'Invalid cursor' }, 400);
    }

    const admin = ctx.supabaseAdmin;
    const before = await admin.from('check_in_logs').select('id', { count: 'exact', head: true });
    if (before.error || before.count === null) return json({ error: 'Cannot verify check-ins' }, 500);
    let rosterQuery = admin.from('students').select('id').order('id').limit(25);
    if (startAfter) rosterQuery = rosterQuery.gt('id', startAfter);
    const { data: roster, error: rosterError } = await rosterQuery;
    if (rosterError) return json({ error: 'Cannot read roster' }, 500);
    if (!roster?.length) return json({ processed: 0, created: 0, recovered: 0, nextCursor: startAfter, finished: true, checkIns: before.count });
    if (roster.some(row => !/^\d{12}$/.test(row.id))) return json({ error: 'Invalid student ID in roster' }, 422);

    const ids = roster.map(row => row.id);
    const { data: mapped, error: mapError } = await admin.from('user_access')
      .select('student_id').eq('role', 'student').in('student_id', ids);
    if (mapError) return json({ error: 'Cannot read existing accounts' }, 500);
    const mappedIds = new Set((mapped || []).map(row => row.student_id));

    const existing = new Map<string, { id: string; app_metadata?: Record<string, unknown> }>();
    if (ids.some(id => !mappedIds.has(id))) {
      for (let page = 1; ; page++) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) return json({ error: 'Cannot inspect Auth users' }, 500);
        for (const user of data.users) if (user.email) existing.set(user.email.toLowerCase(), user);
        if (data.users.length < 1000) break;
      }
    }

    let created = 0;
    let recovered = 0;
    for (const id of ids) {
      if (mappedIds.has(id)) continue;
      const alias = `${id}@student-login.invalid`;
      let user = existing.get(alias);
      if (user && user.app_metadata?.npu_roster_provisioned !== true) {
        return json({ error: 'An unrecognized account uses a student alias', studentId: id }, 409);
      }
      if (!user) {
        const result = await admin.auth.admin.createUser({
          email: alias, password: id, email_confirm: true,
          app_metadata: { npu_roster_provisioned: true }
        });
        if (result.error || !result.data.user) {
          return json({ error: 'Auth account creation failed', studentId: id, status: result.error?.status }, 500);
        }
        user = result.data.user;
        existing.set(alias, user);
        created++;
      } else recovered++;
      const { error: insertError } = await admin.from('user_access').insert({
        user_id: user.id, role: 'student', student_id: id,
        password_rotated: false, onboarding_completed: false,
        password_reset_pending: false
      });
      if (insertError) return json({ error: 'Role mapping failed', studentId: id }, 500);
    }

    const after = await admin.from('check_in_logs').select('id', { count: 'exact', head: true });
    if (after.error || after.count === null || after.count < before.count) {
      return json({ error: 'Check-in safety check failed' }, 500);
    }
    return json({ processed: ids.length, created, recovered,
      nextCursor: ids[ids.length - 1], finished: ids.length < 25,
      checkIns: after.count });
  }
};
