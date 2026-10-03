// Run from a trusted machine with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
// Defaults to a read-only preflight. --apply creates student Auth accounts.
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
const apply = process.argv.includes('--apply');
if (!url || !secret) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
}
if (!/^https:\/\/[^/]+\.supabase\.co\/?$/.test(url)) {
  throw new Error('SUPABASE_URL must be the project Supabase URL');
}

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const readAll = async (table, columns) => {
  const rows = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await admin.from(table).select(columns).range(offset, offset + 499);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 500) return rows;
  }
};

const students = await readAll('students', 'id');
const invalid = students.filter(row => !/^\d{12}$/.test(row.id));
if (invalid.length) throw new Error(`${invalid.length} roster IDs are not 12 digits; no accounts were changed`);
const access = await readAll('user_access', 'student_id, password_rotated');
const mapped = new Set(access.map(row => row.student_id).filter(Boolean));

const authUsers = new Map();
for (let page = 1; ; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  for (const user of data.users) authUsers.set(user.email?.toLowerCase(), user);
  if (data.users.length < 1000) break;
}

const pending = students.filter(row => !mapped.has(row.id));
console.log(`Roster: ${students.length}; already mapped: ${mapped.size}; awaiting accounts: ${pending.length}`);
if (!apply) {
  console.log('Preflight only. Pass --apply after reviewing the roster and migration.');
  process.exit(0);
}

let created = 0;
let linked = 0;
let failed = 0;
for (const [index, row] of pending.entries()) {
  const alias = `${row.id}@student-login.invalid`;
  const existingUser = authUsers.get(alias);
  if (existingUser && existingUser.app_metadata?.student_login !== true) {
    failed++;
    console.error(`Student row ${index + 1}: login alias already belongs to an unrelated account`);
    continue;
  }
  let userId = existingUser?.id;
  try {
    if (!userId) {
      const { data, error } = await admin.auth.admin.createUser({
        email: alias,
        password: row.id,
        email_confirm: true,
        app_metadata: { student_login: true }
      });
      if (error) throw error;
      userId = data.user.id;
      created++;
    }
    const { error } = await admin.from('user_access').insert({
      user_id: userId, role: 'student', student_id: row.id, password_rotated: false
    });
    if (error) throw error;
    linked++;
  } catch (error) {
    failed++;
    console.error(`Student row ${index + 1}: ${error.message}`);
  }
  if ((index + 1) % 100 === 0) console.log(`Processed ${index + 1}/${pending.length}`);
}
console.log(`Created: ${created}; linked: ${linked}; failed: ${failed}`);
if (failed) process.exitCode = 1;
