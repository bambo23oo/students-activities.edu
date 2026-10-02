import { db } from '../db/db';
import { getSupabaseClient } from '../lib/supabase';
import type { Activity } from '../types';

const activityPayload = (activity: Activity) => ({
  id: activity.id,
  name: activity.name.trim(),
  date: activity.date,
  end_date: activity.endDate || null,
  start_time: activity.startTime || null,
  end_time: activity.endTime || null,
  location: activity.location.trim() || null,
  description: activity.description.trim() || null,
  status: activity.status,
  hours: activity.hours ?? 0,
  category: activity.category || null,
  year_level: activity.yearLevel || null,
  cohort: activity.cohort || null,
  points: activity.points ?? null,
  capacity: activity.capacity ?? null,
  assigned_staff_emails: activity.assignedStaffEmails || [],
  self_check_in_allowed: activity.selfCheckInAllowed ?? false,
  schedule_status: activity.scheduleStatus || null,
  original_schedule: activity.originalSchedule || null,
  new_schedule: activity.newSchedule || null,
  duration: activity.duration || null,
  note: activity.note || null,
  is_imported: activity.isImported ?? false,
  source: activity.source || 'custom'
});

export const saveActivity = async (activity: Activity, existing: boolean): Promise<void> => {
  const client = getSupabaseClient();
  if (!client) throw new Error('ยังเชื่อมต่อฐานข้อมูลกลางไม่ได้');
  if (!activity.name.trim() || !activity.date) throw new Error('กรุณาระบุชื่อและวันที่จัดกิจกรรม');
  if ((activity.hours ?? 0) < 0) throw new Error('ชั่วโมงกิจกรรมต้องไม่ติดลบ');
  if (activity.endDate && activity.endDate < activity.date) throw new Error('วันที่สิ้นสุดต้องไม่ก่อนวันที่เริ่ม');
  if (activity.startTime && activity.endTime && activity.endDate === activity.date && activity.endTime <= activity.startTime) {
    throw new Error('เวลาสิ้นสุดต้องหลังเวลาเริ่ม');
  }

  const payload = activityPayload(activity);
  const query = existing
    ? client.from('activities').update(payload).eq('id', activity.id)
    : client.from('activities').insert(payload);
  const { data, error } = await query.select('id').single();
  if (error || !data) throw new Error(error?.message || 'บันทึกกิจกรรมไม่สำเร็จ กรุณาตรวจสอบสิทธิ์');

  await db.activities.put(activity);
  window.dispatchEvent(new Event('db_updated'));
};

export const saveActivityStatus = async (activity: Activity, status: Activity['status']): Promise<void> => {
  const client = getSupabaseClient();
  if (!client) throw new Error('ยังเชื่อมต่อฐานข้อมูลกลางไม่ได้');
  const { data, error } = await client.from('activities').update({ status }).eq('id', activity.id).select('id').single();
  if (error || !data) throw new Error(error?.message || 'เปลี่ยนสถานะกิจกรรมไม่สำเร็จ');
  await db.activities.update(activity.id, { status });
  window.dispatchEvent(new Event('db_updated'));
};
