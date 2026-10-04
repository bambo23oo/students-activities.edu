import { useEffect, useState } from 'react';
import { loadStaffStudentJournal, type StaffStudentJournal } from '../services/staffStudentJournal';
import { StudentJournalPortal } from './StudentJournalPortal';

export const StaffStudentJournalViewer = ({ studentId, onBack }: {
  studentId: string;
  onBack: () => void;
}) => {
  const [journal, setJournal] = useState<StaffStudentJournal | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void loadStaffStudentJournal(studentId).then(result => {
      if (active) setJournal(result);
    }).catch(cause => {
      if (active) setError(cause instanceof Error ? cause.message : 'โหลดสมุดบันทึกไม่สำเร็จ');
    });
    return () => { active = false; };
  }, [studentId]);

  if (error || !journal) return <div className="mx-auto max-w-4xl bg-white px-4 py-6 font-['Prompt','Sarabun',sans-serif]">
    <button type="button" onClick={onBack} className="min-h-11 border-2 border-[#1C1917] px-4 py-2 text-sm font-semibold">← กลับประวัติเช็กอิน</button>
    <p role={error ? 'alert' : 'status'} className={`mt-5 text-sm ${error ? 'text-red-800' : 'text-[#57534E]'}`}>
      {error || 'กำลังโหลดข้อมูลจริงจากฐานข้อมูลกลาง...'}
    </p>
  </div>;

  return <StudentJournalPortal
    studentId={journal.studentId}
    studentName={journal.studentName}
    staffEntries={journal.entries}
    embedded
    onLogout={onBack}
  />;
};
