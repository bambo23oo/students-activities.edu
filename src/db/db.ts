import Dexie, { Table } from 'dexie';
import { Activity, Student, CheckInLog, Reflection, SystemUser, SystemAuditLog } from '../types';
import { REAL_FACULTY_ACTIVITIES } from '../data/realActivities';
import legacyDemoSignatures from '../data/legacyDemoSignatures.json';

export class AppDatabase extends Dexie {
  activities!: Table<Activity, string>;
  students!: Table<Student, string>;
  checkInLogs!: Table<CheckInLog, string>;
  reflections!: Table<Reflection, string>;
  systemUsers!: Table<SystemUser, string>;
  auditLogs!: Table<SystemAuditLog, string>;
  retiredDemoStudents!: Table<{
    id: string;
    student: Student;
    checkInLogs: CheckInLog[];
    reflections: Reflection[];
    archivedAt: string;
  }, string>;
  quarantinedCheckInLogs!: Table<{
    id: string;
    log: CheckInLog;
    archivedAt: string;
  }, string>;

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
    this.version(4).stores({
      retiredDemoStudents: 'id, archivedAt'
    });
    this.version(5).stores({
      quarantinedCheckInLogs: 'id, archivedAt'
    });
  }
}

export const db = new AppDatabase();

export const clearPrivateBrowserData = async (): Promise<void> => {
  await db.transaction('rw', [db.activities, db.students, db.checkInLogs,
    db.reflections, db.systemUsers, db.auditLogs, db.retiredDemoStudents,
    db.quarantinedCheckInLogs], async () => {
      await Promise.all([
        db.activities.clear(), db.students.clear(), db.checkInLogs.clear(),
        db.reflections.clear(), db.systemUsers.clear(), db.auditLogs.clear(),
        db.retiredDemoStudents.clear(), db.quarantinedCheckInLogs.clear()
      ]);
    });
};

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

export const initializeLocalActivities = async () => {
  if (await db.activities.count() === 0) {
    await db.activities.bulkPut(REAL_FACULTY_ACTIVITIES);
  }
};

/**
 * Retires only unchanged records from the former bundled demo roster. Keep a
 * recoverable copy in IndexedDB and leave every other student untouched.
 */
export const retireLegacyDemoStudents = async (): Promise<string[]> => {
  const retiredIds: string[] = [];
  const unchangedDemoRecords: Student[] = [];
  for (const sample of legacyDemoSignatures) {
    const current = await db.students.get(sample.id);
    if (!current || current.profileImage || current.password || current.isPreRegistered || current.isTemporary) continue;
    const serialized = [current.id, current.name, current.email, current.major, current.faculty, current.registeredAt].join('|');
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(serialized));
    const sha256 = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    if (sha256 === sample.sha256) unchangedDemoRecords.push(current);
  }
  await db.transaction('rw', db.students, db.checkInLogs, db.reflections, db.retiredDemoStudents, async () => {
    for (const current of unchangedDemoRecords) {
      const checkInLogs = await db.checkInLogs.where('studentId').equals(current.id).toArray();
      const reflections = await db.reflections.where('studentId').equals(current.id).toArray();
      await db.retiredDemoStudents.put({
        id: current.id,
        student: current,
        checkInLogs,
        reflections,
        archivedAt: new Date().toISOString()
      });
      await db.checkInLogs.bulkDelete(checkInLogs.map(log => log.id));
      await db.reflections.bulkDelete(reflections.map(reflection => reflection.id));
      await db.students.delete(current.id);
      retiredIds.push(current.id);
    }
  });
  if (retiredIds.length > 0 && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('db_updated', { detail: { action: 'demo_students_retired' } }));
  }
  return retiredIds;
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

    // 2. Never invent a profile from a malformed local ID.
    for (const student of students) {
      if (hasThaiCharacters(student.id)) {
        const { studentId: cleanId } = extractAndCleanStudentID(student.id);
        const existingClean = await db.students.get(cleanId);
        if (existingClean) await db.students.delete(student.id);
      }
    }
  } catch (err) {
    console.error('Error cleaning corrupted records:', err);
  }
};
