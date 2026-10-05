import type { Activity, CheckInLog, Reflection } from '../types';
import { buildStudentJournalEntries } from '../services/studentJournal';
import { StudentJournalPortal } from './StudentJournalPortal';

const studentId = 'demo-student';

const activities: Activity[] = [
  {
    id: 'DEMO-101', name: 'ปฐมนิเทศฝึกประสบการณ์วิชาชีพครู',
    date: '2026-09-12', description: '', location: 'คณะครุศาสตร์',
    status: 'completed', category: 'พัฒนาวิชาชีพครู', hours: 3
  },
  {
    id: 'DEMO-102', name: 'อบรมการออกแบบแผนการจัดการเรียนรู้',
    date: '2026-09-25', description: '', location: 'คณะครุศาสตร์',
    status: 'active', category: 'พัฒนาวิชาชีพครู', hours: 6
  },
  {
    id: 'DEMO-103', name: 'กิจกรรมที่ยังไม่ได้เช็กอิน',
    date: '2026-10-10', description: '', location: 'คณะครุศาสตร์',
    status: 'active', category: 'พัฒนาวิชาชีพครู', hours: 2
  }
];

const logs: CheckInLog[] = [
  {
    id: 'DEMO-LOG-1', studentId, activityId: 'DEMO-101',
    timestamp: '2026-09-12T02:15:00.000Z', method: 'manual',
    staffStatus: 'verified', execStatus: 'approved'
  },
  {
    id: 'DEMO-LOG-2', studentId, activityId: 'DEMO-102',
    timestamp: '2026-09-25T03:30:00.000Z', method: 'camera',
    staffStatus: 'pending', execStatus: 'pending'
  }
];

const reflections: Reflection[] = [
  { id: 'DEMO-REFLECTION-1', logId: 'DEMO-LOG-1', studentId, status: 'approved' }
];

const previewEntries = buildStudentJournalEntries(studentId, logs, activities, reflections);

export const StudentJournalPreview = ({ interactive = false, onLogout }: {
  interactive?: boolean;
  onLogout?: () => void;
}) => <StudentJournalPortal
  studentId={studentId}
  studentName="ตัวอย่างนักศึกษา"
  previewEntries={previewEntries}
  demoInteractive={interactive}
  onLogout={onLogout || (() => window.location.assign('/'))}
/>;
