import type { Activity, CheckInLog, Reflection } from '../types';

export interface JournalEntry {
  log: CheckInLog;
  activity?: Activity;
  reflection?: Reflection;
}

export const buildStudentJournalEntries = (
  studentId: string,
  logs: CheckInLog[],
  activities: Activity[],
  reflections: Reflection[]
): JournalEntry[] => {
  const activityById = new Map(activities.map(activity => [activity.id, activity]));
  const reflectionByLog = new Map(reflections
    .filter(reflection => reflection.studentId === studentId && reflection.logId)
    .map(reflection => [reflection.logId, reflection]));
  return logs
    .filter(log => log.studentId === studentId)
    .map(log => ({ log, activity: activityById.get(log.activityId), reflection: reflectionByLog.get(log.id) }))
    .sort((a, b) => new Date(b.log.timestamp).getTime() - new Date(a.log.timestamp).getTime());
};
