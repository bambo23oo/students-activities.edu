import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import { Activity, CheckInLog, Reflection, Student } from '../types';
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  CheckSquare, 
  Star, 
  Layers, 
  MessageSquare, 
  Settings, 
  Search, 
  Bell, 
  MapPin, 
  Check, 
  ChevronDown, 
  LogOut, 
  CheckCircle2, 
  Menu, 
  X,
  CreditCard,
  Sparkles,
  Smartphone,
  Lock,
  Key
} from 'lucide-react';
import { MobileDeviceTesterModal } from './MobileDeviceTesterModal';

import { StudentOverviewTab } from './student/StudentOverviewTab';
import { StudentActivitiesTab } from './student/StudentActivitiesTab';
import { StudentProfileTab } from './student/StudentProfileTab';
import { StudentMessagesTab } from './student/StudentMessagesTab';
import { StudentSettingsTab } from './student/StudentSettingsTab';
import { StudentPassModal } from './student/StudentPassModal';
import { StudentReflectionModal } from './student/StudentReflectionModal';
import { ActivityTranscriptModal } from './transcript/ActivityTranscriptModal';
import { EditStudentMajorModal } from './student/EditStudentMajorModal';

export type StudentNavTab = 'overview' | 'activities' | 'messages' | 'settings';

interface StudentPortalProps {
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
  onRoleChange?: (role: 'student' | 'staff' | 'approver') => void;
  onLogout?: () => void;
  isUserAdmin?: boolean;
}

export const StudentPortal: React.FC<StudentPortalProps> = ({ 
  studentId = '66309010001', 
  studentName = 'นายกิตติศักดิ์ ศรีวรสาร', 
  studentEmail = '66309010001@npu.ac.th',
  onRoleChange,
  onLogout,
  isUserAdmin = true
}) => {
  const [activeStudentId, setActiveStudentId] = useState<string>(studentId);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [logs, setLogs] = useState<(CheckInLog & { activity?: Activity; reflection?: Reflection })[]>([]);
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [studentProfile, setStudentProfile] = useState<Student | null>(null);
  const [navTab, setNavTab] = useState<StudentNavTab>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Popovers
  const [showPassModal, setShowPassModal] = useState(false);
  const [showEditMajorModal, setShowEditMajorModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showStudentProfileModal, setShowStudentProfileModal] = useState(false);
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [currentLocation, setCurrentLocation] = useState('คณะครุศาสตร์ ม.นครพนม');
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState(false);
  const [selectedLogIdForKpa, setSelectedLogIdForKpa] = useState<string | null>(null);
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [showMobileTester, setShowMobileTester] = useState(false);

  // Sync activeStudentId when prop changes
  useEffect(() => {
    if (studentId) {
      setActiveStudentId(studentId);
    }
  }, [studentId]);

  // Real-time synchronization listeners
  useEffect(() => {
    loadStudentData(activeStudentId);

    const handleDbUpdated = (e: any) => {
      const updatedStudentId = e?.detail?.studentId;
      if (updatedStudentId && updatedStudentId === activeStudentId) {
        setToastMessage(`บันทึกกิจกรรมสำเร็จ! ข้อมูลอัปเดตแล้ว`);
        setTimeout(() => setToastMessage(null), 3000);
      }
      loadStudentData(activeStudentId);
    };

    const handleWindowFocus = () => {
      loadStudentData(activeStudentId);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadStudentData(activeStudentId);
      }
    };

    window.addEventListener('db_updated', handleDbUpdated);
    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('npu_db_sync');
      bc.onmessage = () => {
        loadStudentData(activeStudentId);
      };
    } catch (e) {
      console.log('BroadcastChannel note:', e);
    }

    return () => {
      window.removeEventListener('db_updated', handleDbUpdated);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (bc) bc.close();
    };
  }, [activeStudentId, studentEmail]);

  // Global Escape key handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedLogIdForKpa(null);
        setShowPassModal(false);
        setShowUserDropdown(false);
        setShowLocationDropdown(false);
        setShowMobileMoreMenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadStudentData = async (targetId?: string) => {
    const idToQuery = targetId || activeStudentId || studentId;

    // Load available students list for testing & switching
    try {
      const studentList = await db.students.toArray();
      setAllStudents(studentList);
    } catch (e) {
      console.warn('Failed to load students list:', e);
    }

    // 1. Fetch Student Profile with flexible matching
    let profile = idToQuery ? await db.students.get(idToQuery) : null;
    if (!profile && idToQuery) {
      profile = await db.students.where('id').equalsIgnoreCase(idToQuery).first();
    }
    if (!profile && studentEmail) {
      profile = await db.students.where('email').equalsIgnoreCase(studentEmail).first();
    }
    if (profile) {
      setStudentProfile(profile);
    } else {
      setStudentProfile({
        id: idToQuery,
        name: studentName,
        email: studentEmail,
        faculty: 'คณะครุศาสตร์',
        major: 'สาขาวิชาคอมพิวเตอร์ศึกษา',
        university: 'มหาวิทยาลัยนครพนม',
        year: 4
      });
    }

    const effectiveId = profile?.id || idToQuery;

    // 2. Fetch All Activities
    const rawActivities = await db.activities.toArray();

    // 3. Fetch Student Check-in Logs (High-speed indexed lookup by studentId)
    let studentLogs = await db.checkInLogs.where('studentId').equals(effectiveId).toArray();
    if (studentLogs.length === 0) {
      // Fallback with flexible matching for dash/space variations
      const allLogs = await db.checkInLogs.toArray();
      const cleanEffective = effectiveId.trim().toUpperCase();
      const cleanDigits = cleanEffective.replace(/[^A-Z0-9]/g, '');

      studentLogs = allLogs.filter(log => {
        if (!log.studentId) return false;
        const cleanLogId = log.studentId.trim().toUpperCase();
        const cleanLogDigits = cleanLogId.replace(/[^A-Z0-9]/g, '');
        return cleanLogId === cleanEffective || (cleanDigits.length >= 6 && cleanLogDigits === cleanDigits);
      });
    }

    // 4. Fetch Reflections for this student (Indexed by studentId)
    let studentReflections = await db.reflections.where('studentId').equals(effectiveId).toArray();
    if (studentReflections.length === 0) {
      studentReflections = await db.reflections.toArray();
    }
    const reflectionMap = new Map<string, Reflection>();
    studentReflections.forEach(ref => {
      if (ref.logId) reflectionMap.set(ref.logId, ref);
    });

    // 5. Merge with Activity data & Reflection data
    const enriched = await Promise.all(studentLogs.map(async (log) => {
      let activity = rawActivities.find(a => a.id === log.activityId);
      if (!activity) {
        activity = await db.activities.get(log.activityId);
      }
      const reflection = reflectionMap.get(log.id) || (await db.reflections.where('logId').equals(log.id).first());
      return { ...log, activity, reflection };
    }));
    
    // Sort: newest check-in first
    enriched.sort((a, b) => {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });
    
    setLogs(enriched);

    // 6. Filter visible activities for student dashboard:
    // "ถ้ากิจกรรมไหนที่ปิดอยู่ไม่ต้องแสดงผลบนแดชบอร์ดของนักศึกษา นอกจากเป็นกิจกรรมที่นักศึกษาเข้าร่วมแล้ว"
    const attendedActivityIdSet = new Set(studentLogs.map(l => l.activityId));
    const visibleActivitiesForStudent = rawActivities.filter(act => {
      const isAttended = attendedActivityIdSet.has(act.id);
      if (isAttended) return true; // Always display if the student already attended/checked in
      return act.status === 'active'; // Only display un-attended activities if they are OPEN (active)
    });

    setAllActivities(visibleActivitiesForStudent);
  };


  const handleUpdateProfileImage = async (newImageUrl: string) => {
    try {
      const effectiveId = studentProfile?.id || studentId;
      const updatedProfile: Student = {
        ...(studentProfile || {
          id: effectiveId,
          name: studentName,
          email: studentEmail,
          faculty: 'คณะครุศาสตร์',
          major: 'สาขาวิชาคอมพิวเตอร์ศึกษา',
          university: 'มหาวิทยาลัยนครพนม',
          year: 4
        }),
        profileImage: newImageUrl
      };
      await db.students.put(updatedProfile);
      setStudentProfile(updatedProfile);
      setToastMessage(newImageUrl ? 'อัปเดตรูปถ่ายประจำตัวนักศึกษาเรียบร้อยแล้ว' : 'ลบรูปถ่ายประจำตัวเรียบร้อยแล้ว');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Failed to update student profile image:', err);
    }
  };

  const handleUpdateStudentMajor = async (updatedFields: { major: string; faculty: string; year: number }) => {
    try {
      const effectiveId = studentProfile?.id || activeStudentId || studentId;
      const updatedProfile: Student = {
        ...(studentProfile || {
          id: effectiveId,
          name: studentName,
          email: studentEmail,
          university: 'มหาวิทยาลัยนครพนม'
        }),
        major: updatedFields.major,
        faculty: updatedFields.faculty,
        year: updatedFields.year
      };
      await db.students.put(updatedProfile);
      setStudentProfile(updatedProfile);

      // Update student switcher list
      setAllStudents(prev => prev.map(s => s.id === updatedProfile.id ? updatedProfile : s));

      // Broadcast update event so all open views & modals sync
      window.dispatchEvent(new CustomEvent('db_updated', {
        detail: {
          studentId: updatedProfile.id,
          action: 'major_updated',
          major: updatedProfile.major
        }
      }));

      try {
        const bc = new BroadcastChannel('npu_db_sync');
        bc.postMessage({ type: 'profile_updated', studentId: updatedProfile.id });
        bc.close();
      } catch (e) {}

      setToastMessage(`บันทึกข้อมูลสาขาวิชา (${updatedProfile.major}) เรียบร้อยแล้ว`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Failed to update student major:', err);
      throw err;
    }
  };

  const effectiveStudentName = studentProfile?.name || studentName;
  const currentStudentId = studentProfile?.id || studentId;

  const getTabTitle = (tab: StudentNavTab) => {
    switch (tab) {
      case 'overview': return 'STUDENT OVERVIEW';
      case 'activities': return 'MY ACTIVITIES';
      case 'messages': return 'NOTIFICATIONS & MESSAGES';
      case 'settings': return 'SYSTEM SETTINGS';
      default: return 'STUDENT OVERVIEW';
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#F4EFE6] text-[#121212] font-sans antialiased overflow-hidden select-none">
      
      {/* ========================================================================= */}
      {/* 1. LEFT NAVIGATION RAIL (Desktop / Tablet >= md)                           */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex w-20 bg-[#18181B] border-r-2 border-[#121212] flex-col items-center py-4 justify-between shrink-0 z-30">
        
        <div className="flex flex-col items-center gap-5 w-full">
          
          {/* Logo Icon (Playful Geometric Interlocking Shape) */}
          <div 
            onClick={() => setNavTab('overview')}
            className="w-12 h-12 flex items-center justify-center relative cursor-pointer" 
            title="คณะครุศาสตร์ ม.นครพนม"
          >
            <svg viewBox="0 0 48 48" className="w-9 h-9" fill="none">
              <circle cx="16" cy="14" r="5" fill="#EF4444" />
              <path d="M11 23C11 20 13 18 16 18H20V32H15C12.8 32 11 30.2 11 28V23Z" fill="#EF4444" />
              <circle cx="32" cy="14" r="5" fill="#8B5CF6" />
              <path d="M37 23C37 20 35 18 32 18H28V32H33C35.2 32 37 30.2 37 28V23Z" fill="#8B5CF6" />
              <rect x="18" y="24" width="12" height="6" fill="#F59E0B" rx="2" />
            </svg>
          </div>

          {/* Navigation Items List */}
          <nav className="flex flex-col items-center gap-2.5 w-full px-2">
            
            {/* OVERVIEW */}
            <button
              onClick={() => setNavTab('overview')}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all group w-full ${
                navTab === 'overview' ? 'text-[#FACC15]' : 'text-stone-400 hover:text-white'
              }`}
              title="ภาพรวมข้อมูลนักศึกษา"
            >
              <div className={`p-1.5 rounded-md border-2 transition-all ${
                navTab === 'overview'
                  ? 'border-[#FACC15] bg-[#FACC15]/10 shadow-[2px_2px_0px_0px_rgba(250,204,21,0.5)]'
                  : 'border-transparent group-hover:border-stone-600'
              }`}>
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider mt-1">
                OVERVIEW
              </span>
            </button>

            {/* ACTIVITIES */}
            <button
              onClick={() => setNavTab('activities')}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all group w-full ${
                navTab === 'activities' ? 'text-[#FACC15]' : 'text-stone-400 hover:text-white'
              }`}
              title="ตารางกิจกรรม"
            >
              <div className={`p-1.5 rounded-md border-2 transition-all ${
                navTab === 'activities'
                  ? 'border-[#FACC15] bg-[#FACC15]/10 shadow-[2px_2px_0px_0px_rgba(250,204,21,0.5)]'
                  : 'border-transparent group-hover:border-stone-600'
              }`}>
                <CalendarDays className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider mt-1">
                ACTIVITY
              </span>
            </button>

            {/* MESSAGES */}
            <button
              onClick={() => setNavTab('messages')}
              className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all group w-full ${
                navTab === 'messages' ? 'text-[#FACC15]' : 'text-stone-400 hover:text-white'
              }`}
              title="ประกาศและข้อความ"
            >
              <div className={`p-1.5 rounded-md border-2 transition-all ${
                navTab === 'messages'
                  ? 'border-[#FACC15] bg-[#FACC15]/10 shadow-[2px_2px_0px_0px_rgba(250,204,21,0.5)]'
                  : 'border-transparent group-hover:border-stone-600'
              }`}>
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider mt-1">
                MESSAGES
              </span>
            </button>

          </nav>

        </div>

        {/* SETTINGS at Bottom */}
        <div className="w-full px-2">
          <button
            onClick={() => setNavTab('settings')}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all group w-full ${
              navTab === 'settings' ? 'text-[#FACC15]' : 'text-stone-400 hover:text-white'
            }`}
            title="การตั้งค่า"
          >
            <div className={`p-1.5 rounded-md border-2 transition-all ${
              navTab === 'settings'
                ? 'border-[#FACC15] bg-[#FACC15]/10 shadow-[2px_2px_0px_0px_rgba(250,204,21,0.5)]'
                : 'border-transparent group-hover:border-stone-600'
            }`}>
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider mt-1">
              SETTINGS
            </span>
          </button>
        </div>

      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN WORKSPACE CANVAS                                                  */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-24 md:pb-0 bg-[#F4EFE6]">
        
        {/* ======================================================================= */}
        {/* TOP HEADER BAR                                                          */}
        {/* ======================================================================= */}
        <header className="bg-[#F4EFE6] border-b-2 border-[#18181B] px-3 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-20">
          
          {/* Left Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <h1 className="text-base sm:text-xl font-black uppercase tracking-wider text-[#18181B] truncate">
              {getTabTitle(navTab)}
            </h1>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* Mobile Device UI/UX Tester Button */}
            <button
              onClick={() => setShowMobileTester(true)}
              className="flex items-center gap-1.5 bg-[#EA580C] hover:bg-[#C2410C] text-white border-2 border-[#18181B] px-2.5 py-1.5 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all"
              title="ทดสอบ UI/UX สำหรับโทรศัพท์มือถือทั้ง Android และ iOS"
            >
              <Smartphone className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">ทดสอบมือถือ</span>
            </button>
            
            {/* Student Switcher Dropdown */}
            {allStudents.length > 0 && (
              <div className="flex items-center gap-1.5 bg-white border-2 border-[#18181B] px-2 py-1 text-xs font-bold text-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Users className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                <span className="hidden md:inline text-stone-500 font-bold">นักศึกษา:</span>
                <select
                  value={activeStudentId}
                  onChange={(e) => {
                    const newId = e.target.value;
                    setActiveStudentId(newId);
                    localStorage.setItem('app_student_id', newId);
                    loadStudentData(newId);
                  }}
                  className="bg-transparent font-black text-stone-900 outline-none cursor-pointer max-w-[130px] sm:max-w-[180px] truncate"
                  title="สลับดูข้อมูลนักศึกษา"
                >
                  {allStudents.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Search Box (Desktop) */}
            <div className="relative hidden lg:block w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-700" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหากิจกรรม, สมรรถนะ..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border-2 border-[#18181B] text-xs font-semibold text-stone-900 outline-none placeholder:text-stone-400 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              />
            </div>

            {/* Location Selector */}
            <div className="relative">
              <button
                onClick={() => setShowLocationDropdown(!showLocationDropdown)}
                className="hidden sm:flex items-center gap-1.5 bg-white border-2 border-[#18181B] px-2.5 py-1.5 text-xs font-bold text-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-stone-50 transition-all"
              >
                <MapPin className="w-3.5 h-3.5 text-stone-700" />
                <span className="truncate max-w-[130px]">{currentLocation}</span>
                <ChevronDown className="w-3.5 h-3.5 text-stone-500" />
              </button>

              {showLocationDropdown && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] py-1.5 z-40">
                  <button
                    onClick={() => { setCurrentLocation('คณะครุศาสตร์ ม.นครพนม'); setShowLocationDropdown(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-stone-900 hover:bg-amber-100 flex items-center justify-between"
                  >
                    <span>คณะครุศาสตร์ ม.นครพนม</span>
                    {currentLocation === 'คณะครุศาสตร์ ม.นครพนม' && <Check className="w-3.5 h-3.5 text-black" />}
                  </button>
                  <button
                    onClick={() => { setCurrentLocation('อาคารเรียนรวมสารสนเทศ'); setShowLocationDropdown(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-stone-900 hover:bg-amber-100 flex items-center justify-between"
                  >
                    <span>อาคารเรียนรวมสารสนเทศ</span>
                    {currentLocation === 'อาคารเรียนรวมสารสนเทศ' && <Check className="w-3.5 h-3.5 text-black" />}
                  </button>
                  <button
                    onClick={() => { setCurrentLocation('หอประชุมใหญ่ ม.นครพนม'); setShowLocationDropdown(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-bold text-stone-900 hover:bg-amber-100 flex items-center justify-between"
                  >
                    <span>หอประชุมใหญ่ ม.นครพนม</span>
                    {currentLocation === 'หอประชุมใหญ่ ม.นครพนม' && <Check className="w-3.5 h-3.5 text-black" />}
                  </button>
                </div>
              )}
            </div>

            {/* Activity Transcript Button */}
            <button
              onClick={() => setShowTranscriptModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FACC15] hover:bg-amber-400 text-[#18181B] border-2 border-[#18181B] text-xs font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all"
              title="ตรวจสอบกิจกรรมและออกใบรายงานผลกิจกรรมสะสม"
            >
              <Sparkles className="w-3.5 h-3.5 text-black" />
              <span className="hidden sm:inline">ใบทรานสคริปต์</span>
              <span className="sm:hidden">Transcript</span>
            </button>

            {/* Notification Bell */}
            <button 
              onClick={() => setNavTab('messages')}
              className="relative p-2 bg-white border-2 border-[#18181B] hover:bg-stone-50 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              title="ข้อความแจ้งเตือน"
            >
              <Bell className="w-4 h-4 text-[#18181B]" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full border border-black" />
            </button>

            {/* User Profile Avatar with dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-1.5 p-0.5 rounded-full border-2 border-[#18181B] bg-white focus:outline-none hover:ring-2 hover:ring-black transition-all"
                title="โปรไฟล์นักศึกษา"
              >
                <div className="w-8 h-8 rounded-full bg-[#EA580C] text-white font-black text-xs flex items-center justify-center overflow-hidden border border-black shrink-0">
                  {studentProfile?.profileImage ? (
                    <img src={studentProfile.profileImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    effectiveStudentName.charAt(0)
                  )}
                </div>
              </button>

              {/* Profile Dropdown */}
              {showUserDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] py-2 z-50">
                  <div className="px-4 py-2 border-b-2 border-stone-100 flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-[#EA580C] text-white font-black text-sm flex items-center justify-center overflow-hidden border border-black shrink-0">
                      {studentProfile?.profileImage ? (
                        <img src={studentProfile.profileImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        effectiveStudentName.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-stone-900 truncate">{effectiveStudentName}</p>
                      <p className="text-[11px] text-stone-500 font-mono font-bold">@{currentStudentId}</p>
                      <p className="text-[10px] text-stone-400 mt-0.5">{studentProfile?.major || 'สาขาวิชาคอมพิวเตอร์ศึกษา'} • ปี {studentProfile?.year || 4}</p>
                    </div>
                  </div>

                  <div className="p-1 border-b-2 border-stone-100 space-y-0.5">
                    <button
                      onClick={() => { setShowStudentProfileModal(true); setShowUserDropdown(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs font-bold text-stone-800 hover:bg-stone-100 flex items-center gap-2"
                    >
                      <Users className="w-3.5 h-3.5 text-stone-600" />
                      <span>ข้อมูลนักศึกษา & โปรไฟล์</span>
                    </button>
                    <button
                      onClick={() => { setShowTranscriptModal(true); setShowUserDropdown(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs font-bold text-stone-800 hover:bg-amber-100 flex items-center gap-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>ใบรายงานผลกิจกรรม (Transcript)</span>
                    </button>
                    <button
                      onClick={() => { setNavTab('settings'); setShowUserDropdown(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs font-bold text-stone-800 hover:bg-stone-100 flex items-center gap-2"
                    >
                      <Settings className="w-3.5 h-3.5 text-stone-600" />
                      <span>การตั้งค่า</span>
                    </button>
                  </div>

                  {onRoleChange && isUserAdmin && (
                    <div className="p-2 border-b-2 border-stone-100 space-y-1">
                      <p className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-stone-400">
                        สลับโหมดการทำงาน
                      </p>
                      <button
                        onClick={() => { onRoleChange('staff'); setShowUserDropdown(false); }}
                        className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-stone-800 hover:bg-amber-100 flex items-center gap-2"
                      >
                        <span>📷</span>
                        <span>โหมดเจ้าหน้าที่สแกนเนอร์</span>
                      </button>
                      <button
                        onClick={() => { onRoleChange('approver'); setShowUserDropdown(false); }}
                        className="w-full text-left px-2.5 py-1.5 text-xs font-bold text-stone-800 hover:bg-amber-100 flex items-center gap-2"
                      >
                        <span>🛡️</span>
                        <span>โหมดผู้บริหารประเมิน</span>
                      </button>
                    </div>
                  )}

                  {onLogout && (
                    <div className="p-1">
                      <button
                        onClick={() => { onLogout(); setShowUserDropdown(false); }}
                        className="w-full text-left px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>ออกจากระบบ</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Yellow High-Contrast CTA Button */}
            <button
              onClick={() => setShowPassModal(true)}
              className="bg-[#FACC15] hover:bg-[#EAB308] text-black font-black uppercase text-xs px-3 sm:px-4 py-2 border-2 border-black tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 transition-all shrink-0"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">+ บัตรนักศึกษา / QR PASS</span>
              <span className="xs:hidden">บัตร QR</span>
            </button>

          </div>
        </header>

        {/* Security Password Change Banner for Default Password Users */}
        {studentProfile && (!studentProfile.isPasswordChanged || studentProfile.password === studentProfile.id || !studentProfile.password) && (
          <div className="bg-amber-100/90 border-b-2 border-amber-300 px-3 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
            <div className="flex items-center gap-2 text-xs text-amber-950 font-bold">
              <span className="p-1 bg-amber-200 text-amber-900 rounded-md shrink-0">
                <Lock className="w-3.5 h-3.5" />
              </span>
              <span>
                คุณกำลังใช้งานรหัสผ่านเริ่มต้น (รหัสนักศึกษา: {currentStudentId}) เพื่อความปลอดภัยกรุณาเปลี่ยนเป็นรหัสผ่านส่วนตัว
              </span>
            </div>
            <button
              onClick={() => setNavTab('settings')}
              className="px-3 py-1 bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-lg text-xs font-black shrink-0 transition-colors shadow-xs active:scale-95 flex items-center justify-center gap-1 self-start sm:self-auto"
            >
              <Key className="w-3.5 h-3.5" />
              <span>เปลี่ยนรหัสผ่านทันที</span>
            </button>
          </div>
        )}

        {/* ======================================================================= */}
        {/* MAIN BODY CONTENT (Dynamically Driven by navTab)                        */}
        {/* ======================================================================= */}
        <main className="p-3 sm:p-6 pb-24 md:pb-6 max-w-[1400px] w-full mx-auto">
          
          {navTab === 'overview' && (
            <StudentOverviewTab
              logs={logs}
              allActivities={allActivities}
              student={studentProfile}
              studentId={currentStudentId}
              studentName={effectiveStudentName}
              onOpenSubmitModal={(id) => setSelectedLogIdForKpa(id)}
              onOpenPassModal={() => setShowPassModal(true)}
              onNavigateTab={(tab) => setNavTab(tab)}
              onOpenEditMajor={() => setShowEditMajorModal(true)}
            />
          )}

          {navTab === 'activities' && (
            <StudentActivitiesTab
              allActivities={allActivities}
              logs={logs}
              studentId={currentStudentId}
              studentCohort={currentStudentId ? currentStudentId.slice(0, 2) : undefined}
              studentName={effectiveStudentName}
              onOpenKpaModal={(logId) => setSelectedLogIdForKpa(logId)}
            />
          )}

          {navTab === 'settings' && (
            <StudentSettingsTab
              student={studentProfile}
              studentId={currentStudentId}
              studentName={effectiveStudentName}
              studentEmail={studentProfile?.email || studentEmail}
              onRoleChange={onRoleChange}
              onLogout={onLogout}
              isUserAdmin={isUserAdmin}
              onUpdateProfileImage={handleUpdateProfileImage}
              onOpenEditMajor={() => setShowEditMajorModal(true)}
            />
          )}

        </main>

      </div>

      {/* ========================================================================= */}
      {/* 4. MODALS: DIGITAL PASS & K-P-A REFLECTION SUBMISSION                    */}
      {/* ========================================================================= */}
      <StudentPassModal
        isOpen={showPassModal}
        onClose={() => setShowPassModal(false)}
        student={studentProfile}
        studentId={currentStudentId}
        studentName={effectiveStudentName}
        onUpdateProfileImage={handleUpdateProfileImage}
        onOpenEditMajor={() => {
          setShowPassModal(false);
          setShowEditMajorModal(true);
        }}
      />

      {/* Step 5: K-P-A Reflection Submission Modal */}
      <StudentReflectionModal
        isOpen={!!selectedLogIdForKpa}
        onClose={() => setSelectedLogIdForKpa(null)}
        logId={selectedLogIdForKpa}
        studentId={activeStudentId}
        studentName={effectiveStudentName}
        onSuccess={() => loadStudentData(activeStudentId)}
      />

      {/* Step 8: Official Activity Transcript Modal */}
      <ActivityTranscriptModal
        isOpen={showTranscriptModal}
        onClose={() => setShowTranscriptModal(false)}
        studentId={activeStudentId}
      />


      {/* Profile Modal */}
      {showStudentProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#F4EFE6] w-full max-w-4xl max-h-[90vh] overflow-y-auto border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b-2 border-black bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#EA580C] flex items-center justify-center rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 uppercase tracking-wider">Student Profile</h2>
                  <p className="text-xs font-bold text-stone-500">ข้อมูลนักศึกษาและบัตรดิจิทัล</p>
                </div>
              </div>
              <button 
                onClick={() => setShowStudentProfileModal(false)}
                className="p-2 bg-stone-100 hover:bg-rose-100 border-2 border-transparent hover:border-black rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <X className="w-5 h-5 text-stone-900" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6">
              <StudentProfileTab
                student={studentProfile}
                studentId={currentStudentId}
                studentName={effectiveStudentName}
                studentEmail={studentProfile?.email || studentEmail}
                logs={logs}
                onUpdateProfileImage={handleUpdateProfileImage}
                onOpenEditMajor={() => {
                  setShowStudentProfileModal(false);
                  setShowEditMajorModal(true);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed top-16 right-4 sm:right-6 z-50 bg-[#18181B] text-white px-4 py-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}

      {/* Edit Student Major Modal */}
      <EditStudentMajorModal
        isOpen={showEditMajorModal}
        onClose={() => setShowEditMajorModal(false)}
        student={studentProfile}
        studentId={currentStudentId}
        studentName={effectiveStudentName}
        onSave={handleUpdateStudentMajor}
      />

      {/* ========================================================================= */}
      {/* MOBILE BOTTOM NAVIGATION BAR (iOS & Android Ergonomics)                    */}
      {/* ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-md border-t-2 border-[#18181B] z-40 safe-bottom shadow-[0_-4px_10px_rgba(0,0,0,0.06)]">
        <div className="grid grid-cols-4 items-center justify-around px-2 py-1">
          {/* 1. Overview Tab */}
          <button
            onClick={() => setNavTab('overview')}
            className={`flex flex-col items-center justify-center py-1.5 min-h-[44px] transition-all ${
              navTab === 'overview' ? 'text-[#EA580C] font-black' : 'text-stone-500 font-semibold'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 ${navTab === 'overview' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] mt-0.5">ภาพรวม</span>
          </button>

          {/* 2. Activities Tab */}
          <button
            onClick={() => setNavTab('activities')}
            className={`flex flex-col items-center justify-center py-1.5 min-h-[44px] transition-all ${
              navTab === 'activities' ? 'text-[#EA580C] font-black' : 'text-stone-500 font-semibold'
            }`}
          >
            <CalendarDays className={`w-5 h-5 ${navTab === 'activities' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] mt-0.5">กิจกรรม</span>
          </button>

          {/* 3. QR Pass / Barcode ID Tab (Highlighted Center Button) */}
          <button
            onClick={() => setShowPassModal(true)}
            className="flex flex-col items-center justify-center py-1.5 min-h-[44px] text-[#18181B] transition-all"
          >
            <div className="w-8 h-8 rounded-xl bg-[#FACC15] border-2 border-[#18181B] flex items-center justify-center shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:scale-95">
              <CreditCard className="w-4 h-4 text-black stroke-[2.5]" />
            </div>
            <span className="text-[10px] font-black mt-0.5">บัตร นศ.</span>
          </button>

          {/* 4. Settings Tab */}
          <button
            onClick={() => setNavTab('settings')}
            className={`flex flex-col items-center justify-center py-1.5 min-h-[44px] transition-all ${
              navTab === 'settings' ? 'text-[#EA580C] font-black' : 'text-stone-500 font-semibold'
            }`}
          >
            <Settings className={`w-5 h-5 ${navTab === 'settings' ? 'stroke-[2.5]' : ''}`} />
            <span className="text-[10px] mt-0.5">ตั้งค่า</span>
          </button>
        </div>
      </nav>

      {/* Mobile Device Tester Modal */}
      <MobileDeviceTesterModal
        isOpen={showMobileTester}
        onClose={() => setShowMobileTester(false)}
      />

    </div>
  );
};
