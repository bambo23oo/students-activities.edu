import { getSupabaseClient } from '../lib/supabase';
import { CheckInLog, Student, Activity, Reflection } from '../types';
import { db } from '../db/db';

/**
 * Translates technical Supabase errors to friendly actionable Thai messages
 */
export const formatSupabaseError = (err: any): string => {
  if (!err) return 'ข้อผิดพลาดที่ไม่ทราบสาเหตุ';
  const msg = err.message || '';
  const code = err.code || '';

  if (code === '42P01' || msg.includes('does not exist') || msg.includes('schema cache')) {
    return 'ไม่พบตารางในฐานข้อมูล Supabase! กรุณาคัดลอกสคริปต์ SQL ไปวางใน Supabase SQL Editor แล้วกด Run ก่อนใช้งาน';
  }
  if (code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'ติดสิทธิ์การเข้าถึง (Row Level Security) กรุณารันคำสั่ง SQL สร้าง Policy ให้เรียบร้อย';
  }
  if (code === '23503' || msg.includes('foreign key')) {
    return 'ข้อมูลอ้างอิงไม่ตรงกัน (Foreign Key) ต้องมีข้อมูลกิจกรรมและนักศึกษาก่อน';
  }
  if (code === 'PGRST301' || msg.includes('JWT') || msg.includes('Invalid API key')) {
    return 'API Key ไม่ถูกต้อง กรุณาตรวจสอบ anon public key ในหน้าตั้งค่า';
  }
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
    return 'ไม่สามารถเชื่อมต่อไปยัง Supabase ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตและ Project URL';
  }
  return msg || code;
};

export const pullFromSupabase = async () => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('ยังไม่ได้เชื่อมต่อกับ Supabase (กรุณากรอก URL และ API Key)');

  const { data: students, error: sErr } = await supabase.from('students').select('*');
  if (sErr) throw new Error(`ตาราง students: ${formatSupabaseError(sErr)}`);

  const { data: activities, error: aErr } = await supabase.from('activities').select('*');
  if (aErr) throw new Error(`ตาราง activities: ${formatSupabaseError(aErr)}`);

  const { data: logs, error: lErr } = await supabase.from('check_in_logs').select('*');
  if (lErr) throw new Error(`ตาราง check_in_logs: ${formatSupabaseError(lErr)}`);

  const { data: reflections } = await supabase.from('reflections').select('*');

  // Clear local and replace safely in a single transaction
  await db.transaction('rw', db.students, db.activities, db.checkInLogs, db.reflections, async () => {
    await db.students.clear();
    await db.activities.clear();
    await db.checkInLogs.clear();
    await db.reflections.clear();

    if (students && students.length > 0) {
      await db.students.bulkPut(students.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email || undefined,
        faculty: s.faculty || undefined,
        major: s.major || undefined,
        year: s.year || undefined
      })));
    }

    if (activities && activities.length > 0) {
      await db.activities.bulkPut(activities.map(a => ({
        id: a.id,
        name: a.name,
        date: a.date,
        endDate: a.end_date || a.date,
        location: a.location || '',
        description: a.description || '',
        status: a.status || 'active',
        hours: a.hours || 3,
        category: a.category,
        yearLevel: a.year_level,
        cohort: a.cohort,
        isImported: true,
        source: 'imported' as const
      })));
    }

    if (logs && logs.length > 0) {
      await db.checkInLogs.bulkPut(logs.map(l => ({
        id: l.id,
        studentId: l.student_id,
        activityId: l.activity_id,
        timestamp: l.timestamp,
        method: l.method || 'camera',
        staffStatus: l.staff_status || 'pending', execStatus: l.exec_status || 'pending'
      })));
    }

    if (reflections && reflections.length > 0) {
      await db.reflections.bulkPut(reflections.map((r: any) => ({
        id: r.id,
        logId: r.log_id || undefined,
        studentId: r.student_id,
        activityId: r.activity_id,
        knowledge: r.k_knowledge || '',
        practice: r.p_skill || '',
        attitude: r.a_attitude || '',
        status: r.status || 'pending_step1',
        submittedAt: r.submitted_at || new Date().toISOString()
      })));
    }
  });
};

export const logCheckInToSupabase = async (log: CheckInLog, student: Student) => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    // Supabase not configured: mark as pending or local-only
    await db.checkInLogs.update(log.id, { syncStatus: 'pending' }).catch(() => {});
    return;
  }

  try {
    // 0. Ensure Activity exists in Supabase so foreign key won't fail
    if (log.activityId) {
      const localActivity = await db.activities.get(log.activityId);
      if (localActivity) {
        await supabase.from('activities').upsert({
          id: localActivity.id,
          name: localActivity.name,
          date: localActivity.date,
          end_date: localActivity.endDate || localActivity.date,
          location: localActivity.location || null,
          description: localActivity.description || null,
          status: localActivity.status || 'active'
        }, { onConflict: 'id' });
      }
    }

    // 1. Upsert student
    const { error: studentError } = await supabase
      .from('students')
      .upsert({
        id: student.id,
        name: student.name,
        email: student.email || null,
        faculty: student.faculty || 'คณะครุศาสตร์',
        major: student.major || 'สาขาวิชาคอมพิวเตอร์ศึกษา',
        year: student.year || 1
      }, { onConflict: 'id' });

    if (studentError) {
      console.warn('Supabase: Warning upserting student:', formatSupabaseError(studentError));
    }

    // 2. Insert or upsert check-in log (Idempotent by log.id)
    const logPayload: any = {
      id: log.id,
      student_id: log.studentId,
      activity_id: log.activityId,
      timestamp: log.timestamp,
      method: log.method,
      staff_status: log.staffStatus,
      exec_status: log.execStatus,
      student_note: log.studentNote || null,
      audit_trail: log.auditTrail || null
    };

    if (log.scannerStation) {
      logPayload.scanner_station = log.scannerStation;
    }

    let { error: logError } = await supabase
      .from('check_in_logs')
      .upsert(logPayload, { onConflict: 'id' });

    // Fallback if older Supabase schema doesn't have scanner_station column yet
    if (logError && (logError.code === '42703' || logError.message?.includes('scanner_station'))) {
      delete logPayload.scanner_station;
      const retry = await supabase.from('check_in_logs').upsert(logPayload, { onConflict: 'id' });
      logError = retry.error;
    }

    if (logError) {
      console.warn('Supabase: Warning inserting log:', formatSupabaseError(logError));
      await db.checkInLogs.update(log.id, { syncStatus: 'pending' }).catch(() => {});
    } else {
      console.log('Supabase: Check-in log synced successfully');
      await db.checkInLogs.update(log.id, { syncStatus: 'synced' }).catch(() => {});
    }
  } catch (err: any) {
    console.error('Supabase: Sync error in logCheckInToSupabase:', err);
    await db.checkInLogs.update(log.id, { syncStatus: 'pending' }).catch(() => {});
  }
};

/**
 * Sync all pending offline logs to Supabase in batches
 */
export const syncPendingLogsToSupabase = async (): Promise<{ synced: number; failed: number }> => {
  const supabase = getSupabaseClient();
  if (!supabase || !navigator.onLine) {
    return { synced: 0, failed: 0 };
  }

  try {
    const pendingLogs = await db.checkInLogs
      .filter(l => l.syncStatus === 'pending')
      .limit(50)
      .toArray();

    if (pendingLogs.length === 0) {
      return { synced: 0, failed: 0 };
    }

    let syncedCount = 0;
    let failedCount = 0;

    for (const log of pendingLogs) {
      const student = await db.students.get(log.studentId) || {
        id: log.studentId,
        name: `นักศึกษา (${log.studentId})`,
        email: `${log.studentId}@npu.ac.th`,
        faculty: 'คณะครุศาสตร์',
        major: 'ไม่ระบุสาขา',
        year: 1
      };

      try {
        await logCheckInToSupabase(log, student);
        const check = await db.checkInLogs.get(log.id);
        if (check?.syncStatus === 'synced') {
          syncedCount++;
        } else {
          failedCount++;
        }
      } catch (e) {
        failedCount++;
      }
    }

    if (syncedCount > 0) {
      window.dispatchEvent(new Event('db_updated'));
    }

    return { synced: syncedCount, failed: failedCount };
  } catch (e) {
    console.error('Error in syncPendingLogsToSupabase:', e);
    return { synced: 0, failed: 0 };
  }
};

/**
 * Gets count of pending offline logs waiting to be pushed
 */
export const getPendingSyncCount = async (): Promise<number> => {
  try {
    return await db.checkInLogs.filter(l => l.syncStatus === 'pending').count();
  } catch (e) {
    return 0;
  }
};

export const syncAllDataToSupabase = async (data: {
  students: Student[];
  activities: Activity[];
  checkInLogs: CheckInLog[];
  reflections?: Reflection[];
}) => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('ยังไม่ได้ระบุการเชื่อมต่อ Supabase (กรุณากรอก Project URL และ API Key ในหน้าตั้งค่า)');

  // 1. Students
  if (data.students.length > 0) {
    const mappedStudents = data.students.map(s => ({
      id: s.id,
      name: s.name,
      email: s.email || null,
      faculty: s.faculty || null,
      major: s.major || null,
      year: s.year || 1
    }));
    const { error: sErr } = await supabase.from('students').upsert(mappedStudents, { onConflict: 'id' });
    if (sErr) throw new Error(`ตาราง students: ${formatSupabaseError(sErr)}`);
  }

  // 2. Activities
  if (data.activities.length > 0) {
    const mappedActivities = data.activities.map(a => ({
      id: a.id,
      name: a.name,
      date: a.date,
      end_date: a.endDate || null,
      location: a.location || null,
      description: a.description || null,
      status: a.status || 'active'
    }));
    const { error: aErr } = await supabase.from('activities').upsert(mappedActivities, { onConflict: 'id' });
    if (aErr) throw new Error(`ตาราง activities: ${formatSupabaseError(aErr)}`);
  }

  // 3. Check-In Logs
  if (data.checkInLogs.length > 0) {
    const mappedLogs = data.checkInLogs.map(l => ({
      id: l.id,
      student_id: l.studentId,
      activity_id: l.activityId,
      timestamp: l.timestamp,
      method: l.method || 'camera',
      staff_status: l.staffStatus,
      exec_status: l.execStatus,
      student_note: l.studentNote || null,
      audit_trail: l.auditTrail || null
    }));
    const { error: lErr } = await supabase.from('check_in_logs').upsert(mappedLogs, { onConflict: 'id' });
    if (lErr) throw new Error(`ตาราง check_in_logs: ${formatSupabaseError(lErr)}`);
  }

  // 4. Reflections
  if (data.reflections && data.reflections.length > 0) {
    const mappedReflections = data.reflections.map(r => ({
      id: r.id,
      log_id: r.logId || null,
      student_id: r.studentId || '',
      activity_id: r.activityId || '',
      k_knowledge: r.knowledge || null,
      p_skill: r.practice || null,
      a_attitude: r.attitude || null,
      moral: null,
      feedback: null,
      status: r.status || 'pending_step1',
      reject_reason: r.rejectionReason || null,
      submitted_at: r.submittedAt || new Date().toISOString(),
      updated_at: r.submittedAt || new Date().toISOString()
    }));
    const { error: rErr } = await supabase.from('reflections').upsert(mappedReflections, { onConflict: 'id' });
    if (rErr) throw new Error(`ตาราง reflections: ${formatSupabaseError(rErr)}`);
  }
};

let realtimeSubscription: any = null;
let debounceTimer: any = null;
let autoSyncInterval: any = null;

const triggerDebouncedDbUpdate = (onUpdate?: () => void) => {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    if (onUpdate) onUpdate();
    window.dispatchEvent(new Event('db_updated'));
  }, 120);
};

export const setupRealtimeSync = (onUpdate?: () => void) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  if (realtimeSubscription) {
    try {
      supabase.removeChannel(realtimeSubscription);
    } catch (e) {}
  }

  // Periodic offline queue processor (every 8 seconds if online)
  if (!autoSyncInterval) {
    autoSyncInterval = setInterval(() => {
      if (navigator.onLine) {
        syncPendingLogsToSupabase().catch(() => {});
      }
    }, 8000);
  }

  realtimeSubscription = supabase
    .channel('npu_realtime_multi_scanner')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'check_in_logs' }, async (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const row = payload.new as any;
        await db.checkInLogs.put({
          id: row.id,
          studentId: row.student_id,
          activityId: row.activity_id,
          timestamp: row.timestamp,
          method: row.method || 'camera',
          staffStatus: row.staff_status || 'verified', 
          execStatus: row.exec_status || 'pending',
          scannerStation: row.scanner_station || undefined,
          syncStatus: 'synced'
        });
      } else if (payload.eventType === 'DELETE') {
        await db.checkInLogs.delete(payload.old.id);
      }
      triggerDebouncedDbUpdate(onUpdate);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, async (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        const row = payload.new as any;
        await db.students.put({
          id: row.id,
          name: row.name,
          email: row.email || undefined,
          faculty: row.faculty || undefined,
          major: row.major || undefined,
          year: row.year || undefined
        });
      }
      triggerDebouncedDbUpdate(onUpdate);
    })
    .subscribe((status) => {
      console.log('Supabase realtime status:', status);
    });
    
  console.log('Supabase realtime multi-device scanner sync initialized.');
};
