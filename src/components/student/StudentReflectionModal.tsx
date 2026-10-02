import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { Activity, CheckInLog, Reflection } from '../../types';
import { 
  X, 
  Send, 
  Save, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  BookOpen, 
  Award, 
  Heart, 
  Upload, 
  Image as ImageIcon, 
  Trash2,
  Calendar,
  MapPin,
  HelpCircle,
  Lock
} from 'lucide-react';

interface StudentReflectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  logId: string | null;
  studentId: string;
  studentName?: string;
  onSuccess?: () => void;
}

export const StudentReflectionModal: React.FC<StudentReflectionModalProps> = ({
  isOpen,
  onClose,
  logId,
  studentId,
  studentName,
  onSuccess
}) => {
  const [log, setLog] = useState<CheckInLog | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [reflection, setReflection] = useState<Reflection | null>(null);

  // Form fields
  const [knowledge, setKnowledge] = useState('');
  const [practice, setPractice] = useState('');
  const [attitude, setAttitude] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState<string>('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen && logId) {
      loadData(logId);
    } else {
      setLog(null);
      setActivity(null);
      setReflection(null);
      setKnowledge('');
      setPractice('');
      setAttitude('');
      setEvidenceUrl('');
      setFeedbackMsg(null);
    }
  }, [isOpen, logId]);

  const loadData = async (targetLogId: string) => {
    try {
      const currentLog = await db.checkInLogs.get(targetLogId);
      if (!currentLog) return;
      setLog(currentLog);

      const act = await db.activities.get(currentLog.activityId);
      setActivity(act || null);

      // Fetch existing reflection if any
      let ref = await db.reflections.where('logId').equals(targetLogId).first();
      if (!ref) {
        ref = await db.reflections.get(`ref_${targetLogId}`);
      }

      if (ref) {
        setReflection(ref);
        setKnowledge(ref.knowledge || '');
        setPractice(ref.practice || '');
        setAttitude(ref.attitude || '');
        setEvidenceUrl(ref.evidenceUrl || '');
      } else {
        setReflection(null);
        setKnowledge('');
        setPractice('');
        setAttitude('');
        setEvidenceUrl('');
      }
    } catch (e) {
      console.error('Error loading reflection data:', e);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('ขนาดไฟล์ภาพต้องไม่เกิน 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setEvidenceUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (submitStatus: 'draft' | 'pending_step1') => {
    if (!log || !logId) return;

    if (submitStatus === 'pending_step1') {
      if (!knowledge.trim() || !practice.trim() || !attitude.trim()) {
        setFeedbackMsg({ text: 'กรุณากรอกบันทึกการเรียนรู้ให้ครบทั้ง 3 ด้าน (ความรู้, ทักษะ, เจตคติ)', type: 'error' });
        return;
      }
    }

    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      const reflectionId = reflection?.id || `ref_${log.id}`;
      const now = new Date().toISOString();

      const updatedReflection: Reflection = {
        id: reflectionId,
        logId: log.id,
        studentId: log.studentId || studentId,
        activityId: log.activityId,
        knowledge: knowledge.trim(),
        practice: practice.trim(),
        attitude: attitude.trim(),
        evidenceUrl: evidenceUrl || undefined,
        status: submitStatus,
        submittedAt: submitStatus === 'pending_step1' ? now : reflection?.submittedAt
      };

      await db.reflections.put(updatedReflection);

      // Update checkInLog audit trail
      const currentLog = await db.checkInLogs.get(log.id);
      if (currentLog) {
        const newTrail = [...(currentLog.auditTrail || [])];
        newTrail.push({
          action: 'edit',
          timestamp: now,
          details: submitStatus === 'pending_step1' 
            ? 'ส่งบันทึกผลการเข้าร่วมกิจกรรม K-P-A เพื่อรอเจ้าหน้าที่ตรวจสอบขั้นที่ 1' 
            : 'บันทึกร่างผลการเข้าร่วมกิจกรรม K-P-A'
        });
        await db.checkInLogs.put({ ...currentLog, auditTrail: newTrail });
      }

      // Notify other views
      try {
        const bc = new BroadcastChannel('npu_db_sync');
        bc.postMessage({ type: 'CHECKIN_LOG_UPDATED', logId: log.id, timestamp: Date.now() });
        bc.close();
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('db_updated', { detail: { action: 'reflection_submitted', logId: log.id } }));

      setFeedbackMsg({
        text: submitStatus === 'pending_step1' 
          ? 'บันทึกในเครื่องแล้ว แต่ยังไม่ยืนยันว่าข้อมูลถึงเจ้าหน้าที่'
          : 'บันทึกร่างในเครื่องแล้ว',
        type: 'success'
      });

      if (onSuccess) onSuccess();

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('Failed to save reflection:', err);
      setFeedbackMsg({ text: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const isApproved = reflection?.status === 'approved';
  const isPendingStep2 = reflection?.status === 'pending_step2';
  const isPendingStep1 = reflection?.status === 'pending_step1';
  const isLocked = isApproved || isPendingStep2;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-[#F7F4EB] w-full max-w-3xl max-h-[92vh] overflow-y-auto border-4 border-[#18181B] rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col relative animate-in zoom-in-95 duration-200 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 sm:p-5 border-b-2 border-[#18181B] bg-white sticky top-0 z-20">
          <div className="flex items-center gap-3 pr-2">
            <div className="w-10 h-10 bg-[#FACC15] text-[#18181B] flex items-center justify-center rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0 font-black">
              KPA
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#18181B] uppercase tracking-wide leading-tight">
                บันทึกผลการเข้าร่วมกิจกรรม (K-P-A Reflection)
              </h2>
              <p className="text-xs font-bold text-stone-500">
                ขั้นตอนที่ 5: นักศึกษาบันทึกผลการเรียนรู้เพื่อขออนุมัติกิจกรรมสะสม
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-stone-100 hover:bg-rose-100 border-2 border-transparent hover:border-[#18181B] rounded-xl transition-all shrink-0"
          >
            <X className="w-5 h-5 text-[#18181B]" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5">
          
          {/* Activity Banner */}
          <div className="bg-white border-2 border-[#18181B] rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-200 pb-2">
              <span className="px-2.5 py-0.5 bg-[#EA580C] text-white border border-[#18181B] rounded-md text-[10px] font-black uppercase">
                {activity?.category || 'กิจกรรมพัฒนานักศึกษา'}
              </span>
              <span className="text-xs font-black text-[#2563EB] bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                +1 กิจกรรมสะสม
              </span>
            </div>

            <h3 className="text-sm sm:text-base font-black text-[#18181B] leading-snug">
              {activity?.name || 'ไม่ระบุชื่อกิจกรรม'}
            </h3>

            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-[11px] font-bold text-stone-600">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                {activity?.date ? new Date(activity.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : 'ไม่ระบุวันที่'}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-stone-400" />
                {activity?.location || 'คณะครุศาสตร์ ม.นครพนม'}
              </span>
            </div>
          </div>

          {/* Current Approval Workflow Status Tracker */}
          <div className="bg-white border-2 border-[#18181B] rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <div className="text-xs font-black uppercase tracking-wider text-stone-700 mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>ลำดับขั้นตอนการอนุมัติ (9-Step Workflow)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-[11px] font-bold">
              {/* Step 4 */}
              <div className="p-2.5 rounded-lg border-2 border-[#18181B] bg-emerald-100 text-emerald-900">
                <div className="text-[10px] font-black uppercase">4. เช็คอินสำเร็จ</div>
                <div className="text-xs font-black mt-0.5">✓ บันทึกเข้าร่วม</div>
              </div>

              {/* Step 5 */}
              <div className={`p-2.5 rounded-lg border-2 border-[#18181B] ${
                reflection?.submittedAt ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900 animate-pulse'
              }`}>
                <div className="text-[10px] font-black uppercase">5. ส่งบันทึก KPA</div>
                <div className="text-xs font-black mt-0.5">
                  {reflection?.submittedAt ? '✓ ส่งแล้ว' : 'กำลังดำเนินการ'}
                </div>
              </div>

              {/* Step 6 */}
              <div className={`p-2.5 rounded-lg border-2 border-[#18181B] ${
                isApproved || isPendingStep2 ? 'bg-emerald-100 text-emerald-900' : isPendingStep1 ? 'bg-amber-100 text-amber-900' : 'bg-stone-100 text-stone-500 opacity-60'
              }`}>
                <div className="text-[10px] font-black uppercase">6. เจ้าหน้าที่ตรวจ</div>
                <div className="text-xs font-black mt-0.5">
                  {isApproved || isPendingStep2 ? '✓ ผ่านขั้นที่ 1' : isPendingStep1 ? '⏳ รอ จนท. ตรวจ' : 'ยังไม่ถึงขั้นตอน'}
                </div>
              </div>

              {/* Step 7 */}
              <div className={`p-2.5 rounded-lg border-2 border-[#18181B] ${
                isApproved ? 'bg-emerald-400 text-black font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' : 'bg-stone-100 text-stone-500 opacity-60'
              }`}>
                <div className="text-[10px] font-black uppercase">7. ผช.คณบดีอนุมัติ</div>
                <div className="text-xs font-black mt-0.5">
                  {isApproved ? '✓ อนุมัติลง Transcript' : isPendingStep2 ? '⏳ รอ ผช.คณบดี' : 'ยังไม่ถึงขั้นตอน'}
                </div>
              </div>
            </div>
          </div>

          {/* Lock notice if approved or in step 2 */}
          {isLocked && (
            <div className="p-3 bg-emerald-50 border-2 border-emerald-500 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>บันทึกนี้ได้รับการตรวจอนุมัติเรียบร้อยแล้ว ไม่สามารถแก้ไขได้</span>
            </div>
          )}

          {/* K-P-A Self-Reflection Input Forms */}
          <div className="space-y-4">
            
            {/* 1. K - Knowledge */}
            <div className="bg-white border-2 border-[#18181B] rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <label className="text-xs font-black uppercase tracking-wider text-[#18181B] flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-[#2563EB]" />
                  <span>1. ด้านความรู้ (Knowledge) <span className="text-rose-600">*</span></span>
                </label>
                <span className="text-[10px] font-bold text-stone-400">องค์ความรู้ ทฤษฎี หรือแนวคิดที่ได้รับ</span>
              </div>
              <textarea
                disabled={isLocked}
                value={knowledge}
                onChange={(e) => setKnowledge(e.target.value)}
                rows={3}
                placeholder="อธิบายสิ่งที่ได้รับ เช่น ได้เรียนรู้หลักการจัดกิจกรรม เทคนิคการแก้ปัญหา หรือความรู้ใหม่จากวิทยากร"
                className="w-full p-3 bg-stone-50 border-2 border-stone-300 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#FACC15] focus:border-[#18181B] disabled:opacity-75 disabled:bg-stone-100"
              />
            </div>

            {/* 2. P - Practice / Skills */}
            <div className="bg-white border-2 border-[#18181B] rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <label className="text-xs font-black uppercase tracking-wider text-[#18181B] flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#F59E0B]" />
                  <span>2. ด้านทักษะและการปฏิบัติ (Practice / Skills) <span className="text-rose-600">*</span></span>
                </label>
                <span className="text-[10px] font-bold text-stone-400">การลงมือทำ การทำงานร่วมกับผู้อื่น</span>
              </div>
              <textarea
                disabled={isLocked}
                value={practice}
                onChange={(e) => setPractice(e.target.value)}
                rows={3}
                placeholder="อธิบายทักษะที่ได้ฝึกปฏิบัติ เช่น การทำงานเป็นทีม ภาวะผู้นำ การสื่อสาร และการนำไปประยุกต์ใช้ในการเป็นครู"
                className="w-full p-3 bg-stone-50 border-2 border-stone-300 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#FACC15] focus:border-[#18181B] disabled:opacity-75 disabled:bg-stone-100"
              />
            </div>

            {/* 3. A - Attitude / Value */}
            <div className="bg-white border-2 border-[#18181B] rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <label className="text-xs font-black uppercase tracking-wider text-[#18181B] flex items-center gap-1.5">
                  <Heart className="w-4 h-4 text-[#EF4444]" />
                  <span>3. ด้านเจตคติและคุณธรรม (Attitude / Values) <span className="text-rose-600">*</span></span>
                </label>
                <span className="text-[10px] font-bold text-stone-400">ความรู้สึก จิตสำนึก จรรยาบรรณวิชาชีพ</span>
              </div>
              <textarea
                disabled={isLocked}
                value={attitude}
                onChange={(e) => setAttitude(e.target.value)}
                rows={3}
                placeholder="อธิบายเจตคติและความประทับใจ เช่น ความภาคภูมิใจในวิชาชีพครู ความเสียสละ จิตอาสา และความสามัคคี"
                className="w-full p-3 bg-stone-50 border-2 border-stone-300 rounded-xl text-xs font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#FACC15] focus:border-[#18181B] disabled:opacity-75 disabled:bg-stone-100"
              />
            </div>

            {/* 4. Evidence Upload */}
            <div className="bg-white border-2 border-[#18181B] rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black uppercase tracking-wider text-[#18181B] flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-emerald-600" />
                  <span>รูปถ่ายหลักฐานการเข้าร่วมกิจกรรม (Evidence Photo)</span>
                </label>
                <span className="text-[10px] font-bold text-stone-400">ไม่บังคับ (สูงสุด 5MB)</span>
              </div>

              {evidenceUrl ? (
                <div className="relative border-2 border-[#18181B] rounded-xl overflow-hidden max-h-56 bg-stone-100 flex items-center justify-center">
                  <img 
                    src={evidenceUrl} 
                    alt="Evidence" 
                    className="max-h-56 w-auto object-contain"
                  />
                  {!isLocked && (
                    <button
                      onClick={() => setEvidenceUrl('')}
                      className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-lg border-2 border-[#18181B] hover:bg-rose-600 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                      title="ลบรูปภาพ"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ) : !isLocked ? (
                <label className="border-2 border-dashed border-stone-400 hover:border-[#18181B] rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-stone-50 hover:bg-amber-50/50 transition-colors text-center">
                  <Upload className="w-6 h-6 text-stone-400" />
                  <span className="text-xs font-bold text-stone-700">คลิกเพื่ออัปโหลดรูปภาพหลักฐานการเข้าร่วม</span>
                  <span className="text-[10px] text-stone-400 font-medium">รองรับไฟล์ JPG, PNG</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleImageUpload} 
                    className="hidden" 
                  />
                </label>
              ) : (
                <div className="text-xs text-stone-400 font-bold p-3 bg-stone-50 rounded-lg text-center">
                  ไม่มีรูปภาพแนบ
                </div>
              )}
            </div>

          </div>

          {/* Feedback Alert */}
          {feedbackMsg && (
            <div className={`p-3.5 rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xs font-bold flex items-center gap-2 ${
              feedbackMsg.type === 'success' ? 'bg-emerald-100 text-emerald-900 border-emerald-900' : 'bg-rose-100 text-rose-900 border-rose-900'
            }`}>
              {feedbackMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-700 shrink-0" />}
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-3 border-t-2 border-stone-200">
            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-stone-100 border-2 border-[#18181B] rounded-xl text-xs font-bold text-stone-800 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              ปิดหน้าต่าง
            </button>

            {!isLocked && (
              <>
                <button
                  disabled={isSubmitting}
                  onClick={() => handleSave('draft')}
                  className="w-full sm:w-auto px-4 py-2.5 bg-stone-200 hover:bg-stone-300 border-2 border-[#18181B] rounded-xl text-xs font-black text-stone-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>บันทึกร่าง</span>
                </button>

                <button
                  disabled={isSubmitting}
                  onClick={() => handleSave('pending_step1')}
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white border-2 border-[#18181B] rounded-xl text-xs font-black uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-1.5 transition-all active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>ส่งบันทึกผลเข้าร่วม (Submit Step 5) ↗</span>
                </button>
              </>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
