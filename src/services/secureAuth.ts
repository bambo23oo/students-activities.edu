import { getSupabaseClient } from '../lib/supabase';
import type { UserRole } from '../types';

export interface VerifiedAccess {
  userId: string;
  email: string;
  name: string;
  role: Exclude<UserRole, 'none'>;
  studentId?: string;
  accessToken: string;
}

const requireClient = () => {
  const client = getSupabaseClient();
  if (!client) throw new Error('ระบบลงชื่อเข้าใช้ยังไม่พร้อม กรุณาติดต่อเจ้าหน้าที่');
  return client;
};

export const getVerifiedAccess = async (): Promise<VerifiedAccess | null> => {
  const client = requireClient();
  const { data: { user }, error: userError } = await client.auth.getUser();
  if (userError || !user?.email || !user.email_confirmed_at) return null;

  let { data: access, error: accessError } = await client
    .from('user_access')
    .select('role, student_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (accessError) throw new Error('ไม่สามารถตรวจสอบสิทธิ์ผู้ใช้ได้ กรุณาลองใหม่');
  if (!access) {
    const claim = await client.rpc('claim_student_access');
    if (claim.error) throw new Error('ไม่สามารถจับคู่บัญชีกับรหัสนักศึกษาได้ กรุณาติดต่อเจ้าหน้าที่');
    const result = await client.from('user_access')
      .select('role, student_id')
      .eq('user_id', user.id)
      .maybeSingle();
    access = result.data;
    accessError = result.error;
    if (accessError) throw new Error('ไม่สามารถตรวจสอบสิทธิ์ผู้ใช้ได้ กรุณาลองใหม่');
  }
  if (!access || !['student', 'staff', 'approver'].includes(access.role)) return null;
  if (access.role === 'student' && !access.student_id) return null;

  const { data: { session } } = await client.auth.getSession();
  if (!session?.access_token) return null;

  let name = user.user_metadata?.full_name || user.email;
  if (access.role === 'student') {
    const { data: student, error: studentError } = await client
      .from('students')
      .select('name')
      .eq('id', access.student_id)
      .single();
    if (studentError || !student) return null;
    name = student.name;
  }

  return {
    userId: user.id,
    email: user.email,
    name,
    role: access.role,
    studentId: access.student_id || undefined,
    accessToken: session.access_token
  };
};

export const signInWithEmail = async (email: string, password: string): Promise<VerifiedAccess> => {
  const client = requireClient();
  const { error } = await client.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error('อีเมลหรือรหัสผ่านไม่ถูกต้อง หรือยังไม่ได้ยืนยันอีเมล');
  const access = await getVerifiedAccess();
  if (!access) {
    await client.auth.signOut();
    throw new Error('ยังไม่มีสิทธิ์เข้าใช้ระบบ กรุณาติดต่อเจ้าหน้าที่เพื่อยืนยันข้อมูล');
  }
  return access;
};

export const signInWithUniversity = async (provider: 'google' | 'azure'): Promise<void> => {
  const client = requireClient();
  const { error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: window.location.origin,
      ...(provider === 'azure' ? { scopes: 'email' } : {})
    }
  });
  if (error) throw new Error('ไม่สามารถเริ่มเข้าสู่ระบบด้วยบัญชีมหาวิทยาลัยได้ กรุณาลองใหม่');
};

export const signOut = async (): Promise<void> => {
  await getSupabaseClient()?.auth.signOut();
};
