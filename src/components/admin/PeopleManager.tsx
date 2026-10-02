import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Award, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  FileText, 
  Filter,
  GraduationCap,
  ChevronRight,
  ExternalLink,
  X,
  Upload,
  Download,
  Sparkles,
  Key,
  Lock,
  RefreshCw
} from 'lucide-react';
import { db, importInitialStudentRoster, logSystemAction } from '../../db/db';
import { Student, CheckInLog, Reflection } from '../../types';

export const PeopleManager: React.FC = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [resetConfirmStudent, setResetConfirmStudent] = useState<any | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMajor, setSelectedMajor] = useState('all');
  const [selectedFaculty, setSelectedFaculty] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadStudents();

    const handleSync = () => loadStudents();
    window.addEventListener('db_updated', handleSync);
    return () => window.removeEventListener('db_updated', handleSync);
  }, []);

  const handleImportRoster = async () => {
    const count = await importInitialStudentRoster();
    await loadStudents();
    setNotification(`✓ นำเข้ารายชื่อนักศึกษาตามโครงสร้างหลักสูตร 2 คณะ สำเร็จแล้ว (${count} คน)`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleDownloadTemplate = () => {
    const headers = ['id', 'name', 'faculty', 'major', 'year', 'email'].join(',');
    const sampleRows = [
      ['66309010001', 'นายกิตติศักดิ์ ศรีวรสาร', 'คณะครุศาสตร์', 'สาขาวิชาคอมพิวเตอร์ศึกษา', '4', '66309010001@npu.ac.th'].join(','),
      ['66309020001', 'นายชินวัตร ปัญญาไว', 'คณะวิทยาศาสตร์', 'สาขาวิชาฟิสิกส์ (ค.บ.)', '4', '66309020001@npu.ac.th'].join(',')
    ].join('\n');
    const blob = new Blob(['\uFEFF' + headers + '\n' + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'student_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetPassword = async (targetStudent: any) => {
    setIsResetting(true);
    try {
      const defaultPw = targetStudent.id.trim();
      await db.students.update(targetStudent.id, {
        password: defaultPw,
        isPasswordChanged: false,
        passwordUpdatedAt: new Date().toISOString()
      });

      await logSystemAction(
        'Admin',
        'approver',
        'RESET_STUDENT_PASSWORD',
        `${targetStudent.name} (${targetStudent.id})`,
        `รีเซ็ตรหัสผ่านกลับเป็นรหัสนักศึกษาเริ่มต้น (${defaultPw})`
      );

      setResetConfirmStudent(null);
      if (selectedStudent && selectedStudent.id === targetStudent.id) {
        setSelectedStudent({
          ...selectedStudent,
          password: defaultPw,
          isPasswordChanged: false
        });
      }
      setNotification(`✓ รีเซ็ตรหัสผ่านของ ${targetStudent.name} (${targetStudent.id}) เป็นรหัสเริ่มต้น "${defaultPw}" เรียบร้อยแล้ว`);
      setTimeout(() => setNotification(null), 4000);
      await loadStudents();
      window.dispatchEvent(new CustomEvent('db_updated', { detail: { studentId: targetStudent.id } }));
    } catch (err: any) {
      alert('เกิดข้อผิดพลาดในการรีเซ็ตรหัสผ่าน: ' + (err.message || ''));
    } finally {
      setIsResetting(false);
    }
  };

  const loadStudents = async () => {
    const rawStudents = await db.students.toArray();
    const allLogs = await db.checkInLogs.toArray();

    // High-performance O(N) map pre-aggregation
    const logStatsMap = new Map<string, { approved: number; total: number }>();
    for (let i = 0; i < allLogs.length; i++) {
      const l = allLogs[i];
      if (!l.studentId) continue;
      let stat = logStatsMap.get(l.studentId);
      if (!stat) {
        stat = { approved: 0, total: 0 };
        logStatsMap.set(l.studentId, stat);
      }
      stat.total++;
      if (l.execStatus === 'approved') {
        stat.approved++;
      }
    }

    const enriched = rawStudents.map((s) => {
      const stat = logStatsMap.get(s.id) || { approved: 0, total: 0 };
      const approvedActivities = stat.approved;
      const totalActivities = stat.total;
      const isGraduationReady = approvedActivities >= 18;

      return {
        ...s,
        approvedActivities,
        totalActivities,
        isGraduationReady,
        major: s.major || 'สาขาวิชาคอมพิวเตอร์ศึกษา',
        faculty: s.faculty || 'คณะครุศาสตร์',
        year: s.year || 4
      };
    });

    setStudents(enriched);
  };

  const majors = Array.from(new Set(students.map(s => s.major)));

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.id.includes(searchQuery);
    const matchesMajor = selectedMajor === 'all' || s.major === selectedMajor;
    const matchesFaculty = selectedFaculty === 'all' || s.faculty === selectedFaculty;
    return matchesSearch && matchesMajor && matchesFaculty;
  });

  return (
    <div className="space-y-5 max-w-[1600px] mx-auto">
      
      {/* Top Header Card */}
      <div className="bg-white rounded-xl p-5 border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-black text-[#18181B]">
            ทะเบียนนักศึกษาและผู้เข้าร่วม (Student & People Directory)
          </h2>
          <p className="text-xs text-stone-500 font-medium mt-0.5">
            ตรวจสอบข้อมูลรายบุคคล กิจกรรมสะสม และความพร้อมสู่การสำเร็จการศึกษา (เกณฑ์ 18 กิจกรรม)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 bg-[#FAF7F0] border-2 border-[#18181B] rounded-xl text-xs font-bold text-stone-700 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
            นักศึกษาทั้งหมด: <span className="font-black text-[#18181B]">{students.length} คน</span>
          </div>
          <div className="px-3 py-1.5 bg-[#FACC15] border-2 border-[#18181B] rounded-xl text-xs font-bold text-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
            ผ่านเกณฑ์ 18 กิจกรรม: <span className="font-black">{students.filter(s => s.isGraduationReady).length} คน</span>
          </div>
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-50 border-2 border-emerald-500 text-emerald-950 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl p-3 border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อ, รหัสนักศึกษา..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF7F0] border-2 border-[#18181B] rounded-xl outline-none text-[#18181B] font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-stone-600">คณะ:</span>
            <select
              value={selectedFaculty}
              onChange={(e) => setSelectedFaculty(e.target.value)}
              className="text-xs bg-white border-2 border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded-xl px-2.5 py-1.5 outline-none cursor-pointer font-bold"
            >
              <option value="all">ทุกคณะ</option>
              <option value="คณะครุศาสตร์">คณะครุศาสตร์</option>
              <option value="คณะวิทยาศาสตร์">คณะวิทยาศาสตร์</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-stone-600">สาขาวิชา:</span>
            <select
              value={selectedMajor}
              onChange={(e) => setSelectedMajor(e.target.value)}
              className="text-xs bg-white border-2 border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded-xl px-2.5 py-1.5 outline-none cursor-pointer font-bold"
            >
              <option value="all">ทุกสาขาวิชา</option>
              {majors.map((m, idx) => (
                <option key={idx} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Student List Table */}
      <div className="bg-white rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead className="bg-[#FAF7F0] border-b-2 border-[#18181B] text-[11px] font-black text-stone-500 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">รหัสนักศึกษา</th>
                <th className="py-2.5 px-4">ชื่อ - นามสกุล</th>
                <th className="py-2.5 px-4">สาขาวิชา / ชั้นปี</th>
                <th className="py-2.5 px-4 text-center">กิจกรรมที่เข้าร่วม</th>
                <th className="py-2.5 px-4 text-center">กิจกรรมที่อนุมัติ</th>
                <th className="py-2.5 px-4">ความพร้อมสำเร็จการศึกษา</th>
                <th className="py-2.5 px-4 text-right">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredStudents.map((s) => (
                <tr key={s.id} className="hover:bg-[#FAF7F0] transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-[#18181B]">
                    {s.id}
                  </td>
                  <td className="py-3 px-4 font-bold text-[#18181B]">
                    {s.name}
                  </td>
                  <td className="py-3 px-4 text-stone-600 font-medium">
                    <div className="font-semibold text-stone-900">{s.major} (ปี {s.year})</div>
                    <div className="text-[11px] font-bold text-[#EA580C] mt-0.5">{s.faculty}</div>
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-stone-800">
                    {s.totalActivities} กิจกรรม
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-black text-[#18181B] text-sm">{s.approvedActivities}</span>
                    <span className="text-stone-500 text-[10px] font-bold"> / 18 กิจกรรม</span>
                  </td>
                  <td className="py-3 px-4">
                    {s.isGraduationReady ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>ผ่านเกณฑ์ครบถ้วน</span>
                      </span>
                    ) : (
                      <div className="w-28 bg-stone-100 rounded-full h-2.5 overflow-hidden border border-[#18181B]">
                        <div 
                          className="bg-[#FACC15] h-full rounded-full"
                          style={{ width: `${Math.min(100, (s.approvedActivities / 18) * 100)}%` }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setSelectedStudent(s)}
                        className="px-2.5 py-1 bg-white hover:bg-[#FACC15] text-[#18181B] border-2 border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded-lg font-bold text-[11px] transition-all"
                      >
                        ดูประวัติ
                      </button>
                      <button
                        onClick={() => setResetConfirmStudent(s)}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border-2 border-rose-300 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded-lg font-bold text-[11px] transition-all flex items-center gap-1"
                        title={`รีเซ็ตรหัสผ่านของ ${s.name} เป็นรหัสนักศึกษา (${s.id})`}
                      >
                        <Key className="w-3 h-3 text-rose-600" />
                        <span>รีเซ็ตรหัส</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-[#18181B] shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] w-full max-w-lg overflow-hidden animate-in zoom-in-95">
            <div className="p-4 bg-[#FAF7F0] border-b-2 border-[#18181B] flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-stone-500 uppercase tracking-wider block">
                  ประวัติกิจกรรมนักศึกษารายบุคคล
                </span>
                <h3 className="text-base font-black text-[#18181B]">{selectedStudent.name}</h3>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="w-7 h-7 rounded-lg bg-white border-2 border-[#18181B] text-[#18181B] flex items-center justify-center hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#FAF7F0] rounded-xl border-2 border-[#18181B]">
                <div>
                  <span className="text-stone-400 block text-[10px] font-bold">รหัสนักศึกษา:</span>
                  <span className="font-mono font-bold text-[#18181B]">{selectedStudent.id}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] font-bold">สาขาวิชา:</span>
                  <span className="font-bold text-[#18181B]">{selectedStudent.major}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] font-bold">กิจกรรมที่อนุมัติแล้ว:</span>
                  <span className="font-black text-[#18181B] text-sm">{selectedStudent.approvedActivities} กิจกรรม</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px] font-bold">สถานะการสำเร็จการศึกษา:</span>
                  <span className={`font-black ${selectedStudent.isGraduationReady ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {selectedStudent.isGraduationReady ? 'ผ่านเกณฑ์ 18 กิจกรรมแล้ว' : `ยังขาดอีก ${18 - selectedStudent.approvedActivities} กิจกรรม`}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border-2 border-blue-300 rounded-xl text-blue-900">
                <span className="font-black block mb-1">มาตรฐานการเข้าร่วมกิจกรรม 4 ด้าน:</span>
                <ul className="list-disc list-inside space-y-0.5 text-[11px] font-medium">
                  <li>ด้านคุณธรรมจริยธรรมและจิตสาธารณะ (5 กิจกรรม)</li>
                  <li>ด้านทักษะทางวิชาการและวิชาชีพครู (7 กิจกรรม)</li>
                  <li>ด้านทักษะศตวรรษที่ 21 และเทคโนโลยีดิจิทัล (3 กิจกรรม)</li>
                  <li>ด้านศิลปวัฒนธรรมและสิ่งแวดล้อม (3 กิจกรรม)</li>
                </ul>
              </div>

              {/* Password Status & Reset Option */}
              <div className="p-3 bg-amber-50/80 border-2 border-[#18181B] rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-black text-[#18181B]">
                    <Lock className="w-4 h-4 text-[#EA580C]" />
                    <span>ข้อมูลรหัสผ่านและการเข้าสู่ระบบ:</span>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    selectedStudent.isPasswordChanged 
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {selectedStudent.isPasswordChanged ? 'นักศึกษาเปลี่ยนรหัสเองแล้ว' : 'ใช้รหัสผ่านเริ่มต้น (รหัสนักศึกษา)'}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                  <div className="text-[11px] text-stone-600">
                    รหัสผ่านเริ่มต้น: <strong className="font-mono text-stone-900">{selectedStudent.id}</strong>
                  </div>
                  <button
                    onClick={() => setResetConfirmStudent(selectedStudent)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-colors self-start sm:self-auto"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>รีเซ็ตรหัสผ่านกลับเป็น {selectedStudent.id}</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#FAF7F0] border-t-2 border-[#18181B] flex justify-end">
              <button
                onClick={() => setSelectedStudent(null)}
                className="px-4 py-2 bg-[#18181B] hover:bg-stone-800 text-[#FACC15] text-xs font-bold border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-xl"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Confirmation Modal */}
      {resetConfirmStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-2xs z-60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border-2 border-[#18181B] shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-4 bg-rose-50 border-b-2 border-[#18181B] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-100 border border-rose-300 flex items-center justify-center text-rose-600">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-rose-900">ยืนยันการรีเซ็ตรหัสผ่านนักศึกษา</h3>
                  <span className="text-[11px] text-rose-700 font-medium">Password Reset Confirmation</span>
                </div>
              </div>
              <button
                onClick={() => setResetConfirmStudent(null)}
                className="w-7 h-7 rounded-lg bg-white border-2 border-[#18181B] text-[#18181B] flex items-center justify-center hover:bg-stone-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <p className="text-stone-700 leading-relaxed font-medium">
                คุณต้องการรีเซ็ตรหัสผ่านของ <strong>{resetConfirmStudent.name}</strong> (รหัส <code>{resetConfirmStudent.id}</code>) กลับเป็นรหัสผ่านเริ่มต้นใช่หรือไม่?
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1 text-amber-900">
                <div className="font-bold">ผลของการรีเซ็ต:</div>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  <li>รหัสผ่านจะถูกตั้งกลับเป็น: <strong className="font-mono text-[#EA580C]">{resetConfirmStudent.id}</strong></li>
                  <li>นักศึกษาสามารถเข้าสู่ระบบด้วยรหัสนักศึกษาได้ทันที</li>
                  <li>ระบบจะแจ้งเตือนให้นักศึกษาเปลี่ยนรหัสผ่านใหม่เมื่อเข้าสู่ระบบ</li>
                </ul>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setResetConfirmStudent(null)}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 border-2 border-[#18181B] rounded-xl font-bold text-stone-700 transition-colors"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isResetting}
                  onClick={() => handleResetPassword(resetConfirmStudent)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white border-2 border-black rounded-xl font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
                  <span>{isResetting ? 'กำลังรีเซ็ต...' : 'ยืนยันรีเซ็ตรหัสผ่าน'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
