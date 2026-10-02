import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  AlertTriangle, 
  UserPlus, 
  CheckCircle2, 
  Sparkles, 
  GraduationCap, 
  ShieldAlert,
  ArrowRight,
  Clock
} from 'lucide-react';
import { FACULTY_OF_EDUCATION_MAJORS, OTHER_NPU_MAJORS, isScienceMajor } from '../../data/majors';
import { db, logSystemAction } from '../../db/db';
import { Activity, Student, CheckInLog } from '../../types';

interface EmergencyManualEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeActivity: Activity | null;
  scannerStation: string;
  onSuccess: (student: Student, isDuplicate?: boolean) => void;
}

export const EmergencyManualEntryModal: React.FC<EmergencyManualEntryModalProps> = ({
  isOpen,
  onClose,
  activeActivity,
  scannerStation,
  onSuccess
}) => {
  const [studentId, setStudentId] = useState('');
  const [prefix, setPrefix] = useState('นาย');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [major, setMajor] = useState(FACULTY_OF_EDUCATION_MAJORS[0].name);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const studentIdInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStudentId('');
      setFirstName('');
      setLastName('');
      setError('');
      setTimeout(() => studentIdInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim() || !firstName.trim() || !lastName.trim()) {
      setError('กรุณากรอกรหัสนักศึกษา และ ชื่อ-สกุล ให้ครบถ้วน');
      return;
    }

    if (!activeActivity) {
      setError('ไม่พบกิจกรรมที่เปิดรับการเช็คชื่อ กรุณาเลือกกิจกรรมก่อน');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const cleanId = studentId.trim();
      const fullName = `${prefix}${firstName.trim()} ${lastName.trim()}`;

      // Check if student already exists in DB
      let student = await db.students.get(cleanId);
      if (!student) {
        // Calculate year from student ID
        const yearPrefix = parseInt(cleanId.substring(0, 2), 10);
        const currentYear = 69; // 2569
        const calculatedYear = !isNaN(yearPrefix) ? (currentYear - yearPrefix + 1) : 1;

        const assignedFaculty = isScienceMajor(major) ? 'คณะวิทยาศาสตร์' : 'คณะครุศาสตร์';

        student = {
          id: cleanId,
          name: fullName,
          prefix,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: `${cleanId}@npu.ac.th`,
          major,
          faculty: assignedFaculty,
          university: 'มหาวิทยาลัยนครพนม',
          year: calculatedYear > 0 ? calculatedYear : 1,
          isTemporary: true, // Tagged: emergency account without profile photo
          isPreRegistered: false,
          registeredAt: new Date().toISOString()
        };
        await db.students.put(student);
      } else {
        // Update existing student info if temporary
        if (!student.name || student.name.includes('นักศึกษา (')) {
          student.name = fullName;
          student.prefix = prefix;
          student.firstName = firstName.trim();
          student.lastName = lastName.trim();
          student.major = major;
          student.isTemporary = true;
          await db.students.put(student);
        }
      }

      // Check for duplicate check-in
      const existingLog = await db.checkInLogs
        .where('studentId')
        .equals(cleanId)
        .and(log => log.activityId === activeActivity.id)
        .first();

      if (existingLog) {
        setIsSubmitting(false);
        onSuccess(student, true);
        onClose();
        return;
      }

      // Create check-in log
      const checkInTimestamp = new Date().toISOString();
      const deterministicId = `chk_${activeActivity.id}_${cleanId}`;
      const newLog: CheckInLog = {
        id: deterministicId,
        studentId: cleanId,
        activityId: activeActivity.id,
        timestamp: checkInTimestamp,
        method: 'manual',
        staffStatus: 'verified',
        execStatus: 'pending',
        status: 'checked_in',
        scannerStation,
        syncStatus: 'pending',
        isTemporary: true
      };

      await db.checkInLogs.put(newLog);

      // Audit Trail Logging
      await logSystemAction(
        scannerStation || 'สตาฟฟ์หน้างาน (Staff)',
        'Staff',
        'MANUAL_OVERRIDE_CHECKIN',
        `${student.name} (${cleanId})`,
        `บันทึกเช็คอินฉุกเฉิน (Manual Override) เข้ากิจกรรม: ${activeActivity.name}`,
        scannerStation
      );

      // Trigger sync event
      const broadcastPayload = {
        type: 'check_in',
        studentId: cleanId,
        activityId: activeActivity.id,
        activityName: activeActivity.name,
        timestamp: checkInTimestamp,
        studentName: student.name,
        scannerStation,
        isTemporary: true
      };

      window.dispatchEvent(new CustomEvent('db_updated', { detail: broadcastPayload }));

      try {
        const bc = new BroadcastChannel('npu_db_sync');
        bc.postMessage(broadcastPayload);
        bc.close();
      } catch (err) {}

      setIsSubmitting(false);
      onSuccess(student, false);
      onClose();

    } catch (err: any) {
      console.error('Manual entry error:', err);
      setError(err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border-2 border-slate-900 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="bg-amber-500 text-slate-950 p-4 sm:p-5 flex items-center justify-between border-b-2 border-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-950">
                จุดสแกนเนอร์ฉุกเฉิน • MANUAL ENTRY
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-950 leading-tight">
                บันทึกข้อมูลและเช็คอินฉุกเฉิน
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 bg-slate-950 text-white rounded-lg flex items-center justify-center hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informative Callout Banner */}
        <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-start gap-2.5 text-left">
          <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <strong>เคสฉุกเฉิน:</strong> ใช้กรณีนักศึกษามือถือแบตหมด, ไม่มีสมาร์ตโฟน, บัตรชำรุด หรือยังไม่ได้ลงทะเบียนล่วงหน้า 
            ระบบจะสร้างบัญชีชั่วคราวและเช็คอินเข้างานทันที พร้อมติดธงเตือนให้นักศึกษาอัปเดตภาพถ่ายโปรไฟล์ในภายหลัง
          </div>
        </div>

        {/* Current Activity Box */}
        {activeActivity && (
          <div className="px-5 pt-4 text-left">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase">กิจกรรมปัจจุบัน:</span>
                <p className="text-xs font-black text-slate-900 truncate">{activeActivity.name}</p>
              </div>
              <span className="text-[11px] font-bold text-[#EA580C] bg-orange-50 px-2 py-0.5 rounded border border-orange-200 shrink-0">
                {scannerStation}
              </span>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-left">
          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              รหัสนักศึกษา (Student ID) <span className="text-rose-500">*</span>
            </label>
            <input
              ref={studentIdInputRef}
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="เช่น 66309010001"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-600 transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">คำนำหน้า</label>
              <select
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className="w-full px-2.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="นาย">นาย</option>
                <option value="นางสาว">นางสาว</option>
                <option value="นาง">นาง</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                ชื่อ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="สมชาย"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 block mb-1">
                นามสกุล <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="ใจดี"
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 block mb-1">
              สาขาวิชา (Major)
            </label>
            <select
              value={major}
              onChange={(e) => setMajor(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold outline-none focus:ring-2 focus:ring-amber-500"
            >
              <optgroup label="สาขาวิชาหลักสูตรระดับปริญญาตรี (ค.บ.) คณะครุศาสตร์">
                {FACULTY_OF_EDUCATION_MAJORS.map(m => (
                  <option key={m.id} value={m.name}>• {m.shortName} ({m.degree})</option>
                ))}
              </optgroup>
              <optgroup label="หลักสูตรระดับปริญญาตรี (ค.บ.) คณะวิทยาศาสตร์">
                {OTHER_NPU_MAJORS.map(m => (
                  <option key={m.id} value={m.name}>• {m.shortName}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {error && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-bold">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 text-xs sm:text-sm font-bold hover:bg-slate-50 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs sm:text-sm font-black shadow-md transition-all active:scale-98 flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? 'กำลังบันทึก...' : 'บันทึกและเช็คอินทันที'}</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
