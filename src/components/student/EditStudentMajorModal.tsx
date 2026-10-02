import React, { useState, useEffect } from 'react';
import { 
  X, 
  GraduationCap, 
  Building2, 
  Calendar, 
  Check, 
  Sparkles, 
  AlertCircle, 
  Plus, 
  BookOpen, 
  CheckCircle2, 
  IdCard, 
  Save
} from 'lucide-react';
import { Student } from '../../types';
import { 
  FACULTY_OF_EDUCATION_MAJORS, 
  FACULTY_OF_SCIENCE_MAJORS,
  OTHER_NPU_MAJORS, 
  ALL_STANDARD_MAJORS,
  FACULTIES, 
  getFacultyByMajor,
  getCustomMajors, 
  saveCustomMajor 
} from '../../data/majors';

interface EditStudentMajorModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  studentId: string;
  studentName: string;
  onSave: (updatedFields: { major: string; faculty: string; year: number }) => Promise<void>;
}

export const EditStudentMajorModal: React.FC<EditStudentMajorModalProps> = ({
  isOpen,
  onClose,
  student,
  studentId,
  studentName,
  onSave
}) => {
  const currentMajor = student?.major || 'สาขาวิชาคอมพิวเตอร์ศึกษา';
  const currentFaculty = student?.faculty || 'คณะครุศาสตร์';
  const currentYear = student?.year || 4;

  const [selectedMajorMode, setSelectedMajorMode] = useState<string>(currentMajor);
  const [customMajorInput, setCustomMajorInput] = useState<string>('');
  const [selectedFaculty, setSelectedFaculty] = useState<string>(currentFaculty);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customMajorsList, setCustomMajorsList] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const savedCustom = getCustomMajors();
      setCustomMajorsList(savedCustom);

      const major = student?.major || 'สาขาวิชาคอมพิวเตอร์ศึกษา';
      const faculty = student?.faculty || 'คณะครุศาสตร์';
      const yr = student?.year || 4;

      setSelectedFaculty(faculty);
      setSelectedYear(yr);

      const foundStandard = ALL_STANDARD_MAJORS.find(
        m => m.name === major || 
             m.shortName === major || 
             (major && (m.name.includes(major) || major.includes(m.shortName)))
      );

      if (foundStandard) {
        setSelectedMajorMode(foundStandard.name);
        setSelectedFaculty(foundStandard.faculty);
        setIsCustomMode(false);
        setCustomMajorInput('');
      } else if (savedCustom.includes(major)) {
        setSelectedMajorMode(major);
        setIsCustomMode(false);
        setCustomMajorInput('');
      } else if (major) {
        setSelectedMajorMode('custom');
        setIsCustomMode(true);
        setCustomMajorInput(major);
      } else {
        setSelectedMajorMode(FACULTY_OF_EDUCATION_MAJORS[0].name);
        setSelectedFaculty('คณะครุศาสตร์');
        setIsCustomMode(false);
      }
      setErrorMsg(null);
    }
  }, [isOpen, student]);

  if (!isOpen) return null;

  const handleSelectMajorChange = (val: string) => {
    if (val === '__custom__') {
      setIsCustomMode(true);
      setSelectedMajorMode('custom');
    } else {
      setIsCustomMode(false);
      setSelectedMajorMode(val);

      // Auto-detect matching faculty
      setSelectedFaculty(getFacultyByMajor(val));
    }
    setErrorMsg(null);
  };

  const finalMajorName = isCustomMode ? customMajorInput.trim() : selectedMajorMode;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalMajorName) {
      setErrorMsg('กรุณาระบุชื่อสาขาวิชาของนักศึกษา');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      if (isCustomMode && customMajorInput.trim()) {
        saveCustomMajor(customMajorInput.trim());
      }

      await onSave({
        major: finalMajorName,
        faculty: selectedFaculty,
        year: Number(selectedYear)
      });
      onClose();
    } catch (err: any) {
      console.error('Error saving major:', err);
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-[#FAF9F6] rounded-2xl sm:rounded-3xl max-w-xl w-full border-2 border-[#18181B] shadow-[8px_8px_0px_0px_rgba(24,24,27,1)] flex flex-col overflow-hidden my-auto max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 sm:p-5 bg-[#FAF7F0] border-b-2 border-[#18181B] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EA580C] text-white flex items-center justify-center font-black text-lg border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] shrink-0">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                เพิ่ม / แก้ไขข้อมูลสาขาวิชาของนักศึกษา
              </h2>
              <p className="text-xs text-stone-600 font-bold mt-0.5">
                กำหนดสาขาวิชา, คณะสังกัด และชั้นปี เพื่อออกรายงานและบัตรกิจกรรม
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl border-2 border-[#18181B] bg-white hover:bg-stone-100 text-stone-800 transition-all shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] active:scale-95 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4">
          
          {/* Student Quick Reference */}
          <div className="p-3 bg-white border-2 border-stone-300 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0">
              <span className="text-[10px] font-black uppercase text-stone-500 block">นักศึกษา</span>
              <span className="font-black text-stone-900 truncate block">{student?.name || studentName}</span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-black uppercase text-stone-500 block">รหัสนักศึกษา</span>
              <span className="font-mono font-black text-[#EA580C]">{student?.id || studentId}</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border-2 border-rose-600 text-rose-900 text-xs font-bold rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Major Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#EA580C]" />
              <span>เลือกหรือระบุสาขาวิชา (MAJOR / PROGRAM)</span>
              <span className="text-rose-600">*</span>
            </label>

            <select
              value={isCustomMode ? '__custom__' : selectedMajorMode}
              onChange={(e) => handleSelectMajorChange(e.target.value)}
              className="w-full p-2.5 sm:p-3 bg-white border-2 border-[#18181B] rounded-xl text-xs sm:text-sm font-bold text-stone-900 outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer focus:border-[#EA580C] min-h-[44px]"
            >
              <optgroup label="─── สาขาวิชาหลักสูตรระดับปริญญาตรี (ค.บ.) คณะครุศาสตร์ (9 สาขาวิชา) ───">
                {FACULTY_OF_EDUCATION_MAJORS.map(m => (
                  <option key={m.id} value={m.name}>
                    • {m.shortName} ({m.degree})
                  </option>
                ))}
              </optgroup>

              {customMajorsList.length > 0 && (
                <optgroup label="─── สาขาวิชาที่นักศึกษาเพิ่มไว้ในระบบ ───">
                  {customMajorsList.map((cName, idx) => (
                    <option key={`custom-${idx}`} value={cName}>
                      {cName} (สาขาวิชาที่เพิ่มเอง)
                    </option>
                  ))}
                </optgroup>
              )}

              <optgroup label="─── หลักสูตรระดับปริญญาตรี (ค.บ.) คณะวิทยาศาสตร์ (2 สาขาวิชา) ───">
                {OTHER_NPU_MAJORS.map(m => (
                  <option key={m.id} value={m.name}>
                    • {m.shortName}
                  </option>
                ))}
              </optgroup>

              <optgroup label="─── ต้องการเพิ่มสาขาวิชาใหม่ ───">
                <option value="__custom__">➕ พิมพ์ระบุสาขาวิชาใหม่ด้วยตนเอง (Add Custom Major)...</option>
              </optgroup>
            </select>
          </div>

          {/* Custom Major Input Field if custom selected */}
          {isCustomMode && (
            <div className="p-3.5 bg-amber-50 border-2 border-amber-400 rounded-xl space-y-2 animate-in fade-in duration-200">
              <label className="block text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-amber-700" />
                <span>พิมพ์ชื่อสาขาวิชาใหม่ของคุณ:</span>
              </label>
              <input
                type="text"
                value={customMajorInput}
                onChange={(e) => {
                  setCustomMajorInput(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="เช่น สาขาวิชาการประถมศึกษา, สาขาวิชาฟิสิกส์ศึกษา..."
                className="w-full p-2.5 bg-white border-2 border-black rounded-lg text-xs sm:text-sm font-bold text-stone-900 outline-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] placeholder:text-stone-400 min-h-[44px]"
                autoFocus
              />
              <p className="text-[11px] text-amber-800 font-medium">
                💡 ระบบจะบันทึกสาขาวิชานี้เข้าสู่ระบบของนักศึกษาและเชื่อมโยงกับฐานข้อมูลทันที
              </p>
            </div>
          )}

          {/* Faculty Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-[#2563EB]" />
              <span>คณะ / สังกัด (FACULTY / COLLEGE)</span>
            </label>
            <select
              value={selectedFaculty}
              onChange={(e) => setSelectedFaculty(e.target.value)}
              className="w-full p-2.5 bg-white border-2 border-[#18181B] rounded-xl text-xs sm:text-sm font-bold text-stone-900 outline-none shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] cursor-pointer min-h-[44px]"
            >
              {FACULTIES.map(fac => (
                <option key={fac} value={fac}>{fac}</option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-black text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>ชั้นปีการศึกษา (ACADEMIC YEAR)</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((yr) => (
                <button
                  key={yr}
                  type="button"
                  onClick={() => setSelectedYear(yr)}
                  className={`py-2 px-1 text-center font-black text-xs sm:text-sm border-2 border-[#18181B] rounded-xl transition-all min-h-[44px] ${
                    selectedYear === yr
                      ? 'bg-[#FACC15] text-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] scale-[1.02]'
                      : 'bg-white text-stone-700 hover:bg-stone-50 shadow-xs'
                  }`}
                >
                  ปี {yr}
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="p-3.5 bg-white border-2 border-stone-400 rounded-xl space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 block flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#EA580C]" />
              <span>ตัวอย่างการแสดงผลบนบัตรและใบรายงาน (PREVIEW)</span>
            </span>
            <div className="p-2.5 bg-[#FAF7F0] border border-stone-300 rounded-lg flex items-center justify-between">
              <div>
                <div className="font-black text-xs text-stone-900">{student?.name || studentName}</div>
                <div className="text-[11px] font-black text-[#2563EB] mt-0.5">
                  {finalMajorName || 'ยังไม่ระบุสาขาวิชา'} • ปี {selectedYear}
                </div>
                <div className="text-[10px] text-stone-600">{selectedFaculty} มหาวิทยาลัยนครพนม</div>
              </div>
              <div className="px-2.5 py-1 bg-emerald-100 text-emerald-900 border border-emerald-400 text-[10px] font-black rounded-md">
                ✓ สมบูรณ์
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t-2 border-stone-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs uppercase border-2 border-stone-400 rounded-xl transition-all min-h-[44px]"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2.5 bg-[#EA580C] hover:bg-[#C2410C] text-white font-black text-xs uppercase border-2 border-[#18181B] rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5 min-h-[44px] disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'กำลังบันทึก...' : '💾 บันทึกข้อมูลสาขาวิชา'}</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
