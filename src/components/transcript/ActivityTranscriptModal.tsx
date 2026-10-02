import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../db/db';
import { Student, CheckInLog, Activity, Reflection } from '../../types';
import { 
  X, 
  Printer, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Award, 
  ShieldCheck, 
  FileText, 
  Lock, 
  QrCode,
  Calendar,
  Building,
  GraduationCap
} from 'lucide-react';
import { NPULogo } from '../NPULogo';

interface ActivityTranscriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
}

interface EnrichedLogItem {
  id: string;
  activityId: string;
  activityName: string;
  category: string;
  date: string;
  hours: number;
  grade: string;
  status: string;
}

export const ActivityTranscriptModal: React.FC<ActivityTranscriptModalProps> = ({
  isOpen,
  onClose,
  studentId
}) => {
  const [student, setStudent] = useState<Student | null>(null);
  const [approvedItems, setApprovedItems] = useState<EnrichedLogItem[]>([]);
  const [totalActivitiesCount, setTotalActivitiesCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [criteriaType, setCriteriaType] = useState<'graduation' | 'yearly'>('graduation');

  // Criteria thresholds in activities
  const GRADUATION_REQUIRED_ACTIVITIES = 18;
  const YEARLY_REQUIRED_ACTIVITIES = 5;
  const requiredActivities = criteriaType === 'graduation' ? GRADUATION_REQUIRED_ACTIVITIES : YEARLY_REQUIRED_ACTIVITIES;

  useEffect(() => {
    if (isOpen && studentId) {
      loadTranscriptData(studentId);
    }
  }, [isOpen, studentId]);

  const loadTranscriptData = async (sid: string) => {
    setIsLoading(true);
    try {
      // 1. Fetch Student Profile
      let st = await db.students.get(sid);
      if (!st) {
        st = await db.students.where('id').equalsIgnoreCase(sid).first();
      }
      setStudent(st || null);

      // 2. Fetch all logs for this student
      const allLogs = await db.checkInLogs.toArray();
      const cleanSid = sid.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

      const studentLogs = allLogs.filter(log => {
        if (!log.studentId) return false;
        const cleanLogId = log.studentId.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        return cleanLogId === cleanSid;
      });

      // 3. Fetch reflections & activities
      const allActivities = await db.activities.toArray();
      const actMap = new Map(allActivities.map(a => [a.id, a]));

      const allReflections = await db.reflections.toArray();
      const refMap = new Map(allReflections.map(r => [r.logId || '', r]));

      const enriched: EnrichedLogItem[] = [];

      for (const log of studentLogs) {
        const ref = refMap.get(log.id) || await db.reflections.where('logId').equals(log.id).first();
        const act = actMap.get(log.activityId);

        // Only count if reflection is officially approved by Assistant Dean (Step 7) OR execStatus is approved
        const isApproved = ref?.status === 'approved' || log.execStatus === 'approved';

        if (isApproved) {
          const hours = act?.hours || 3;
          enriched.push({
            id: log.id,
            activityId: log.activityId,
            activityName: act?.name || `กิจกรรมรหัส ${log.activityId}`,
            category: act?.category || 'กิจกรรมเสริมสร้างสมรรถนะวิชาชีพครู',
            date: act?.date || log.timestamp.split('T')[0],
            hours,
            grade: 'ผ่าน (S)',
            status: 'approved'
          });
        }
      }

      // Sort by date ascending
      enriched.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setApprovedItems(enriched);
      setTotalActivitiesCount(enriched.length);
    } catch (e) {
      console.error('Error loading transcript:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  const isQualified = totalActivitiesCount >= requiredActivities;
  const activitiesRemaining = Math.max(0, requiredActivities - totalActivitiesCount);

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="bg-[#F7F4EB] w-full max-w-4xl max-h-[94vh] overflow-y-auto border-4 border-[#18181B] rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col relative animate-in zoom-in-95 duration-200 font-sans my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b-2 border-[#18181B] bg-white sticky top-0 z-20 gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#FACC15] text-[#18181B] flex items-center justify-center font-black border border-[#18181B]">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black text-[#18181B] uppercase tracking-wide">
                ระบบออกใบรับรองทรานสคริปต์กิจกรรม (Activity Transcript)
              </h2>
              <p className="text-[11px] font-bold text-stone-500">
                ตรวจสอบเงื่อนไขการสำเร็จการศึกษา (เกณฑ์ 18 กิจกรรมบังคับ)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {/* Criteria toggle */}
            <div className="inline-flex border-2 border-[#18181B] rounded-lg overflow-hidden text-[11px] font-black">
              <button
                onClick={() => setCriteriaType('graduation')}
                className={`px-2.5 py-1 transition-colors ${
                  criteriaType === 'graduation' ? 'bg-[#18181B] text-[#FACC15]' : 'bg-white text-stone-700'
                }`}
              >
                เกณฑ์จบการศึกษา (18 กิจกรรม)
              </button>
              <button
                onClick={() => setCriteriaType('yearly')}
                className={`px-2.5 py-1 border-l border-[#18181B] transition-colors ${
                  criteriaType === 'yearly' ? 'bg-[#18181B] text-[#FACC15]' : 'bg-white text-stone-700'
                }`}
              >
                เกณฑ์รอบปี (5 กิจกรรม)
              </button>
            </div>

            {/* Print button */}
            <button
              disabled={!isQualified}
              onClick={handlePrint}
              className={`px-4 py-1.5 rounded-xl border-2 border-[#18181B] text-xs font-black flex items-center gap-1.5 transition-all ${
                isQualified 
                  ? 'bg-[#FACC15] hover:bg-amber-400 text-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                  : 'bg-stone-200 text-stone-400 cursor-not-allowed opacity-60'
              }`}
              title={!isQualified ? 'กิจกรรมยังไม่ครบตามเกณฑ์ ไม่อนุญาตให้พิมพ์' : 'พิมพ์ใบรายงานผลกิจกรรม'}
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ Transcript</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 bg-stone-100 hover:bg-rose-100 border-2 border-transparent hover:border-[#18181B] rounded-xl transition-all"
            >
              <X className="w-5 h-5 text-[#18181B]" />
            </button>
          </div>
        </div>

        {/* Qualification Alert Banner (Hidden on print) */}
        <div className="no-print p-4">
          {isQualified ? (
            <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-xl flex items-start gap-3 text-emerald-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-black text-sm text-emerald-950">
                  ✓ ผ่านเกณฑ์การเข้าร่วมกิจกรรมสมบูรณ์ (QUALIFIED)
                </div>
                <div className="text-xs text-emerald-800 mt-0.5 font-medium">
                  นักศึกษาได้สะสมกิจกรรมครบถ้วน <strong>{totalActivitiesCount} / {requiredActivities} กิจกรรม</strong> ผ่านการอนุมัติครบทั้ง 2 ขั้นตอนโดยผู้ช่วยคณบดีฝ่ายพัฒนานักศึกษา สามารถออกใบรายงานผลการเข้าร่วมกิจกรรมสะสมได้อย่างเป็นทางการ
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-rose-50 border-2 border-rose-500 rounded-xl flex items-start gap-3 text-rose-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Lock className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="font-black text-sm text-rose-950 flex items-center gap-2">
                  <span>❌ กิจกรรมยังไม่ครบตามเกณฑ์ - ไม่อนุญาตให้ออกใบรับรอง (INCOMPLETE)</span>
                </div>
                <div className="text-xs text-rose-800 mt-1 font-medium leading-relaxed">
                  ตามข้อบังคับมหาวิทยาลัยนครพนมว่าด้วยกิจกรรมพัฒนานักศึกษา นักศึกษาต้องสะสมกิจกรรมที่ผ่านการอนุมัติอย่างน้อย <strong>{requiredActivities} กิจกรรม</strong> <br />
                  ปัจจุบันนักศึกษาคนนี้มีกิจกรรมที่อนุมัติแล้ว <strong>{totalActivitiesCount} กิจกรรม</strong> (ยังขาดอีก <strong className="text-rose-900 underline">{activitiesRemaining} กิจกรรม</strong>)
                </div>
                <div className="mt-3 w-full bg-stone-200 h-2.5 rounded-full overflow-hidden border border-rose-300">
                  <div 
                    className="bg-rose-500 h-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((totalActivitiesCount / requiredActivities) * 100))}%` }}
                  />
                </div>
                <div className="text-[10px] font-bold text-rose-700 mt-1 flex justify-between">
                  <span>สะสมแล้ว {totalActivitiesCount} กิจกรรม</span>
                  <span>เป้าหมาย {requiredActivities} กิจกรรม ({Math.round((totalActivitiesCount / requiredActivities) * 100)}%)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* OFFICIAL TRANSCRIPT DOCUMENT CANVAS (PRINTABLE CERTIFICATE)               */}
        {/* ========================================================================= */}
        <div className="p-4 sm:p-8 bg-white mx-4 mb-6 border-2 border-[#18181B] rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] print:border-none print:shadow-none print:m-0 print:p-0">
          
          {/* Header Section */}
          <div className="text-center space-y-1 pb-4 border-b-2 border-stone-800">
            <div className="w-16 h-16 mx-auto mb-2 flex items-center justify-center">
              <NPULogo size="lg" />
            </div>
            <h1 className="text-lg sm:text-xl font-black text-stone-900 tracking-wide">
              คณะครุศาสตร์ มหาวิทยาลัยนครพนม
            </h1>
            <h2 className="text-xs sm:text-sm font-bold text-stone-700 uppercase tracking-wider">
              FACULTY OF EDUCATION, NAKHON PHANOM UNIVERSITY
            </h2>
            <div className="pt-2">
              <span className="inline-block px-3 py-1 bg-stone-100 border border-stone-800 text-xs sm:text-sm font-black text-stone-900 uppercase tracking-wide">
                ใบรายงานผลการเข้าร่วมกิจกรรมพัฒนานักศึกษา (ACTIVITY TRANSCRIPT)
              </span>
            </div>
            <p className="text-[10px] text-stone-500 font-mono pt-0.5">
              เอกสารรับรองมาตรฐานสมรรถนะครูและจิตวิญญาณความเป็นครู มหาวิทยาลัยนครพนม
            </p>
          </div>

          {/* Student Profile Metadata Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 py-4 border-b border-stone-300 text-xs text-stone-800 font-medium">
            <div>
              <span className="font-bold text-stone-500">ชื่อ-นามสกุล: </span>
              <span className="font-black text-stone-900 text-sm">{student?.name || `รหัสนักศึกษา ${studentId}`}</span>
            </div>
            <div>
              <span className="font-bold text-stone-500">รหัสนักศึกษา: </span>
              <span className="font-mono font-black text-stone-900">{student?.id || studentId}</span>
            </div>
            <div>
              <span className="font-bold text-stone-500">สาขาวิชา: </span>
              <span className="font-bold text-stone-900">{student?.major || 'สาขาวิชาคอมพิวเตอร์ศึกษา'}</span>
            </div>
            <div>
              <span className="font-bold text-stone-500">คณะ / สถาบัน: </span>
              <span className="font-bold text-stone-900">{student?.faculty || 'คณะครุศาสตร์'} มหาวิทยาลัยนครพนม</span>
            </div>
            <div>
              <span className="font-bold text-stone-500">หลักสูตร: </span>
              <span className="font-bold text-stone-900">ครุศาสตรบัณฑิต (ค.บ. 4 ปี)</span>
            </div>
            <div>
              <span className="font-bold text-stone-500">สถานะเกณฑ์กิจกรรม: </span>
              <span className={`font-black uppercase ${isQualified ? 'text-emerald-700' : 'text-rose-600'}`}>
                {isQualified ? '✓ ผ่านเกณฑ์สำเร็จการศึกษา' : `✗ ยังไม่ครบ (ขาดอีก ${activitiesRemaining} กิจกรรม)`}
              </span>
            </div>
          </div>

          {/* Activities Table */}
          <div className="py-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-stone-900 mb-2">
              รายการกิจกรรมที่ผ่านการประเมินผลสะท้อนคิด (K-P-A Evaluation Completed)
            </h3>

            {approvedItems.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-stone-300 rounded-lg text-xs text-stone-500">
                ยังไม่มีรายการกิจกรรมที่ผ่านการอนุมัติสมบูรณ์ในระบบ
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse border border-stone-400">
                <thead>
                  <tr className="bg-stone-100 text-stone-800 font-bold border-b border-stone-400 text-[11px]">
                    <th className="p-2 border-r border-stone-400 w-8 text-center">ลำดับ</th>
                    <th className="p-2 border-r border-stone-400">ชื่อโครงการ / กิจกรรม</th>
                    <th className="p-2 border-r border-stone-400">หมวดหมู่กิจกรรม</th>
                    <th className="p-2 border-r border-stone-400 text-center w-24">วันที่จัด</th>
                    <th className="p-2 border-r border-stone-400 text-center w-24">การนับกิจกรรม</th>
                    <th className="p-2 text-center w-16">ผลการประเมิน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-300">
                  {approvedItems.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-stone-50">
                      <td className="p-2 border-r border-stone-400 text-center font-mono font-bold text-stone-600">
                        {idx + 1}
                      </td>
                      <td className="p-2 border-r border-stone-400 font-bold text-stone-900">
                        {item.activityName}
                      </td>
                      <td className="p-2 border-r border-stone-400 text-stone-600 text-[11px]">
                        {item.category}
                      </td>
                      <td className="p-2 border-r border-stone-400 text-center font-mono text-stone-600 text-[11px]">
                        {item.date}
                      </td>
                      <td className="p-2 border-r border-stone-400 text-center font-mono font-bold text-stone-900">
                        1 กิจกรรม
                      </td>
                      <td className="p-2 text-center font-black text-emerald-700">
                        {item.grade}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-100 border-t-2 border-stone-400 font-black text-xs">
                    <td colSpan={4} className="p-2.5 text-right border-r border-stone-400">
                      รวมจำนวนกิจกรรมสะสมสุทธิ (TOTAL ACTIVITIES COMPLETED):
                    </td>
                    <td className="p-2.5 text-center font-mono text-sm text-[#2563EB] border-r border-stone-400">
                      {totalActivitiesCount} / {requiredActivities}
                    </td>
                    <td className="p-2.5 text-center text-stone-800">
                      กิจกรรม
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>

          {/* Transcript Signatures & Certification Block */}
          <div className="pt-8 border-t-2 border-stone-800 mt-6 grid grid-cols-3 gap-4 text-center text-xs text-stone-800">
            {/* Signature 1 */}
            <div className="space-y-12">
              <div className="text-[11px] font-bold text-stone-600">ผู้ตรวจสอบข้อมูล</div>
              <div className="border-b border-dashed border-stone-400 w-36 mx-auto" />
              <div className="leading-tight">
                <div className="font-bold">( นายชาญชัย มิ่งขวัญ )</div>
                <div className="text-[10px] text-stone-500 mt-0.5">เจ้าหน้าที่งานพัฒนานักศึกษา</div>
              </div>
            </div>

            {/* Signature 2 (Step 7 Approver) */}
            <div className="space-y-12">
              <div className="text-[11px] font-bold text-stone-600">ผู้ตรวจอนุมัติบันทึก</div>
              <div className="border-b border-dashed border-stone-400 w-44 mx-auto" />
              <div className="leading-tight">
                <div className="font-bold">( ผศ.ดร.ศรีสุดา ด้วงโต้ด )</div>
                <div className="text-[10px] text-stone-500 mt-0.5">ผู้ช่วยคณบดีฝ่ายพัฒนานักศึกษา</div>
              </div>
            </div>

            {/* Signature 3 (Dean) */}
            <div className="space-y-12">
              <div className="text-[11px] font-bold text-stone-600">ผู้อนุมัติการสำเร็จกิจกรรม</div>
              <div className="border-b border-dashed border-stone-400 w-40 mx-auto" />
              <div className="leading-tight">
                <div className="font-bold">( รศ.ดร.คณบดี คณะครุศาสตร์ )</div>
                <div className="text-[10px] text-stone-500 mt-0.5">คณบดีคณะครุศาสตร์</div>
              </div>
            </div>
          </div>

          {/* Official Verification QR & Date */}
          <div className="mt-8 pt-4 border-t border-stone-200 flex items-center justify-between text-[10px] text-stone-400 font-mono">
            <div>
              วันที่ออกเอกสาร: {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>เอกสารฉบับนี้ออกโดยระบบบริหารจัดการกิจกรรม คณะครุศาสตร์ ม.นครพนม (รหัสตรวจ: NPU-ACT-{studentId}-{Date.now().toString().slice(-6)})</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
