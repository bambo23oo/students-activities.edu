import Dexie, { Table } from 'dexie';
import { Activity, Student, CheckInLog, Reflection, SystemUser, SystemAuditLog } from '../types';
import { REAL_FACULTY_ACTIVITIES } from '../data/realActivities';
import { INITIAL_NPU_STUDENTS } from '../data/initialStudents';

export class AppDatabase extends Dexie {
  activities!: Table<Activity, string>;
  students!: Table<Student, string>;
  checkInLogs!: Table<CheckInLog, string>;
  reflections!: Table<Reflection, string>;
  systemUsers!: Table<SystemUser, string>;
  auditLogs!: Table<SystemAuditLog, string>;

  constructor() {
    super('NPUActivityDatabase');
    this.version(1).stores({
      activities: 'id, name, status, date',
      students: 'id, name, email, major, faculty',
      checkInLogs: 'id, studentId, activityId, timestamp',
      reflections: 'id, logId, studentId, status',
    });
    this.version(2).stores({
      checkInLogs: 'id, studentId, activityId, timestamp, staffStatus, execStatus, syncStatus, [activityId+studentId]',
    });
    this.version(3).stores({
      systemUsers: 'id, email, role, status',
      auditLogs: 'id, actor, action, timestamp'
    });
  }
}

export const db = new AppDatabase();

/**
 * Logs a system-wide audit event for administrative tracing and accountability
 */
export const logSystemAction = async (
  actor: string,
  actorRole: string,
  action: string,
  target: string,
  details: string,
  station?: string
): Promise<void> => {
  try {
    const entry: SystemAuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      actor,
      actorRole,
      action,
      target,
      details,
      timestamp: new Date().toISOString(),
      station: station || 'Web Portal',
      ipOrDevice: navigator.userAgent.includes('Mobile') ? 'Mobile Device' : 'Desktop Station'
    };
    await db.auditLogs.put(entry);
    window.dispatchEvent(new CustomEvent('audit_logged', { detail: entry }));
  } catch (err) {
    console.error('Error logging audit action:', err);
  }
};

/**
 * Purges all self-created/mock activities and retains only the imported activities
 * (the 18 official faculty activities + any user-imported activities with isImported: true)
 */
export const purgeSelfCreatedActivities = async (): Promise<{ deletedCount: number; keptCount: number }> => {
  try {
    const realIds = new Set(REAL_FACULTY_ACTIVITIES.map(a => a.id));
    const allActs = await db.activities.toArray();
    const toDelete: string[] = [];

    for (const act of allActs) {
      const isOfficial = realIds.has(act.id);
      const isImported = act.isImported === true;
      const isCustom = act.source === 'custom' || (!isOfficial && !isImported);
      if (isCustom) {
        toDelete.push(act.id);
      }
    }

    if (toDelete.length > 0) {
      await db.activities.bulkDelete(toDelete);
    }

    // Ensure all 18 official Faculty of Education activities exist and are marked as imported
    await db.activities.bulkPut(REAL_FACULTY_ACTIVITIES);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('db_updated'));
    }

    const remaining = await db.activities.count();
    return { deletedCount: toDelete.length, keptCount: remaining };
  } catch (err) {
    console.error('Error purging self-created activities:', err);
    return { deletedCount: 0, keptCount: await db.activities.count() };
  }
};

export const initializeMockData = async () => {
  const studentsCount = await db.students.count();
  if (studentsCount === 0) {
    await db.students.bulkPut(INITIAL_NPU_STUDENTS);
  }

  // Seed the local demo only on a new device. Existing records belong to the user.
  if (await db.activities.count() === 0) {
    await db.activities.bulkPut(REAL_FACULTY_ACTIVITIES);
  }
};

/**
 * Re-imports or forces reload of the full official student roster across 4 cohorts and 2 faculties
 */
export const importInitialStudentRoster = async (): Promise<number> => {
  await db.students.bulkPut(INITIAL_NPU_STUDENTS);
  await ensureAdminData();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('db_updated', { detail: { action: 'roster_imported' } }));
  }
  return INITIAL_NPU_STUDENTS.length;
};

/**
 * Clears all check-in logs, reflections, custom activities,
 * and resets database to ONLY the 18 official faculty projects (REAL_FACULTY_ACTIVITIES).
 */
export const clearAllAndKeepRealActivitiesOnly = async (): Promise<{
  activitiesCount: number;
  studentsCount: number;
  logsCount: number;
  reflectionsCount: number;
}> => {
  try {
    // 1. Clear check-in logs
    await db.checkInLogs.clear();

    // 2. Clear reflections
    await db.reflections.clear();

    // 3. Reset activities strictly to the 18 official faculty projects
    await db.activities.clear();
    await db.activities.bulkPut(REAL_FACULTY_ACTIVITIES);

    // 4. Reset students strictly to the official faculty students & admins
    await db.students.clear();
    await db.students.bulkPut(INITIAL_NPU_STUDENTS);
    await ensureAdminData();

    if (typeof window !== 'undefined') {
      localStorage.setItem('npu_real_projects_only_cleared', 'true');
      window.dispatchEvent(new CustomEvent('db_updated', {
        detail: { action: 'clear_all_except_real_activities', timestamp: Date.now() }
      }));

      try {
        const bc = new BroadcastChannel('npu_db_sync');
        bc.postMessage({ type: 'cleared_to_real_activities', timestamp: Date.now() });
        bc.close();
      } catch (e) {}
    }

    return {
      activitiesCount: await db.activities.count(),
      studentsCount: await db.students.count(),
      logsCount: 0,
      reflectionsCount: 0
    };
  } catch (err) {
    console.error('Error clearing data to real projects only:', err);
    throw err;
  }
};

export const ensureAdminData = async () => {
  try {
    const admin1 = await db.students.where('email').equals('srisuda.com@npu.ac.th').first();
    if (!admin1) {
      await db.students.put({
        id: 'ADM-6601001',
        name: 'ผศ.ดร.ศรีสุดา ด้วงโต้ด',
        email: 'srisuda.com@npu.ac.th',
        prefix: 'ผศ.ดร.',
        firstName: 'ศรีสุดา',
        lastName: 'ด้วงโต้ด',
        major: 'สาขาวิชาคอมพิวเตอร์ศึกษา',
        faculty: 'คณะครุศาสตร์',
        university: 'มหาวิทยาลัยนครพนม',
        year: 4
      });
    }

    const admin2 = await db.students.where('email').equals('sci.edu@npu.ac.th').first();
    if (!admin2) {
      await db.students.put({
        id: 'ADM-6601002',
        name: 'ผู้ดูแลระบบกิจกรรม คณะวิทยาศาสตร์',
        email: 'sci.edu@npu.ac.th',
        prefix: 'อาจารย์',
        firstName: 'ผู้ดูแลระบบ',
        lastName: 'คณะวิทยาศาสตร์',
        major: 'สาขาวิชาฟิสิกส์ (ค.บ.)',
        faculty: 'คณะวิทยาศาสตร์',
        university: 'มหาวิทยาลัยนครพนม',
        year: 4
      });
    }

    // Auto-normalize any existing students in IndexedDB so their faculty and major match the official curriculum
    const allStudents = await db.students.toArray();
    for (const st of allStudents) {
      let needsUpdate = false;
      let newFaculty = st.faculty;
      let newMajor = st.major;

      if (st.faculty !== 'คณะครุศาสตร์' && st.faculty !== 'คณะวิทยาศาสตร์') {
        const isSci = st.major?.includes('ฟิสิกส์') || st.major?.includes('ชีววิทยา') || st.faculty?.includes('วิทยาศาสตร์');
        newFaculty = isSci ? 'คณะวิทยาศาสตร์' : 'คณะครุศาสตร์';
        needsUpdate = true;
      }

      if (st.major === 'สาขาวิชาคณิตศาสตร์') {
        newMajor = 'สาขาวิชาคณิตศาสตรศึกษา';
        needsUpdate = true;
      } else if (st.major === 'สาขาวิชาวิทยาศาสตร์ทั่วไป') {
        newMajor = 'สาขาวิชาวิทยาศาสตร์';
        needsUpdate = true;
      } else if (st.major === 'สาขาวิชาวิทยาการคอมพิวเตอร์') {
        newMajor = 'สาขาวิชาฟิสิกส์ (ค.บ.)';
        newFaculty = 'คณะวิทยาศาสตร์';
        needsUpdate = true;
      } else if (st.major === 'สาขาวิชาเทคโนโลยีสารสนเทศ') {
        newMajor = 'สาขาวิชาชีววิทยา (ค.บ.)';
        newFaculty = 'คณะวิทยาศาสตร์';
        needsUpdate = true;
      }

      if (needsUpdate) {
        await db.students.update(st.id, {
          faculty: newFaculty,
          major: newMajor
        });
      }
    }

    // 1. Remove mock user if present
    await db.systemUsers.delete('usr_student_demo');

    // 2. Upsert real administrator and staff accounts with official username and password
    const realAccounts: SystemUser[] = [
      {
        id: 'usr_admin',
        username: 'admin',
        password: 'tpc@2026',
        name: 'ผู้ดูแลระบบและผู้บริหาร (Admin คณะครุศาสตร์)',
        email: 'admin@npu.ac.th',
        role: 'approver',
        faculty: 'คณะครุศาสตร์',
        permissions: { canScan: true, canExport: true, canApprove: true, isSuperAdmin: true },
        status: 'active',
        lastLogin: new Date().toISOString()
      },
      {
        id: 'usr_staffedu',
        username: 'staffedu',
        password: 'tpc@2026',
        name: 'เจ้าหน้าที่กิจกรรม คณะครุศาสตร์ (Staff)',
        email: 'staffedu@npu.ac.th',
        role: 'staff',
        faculty: 'คณะครุศาสตร์',
        permissions: { canScan: true, canExport: true, canApprove: false, isSuperAdmin: false },
        status: 'active',
        lastLogin: new Date().toISOString()
      }
    ];

    await db.systemUsers.bulkPut(realAccounts);
  } catch (err) {
    console.error('Error ensuring admin data:', err);
  }
};

/**
 * Auto-cleans and normalizes any corrupted Thai-encoded logs and students in IndexedDB
 */
export const cleanCorruptedThaiRecords = async () => {
  try {
    const { hasThaiCharacters, extractAndCleanStudentID } = await import('../utils/thaiKeyboardConverter');
    const logs = await db.checkInLogs.toArray();
    const students = await db.students.toArray();

    // 1. Clean checkInLogs
    const seenMap = new Set<string>(); // key: `${cleanStudentId}_${activityId}`
    for (const log of logs) {
      if (hasThaiCharacters(log.studentId) || hasThaiCharacters(log.id)) {
        const { studentId: cleanId } = extractAndCleanStudentID(log.studentId);
        const compositeKey = `${cleanId}_${log.activityId}`;

        // If duplicate already exists or processed, delete this corrupted duplicate
        if (seenMap.has(compositeKey)) {
          await db.checkInLogs.delete(log.id);
          continue;
        }

        // Delete the corrupted record and put the clean one
        await db.checkInLogs.delete(log.id);
        await db.checkInLogs.put({
          ...log,
          id: `log_${new Date(log.timestamp).getTime() || Date.now()}_${cleanId}`,
          studentId: cleanId
        });
        seenMap.add(compositeKey);
      } else {
        const compositeKey = `${log.studentId}_${log.activityId}`;
        if (seenMap.has(compositeKey)) {
          // Remove duplicate
          await db.checkInLogs.delete(log.id);
        } else {
          seenMap.add(compositeKey);
        }
      }
    }

    // 2. Clean corrupted student mock records
    for (const student of students) {
      if (hasThaiCharacters(student.id)) {
        const { studentId: cleanId } = extractAndCleanStudentID(student.id);
        await db.students.delete(student.id);
        
        // If clean student doesn't exist, create it cleanly
        const existingClean = await db.students.get(cleanId);
        if (!existingClean && cleanId) {
          await db.students.put({
            id: cleanId,
            name: `นักศึกษา (${cleanId})`,
            email: `${cleanId}@npu.ac.th`,
            faculty: 'มหาวิทยาลัยนครพนม',
            major: 'ไม่ระบุสาขา',
            year: 1
          });
        }
      }
    }
  } catch (err) {
    console.error('Error cleaning corrupted records:', err);
  }
};

