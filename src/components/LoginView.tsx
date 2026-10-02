import React, { useState, useEffect, useRef } from 'react';
import { UserRole, OFFICIAL_SYSTEM_ACCOUNTS, findOfficialAccount, OfficialAccount } from '../types';
import { 
  GraduationCap, 
  UserCheck, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  Share2, 
  X, 
  Copy, 
  Download, 
  Camera, 
  Loader2, 
  Zap, 
  Building, 
  Check, 
  AlertCircle,
  Lock,
  User,
  Eye,
  EyeOff,
  Key,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { db } from '../db/db';
import { QRCodeSVG } from 'qrcode.react';
import { NPULogo } from './NPULogo';
import { FACULTY_OF_EDUCATION_MAJORS, OTHER_NPU_MAJORS, isScienceMajor } from '../data/majors';
import { downloadDigitalPassCard } from '../utils/generatePassImage';
import { StandeeModal } from './StandeeModal';
import { compressAndConvertToBase64 } from '../utils/imageUtils';

export const LoginView: React.FC<{ 
  onLogin: (role: UserRole, studentData?: { id: string; name: string; email: string }) => void 
}> = ({ onLogin }) => {
  const [loginMode, setLoginMode] = useState<'student' | 'staff_admin' | 'preregister'>('student');
  const [showShareModal, setShowShareModal] = useState(false);
  const [showStandeeModal, setShowStandeeModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [error, setError] = useState('');

  // Student Login State
  const [studentIdInput, setStudentIdInput] = useState('');
  const [studentPasswordInput, setStudentPasswordInput] = useState('');
  const [showStudentPassword, setShowStudentPassword] = useState(false);

  // Staff & Admin Login State (Username & Password)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAccountList, setShowAccountList] = useState(true);
  const [copiedAccountUser, setCopiedAccountUser] = useState<string | null>(null);

  // Pre-Registration & Fast Track Form State
  const [studentId, setStudentId] = useState('');
  const [prefix, setPrefix] = useState('นาย');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [major, setMajor] = useState(FACULTY_OF_EDUCATION_MAJORS[0].name);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Digital Pass Ready State
  const [registeredStudentPass, setRegisteredStudentPass] = useState<any | null>(null);
  const [isDownloadingPass, setIsDownloadingPass] = useState(false);
  const [savedPassSuccess, setSavedPassSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect mode=preregister in URL on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'preregister') {
        setLoginMode('preregister');
      }

      // Check if user already registered previously in localStorage
      const cachedStudentId = localStorage.getItem('app_student_id');
      const cachedStudentName = localStorage.getItem('app_student_name');
      if (cachedStudentId && cachedStudentName && localStorage.getItem('app_role') === 'student') {
        db.students.get(cachedStudentId).then((std) => {
          if (std) {
            setRegisteredStudentPass(std);
          }
        });
      }
    }
  }, []);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const base64 = await compressAndConvertToBase64(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true
      });
      setProfileImage(base64);
    } catch (err) {
      console.error('Photo compression error:', err);
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  // Student Direct Sign-in by Student ID or University Email with Password
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const input = studentIdInput.trim();
    if (!input) {
      setError('กรุณากรอกรหัสนักศึกษา');
      return;
    }

    if (!studentPasswordInput) {
      setError('กรุณากรอกรหัสผ่าน (สำหรับเข้าสู่ระบบครั้งแรก รหัสผ่านคือรหัสนักศึกษา)');
      return;
    }

    // Try finding student by ID or email
    let found = await db.students.get(input);
    if (!found) {
      found = await db.students.where('id').equalsIgnoreCase(input).first();
    }
    if (!found && input.includes('@')) {
      found = await db.students.where('email').equalsIgnoreCase(input).first();
    }

    if (found) {
      // Default password is the student's ID
      const defaultPassword = found.id.trim();
      const expectedPassword = (found.password || defaultPassword).trim();

      if (studentPasswordInput.trim() !== expectedPassword) {
        setError('รหัสผ่านไม่ถูกต้อง (สำหรับเข้าใช้งานครั้งแรก รหัสผ่านเริ่มต้นคือ "รหัสนักศึกษา" หรือหากลืมรหัสผ่าน กรุณาติดต่อผู้ดูแลระบบเพื่อรีเซ็ต)');
        return;
      }

      // Check if student is still using default password
      const isDefault = !found.isPasswordChanged || found.password === defaultPassword || !found.password;
      if (isDefault) {
        localStorage.setItem('student_needs_password_change', 'true');
      } else {
        localStorage.removeItem('student_needs_password_change');
      }

      localStorage.setItem('app_role', 'student');
      localStorage.setItem('app_student_id', found.id);
      localStorage.setItem('app_student_name', found.name);
      localStorage.setItem('app_student_email', found.email);

      onLogin('student', {
        id: found.id,
        name: found.name,
        email: found.email
      });
    } else {
      // If student not found yet in the system, redirect to pre-registration
      const numericOnly = input.replace(/[^0-9]/g, '');
      if (numericOnly.length >= 8) {
        setStudentId(numericOnly);
      }
      setLoginMode('preregister');
      setError(`ยังไม่พบรหัสนักศึกษา "${input}" ในฐานข้อมูล กรุณากรอกชื่อและสาขาวิชาเพื่อสร้าง Digital ID`);
    }
  };

  // Real Staff & Admin Authentication with Username and Password
  const handleStaffAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }

    const account = findOfficialAccount(username, password);
    if (!account) {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
      return;
    }

    // Save session
    localStorage.setItem('app_role', account.role);
    localStorage.setItem('app_student_id', account.username);
    localStorage.setItem('app_student_name', account.name);
    localStorage.setItem('app_student_email', account.email);

    onLogin(account.role, {
      id: account.username,
      name: account.name,
      email: account.email
    });
  };

  // Fill credentials helper
  const handleFillCredentials = (acc: OfficialAccount) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setError('');
  };

  // Pre-Registration Submission
  const handlePreRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !firstName.trim() || !lastName.trim() || !major.trim()) {
      setError('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    const cleanId = studentId.trim();
    const yearPrefix = parseInt(cleanId.substring(0, 2), 10);
    const currentYear = 69; // 2569
    const calculatedYear = !isNaN(yearPrefix) ? (currentYear - yearPrefix + 1) : 1;
    const studentName = `${prefix}${firstName.trim()} ${lastName.trim()}`;
    const studentEmail = `${cleanId}@npu.ac.th`;

    const assignedFaculty = isScienceMajor(major) ? 'คณะวิทยาศาสตร์' : 'คณะครุศาสตร์';

    const newStudent = { 
      id: cleanId, 
      name: studentName, 
      email: studentEmail,
      prefix,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      major,
      year: calculatedYear > 0 ? calculatedYear : 1,
      faculty: assignedFaculty,
      university: 'มหาวิทยาลัยนครพนม',
      profileImage: profileImage || undefined,
      isPreRegistered: true,
      isTemporary: false,
      registeredAt: new Date().toISOString()
    };

    await db.students.put(newStudent);

    localStorage.setItem('app_role', 'student');
    localStorage.setItem('app_student_id', newStudent.id);
    localStorage.setItem('app_student_name', newStudent.name);
    localStorage.setItem('app_student_email', newStudent.email);
    localStorage.setItem('npu_fasttrack_registered', 'true');

    setRegisteredStudentPass(newStudent);
  };

  const handleDownloadPass = async () => {
    if (!registeredStudentPass) return;
    setIsDownloadingPass(true);
    try {
      const ok = await downloadDigitalPassCard({
        id: registeredStudentPass.id,
        name: registeredStudentPass.name,
        major: registeredStudentPass.major,
        faculty: registeredStudentPass.faculty,
        year: registeredStudentPass.year,
        profileImage: registeredStudentPass.profileImage
      });
      if (ok) {
        setSavedPassSuccess(true);
        setTimeout(() => setSavedPassSuccess(false), 3500);
      }
    } catch (e) {
      console.error('Download error:', e);
    } finally {
      setIsDownloadingPass(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-between items-center px-4 py-6 sm:py-10 selection:bg-amber-100 selection:text-amber-900 font-sans">
      
      {/* Top University Brand Crest */}
      <div className="text-center max-w-lg mx-auto mb-4">
        <div className="inline-flex items-center justify-center p-2 mb-2 hover:scale-105 transition-transform duration-300">
          <NPULogo size="lg" className="w-16 h-24 sm:w-20 sm:h-28 drop-shadow-md" />
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-[#4A1E07] tracking-tight">
          ระบบบันทึกกิจกรรมประสบการณ์วิชาชีพครู
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
          คณะครุศาสตร์ • มหาวิทยาลัยนครพนม (Nakhon Phanom University)
        </p>

        <div className="mt-3 px-3.5 py-1.5 bg-gradient-to-r from-amber-100 via-orange-50 to-amber-100 border border-amber-300 rounded-full inline-flex items-center gap-1.5 shadow-xs">
          <Zap className="w-3.5 h-3.5 text-amber-700" />
          <span className="text-xs font-black text-amber-950">
            ระบบตรวจสอบสิทธิ์และสะท้อนผลการเรียนรู้มาตรฐานวิชาชีพครู (18 กิจกรรม)
          </span>
        </div>
      </div>

      {/* Main Interactive Card */}
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-3xl shadow-xl p-5 sm:p-7 relative overflow-hidden backdrop-blur-sm">
        
        {/* Accent Bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#4A1E07] via-[#EA580C] to-[#F59E0B]" />

        {/* CASE 1: Student Pass Generated & Ready */}
        {registeredStudentPass ? (
          <div className="space-y-4 animate-in zoom-in-95 duration-200 text-center">
            
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-left">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs sm:text-sm font-black text-emerald-950">
                  ลงทะเบียนสำเร็จ! รับ Digital ID เรียบร้อยแล้ว
                </h3>
                <p className="text-[11px] text-emerald-700 font-medium">
                  บันทึกลงในเครื่องนี้แล้ว สามารถเปิดใช้งานเข้าสู่ระบบได้ทันที
                </p>
              </div>
            </div>

            {/* Authentic Digital ID Pass Presentation */}
            <div className="p-4 bg-[#FAF9F6] border-2 border-slate-900 rounded-2xl shadow-md text-center space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-[10px] font-black uppercase text-[#EA580C] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                  ⚡ DIGITAL ID PASS
                </span>
                <span className="text-[10px] text-slate-500 font-bold">
                  ชั้นปีที่ {registeredStudentPass.year || 1}
                </span>
              </div>

              {/* Photo or Initials */}
              <div className="w-16 h-16 mx-auto rounded-full border-2 border-[#EA580C] overflow-hidden bg-amber-50 flex items-center justify-center shadow-xs">
                {registeredStudentPass.profileImage ? (
                  <img src={registeredStudentPass.profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-black text-[#EA580C]">
                    {registeredStudentPass.name ? registeredStudentPass.name.charAt(0) : 'N'}
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-sm font-black text-slate-900">
                  {registeredStudentPass.name}
                </h4>
                <div className="inline-block mt-0.5 px-2 py-0.5 bg-rose-50 border border-rose-200 rounded font-mono font-bold text-xs text-rose-700">
                  {registeredStudentPass.id}
                </div>
                <p className="text-xs font-bold text-[#2563EB] mt-1">
                  {registeredStudentPass.major}
                </p>
              </div>

              {/* QR Code */}
              <div className="p-3 bg-white border border-slate-300 rounded-xl inline-flex flex-col items-center">
                <QRCodeSVG
                  id="pass-qrcode-svg"
                  value={registeredStudentPass.id}
                  size={140}
                  level="H"
                  includeMargin={false}
                />
                <span className="text-[9px] font-mono font-bold text-slate-400 mt-1">
                  Code 128 / 2D Fast Track
                </span>
              </div>
            </div>

            {/* Save to Device Photo Gallery Button */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleDownloadPass}
                disabled={isDownloadingPass}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-black shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
              >
                {isDownloadingPass ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                    <span>กำลังบันทึกภาพ...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-amber-300" />
                    <span>บันทึกรูปลงเครื่อง (เซฟเข้าคลังภาพมือถือ)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  onLogin('student', {
                    id: registeredStudentPass.id,
                    name: registeredStudentPass.name,
                    email: registeredStudentPass.email
                  });
                }}
                className="w-full py-3.5 px-4 bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs sm:text-sm font-black shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
              >
                <span>เข้าสู่หน้านักศึกษา (Student Portal) ทันที</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        ) : (
          /* CASE 2: MAIN LOGIN / SIGN-IN INTERFACE */
          <div className="space-y-4">
            
            {/* Main Segmented Mode Switcher */}
            <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setLoginMode('student');
                  setError('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  loginMode === 'student' || loginMode === 'preregister'
                    ? 'bg-[#4A1E07] text-amber-300 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                <span>สำหรับนักศึกษา</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginMode('staff_admin');
                  setError('');
                }}
                className={`py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  loginMode === 'staff_admin'
                    ? 'bg-[#4A1E07] text-amber-300 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>เจ้าหน้าที่ & ผู้บริหาร</span>
              </button>
            </div>

            {/* TAB 1: STUDENT PORTAL LOGIN */}
            {loginMode === 'student' && (
              <div className="space-y-4 animate-in fade-in duration-150 text-left">
                <div className="text-center pb-1">
                  <h2 className="text-sm sm:text-base font-black text-slate-800">
                    เข้าสู่ระบบนักศึกษา (Student Portal)
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ตรวจสอบกิจกรรมสะสม เกณฑ์ 18 กิจกรรม และส่งผลสะท้อนคิด K-P-A
                  </p>
                </div>

                <form onSubmit={handleStudentSubmit} className="space-y-3.5">
                  {/* Username / Student ID */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        ชื่อผู้ใช้ / รหัสนักศึกษา (Student ID)
                      </label>
                      <span className="text-[10px] text-slate-400">11 หลัก</span>
                    </div>
                    <div className="relative">
                      <input
                        type="text"
                        value={studentIdInput}
                        onChange={(e) => {
                          setStudentIdInput(e.target.value);
                          setError('');
                        }}
                        placeholder="เช่น 66309010001 หรือ 69309010001"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700">
                        รหัสผ่าน (Password)
                      </label>
                      {studentIdInput.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            setStudentPasswordInput(studentIdInput.trim());
                            setError('');
                          }}
                          className="text-[11px] font-bold text-[#EA580C] hover:underline"
                        >
                          ⚡ ใส่รหัสผ่านเริ่มต้น (รหัสนักศึกษา)
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={showStudentPassword ? 'text' : 'password'}
                        value={studentPasswordInput}
                        onChange={(e) => {
                          setStudentPasswordInput(e.target.value);
                          setError('');
                        }}
                        placeholder="กรอกรหัสผ่าน (เริ่มต้นคือรหัสนักศึกษา)"
                        className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-medium outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowStudentPassword(!showStudentPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        title={showStudentPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      >
                        {showStudentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Default Password Instruction Box */}
                  <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">รหัสผ่านเริ่มต้น:</span> ใช้งาน <strong>"รหัสนักศึกษา"</strong> เป็นรหัสผ่านเริ่มต้น (เมื่อเข้าสู่ระบบแล้ว สามารถเปลี่ยนเป็นรหัสผ่านส่วนตัวได้ทันที และหากลืมรหัสผ่าน Admin สามารถรีเซ็ตให้ได้)
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 px-4 bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
                  >
                    <span>เข้าสู่ระบบนักศึกษา (Student Portal)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {/* Quick Sample Students for Easy Testing */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    ตัวอย่างรหัสนักศึกษาสำหรับทดสอบ (กดเพื่อกรอกรหัส & รหัสผ่านเริ่มต้นอัตโนมัติ):
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStudentIdInput('66309010001');
                        setStudentPasswordInput('66309010001');
                        setError('');
                      }}
                      className="p-2 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 border border-slate-200 rounded-xl text-left transition-all"
                    >
                      <div className="text-xs font-bold font-mono text-slate-800">66309010001</div>
                      <div className="text-[10px] text-slate-500 truncate">นายกิตติศักดิ์ (คอมฯ ปี 4)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStudentIdInput('66309010002');
                        setStudentPasswordInput('66309010002');
                        setError('');
                      }}
                      className="p-2 bg-slate-50 hover:bg-amber-50 hover:border-amber-300 border border-slate-200 rounded-xl text-left transition-all"
                    >
                      <div className="text-xs font-bold font-mono text-slate-800">66309010002</div>
                      <div className="text-[10px] text-slate-500 truncate">นางสาวศิริสุดา (อังกฤษ ปี 4)</div>
                    </button>
                  </div>
                </div>

                <div className="pt-2 text-center border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginMode('preregister');
                      setError('');
                    }}
                    className="text-xs font-bold text-[#EA580C] hover:underline inline-flex items-center gap-1"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>หรือลงทะเบียนรับบัตร Digital ID ล่วงหน้า (Fast Track)</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: STAFF & ADMIN LOGIN (Real Username & Password Authentication) */}
            {loginMode === 'staff_admin' && (
              <div className="space-y-4 animate-in fade-in duration-150 text-left">
                <div className="text-center pb-1">
                  <h2 className="text-sm sm:text-base font-black text-slate-800">
                    เข้าสู่ระบบสำหรับเจ้าหน้าที่และผู้บริหาร
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ลงชื่อเข้าใช้ด้วย Username และ Password ที่ได้รับมอบหมาย
                  </p>
                </div>

                <form onSubmit={handleStaffAdminSubmit} className="space-y-3.5">
                  {/* Username / Email */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      ชื่อผู้ใช้ (Username) หรืออีเมล
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => {
                          setUsername(e.target.value);
                          setError('');
                        }}
                        placeholder="เช่น admin หรือ staffedu"
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-[#4A1E07]/20 focus:border-[#4A1E07] transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      รหัสผ่าน (Password)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          setError('');
                        }}
                        placeholder="กรอกรหัสผ่าน"
                        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium outline-none focus:ring-2 focus:ring-[#4A1E07]/20 focus:border-[#4A1E07] transition-all"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        title={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 bg-[#4A1E07] hover:bg-[#60290A] text-amber-300 rounded-xl font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
                  >
                    <Key className="w-4 h-4 text-amber-400" />
                    <span>เข้าสู่ระบบ (Sign in)</span>
                  </button>
                </form>

                {/* Official Accounts Reference Sheet */}
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <button
                    type="button"
                    onClick={() => setShowAccountList(!showAccountList)}
                    className="w-full flex items-center justify-between text-xs font-black text-[#4A1E07] hover:text-[#EA580C] transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>ข้อมูลบัญชีใช้งานจริง (Admin & Staff Accounts):</span>
                    </span>
                    {showAccountList ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>

                  {showAccountList && (
                    <div className="space-y-2 animate-in fade-in duration-150">
                      <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900">
                        บัญชีสำหรับการใช้งานจริง ออกให้โดยระบบสารสนเทศ คณะครุศาสตร์ ม.นครพนม
                      </div>

                      <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                        {OFFICIAL_SYSTEM_ACCOUNTS.map((acc) => (
                          <div 
                            key={acc.username}
                            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:border-amber-400 transition-all flex items-center justify-between gap-2 shadow-2xs"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                  acc.role === 'approver' 
                                    ? 'bg-[#4A1E07] text-amber-300' 
                                    : 'bg-blue-100 text-blue-900'
                                }`}>
                                  {acc.role === 'approver' ? 'ผู้บริหาร / Admin' : 'เจ้าหน้าที่สแกน'}
                                </span>
                                <span className="font-bold text-slate-900 text-xs truncate">
                                  {acc.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono mt-0.5">
                                <span>User: <strong className="text-slate-800">{acc.username}</strong></span>
                                <span>Pass: <strong className="text-slate-800">{acc.password}</strong></span>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleFillCredentials(acc)}
                              className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-[#5C2A0D] rounded-lg text-xs font-black transition-colors shrink-0"
                              title="กรอกชื่อผู้ใช้และรหัสผ่านลงฟอร์มอัตโนมัติ"
                            >
                              กรอกลงฟอร์ม
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 3: PRE-REGISTRATION FLOW */}
            {loginMode === 'preregister' && (
              <div className="space-y-3.5 animate-in fade-in duration-150 text-left">
                <div className="text-center pb-1">
                  <h2 className="text-sm sm:text-base font-black text-slate-800">
                    ลงทะเบียนรับ Digital ID ล่วงหน้า (Fast Track)
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    กรอกข้อมูลนักศึกษาเพื่อสร้างบัตร Digital ID ในการสแกนเช็คอิน
                  </p>
                </div>

                <form onSubmit={handlePreRegister} className="space-y-3 text-left">
                  {/* Student ID */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      รหัสนักศึกษา (Student ID) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={studentId}
                      onChange={(e) => {
                        setStudentId(e.target.value);
                        setError('');
                      }}
                      placeholder="เช่น 66309010001"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C] transition-all"
                      required
                    />
                  </div>

                  {/* Prefix, First, Last */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">คำนำหน้า</label>
                      <select
                        value={prefix}
                        onChange={(e) => setPrefix(e.target.value)}
                        className="w-full px-2 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C]"
                      >
                        <option value="นาย">นาย</option>
                        <option value="นางสาว">นางสาว</option>
                        <option value="นาง">นาง</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        ชื่อ <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="สมชาย"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C]"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        นามสกุล <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="ใจดี"
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C]"
                        required
                      />
                    </div>
                  </div>

                  {/* Major Selection */}
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      สาขาวิชาของนักศึกษา <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-[#EA580C]/20 focus:border-[#EA580C]"
                      required
                    >
                      <optgroup label="สาขาวิชาหลักสูตรระดับปริญญาตรี (ค.บ.) คณะครุศาสตร์">
                        {FACULTY_OF_EDUCATION_MAJORS.map((m) => (
                          <option key={m.id} value={m.name}>
                            • {m.shortName} ({m.degree})
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="หลักสูตรระดับปริญญาตรี (ค.บ.) คณะวิทยาศาสตร์">
                        {OTHER_NPU_MAJORS.map((m) => (
                          <option key={m.id} value={m.name}>
                            • {m.shortName}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  {/* Optional Photo Upload */}
                  <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full border border-amber-300 bg-white overflow-hidden flex items-center justify-center shrink-0">
                        {profileImage ? (
                          <img src={profileImage} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Camera className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">รูปถ่ายนักศึกษา (ทางเลือก)</span>
                        <span className="text-[10px] text-slate-500">สำหรับแสดงบนบัตร Digital ID</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-colors"
                    >
                      {isUploadingPhoto ? 'กำลังโหลด...' : (profileImage ? 'เปลี่ยนรูป' : 'อัปโหลดรูป')}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoSelect}
                      className="hidden"
                    />
                  </div>

                  {error && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-98"
                  >
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>บันทึกและรับ Digital ID (Fast Track) ทันที</span>
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setLoginMode('student');
                        setError('');
                      }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800"
                    >
                      ← กลับไปหน้าเข้าสู่ระบบนักศึกษา
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Standee & Walk-in Promotion Action Bar */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
        <button 
          onClick={() => setShowStandeeModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-amber-50 border-2 border-amber-400 text-amber-950 rounded-full text-xs font-black shadow-xs transition-all active:scale-95"
        >
          <Building className="w-4 h-4 text-[#EA580C]" />
          <span>🪧 แสดงป้าย Standee จุดลงทะเบียน Walk-in หน้างาน (สำหรับพิมพ์/เปิดบนจอ)</span>
        </button>

        <button 
          onClick={() => setShowShareModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-full text-xs font-bold shadow-xs transition-all active:scale-95"
        >
          <Share2 className="w-3.5 h-3.5 text-slate-500" />
          <span>แชร์ลิงก์ให้เพื่อน</span>
        </button>
      </div>

      {/* Standee Modal */}
      <StandeeModal
        isOpen={showStandeeModal}
        onClose={() => setShowStandeeModal(false)}
        onOpenPreRegister={() => {
          setLoginMode('preregister');
          setRegisteredStudentPass(null);
        }}
      />

      {/* Share Modal */}
      {showShareModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative overflow-hidden border border-slate-200">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
                  <Share2 className="w-4 h-4 text-amber-700" />
                  <span>แชร์ระบบบันทึกกิจกรรมประสบการณ์วิชาชีพครู</span>
                </h3>
              </div>
              <button 
                onClick={() => setShowShareModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center p-4 bg-[#FAF9F6] border border-slate-200 rounded-2xl mb-4">
              <QRCodeSVG
                value={typeof window !== 'undefined' ? `${window.location.origin}?mode=preregister` : 'https://npu.ac.th'}
                size={160}
                level="H"
                includeMargin={false}
              />
              <span className="text-[10px] text-slate-500 mt-2 font-medium">สแกนเพื่อเปิดหน้าระบบ</span>
            </div>

            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  navigator.clipboard.writeText(`${window.location.origin}?mode=preregister`);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2500);
                }
              }}
              className="w-full py-2.5 px-4 bg-[#4A1E07] hover:bg-[#60290A] text-amber-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-98"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>คัดลอกลิงก์สำเร็จ!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>คัดลอกลิงก์ระบบกิจกรรม</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
