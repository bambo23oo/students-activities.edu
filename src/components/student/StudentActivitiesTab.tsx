import React, { useState, useMemo, useEffect } from 'react';
import { Activity, CheckInLog } from '../../types';
import { 
  Search, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Edit, 
  FileText, 
  History, 
  X, 
  Lock, 
  Table as TableIcon, 
  LayoutGrid, 
  Filter, 
  Sparkles, 
  ArrowUpDown, 
  ChevronDown, 
  Check, 
  Download,
  AlertTriangle,
  Award,
  Eye,
  GraduationCap,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { db } from '../../db/db';
import dayjs from 'dayjs';

interface StudentActivitiesTabProps {
  allActivities: Activity[];
  logs: CheckInLog[];
  studentId?: string;
  studentCohort?: string;
  studentName?: string;
  onOpenKpaModal?: (logId: string) => void;
}

type FilterStatus = 'all' | 'required' | 'attended' | 'pending_review' | 'upcoming' | 'missed';
type ViewMode = 'table' | 'cards';

export const StudentActivitiesTab: React.FC<StudentActivitiesTabProps> = ({ 
  allActivities, 
  logs,
  studentId = '',
  studentCohort,
  studentName,
  onOpenKpaModal
}) => {
  // Determine student cohort from prop or studentId (first 2 digits, e.g. '66' or '69')
  const myCohort = studentCohort || (studentId ? studentId.slice(0, 2) : '66');

  // Filter & Search states
  const [filterMode, setFilterMode] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [cohortFilter, setCohortFilter] = useState<string>('all');
  const [onlyMyCohort, setOnlyMyCohort] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [sortField, setSortField] = useState<'date' | 'name' | 'hours' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal states
  const [selectedActivityData, setSelectedActivityData] = useState<{ activity: Activity, log?: CheckInLog } | null>(null);
  const [editNote, setEditNote] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [localLogs, setLocalLogs] = useState<CheckInLog[]>([]);
  // Sync localLogs with incoming logs
  useEffect(() => {
    setLocalLogs(logs);
  }, [logs]);

  // Helper to determine status of an activity for this student
  const getActivityStatus = (activity: Activity) => {
    const log = localLogs.find(l => l.activityId === activity.id);
    const now = dayjs();
    const actDate = dayjs(activity.date);
    const isPast = actDate.isBefore(now, 'day');

    if (log) {
      if (log.execStatus === 'approved') {
        return { key: 'approved', label: 'อนุมัติแล้ว', color: 'emerald', isAttended: true };
      }
      if (log.execStatus === 'pending' || log.staffStatus === 'verified') {
        return { key: 'pending_review', label: 'รอตรวจสอบ KPA', color: 'amber', isAttended: true };
      }
      return { key: 'checked_in', label: 'เช็คอินแล้ว', color: 'blue', isAttended: true };
    }

    // Not attended yet:
    // If it belongs to this student's cohort or all cohorts
    const isForStudentCohort = !activity.cohort || activity.cohort === myCohort;

    if (isPast) {
      return { 
        key: 'missed', 
        label: isForStudentCohort ? 'ขาดการเข้าร่วม (จำเป็น)' : 'ไม่ได้เข้าร่วม', 
        color: 'rose', 
        isAttended: false,
        isRequired: isForStudentCohort
      };
    }

    return { 
      key: 'required', 
      label: isForStudentCohort ? 'ต้องเข้าร่วม (ยังไม่เข้าร่วม)' : 'รอเข้าร่วม', 
      color: isForStudentCohort ? 'orange' : 'stone', 
      isAttended: false,
      isRequired: isForStudentCohort
    };
  };

  // Distinct Categories for Dropdown
  const categories = useMemo(() => {
    const set = new Set<string>();
    allActivities.forEach(a => {
      if (a.category) set.add(a.category);
    });
    return Array.from(set);
  }, [allActivities]);

  // Distinct Cohorts for Dropdown
  const cohorts = useMemo(() => {
    const set = new Set<string>();
    allActivities.forEach(a => {
      if (a.cohort) set.add(a.cohort);
    });
    return Array.from(set).sort();
  }, [allActivities]);

  // Summary counts
  const summaryCounts = useMemo(() => {
    let totalVisible = 0;
    let attended = 0;
    let pendingReview = 0;
    let requiredPending = 0;
    let missed = 0;

    allActivities.forEach(act => {
      const status = getActivityStatus(act);
      // Rule: ถ้ากิจกรรมไหนที่ปิดอยู่ไม่ต้องแสดงผลบนแดชบอร์ดของนักศึกษา นอกจากเป็นกิจกรรมที่นักศึกษาเข้าร่วมแล้ว
      if (!status.isAttended && act.status !== 'active') {
        return;
      }
      totalVisible++;
      if (status.key === 'approved') attended++;
      else if (status.key === 'pending_review' || status.key === 'checked_in') pendingReview++;
      else if (status.isRequired && !status.isAttended) {
        if (status.key === 'missed') missed++;
        else requiredPending++;
      }
    });

    return {
      total: totalVisible,
      attended,
      pendingReview,
      requiredPending,
      missed
    };
  }, [allActivities, localLogs, myCohort]);

  // Filter and sort activities list
  const filteredActivities = useMemo(() => {
    let result = allActivities.filter(act => {
      const status = getActivityStatus(act);

      // Rule: ถ้ากิจกรรมไหนที่ปิดอยู่ไม่ต้องแสดงผลบนแดชบอร์ดของนักศึกษา นอกจากเป็นกิจกรรมที่นักศึกษาเข้าร่วมแล้ว
      if (!status.isAttended && act.status !== 'active') {
        return false;
      }

      // Status filter
      if (filterMode === 'required') {
        // Must be an activity the student has NOT attended yet and is required/recommended
        if (status.isAttended) return false;
        if (onlyMyCohort && act.cohort && act.cohort !== myCohort) return false;
        return true;
      }
      if (filterMode === 'attended') {
        return status.isAttended;
      }
      if (filterMode === 'pending_review') {
        return status.key === 'pending_review' || status.key === 'checked_in';
      }
      if (filterMode === 'upcoming') {
        const isPast = dayjs(act.date).isBefore(dayjs(), 'day');
        return !isPast && !status.isAttended;
      }
      if (filterMode === 'missed') {
        return status.key === 'missed';
      }

      // If "onlyMyCohort" toggle is active
      if (onlyMyCohort && act.cohort && act.cohort !== myCohort) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && act.category !== categoryFilter) {
        return false;
      }

      // Cohort filter
      if (cohortFilter !== 'all' && act.cohort !== cohortFilter) {
        return false;
      }

      return true;
    });

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(act => 
        act.name.toLowerCase().includes(q) ||
        (act.id && act.id.toLowerCase().includes(q)) ||
        (act.location && act.location.toLowerCase().includes(q)) ||
        (act.category && act.category.toLowerCase().includes(q)) ||
        (act.yearLevel && act.yearLevel.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortField === 'date') {
        const tA = new Date(a.date).getTime();
        const tB = new Date(b.date).getTime();
        return sortOrder === 'asc' ? tA - tB : tB - tA;
      }
      if (sortField === 'name') {
        return sortOrder === 'asc' 
          ? a.name.localeCompare(b.name, 'th') 
          : b.name.localeCompare(a.name, 'th');
      }
      if (sortField === 'hours') {
        const hA = a.hours || 1;
        const hB = b.hours || 1;
        return sortOrder === 'asc' ? hA - hB : hB - hA;
      }
      if (sortField === 'status') {
        const sA = getActivityStatus(a).key;
        const sB = getActivityStatus(b).key;
        return sortOrder === 'asc' ? sA.localeCompare(sB) : sB.localeCompare(sA);
      }
      return 0;
    });

    return result;
  }, [allActivities, localLogs, filterMode, searchQuery, categoryFilter, cohortFilter, onlyMyCohort, myCohort, sortField, sortOrder]);

  // Reset pagination to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterMode, searchQuery, categoryFilter, cohortFilter, onlyMyCohort]);

  // Pagination computations
  const totalItems = filteredActivities.length;
  const effectivePageSize = pageSize === 0 ? totalItems || 1 : pageSize;
  const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (validCurrentPage - 1) * effectivePageSize;
  const paginatedActivities = useMemo(() => {
    return pageSize === 0 ? filteredActivities : filteredActivities.slice(startIndex, startIndex + effectivePageSize);
  }, [filteredActivities, pageSize, startIndex, effectivePageSize]);

  const handleOpenDetails = async (activity: Activity) => {
    const log = localLogs.find(l => l.activityId === activity.id);
    if (log) {
      let currentLog = await db.checkInLogs.get(log.id);
      if (!currentLog) currentLog = log;
      
      const newTrail = [...(currentLog.auditTrail || [])];
      newTrail.push({
        action: 'view',
        timestamp: new Date().toISOString(),
        details: 'เข้าดูรายละเอียดกิจกรรมผ่านตาราง'
      });
      
      const updatedLog = { ...currentLog, auditTrail: newTrail };
      await db.checkInLogs.put(updatedLog);
      setLocalLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l));
      setSelectedActivityData({ activity, log: updatedLog });
      setEditNote(updatedLog.studentNote || '');
    } else {
      setSelectedActivityData({ activity });
      setEditNote('');
    }
    setIsEditingNote(false);
  };

  const handleSaveNote = async () => {
    if (!selectedActivityData || !selectedActivityData.log) return;
    const { log } = selectedActivityData;
    
    let currentLog = await db.checkInLogs.get(log.id);
    if (!currentLog) currentLog = log;

    const newTrail = [...(currentLog.auditTrail || [])];
    newTrail.push({
      action: 'edit',
      timestamp: new Date().toISOString(),
      details: 'แก้ไขบันทึกผลการเข้าร่วมกิจกรรม'
    });
    
    const updatedLog = { ...currentLog, studentNote: editNote, auditTrail: newTrail };
    await db.checkInLogs.put(updatedLog);
    
    setLocalLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l));
    setSelectedActivityData({ ...selectedActivityData, log: updatedLog });
    setIsEditingNote(false);
  };

  const handleExportTable = () => {
    const csvContent = [
      ['รหัสกิจกรรม', 'ชื่อกิจกรรม', 'ประเภท', 'ชั้นปี/รุ่น', 'กำหนดการ', 'สถานที่', 'ชั่วโมง', 'สถานะการเข้าร่วม'].join(','),
      ...filteredActivities.map(act => {
        const st = getActivityStatus(act);
        return [
          `"${act.id}"`,
          `"${act.name.replace(/"/g, '""')}"`,
          `"${act.category || ''}"`,
          `"${act.yearLevel || ''}"`,
          `"${act.newSchedule || act.date || ''}"`,
          `"${(act.location || '').replace(/"/g, '""')}"`,
          `"${act.hours || 1}"`,
          `"${st.label}"`
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `ตารางกิจกรรม_${studentId}_${dayjs().format('YYYYMMDD')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSort = (field: 'date' | 'name' | 'hours' | 'status') => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6 font-sans animate-in fade-in duration-300">
      
      {/* 1. Header & Summary Stats */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-[#EA580C] text-white rounded-md text-[11px] font-black uppercase tracking-wider">
                Student Portal
              </span>
              <span className="text-xs font-bold text-stone-500">
                รหัสรุ่น {myCohort} • คณะครุศาสตร์ / วิทยาศาสตร์
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#18181B] tracking-tight">
              ตารางกิจกรรมและการเข้าร่วม (Activity Attendance Table)
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 font-medium mt-0.5">
              ตรวจสอบกิจกรรมทั้งหมด ค้นหา กรองสถานะ และติดตามกิจกรรมที่ต้องเข้าร่วมเพื่อสำเร็จการศึกษา
            </p>
          </div>

          {/* Quick Action: Export / View Mode Switcher */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExportTable}
              className="px-3.5 py-2 bg-white hover:bg-stone-50 text-stone-800 border-2 border-[#18181B] rounded-xl text-xs font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-1.5 active:translate-x-0.5 active:translate-y-0.5"
              title="ส่งออกตารางเป็นไฟล์ CSV"
            >
              <Download className="w-3.5 h-3.5 text-[#EA580C]" />
              <span className="hidden sm:inline">ดาวน์โหลดตาราง</span>
              <span className="sm:hidden">CSV</span>
            </button>

            {/* View Mode Switcher */}
            <div className="bg-[#FAF7F0] p-1 border-2 border-[#18181B] rounded-xl flex items-center gap-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'table'
                    ? 'bg-[#18181B] text-[#FACC15]'
                    : 'text-stone-600 hover:bg-stone-200'
                }`}
                title="มุมมองตาราง (Table View)"
              >
                <TableIcon className="w-4 h-4" />
                <span className="text-[11px] font-black hidden md:inline">ตาราง</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'cards'
                    ? 'bg-[#18181B] text-[#FACC15]'
                    : 'text-stone-600 hover:bg-stone-200'
                }`}
                title="มุมมองการ์ด (Card View)"
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="text-[11px] font-black hidden md:inline">การ์ด</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Summary Stat Pills */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-stone-200 text-xs">
          {/* Required Pending Card - Highlighted */}
          <button
            onClick={() => setFilterMode(filterMode === 'required' ? 'all' : 'required')}
            className={`p-3 rounded-xl border-2 transition-all text-left flex items-center justify-between ${
              filterMode === 'required'
                ? 'bg-amber-100 border-[#EA580C] shadow-[2px_2px_0px_0px_rgba(234,88,12,1)]'
                : 'bg-amber-50/70 hover:bg-amber-100 border-amber-300'
            }`}
          >
            <div>
              <span className="text-[10px] font-bold text-amber-900 block flex items-center gap-1">
                <span>🎯</span> ต้องเข้าร่วม (ยังไม่เสร็จ)
              </span>
              <span className="text-lg font-black text-[#EA580C]">
                {summaryCounts.requiredPending} <span className="text-xs font-normal text-stone-600">กิจกรรม</span>
              </span>
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 bg-[#EA580C] text-white rounded-md">
              คลิกกรอง
            </span>
          </button>

          {/* Attended / Completed */}
          <button
            onClick={() => setFilterMode(filterMode === 'attended' ? 'all' : 'attended')}
            className={`p-3 rounded-xl border-2 transition-all text-left flex items-center justify-between ${
              filterMode === 'attended'
                ? 'bg-emerald-100 border-emerald-600 shadow-[2px_2px_0px_0px_rgba(5,150,105,1)]'
                : 'bg-emerald-50/60 hover:bg-emerald-100 border-emerald-300'
            }`}
          >
            <div>
              <span className="text-[10px] font-bold text-emerald-900 block flex items-center gap-1">
                <span>✓</span> ผ่านการอนุมัติแล้ว
              </span>
              <span className="text-lg font-black text-emerald-800">
                {summaryCounts.attended} <span className="text-xs font-normal text-stone-600">กิจกรรม</span>
              </span>
            </div>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          </button>

          {/* Pending Review */}
          <button
            onClick={() => setFilterMode(filterMode === 'pending_review' ? 'all' : 'pending_review')}
            className={`p-3 rounded-xl border-2 transition-all text-left flex items-center justify-between ${
              filterMode === 'pending_review'
                ? 'bg-sky-100 border-sky-600 shadow-[2px_2px_0px_0px_rgba(37,99,235,1)]'
                : 'bg-sky-50/60 hover:bg-sky-100 border-sky-300'
            }`}
          >
            <div>
              <span className="text-[10px] font-bold text-sky-900 block flex items-center gap-1">
                <span>⏳</span> รอตรวจสอบ KPA
              </span>
              <span className="text-lg font-black text-sky-800">
                {summaryCounts.pendingReview} <span className="text-xs font-normal text-stone-600">กิจกรรม</span>
              </span>
            </div>
            <Clock className="w-4 h-4 text-sky-600 shrink-0" />
          </button>

          {/* All Activities */}
          <button
            onClick={() => setFilterMode('all')}
            className={`p-3 rounded-xl border-2 transition-all text-left flex items-center justify-between ${
              filterMode === 'all'
                ? 'bg-[#18181B] text-white border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-stone-50 hover:bg-stone-100 border-stone-300'
            }`}
          >
            <div>
              <span className="text-[10px] font-bold text-stone-400 block">
                กิจกรรมทั้งหมดในระบบ
              </span>
              <span className={`text-lg font-black ${filterMode === 'all' ? 'text-[#FACC15]' : 'text-stone-900'}`}>
                {summaryCounts.total} <span className="text-xs font-normal opacity-80">รายการ</span>
              </span>
            </div>
            <GraduationCap className={`w-4 h-4 shrink-0 ${filterMode === 'all' ? 'text-[#FACC15]' : 'text-stone-500'}`} />
          </button>
        </div>
      </div>

      {/* 2. Search & Multi-Filter Control Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] space-y-3.5">
        
        {/* Main Search Input & Primary "Required" Quick Toggle */}
        <div className="flex flex-col lg:flex-row gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อกิจกรรม, รหัส (เช่น ACT_69_01), สถานที่จัด..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#FAF7F0] border-2 border-[#18181B] rounded-xl text-xs sm:text-sm font-bold text-stone-900 placeholder:text-stone-400 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-black p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Core Feature Button: "แสดงเฉพาะกิจกรรมที่จะต้องเข้าร่วม" */}
          <button
            onClick={() => {
              if (filterMode === 'required') {
                setFilterMode('all');
              } else {
                setFilterMode('required');
                setOnlyMyCohort(true);
              }
            }}
            className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm border-2 border-[#18181B] transition-all flex items-center justify-center gap-2 shrink-0 ${
              filterMode === 'required'
                ? 'bg-[#EA580C] text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                : 'bg-[#FACC15] hover:bg-amber-400 text-stone-900 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] active:translate-x-0.5 active:translate-y-0.5'
            }`}
          >
            <span>🎯</span>
            <span>แสดงเฉพาะกิจกรรมที่จะต้องเข้าร่วม</span>
            <span className={`px-2 py-0.5 rounded-md text-xs font-black ${
              filterMode === 'required' ? 'bg-white text-[#EA580C]' : 'bg-[#18181B] text-[#FACC15]'
            }`}>
              {summaryCounts.requiredPending}
            </span>
          </button>
        </div>

        {/* Secondary Filter Pills & Dropdowns */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-100">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar pb-1">
            <span className="text-[11px] font-black text-stone-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-[#EA580C]" />
              สถานะ:
            </span>

            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'required', label: 'เฉพาะที่ต้องเข้าร่วม' },
              { id: 'attended', label: 'เข้าร่วมแล้ว' },
              { id: 'pending_review', label: 'รอตรวจ KPA' },
              { id: 'upcoming', label: 'ที่ยังไม่ถึงกำหนด' },
              { id: 'missed', label: 'ไม่ได้เข้าร่วม' }
            ].map(tab => {
              const isActive = filterMode === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setFilterMode(tab.id as FilterStatus)}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all whitespace-nowrap border ${
                    isActive
                      ? 'bg-[#18181B] text-[#FACC15] border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-300'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Dropdown Filters (Category & Cohort) */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Category Dropdown */}
            <div className="flex items-center gap-1 text-xs">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-white border-2 border-stone-300 rounded-lg px-2.5 py-1 text-xs font-bold text-stone-700 outline-none cursor-pointer hover:border-black"
              >
                <option value="all">ทุกหมวดหมู่ ({categories.length})</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Cohort Dropdown */}
            <div className="flex items-center gap-1 text-xs">
              <select
                value={cohortFilter}
                onChange={(e) => setCohortFilter(e.target.value)}
                className="bg-white border-2 border-stone-300 rounded-lg px-2.5 py-1 text-xs font-bold text-stone-700 outline-none cursor-pointer hover:border-black"
              >
                <option value="all">ทุกรุ่น / ทุกชั้นปี</option>
                {cohorts.map(c => (
                  <option key={c} value={c}>รุ่นรหัส {c}</option>
                ))}
              </select>
            </div>

            {/* My Cohort Only Checkbox */}
            <label className="flex items-center gap-1.5 text-xs font-bold text-stone-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-300 cursor-pointer select-none">
              <input 
                type="checkbox"
                checked={onlyMyCohort}
                onChange={(e) => setOnlyMyCohort(e.target.checked)}
                className="rounded border-stone-300 text-[#EA580C] focus:ring-[#EA580C] cursor-pointer"
              />
              <span>เฉพาะรุ่นรหัส {myCohort} ของฉัน</span>
            </label>
          </div>
        </div>

      </div>

      {/* 3. Main Data Content: Table View (Primary) or Card View */}
      {filteredActivities.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-stone-300 rounded-2xl p-12 text-center shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center mx-auto text-amber-800">
            {filterMode === 'required' ? <Sparkles className="w-6 h-6" /> : <Calendar className="w-6 h-6" />}
          </div>
          <div>
            <h3 className="text-base font-black text-stone-900">
              {filterMode === 'required' 
                ? '🎉 ยอดเยี่ยม! ไม่มีกิจกรรมที่ค้างต้องเข้าร่วมในขณะนี้' 
                : 'ไม่พบกิจกรรมที่ตรงกับเงื่อนไขการค้นหา'}
            </h3>
            <p className="text-xs text-stone-500 font-medium mt-1 max-w-md mx-auto">
              {filterMode === 'required'
                ? 'คุณได้เข้าร่วมกิจกรรมที่จำเป็นครบถ้วนแล้ว หรือไม่มีกิจกรรมเปิดรับในช่วงนี้'
                : 'ลองล้างคำค้นหาหรือเปลี่ยนตัวกรองสถานะเพื่อแสดงรายการกิจกรรมอื่นๆ'}
            </p>
          </div>
          <button
            onClick={() => {
              setFilterMode('all');
              setSearchQuery('');
              setCategoryFilter('all');
              setCohortFilter('all');
              setOnlyMyCohort(false);
            }}
            className="px-4 py-2 bg-[#18181B] text-[#FACC15] font-bold text-xs rounded-xl border border-black shadow-sm hover:bg-stone-800 transition-all"
          >
            รีเซ็ตตัวกรองทั้งหมด
          </button>
        </div>
      ) : viewMode === 'table' ? (
        
        /* ========================================================================= */
        /* TABLE VIEW (PRIMARY UX)                                                   */
        /* ========================================================================= */
        <div className="bg-white rounded-2xl border-2 border-[#18181B] shadow-[3px_3px_0px_0px_rgba(24,24,27,1)] overflow-hidden">
          <div className="p-3 bg-[#FAF7F0] border-b-2 border-[#18181B] flex flex-wrap items-center justify-between text-xs text-stone-600 gap-2 font-bold">
            <div className="flex items-center gap-2">
              <span className="text-[#EA580C]">●</span>
              <span>
                แสดงผล <strong>{totalItems === 0 ? 0 : startIndex + 1} - {Math.min(startIndex + effectivePageSize, totalItems)}</strong> จาก <strong>{totalItems}</strong> กิจกรรม
              </span>
              {filterMode === 'required' && (
                <span className="px-2 py-0.5 bg-[#EA580C] text-white rounded text-[10px] font-black">
                  โหมด: เฉพาะที่ต้องเข้าร่วม
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-stone-400 hidden sm:inline">
                คลิกที่หัวตารางเพื่อจัดเรียง (Sort)
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border-2 border-stone-300 rounded-lg px-2 py-1 text-xs font-bold text-stone-700 outline-none cursor-pointer hover:border-black"
                title="จำนวนแถวต่อหน้า"
              >
                <option value={10}>10 รายการ</option>
                <option value={25}>25 รายการ</option>
                <option value={50}>50 รายการ</option>
                <option value={0}>ทั้งหมด</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[900px]">
              <thead className="bg-[#FAF7F0] border-b-2 border-[#18181B] text-[11px] font-black text-stone-500 uppercase tracking-wider select-none">
                <tr>
                  <th className="py-3 px-3.5 w-12 text-center">#</th>
                  <th 
                    onClick={() => toggleSort('name')}
                    className="py-3 px-4 cursor-pointer hover:text-black transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>รหัส & ชื่อกิจกรรม</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">หมวดหมู่กิจกรรม</th>
                  <th 
                    onClick={() => toggleSort('date')}
                    className="py-3 px-4 cursor-pointer hover:text-black transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>กำหนดการจัดกิจกรรม</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
                    </div>
                  </th>
                  <th className="py-3 px-3">สถานที่จัด</th>
                  <th 
                    onClick={() => toggleSort('hours')}
                    className="py-3 px-3 text-center cursor-pointer hover:text-black transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>ชั่วโมง / หน่วย</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => toggleSort('status')}
                    className="py-3 px-4 text-center cursor-pointer hover:text-black transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <span>สถานะการเข้าร่วม</span>
                      <ArrowUpDown className="w-3.5 h-3.5 text-stone-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4 text-center">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {paginatedActivities.map((activity, idx) => {
                  const itemIndex = startIndex + idx + 1;
                  const status = getActivityStatus(activity);
                  const log = localLogs.find(l => l.activityId === activity.id);

                  // Highlight required pending rows with soft warm amber tint
                  const isHighlightRow = status.isRequired && !status.isAttended;

                  return (
                    <tr 
                      key={activity.id}
                      onClick={() => handleOpenDetails(activity)}
                      className={`cursor-pointer transition-colors ${
                        isHighlightRow
                          ? 'bg-amber-50/60 hover:bg-amber-100/70'
                          : idx % 2 === 0 ? 'bg-white hover:bg-[#FAF7F0]' : 'bg-stone-50/50 hover:bg-[#FAF7F0]'
                      }`}
                    >
                      {/* 1. Index Number */}
                      <td className="py-3.5 px-3.5 text-center font-mono font-bold text-stone-400">
                        {itemIndex}
                      </td>

                      {/* 2. Activity ID & Name */}
                      <td className="py-3.5 px-4 font-bold text-stone-900 min-w-[240px]">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="px-2 py-0.2 bg-[#18181B] text-[#FACC15] rounded text-[10px] font-mono font-black">
                            {activity.id}
                          </span>
                          {activity.yearLevel && (
                            <span className="px-2 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 rounded text-[10px] font-bold">
                              {activity.yearLevel}
                            </span>
                          )}
                          {isHighlightRow && (
                            <span className="px-2 py-0.2 bg-[#EA580C] text-white rounded text-[10px] font-black animate-pulse">
                              จำเป็นต้องเข้าร่วม
                            </span>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm font-black text-stone-900 leading-snug">
                          {activity.name}
                        </div>
                        {activity.note && (
                          <div className="text-[10px] text-amber-800 font-medium mt-0.5">
                            ℹ️ {activity.note}
                          </div>
                        )}
                      </td>

                      {/* 3. Category */}
                      <td className="py-3.5 px-4 text-stone-600">
                        <span className="px-2.5 py-1 bg-stone-100 border border-stone-300 rounded-lg text-[11px] font-bold inline-block">
                          {activity.category || 'ทั่วไป'}
                        </span>
                      </td>

                      {/* 4. Date & Schedule */}
                      <td className="py-3.5 px-4 text-stone-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-bold">
                          <Calendar className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                          <span>
                            {activity.newSchedule || (activity.date ? dayjs(activity.date).format('DD MMM YYYY') : '-')}
                          </span>
                        </div>
                        {activity.duration && (
                          <div className="flex items-center gap-1 text-[11px] text-stone-500 font-medium pl-5 mt-0.5">
                            <Clock className="w-3 h-3 text-[#F59E0B]" />
                            <span>{activity.duration}</span>
                          </div>
                        )}
                      </td>

                      {/* 5. Location */}
                      <td className="py-3.5 px-3 text-stone-600 max-w-[160px]">
                        <div className="flex items-start gap-1 font-medium text-[11px] truncate">
                          <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <span className="truncate">{activity.location || 'คณะครุศาสตร์'}</span>
                        </div>
                      </td>

                      {/* 6. Hours / Points */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className="font-black text-stone-900 text-xs">
                          {activity.hours || 1} ชม.
                        </span>
                        {activity.points && (
                          <span className="block text-[10px] font-bold text-amber-700">
                            +{activity.points} แต้ม
                          </span>
                        )}
                      </td>

                      {/* 7. Status Badge */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {status.key === 'approved' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-[11px] font-black">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>ผ่านอนุมัติแล้ว</span>
                          </span>
                        ) : status.key === 'pending_review' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-black">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            <span>รอตรวจสอบ KPA</span>
                          </span>
                        ) : status.key === 'checked_in' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-100 text-sky-900 border border-sky-300 rounded-lg text-[11px] font-black">
                            <Check className="w-3.5 h-3.5 text-sky-600" />
                            <span>เช็คอินแล้ว</span>
                          </span>
                        ) : status.key === 'missed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-900 border border-rose-300 rounded-lg text-[11px] font-black">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>ไม่ได้เข้าร่วม</span>
                          </span>
                        ) : isHighlightRow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#EA580C] text-white rounded-lg text-[11px] font-black shadow-xs">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>ต้องเข้าร่วม (ยังไม่เสร็จ)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 text-stone-600 border border-stone-300 rounded-lg text-[11px] font-bold">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            <span>รอเข้าร่วม</span>
                          </span>
                        )}
                      </td>

                      {/* 8. Action Buttons */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenDetails(activity)}
                            className="px-2.5 py-1 bg-white hover:bg-stone-100 text-stone-800 border border-stone-300 rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                            title="ดูรายละเอียดและบันทึกผล"
                          >
                            <Eye className="w-3.5 h-3.5 text-stone-500" />
                            <span>ดูข้อมูล</span>
                          </button>

                          {log && onOpenKpaModal && (
                            <button
                              onClick={() => onOpenKpaModal(log.id)}
                              className="px-2.5 py-1 bg-[#FACC15] hover:bg-amber-400 text-stone-900 rounded-lg text-xs font-black border border-black shadow-xs transition-all flex items-center gap-1"
                              title="ส่ง/แก้ไข บันทึก K-P-A"
                            >
                              <Award className="w-3.5 h-3.5" />
                              <span>บันทึก KPA</span>
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="p-3.5 bg-[#FAF7F0] border-t-2 border-[#18181B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-bold text-stone-600">
            <div className="flex items-center gap-2">
              <span>
                แสดง <strong>{totalItems === 0 ? 0 : startIndex + 1}</strong> ถึง <strong>{Math.min(startIndex + effectivePageSize, totalItems)}</strong> จาก <strong>{totalItems}</strong> กิจกรรม
              </span>
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

      ) : (

        /* ========================================================================= */
        /* CARD VIEW (OPTIONAL ALTERNATIVE)                                          */
        /* ========================================================================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {paginatedActivities.map(activity => {
            const status = getActivityStatus(activity);
            const isHighlight = status.isRequired && !status.isAttended;

            return (
              <div 
                key={activity.id} 
                onClick={() => handleOpenDetails(activity)}
                className={`bg-white border-2 border-[#18181B] rounded-2xl p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] transition-all flex flex-col justify-between cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                  isHighlight ? 'bg-amber-50/40 border-[#EA580C]' : ''
                }`}
              >
                <div>
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 bg-[#18181B] text-[#FACC15] border border-black rounded-lg text-[10px] font-black uppercase">
                        {activity.id}
                      </span>
                      {activity.yearLevel && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold">
                          {activity.yearLevel}
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-stone-100 text-stone-600 border border-stone-300 rounded-lg text-[10px] font-bold">
                        {activity.category}
                      </span>
                    </div>

                    {isHighlight ? (
                      <span className="px-2 py-1 bg-[#EA580C] text-white rounded-lg text-[10px] font-black shrink-0">
                        ต้องเข้าร่วม
                      </span>
                    ) : status.isAttended ? (
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-[10px] font-black shrink-0 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> เข้าร่วมแล้ว
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-stone-100 text-stone-600 border border-stone-300 rounded-lg text-[10px] font-bold shrink-0">
                        รอเข้าร่วม
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-sm sm:text-base font-black text-stone-900 leading-snug mb-2 line-clamp-2">
                    {activity.name}
                  </h3>
                </div>
                
                <div className="space-y-1.5 mt-auto pt-3 border-t-2 border-stone-100 text-xs text-stone-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                    <span className="font-bold">
                      {activity.newSchedule || (activity.date ? dayjs(activity.date).format('DD MMM YYYY') : '-')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                    <span className="font-bold">
                      {activity.hours || 1} ชม. กิจกรรม
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                    <span className="font-medium line-clamp-1">{activity.location || 'คณะครุศาสตร์'}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Activity Details & Edit Note Modal */}
      {selectedActivityData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-[#FAF7F0] w-full max-w-2xl max-h-[90vh] overflow-y-auto border-4 border-[#18181B] rounded-2xl shadow-[8px_8px_0px_0px_rgba(24,24,27,1)] flex flex-col relative animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 sm:p-5 border-b-2 border-[#18181B] bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3 pr-4">
                <div className="w-10 h-10 bg-[#FACC15] flex items-center justify-center rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 text-black font-black">
                  ❖
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-stone-900 leading-tight">
                    {selectedActivityData.activity.name}
                  </h2>
                  <p className="text-xs font-bold text-stone-500 mt-0.5">
                    รหัส: {selectedActivityData.activity.id} • {selectedActivityData.activity.category}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedActivityData(null)}
                className="p-1.5 bg-stone-100 hover:bg-stone-200 border-2 border-[#18181B] rounded-xl transition-all shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
              >
                <X className="w-5 h-5 text-stone-900" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-5">
              
              {/* Activity Info Box */}
              <div className="bg-white border-2 border-[#18181B] rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-2.5 text-xs sm:text-sm">
                <div className="flex items-center gap-2 text-stone-700">
                  <Calendar className="w-4 h-4 text-[#EA580C] shrink-0" />
                  <span className="font-bold">กำหนดการ:</span> 
                  <span>{selectedActivityData.activity.newSchedule || selectedActivityData.activity.date || '-'}</span>
                </div>
                <div className="flex items-center gap-2 text-stone-700">
                  <Clock className="w-4 h-4 text-[#F59E0B] shrink-0" />
                  <span className="font-bold">ระยะเวลา / หน่วยสะสม:</span> 
                  <span>{selectedActivityData.activity.duration || `${selectedActivityData.activity.hours || 1} ชั่วโมงกิจกรรม`}</span>
                </div>
                <div className="flex items-center gap-2 text-stone-700">
                  <MapPin className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="font-bold">สถานที่จัด:</span> 
                  <span>{selectedActivityData.activity.location || 'คณะครุศาสตร์ มหาวิทยาลัยนครพนม'}</span>
                </div>
                {selectedActivityData.activity.description && (
                  <div className="pt-2 border-t border-stone-100 text-stone-600 text-xs">
                    <span className="font-bold block mb-0.5">รายละเอียด:</span>
                    <p>{selectedActivityData.activity.description}</p>
                  </div>
                )}
              </div>

              {/* Attendance & KPA Reflection Section */}
              {selectedActivityData.log ? (
                <div className="space-y-3">
                  <div className="p-3 bg-emerald-50 border-2 border-emerald-400 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <div>
                        <div className="font-black text-emerald-950 text-xs sm:text-sm">
                          เช็คอินเข้าร่วมกิจกรรมแล้ว
                        </div>
                        <div className="text-[11px] text-emerald-800">
                          เมื่อ {dayjs(selectedActivityData.log.timestamp).format('DD/MM/YYYY เวลา HH:mm น.')}
                        </div>
                      </div>
                    </div>

                    {onOpenKpaModal && (
                      <button
                        onClick={() => {
                          const logId = selectedActivityData.log?.id;
                          setSelectedActivityData(null);
                          if (logId) onOpenKpaModal(logId);
                        }}
                        className="px-3 py-1.5 bg-[#FACC15] hover:bg-amber-400 text-black text-xs font-black rounded-lg border border-black shadow-xs flex items-center gap-1"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>เขียน/แก้ไข KPA</span>
                      </button>
                    )}
                  </div>

                  {/* Student Note */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-stone-900 flex items-center gap-1.5">
                        <FileText className="w-4 h-4" />
                        บันทึกผลการเข้าร่วมกิจกรรมส่วนบุคคล
                      </label>
                      {!isEditingNote ? (
                        <button 
                          onClick={() => setIsEditingNote(true)}
                          className="text-xs font-bold text-[#EA580C] hover:underline flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" /> แก้ไขบันทึก
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setEditNote(selectedActivityData.log?.studentNote || '');
                              setIsEditingNote(false);
                            }}
                            className="text-xs font-bold text-stone-500 hover:underline"
                          >
                            ยกเลิก
                          </button>
                          <button 
                            onClick={handleSaveNote}
                            className="text-xs font-bold bg-[#FACC15] text-black px-3 py-1 rounded-lg border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-amber-400 transition-all"
                          >
                            บันทึก
                          </button>
                        </div>
                      )}
                    </div>
                    
                    {isEditingNote ? (
                      <div className="space-y-2">
                        <textarea
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          placeholder="พิมพ์บันทึกสิ่งที่ได้รับหรือความประทับใจจากกิจกรรมนี้..."
                          className="w-full min-h-[120px] p-3 text-xs sm:text-sm font-medium border-2 border-black rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-[#FACC15]"
                        />
                      </div>
                    ) : (
                      <div className="w-full min-h-[80px] p-3 text-xs bg-white border-2 border-stone-200 rounded-xl whitespace-pre-wrap text-stone-700">
                        {selectedActivityData.log.studentNote ? (
                          selectedActivityData.log.studentNote
                        ) : (
                          <span className="text-stone-400 italic">ยังไม่มีบันทึกข้อมูล (สามารถกดแก้ไขเพื่อเพิ่มข้อมูลได้)</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Audit Trail */}
                  <div className="space-y-2 pt-2 border-t-2 border-stone-200">
                    <h3 className="text-xs font-black text-stone-800 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-stone-500" />
                      ประวัติการเข้าถึงข้อมูล (Audit Trail)
                    </h3>
                    <div className="bg-white border border-stone-300 rounded-xl overflow-hidden max-h-40 overflow-y-auto text-[11px]">
                      <table className="w-full text-left">
                        <thead className="bg-stone-100 text-stone-600 sticky top-0">
                          <tr>
                            <th className="px-3 py-1.5 font-bold">วัน-เวลา</th>
                            <th className="px-3 py-1.5 font-bold">การกระทำ</th>
                            <th className="px-3 py-1.5 font-bold">รายละเอียด</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100">
                          {(selectedActivityData.log.auditTrail || []).slice().reverse().map((audit, i) => (
                            <tr key={i} className="hover:bg-stone-50">
                              <td className="px-3 py-1.5 font-mono text-stone-500 whitespace-nowrap">
                                {dayjs(audit.timestamp).format('DD/MM/YYYY HH:mm')}
                              </td>
                              <td className="px-3 py-1.5">
                                <span className="px-1.5 py-0.2 rounded font-bold uppercase text-[9px] bg-amber-100 text-amber-900">
                                  {audit.action}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 text-stone-700">{audit.details}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl text-amber-950 text-xs space-y-1">
                  <div className="font-black flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-700" />
                    <span>ยังไม่มีประวัติการเช็คอินในกิจกรรมนี้</span>
                  </div>
                  <p className="text-stone-600 leading-relaxed">
                    เมื่อถึงกำหนดการจัดกิจกรรม ให้แสดง <strong>QR Code บัตรนักศึกษา</strong> ของท่านที่จุดสแกนเนอร์หน้างาน เพื่อบันทึกการเข้าร่วมและเปิดสิทธิ์ส่งบันทึกการเรียนรู้ (K-P-A)
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
