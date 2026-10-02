import { setupRealtimeSync } from './services/supabaseApi';
import React, { useState, useEffect } from 'react';
import { AuthState, UserRole, isAdminEmail, getAdminAccount } from './types';
import { initializeMockData, db } from './db/db';
import { 
  WifiOff, 
  LogOut, 
  ShieldCheck, 
  UserCheck, 
  GraduationCap, 
  Crown, 
  QrCode, 
  FileSpreadsheet, 
  Menu, 
  X,
  Database,
  CheckCircle2,
  FileText,
  User,
  ArrowRight,
  ArrowLeft,
  ChevronDown
} from 'lucide-react';
import { NPULogo } from './components/NPULogo';
import { SupabaseModal } from './components/SupabaseModal';
import { isSupabaseConfigured } from './lib/supabase';

// Main Role Components
import { LoginView } from './components/LoginView';
import { StaffPortal } from './components/StaffPortal';
import { StudentPortal } from './components/StudentPortal';
import { ExecutiveAdminDashboard } from './components/ExecutiveAdminDashboard';
import { ReportsView } from './components/ReportsView';

export default function App() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    accessToken: null,
    user: null
  });
  
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [activeView, setActiveView] = useState<'main' | 'reports'>('main');
  const [lang, setLang] = useState<'th' | 'en'>('th');
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg'>('base');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    try { setupRealtimeSync(); } catch(e) {}

    // Never erase check-ins or reflections as a side effect of opening the app.
    initializeMockData().catch(console.error);
    
    // Check local storage for session
    const savedRole = localStorage.getItem('app_role') as UserRole;
    if (savedRole) {
      const savedStudentId = localStorage.getItem('app_student_id');
      const savedStudentName = localStorage.getItem('app_student_name');
      const savedStudentEmail = localStorage.getItem('app_student_email');
      
      const adminAcc = savedStudentEmail ? getAdminAccount(savedStudentEmail) : undefined;
      const isAdmin = !!adminAcc || isAdminEmail(savedStudentEmail);

      let userName = savedStudentName;
      if (!userName) {
        if (adminAcc) {
          userName = adminAcc.name;
        } else if (savedRole === 'student') {
          userName = 'นายกิตติศักดิ์ ศรีวรสาร';
        } else if (savedRole === 'staff') {
          userName = 'เจ้าหน้าที่สแกนเนอร์ (Staff)';
        } else {
          userName = 'ผู้บริหาร / อาจารย์ประจำหลักสูตร';
        }
      }
      
      setAuthState({
        isAuthenticated: true,
        accessToken: 'mock_token',
        user: { 
          name: userName, 
          role: savedRole,
          studentId: savedStudentId || adminAcc?.studentId || undefined,
          email: savedStudentEmail || adminAcc?.email || 'tpc.edu@npu.ac.th',
          isAdmin
        }
      });
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleLogin = (role: UserRole, studentData?: { id: string; name: string; email: string }) => {
    localStorage.setItem('app_role', role);
    if (studentData) {
      localStorage.setItem('app_student_id', studentData.id);
      localStorage.setItem('app_student_name', studentData.name);
      localStorage.setItem('app_student_email', studentData.email);
    }
    
    const adminAcc = studentData?.email ? getAdminAccount(studentData.email) : undefined;
    const isAdmin = !!adminAcc || isAdminEmail(studentData?.email);

    let defaultName = studentData?.name;
    if (!defaultName) {
      if (adminAcc) {
        defaultName = adminAcc.name;
      } else if (role === 'staff') {
        defaultName = 'เจ้าหน้าที่สแกนเนอร์ (Staff)';
      } else if (role === 'approver') {
        defaultName = 'ผู้บริหาร / อาจารย์ประจำหลักสูตร';
      } else {
        defaultName = 'นายกิตติศักดิ์ ศรีวรสาร';
      }
    }
    
    setAuthState({
      isAuthenticated: true,
      accessToken: 'mock_token',
      user: { 
        name: defaultName,
        email: studentData?.email || adminAcc?.email || 'tpc.edu@npu.ac.th',
        studentId: studentData?.id || adminAcc?.studentId,
        role,
        isAdmin
      }
    });
    setCurrentStep(1);
    setActiveView('main');
  };

  const handleRoleChange = async (newRole: UserRole, targetStudentId?: string) => {
    if (!authState.user) return;
    localStorage.setItem('app_role', newRole);

    let updatedStudentId = authState.user.studentId;
    let updatedName = authState.user.name;
    let updatedEmail = authState.user.email;

    if (targetStudentId) {
      try {
        let student = await db.students.get(targetStudentId);
        if (!student) {
          student = await db.students.where('id').equalsIgnoreCase(targetStudentId).first();
        }
        if (student) {
          updatedStudentId = student.id;
          updatedName = student.name;
          updatedEmail = student.email;
          localStorage.setItem('app_student_id', student.id);
          localStorage.setItem('app_student_name', student.name);
          localStorage.setItem('app_student_email', student.email);
        } else {
          updatedStudentId = targetStudentId;
          localStorage.setItem('app_student_id', targetStudentId);
        }
      } catch (err) {
        console.warn('Find student error on switch:', err);
      }
    }

    setAuthState(prev => ({
      ...prev,
      user: prev.user ? { 
        ...prev.user, 
        role: newRole,
        studentId: updatedStudentId,
        name: updatedName,
        email: updatedEmail
      } : null
    }));
    setCurrentStep(1);
    setActiveView('main');
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('app_role');
    localStorage.removeItem('app_student_id');
    localStorage.removeItem('app_student_name');
    localStorage.removeItem('app_student_email');
    setAuthState({ isAuthenticated: false, accessToken: null, user: null });
  };

  if (!authState.isAuthenticated || !authState.user?.role) {
    return <LoginView onLogin={handleLogin} />;
  }

  const isUserAdmin = authState.user.isAdmin || isAdminEmail(authState.user.email);

  // Define 6 Stepper Steps based on current user role (matches Faculty of Education UI)
  const getStepperSteps = (role: UserRole) => {
    if (role === 'student') {
      return [
        { step: 1, title: 'ข้อมูลส่วนบุคคล', subtitle: 'ชื่อและช่องทางติดต่อ' },
        { step: 2, title: 'ตำแหน่งและสังกัด', subtitle: 'สาขาวิชาและชั้นปีการศึกษา' },
        { step: 3, title: 'บัตรดิจิทัล & สแกน', subtitle: 'รหัสนักศึกษาและ QR ประจำตัว' },
        { step: 4, title: 'กิจกรรมที่เข้าร่วม', subtitle: 'เช็คอินและสถานะกิจกรรม' },
        { step: 5, title: 'บันทึกการเรียนรู้ KPA', subtitle: 'ภาระงาน ประสบการณ์ และผลงาน' },
        { step: 6, title: 'ตรวจสอบและยืนยัน', subtitle: 'ทบทวนก่อนบันทึกและส่งรายงาน' }
      ];
    } else if (role === 'staff') {
      return [
        { step: 1, title: 'ข้อมูลเจ้าหน้าที่', subtitle: 'ยืนยันตัวตนผู้คุมจุดสแกน' },
        { step: 2, title: 'เลือกกิจกรรม', subtitle: 'กำหนดกิจกรรมและสถานที่' },
        { step: 3, title: 'เครื่องสแกนเนอร์', subtitle: 'กล้องสแกนและเครื่องยิงบาร์โค้ด' },
        { step: 4, title: 'รายชื่อที่เช็คอินแล้ว', subtitle: 'ตรวจสอบรายชื่อ Real-time' },
        { step: 5, title: 'บันทึกเพิ่มเติม', subtitle: 'หมายเหตุการเข้าร่วม' },
        { step: 6, title: 'สรุปและส่งออก', subtitle: 'Export รายชื่อเข้าฐานข้อมูล' }
      ];
    } else {
      return [
        { step: 1, title: 'ภาพรวมคุณสมบัติ', subtitle: 'สถิติและตัวชี้วัด K-P-A' },
        { step: 2, title: 'รอตรวจสอบขั้นที่ 1', subtitle: 'ฝ่ายวิชาการและอาจารย์ที่ปรึกษา' },
        { step: 3, title: 'รออนุมัติขั้นที่ 2', subtitle: 'คณะกรรมการและผู้บริหาร' },
        { step: 4, title: 'จัดการกิจกรรม', subtitle: 'สร้างและกำหนดเกณฑ์กิจกรรม' },
        { step: 5, title: 'ประวัติและฐานข้อมูล', subtitle: 'ข้อมูลบันทึกทั้งหมด' },
        { step: 6, title: 'สรุปรายงานและสถิติ', subtitle: 'ออกเอกสารรับรองคุณวุฒิ' }
      ];
    }
  };

  const steps = getStepperSteps(authState.user.role);

  // Dynamic root font size class
  const fontSizeClass = fontSize === 'sm' ? 'text-xs' : fontSize === 'lg' ? 'text-base' : 'text-sm';

  // Dedicated full-fidelity SaaS Dashboard for Staff (matching reference UI)
  if (authState.user.role === 'staff') {
    return (
      <div className={`h-[100dvh] min-h-[100dvh] flex flex-col bg-[#F4EFE6] text-[#18181B] font-sans antialiased overflow-hidden ${fontSizeClass}`}>
        <StaffPortal 
          onRoleChange={handleRoleChange}
          onLogout={handleLogout}
          userName={authState.user.name}
          userEmail={authState.user.email}
          isUserAdmin={isUserAdmin}
        />
        <SupabaseModal 
          isOpen={isSupabaseModalOpen} 
          onClose={() => setIsSupabaseModalOpen(false)} 
        />
      </div>
    );
  }

  // Dedicated modern Dashboard for Student (matching reference UI)
  if (authState.user.role === 'student') {
    return (
      <div className={`h-[100dvh] min-h-[100dvh] flex flex-col bg-[#F4EFE6] text-[#121212] font-sans antialiased overflow-hidden ${fontSizeClass}`}>
        <StudentPortal 
          studentId={authState.user.studentId}
          studentName={authState.user.name}
          studentEmail={authState.user.email}
          onRoleChange={handleRoleChange}
          onLogout={handleLogout}
          isUserAdmin={isUserAdmin}
        />
        <SupabaseModal 
          isOpen={isSupabaseModalOpen} 
          onClose={() => setIsSupabaseModalOpen(false)} 
        />
      </div>
    );
  }

  // Dedicated Executive Admin Dashboard (matching reference UI from user screenshot)
  if (authState.user.role === 'approver') {
    return (
      <div className={`h-[100dvh] min-h-[100dvh] flex flex-col bg-[#F4EFE6] text-[#18181B] font-sans antialiased overflow-hidden ${fontSizeClass}`}>
        <ExecutiveAdminDashboard 
          onRoleChange={handleRoleChange}
          onLogout={handleLogout}
          userName={authState.user.name}
          userEmail={authState.user.email}
          isUserAdmin={isUserAdmin}
        />
        <SupabaseModal 
          isOpen={isSupabaseModalOpen} 
          onClose={() => setIsSupabaseModalOpen(false)} 
        />
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col bg-[#FAF9F6] text-[#1C1917] font-sans antialiased selection:bg-amber-100 selection:text-amber-950 overflow-hidden ${fontSizeClass}`}>
      
      {/* ========================================================================= */}
      {/* 1. TOP HEADER - Authentic Faculty of Education Nakhon Phanom University   */}
      {/* ========================================================================= */}
      <header className="bg-white border-b border-stone-200 shrink-0 z-30 shadow-2xs">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Left: NPU Official Brand Identity */}
          <div className="flex items-center gap-3.5 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg text-stone-600 hover:bg-stone-100 lg:hidden"
              aria-label="เปิดเมนู"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="w-11 h-14 flex items-center justify-center shrink-0">
              <NPULogo size="sm" className="w-10 h-13 drop-shadow-xs" />
            </div>

            <div className="min-w-0 leading-tight">
              <h1 className="font-bold text-[#1C1917] text-sm sm:text-base tracking-tight truncate">
                ระบบบันทึกกิจกรรมประสบการณ์วิชาชีพครู
              </h1>
              <p className="text-xs text-stone-500 truncate mt-0.5">
                {authState.user.role === 'student' ? 'ฝ่ายพัฒนานักศึกษาและวิชาชีพครู (สำหรับนักศึกษา)' :
                 authState.user.role === 'staff' ? 'สถานีจุดสแกนและเช็คอินความเร็วสูง' :
                 'ศูนย์บริหารจัดการและประเมินผลกิจกรรม'}
              </p>
              <p className="text-xs text-stone-500 font-medium truncate">
                คณะครุศาสตร์ มหาวิทยาลัยนครพนม
              </p>
            </div>
          </div>

          {/* Right: Clean Minimalist Action Controls */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            
            {/* Navigation Pills */}
            <div className="hidden md:flex items-center gap-1.5">
              <button
                onClick={() => setActiveView('main')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeView === 'main'
                    ? 'bg-stone-100 text-stone-900 border border-stone-300 font-semibold'
                    : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
                }`}
              >
                แบบฟอร์มของฉัน
              </button>

              <button
                onClick={() => setActiveView('reports')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeView === 'reports'
                    ? 'bg-stone-100 text-stone-900 border border-stone-300 font-semibold'
                    : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200'
                }`}
              >
                สรุปรายชื่อ
              </button>

              {/* Supabase status modal button */}
              <button
                onClick={() => setIsSupabaseModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 rounded-lg text-xs font-medium transition-colors"
                title="ฐานข้อมูล Supabase"
              >
                <Database className="w-3.5 h-3.5 text-stone-600" />
                <span className="hidden lg:inline">Supabase</span>
                <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
              </button>
            </div>

            {/* Language Switcher */}
            <div className="inline-flex items-center bg-white border border-stone-200 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setLang('th')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  lang === 'th' ? 'bg-stone-100 text-stone-900 font-bold' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                ไทย
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  lang === 'en' ? 'bg-stone-100 text-stone-900 font-bold' : 'text-stone-500 hover:text-stone-800'
                }`}
              >
                EN
              </button>
            </div>

            {/* Font Size Accessibility Adjuster */}
            <div className="hidden sm:inline-flex items-center bg-stone-100 border border-stone-200 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setFontSize('sm')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  fontSize === 'sm' ? 'bg-[#291506] text-white' : 'text-stone-600 hover:text-stone-900'
                }`}
                title="ลดขนาดตัวอักษร"
              >
                ก-
              </button>
              <button
                onClick={() => setFontSize('base')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  fontSize === 'base' ? 'bg-[#291506] text-white' : 'text-stone-600 hover:text-stone-900'
                }`}
                title="ขนาดตัวอักษรปกติ"
              >
                ก
              </button>
              <button
                onClick={() => setFontSize('lg')}
                className={`px-2 py-1 rounded font-medium transition-colors ${
                  fontSize === 'lg' ? 'bg-[#291506] text-white' : 'text-stone-600 hover:text-stone-900'
                }`}
                title="เพิ่มขนาดตัวอักษร"
              >
                ก+
              </button>
            </div>

            {/* User Profile Badge */}
            <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
              <div className="w-8 h-8 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-stone-600 shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="hidden sm:block text-right leading-tight min-w-0">
                <div className="text-xs font-semibold text-stone-900 truncate max-w-[150px]">
                  {authState.user.email || 'tpc.edu@npu.ac.th'}
                </div>
                <div className="text-[11px] text-stone-500 truncate max-w-[150px]">
                  {authState.user.email || 'tpc.edu@npu.ac.th'}
                </div>
              </div>

              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg hover:bg-stone-50 transition-colors ml-1"
                title="ออกจากระบบ"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. BODY CONTENT - Left Stepper + Center Minimal Form Area                */}
      {/* ========================================================================= */}
      <div className="flex-1 flex min-w-0 overflow-hidden relative">
        
        {/* Left Stepper Sidebar (Desktop) */}
        <aside className="hidden lg:flex w-72 bg-[#FAF9F6] border-r border-stone-200/80 flex-col h-full shrink-0 z-10 select-none">
          <div className="py-6 px-4 flex-1 overflow-y-auto space-y-1">
            
            {/* Vertical Stepper List */}
            <nav className="relative" aria-label="ขั้นตอนการทำงาน">
              {/* Vertical connecting line */}
              <div className="absolute left-[1.375rem] top-4 bottom-8 w-0.5 bg-stone-200 pointer-events-none" />

              <div className="space-y-3">
                {steps.map((item) => {
                  const isActive = currentStep === item.step;
                  const isCompleted = currentStep > item.step;

                  return (
                    <button
                      key={item.step}
                      onClick={() => { setCurrentStep(item.step); setActiveView('main'); }}
                      className={`relative z-10 w-full text-left flex items-start gap-3.5 p-2.5 rounded-xl transition-all ${
                        isActive
                          ? 'bg-[#FCF8ED] shadow-2xs'
                          : 'hover:bg-stone-100/60'
                      }`}
                    >
                      {/* Step Number Circle */}
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                          isActive
                            ? 'bg-[#B45309] text-white shadow-2xs'
                            : isCompleted
                            ? 'bg-stone-200 text-stone-700 border border-stone-300'
                            : 'bg-white border border-stone-300 text-stone-500'
                        }`}
                      >
                        {item.step}
                      </div>

                      {/* Title & Subtitle */}
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div
                          className={`text-xs leading-snug truncate ${
                            isActive ? 'font-bold text-[#1C1917]' : 'font-medium text-stone-600'
                          }`}
                        >
                          {item.title}
                        </div>
                        <div className="text-[11px] text-stone-400 truncate mt-0.5">
                          {item.subtitle}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </nav>

            {/* Admin Switcher Card if Admin */}
            {isUserAdmin && (
              <div className="pt-6">
                <div className="p-3 bg-white border border-stone-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-stone-700">
                    <span className="flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-amber-600" />
                      <span>สลับสิทธิ์การใช้งาน</span>
                    </span>
                  </div>
                  <select
                    value={authState.user.role}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="w-full text-xs bg-stone-50 border border-stone-300 rounded-lg p-2 font-medium text-stone-800 outline-none cursor-pointer hover:border-stone-400"
                  >
                    <option value="student">🎓 โหมดนักศึกษา (Student)</option>
                    <option value="staff">📷 โหมดเจ้าหน้าที่ (Staff)</option>
                    <option value="approver">🛡️ โหมดผู้บริหาร (Approver)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Sidebar Action Button: เปิดหน้าสรุปรายชื่อ */}
          <div className="p-4 border-t border-stone-200 bg-[#FAF9F6]">
            <button
              onClick={() => setActiveView(activeView === 'reports' ? 'main' : 'reports')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 rounded-lg text-xs font-medium shadow-2xs transition-colors"
            >
              <FileText className="w-4 h-4 text-stone-500" />
              <span>{activeView === 'reports' ? 'กลับหน้าแบบฟอร์ม' : 'เปิดหน้าสรุปรายชื่อ'}</span>
            </button>
          </div>
        </aside>

        {/* Center Main Scrollable Canvas */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#FAF9F6]">
          <div className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            
            {activeView === 'reports' ? (
              <ReportsView onBack={() => setActiveView('main')} />
            ) : (
              <>
                {/* Step Sub-Header matching Faculty of Education image */}
                <div className="space-y-1 pb-4 border-b border-stone-200">
                  <div className="text-xs font-semibold text-[#B45309]">
                    ขั้นตอนที่ {currentStep} จาก {steps.length}
                  </div>
                  <h2 className="text-2xl font-bold text-[#1C1917] tracking-tight">
                    {steps[currentStep - 1]?.title || 'ข้อมูลกิจกรรม'}
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-500">
                    {steps[currentStep - 1]?.subtitle || 'ระบุข้อมูลสำหรับการเข้าร่วมกิจกรรมและการบันทึกผลการเรียนรู้'}
                  </p>
                </div>

                {/* Campus Notice Helper Banner */}
                <div className="bg-white border border-stone-200 rounded-xl p-3.5 flex items-center gap-3 text-xs text-stone-600 shadow-2xs">
                  <span className="text-stone-400 font-bold text-sm">ⓘ</span>
                  <span>ระบบจะใช้บัญชีมหาวิทยาลัยนครพนม (@npu.ac.th) เพื่อจำกัดและตรวจสอบการเข้าถึงข้อมูลตามนโยบายคุ้มครองข้อมูล</span>
                </div>

                {/* Main Dynamic View based on User Role */}
                <div className="pt-2">
                  {authState.user.role === 'staff' && <StaffPortal />}
                  {authState.user.role === 'student' && (
                    <StudentPortal 
                      studentId={authState.user.studentId} 
                      studentName={authState.user.name} 
                      studentEmail={authState.user.email} 
                    />
                  )}
                </div>
              </>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 3. STICKY BOTTOM ACTION BAR                                               */}
          {/* ========================================================================= */}
          <div className="sticky bottom-0 bg-white border-t border-stone-200 px-4 sm:px-6 lg:px-8 py-3.5 z-20 shadow-xs">
            <div className="max-w-5xl mx-auto flex items-center justify-between">
              
              {/* Left: Auto-save Indicator */}
              <div className="flex items-center gap-2 text-xs text-stone-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium text-stone-700">บันทึกร่างอัตโนมัติ</span>
              </div>

              {/* Right: Action Buttons matching design */}
              <div className="flex items-center gap-3">
                <button
                  disabled={currentStep <= 1}
                  onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
                  className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                    currentStep <= 1
                      ? 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
                      : 'bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 shadow-2xs'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>ย้อนกลับ</span>
                </button>

                <button
                  onClick={() => setCurrentStep(prev => Math.min(steps.length, prev + 1))}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#291506] hover:bg-[#3E2112] text-white rounded-lg text-xs font-medium shadow-2xs transition-colors"
                >
                  <span>{currentStep === steps.length ? 'เสร็จสิ้น' : 'ถัดไป'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 4. BOTTOM COPYRIGHT FOOTER - Faculty of Education                         */}
          {/* ========================================================================= */}
          <footer className="bg-[#3E2112] text-stone-300 py-3.5 px-4 sm:px-6 lg:px-8 shrink-0 text-xs">
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="text-center sm:text-left">
                พัฒนาโดย <span className="text-white font-medium">ฝ่ายบริหารเทคโนโลยีดิจิทัลและศูนย์ฝึกประสบการณ์วิชาชีพครู คณะครุศาสตร์ มหาวิทยาลัยนครพนม</span>
              </div>
              <div className="flex items-center gap-1.5 text-stone-300">
                <span>✉ อีเมล</span>
                <a href="mailto:tpc.edu@npu.ac.th" className="text-white hover:underline font-medium">
                  tpc.edu@npu.ac.th
                </a>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-stone-900/60 backdrop-blur-xs z-50 flex">
          <div className="w-72 bg-white h-full p-4 flex flex-col justify-between shadow-xl animate-in slide-in-from-left duration-150">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <NPULogo size="sm" className="w-8 h-10" />
                  <div className="text-xs font-bold text-[#1C1917]">คณะครุศาสตร์ มพ.</div>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-stone-100">
                  <X className="w-5 h-5 text-stone-600" />
                </button>
              </div>

              {/* Navigation Steps */}
              <div className="space-y-1">
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">ขั้นตอนการทำงาน</div>
                {steps.map((item) => (
                  <button
                    key={item.step}
                    onClick={() => { setCurrentStep(item.step); setActiveView('main'); setMobileMenuOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      currentStep === item.step ? 'bg-[#FCF8ED] text-[#B45309] font-bold' : 'text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full border border-stone-300 flex items-center justify-center text-[10px]">
                      {item.step}
                    </span>
                    <span>{item.title}</span>
                  </button>
                ))}
              </div>

              {/* Role switcher for Admin */}
              {isUserAdmin && (
                <div className="pt-3 border-t border-stone-200 space-y-1">
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">สลับโหมดการทำงาน</div>
                  <button
                    onClick={() => handleRoleChange('student')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium ${
                      authState.user.role === 'student' ? 'bg-[#291506] text-white' : 'hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    🎓 โหมดนักศึกษา
                  </button>
                  <button
                    onClick={() => handleRoleChange('staff')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium ${
                      authState.user.role === 'staff' ? 'bg-[#291506] text-white' : 'hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    📷 โหมดเจ้าหน้าที่ (Staff)
                  </button>
                  <button
                    onClick={() => handleRoleChange('approver')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium ${
                      authState.user.role === 'approver' ? 'bg-[#291506] text-white' : 'hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    🛡️ โหมดผู้บริหาร (Approver)
                  </button>
                </div>
              )}

              <div className="pt-3 border-t border-stone-200">
                <button
                  onClick={() => { setMobileMenuOpen(false); setIsSupabaseModalOpen(true); }}
                  className="w-full flex items-center justify-between px-3 py-2 bg-stone-50 hover:bg-stone-100 text-stone-700 border border-stone-200 rounded-lg text-xs font-medium"
                >
                  <span className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-stone-600" />
                    <span>ฐานข้อมูล Supabase</span>
                  </span>
                  <span className={`w-2 h-2 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-200">
              <button
                onClick={handleLogout}
                className="w-full py-2 bg-stone-100 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-medium flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" /> ออกจากระบบ
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)}></div>
        </div>
      )}

      {/* Supabase Settings & Diagnostic Modal */}
      <SupabaseModal 
        isOpen={isSupabaseModalOpen} 
        onClose={() => setIsSupabaseModalOpen(false)} 
      />
    </div>
  );
}

