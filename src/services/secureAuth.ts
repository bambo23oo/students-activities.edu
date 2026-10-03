import { getSupabaseClient } from '../lib/supabase';
import type { UserRole } from '../types';

export interface VerifiedAccess {
  userId: string;
  email: string;
  name: string;
  role: Exclude<UserRole, 'none'>;
  studentId?: string;
  requiresPasswordChange: boolean;
  accessToken: string;
}

const studentLoginEmail = (studentId: string) => `${studentId}@student-login.invalid`;

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
    .select('role, student_id, password_rotated')
    .eq('user_id', user.id)
    .maybeSingle();
  if (accessError) throw new Error('ไม่สามารถตรวจสอบสิทธิ์ผู้ใช้ได้ กรุณาลองใหม่');
  if (!access) {
    const claim = await client.rpc('claim_student_access');
    if (claim.error) throw new Error('ไม่สามารถจับคู่บัญชีกับรหัสนักศึกษาได้ กรุณาติดต่อเจ้าหน้าที่');
    const result = await client.from('user_access')
      .select('role, student_id, password_rotated')
      .eq('user_id', user.id)
      .maybeSingle();
    access = result.data;
    accessError = result.error;
    if (accessError) throw new Error('ไม่สามารถตรวจสอบสิทธิ์ผู้ใช้ได้ กรุณาลองใหม่');
  }
  if (!access || !['student', 'staff', 'approver'].includes(access.role)) return null;
  if (access.role === 'student' && !access.student_id) return null;
  const requiresPasswordChange = access.role === 'student' && access.password_rotated === false;

  const { data: { session } } = await client.auth.getSession();
  if (!session?.access_token) return null;

  let name = user.user_metadata?.full_name || user.email;
  if (access.role === 'student' && !requiresPasswordChange) {
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
    requiresPasswordChange,
    accessToken: session.access_token
  };
};

export const signInWithStudentId = async (studentId: string, password: string): Promise<VerifiedAccess> => {
  const cleanId = studentId.trim();
  if (!/^\d{12}$/.test(cleanId) || !password) {
    throw new Error('กรุณากรอกรหัสนักศึกษา 12 หลักและรหัสผ่าน');
  }
  const client = requireClient();
  const { error } = await client.auth.signInWithPassword({
    email: studentLoginEmail(cleanId), password
  });
  if (error) throw new Error('รหัสนักศึกษาหรือรหัสผ่านไม่ถูกต้อง กรุณาลองอีกครั้ง');
  const access = await getVerifiedAccess();
  if (!access || access.role !== 'student' || access.studentId !== cleanId) {
    await client.auth.signOut();
    throw new Error('บัญชีนี้ยังไม่ได้รับสิทธิ์นักศึกษา กรุณาติดต่อเจ้าหน้าที่');
  }
  return access;
};

export const changeStudentPassword = async (studentId: string, currentPassword: string, newPassword: string): Promise<void> => {
  if (newPassword.length < 12 || newPassword === studentId || newPassword === currentPassword) {
    throw new Error('รหัสผ่านใหม่ต้องมีอย่างน้อย 12 ตัวอักษร และต่างจากรหัสเดิม');
  }
  const client = requireClient();
  const { error } = await client.auth.updateUser({ password: newPassword, current_password: currentPassword });
  if (error) throw new Error('เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาตรวจรหัสเดิมแล้วลองอีกครั้ง');
};

export const saveUniversityEmail = async (studentId: string, email: string): Promise<void> => {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@npu\.ac\.th$/.test(normalized)) {
    throw new Error('กรุณาใช้อีเมลมหาวิทยาลัยที่ลงท้ายด้วย @npu.ac.th');
  }
  const client = requireClient();
  const { error } = await client.from('student_contact').upsert({
    student_id: studentId, university_email: normalized, verified_at: null
  }, { onConflict: 'student_id' });
  if (error) throw new Error('บันทึกอีเมลไม่สำเร็จ กรุณาลองอีกครั้ง');
};

export const getUniversityEmail = async (studentId: string): Promise<string> => {
  const client = requireClient();
  const { data, error } = await client.from('student_contact')
    .select('university_email').eq('student_id', studentId).maybeSingle();
  if (error) throw new Error('อ่านอีเมลมหาวิทยาลัยไม่สำเร็จ');
  return data?.university_email || '';
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
