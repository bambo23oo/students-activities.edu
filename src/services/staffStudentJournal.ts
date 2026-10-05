import { getSupabaseClient } from '../lib/supabase';
import type { Activity, CheckInLog, Reflection } from '../types';
import { buildStudentJournalEntries, type JournalEntry } from './studentJournal';
import { formatSupabaseError } from './supabaseApi';

export interface StaffStudentJournal {
  studentId: string;
  studentName: string;
  entries: JournalEntry[];
}

/** Read one student's checked-in journal through the signed-in staff session. */
export const loadStaffStudentJournal = async (studentId: string): Promise<StaffStudentJournal> => {
  const client = getSupabaseClient();
  if (!client) throw new Error('ยังไม่เชื่อมต่อฐานข้อมูลกลาง');

  const [studentResult, logResult, reflectionResult] = await Promise.all([
    client.from('students').select('id, name').eq('id', studentId).maybeSingle(),
    client.from('check_in_logs').select('id, student_id, activity_id, timestamp, method, staff_status, exec_status')
      .eq('student_id', studentId).order('timestamp', { ascending: false }),
    client.from('reflections').select('id, log_id, student_id, activity_id, status')
      .eq('student_id', studentId)
  ]);
  const error = studentResult.error || logResult.error || reflectionResult.error;
  if (error) throw new Error(formatSupabaseError(error));
  if (!studentResult.data) throw new Error('ไม่พบข้อมูลนักศึกษาในทะเบียน');
  if (!logResult.data?.length) throw new Error('นักศึกษาคนนี้ยังไม่มีรายการเช็กอินในฐานข้อมูลกลาง');

  const activityIds = [...new Set(logResult.data.map(log => log.activity_id))];
  const activityResult = await client.from('activities')
    .select('id, name, date, description, location, status, category, hours')
    .in('id', activityIds);
  if (activityResult.error) throw new Error(formatSupabaseError(activityResult.error));

  const logs: CheckInLog[] = logResult.data.map(log => ({
    id: log.id, studentId: log.student_id, activityId: log.activity_id,
    timestamp: log.timestamp, method: log.method || 'manual',
    staffStatus: log.staff_status || 'pending', execStatus: log.exec_status || 'pending'
  }));
  const activities: Activity[] = (activityResult.data || []).map(activity => ({
    id: activity.id, name: activity.name, date: activity.date,
    description: activity.description || '', location: activity.location || '',
    status: activity.status || 'completed', category: activity.category || undefined,
    hours: activity.hours ?? undefined
  }));
  const reflections: Reflection[] = (reflectionResult.data || []).map(reflection => ({
    id: reflection.id, logId: reflection.log_id || undefined,
    studentId: reflection.student_id, activityId: reflection.activity_id || undefined,
    status: reflection.status || 'draft'
  }));

  return {
    studentId,
    studentName: studentResult.data.name,
    entries: buildStudentJournalEntries(studentId, logs, activities, reflections)
  };
};
