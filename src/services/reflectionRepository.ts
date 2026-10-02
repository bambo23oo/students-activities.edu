import { db } from '../db/db';
import { getSupabaseClient } from '../lib/supabase';
import type { Reflection } from '../types';

const bucket = 'kpa-evidence';

export const getEvidenceUrl = async (path: string): Promise<string> => {
  const client = getSupabaseClient();
  if (!client) throw new Error('ยังเชื่อมต่อฐานข้อมูลกลางไม่ได้');
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw new Error('เปิดภาพหลักฐานไม่ได้');
  return data.signedUrl;
};

export const saveReflection = async (reflection: Reflection, file?: File): Promise<Reflection> => {
  const client = getSupabaseClient();
  if (!client || !reflection.studentId || !reflection.logId || !reflection.activityId) {
    throw new Error('ไม่พบข้อมูลยืนยันตัวตนหรือการเช็คอิน');
  }
  let evidencePath = reflection.evidencePath;
  let uploadedPath: string | undefined;
  if (file) {
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      throw new Error('กรุณาเลือกภาพ JPG, PNG, WebP หรือ HEIC ขนาดไม่เกิน 5 MB');
    }
    uploadedPath = `${reflection.studentId}/${reflection.logId}/${crypto.randomUUID()}.${file.type.split('/')[1]}`;
    const { error } = await client.storage.from(bucket).upload(uploadedPath, file, { contentType: file.type, upsert: false });
    if (error) throw new Error(`อัปโหลดภาพไม่สำเร็จ: ${error.message}`);
    evidencePath = uploadedPath;
  }

  const payload = {
    id: reflection.id,
    log_id: reflection.logId,
    student_id: reflection.studentId,
    activity_id: reflection.activityId,
    k_knowledge: reflection.knowledge || '',
    p_skill: reflection.practice || '',
    a_attitude: reflection.attitude || '',
    evidence_path: evidencePath || null,
    status: reflection.status,
    submitted_at: reflection.submittedAt || null
  };
  const { data: existing, error: lookupError } = await client.from('reflections').select('id').eq('id', reflection.id).maybeSingle();
  if (lookupError) throw new Error('ตรวจสอบบันทึกเดิมไม่ได้');
  const result = existing
    ? await client.from('reflections').update(payload).eq('id', reflection.id).select('id').single()
    : await client.from('reflections').insert(payload).select('id').single();
  if (result.error || !result.data) {
    if (uploadedPath) await client.storage.from(bucket).remove([uploadedPath]);
    throw new Error(result.error?.message || 'บันทึก K-P-A ไม่สำเร็จ');
  }
  const saved = { ...reflection, evidencePath };
  await db.reflections.put(saved);
  window.dispatchEvent(new Event('db_updated'));
  return saved;
};

export const reviewReflection = async (
  reflection: Reflection,
  logId: string,
  status: 'pending_step2' | 'approved' | 'rejected',
  reason?: string
): Promise<void> => {
  const client = getSupabaseClient();
  if (!client) throw new Error('ยังเชื่อมต่อฐานข้อมูลกลางไม่ได้');
  const { error } = await client.rpc('review_reflection', {
    p_reflection_id: reflection.id, p_status: status, p_reason: reason || null
  });
  if (error) throw new Error(error.message || 'บันทึกผลตรวจไม่สำเร็จ');
  await db.reflections.update(reflection.id, { status, rejectionReason: reason });
  await db.checkInLogs.update(logId, status === 'pending_step2'
    ? { staffStatus: 'verified' }
    : status === 'approved' ? { execStatus: 'approved' }
      : reflection.status === 'pending_step1' ? { staffStatus: 'rejected' } : { execStatus: 'rejected' });
  window.dispatchEvent(new Event('db_updated'));
};
