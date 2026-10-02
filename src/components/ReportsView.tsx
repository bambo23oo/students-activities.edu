import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import { Activity, Reflection, Student, CheckInLog } from '../types';
import { 
  FileText, 
  Download, 
  Printer, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Users, 
  GraduationCap, 
  CalendarDays, 
  Building2, 
  FileSpreadsheet, 
  Lock, 
  Sparkles,
  Award,
  ChevronRight,
  Filter
} from 'lucide-react';
import { ActivityTranscriptModal } from './transcript/ActivityTranscriptModal';

type ReportTab = 'individual' | 'major' | 'year' | 'activity';

interface StudentSummary {
  student: Student;
  totalCheckIns: number;
  approvedCount: number;
  inReviewCount: number;
  pendingKpaCount: number;
  approvedHours: number;
  isQualified: boolean;
}

interface MajorSummary {
  major: string;
  totalStudents: number;
  activeStudents: number;
  totalApprovedHours: number;
  avgHoursPerStudent: number;
  qualifiedStudentsCount: number;
}

interface YearSummary {
  year: number;
  totalStudents: number;
  totalApprovedHours: number;
  avgHours: number;
  qualifiedCount: number;
}

interface ActivitySummary {
  activity: Activity;
  totalCheckIns: number;
  kpaSubmittedCount: number;
  approvedCount: number;
  usbCheckIns: number;
  cameraCheckIns: number;
  manualCheckIns: number;
}

export const ReportsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ReportTab>('individual');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data States
  const [studentsSummaries, setStudentsSummaries] = useState<StudentSummary[]>([]);
  const [majorSummaries, setMajorSummaries] = useState<MajorSummary[]>([]);
  const [yearSummaries, setYearSummaries] = useState<YearSummary[]>([]);
  const [activitySummaries, setActivitySummaries] = useState<ActivitySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State for Transcript
  const [selectedStudentForTranscript, setSelectedStudentForTranscript] = useState<string | null>(null);

  const REQUIRED_HOURS = 100;

  useEffect(() => {
    loadAllReportsData();

    const handleSync = () => loadAllReportsData();
    window.addEventListener('db_updated', handleSync);
    return () => window.removeEventListener('db_updated', handleSync);
  }, []);

  const loadAllReportsData = async () => {
    setIsLoading(true);
    try {
      const [allStudents, allActivities, allLogs, allReflections] = await Promise.all([
        db.students.toArray(),
        db.activities.toArray(),
        db.checkInLogs.toArray(),
        db.reflections.toArray()
      ]);

      const refMap = new Map<string, Reflection>();
      allReflections.forEach(r => {
        if (r.logId) refMap.set(r.logId, r);
      });

      const actMap = new Map(allActivities.map(a => [a.id, a]));

      // 1. Calculate Student Summaries (รายบุคคล)
      const stMap = new Map<string, StudentSummary>();
      allStudents.forEach(st => {
        stMap.set(st.id, {
          student: st,
          totalCheckIns: 0,
          approvedCount: 0,
          inReviewCount: 0,
          pendingKpaCount: 0,
          approvedHours: 0,
          isQualified: false
        });
      });

      allLogs.forEach(log => {
        const entry = stMap.get(log.studentId);
        if (entry) {
          entry.totalCheckIns += 1;
          const ref = refMap.get(log.id);

          if (ref?.status === 'approved' && log.execStatus === 'approved') {
            entry.approvedCount += 1;
            entry.approvedHours += Number(actMap.get(log.activityId)?.hours || 0);
          } else if (ref && (ref.status === 'pending_step1' || ref.status === 'pending_step2')) {
            entry.inReviewCount += 1;
          } else {
            entry.pendingKpaCount += 1;
          }
        }
      });

      const studentList = Array.from(stMap.values()).map(item => ({
        ...item,
        isQualified: item.approvedHours >= REQUIRED_HOURS
      }));

      // Sort by approved count descending
      studentList.sort((a, b) => b.approvedHours - a.approvedHours);
      setStudentsSummaries(studentList);

      // 2. Calculate Major Summaries (รายสาขา)
      const majorGroups = new Map<string, { students: StudentSummary[] }>();
      studentList.forEach(st => {
        const major = st.student.major || 'ไม่ระบุสาขาวิชา';
        if (!majorGroups.has(major)) {
          majorGroups.set(major, { students: [] });
        }
        majorGroups.get(major)!.students.push(st);
      });

      const majors: MajorSummary[] = [];
      majorGroups.forEach((val, majorName) => {
        const total = val.students.length;
        const active = val.students.filter(s => s.totalCheckIns > 0).length;
        const totalApprovedHours = val.students.reduce((acc, curr) => acc + curr.approvedHours, 0);
        const qualified = val.students.filter(s => s.isQualified).length;
        majors.push({
          major: majorName,
          totalStudents: total,
          activeStudents: active,
          totalApprovedHours,
          avgHoursPerStudent: total > 0 ? Number((totalApprovedHours / total).toFixed(1)) : 0,
          qualifiedStudentsCount: qualified
        });
      });
      majors.sort((a, b) => b.totalApprovedHours - a.totalApprovedHours);
      setMajorSummaries(majors);

      // 3. Calculate Year Summaries (รายชั้นปี)
      const yearGroups = new Map<number, StudentSummary[]>();
      [1, 2, 3, 4].forEach(y => yearGroups.set(y, []));

      studentList.forEach(st => {
        const y = st.student.year || 1;
        if (yearGroups.has(y)) {
          yearGroups.get(y)!.push(st);
        } else {
          yearGroups.set(y, [st]);
        }
      });

      const years: YearSummary[] = [];
      yearGroups.forEach((stList, y) => {
        const total = stList.length;
        const totalApprovedHours = stList.reduce((acc, curr) => acc + curr.approvedHours, 0);
        const qualified = stList.filter(s => s.isQualified).length;
        years.push({
          year: y,
          totalStudents: total,
          totalApprovedHours,
          avgHours: total > 0 ? Number((totalApprovedHours / total).toFixed(1)) : 0,
          qualifiedCount: qualified
        });
      });
      years.sort((a, b) => a.year - b.year);
      setYearSummaries(years);

      // 4. Calculate Activity Summaries (รายกิจกรรม)
      const actSummaries: ActivitySummary[] = allActivities.map(act => {
        const logsForAct = allLogs.filter(l => l.activityId === act.id);
        let kpaCount = 0;
        let appCount = 0;
        let usb = 0;
        let cam = 0;
        let man = 0;

        logsForAct.forEach(l => {
          if (l.method === 'usb') usb += 1;
          else if (l.method === 'camera') cam += 1;
          else man += 1;

          const ref = refMap.get(l.id);
          if (ref?.submittedAt) kpaCount += 1;
          if (ref?.status === 'approved' && l.execStatus === 'approved') appCount += 1;
        });

        return {
          activity: act,
          totalCheckIns: logsForAct.length,
          kpaSubmittedCount: kpaCount,
          approvedCount: appCount,
          usbCheckIns: usb,
          cameraCheckIns: cam,
          manualCheckIns: man
        };
      });

      actSummaries.sort((a, b) => b.totalCheckIns - a.totalCheckIns);
      setActivitySummaries(actSummaries);

    } catch (e) {
      console.error('Error loading reports:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = () => {
    let headers = '';
    let rows = '';
    const now = new Date().toISOString().slice(0, 10);

    if (activeTab === 'individual') {
      headers = 'StudentID,StudentName,Major,Faculty,Year,TotalCheckIns,ApprovedHours,QualificationStatus\n';
      rows = studentsSummaries.map(s => 
        `"${s.student.id}","${s.student.name}","${s.student.major}","${s.student.faculty}","${s.student.year}","${s.totalCheckIns}","${s.approvedHours}","${s.isQualified ? 'QUALIFIED' : 'INCOMPLETE'}"`
      ).join('\n');
    } else if (activeTab === 'major') {
      headers = 'Major,TotalStudents,ActiveStudents,TotalApprovedHours,AverageHours,GraduationEligible\n';
      rows = majorSummaries.map(m => 
        `"${m.major}","${m.totalStudents}","${m.activeStudents}","${m.totalApprovedHours}","${m.avgHoursPerStudent}","${m.qualifiedStudentsCount}"`
      ).join('\n');
    } else if (activeTab === 'year') {
      headers = 'CohortYear,TotalStudents,TotalApprovedHours,AverageHours,GraduationEligible\n';
      rows = yearSummaries.map(y => 
        `"ปี ${y.year}","${y.totalStudents}","${y.totalApprovedHours}","${y.avgHours}","${y.qualifiedCount}"`
      ).join('\n');
    } else {
      headers = 'ActivityID,ActivityName,Category,Date,TotalCheckIns,KpaReflections,ApprovedToTranscript\n';
      rows = activitySummaries.map(a => 
        `"${a.activity.id}","${a.activity.name}","${a.activity.category}","${a.activity.date}","${a.totalCheckIns}","${a.kpaSubmittedCount}","${a.approvedCount}"`
      ).join('\n');
    }

    const blob = new Blob(['\uFEFF' + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NPU-Reports-${activeTab}-${now}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Top Header Card */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border-2 border-[#18181B] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-[#FACC15] text-[#18181B] border border-[#18181B] rounded-md text-[10px] font-black uppercase mb-1">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>ขั้นตอนที่ 9: ระบบรายงานและสถิติ (Step 9 of 9)</span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-[#18181B] uppercase tracking-wide">
            ระบบรายงานสรุปผลกิจกรรม & ตรวจสอบการออก Transcript
          </h2>
          <p className="text-xs text-stone-500 font-bold">
            สรุปข้อมูลสถิติ 4 มิติ: รายบุคคล, รายสาขาวิชา, รายชั้นปี, และรายกิจกรรม
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-900 border-2 border-[#18181B] rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ส่งออก CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-[#FACC15] hover:bg-amber-400 text-[#18181B] border-2 border-[#18181B] rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 transition-all"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>พิมพ์รายงาน</span>
          </button>
        </div>
      </div>

      {/* 4 Multi-Dimensional Perspective Tabs */}
      <div className="flex flex-wrap gap-2 border-b-2 border-[#18181B] pb-2">
        <button
          onClick={() => setActiveTab('individual')}
          className={`px-4 py-2 rounded-xl border-2 border-[#18181B] text-xs font-black flex items-center gap-2 transition-all ${
            activeTab === 'individual' 
              ? 'bg-[#18181B] text-[#FACC15] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
              : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>1. สรุปรายบุคคล (Individual & Transcript)</span>
        </button>

        <button
          onClick={() => setActiveTab('major')}
          className={`px-4 py-2 rounded-xl border-2 border-[#18181B] text-xs font-black flex items-center gap-2 transition-all ${
            activeTab === 'major' 
              ? 'bg-[#18181B] text-[#FACC15] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
              : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>2. สรุปรายสาขาวิชา (By Major)</span>
        </button>

        <button
          onClick={() => setActiveTab('year')}
          className={`px-4 py-2 rounded-xl border-2 border-[#18181B] text-xs font-black flex items-center gap-2 transition-all ${
            activeTab === 'year' 
              ? 'bg-[#18181B] text-[#FACC15] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
              : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>3. สรุปรายชั้นปี (By Year)</span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 rounded-xl border-2 border-[#18181B] text-xs font-black flex items-center gap-2 transition-all ${
            activeTab === 'activity' 
              ? 'bg-[#18181B] text-[#FACC15] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
              : 'bg-white text-stone-700 hover:bg-stone-100'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>4. สรุปรายกิจกรรม (By Activity)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: INDIVIDUAL STUDENTS REPORT (WITH TRANSCRIPT GENERATOR)            */}
      {/* ========================================================================= */}
      {activeTab === 'individual' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหารหัสนักศึกษา, ชื่อ-นามสกุล, สาขาวิชา..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border-2 border-[#18181B] rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
              />
            </div>
          </div>

          <div className="bg-white border-2 border-[#18181B] rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-100 border-b-2 border-[#18181B] text-[11px] font-black uppercase text-stone-700">
                    <th className="p-3 border-r border-stone-300">รหัสนักศึกษา / ชื่อ-สกุล</th>
                    <th className="p-3 border-r border-stone-300">สาขาวิชา / ชั้นปี</th>
                    <th className="p-3 border-r border-stone-300 text-center">กิจกรรมที่เช็คอิน</th>
                    <th className="p-3 border-r border-stone-300 text-center">ชั่วโมงที่อนุมัติ</th>
                    <th className="p-3 border-r border-stone-300 text-center">สถานะเกณฑ์จบ (100 ชั่วโมง)</th>
                    <th className="p-3 text-center w-36">การออก Transcript</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {studentsSummaries
                    .filter(s => {
                      const q = searchQuery.toLowerCase();
                      return s.student.name.toLowerCase().includes(q) || 
                             s.student.id.includes(q) || 
                             (s.student.major || '').toLowerCase().includes(q);
                    })
                    .map((item) => (
                      <tr key={item.student.id} className="hover:bg-stone-50 transition-colors">
                        <td className="p-3 border-r border-stone-200">
                          <div className="font-black text-sm text-[#18181B]">{item.student.name}</div>
                          <div className="text-[10px] font-mono font-bold text-stone-500">{item.student.id}</div>
                        </td>

                        <td className="p-3 border-r border-stone-200">
                          <div className="font-bold text-stone-900">{item.student.major || 'ไม่ระบุสาขาวิชา'}</div>
                          <div className="text-[10px] text-stone-500 font-bold">ชั้นปีที่ {item.student.year || 'ไม่ระบุ'} • คณะครุศาสตร์</div>
                        </td>

                        <td className="p-3 border-r border-stone-200 text-center font-mono font-bold text-stone-700">
                          {item.totalCheckIns} กิจกรรม
                        </td>

                        <td className="p-3 border-r border-stone-200 text-center">
                          <span className="font-mono font-black text-sm text-[#2563EB]">
                            {item.approvedHours}
                          </span>
                          <span className="text-[10px] text-stone-500 font-bold ml-1">/ 100 ชั่วโมง</span>
                        </td>

                        <td className="p-3 border-r border-stone-200 text-center">
                          {item.isQualified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-lg text-[10px] font-black border border-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>✓ ผ่านเกณฑ์สำเร็จ</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-900 rounded-lg text-[10px] font-black border border-rose-300">
                              <Lock className="w-3.5 h-3.5 text-rose-600" />
                              <span>ขาดอีก {Math.max(0, REQUIRED_HOURS - item.approvedHours)} ชั่วโมง</span>
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-center">
                          <button
                            onClick={() => setSelectedStudentForTranscript(item.student.id)}
                            className={`px-3 py-1.5 rounded-xl border-2 border-[#18181B] text-xs font-black inline-flex items-center gap-1 transition-all ${
                              item.isQualified 
                                ? 'bg-[#FACC15] hover:bg-amber-400 text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                                : 'bg-stone-100 hover:bg-stone-200 text-stone-700 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                            }`}
                            title="เปิดระบบตรวจสอบและออกใบรายงานผลกิจกรรม"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>ออก Transcript</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 2: MAJOR OVERVIEW                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'major' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {majorSummaries.map((m) => (
              <div 
                key={m.major} 
                className="bg-white p-5 rounded-2xl border-2 border-[#18181B] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[10px] font-black uppercase text-stone-400">สาขาวิชา</span>
                    <h3 className="text-sm font-black text-[#18181B] truncate">{m.major}</h3>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 border border-black flex items-center justify-center font-black shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-stone-200 text-xs">
                  <div>
                    <div className="text-[10px] text-stone-500 font-bold">นักศึกษาทั้งหมด</div>
                    <div className="text-base font-black text-stone-900">{m.totalStudents} คน</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-stone-500 font-bold">เข้าร่วมกิจกรรมแล้ว</div>
                    <div className="text-base font-black text-emerald-700">{m.activeStudents} คน</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-stone-500 font-bold">ชั่วโมงอนุมัติรวม</div>
                    <div className="text-base font-black text-[#2563EB]">{m.totalApprovedHours} ชั่วโมง</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-stone-500 font-bold">เฉลี่ยต่อคน</div>
                    <div className="text-base font-black text-stone-900">{m.avgHoursPerStudent} ชั่วโมง/คน</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-xs font-bold">
                  <span className="text-stone-500">ผ่านเกณฑ์จบแล้ว:</span>
                  <span className="font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                    {m.qualifiedStudentsCount} / {m.totalStudents} คน ({m.totalStudents > 0 ? Math.round((m.qualifiedStudentsCount / m.totalStudents) * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 3: COHORT YEAR OVERVIEW                                              */}
      {/* ========================================================================= */}
      {activeTab === 'year' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {yearSummaries.map((y) => (
            <div 
              key={y.year} 
              className="bg-white p-5 rounded-2xl border-2 border-[#18181B] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                  นักศึกษาชั้นปีที่ {y.year}
                </span>
                <GraduationCap className="w-5 h-5 text-stone-700" />
              </div>

              <div>
                <div className="text-3xl font-black text-[#18181B]">{y.totalStudents} <span className="text-xs font-bold text-stone-500">คน</span></div>
                <div className="text-xs text-stone-500 font-bold mt-0.5">จำนวนนักศึกษาในรุ่น</div>
              </div>

              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-1 text-xs font-bold">
                <div className="flex justify-between">
                  <span className="text-stone-500">ชั่วโมงอนุมัติรวม:</span>
                  <span className="font-black text-[#2563EB]">{y.totalApprovedHours} ชั่วโมง</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">เฉลี่ยต่อคน:</span>
                  <span className="font-black text-stone-900">{y.avgHours} ชั่วโมง</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-500">สำเร็จเกณฑ์ 100 ชั่วโมง:</span>
                  <span className="font-black text-emerald-700">{y.qualifiedCount} คน</span>
                </div>
              </div>

              <div className="w-full bg-stone-200 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#EA580C] h-full"
                  style={{ width: `${Math.min(100, Math.round((y.avgHours / REQUIRED_HOURS) * 100))}%` }}
                />
              </div>
              <div className="text-[10px] text-stone-500 font-bold text-right">
                เป้าหมาย 100 ชั่วโมง ({Math.min(100, Math.round((y.avgHours / REQUIRED_HOURS) * 100))}%)
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 4: ACTIVITY SUMMARY                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'activity' && (
        <div className="bg-white border-2 border-[#18181B] rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-100 border-b-2 border-[#18181B] text-[11px] font-black uppercase text-stone-700">
                  <th className="p-3 border-r border-stone-300">ชื่อกิจกรรม / โครงการ</th>
                  <th className="p-3 border-r border-stone-300">หมวดหมู่ / วันที่จัด</th>
                  <th className="p-3 border-r border-stone-300 text-center">ยอดสแกนเช็คอิน</th>
                  <th className="p-3 border-r border-stone-300 text-center">ช่องทาง (USB / กล้อง)</th>
                  <th className="p-3 border-r border-stone-300 text-center">ส่ง K-P-A แล้ว</th>
                  <th className="p-3 text-center">อนุมัติลง Transcript</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {activitySummaries.map((item) => (
                  <tr key={item.activity.id} className="hover:bg-stone-50 transition-colors">
                    <td className="p-3 border-r border-stone-200">
                      <div className="font-black text-sm text-[#18181B]">{item.activity.name}</div>
                      <div className="text-[10px] font-mono font-bold text-stone-500">{item.activity.id}</div>
                    </td>

                    <td className="p-3 border-r border-stone-200">
                      <div className="font-bold text-stone-800">{item.activity.category || 'กิจกรรมพัฒนานักศึกษา'}</div>
                      <div className="text-[10px] text-stone-500 font-bold">{item.activity.date}</div>
                    </td>

                    <td className="p-3 border-r border-stone-200 text-center font-mono font-black text-stone-900 text-sm">
                      {item.totalCheckIns} คน
                    </td>

                    <td className="p-3 border-r border-stone-200 text-center text-[11px] font-bold text-stone-600">
                      USB: <span className="font-mono text-stone-900 font-bold">{item.usbCheckIns}</span> | QR: <span className="font-mono text-stone-900 font-bold">{item.cameraCheckIns}</span>
                    </td>

                    <td className="p-3 border-r border-stone-200 text-center">
                      <span className="font-mono font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-300">
                        {item.kpaSubmittedCount} คน
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <span className="font-mono font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                        {item.approvedCount} คน
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TRANSCRIPT POPUP MODAL (STEP 8 VALIDATION)                                */}
      {/* ========================================================================= */}
      {selectedStudentForTranscript && (
        <ActivityTranscriptModal
          isOpen={!!selectedStudentForTranscript}
          onClose={() => setSelectedStudentForTranscript(null)}
          studentId={selectedStudentForTranscript}
        />
      )}

    </div>
  );
};
