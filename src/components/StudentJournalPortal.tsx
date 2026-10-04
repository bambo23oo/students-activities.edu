import { useCallback, useEffect, useState } from 'react';
import { BookOpenCheck, CalendarDays, LogOut, RefreshCw } from 'lucide-react';
import { db } from '../db/db';
import { pullStudentUpdates } from '../services/supabaseApi';
import { buildStudentJournalEntries, type JournalEntry } from '../services/studentJournal';
import { NPULogo } from './NPULogo';
import { StudentReflectionModal } from './student/StudentReflectionModal';

const reflectionLabel = (entry: JournalEntry): string => {
  if (entry.log.execStatus === 'approved' || entry.reflection?.status === 'approved') return 'อนุมัติแล้ว';
  if (entry.reflection?.status === 'rejected') return 'บันทึกถูกส่งกลับ';
  if (entry.reflection?.status === 'pending_step1' || entry.reflection?.status === 'pending_step2') return 'ส่งบันทึกแล้ว · รอตรวจ';
  if (entry.reflection?.status === 'draft') return 'บันทึกร่างแล้ว';
  return 'เช็กอินแล้ว · รอบันทึก K-P-A';
};

const formatCheckInTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleString('th-TH', {
    dateStyle: 'medium', timeStyle: 'short'
  });
};

export const StudentJournalPortal = ({ studentId, studentName, onLogout, previewEntries }: {
  studentId: string;
  studentName: string;
  onLogout: () => void;
  previewEntries?: JournalEntry[];
}) => {
  const isPreview = previewEntries !== undefined;
  const [entries, setEntries] = useState<JournalEntry[]>(previewEntries ?? []);
  const [loading, setLoading] = useState(!isPreview);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (isPreview) return;
    setRefreshing(true);
    try {
      await pullStudentUpdates(studentId);
      const [logs, activities, reflections] = await Promise.all([
        db.checkInLogs.where('studentId').equals(studentId).toArray(),
        db.activities.toArray(),
        db.reflections.where('studentId').equals(studentId).toArray()
      ]);
      setEntries(buildStudentJournalEntries(studentId, logs, activities, reflections));
      setError(null);
    } catch {
      setError('โหลดข้อมูลกิจกรรมล่าสุดไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isPreview, studentId]);

  useEffect(() => {
    if (isPreview) return;
    void refresh();
    const onVisible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 60000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.clearInterval(timer);
    };
  }, [isPreview, refresh]);

  return <div className="min-h-[100dvh] bg-[#FAF9F6] font-['Prompt','Sarabun',sans-serif] text-[#1C1917]">
    <header className="border-b-2 border-[#1C1917] bg-white px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <NPULogo size="custom" className="h-14 w-10 shrink-0" />
          <div className="min-w-0">
            <p className="text-base font-bold leading-tight sm:text-lg">สมุดบันทึกกิจกรรมดิจิทัล</p>
            <p className="text-xs leading-relaxed text-[#57534E]">ศูนย์ฝึกประสบการณ์วิชาชีพครู · คณะครุศาสตร์</p>
          </div>
        </div>
        <button type="button" onClick={onLogout} aria-label={isPreview ? 'กลับหน้าเข้าสู่ระบบ' : 'ออกจากระบบ'}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 border-2 border-[#1C1917] px-4 py-2 text-sm font-semibold focus-visible:outline-4 focus-visible:outline-[#2563EB]">
          <LogOut className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">{isPreview ? 'กลับหน้าเข้าสู่ระบบ' : 'ออกจากระบบ'}</span>
        </button>
      </div>
    </header>

    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-9">
      {isPreview && <p role="status" className="mb-6 border-l-4 border-[#B45309] bg-[#FCF8ED] px-4 py-3 text-sm font-semibold leading-relaxed text-[#78350F]">
        ตัวอย่างหน้าจอนักศึกษา · ข้อมูลสมมติสำหรับตรวจรูปแบบเท่านั้น ไม่มีข้อมูลนักศึกษาจริง และไม่สามารถบันทึกข้อมูลได้
      </p>}
      <div className="border-l-4 border-[#EA580C] pl-4">
        <p className="text-sm text-[#57534E]">{studentName}{!isPreview && ` · รหัสนักศึกษา ${studentId}`}</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">กิจกรรมที่เช็กอินแล้ว</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#57534E]">แสดงเฉพาะกิจกรรมที่มีรายการเช็กอินของคุณ แม้เจ้าหน้าที่จะปิดรับเช็กอินแล้ว</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#E7E5E4] pb-4">
        <p className="inline-flex items-center gap-2 text-sm font-semibold">
          <BookOpenCheck className="h-5 w-5 text-[#C2410C]" aria-hidden="true" />
          {loading ? 'กำลังโหลดกิจกรรม...' : `เช็กอินแล้ว ${entries.length} กิจกรรม`}
        </p>
        {!isPreview && <button type="button" onClick={() => void refresh()} disabled={refreshing}
          className="inline-flex min-h-11 items-center gap-2 border border-[#A8A29E] bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50 focus-visible:outline-4 focus-visible:outline-[#2563EB]">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />{refreshing ? 'กำลังอัปเดต...' : 'อัปเดตข้อมูล'}
        </button>}
      </div>

      {error && <p role="alert" className="mt-5 border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p>}
      {!loading && entries.length === 0 && !error && <div className="mt-6 border border-[#E7E5E4] bg-white px-5 py-8 text-center">
        <CalendarDays className="mx-auto h-9 w-9 text-[#B45309]" aria-hidden="true" />
        <p className="mt-3 font-semibold">ยังไม่พบกิจกรรมที่เช็กอิน</p>
        <p className="mt-2 text-sm text-[#57534E]">หากเพิ่งเช็กอิน กรุณากด “อัปเดตข้อมูล” หรือติดต่อเจ้าหน้าที่กิจกรรม</p>
      </div>}

      <div className="mt-5 space-y-3">
        {entries.map(entry => <article key={entry.log.id} className="border border-[#E7E5E4] bg-white px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#9A3412]">{entry.activity?.category || 'กิจกรรม'} · {entry.log.activityId}</p>
              <h2 className="mt-1 break-words text-lg font-bold leading-snug">{entry.activity?.name || `กิจกรรม ${entry.log.activityId}`}</h2>
              <p className="mt-2 text-sm text-[#57534E]">เช็กอิน {formatCheckInTime(entry.log.timestamp)}</p>
              {entry.activity?.hours !== undefined && <p className="mt-1 text-sm text-[#57534E]">ชั่วโมงตามกิจกรรม {entry.activity.hours} ชั่วโมง</p>}
            </div>
            <span className="w-fit shrink-0 border border-[#FDE68A] bg-[#FCF8ED] px-3 py-1.5 text-xs font-semibold text-[#92400E]">
              {reflectionLabel(entry)}
            </span>
          </div>
          {!isPreview && (!entry.reflection || ['draft', 'rejected'].includes(entry.reflection.status)) && <button type="button"
            onClick={() => setSelectedLogId(entry.log.id)}
            className="mt-4 min-h-11 border-2 border-[#1C1917] bg-[#EA580C] px-4 py-2 text-sm font-bold text-white focus-visible:outline-4 focus-visible:outline-[#2563EB]">
            {entry.reflection ? 'แก้ไขบันทึก K-P-A' : 'บันทึก K-P-A'}
          </button>}
        </article>)}
      </div>
    </main>

    {!isPreview && <StudentReflectionModal isOpen={selectedLogId !== null} logId={selectedLogId} studentId={studentId} studentName={studentName}
      onClose={() => setSelectedLogId(null)} onSuccess={() => void refresh()} />
    }
  </div>;
};
