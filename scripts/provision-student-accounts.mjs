// Run from a trusted local shell with SUPABASE_URL and
// SUPABASE_SERVICE_ROLE_KEY in the environment. Never ship the secret key to
// Vercel's client bundle. This script does not update or delete check-in rows.
import { createClient } from '@supabase/supabase-js';

const apply = process.argv.includes('--apply');
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in this shell first.');

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
});

const readAll = async (table, columns, orderBy, filter) => {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    let query = supabase.from(table).select(columns).order(orderBy).range(offset, offset + 499);
    if (filter) query = filter(query);
    const { data, error } = await query;
    if (error) throw new Error(`Cannot read ${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 500) break;
  }
  return rows;
};

const countCheckIns = async () => {
  const { count, error } = await supabase.from('check_in_logs').select('id', { count: 'exact', head: true });
  if (error || count === null) throw new Error(`Cannot count check-ins: ${error?.message || 'unknown error'}`);
  return count;
};

const baseline = await countCheckIns();
const [students, mappings] = await Promise.all([
  readAll('students', 'id', 'id'),
  readAll('user_access', 'user_id,student_id', 'user_id', query => query.eq('role', 'student'))
]);
const ids = students.map(row => row.id).filter(id => /^\d{12}$/.test(id));
if (ids.length !== students.length) throw new Error('Roster contains invalid student IDs; no accounts were created.');
const mapped = new Map(mappings.map(row => [row.student_id, row.user_id]));

const existing = new Map();
for (let page = 1; ; page++) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw new Error(`Cannot list Auth users: ${error.message}`);
  for (const user of data.users) if (user.email) existing.set(user.email.toLowerCase(), user);
  if (data.users.length < 1000) break;
}

const pending = ids.filter(id => !mapped.has(id));
console.log(`Roster: ${ids.length}; already mapped: ${mapped.size}; pending: ${pending.length}; check-ins before: ${baseline}`);
if (!apply) {
  console.log('Dry run only. Pass --apply to create accounts and role mappings.');
  process.exit(0);
}

let created = 0;
let recovered = 0;
const failures = [];
for (const [index, id] of pending.entries()) {
  const email = `${id}@student-login.invalid`;
  let user = existing.get(email);
  if (user && user.app_metadata?.npu_roster_provisioned !== true) {
    failures.push(`${id}: login alias already belongs to an unrecognized account`);
    continue;
  }
  if (!user) {
    const result = await supabase.auth.admin.createUser({
      email,
      password: id,
      email_confirm: true,
      app_metadata: { npu_roster_provisioned: true }
    });
    if (result.error || !result.data.user) {
      if (result.error?.status === 429) throw new Error('Auth rate limit reached; rerun this idempotent script later.');
      failures.push(`${id}: ${result.error?.message || 'Auth account was not created'}`);
      continue;
    }
    user = result.data.user;
    existing.set(email, user);
    created++;
  } else {
    recovered++;
  }
  const { error } = await supabase.from('user_access').insert({
    user_id: user.id,
    role: 'student',
    student_id: id,
    password_rotated: false
  });
  if (error) failures.push(`${id}: role mapping failed: ${error.message}`);
  if ((index + 1) % 100 === 0) {
    console.log(`Account setup processed: ${index + 1} of ${pending.length}`);
  }
}

const after = await countCheckIns();
console.log(`Created: ${created}; recovered: ${recovered}; failures: ${failures.length}; check-ins after: ${after}`);
for (const failure of failures) console.error(failure);
if (after < baseline) throw new Error('Check-in count decreased while provisioning; investigate immediately.');
if (failures.length) process.exitCode = 1;
