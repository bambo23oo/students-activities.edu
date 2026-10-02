import React, { useState, useEffect } from 'react';
import { db, cleanCorruptedThaiRecords } from '../db/db';
import { Activity, Student, CheckInLog } from '../types';
import { 
  Search, 
  Download, 
  Trash2, 
  Clock, 
  Users, 
  CreditCard, 
  Smartphone, 
  Filter, 
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

export const CheckInHistory: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [deleteTargetLog, setDeleteTargetLog] = useState<any | null>(null);
  const [cleanedToast, setCleanedToast] = useState<boolean>(false);

  useEffect(() => {
    // Initial cleanup on mount
    cleanCorruptedThaiRecords().then(() => {
      loadData();
    });
  }, [selectedActivityId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const acts = await db.activities.toArray();
      setActivities(acts);

      let logsQuery = db.checkInLogs.toCollection();
      if (selectedActivityId !== 'all') {
        logsQuery = db.checkInLogs.where('activityId').equals(selectedActivityId);
      }

      const rawLogs = await logsQuery.reverse().sortBy('timestamp');
      const students = await db.students.toArray();
      const studentMap = new Map(students.map(s => [s.id, s]));
      const actMap = new Map(acts.map(a => [a.id, a]));

      const enriched = rawLogs.map(l => {
        const student = studentMap.get(l.studentId);
        const act = actMap.get(l.activityId);
        const cardType: 'physical' | 'digital' | 'manual' = 
          l.method === 'camera' ? 'digital' : 
          l.method === 'usb' ? 'physical' : 'manual';

        return {
          id: l.id,
          studentId: l.studentId,
          studentName: student?.name || `รหัสนักศึกษา ${l.studentId}`,
          faculty: student?.faculty || 'มหาวิทยาลัยนครพนม',
          major: student?.major || 'ไม่ระบุสาขาวิชา',
          year: student?.year || 1,
          activityId: l.activityId,
          activityName: act?.name || 'ไม่ระบุกิจกรรม',
          timestamp: l.timestamp,
          method: l.method,
          cardType,
          status: l.status
        };
      });

      setLogs(enriched);
    } catch (err) {
      console.error('Error loading check-in logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualCleanData = async () => {
    setLoading(true);
    await cleanCorruptedThaiRecords();
    await loadData();
    setCleanedToast(true);
    setTimeout(() => setCleanedToast(false), 3000);
  };

  const filteredLogs = logs.filter(l => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.studentId.toLowerCase().includes(q) ||
      l.studentName.toLowerCase().includes(q) ||
      l.activityName.toLowerCase().includes(q) ||
      l.major.toLowerCase().includes(q) ||
      l.faculty.toLowerCase().includes(q)
    );
  });

  const handleDeleteLog = async () => {
    if (!deleteTargetLog) return;
    try {
      await db.checkInLogs.delete(deleteTargetLog.id);
      setDeleteTargetLog(null);
      await loadData();
    } catch (err) {
      console.error('Failed to delete log:', err);
    }
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert("ไม่มีข้อมูลที่จะส่งออก");
      return;
    }
    
    const headers = "LogID,StudentID,StudentName,Faculty,Major,Year,ActivityID,ActivityName,Timestamp,Method,Status\n";
    const rows = filteredLogs.map(r => 
      `"${r.id}","${r.studentId}","${r.studentName}","${r.faculty}","${r.major}","${r.year}","${r.activityId}","${r.activityName}","${r.timestamp}","${r.method}","${r.status}"`
    ).join("\n");
    
    const blob = new Blob(["\uFEFF" + headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NPU-CheckIn-Records-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-[#5C2A0D] border border-amber-200 rounded-full text-xs font-bold mb-2">
            <Users className="w-3.5 h-3.5 text-amber-700" />
            <span>ประวัติการเช็คอินทั้งหมด ({filteredLogs.length} รายการ - ไม่ซ้ำซ้อน)</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            ตรวจสอบข้อมูลการสแกนบัตร (Check-in Logs)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            ระบบรับข้อมูล 1 คน / 1 ครั้งต่อกิจกรรม พร้อมแปลงแป้นพิมพ์ไทยเป็นรหัสที่ถูกต้อง
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <button
            onClick={handleManualCleanData}
            className="px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="ล้างข้อมูลซ้ำซ้อนและแก้ไขรหัสภาษาไทย"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>ทำความสะอาดข้อมูล</span>
          </button>
          <button
            onClick={loadData}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className="w-4 h-4 text-amber-700" />
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 bg-[#5C2A0D] hover:bg-[#7C3A12] text-amber-300 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all active:scale-95 whitespace-nowrap"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>ส่งออกไฟล์ Excel / CSV</span>
          </button>
        </div>
      </div>

      {/* Cleaned Alert Toast */}
      {cleanedToast && (
        <div className="p-3.5 bg-emerald-600 text-white rounded-2xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-2 duration-200">
          <ShieldCheck className="w-4 h-4 text-emerald-200" />
          <span>ระบบตรวจสอบและทำความสะอาดข้อมูลซ้ำซ้อน / แปลงรหัสภาษาไทยเรียบร้อยแล้ว</span>
        </div>
      )}

      {/* Filter Controls */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        
        {/* Activity Filter Dropdown */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedActivityId}
            onChange={(e) => setSelectedActivityId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-[#5C2A0D]/20 focus:border-[#5C2A0D]"
          >
            <option value="all">-- ดูกิจกรรมทั้งหมด ({activities.length} กิจกรรม) --</option>
            {activities.map(a => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.date})
              </option>
            ))}
          </select>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อ, รหัสนักศึกษา, สาขา..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-[#5C2A0D]/20 focus:border-[#5C2A0D]"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">#</th>
                <th className="py-3.5 px-4">รหัสนักศึกษา</th>
                <th className="py-3.5 px-4">ชื่อ - นามสกุล</th>
                <th className="py-3.5 px-4">คณะ / สาขาวิชา</th>
                <th className="py-3.5 px-4">กิจกรรมที่เช็คอิน</th>
                <th className="py-3.5 px-4">เวลาสแกน</th>
                <th className="py-3.5 px-4">รูปแบบบัตร</th>
                <th className="py-3.5 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    กำลังโหลดข้อมูลการสแกน...
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    ไม่พบประวัติการสแกนเช็คอินตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => (
                  <tr key={log.id} className="hover:bg-amber-50/40 transition-colors group">
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {index + 1}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#5C2A0D]">
                      {log.studentId}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {log.studentName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div>{log.major}</div>
                      <div className="text-[10px] text-slate-400">{log.faculty}</div>
                    </td>
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-800 truncate" title={log.activityName}>
                        {log.activityName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.activityId}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(log.timestamp).toLocaleTimeString('th-TH')}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleDateString('th-TH')}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {log.cardType === 'physical' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                          <CreditCard className="w-3 h-3 text-amber-700" /> บัตรจริง (1D)
                        </span>
                      ) : log.cardType === 'digital' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-bold">
                          <Smartphone className="w-3 h-3 text-sky-700" /> บัตรดิจิทัล (QR)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                          คีย์รหัสตรง
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setDeleteTargetLog(log)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="ลบรายการเช็คอินนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTargetLog}
        onClose={() => setDeleteTargetLog(null)}
        onConfirm={handleDeleteLog}
        title="ยืนยันการลบรายการเช็คอิน"
        message={`คุณต้องการลบข้อมูลการเช็คอินของ ${deleteTargetLog?.studentName} (${deleteTargetLog?.studentId}) ในกิจกรรม "${deleteTargetLog?.activityName}" หรือไม่?`}
        confirmText="ลบข้อมูล"
        cancelText="ยกเลิก"
        type="danger"
      />

    </div>
  );
};
