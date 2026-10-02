import React, { useRef, useState } from 'react';
import { 
  Settings, 
  Type, 
  LogOut, 
  ShieldCheck, 
  Database, 
  UserCheck, 
  Camera, 
  HelpCircle,
  Sparkles,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  GraduationCap,
  Edit3,
  BookOpen,
  Lock,
  Key,
  Eye,
  EyeOff
} from 'lucide-react';
import { Student } from '../../types';
import { db } from '../../db/db';
import { compressAndConvertToBase64 } from '../../utils/imageUtils';

interface StudentSettingsTabProps {
  student: Student | null;
  studentId: string;
  studentName: string;
  studentEmail: string;
  onRoleChange?: (role: 'student' | 'staff' | 'approver') => void;
  onLogout?: () => void;
  isUserAdmin?: boolean;
  onUpdateProfileImage?: (newImageUrl: string) => Promise<void>;
  onOpenEditMajor?: () => void;
}

export const StudentSettingsTab: React.FC<StudentSettingsTabProps> = ({
  student,
  studentId,
  studentName,
  studentEmail,
  onRoleChange,
  onLogout,
  isUserAdmin = false,
  onUpdateProfileImage,
  onOpenEditMajor
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordFeedback, setPasswordFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordFeedback(null);

    const actualStudentId = student?.id || studentId;
    const defaultPw = actualStudentId.trim();
    const actualCurrentPw = (student?.password || defaultPw).trim();

    if (!currentPassword.trim()) {
      setPasswordFeedback({ type: 'error', text: 'กรุณากรอกรหัสผ่านปัจจุบัน' });
      return;
    }

    if (currentPassword.trim() !== actualCurrentPw) {
      setPasswordFeedback({ type: 'error', text: 'รหัสผ่านปัจจุบันไม่ถูกต้อง (หากยังไม่เคยเปลี่ยน รหัสผ่านคือรหัสนักศึกษา)' });
      return;
    }

    if (!newPassword.trim() || newPassword.length < 4) {
      setPasswordFeedback({ type: 'error', text: 'รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 4 ตัวอักษร' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: 'error', text: 'รหัสผ่านใหม่และการยืนยันรหัสผ่านไม่ตรงกัน' });
      return;
    }

    setIsSavingPassword(true);
    try {
      await db.students.update(actualStudentId, {
        password: newPassword.trim(),
        isPasswordChanged: true,
        passwordUpdatedAt: new Date().toISOString()
      });

      localStorage.removeItem('student_needs_password_change');
      setPasswordFeedback({ type: 'success', text: 'เปลี่ยนรหัสผ่านสำเร็จเรียบร้อยแล้ว! ใช้งานรหัสผ่านใหม่ในการเข้าสู่ระบบครั้งถัดไป' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      window.dispatchEvent(new CustomEvent('db_updated', { detail: { studentId: actualStudentId } }));
      setTimeout(() => setPasswordFeedback(null), 5000);
    } catch (err: any) {
      setPasswordFeedback({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึกรหัสผ่าน: ' + (err.message || '') });
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateProfileImage) return;

    setIsUploading(true);
    setFeedback(null);
    try {
      const base64 = await compressAndConvertToBase64(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true
      });
      await onUpdateProfileImage(base64);
      setFeedback({ type: 'success', text: 'อัปเดตรูปถ่ายประจำตัวนักศึกษาเรียบร้อยแล้ว' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      console.error('Settings profile image upload error:', err);
      setFeedback({ type: 'error', text: 'ไม่สามารถอัปโหลดรูปภาพได้' });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    if (!onUpdateProfileImage) return;
    if (window.confirm('คุณต้องการลบรูปถ่ายประจำตัวนักศึกษาใช่หรือไม่?')) {
      setIsUploading(true);
      try {
        await onUpdateProfileImage('');
        setFeedback({ type: 'success', text: 'ลบรูปภาพประจำตัวเรียบร้อยแล้ว' });
        setTimeout(() => setFeedback(null), 3000);
      } catch (err) {
        setFeedback({ type: 'error', text: 'เกิดข้อผิดพลาดในการลบรูปภาพ' });
      } finally {
        setIsUploading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-[#F7F4EB] border-2 border-[#18181B] p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
        <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-[#18181B] flex items-center gap-2">
          <Settings className="w-5 h-5 text-[#EA580C]" />
          <span>การตั้งค่าระบบ (SETTINGS & PREFERENCES)</span>
        </h2>
        <p className="text-xs text-stone-600 font-bold mt-0.5">
          จัดการโปรไฟล์ รูปถ่ายประจำตัว และการเชื่อมต่อระบบ
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Account & Profile Summary */}
        <div className="bg-[#F7F4EB] border-2 border-[#18181B] p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-stone-900 border-b-2 border-[#18181B] pb-2">
            ข้อมูลบัญชีผู้ใช้งาน & รูปถ่ายประจำตัว
          </h3>

          {/* Profile Photo Display & Quick Upload */}
          <div className="p-3.5 bg-white border-2 border-stone-300 flex items-center gap-4">
            <div className="relative w-16 h-20 bg-stone-100 border-2 border-black shrink-0 overflow-hidden flex items-center justify-center shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
              {student?.profileImage ? (
                <img src={student.profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center">
                  <span className="text-xl font-black text-stone-800">{(student?.name || studentName).charAt(0)}</span>
                  <span className="text-[7px] font-black block text-stone-400">PHOTO</span>
                </div>
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[#FACC15]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <span className="text-[10px] uppercase font-black tracking-wider text-stone-500 block">
                รูปถ่ายประจำตัวนักศึกษา (STUDENT PHOTO)
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 bg-[#FACC15] hover:bg-[#EAB308] text-black border-2 border-black text-xs font-black uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1 active:translate-x-0.5 active:translate-y-0.5 transition-all"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{student?.profileImage ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}</span>
                </button>
                {student?.profileImage && (
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={handleRemovePhoto}
                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border-2 border-rose-600 text-xs font-black uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1 transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>ลบ</span>
                  </button>
                )}
              </div>
              <input 
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {feedback && (
            <div className={`p-2 border-2 text-xs font-bold flex items-center gap-1.5 ${
              feedback.type === 'success' 
                ? 'bg-emerald-100 border-emerald-600 text-emerald-900' 
                : 'bg-rose-100 border-rose-600 text-rose-900'
            }`}>
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
              <span>{feedback.text}</span>
            </div>
          )}

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 bg-white border-2 border-stone-300">
              <span className="font-bold text-stone-600">ชื่อนักศึกษา:</span>
              <span className="font-black text-stone-900">{student?.name || studentName}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-white border-2 border-stone-300">
              <span className="font-bold text-stone-600">รหัสนักศึกษา:</span>
              <span className="font-mono font-black text-[#EA580C]">{student?.id || studentId}</span>
            </div>

            {/* Academic Major Info & Edit Trigger */}
            <div className="p-2.5 bg-amber-50/60 border-2 border-[#18181B] space-y-1.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between">
                <span className="font-black text-stone-900 flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-[#2563EB]" />
                  <span>สาขาวิชาที่ศึกษา:</span>
                </span>
                {onOpenEditMajor && (
                  <button
                    type="button"
                    onClick={onOpenEditMajor}
                    className="px-2 py-0.5 bg-[#FACC15] hover:bg-[#EAB308] text-black text-[10px] font-black uppercase border border-black rounded shadow-xs flex items-center gap-1 active:translate-x-0.5"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>แก้ไขสาขาวิชา</span>
                  </button>
                )}
              </div>
              <div className="text-xs font-black text-[#2563EB] truncate">
                {student?.major || 'ยังไม่ได้ระบุสาขาวิชา'}
              </div>
              <div className="text-[10px] text-stone-600 font-bold flex items-center gap-2">
                <span>{student?.faculty || 'คณะครุศาสตร์'}</span>
                <span>•</span>
                <span>ชั้นปีที่ {student?.year || 4}</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-white border-2 border-stone-300">
              <span className="font-bold text-stone-600">อีเมลทางการ:</span>
              <span className="font-mono font-bold text-stone-800 truncate max-w-[200px]">{student?.email || studentEmail}</span>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-white border-2 border-stone-300">
              <span className="font-bold text-stone-600">บทบาทปัจจุบัน:</span>
              <span className="px-2 py-0.5 bg-amber-100 border border-amber-400 text-amber-900 font-black text-[10px]">
                STUDENT (นักศึกษา)
              </span>
            </div>
          </div>

          {onLogout && (
            <div className="pt-2">
              <button
                onClick={onLogout}
                className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-2 transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Password Management & Administration */}
        <div className="space-y-6">

          {/* Password & Security Card */}
          <div className="bg-[#F7F4EB] border-2 border-[#18181B] p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#18181B] pb-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-stone-900 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-[#EA580C]" />
                <span>ความปลอดภัยและการเปลี่ยนรหัสผ่าน (PASSWORD)</span>
              </h3>
            </div>

            {/* Current Password Status */}
            <div className="p-3 bg-white border-2 border-stone-300 space-y-1">
              <span className="text-[10px] uppercase font-black tracking-wider text-stone-500 block">
                สถานะรหัสผ่านปัจจุบัน:
              </span>
              <div className="flex items-center gap-2">
                {student?.isPasswordChanged ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 border border-emerald-400 text-emerald-900 rounded-md text-xs font-black">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>รหัสผ่านส่วนตัว (ตั้งค่าแล้ว)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 border border-amber-400 text-amber-900 rounded-md text-xs font-black">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>กำลังใช้รหัสผ่านเริ่มต้น (รหัสนักศึกษา)</span>
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                * รหัสผ่านเริ่มต้นคือรหัสนักศึกษา ({student?.id || studentId}) แนะนำให้ตั้งรหัสผ่านใหม่เพื่อความปลอดภัยของข้อมูลกิจกรรม
              </p>
            </div>

            {/* Change Password Form */}
            <form onSubmit={handleChangePassword} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  รหัสผ่านปัจจุบัน
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="กรอกรหัสผ่านเดิม (เริ่มต้นคือรหัสนักศึกษา)"
                    className="w-full pl-3 pr-9 py-2 bg-white border-2 border-stone-300 text-xs font-mono font-medium outline-none focus:border-[#EA580C] transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showCurrentPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  รหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)
                </label>
                <div className="relative">
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="ตั้งรหัสผ่านใหม่ที่ต้องการ"
                    className="w-full pl-3 pr-9 py-2 bg-white border-2 border-stone-300 text-xs font-mono font-medium outline-none focus:border-[#EA580C] transition-colors"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                  >
                    {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  ยืนยันรหัสผ่านใหม่
                </label>
                <input
                  type={showNewPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="พิมพ์รหัสผ่านใหม่อีกครั้ง"
                  className="w-full px-3 py-2 bg-white border-2 border-stone-300 text-xs font-mono font-medium outline-none focus:border-[#EA580C] transition-colors"
                  required
                />
              </div>

              {passwordFeedback && (
                <div className={`p-2.5 border-2 text-xs font-bold flex items-start gap-2 ${
                  passwordFeedback.type === 'success'
                    ? 'bg-emerald-100 border-emerald-600 text-emerald-950'
                    : 'bg-rose-100 border-rose-600 text-rose-950'
                }`}>
                  {passwordFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <span>{passwordFeedback.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingPassword}
                className="w-full py-2.5 px-4 bg-[#EA580C] hover:bg-[#C2410C] text-white font-black text-xs uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Key className="w-4 h-4" />
                <span>{isSavingPassword ? 'กำลังบันทึกรหัสผ่าน...' : 'บันทึกรหัสผ่านใหม่'}</span>
              </button>
            </form>
          </div>

          {/* Role Switching for Authorized Users */}
          {onRoleChange && isUserAdmin && (
            <div className="bg-[#F7F4EB] border-2 border-[#18181B] p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-stone-900 border-b-2 border-[#18181B] pb-2">
                สิทธิ์ผู้ดูแลระบบ (ADMIN SWITCHER)
              </h3>
              <p className="text-xs text-stone-600 font-medium">
                คุณมีสิทธิ์เข้าถึงโหมดเจ้าหน้าที่สแกนเนอร์และโหมดผู้บริหาร สามารถสลับโหมดได้ที่นี่:
              </p>

              <div className="space-y-2">
                <button
                  onClick={() => onRoleChange('staff')}
                  className="w-full p-2.5 bg-white hover:bg-amber-50 border-2 border-[#18181B] text-xs font-black text-stone-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2.5 transition-all"
                >
                  <div className="w-7 h-7 bg-blue-100 border border-black flex items-center justify-center text-blue-900">
                    <Camera className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="block leading-tight">โหมดเจ้าหน้าที่สแกนเนอร์ (Staff Scanner)</span>
                    <span className="text-[10px] text-stone-500 font-normal">สแกนบาร์โค้ด USB และกล้อง QR เพื่อเช็คอินนักศึกษา</span>
                  </div>
                </button>

                <button
                  onClick={() => onRoleChange('approver')}
                  className="w-full p-2.5 bg-white hover:bg-amber-50 border-2 border-[#18181B] text-xs font-black text-stone-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-2.5 transition-all"
                >
                  <div className="w-7 h-7 bg-emerald-100 border border-black flex items-center justify-center text-emerald-900">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="block leading-tight">โหมดผู้บริหาร / อาจารย์ (Approver Dashboard)</span>
                    <span className="text-[10px] text-stone-500 font-normal">ตรวจประเมิน K-P-A-Moral 5 ด้าน และอนุมัติการเข้าร่วมกิจกรรม</span>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Cloud Sync & Information */}
          <div className="bg-[#F7F4EB] border-2 border-[#18181B] p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-stone-900 border-b-2 border-[#18181B] pb-2">
              ฐานข้อมูลและเซิร์ฟเวอร์
            </h3>

            <div className="p-3 bg-white border-2 border-stone-300 space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-emerald-700 font-bold">
                <Database className="w-4 h-4" />
                <span>Supabase Cloud Sync: ทำงานปกติ (Active)</span>
              </div>
              <p className="text-[11px] text-stone-600">
                ระบบสำรองข้อมูลอัตโนมัติบน Dexie Local IndexedDB และคลาวด์ Supabase
              </p>
            </div>

            <div className="text-[10px] font-mono text-stone-500 pt-1">
              ระบบเช็คอินกิจกรรมและการเรียนรู้ K-P-A • v2.6.0
              <br />
              คณะครุศาสตร์ มหาวิทยาลัยนครพนม
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
