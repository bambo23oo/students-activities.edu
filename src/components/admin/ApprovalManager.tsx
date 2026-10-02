import React, { useState, useEffect } from 'react';
import { db, logSystemAction } from '../../db/db';
import { CheckInLog, Student, Activity, Reflection } from '../../types';
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
  BookOpen,
  Award,
  Heart,
  Image as ImageIcon,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import dayjs from 'dayjs';

interface EnrichedLog extends CheckInLog {
  studentName: string;
  major: string;
  activityName: string;
  activityDate: string;
  hours: number;
  reflection?: Reflection;
}

export const ApprovalManager: React.FC = () => {
  const [pendingLogs, setPendingLogs] = useState<EnrichedLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeModalItem, setActiveModalItem] = useState<EnrichedLog | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Approval / Rejection Safety Modals
  const [rejectTarget, setRejectTarget] = useState<EnrichedLog | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [confirmApproveTarget, setConfirmApproveTarget] = useState<EnrichedLog | null>(null);

  const approverName = 'ผศ.ดร.ศรีสุดา ด้วงโต้ด (ผู้ช่วยคณบดีฝ่ายพัฒนานักศึกษา)';

  useEffect(() => {
    loadPendingLogs();

    const handleSync = () => {
      loadPendingLogs();
    };
    window.addEventListener('db_updated', handleSync);
    return () => window.removeEventListener('db_updated', handleSync);
  }, []);

  const loadPendingLogs = async () => {
    // Step 7: Approved by staff (staffStatus === 'verified') and waiting for Assistant Dean (execStatus === 'pending')
    const logs = await db.checkInLogs.filter(log => log.staffStatus === 'verified' && log.execStatus === 'pending').toArray();
    
    const enriched = await Promise.all(logs.map(async (log) => {
      const student = await db.students.get(log.studentId);
      const activity = await db.activities.get(log.activityId);
      let reflection = await db.reflections.where('logId').equals(log.id).first();
      if (!reflection) {
        reflection = await db.reflections.get(`ref_${log.id}`);
      }

      return {
        ...log,
        studentName: student?.name || `รหัส ${log.studentId}`,
        major: student?.major || 'สาขาวิชาคอมพิวเตอร์ศึกษา',
        activityName: activity?.name || `กิจกรรมรหัส ${log.activityId}`,
        activityDate: activity?.date || '',
        hours: activity?.hours || 3,
        reflection
      };
    }));

    // Sort newest first
    enriched.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    setPendingLogs(enriched);
    setSelectedIds(new Set());
  };

  const handleApprove = async (logItem: EnrichedLog) => {
    const now = new Date().toISOString();

    // 1. Update CheckInLog
    await db.checkInLogs.update(logItem.id, { 
      execStatus: 'approved',
      approvedBy: approverName 
    });

    // 2. Update Reflection to approved
    if (logItem.reflection) {
      await db.reflections.update(logItem.reflection.id, {
        status: 'approved',
        step2ApprovedAt: now,
        step2ApprovedBy: approverName
      });
    } else {
      // Create reflection if didn't exist
      await db.reflections.put({
        id: `ref_${logItem.id}`,
        logId: logItem.id,
        studentId: logItem.studentId,
        activityId: logItem.activityId,
        status: 'approved',
        step2ApprovedAt: now,
        step2ApprovedBy: approverName
      });
    }

    // 3. Log to System Audit Trail
    await logSystemAction(
      approverName,
      'Executive Approver',
      'APPROVE_ACTIVITY_RECORD',
      `${logItem.studentName} (${logItem.studentId})`,
      `อนุมัติกิจกรรม ${logItem.activityName} (+${logItem.hours} ชม.) ลง Transcript สมบูรณ์`
    );

    // 4. Broadcast sync
    try {
      const bc = new BroadcastChannel('npu_db_sync');
      bc.postMessage({ type: 'CHECKIN_LOG_UPDATED', logId: logItem.id, timestamp: Date.now() });
      bc.close();
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('db_updated', { detail: { action: 'step2_approved', logId: logItem.id } }));

    setFeedback(`✓ อนุมัติลง Transcript สำเร็จ: ${logItem.studentName} (+${logItem.hours} ชม.)`);
    setTimeout(() => setFeedback(null), 3000);

    setActiveModalItem(null);
    loadPendingLogs();
  };

  const handleReject = (logItem: EnrichedLog) => {
    setRejectTarget(logItem);
    setRejectReason('');
    setRejectError(null);
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) {
      setRejectError('กรุณากรอกเหตุผลหรือข้อเสนอแนะเพื่อให้สตาฟฟ์และนักศึกษาทราบสิ่งที่ต้องแก้ไข');
      return;
    }

    await db.checkInLogs.update(rejectTarget.id, { execStatus: 'rejected' });
    if (rejectTarget.reflection) {
      await db.reflections.update(rejectTarget.reflection.id, {
        status: 'rejected',
        rejectionReason: rejectReason.trim()
      });
    }

    await logSystemAction(
      approverName,
      'Executive Approver',
      'REJECT_ACTIVITY_APPROVAL',
      `${rejectTarget.studentName} (${rejectTarget.studentId})`,
      `ส่งกลับกิจกรรม ${rejectTarget.activityName} เนื่องจาก: ${rejectReason.trim()}`
    );

    try {
      const bc = new BroadcastChannel('npu_db_sync');
      bc.postMessage({ type: 'CHECKIN_LOG_UPDATED', logId: rejectTarget.id });
      bc.close();
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('db_updated', { detail: { action: 'step2_rejected', logId: rejectTarget.id } }));

    setFeedback(`ส่งกลับให้แก้ไขเรียบร้อย: ${rejectTarget.studentName}`);
    setTimeout(() => setFeedback(null), 3000);

    setRejectTarget(null);
    setRejectReason('');
    setRejectError(null);
    setActiveModalItem(null);
    loadPendingLogs();
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    const now = new Date().toISOString();
    const targets = pendingLogs.filter(l => selectedIds.has(l.id));

    await Promise.all(targets.map(async (item) => {
      await db.checkInLogs.update(item.id, { 
        execStatus: 'approved',
        approvedBy: approverName
      });

      if (item.reflection) {
        await db.reflections.update(item.reflection.id, {
          status: 'approved',
          step2ApprovedAt: now,
          step2ApprovedBy: approverName
        });
      } else {
        await db.reflections.put({
          id: `ref_${item.id}`,
          logId: item.id,
          studentId: item.studentId,
          activityId: item.activityId,
          status: 'approved',
          step2ApprovedAt: now,
          step2ApprovedBy: approverName
        });
      }
    }));

    try {
      const bc = new BroadcastChannel('npu_db_sync');
      bc.postMessage({ type: 'BULK_UPDATE', timestamp: Date.now() });
      bc.close();
    } catch (e) {}
    window.dispatchEvent(new CustomEvent('db_updated', { detail: { action: 'bulk_step2_approved' } }));

    setFeedback(`✓ อนุมัติลง Transcript สำเร็จทั้งหมด ${targets.length} รายการ`);
    setTimeout(() => setFeedback(null), 3000);
    loadPendingLogs();
  };

  const filteredLogs = pendingLogs.filter(log => 
    log.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.studentId.includes(searchQuery) ||
    log.activityName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.major.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-white p-6 rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-6 font-sans">
      
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-md text-[10px] font-black uppercase mb-1">
            <ShieldCheck className="w-3 h-3 text-emerald-700" />
            <span>ขั้นตอนที่ 7 (Step 7 of 9) - ผู้ช่วยคณบดี</span>
          </div>
          <h2 className="text-xl font-black text-[#18181B] uppercase">
            ผู้ช่วยคณบดีตรวจอนุมัติลง Transcript (Step 2)
          </h2>
          <p className="text-xs text-stone-500 font-bold">
            รายการที่ผ่านการตรวจจากเจ้าหน้าที่แล้ว และรอการอนุมัติขั้นสุดท้ายเข้า Transcript ({pendingLogs.length} รายการ)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหารายชื่อ, รหัส, สาขา..."
              className="pl-9 pr-4 py-2 border-2 border-[#18181B] rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-[#FACC15] w-full sm:w-64"
            />
          </div>
          {selectedIds.size > 0 && (
            <button
              onClick={handleBulkApprove}
              className="bg-emerald-400 hover:bg-emerald-500 text-black px-4 py-2 rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-xs font-black flex items-center gap-2 whitespace-nowrap transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              อนุมัติลง Transcript ที่เลือก ({selectedIds.size})
            </button>
          )}
        </div>
      </div>

      {/* Feedback message */}
      {feedback && (
        <div className="p-3 bg-emerald-100 border-2 border-emerald-800 rounded-xl text-emerald-950 text-xs font-black flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Content */}
      {filteredLogs.length === 0 ? (
        <div className="py-12 border-2 border-dashed border-stone-300 rounded-xl flex flex-col items-center justify-center text-stone-400 bg-stone-50">
          <CheckCircle2 className="w-12 h-12 mb-2 text-stone-300" />
          <p className="text-sm font-black text-stone-600">ไม่มีรายการรออนุมัติขั้นที่ 2</p>
          <p className="text-xs font-bold text-stone-500">ข้อมูลที่ผ่านเจ้าหน้าที่ในขั้นที่ 6 จะปรากฏที่นี่</p>
        </div>
      ) : (
        <div className="overflow-x-auto border-2 border-[#18181B] rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-100 border-b-2 border-[#18181B]">
                <th className="p-3 w-10 text-center">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.size === filteredLogs.length && filteredLogs.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(filteredLogs.map(l => l.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    className="w-4 h-4 accent-[#18181B] border-2 border-[#18181B] rounded-sm cursor-pointer"
                  />
                </th>
                <th className="p-3 text-[10px] font-black uppercase tracking-wider text-stone-500 border-r-2 border-[#18181B]">เวลาเช็คอิน</th>
                <th className="p-3 text-[10px] font-black uppercase tracking-wider text-stone-500 border-r-2 border-[#18181B]">นักศึกษา / สาขาวิชา</th>
                <th className="p-3 text-[10px] font-black uppercase tracking-wider text-stone-500 border-r-2 border-[#18181B]">กิจกรรม / การสะสม</th>
                <th className="p-3 text-[10px] font-black uppercase tracking-wider text-stone-500 border-r-2 border-[#18181B] text-center">ผลสะท้อน KPA</th>
                <th className="p-3 text-[10px] font-black uppercase tracking-wider text-stone-500 w-32 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#18181B]/10 text-xs">
              {filteredLogs.map(log => (
                <tr key={log.id} className="hover:bg-stone-50 transition-colors">
                  <td className="p-3 text-center border-r-2 border-[#18181B]/10">
                    <input 
                      type="checkbox" 
                      checked={selectedIds.has(log.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedIds);
                        if (e.target.checked) newSet.add(log.id);
                        else newSet.delete(log.id);
                        setSelectedIds(newSet);
                      }}
                      className="w-4 h-4 accent-[#18181B] border-2 border-[#18181B] rounded-sm cursor-pointer"
                    />
                  </td>
                  <td className="p-3 border-r-2 border-[#18181B]/10 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-stone-600">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      <span className="text-xs font-bold">{dayjs(log.timestamp).format('DD MMM HH:mm')} น.</span>
                    </div>
                  </td>
                  <td className="p-3 border-r-2 border-[#18181B]/10">
                    <div className="font-bold text-sm text-[#18181B] leading-tight">{log.studentName}</div>
                    <div className="text-[10px] text-stone-500 font-mono mt-0.5">{log.studentId} • {log.major}</div>
                  </td>
                  <td className="p-3 border-r-2 border-[#18181B]/10">
                    <div className="font-bold text-xs text-[#18181B] leading-tight max-w-[220px] truncate">{log.activityName}</div>
                    <span className="inline-block mt-0.5 text-[10px] font-black text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      +1 กิจกรรมสะสม
                    </span>
                  </td>
                  <td className="p-3 border-r-2 border-[#18181B]/10 text-center">
                    <button
                      onClick={() => setActiveModalItem(log)}
                      className="px-2.5 py-1 bg-stone-100 hover:bg-[#FACC15] text-stone-800 border border-[#18181B] rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      <span>ดู K-P-A</span>
                    </button>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button 
                        onClick={() => handleApprove(log)}
                        className="px-2.5 py-1.5 bg-emerald-400 hover:bg-emerald-500 text-black border-2 border-[#18181B] rounded-xl text-xs font-black flex items-center gap-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all"
                        title="อนุมัติลงทรานสคริปต์"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>อนุมัติ</span>
                      </button>
                      <button 
                        onClick={() => handleReject(log)}
                        className="p-1.5 bg-rose-100 text-rose-700 hover:bg-rose-400 hover:text-black border-2 border-transparent hover:border-[#18181B] rounded-xl transition-all"
                        title="ไม่อนุมัติ"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Modal for Assistant Dean */}
      {activeModalItem && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            className="bg-[#F7F4EB] w-full max-w-2xl max-h-[90vh] overflow-y-auto border-4 border-[#18181B] rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col relative font-sans animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b-2 border-[#18181B] bg-white sticky top-0 z-20">
              <div>
                <h3 className="text-base font-black text-[#18181B]">
                  พิจารณาอนุมัติลง Transcript กิจกรรม (Step 7)
                </h3>
                <p className="text-xs font-bold text-stone-500">
                  {activeModalItem.studentName} ({activeModalItem.studentId}) • {activeModalItem.major}
                </p>
              </div>
              <button 
                onClick={() => setActiveModalItem(null)}
                className="p-1.5 bg-stone-100 hover:bg-rose-100 border-2 border-transparent hover:border-[#18181B] rounded-xl transition-all"
              >
                <X className="w-5 h-5 text-[#18181B]" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4 text-xs font-sans">
              
              {/* Activity Overview */}
              <div className="bg-white p-3.5 border-2 border-[#18181B] rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-black uppercase text-stone-400">กิจกรรม</div>
                  <div className="text-sm font-black text-[#18181B]">{activeModalItem.activityName}</div>
                  <div className="text-stone-500 font-bold text-[11px] mt-0.5">
                    วันที่จัด: {activeModalItem.activityDate || dayjs(activeModalItem.timestamp).format('YYYY-MM-DD')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-black text-[#2563EB]">+{activeModalItem.hours} ชม.</div>
                  <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
                    ✓ จนท.ตรวจขั้นที่ 1 แล้ว
                  </div>
                </div>
              </div>

              {/* Reflection Fields */}
              {activeModalItem.reflection ? (
                <>
                  <div className="bg-white p-4 border-2 border-[#18181B] rounded-xl space-y-1.5">
                    <div className="font-black text-[#18181B] flex items-center gap-1.5 text-xs uppercase">
                      <BookOpen className="w-4 h-4 text-[#2563EB]" />
                      <span>1. ด้านความรู้ (Knowledge)</span>
                    </div>
                    <div className="text-stone-800 font-medium whitespace-pre-wrap bg-stone-50 p-2.5 rounded-lg border border-stone-200 leading-relaxed">
                      {activeModalItem.reflection.knowledge || '- ไม่ได้ระบุ -'}
                    </div>
                  </div>

                  <div className="bg-white p-4 border-2 border-[#18181B] rounded-xl space-y-1.5">
                    <div className="font-black text-[#18181B] flex items-center gap-1.5 text-xs uppercase">
                      <Award className="w-4 h-4 text-[#F59E0B]" />
                      <span>2. ด้านทักษะและการปฏิบัติ (Practice / Skills)</span>
                    </div>
                    <div className="text-stone-800 font-medium whitespace-pre-wrap bg-stone-50 p-2.5 rounded-lg border border-stone-200 leading-relaxed">
                      {activeModalItem.reflection.practice || '- ไม่ได้ระบุ -'}
                    </div>
                  </div>

                  <div className="bg-white p-4 border-2 border-[#18181B] rounded-xl space-y-1.5">
                    <div className="font-black text-[#18181B] flex items-center gap-1.5 text-xs uppercase">
                      <Heart className="w-4 h-4 text-[#EF4444]" />
                      <span>3. ด้านเจตคติและคุณธรรม (Attitude / Values)</span>
                    </div>
                    <div className="text-stone-800 font-medium whitespace-pre-wrap bg-stone-50 p-2.5 rounded-lg border border-stone-200 leading-relaxed">
                      {activeModalItem.reflection.attitude || '- ไม่ได้ระบุ -'}
                    </div>
                  </div>

                  {activeModalItem.reflection.evidenceUrl && (
                    <div className="bg-white p-4 border-2 border-[#18181B] rounded-xl space-y-2">
                      <div className="font-black text-[#18181B] flex items-center gap-1.5 text-xs uppercase">
                        <ImageIcon className="w-4 h-4 text-emerald-600" />
                        <span>รูปภาพหลักฐานการเข้าร่วม</span>
                      </div>
                      <div className="border-2 border-stone-200 rounded-lg overflow-hidden max-h-60 bg-stone-100 flex items-center justify-center">
                        <img 
                          src={activeModalItem.reflection.evidenceUrl} 
                          alt="Proof" 
                          className="max-h-60 w-auto object-contain"
                        />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-amber-50 p-4 border-2 border-amber-300 rounded-xl text-amber-900 font-bold">
                  บันทึกนี้ได้รับการยืนยันการเช็คอินและตรวจสอบโดยเจ้าหน้าที่แล้ว
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-3 border-t-2 border-stone-200">
                <button
                  onClick={() => handleReject(activeModalItem)}
                  className="w-full sm:w-auto px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border-2 border-rose-300 rounded-xl font-black text-xs transition-colors"
                >
                  ไม่อนุมัติ
                </button>

                <button
                  onClick={() => handleApprove(activeModalItem)}
                  className="w-full sm:w-auto px-6 py-2 bg-emerald-400 hover:bg-emerald-500 text-black border-2 border-[#18181B] rounded-xl font-black text-xs uppercase tracking-wider shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-1.5"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>อนุมัติลง Transcript กิจกรรม (ขั้นตอนที่ 7) ✓</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Rejection / Send Back Modal with Mandatory Reason (Requirement 3: บังคับกรอกเหตุผล Remarks เสมอ) */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full border-2 border-[#18181B] shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] overflow-hidden">
            <div className="p-4 bg-rose-50 border-b-2 border-[#18181B] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <h3 className="font-black text-sm text-stone-900">
                  ส่งกลับ / ไม่อนุมัติกิจกรรม (Return for Revision)
                </h3>
              </div>
              <button 
                onClick={() => setRejectTarget(null)}
                className="p-1 text-stone-400 hover:text-stone-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                <p className="font-bold text-stone-800">
                  นักศึกษา: <span className="font-black text-stone-900">{rejectTarget.studentName}</span> ({rejectTarget.studentId})
                </p>
                <p className="text-stone-600 mt-0.5">
                  กิจกรรม: <span className="font-semibold">{rejectTarget.activityName}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-stone-800 mb-1">
                  ระบุเหตุผล / สิ่งที่ต้องแก้ไข (Remarks) <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => {
                    setRejectReason(e.target.value);
                    if (rejectError) setRejectError(null);
                  }}
                  placeholder="เช่น หลักฐานรูปภาพไม่ชัดเจน หรือ บันทึกการเรียนรู้สั้นเกินไป กรุณาเพิ่มรายละเอียดการปฏิบัติจริง..."
                  className="w-full p-3 text-xs bg-stone-50 border-2 border-stone-300 rounded-xl outline-none focus:border-rose-500 font-medium"
                  autoFocus
                />
                {rejectError && (
                  <p className="text-[11px] text-rose-600 font-bold mt-1">
                    {rejectError}
                  </p>
                )}
              </div>

              <div className="text-[11px] text-stone-500 font-medium bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                ⚠️ เหตุผลนี้จะถูกส่งแจ้งเตือนไปยังนักศึกษาและสตาฟฟ์ผู้ดูแล และบันทึกใน Audit Trail
              </div>
            </div>

            <div className="p-4 bg-stone-50 border-t-2 border-[#18181B] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="px-4 py-2 bg-white hover:bg-stone-100 border border-stone-300 rounded-xl text-xs font-bold text-stone-700"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5"
              >
                ยืนยันส่งกลับให้แก้ไข
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
