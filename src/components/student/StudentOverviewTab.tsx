import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Check, 
  CheckCircle2, 
  Clock, 
  Users, 
  Star, 
  ArrowRight, 
  ChevronDown, 
  ChevronLeft,
  ChevronRight,
  AlertCircle, 
  BookOpen,
  Send,
  MapPin,
  GraduationCap,
  Edit3,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Award,
  Layers,
  ExternalLink
} from 'lucide-react';
import { Activity, CheckInLog, Reflection, Student } from '../../types';

interface StudentOverviewTabProps {
  logs: (CheckInLog & { activity?: Activity; reflection?: Reflection })[];
  allActivities: Activity[];
  student: Student | null;
  studentId: string;
  studentName: string;
  onOpenSubmitModal: (logId: string) => void;
  onOpenPassModal: () => void;
  onNavigateTab: (tab: 'overview' | 'calendar' | 'students' | 'attendance' | 'review' | 'events' | 'messages' | 'settings') => void;
  onOpenEditMajor?: () => void;
}

export const StudentOverviewTab: React.FC<StudentOverviewTabProps> = ({
  logs,
  allActivities,
  student,
  studentId,
  studentName,
  onOpenSubmitModal,
  onOpenPassModal,
  onNavigateTab,
  onOpenEditMajor
}) => {
  const [tableFilter, setTableFilter] = useState<'all' | 'required' | 'attended' | 'pending_kpa' | 'approved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<'name' | 'date' | 'code' | 'status' | 'hours'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedActivityDetail, setSelectedActivityDetail] = useState<Activity | null>(null);

  // Criteria: 18 Faculty of Education required activities
  const REQUIRED_ACTIVITIES = allActivities.length > 0 ? allActivities.length : 18;

  const totalActivities = logs.length;
  const approvedLogs = logs.filter(l => l.reflection?.status === 'approved' || l.execStatus === 'approved');
  const inReviewLogs = logs.filter(l => l.reflection && (l.reflection.status === 'pending_step1' || l.reflection.status === 'pending_step2'));
  const pendingSubmissionLogs = logs.filter(l => !l.reflection);

  const approvedCount = approvedLogs.length;
  const inReviewCount = inReviewLogs.length;
  const totalEarnedAndPending = approvedCount + inReviewCount;
  const remainingActivities = Math.max(0, REQUIRED_ACTIVITIES - approvedCount - inReviewCount);
  const completionPercent = Math.min(100, Math.round((totalEarnedAndPending / REQUIRED_ACTIVITIES) * 100));

  // Stacked percentages for progress bar
  const approvedPct = Math.min(100, Math.round((approvedCount / REQUIRED_ACTIVITIES) * 100));
  const inReviewPct = Math.min(100 - approvedPct, Math.round((inReviewCount / REQUIRED_ACTIVITIES) * 100));
  const remainingPct = Math.max(0, 100 - approvedPct - inReviewPct);

  const studentCohort = studentId ? studentId.slice(0, 2) : undefined;

  // Prepare normalized activity rows
  // Rule: ถ้ากิจกรรมไหนที่ปิดอยู่ไม่ต้องแสดงผลบนแดชบอร์ดของนักศึกษา นอกจากเป็นกิจกรรมที่นักศึกษาเข้าร่วมแล้ว
  const activityRows = useMemo(() => {
    return allActivities
      .filter(activity => {
        const hasLog = logs.some(l => l.activityId === activity.id);
        if (hasLog) return true; // Student attended: keep it
        return activity.status === 'active'; // Only show un-attended activities if open
      })
      .map(activity => {
      const log = logs.find(l => l.activityId === activity.id);
      const hasLog = !!log;
      const isApproved = log?.reflection?.status === 'approved' || log?.execStatus === 'approved';
      const isPendingReview = log?.reflection && (log.reflection.status === 'pending_step1' || log.reflection.status === 'pending_step2');
      const isPendingKpaSubmission = hasLog && !log.reflection;
      
      // Determine requirement for this cohort
      const isRequired = studentCohort && activity.cohortTarget 
        ? activity.cohortTarget.includes(studentCohort) 
        : true;

      return {
        activity,
        log,
        hasLog,
        isApproved,
        isPendingReview,
        isPendingKpaSubmission,
        isRequired,
        date: activity.date || log?.timestamp || '',
        name: activity.name,
        id: activity.id,
        yearLevel: activity.yearLevel || (activity.cohortTarget ? `รุ่นรหัส ${activity.cohortTarget.join(', ')}` : ''),
        location: activity.location || 'คณะครุศาสตร์ ม.นครพนม',
        hours: activity.hours || 6,
        category: activity.category || 'กิจกรรมประสบการณ์วิชาชีพ'
      };
    });
  }, [allActivities, logs, studentCohort]);

  // Counts for tabs
  const summaryCounts = useMemo(() => {
    const requiredPending = activityRows.filter(r => r.isRequired && !r.isApproved).length;
    const pendingKpa = activityRows.filter(r => r.isPendingKpaSubmission || r.isPendingReview).length;
    return {
      all: activityRows.length,
      requiredPending,
      attended: logs.length,
      pendingKpa,
      approved: approvedCount
    };
  }, [activityRows, logs.length, approvedCount]);

  // Filter rows
  const filteredRows = useMemo(() => {
    return activityRows.filter(row => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = row.name.toLowerCase().includes(q);
        const matchId = row.id.toLowerCase().includes(q);
        const matchLoc = row.location.toLowerCase().includes(q);
        const matchCat = row.category.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchLoc && !matchCat) return false;
      }

      // Filter Mode
      if (tableFilter === 'required') {
        return row.isRequired && !row.isApproved;
      }
      if (tableFilter === 'attended') {
        return row.hasLog;
      }
      if (tableFilter === 'pending_kpa') {
        return row.isPendingKpaSubmission || row.isPendingReview;
      }
      if (tableFilter === 'approved') {
        return row.isApproved;
      }
      return true;
    });
  }, [activityRows, searchQuery, tableFilter]);

  // Sort rows
  const sortedRows = useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'name') {
        comparison = a.name.localeCompare(b.name, 'th');
      } else if (sortField === 'code') {
        comparison = a.id.localeCompare(b.id);
      } else if (sortField === 'date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'hours') {
        comparison = (a.hours || 0) - (b.hours || 0);
      } else if (sortField === 'status') {
        const getScore = (r: typeof a) => r.isApproved ? 4 : r.isPendingReview ? 3 : r.hasLog ? 2 : r.isRequired ? 1 : 0;
        comparison = getScore(a) - getScore(b);
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredRows, sortField, sortDirection]);

  // Pagination calculation
  const totalItems = sortedRows.length;
  const effectivePageSize = pageSize === 0 ? totalItems || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * effectivePageSize;
  const paginatedRows = sortedRows.slice(startIndex, startIndex + effectivePageSize);

  const toggleSort = (field: 'name' | 'date' | 'code' | 'status' | 'hours') => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Export Table Data to CSV
  const handleExportCsv = () => {
    const headers = ['ลำดับ', 'รหัสกิจกรรม', 'ชื่อกิจกรรม', 'หมวดหมู่', 'วันเวลาจัดกิจกรรม', 'สถานที่', 'ชั่วโมงกิจกรรม', 'สถานะการเข้าร่วม', 'สถานะ KPA'].join(',');
    const rows = sortedRows.map((r, i) => [
      i + 1,
      `"${r.id}"`,
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.category}"`,
      `"${r.date ? new Date(r.date).toLocaleDateString('th-TH') : '-'}"`,
      `"${r.location}"`,
      r.hours,
      `"${r.isApproved ? 'ผ่านอนุมัติแล้ว' : r.hasLog ? 'เช็คอินแล้ว' : r.isRequired ? 'ต้องเข้าร่วม' : 'ยังไม่ถึงกำหนด'}"`,
      `"${r.isApproved ? 'อนุมัติแล้ว' : r.isPendingReview ? 'รอตรวจ' : r.isPendingKpaSubmission ? 'รอส่ง KPA' : '-'}"`
    ].join(','));
    const blob = new Blob(['\uFEFF' + headers + '\n' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `npu_activities_${studentId}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Student Profile Quick Bar */}
      <div className="bg-[#FAF7F0] border-2 border-[#18181B] p-4 sm:p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl border-2 border-[#18181B] bg-[#FACC15] flex items-center justify-center font-black text-stone-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] shrink-0 overflow-hidden">
            {student?.profileImage ? (
              <img src={student.profileImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl font-black text-stone-800">{(student?.name || studentName).charAt(0)}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black text-[#18181B] tracking-tight truncate">
                {student?.name || studentName}
              </h2>
              <span className="px-2 py-0.5 bg-[#EA580C] text-white font-mono font-black text-[11px] rounded-md border border-[#18181B]">
                {student?.id || studentId}
              </span>
              <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 font-bold text-[11px] rounded-md">
                ปี {student?.year || '—'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-xs text-stone-700 flex-wrap">
              <span className="font-black text-[#2563EB] flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                <span>{student?.major || 'ไม่ระบุสาขาวิชา'}</span>
              </span>
              <span className="text-stone-400">•</span>
              <span className="font-semibold text-stone-600">{student?.faculty || 'คณะครุศาสตร์'}</span>
              <span className="text-stone-400 hidden sm:inline">•</span>
              <span className="text-stone-500 hidden sm:inline font-medium">{student?.university || 'มหาวิทยาลัยนครพนม'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenEditMajor && (
            <button
              type="button"
              onClick={onOpenEditMajor}
              className="px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-800 font-bold text-xs border-2 border-black rounded-xl shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5"
              title="แก้ไขข้อมูลสาขาวิชา"
            >
              <Edit3 className="w-3.5 h-3.5 text-stone-600" />
              <span>แก้ไขสาขาวิชา</span>
            </button>
          )}

          <button
            onClick={onOpenPassModal}
            className="px-3.5 py-2 bg-[#FACC15] hover:bg-[#EAB308] text-black font-black text-xs uppercase border-2 border-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-1.5 shrink-0"
          >
            <span>💳 บัตร QR PASS</span>
          </button>
        </div>
      </div>

      {/* 1. HERO METRIC BANNER */}
      <div className="bg-[#F7F4EB] border-2 border-[#18181B] p-4 sm:p-6 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 items-center">
          
          {/* Left Fraction Box */}
          <div className="md:col-span-4 lg:col-span-3 border-b-2 md:border-b-0 md:border-r-2 border-[#18181B] pb-4 md:pb-0 md:pr-6">
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#18181B] tracking-tight">
                {totalEarnedAndPending}
              </span>
              <span className="text-xl sm:text-2xl font-bold text-stone-500">
                / {REQUIRED_ACTIVITIES}
              </span>
              <span className="text-xs font-black uppercase text-stone-700 ml-1">กิจกรรม</span>
            </div>
            <div className="text-xs font-black uppercase tracking-wider text-stone-800 mt-1">
              กิจกรรมสะสมของนักศึกษา
            </div>
            <div className="text-[11px] text-stone-500 font-bold mt-0.5">
              เกณฑ์บังคับคณะครุศาสตร์ ม.นครพนม (18 กิจกรรม)
            </div>
          </div>

          {/* Right Progress Bar & Legend */}
          <div className="md:col-span-8 lg:col-span-9 md:pl-2 space-y-3">
            
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-[#EA580C] tracking-tight">
                  {completionPercent}%
                </span>
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#18181B]">
                  บรรลุเกณฑ์หลักสูตร (CURRICULUM PROGRESS)
                </span>
              </div>
              <span className="text-xs font-bold text-stone-600">
                {remainingActivities > 0 ? `ขาดอีก ${remainingActivities} กิจกรรม จะสำเร็จตามเกณฑ์` : '✓ บรรลุเกณฑ์กิจกรรมครบถ้วนแล้ว'}
              </span>
            </div>

            {/* Stacked Multi-Color Segmented Bar */}
            <div className="w-full h-7 border-2 border-[#18181B] bg-stone-200 flex overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              {approvedCount > 0 && (
                <div 
                  style={{ width: `${approvedPct}%` }} 
                  className="bg-[#2563EB] h-full border-r-2 border-[#18181B] flex items-center justify-center text-white text-[10px] sm:text-xs font-black uppercase tracking-wider truncate px-1"
                  title={`${approvedCount} กิจกรรม อนุมัติผ่านเกณฑ์แล้ว`}
                >
                  {approvedCount} กิจกรรม
                </div>
              )}

              {inReviewCount > 0 && (
                <div 
                  style={{ width: `${inReviewPct}%` }} 
                  className="bg-[#EF4444] h-full border-r-2 border-[#18181B] flex items-center justify-center text-white text-[10px] sm:text-xs font-black uppercase tracking-wider truncate px-1"
                  title={`${inReviewCount} กิจกรรม อยู่ระหว่างรออาจารย์ตรวจ K-P-A`}
                >
                  {inReviewCount} กิจกรรม
                </div>
              )}

              {remainingActivities > 0 && (
                <div 
                  style={{ width: `${remainingPct}%` }} 
                  className="bg-[#7C3AED] h-full flex items-center justify-center text-white text-[10px] sm:text-xs font-black uppercase tracking-wider truncate px-1"
                  title={`${remainingActivities} กิจกรรม ยังต้องเข้าร่วมเพิ่ม`}
                >
                  {remainingActivities} กิจกรรม
                </div>
              )}
            </div>

            {/* Legend Items */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-[11px] sm:text-xs font-extrabold uppercase">
              <div className="flex items-center gap-1.5 text-[#18181B]">
                <CheckCircle2 className="w-4 h-4 text-[#2563EB] shrink-0" />
                <span className="font-black text-[#2563EB]">{approvedCount} กิจกรรม</span>
                <span>อนุมัติผ่านเกณฑ์แล้ว</span>
              </div>

              <div className="flex items-center gap-1.5 text-[#18181B]">
                <Clock className="w-4 h-4 text-[#EF4444] shrink-0" />
                <span className="font-black text-[#EF4444]">{inReviewCount} กิจกรรม</span>
                <span>รออาจารย์ตรวจ K-P-A</span>
              </div>

              <div className="flex items-center gap-1.5 text-[#18181B]">
                <Users className="w-4 h-4 text-[#7C3AED] shrink-0" />
                <span className="font-black text-[#7C3AED]">{remainingActivities} กิจกรรม</span>
                <span>ต้องเข้าร่วมเพิ่ม</span>
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* 2. THREE METRIC CARDS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 border-2 border-[#18181B] bg-[#F7F4EB] divide-y-2 md:divide-y-0 md:divide-x-2 divide-[#18181B] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        
        {/* Card 1: Activities Attended */}
        <div 
          onClick={() => setTableFilter('attended')}
          className="p-4 sm:p-5 flex items-center gap-4 cursor-pointer hover:bg-amber-50/70 transition-colors"
        >
          <div className="w-12 h-12 bg-[#FACC15] border-2 border-black flex items-center justify-center text-black shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Calendar className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-wider text-stone-700">
              กิจกรรมที่เข้าร่วมแล้ว
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#18181B] leading-none my-1">
              {totalActivities} กิจกรรม
            </div>
            <div className="text-[11px] font-bold text-stone-600 flex items-center gap-1">
              <span>เช็คอินผ่านระบบแล้วทั้งหมด</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>

        {/* Card 2: Approved K-P-A */}
        <div 
          onClick={() => setTableFilter('pending_kpa')}
          className="p-4 sm:p-5 flex items-center gap-4 cursor-pointer hover:bg-amber-50/70 transition-colors"
        >
          <div className="w-12 h-12 bg-[#EF4444] border-2 border-black flex items-center justify-center text-white shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Check className="w-6 h-6 stroke-[3]" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-wider text-stone-700">
              อนุมัติผลสะท้อนคิด K-P-A
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#18181B] leading-none my-1">
              {approvedCount} / {totalActivities}
            </div>
            <div className="text-[11px] font-bold text-stone-600">
              {summaryCounts.pendingKpa > 0 ? `รอตรวจ/รอส่งอีก ${summaryCounts.pendingKpa} รายการ` : '✓ ส่งรายงานครบถ้วนแล้ว'}
            </div>
          </div>
        </div>

        {/* Card 3: Total Net Earned Activities */}
        <div 
          onClick={() => setTableFilter('approved')}
          className="p-4 sm:p-5 flex items-center gap-4 cursor-pointer hover:bg-amber-50/70 transition-colors"
        >
          <div className="w-12 h-12 bg-[#2563EB] border-2 border-black flex items-center justify-center text-white shrink-0 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <Star className="w-6 h-6 fill-white" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-black uppercase tracking-wider text-stone-700">
              กิจกรรมสะสมสุทธิ
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#18181B] leading-none my-1">
              {approvedCount} กิจกรรม
            </div>
            <div className="text-[11px] font-bold text-stone-600">
              {Math.round((approvedCount / REQUIRED_ACTIVITIES) * 100)}% ของเกณฑ์หลักสูตร (18 กิจกรรม) ↗
            </div>
          </div>
        </div>

      </div>

      {/* K-P-A Competency Progress Strip */}
      <div className="bg-white border-2 border-[#18181B] p-4 sm:p-5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-stone-200">
          <div>
            <h3 className="text-xs sm:text-sm font-black text-[#18181B] uppercase tracking-wider flex items-center gap-2">
              <Award className="w-4 h-4 text-[#EA580C]" />
              <span>สมรรถนะครู 3 ด้าน (K-P-A Competencies) ตามเกณฑ์มาตรฐานวิชาชีพครู</span>
            </h3>
            <p className="text-[11px] text-stone-500 font-medium">
              ประเมินจากการสะท้อนคิด (Self-Reflection) ในกิจกรรมที่เข้าร่วม
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('review')}
            className="text-xs font-black text-[#2563EB] hover:underline inline-flex items-center gap-1 shrink-0"
          >
            <span>ดูรายงานสะท้อนคิดทั้งหมด</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {/* K */}
          <div className="p-3 bg-[#FAF7F0] border-2 border-stone-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-xs font-black">
              <span className="text-stone-800">1. ด้านความรู้ (K - Knowledge)</span>
              <span className="text-[#EF4444]">85%</span>
            </div>
            <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden border border-stone-300">
              <div className="h-full bg-[#EF4444] rounded-full" style={{ width: '85%' }} />
            </div>
            <p className="text-[10px] text-stone-500 font-medium truncate">การบูรณาการหลักการ ทฤษฎีการศึกษา และเทคโนโลยี</p>
          </div>
          {/* P */}
          <div className="p-3 bg-[#FAF7F0] border-2 border-stone-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-xs font-black">
              <span className="text-stone-800">2. ด้านทักษะปฏิบัติ (P - Practice)</span>
              <span className="text-[#2563EB]">75%</span>
            </div>
            <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden border border-stone-300">
              <div className="h-full bg-[#2563EB] rounded-full" style={{ width: '75%' }} />
            </div>
            <p className="text-[10px] text-stone-500 font-medium truncate">การลงมือปฏิบัติ กิจกรรมการเรียนรู้ และการทำงานเป็นทีม</p>
          </div>
          {/* A */}
          <div className="p-3 bg-[#FAF7F0] border-2 border-stone-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-xs font-black">
              <span className="text-stone-800">3. ด้านเจตคติ (A - Attitude & Ethics)</span>
              <span className="text-[#7C3AED]">90%</span>
            </div>
            <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden border border-stone-300">
              <div className="h-full bg-[#7C3AED] rounded-full" style={{ width: '90%' }} />
            </div>
            <p className="text-[10px] text-stone-500 font-medium truncate">จิตสาธารณะ จิตวิญญาณความเป็นครู และจรรยาบรรณวิชาชีพ</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. MAIN FULL-WIDTH HIGH-CAPACITY TABLE VIEW (TABLE UX)                    */}
      {/* ========================================================================= */}
      <div className="bg-white border-2 border-[#18181B] rounded-2xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden space-y-0">
        
        {/* Table Top Controls & Search Bar */}
        <div className="p-4 sm:p-5 bg-[#FAF7F0] border-b-2 border-[#18181B] space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 bg-[#EA580C] text-white text-[10px] font-black rounded-md">
                  TABLE VIEW
                </span>
                <span className="text-xs font-bold text-stone-500">
                  ระบบแสดงผลตารางรองรับกิจกรรมจำนวนมาก
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-[#18181B] mt-1">
                ตารางรายการกิจกรรมนักศึกษา (STUDENT ACTIVITIES TABLE)
              </h2>
              <p className="text-xs text-stone-600 font-medium mt-0.5">
                ตรวจสอบกำหนดการ สถานะการเช็คอิน และการส่งรายงาน K-P-A แบบละเอียดรายแถว
              </p>
            </div>

            {/* Quick Actions & Export */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportCsv}
                className="px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border-2 border-[#18181B] rounded-xl text-xs font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 transition-all"
                title="ส่งออกตารางเป็นไฟล์ CSV"
              >
                <Download className="w-3.5 h-3.5 text-stone-600" />
                <span>ดาวน์โหลด CSV</span>
              </button>

              <button
                onClick={() => {
                  setTableFilter(prev => prev === 'required' ? 'all' : 'required');
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-xl font-black text-xs border-2 border-[#18181B] transition-all flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 ${
                  tableFilter === 'required'
                    ? 'bg-[#EA580C] text-white'
                    : 'bg-[#FACC15] hover:bg-amber-400 text-stone-900'
                }`}
              >
                <span>🎯</span>
                <span>เฉพาะที่ต้องเข้าร่วม</span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-black ${
                  tableFilter === 'required' ? 'bg-white text-[#EA580C]' : 'bg-[#18181B] text-[#FACC15]'
                }`}>
                  {summaryCounts.requiredPending}
                </span>
              </button>
            </div>
          </div>

          {/* Filter Pills & Instant Search Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-stone-200">
            
            {/* Status Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
              <span className="text-[11px] font-black text-stone-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-[#EA580C]" />
                สถานะ:
              </span>

              {[
                { id: 'all', label: 'ทั้งหมด', count: summaryCounts.all },
                { id: 'required', label: 'ที่ต้องเข้าร่วม', count: summaryCounts.requiredPending },
                { id: 'attended', label: 'เช็คอินแล้ว', count: summaryCounts.attended },
                { id: 'pending_kpa', label: 'รอส่ง/รอตรวจ KPA', count: summaryCounts.pendingKpa },
                { id: 'approved', label: 'ผ่านอนุมัติแล้ว', count: summaryCounts.approved }
              ].map(tab => {
                const isActive = tableFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setTableFilter(tab.id as any);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1 rounded-lg text-xs font-black transition-all whitespace-nowrap border flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[#18181B] text-[#FACC15] border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                        : 'bg-white hover:bg-stone-50 text-stone-700 border-stone-300'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                      isActive ? 'bg-[#FACC15] text-[#18181B]' : 'bg-stone-100 text-stone-600'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search Input & Page Size */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1 md:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="ค้นหาชื่อ, รหัส, สถานที่..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border-2 border-stone-300 rounded-xl outline-none font-medium focus:border-black transition-colors"
                />
              </div>

              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border-2 border-stone-300 rounded-xl px-2.5 py-1.5 text-xs font-bold text-stone-700 outline-none cursor-pointer hover:border-black"
                title="จำนวนแถวต่อหน้า"
              >
                <option value={10}>10 รายการ</option>
                <option value={25}>25 รายการ</option>
                <option value={50}>50 รายการ</option>
                <option value={0}>ทั้งหมด</option>
              </select>
            </div>

          </div>
        </div>

        {/* The Table Element */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[950px]">
            <thead className="bg-[#FAF7F0] border-b-2 border-[#18181B] text-[11px] font-black text-stone-600 uppercase tracking-wider select-none sticky top-0 z-10">
              <tr>
                <th className="py-3 px-3.5 w-12 text-center">#</th>
                
                <th 
                  onClick={() => toggleSort('code')}
                  className="py-3 px-3 cursor-pointer hover:text-black transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>รหัส & รุ่น</span>
                    <ArrowUpDown className="w-3 h-3 text-stone-400" />
                  </div>
                </th>

                <th 
                  onClick={() => toggleSort('name')}
                  className="py-3 px-4 cursor-pointer hover:text-black transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>ชื่อกิจกรรม & หมวดหมู่</span>
                    <ArrowUpDown className="w-3 h-3 text-stone-400" />
                  </div>
                </th>

                <th 
                  onClick={() => toggleSort('date')}
                  className="py-3 px-3.5 cursor-pointer hover:text-black transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>กำหนดการจัดกิจกรรม</span>
                    <ArrowUpDown className="w-3 h-3 text-stone-400" />
                  </div>
                </th>

                <th className="py-3 px-3">สถานที่จัด</th>

                <th 
                  onClick={() => toggleSort('hours')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-black transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>ชั่วโมง</span>
                    <ArrowUpDown className="w-3 h-3 text-stone-400" />
                  </div>
                </th>

                <th 
                  onClick={() => toggleSort('status')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-black transition-colors"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>การเข้าร่วม</span>
                    <ArrowUpDown className="w-3 h-3 text-stone-400" />
                  </div>
                </th>

                <th className="py-3 px-3 text-center">สถานะ K-P-A</th>

                <th className="py-3 px-4 text-center">การดำเนินการ</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-stone-200">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-stone-400 font-bold bg-white">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Calendar className="w-8 h-8 text-stone-300" />
                      <p className="text-xs text-stone-600">ไม่พบกิจกรรมตามเงื่อนไขที่เลือก</p>
                      <button
                        onClick={() => {
                          setTableFilter('all');
                          setSearchQuery('');
                        }}
                        className="px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-bold"
                      >
                        ล้างตัวกรอง
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, idx) => {
                  const itemIndex = startIndex + idx + 1;
                  const isHighlightRow = row.isRequired && !row.isApproved;
                  
                  const dateStr = row.date 
                    ? new Date(row.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '-';
                  const timeStr = row.log?.timestamp 
                    ? new Date(row.log.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                    : null;

                  return (
                    <tr 
                      key={row.id}
                      className={`transition-colors ${
                        isHighlightRow 
                          ? 'bg-amber-50/50 hover:bg-amber-100/60' 
                          : idx % 2 === 0 ? 'bg-white hover:bg-[#FAF7F0]' : 'bg-stone-50/60 hover:bg-[#FAF7F0]'
                      }`}
                    >
                      {/* 1. Index */}
                      <td className="py-3 px-3.5 text-center font-mono font-bold text-stone-400">
                        {itemIndex}
                      </td>

                      {/* 2. Code & Cohort */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono font-black text-stone-900 text-xs">
                            {row.id}
                          </span>
                          {row.yearLevel && (
                            <span className="text-[10px] font-bold text-stone-500">
                              {row.yearLevel}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 3. Name & Category */}
                      <td className="py-3 px-4 min-w-[260px]">
                        <div className="space-y-1">
                          <div className="font-black text-xs sm:text-sm text-[#18181B] leading-snug">
                            {row.name}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-[10px] font-medium border border-stone-200">
                              {row.category}
                            </span>
                            {row.isRequired && (
                              <span className="px-1.5 py-0.2 bg-[#EA580C] text-white rounded text-[10px] font-black">
                                บังคับ
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 4. Date & Schedule */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="font-bold text-xs text-stone-800">
                          {dateStr}
                        </div>
                        {timeStr && (
                          <div className="text-[10px] text-stone-500 font-mono">
                            เช็คอิน {timeStr} น.
                          </div>
                        )}
                      </td>

                      {/* 5. Location */}
                      <td className="py-3 px-3 font-medium text-xs text-stone-600 max-w-[160px] truncate" title={row.location}>
                        <div className="flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span className="truncate">{row.location}</span>
                        </div>
                      </td>

                      {/* 6. Hours */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-stone-100 text-stone-800 font-black rounded-lg text-xs font-mono border border-stone-200">
                          {row.hours} ชม.
                        </span>
                      </td>

                      {/* 7. Attendance Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {row.isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-black">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>อนุมัติแล้ว</span>
                          </span>
                        ) : row.hasLog ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-900 border border-blue-300 rounded-lg text-xs font-black">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            <span>เช็คอินแล้ว</span>
                          </span>
                        ) : row.isRequired ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-black">
                            <span>⚡ ต้องเข้าร่วม</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 text-stone-600 border border-stone-200 rounded-lg text-xs font-bold">
                            <span>รอเข้าร่วม</span>
                          </span>
                        )}
                      </td>

                      {/* 8. K-P-A Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {row.isApproved ? (
                          <span className="text-[11px] font-black text-emerald-700">
                            ✓ ผ่านอนุมัติ
                          </span>
                        ) : row.isPendingReview ? (
                          <span className="text-[11px] font-black text-amber-700">
                            ⏳ รออาจารย์ตรวจ
                          </span>
                        ) : row.isPendingKpaSubmission ? (
                          <span className="text-[11px] font-black text-blue-700">
                            ✏️ รอส่งสรุป KPA
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-stone-400">
                            -
                          </span>
                        )}
                      </td>

                      {/* 9. Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {row.hasLog && row.log ? (
                          <div className="flex items-center justify-center gap-1.5">
                            {row.isApproved ? (
                              <button
                                onClick={() => onOpenSubmitModal(row.log!.id)}
                                className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 rounded-lg text-xs font-bold transition-all"
                              >
                                ดูบันทึก
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => onOpenSubmitModal(row.log!.id)}
                                  className="px-2.5 py-1 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg text-xs font-black shadow-sm transition-all flex items-center gap-1"
                                >
                                  <Send className="w-3 h-3" />
                                  <span>ส่ง KPA</span>
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedActivityDetail(row.activity)}
                            className="px-2.5 py-1 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-lg text-xs font-bold transition-all"
                          >
                            ดูข้อมูล
                          </button>
                        )}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination Controls */}
        <div className="p-3.5 bg-[#FAF7F0] border-t-2 border-[#18181B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold text-stone-600">
          <div className="flex items-center gap-2">
            <span>
              แสดง <strong>{totalItems === 0 ? 0 : startIndex + 1}</strong> ถึง <strong>{Math.min(startIndex + effectivePageSize, totalItems)}</strong> จาก <strong>{totalItems}</strong> กิจกรรม
            </span>
            {tableFilter === 'required' && (
              <span className="text-[#EA580C] font-black">
                (โหมด: เฉพาะกิจกรรมที่ต้องเข้าร่วม)
              </span>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 self-center sm:self-auto">
              <button
                disabled={validCurrentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="หน้าก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4 text-stone-700" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                  // Only show current, first, last, and immediate neighbors
                  if (totalPages > 6 && Math.abs(p - validCurrentPage) > 1 && p !== 1 && p !== totalPages) {
                    if (p === 2 || p === totalPages - 1) {
                      return <span key={p} className="px-1 text-stone-400">...</span>;
                    }
                    return null;
                  }

                  const isCurrent = p === validCurrentPage;
                  return (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`w-7 h-7 rounded-lg text-xs font-black transition-all border ${
                        isCurrent
                          ? 'bg-[#18181B] text-[#FACC15] border-[#18181B] shadow-sm'
                          : 'bg-white hover:bg-stone-100 text-stone-700 border-stone-300'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={validCurrentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="หน้าถัดไป"
              >
                <ChevronRight className="w-4 h-4 text-stone-700" />
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Activity Details Modal when clicking an activity */}
      {selectedActivityDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white border-2 border-black rounded-2xl max-w-lg w-full p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="flex items-start justify-between gap-3 border-b pb-3">
              <div>
                <span className="px-2.5 py-0.5 bg-[#18181B] text-[#FACC15] rounded text-xs font-mono font-black">
                  {selectedActivityDetail.id}
                </span>
                <h3 className="text-base font-black text-stone-900 mt-2">
                  {selectedActivityDetail.name}
                </h3>
              </div>
              <button
                onClick={() => setSelectedActivityDetail(null)}
                className="p-1 hover:bg-stone-100 rounded-lg text-stone-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-stone-700">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#EA580C] shrink-0" />
                <span><strong>กำหนดการ:</strong> {selectedActivityDetail.date ? new Date(selectedActivityDetail.date).toLocaleDateString('th-TH', { dateStyle: 'long' }) : 'ตามแผนปฏิบัติการ'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#2563EB] shrink-0" />
                <span><strong>สถานที่:</strong> {selectedActivityDetail.location || 'คณะครุศาสตร์ ม.นครพนม'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>จำนวนชั่วโมงสะสม:</strong> {selectedActivityDetail.hours || 6} ชั่วโมงกิจกรรม</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600 shrink-0" />
                <span><strong>กลุ่มเป้าหมาย:</strong> {selectedActivityDetail.yearLevel || (selectedActivityDetail.cohortTarget ? `รุ่นรหัส ${selectedActivityDetail.cohortTarget.join(', ')}` : 'ทุกชั้นปี')}</span>
              </div>
              {selectedActivityDetail.description && (
                <div className="pt-2 border-t text-stone-600 leading-relaxed">
                  <strong>รายละเอียด:</strong> {selectedActivityDetail.description}
                </div>
              )}
            </div>

            <div className="pt-3 border-t flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedActivityDetail(null)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-bold"
              >
                ปิดหน้าต่าง
              </button>
              <button
                onClick={() => {
                  setSelectedActivityDetail(null);
                  onOpenPassModal();
                }}
                className="px-4 py-2 bg-[#FACC15] hover:bg-amber-400 text-stone-900 border-2 border-black rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                เปิดบัตรนักศึกษาเพื่อเช็คอิน
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
