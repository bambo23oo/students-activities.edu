import test from 'node:test';
import assert from 'node:assert/strict';
import { buildStudentJournalEntries } from '../src/services/studentJournal';
import type { Activity, CheckInLog, Reflection } from '../src/types';

const activity = (id: string, status: Activity['status']): Activity => ({
  id, status, name: id, date: '2026-10-01', description: '', location: ''
});
const log = (id: string, studentId: string, activityId: string, timestamp: string): CheckInLog => ({
  id, studentId, activityId, timestamp, method: 'manual', staffStatus: 'pending', execStatus: 'pending'
});

test('journal includes only the signed-in student’s check-ins, including closed activities', () => {
  const logs = [
    log('own-old', '111111111111', 'closed', '2026-10-01T08:00:00Z'),
    log('other', '222222222222', 'active-other', '2026-10-03T08:00:00Z'),
    log('own-new', '111111111111', 'active-own', '2026-10-02T08:00:00Z')
  ];
  const activities = [activity('closed', 'completed'), activity('active-own', 'active'),
    activity('active-other', 'active'), activity('never-checked-in', 'active')];
  const reflections: Reflection[] = [
    { id: 'own-ref', logId: 'own-old', studentId: '111111111111', status: 'draft' },
    { id: 'other-ref', logId: 'own-new', studentId: '222222222222', status: 'approved' }
  ];

  const entries = buildStudentJournalEntries('111111111111', logs, activities, reflections);
  assert.deepEqual(entries.map(entry => entry.log.id), ['own-new', 'own-old']);
  assert.deepEqual(entries.map(entry => entry.activity?.id), ['active-own', 'closed']);
  assert.equal(entries[0].reflection, undefined);
  assert.equal(entries[1].reflection?.id, 'own-ref');
});
