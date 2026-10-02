import React, { useState, useEffect } from 'react';
import { db } from '../../db/db';
import { CheckInLog, Student, Activity, Reflection } from '../../types';
import { getEvidenceUrl, reviewReflection } from '../../services/reflectionRepository';
import { 
  CheckCircle2, 
  XCircle, 
  Search, 
  Clock, 
  Calendar, 
  Check, 
  X, 
  AlertCircle,
  Eye,
  Send,
  BookOpen,
  Award,
  Heart,
  Image as ImageIcon,
  UserCheck,
  ChevronRight,
  Filter
} from 'lucide-react';

interface EnrichedSubmission {
  log: CheckInLog;
  reflection: Reflection;
  student: Student | null;
  activity: Activity | null;
}

interface StaffReviewTabProps {
  staffName?: string;
  onNavigateToScanner?: () => void;
}

export const StaffReviewTab: React.FC<StaffReviewTabProps> = ({
  staffName = 'เจ้าหน้าที่จุดสแกน (Staff)',
  onNavigateToScanner
}) => {
  const [submissions, setSubmissions] = useState<EnrichedSubmission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLogIds, setSelectedLogIds] = useState<Set<string>>(new Set());
  const [activeDetailSubmission, setActiveDetailSubmission] = useState<EnrichedSubmission | null>(null);
  const [evidencePreviewUrl, setEvidencePreviewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    loadPendingSubmissions();

    const handleSync = () => {
      loadPendingSubmissions();
    };
    window.addEventListener('db_updated', handleSync);
    return () => window.removeEventListener('db_updated', handleSync);
  }, []);

  useEffect(() => {
    const ref = activeDetailSubmission?.reflection;
    setEvidencePreviewUrl(ref?.evidenceUrl || '');
    if (ref?.evidencePath) getEvidenceUrl(ref.evidencePath).then(setEvidencePreviewUrl).catch(() => setEvidencePreviewUrl(''));
  }, [activeDetailSubmission]);

  const loadPendingSubmissions = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch all reflections waiting for Step 1 review
      const allReflections = await db.reflections.toArray();
      const pendingStep1Refs = allReflections.filter(r => r.status === 'pending_step1');

      // Also find checkInLogs that may not have reflection table row yet but marked
      const allLogs = await db.checkInLogs.toArray();
      const logsMap = new Map(allLogs.map(l => [l.id, l]));

      const allStudents = await db.students.toArray();
      const studentsMap = new Map(allStudents.map(s => [s.id, s]));

      const allActivities = await db.activities.toArray();
      const activitiesMap = new Map(allActivities.map(a => [a.id, a]));

      const list: EnrichedSubmission[] = [];

      for (const ref of pendingStep1Refs) {
        if (!ref.logId) continue;
        const log = logsMap.get(ref.logId);
        if (!log) continue;

        const student = studentsMap.get(ref.studentId || log.studentId) || null;
        const activity = activitiesMap.get(ref.activityId || log.activityId) || null;

        list.push({
          log,
          reflection: ref,
          student,
          activity
        });
      }

      // Sort newest submission first
      list.sort((a, b) => {
        const timeA = a.reflection.submittedAt ? new Date(a.reflection.submittedAt).getTime() : 0;
        const timeB = b.reflection.submittedAt ? new Date(b.reflection.submittedAt).getTime() : 0;
        return timeB - timeA;
      });

      setSubmissions(list);
      setSelectedLogIds(new Set());
    } catch (e) {
      console.error('Error loading pending submissions:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveStep1 = async (submission: EnrichedSubmission) => {
    try {
      const now = new Date().toISOString();

      // 1. Update reflection status to pending_step2 (sent to Assistant Dean)
      await reviewReflection(submission.reflection, submission.log.id, 'pending_step2');

      // 3. Notify system
      try {
        const bc = new BroadcastChannel('npu_db_sync');
        bc.postMessage({ type: 'CHECKIN_LOG_UPDATED', logId: submission.log.id, timestamp: Date.now() });
        bc.close();
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('db_updated', { detail: { action: 'step1_approved', logId: submission.log.id } }));

      setFeedback(`✓ อนุมัติบันทึกของ ${submission.student?.name || submission.log.studentId} แล้ว! ส่งต่อให้ผู้ช่วยคณบดี (ขั้นตอนที่ 7)`);
      setTimeout(() => setFeedback(null), 3000);

      setActiveDetailSubmission(null);
      loadPendingSubmissions();
    } catch (err) {
      console.error('Failed to approve step 1:', err);
      alert('เกิดข้อผิดพลาดในการอนุมัติ');
    }
  };

  const handleBulkApproveStep1 = async () => {
    if (selectedLogIds.size === 0) return;
    const targets = submissions.filter(s => selectedLogIds.has(s.log.id));
    if (targets.length === 0) return;

    try {
      const now = new Date().toISOString();
      for (const s of targets) await reviewReflection(s.reflection, s.log.id, 'pending_step2');

      try {
        const bc = new BroadcastChannel('npu_db_sync');
        bc.postMessage({ type: 'BULK_UPDATE', timestamp: Date.now() });
        bc.close();
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('db_updated', { detail: { action: 'bulk_step1_approved' } }));

      setFeedback(`✓ อนุมัติส่งผู้ช่วยคณบดีสำเร็จจำนวน ${targets.length} รายการ`);
      setTimeout(() => setFeedback(null), 3000);
      loadPendingSubmissions();
    } catch (e) {
      console.error('Error bulk approving:', e);
    }
  };

  const handleRejectStep1 = async (submission: EnrichedSubmission) => {
    const reason = prompt('กรุณาระบุเหตุผลในการส่งกลับให้นักศึกษาแก้ไข (เช่น ข้อมูลไม่สมบูรณ์, ไม่แนบรูปภาพ):');
    if (reason === null) return;

    try {
      await reviewReflection(submission.reflection, submission.log.id, 'rejected', reason || 'ขอให้แก้ไขบันทึกผลการเรียนรู้ K-P-A เพิ่มเติม');

      try {
        const bc = new BroadcastChannel('npu_db_sync');
        bc.postMessage({ type: 'CHECKIN_LOG_UPDATED', logId: submission.log.id });
        bc.close();
      } catch (e) {}
      window.dispatchEvent(new CustomEvent('db_updated', { detail: { action: 'step1_rejected', logId: submission.log.id } }));

      setActiveDetailSubmission(null);
      loadPendingSubmissions();
    } catch (e) {
      console.error('Reject error:', e);
    }
  };

  const filtered = submissions.filter(s => {
    const q = searchQuery.toLowerCase();
    const stName = s.student?.name?.toLowerCase() || '';
    const stId = s.student?.id || s.log.studentId || '';
    const actName = s.activity?.name?.toLowerCase() || '';
    const major = s.student?.major?.toLowerCase() || '';
    return stName.includes(q) || stId.includes(q) || actName.includes(q) || major.includes(q);
  });

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md text-[10px] font-black uppercase mb-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>ขั้นตอนที่ 6 (Step 6 of 9)</span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-[#18181B] uppercase tracking-wide">
            ตรวจอนุมัติบันทึกผลกิจกรรม (Staff Review - ขั้นที่ 1)
          </h2>
          <p className="text-xs text-stone-500 font-bold">
            เจ้าหน้าที่ตรวจสอบรายงานการเรียนรู้ K-P-A และส่งต่อไปยังผู้ช่วยคณบดีฝ่ายพัฒนานักศึกษา
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedLogIds.size > 0 && (
            <button
              onClick={handleBulkApproveStep1}
              className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xs font-black flex items-center gap-1.5 whitespace-nowrap transition-all"
            >
              <Send className="w-4 h-4" />
              <span>อนุมัติส่งผู้ช่วยคณบดี ({selectedLogIds.size})</span>
            </button>
          )}

          {onNavigateToScanner && (
            <button
              onClick={onNavigateToScanner}
              className="px-3 py-2 bg-[#FACC15] hover:bg-amber-400 text-[#18181B] rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xs font-black transition-all"
            >
              📷 ไปสถานีสแกน
            </button>
          )}
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div className="p-3 bg-emerald-100 border-2 border-emerald-800 rounded-xl text-emerald-950 text-xs font-black flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Search and Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อนักศึกษา, รหัสนักศึกษา, สาขาวิชา, กิจกรรม..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border-2 border-[#18181B] rounded-xl text-xs font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-[#FACC15] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
          />
        </div>
      </div>

      {/* Submissions Table / Cards */}
      {isLoading ? (
        <div className="py-12 text-center text-xs font-bold text-stone-500 bg-white border-2 border-dashed border-stone-300 rounded-xl">
          กำลังโหลดรายการรอตรวจ...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center text-stone-400 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <CheckCircle2 className="w-12 h-12 mb-2 text-emerald-500" />
          <p className="text-sm font-black text-stone-800">ไม่มีรายการค้างตรวจในขั้นที่ 1</p>
          <p className="text-xs font-bold text-stone-500 mt-0.5">
            เมื่อนักศึกษาสแกนและส่งผล K-P-A แล้ว รายการจะปรากฏที่นี่ทันที
          </p>
        </div>
      ) : (
        <div className="bg-white border-2 border-[#18181B] rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
          <div className="p-3 bg-stone-100 border-b-2 border-[#18181B] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox"
                checked={selectedLogIds.size === filtered.length && filtered.length > 0}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedLogIds(new Set(filtered.map(f => f.log.id)));
                  } else {
                    setSelectedLogIds(new Set());
                  }
                }}
                className="w-4 h-4 accent-[#18181B] rounded cursor-pointer"
              />
              <span className="text-xs font-black text-stone-700">
                เลือกทั้งหมด ({filtered.length} รายการ)
              </span>
            </div>
            <span className="text-[11px] font-bold text-stone-500">
              คลิกแถวหรือปุ่ม "ตรวจบันทึก" เพื่อดูรายละเอียด K-P-A
            </span>
          </div>

          <div className="divide-y divide-stone-200">
            {filtered.map((item) => {
              const isSelected = selectedLogIds.has(item.log.id);
              const submittedDate = item.reflection.submittedAt 
                ? new Date(item.reflection.submittedAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : '-';

              return (
                <div 
                  key={item.log.id} 
                  className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    isSelected ? 'bg-amber-50/70' : 'hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <input 
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        const next = new Set(selectedLogIds);
                        if (e.target.checked) next.add(item.log.id);
                        else next.delete(item.log.id);
                        setSelectedLogIds(next);
                      }}
                      className="w-4 h-4 mt-1 accent-[#18181B] rounded cursor-pointer shrink-0"
                    />

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-sm text-[#18181B]">
                          {item.student?.name || `รหัสนักศึกษา ${item.log.studentId}`}
                        </span>
                        <span className="text-xs font-mono font-bold text-stone-500">
                          ({item.student?.id || item.log.studentId})
                        </span>
                        <span className="text-[10px] font-bold bg-stone-100 text-stone-700 px-2 py-0.5 rounded border border-stone-300">
                          {item.student?.major || 'สาขาวิชาคอมพิวเตอร์ศึกษา'}
                        </span>
                      </div>

                      <div className="font-bold text-xs text-stone-800 mt-1 truncate">
                        {item.activity?.name || `กิจกรรมรหัส ${item.log.activityId}`}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-stone-500 font-medium mt-1">
                        <span>ส่งเมื่อ: {submittedDate} น.</span>
                        <span className="text-blue-700 font-bold">+3 ชม. กิจกรรม</span>
                        {(item.reflection.evidenceUrl || item.reflection.evidencePath) && (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <ImageIcon className="w-3 h-3" /> มีรูปภาพหลักฐาน
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-200">
                    <button
                      onClick={() => setActiveDetailSubmission(item)}
                      className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-900 border-2 border-[#18181B] rounded-xl text-xs font-black flex items-center gap-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>ตรวจบันทึก</span>
                    </button>

                    <button
                      onClick={() => handleApproveStep1(item)}
                      className="px-3 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white border-2 border-[#18181B] rounded-xl text-xs font-black flex items-center gap-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>ส่งผู้ช่วยคณบดี</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail Review Modal */}
      {activeDetailSubmission && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-[#F7F4EB] w-full max-w-2xl max-h-[90vh] overflow-y-auto border-4 border-[#18181B] rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col relative animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b-2 border-[#18181B] bg-white sticky top-0 z-20">
              <div>
                <h3 className="text-base font-black text-[#18181B]">
                  ตรวจสอบบันทึกผลการเข้าร่วม (Step 6)
                </h3>
                <p className="text-xs font-bold text-stone-500">
                  {activeDetailSubmission.student?.name} ({activeDetailSubmission.student?.id || activeDetailSubmission.log.studentId})
                </p>
              </div>
              <button 
                onClick={() => setActiveDetailSubmission(null)}
                className="p-1.5 bg-stone-100 hover:bg-rose-100 border-2 border-transparent hover:border-[#18181B] rounded-xl transition-all"
              >
                <X className="w-5 h-5 text-[#18181B]" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 text-xs font-sans">
              
              {/* Activity Info */}
              <div className="bg-white p-3.5 border-2 border-[#18181B] rounded-xl space-y-1">
                <div className="text-[10px] font-black uppercase text-stone-400">ข้อมูลกิจกรรม</div>
                <div className="text-sm font-black text-[#18181B]">
                  {activeDetailSubmission.activity?.name}
                </div>
                <div className="text-stone-600 font-bold text-[11px]">
                  สาขา: {activeDetailSubmission.student?.major} • วันที่: {activeDetailSubmission.activity?.date}
                </div>
              </div>

              {/* 1. Knowledge */}
              <div className="bg-white p-4 border-2 border-[#18181B] rounded-xl space-y-1.5">
                <div className="font-black text-[#18181B] flex items-center gap-1.5 text-xs uppercase">
                  <BookOpen className="w-4 h-4 text-[#2563EB]" />
                  <span>1. ด้านความรู้ (Knowledge)</span>
                </div>
                <div className="text-stone-800 font-medium whitespace-pre-wrap bg-stone-50 p-2.5 rounded-lg border border-stone-200 leading-relaxed">
                  {activeDetailSubmission.reflection.knowledge || '- ไม่ได้ระบุ -'}
                </div>
              </div>

              {/* 2. Practice */}
              <div className="bg-white p-4 border-2 border-[#18181B] rounded-xl space-y-1.5">
                <div className="font-black text-[#18181B] flex items-center gap-1.5 text-xs uppercase">
                  <Award className="w-4 h-4 text-[#F59E0B]" />
                  <span>2. ด้านทักษะและการปฏิบัติ (Practice / Skills)</span>
                </div>
                <div className="text-stone-800 font-medium whitespace-pre-wrap bg-stone-50 p-2.5 rounded-lg border border-stone-200 leading-relaxed">
                  {activeDetailSubmission.reflection.practice || '- ไม่ได้ระบุ -'}
                </div>
              </div>

              {/* 3. Attitude */}
              <div className="bg-white p-4 border-2 border-[#18181B] rounded-xl space-y-1.5">
                <div className="font-black text-[#18181B] flex items-center gap-1.5 text-xs uppercase">
                  <Heart className="w-4 h-4 text-[#EF4444]" />
                  <span>3. ด้านเจตคติและคุณธรรม (Attitude / Values)</span>
                </div>
                <div className="text-stone-800 font-medium whitespace-pre-wrap bg-stone-50 p-2.5 rounded-lg border border-stone-200 leading-relaxed">
                  {activeDetailSubmission.reflection.attitude || '- ไม่ได้ระบุ -'}
                </div>
              </div>

              {/* Evidence Photo */}
              {evidencePreviewUrl && (
                <div className="bg-white p-4 border-2 border-[#18181B] rounded-xl space-y-2">
                  <div className="font-black text-[#18181B] flex items-center gap-1.5 text-xs uppercase">
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                    <span>รูปภาพหลักฐานการเข้าร่วม</span>
                  </div>
                  <div className="border-2 border-stone-200 rounded-lg overflow-hidden max-h-60 bg-stone-100 flex items-center justify-center">
                    <img 
                      src={evidencePreviewUrl}
                      alt="Proof" 
                      className="max-h-60 w-auto object-contain"
                    />
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t-2 border-stone-200">
                <button
                  onClick={() => handleRejectStep1(activeDetailSubmission)}
                  className="w-full sm:w-auto px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border-2 border-rose-300 rounded-xl font-black text-xs transition-colors"
                >
                  ส่งกลับให้นักศึกษาแก้ไข
                </button>

                <button
                  onClick={() => handleApproveStep1(activeDetailSubmission)}
                  className="w-full sm:w-auto px-6 py-2 bg-[#2563EB] hover:bg-blue-700 text-white border-2 border-[#18181B] rounded-xl font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-1.5"
                >
                  <Send className="w-4 h-4" />
                  <span>อนุมัติส่งผู้ช่วยคณบดี (ขั้นตอนที่ 7) ↗</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
