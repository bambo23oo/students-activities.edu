import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ArrowRight, CheckCircle2, Clock3, QrCode, Users } from 'lucide-react';
import { db } from '../db/db';

interface StaffDashboardViewProps {
  onNavigate: (tab: 'scanner' | 'history' | 'activities' | 'review' | 'reports' | 'database') => void;
  onQuickScan?: () => void;
  onAddActivity?: () => void;
}

const formatDateTime = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
};

export const StaffDashboardView: React.FC<StaffDashboardViewProps> = ({ onNavigate }) => {
  const data = useLiveQuery(async () => {
    const [logs, students, reflections, activities] = await Promise.all([
      db.checkInLogs.toArray(),
      db.students.toArray(),
      db.reflections.toArray(),
      db.activities.toArray()
    ]);
    return { logs, students, reflections, activities };
  }, []);

  const studentsById = new Map(data?.students.map(student => [student.id, student]) ?? []);
  const activitiesById = new Map(data?.activities.map(activity => [activity.id, activity]) ?? []);
  const approvedReflectionIds = new Set(
    data?.reflections.filter(reflection => reflection.status === 'approved').map(reflection => reflection.logId) ?? []
  );
  const recentLogs = [...(data?.logs ?? [])]
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, 5);
  const upcomingActivities = (data?.activities ?? [])
    .filter(activity => activity.status === 'active' || activity.status === 'upcoming')
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
    .slice(0, 4);
  const checkInCount = data?.logs.length ?? 0;
  const pendingReviewCount = data?.reflections.filter(reflection => reflection.status === 'pending_step1').length ?? 0;
  const approvedCount = data?.logs.filter(log => log.execStatus === 'approved' && approvedReflectionIds.has(log.id)).length ?? 0;
  const studentCount = data?.students.filter(student => !student.id.startsWith('ADM-')).length ?? 0;
  const submittedCount = data?.reflections.filter(reflection => reflection.status !== 'draft').length ?? 0;
  const submissionPercent = checkInCount ? Math.min(100, Math.round(submittedCount / checkInCount * 100)) : 0;
  const approvalPercent = checkInCount ? Math.min(100, Math.round(approvedCount / checkInCount * 100)) : 0;

  const cards = [
    { label: 'เช็คอินที่บันทึก', value: checkInCount, icon: QrCode, color: 'text-[#C2410C]' },
    { label: 'K-P-A รอเจ้าหน้าที่ตรวจ', value: pendingReviewCount, icon: Clock3, color: 'text-amber-700' },
    { label: 'อนุมัติครบทั้งสองขั้นตอน', value: approvedCount, icon: CheckCircle2, color: 'text-emerald-700' },
    { label: 'นักศึกษาในระบบ', value: studentCount, icon: Users, color: 'text-[#2563EB]' }
  ];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 font-['Prompt','Sarabun',sans-serif] text-[#1C1917]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">ภาพรวมงานกิจกรรม</h2>
          <p className="mt-1 text-sm text-stone-600">ข้อมูลจากจุดสแกนต่าง ๆ จะแสดงรวมกันเมื่อเชื่อมต่อ</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('scanner')}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#C2410C] px-6 py-3 font-semibold text-white hover:bg-[#9A3412]"
        >
          <QrCode size={18} /> เปิดจุดเช็คอิน
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(card => (
          <div key={card.label} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <card.icon className={card.color} size={20} aria-hidden="true" />
            <div className="mt-3 text-2xl font-bold">{data ? card.value.toLocaleString('th-TH') : '—'}</div>
            <div className="mt-1 text-sm text-stone-600">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-bold">เช็คอินล่าสุด</h3>
            <button type="button" onClick={() => onNavigate('history')} className="inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold text-[#C2410C] hover:underline">
              ดูประวัติทั้งหมด <ArrowRight size={16} />
            </button>
          </div>
          {!data ? (
            <p className="py-8 text-center text-sm text-stone-600">กำลังโหลดข้อมูล…</p>
          ) : recentLogs.length === 0 ? (
            <p className="rounded-lg bg-[#FAF9F6] px-4 py-8 text-center text-sm text-stone-600">ยังไม่มีรายการเช็คอิน</p>
          ) : (
            <div className="divide-y divide-stone-100">
              {recentLogs.map(log => {
                const student = studentsById.get(log.studentId);
                const activity = activitiesById.get(log.activityId);
                return (
                  <div key={log.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-semibold">{student?.name || log.studentId}</div>
                      <div className="text-stone-600">{activity?.name || 'ไม่พบชื่อกิจกรรม'}</div>
                    </div>
                    <time className="text-xs text-stone-500" dateTime={log.timestamp}>{formatDateTime(log.timestamp)}</time>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="space-y-5">
          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="font-bold">ความคืบหน้าหลังเช็คอิน</h3>
            <div className="mt-5 space-y-5 text-sm">
              <div>
                <div className="mb-2 flex justify-between gap-2"><span>ส่ง K-P-A</span><strong>{submittedCount.toLocaleString('th-TH')} รายการ</strong></div>
                <div className="h-2 rounded-full bg-stone-100"><div className="h-2 rounded-full bg-[#F59E0B]" style={{ width: `${submissionPercent}%` }} /></div>
              </div>
              <div>
                <div className="mb-2 flex justify-between gap-2"><span>อนุมัติครบ</span><strong>{approvedCount.toLocaleString('th-TH')} รายการ</strong></div>
                <div className="h-2 rounded-full bg-stone-100"><div className="h-2 rounded-full bg-emerald-600" style={{ width: `${approvalPercent}%` }} /></div>
              </div>
            </div>
            <button type="button" onClick={() => onNavigate('review')} className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#C2410C] hover:underline">
              เปิดคิวตรวจ K-P-A <ArrowRight size={16} />
            </button>
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-bold">กิจกรรมที่เปิดหรือกำลังจะเริ่ม</h3>
              <button type="button" onClick={() => onNavigate('activities')} className="min-h-11 px-2 text-sm font-semibold text-[#C2410C] hover:underline">ดูทั้งหมด</button>
            </div>
            {!data ? <p className="mt-4 text-sm text-stone-600">กำลังโหลดข้อมูล…</p> : upcomingActivities.length === 0 ? (
              <p className="mt-4 text-sm text-stone-600">ยังไม่มีกิจกรรมที่เปิดอยู่</p>
            ) : (
              <div className="mt-2 divide-y divide-stone-100">
                {upcomingActivities.map(activity => (
                  <div key={activity.id} className="py-3 text-sm">
                    <div className="font-semibold">{activity.name}</div>
                    <div className="mt-1 text-stone-600">{activity.date} · {activity.location || 'ไม่ระบุสถานที่'}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
