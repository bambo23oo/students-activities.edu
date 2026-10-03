import { createClient } from 'npm:@supabase/supabase-js@2';

// Temporary owner-only provisioning endpoint. Keep JWT verification enabled.
// Only the project's service-role JWT may call it. Remove after enrollment.
Deno.serve(async request => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const projectUrl = Deno.env.get('SUPABASE_URL');
  if (!serviceKey || !projectUrl || request.headers.get('authorization') !== `Bearer ${serviceKey}`) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (request.method !== 'POST') return Response.json({ error: 'POST required' }, { status: 405 });

  let input: { offset?: number; limit?: number; apply?: boolean; acknowledgePredictablePassword?: boolean };
  try { input = await request.json(); }
  catch { return Response.json({ error: 'Invalid JSON' }, { status: 400 }); }
  const offset = input.offset ?? 0;
  const limit = input.limit ?? 50;
  if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
    return Response.json({ error: 'Invalid page' }, { status: 400 });
  }
  if (input.apply && input.acknowledgePredictablePassword !== true) {
    return Response.json({ error: 'Risk acknowledgement required' }, { status: 400 });
  }

  const admin = createClient(projectUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: roster, error: rosterError } = await admin.from('students')
    .select('id').order('id').range(offset, offset + limit - 1);
  if (rosterError) return Response.json({ error: 'Roster read failed' }, { status: 500 });
  if (roster.some(row => !/^\d{12}$/.test(row.id))) {
    return Response.json({ error: 'Roster contains an invalid ID; no changes made' }, { status: 409 });
  }
  const { error: schemaError } = await admin.from('user_access').select('password_rotated').limit(1);
  if (schemaError) return Response.json({ error: 'Password onboarding migration is missing' }, { status: 409 });

  const { data: mapped, error: mappingError } = await admin.from('user_access')
    .select('student_id').in('student_id', roster.map(row => row.id));
  if (mappingError) return Response.json({ error: 'Mapping read failed' }, { status: 500 });
  const alreadyMapped = new Set(mapped.map(row => row.student_id));
  const pending = roster.filter(row => !alreadyMapped.has(row.id));
  if (!input.apply) {
    return Response.json({ offset, scanned: roster.length, alreadyMapped: alreadyMapped.size, pending: pending.length, nextOffset: offset + roster.length });
  }

  const authUsers = new Map<string, { id: string; app_metadata: Record<string, unknown> }>();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return Response.json({ error: 'Auth user listing failed' }, { status: 500 });
    for (const user of data.users) if (user.email) authUsers.set(user.email.toLowerCase(), user);
    if (data.users.length < 1000) break;
  }

  let created = 0;
  let linked = 0;
  let failed = 0;
  for (const row of pending) {
    const alias = `${row.id}@student-login.invalid`;
    const existing = authUsers.get(alias);
    if (existing && existing.app_metadata?.student_login !== true) {
      failed++;
      continue;
    }
    let userId = existing?.id;
    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email: alias, password: row.id, email_confirm: true,
        app_metadata: { student_login: true }
      });
      if (error) { failed++; continue; }
      userId = data.user.id;
      created++;
    }
    const { error } = await admin.from('user_access').insert({
      user_id: userId, role: 'student', student_id: row.id, password_rotated: false
    });
    if (error) failed++;
    else linked++;
  }
  return Response.json({ offset, scanned: roster.length, created, linked, failed, nextOffset: offset + roster.length });
});
