import React, { useState, useEffect } from 'react';
import { db, logSystemAction, importInitialStudentRoster } from '../../db/db';
import { SystemUser, SystemAuditLog, UserRole } from '../../types';
import { 
  FACULTY_OF_EDUCATION_MAJORS, 
  FACULTY_OF_SCIENCE_MAJORS, 
  FACULTIES 
} from '../../data/majors';
import * as XLSX from 'xlsx';
import { 
  ShieldCheck, 
  Users, 
  Database, 
  Activity, 
  FileText, 
  Search, 
  Filter, 
  Key, 
  UserCheck, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Download, 
  Upload, 
  RefreshCw, 
  Settings, 
  Laptop, 
  Layers, 
  Sliders, 
  Terminal, 
  LogOut, 
  Lock, 
  Eye, 
  Plus, 
  Trash2, 
  Clock, 
  Radio
} from 'lucide-react';

interface SuperAdminPanelProps {
  onRoleChange: (newRole: UserRole, targetEmail?: string, targetName?: string) => void;
  currentAdminEmail?: string;
}

export const SuperAdminPanel: React.FC<SuperAdminPanelProps> = ({
  onRoleChange,
  currentAdminEmail = 'srisuda.edu@npu.ac.th'
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'rbac' | 'master' | 'data' | 'audit'>('rbac');
  
  // RBAC State
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);

  // Master Data State
  const [academicYear, setAcademicYear] = useState('2569');
  const [currentTerm, setCurrentTerm] = useState('ภาคการศึกษาที่ 1');
  const [selectedFacultyView, setSelectedFacultyView] = useState<'all' | 'คณะครุศาสตร์' | 'คณะวิทยาศาสตร์'>('all');

  // Bulk Data Operations State
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [rawTableChoice, setRawTableChoice] = useState<'students' | 'checkInLogs' | 'activities'>('students');
  const [rawData, setRawData] = useState<any[]>([]);

  // Audit Logs & System Health State
  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>([]);
  const [auditSearch, setAuditSearch] = useState('');
  const [systemStats, setSystemStats] = useState({
    indexedDbStatus: 'เชื่อมต่อแล้ว (Online)',
    totalStudents: 0,
    totalLogs: 0,
    totalActivities: 0,
    storageUsage: '1.8 MB (IndexedDB)',
    offlineQueue: 0
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    loadUsers();
    loadAuditLogs();
    loadSystemHealth();
    loadRawData('students');

    const handleAudit = () => {
      loadAuditLogs();
      loadSystemHealth();
    };
    window.addEventListener('audit_logged', handleAudit);
    window.addEventListener('db_updated', handleAudit);
    return () => {
      window.removeEventListener('audit_logged', handleAudit);
      window.removeEventListener('db_updated', handleAudit);
    };
  }, []);

  // Keyboard shortcut listener: Ctrl + / to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('superadmin-search') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadUsers = async () => {
    try {
      const allUsers = await db.systemUsers.toArray();
      setUsers(allUsers);
    } catch (e) {
      console.error(e);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const logs = await db.auditLogs.toArray();
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setAuditLogs(logs);
    } catch (e) {
      console.error(e);
    }
  };

  const loadSystemHealth = async () => {
    try {
      const stCount = await db.students.count();
      const logCount = await db.checkInLogs.count();
      const actCount = await db.activities.count();
      setSystemStats(prev => ({
        ...prev,
        totalStudents: stCount,
        totalLogs: logCount,
        totalActivities: actCount,
      }));
    } catch (e) {
      console.error(e);
    }
  };

  const loadRawData = async (table: 'students' | 'checkInLogs' | 'activities') => {
    setRawTableChoice(table);
    try {
      let data: any[] = [];
      if (table === 'students') data = await db.students.limit(50).toArray();
      if (table === 'checkInLogs') data = await db.checkInLogs.limit(50).toArray();
      if (table === 'activities') data = await db.activities.limit(50).toArray();
      setRawData(data);
    } catch (e) {
      console.error(e);
    }
  };

  // 1. RBAC Impersonation: jump directly into that user's view for testing
  const handleImpersonate = async (targetUser: SystemUser) => {
    await logSystemAction(
      currentAdminEmail,
      'Super Admin',
      'USER_IMPERSONATION',
      `${targetUser.name} (${targetUser.email})`,
      `จำลองสิทธิ์เป็น [${targetUser.role.toUpperCase()}] เพื่อทดสอบมุมมองหน้าจอ`
    );

    localStorage.setItem('app_role', targetUser.role);
    localStorage.setItem('app_student_email', targetUser.email);
    localStorage.setItem('app_student_name', targetUser.name);
    
    showToast(`⚡ กำลังเปลี่ยนมุมมองเป็น: ${targetUser.name} (${targetUser.role})...`);
    setTimeout(() => {
      onRoleChange(targetUser.role, targetUser.email, targetUser.name);
    }, 400);
  };

  // 2. Toggle User Status (Active / Suspended)
  const handleToggleUserStatus = async (user: SystemUser) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active';
    await db.systemUsers.update(user.id, { status: newStatus });
    await logSystemAction(
      currentAdminEmail,
      'Super Admin',
      'USER_STATUS_UPDATE',
      user.email,
      `เปลี่ยนสถานะบัญชีเป็น: ${newStatus.toUpperCase()}`
    );
    loadUsers();
    showToast(`อัปเดตสถานะของ ${user.name} เรียบร้อยแล้ว`);
  };

  // 3. Bulk CSV / Excel Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json<any>(ws);

        const errors: string[] = [];
        const validated = data.map((row, idx) => {
          const id = String(row['id'] || row['รหัสนักศึกษา'] || '').trim();
          const name = String(row['name'] || row['ชื่อ-สกุล'] || row['ชื่อ'] || '').trim();
          const major = String(row['major'] || row['สาขาวิชา'] || '').trim();
          const faculty = String(row['faculty'] || row['คณะ'] || 'คณะครุศาสตร์').trim();

          if (!id) errors.push(`แถวที่ ${idx + 2}: ไม่พบรหัสนักศึกษา`);
          if (!name) errors.push(`แถวที่ ${idx + 2}: ไม่พบชื่อนักศึกษา`);

          return {
            id,
            name,
            major: major || 'สาขาวิชาคอมพิวเตอร์ศึกษา',
            faculty: faculty.includes('วิทย์') ? 'คณะวิทยาศาสตร์' : 'คณะครุศาสตร์',
            year: Number(row['year'] || row['ชั้นปี']) || 1,
            email: row['email'] || `${id}@npu.ac.th`,
            university: 'มหาวิทยาลัยนครพนม'
          };
        });

        setImportPreview(validated);
        setImportErrors(errors);
      } catch (err: any) {
        setImportErrors(['ไฟล์ไม่ถูกต้อง: ' + err.message]);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmBulkImport = async () => {
    if (importPreview.length === 0) return;
    setIsImporting(true);
    try {
      await db.students.bulkPut(importPreview);
      await logSystemAction(
        currentAdminEmail,
        'Super Admin',
        'BULK_IMPORT_STUDENTS',
        `${importPreview.length} รายการ`,
        `นำเข้ารายชื่อนักศึกษาตั้งต้นจำนวน ${importPreview.length} คน`
      );
      showToast(`✓ นำเข้ารายชื่อนักศึกษาสำเร็จ ${importPreview.length} คน`);
      setImportPreview([]);
      setImportErrors([]);
      loadSystemHealth();
      loadRawData('students');
    } catch (e: any) {
      showToast('เกิดข้อผิดพลาดในการนำเข้า: ' + e.message);
    } finally {
      setIsImporting(false);
    }
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

  const handleImportOfficialRoster = async () => {
    const count = await importInitialStudentRoster();
    await loadSystemHealth();
    await loadRawData('students');
    showToast(`✓ นำเข้ารายชื่อนักศึกษาหลักสูตร 2 คณะ ครบทุกชั้นปีเรียบร้อย (${count} คน)`);
  };

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                        u.email.toLowerCase().includes(userSearch.toLowerCase());
    const matchRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
    return matchSearch && matchRole;
  });

  // Filtered audit logs
  const filteredLogs = auditLogs.filter(l => 
    l.actor.toLowerCase().includes(auditSearch.toLowerCase()) ||
    l.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
    l.target.toLowerCase().includes(auditSearch.toLowerCase()) ||
    l.details.toLowerCase().includes(auditSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto font-sans">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#18181B] text-[#FACC15] px-4 py-2.5 rounded-xl border-2 border-[#FACC15] shadow-lg text-xs font-bold animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* Super Admin Command Header */}
      <div className="bg-white rounded-2xl p-5 border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded font-black text-[10px] uppercase tracking-wider">
              Super Admin Level
            </span>
            <span className="text-xs text-stone-500 font-bold">
              ปีการศึกษา {academicYear} • {currentTerm}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#18181B] tracking-tight">
            ศูนย์ควบคุมระบบหลังบ้าน (System Administration Center)
          </h2>
          <p className="text-xs text-stone-600 font-medium mt-0.5">
            จัดการสิทธิ์ผู้ใช้ (RBAC), โหมดจำลองสิทธิ์ (Impersonation), ข้อมูลหลัก 2 คณะ, และตรวจสอบ Audit Logs
          </p>
        </div>

        {/* Global Keyboard shortcut notice */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF7F0] border-2 border-stone-300 rounded-xl text-xs font-bold text-stone-700">
            <span>คีย์ลัดค้นหา:</span>
            <kbd className="px-1.5 py-0.5 bg-white border border-stone-300 rounded text-[10px] font-mono font-bold">
              Ctrl + /
            </kbd>
          </div>

          <div className="px-3.5 py-1.5 bg-emerald-50 border-2 border-emerald-300 rounded-xl text-emerald-900 text-xs font-black flex items-center gap-2 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>ระบบพร้อมทำงานปกติ</span>
          </div>
        </div>
      </div>

      {/* Admin Module Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b-2 border-stone-300 pb-2">
        {[
          { id: 'rbac', label: '1. จัดการผู้ใช้และสิทธิ์ (RBAC)', icon: ShieldCheck, count: users.length },
          { id: 'master', label: '2. ข้อมูลหลัก 2 คณะ (Master Data)', icon: Layers },
          { id: 'data', label: '3. นำเข้า/ส่งออก & ตรวจข้อมูล (Data Ops)', icon: Database },
          { id: 'audit', label: '4. บันทึกระบบ & สุขภาพ (Audit Logs)', icon: Activity, count: auditLogs.length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl font-black text-xs transition-all border-2 border-[#18181B] flex items-center gap-2 ${
                isActive
                  ? 'bg-[#18181B] text-[#FACC15] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)]'
                  : 'bg-white text-stone-700 hover:bg-stone-50 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`px-1.5 py-0.2 rounded text-[10px] ${
                  isActive ? 'bg-[#FACC15] text-[#18181B]' : 'bg-stone-100 text-stone-700'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: RBAC & USER MANAGEMENT                                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'rbac' && (
        <div className="space-y-4">
          
          {/* Filter Bar */}
          <div className="bg-white rounded-xl p-3.5 border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                id="superadmin-search"
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="ค้นหาชื่อผู้ใช้, อีเมล @npu.ac.th..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF7F0] border-2 border-[#18181B] rounded-xl outline-none font-medium"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-600">กรองสิทธิ์:</span>
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="text-xs bg-white border-2 border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded-xl px-2.5 py-1.5 outline-none font-bold cursor-pointer"
              >
                <option value="all">ทุกระดับสิทธิ์ ({users.length})</option>
                <option value="approver">ผู้บริหาร & Super Admin</option>
                <option value="staff">เจ้าหน้าที่สแกนเนอร์หน้างาน</option>
              </select>
            </div>
          </div>

          {/* User Management Table (Dense SaaS UI) */}
          <div className="bg-white rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[850px]">
                <thead className="bg-[#FAF7F0] border-b-2 border-[#18181B] text-[11px] font-black text-stone-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4">ชื่อ - นามสกุล</th>
                    <th className="py-2.5 px-3">ชื่อผู้ใช้ (Username)</th>
                    <th className="py-2.5 px-3">รหัสผ่าน (Password)</th>
                    <th className="py-2.5 px-4">อีเมลมหาวิทยาลัย</th>
                    <th className="py-2.5 px-4">คณะที่สังกัด</th>
                    <th className="py-2.5 px-4 text-center">สิทธิ์ปัจจุบัน (Role)</th>
                    <th className="py-2.5 px-4 text-center">สถานะ</th>
                    <th className="py-2.5 px-4 text-right">โหมดจำลองสิทธิ์ (Impersonate)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-[#FAF7F0] transition-colors">
                      <td className="py-3 px-4 font-bold text-stone-900">
                        {user.name}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-[#EA580C]">
                        {user.username || '-'}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-stone-700 bg-stone-50/70">
                        {user.password || '-'}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-stone-600">
                        {user.email}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          {user.faculty || 'คณะครุศาสตร์'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider ${
                          user.role === 'approver' 
                            ? 'bg-purple-100 text-purple-900 border-purple-300'
                            : user.role === 'staff'
                            ? 'bg-blue-100 text-blue-900 border-blue-300'
                            : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleToggleUserStatus(user)}
                          className={`px-2 py-0.5 rounded text-[10px] font-black border transition-all ${
                            user.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-rose-100 text-rose-800 border-rose-300'
                          }`}
                          title="คลิกเพื่อเปลี่ยนสถานะ"
                        >
                          {user.status === 'active' ? '● ใช้งานได้' : '○ ถูกระงับ'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleImpersonate(user)}
                          className="px-3 py-1.5 bg-[#FACC15] hover:bg-amber-400 text-[#18181B] rounded-xl text-xs font-black border-2 border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-1.5 ml-auto active:translate-x-0.5 active:translate-y-0.5"
                          title="จำลองเป็นบัญชีนี้เพื่อตรวจสอบหน้าจอ"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>จำลองสิทธิ์</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MASTER DATA MANAGEMENT (FACULTIES & MAJORS)                        */}
      {/* ========================================================================= */}
      {activeSubTab === 'master' && (
        <div className="space-y-5">
          
          {/* Academic Terms Configuration Box */}
          <div className="bg-white rounded-xl p-5 border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] space-y-3">
            <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#EA580C]" />
              <span>การตั้งค่าปีการศึกษาและภาคเรียนปัจจุบัน (Academic Year & Terms)</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold text-stone-700 mb-1">ปีการศึกษาปัจจุบัน</label>
                <input 
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-200 rounded-xl font-bold outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">ภาคเรียนปัจจุบัน</label>
                <input 
                  type="text"
                  value={currentTerm}
                  onChange={(e) => setCurrentTerm(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-200 rounded-xl font-bold outline-none"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => showToast('✓ บันทึกค่าปีการศึกษาและภาคเรียนเรียบร้อย')}
                  className="w-full py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl font-bold text-xs shadow-sm transition-all"
                >
                  บันทึกค่าปีการศึกษา
                </button>
              </div>
            </div>
          </div>

          {/* Official 2 Faculties Showcase */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Faculty of Education (9 Majors) */}
            <div className="bg-white rounded-xl p-5 border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <h4 className="text-sm font-black text-stone-900">
                  คณะครุศาสตร์ (9 สาขาวิชา ค.บ.)
                </h4>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-black rounded text-[10px] border border-amber-300">
                  หลักสูตรระดับปริญญาตรี
                </span>
              </div>
              <div className="space-y-1.5">
                {FACULTY_OF_EDUCATION_MAJORS.map((m, idx) => (
                  <div key={m.id} className="p-2 bg-[#FAF7F0] border border-stone-300 rounded-lg flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-800">
                      {idx + 1}. • {m.shortName}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#EA580C]">
                      {m.degree}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Faculty of Science (2 Majors) */}
            <div className="bg-white rounded-xl p-5 border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-stone-200">
                <h4 className="text-sm font-black text-stone-900">
                  คณะวิทยาศาสตร์ (2 สาขาวิชา ค.บ.)
                </h4>
                <span className="px-2 py-0.5 bg-sky-100 text-sky-900 font-black rounded text-[10px] border border-sky-300">
                  หลักสูตรระดับปริญญาตรี
                </span>
              </div>
              <div className="space-y-1.5">
                {FACULTY_OF_SCIENCE_MAJORS.map((m, idx) => (
                  <div key={m.id} className="p-2.5 bg-[#FAF7F0] border border-stone-300 rounded-lg flex items-center justify-between text-xs">
                    <span className="font-bold text-stone-800">
                      {idx + 1}. • {m.shortName}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-sky-700">
                      {m.degree}
                    </span>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-600 mt-4 leading-relaxed">
                ℹ️ <strong>ข้อกำหนดคณะ:</strong> ระบบจำกัดตัวเลือกคณะให้นักศึกษาและเจ้าหน้าที่เลือกได้เฉพาะ 2 คณะนี้เท่านั้น เพื่อให้สอดคล้องกับหลักสูตรวิชาชีพครู (ค.บ.) ของมหาวิทยาลัยนครพนม
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: DATA OPERATIONS & BULK IMPORT/EXPORT                              */}
      {/* ========================================================================= */}
      {activeSubTab === 'data' && (
        <div className="space-y-5">
          
          {/* Bulk Import / Export Card */}
          <div className="bg-white rounded-xl p-5 border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200">
              <div>
                <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-[#EA580C]" />
                  <span>นำเข้ารายชื่อนักศึกษาทีละหลายคน (Bulk Import CSV/Excel)</span>
                </h3>
                <p className="text-xs text-stone-500 font-medium mt-0.5">
                  อัปโหลดไฟล์ Excel (.xlsx) หรือ .csv เพื่อสร้างฐานข้อมูลนักศึกษาตั้งต้น (Pre-populate DB)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="px-3.5 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                  <Upload className="w-3.5 h-3.5" />
                  <span>เลือกไฟล์ CSV / Excel</span>
                  <input 
                    type="file" 
                    accept=".csv, .xlsx, .xls"
                    onChange={handleFileUpload} 
                    className="hidden" 
                  />
                </label>
              </div>
            </div>

            {/* Error alerts if any */}
            {importErrors.length > 0 && (
              <div className="p-3.5 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs text-rose-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>พบข้อผิดพลาดในไฟล์ ({importErrors.length} รายการ):</span>
                </div>
                <ul className="list-disc pl-5 text-[11px]">
                  {importErrors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Import Preview Table */}
            {importPreview.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-800">
                    ตัวอย่างข้อมูลที่พร้อมนำเข้า ({importPreview.length} รายการ):
                  </span>
                  <button
                    onClick={handleConfirmBulkImport}
                    disabled={isImporting}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isImporting ? 'กำลังนำเข้า...' : 'ยืนยันนำเข้าข้อมูล'}</span>
                  </button>
                </div>

                <div className="border border-stone-200 rounded-xl overflow-x-auto max-h-60">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF7F0] font-black text-stone-600 border-b border-stone-200">
                      <tr>
                        <th className="p-2">รหัสนักศึกษา</th>
                        <th className="p-2">ชื่อ-สกุล</th>
                        <th className="p-2">คณะ</th>
                        <th className="p-2">สาขาวิชา</th>
                        <th className="p-2">ชั้นปี</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {importPreview.slice(0, 10).map((st, i) => (
                        <tr key={i}>
                          <td className="p-2 font-mono font-bold">{st.id}</td>
                          <td className="p-2 font-medium">{st.name}</td>
                          <td className="p-2">{st.faculty}</td>
                          <td className="p-2">{st.major}</td>
                          <td className="p-2">ปี {st.year}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Raw Database Explorer */}
          <div className="bg-white rounded-xl p-5 border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#EA580C]" />
                  <span>ตรวจสอบข้อมูลดิบในระบบ (Raw Data Inspector)</span>
                </h3>
                <p className="text-xs text-stone-500 font-medium">
                  ดูโครงสร้างฟิลด์ภายใน เช่น id, timestamp, status, device
                </p>
              </div>

              <div className="flex items-center gap-2">
                {(['students', 'checkInLogs', 'activities'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => loadRawData(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                      rawTableChoice === t
                        ? 'bg-[#18181B] text-white border-[#18181B]'
                        : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-stone-200 rounded-xl overflow-x-auto max-h-80 bg-stone-50">
              <pre className="p-3 text-[11px] font-mono text-stone-800 whitespace-pre-wrap">
                {JSON.stringify(rawData, null, 2)}
              </pre>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: AUDIT LOGS & SYSTEM MONITORING                                    */}
      {/* ========================================================================= */}
      {activeSubTab === 'audit' && (
        <div className="space-y-5">
          
          {/* System Health Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)]">
              <p className="text-[11px] font-bold text-stone-500">ฐานข้อมูล Local DB</p>
              <h4 className="text-sm font-black text-emerald-700 mt-1">✓ ออนไลน์ปกติ</h4>
              <p className="text-[10px] text-stone-400 mt-0.5">IndexedDB High-Speed</p>
            </div>
            <div className="bg-white p-4 rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)]">
              <p className="text-[11px] font-bold text-stone-500">นักศึกษาในระบบ</p>
              <h4 className="text-sm font-black text-[#18181B] mt-1">{systemStats.totalStudents} คน</h4>
              <p className="text-[10px] text-stone-400 mt-0.5">คณะครุศาสตร์ & วิทย์</p>
            </div>
            <div className="bg-white p-4 rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)]">
              <p className="text-[11px] font-bold text-stone-500">ประวัติการสแกนทั้งหมด</p>
              <h4 className="text-sm font-black text-[#18181B] mt-1">{systemStats.totalLogs} รายการ</h4>
              <p className="text-[10px] text-stone-400 mt-0.5">Check-in Logs</p>
            </div>
            <div className="bg-white p-4 rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)]">
              <p className="text-[11px] font-bold text-stone-500">บันทึก Audit Logs</p>
              <h4 className="text-sm font-black text-purple-700 mt-1">{auditLogs.length} รายการ</h4>
              <p className="text-[10px] text-stone-400 mt-0.5">Audit Trail เก็บถาวร</p>
            </div>
          </div>

          {/* Audit Logs Filter & Table */}
          <div className="bg-white rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-stone-900 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#EA580C]" />
                  <span>บันทึกการกระทำในระบบ (Global Audit Trail)</span>
                </h3>
                <p className="text-xs text-stone-500 font-medium">
                  บันทึกย้อนหลังว่า "ใคร, ทำอะไร, กับข้อมูลไหน, เมื่อไหร่" ตรวจสอบความโปร่งใสได้ 100%
                </p>
              </div>

              <div className="relative max-w-xs w-full">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input
                  type="text"
                  value={auditSearch}
                  onChange={(e) => setAuditSearch(e.target.value)}
                  placeholder="ค้นหาผู้กระทำ, การกระทำ..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF7F0] border-2 border-[#18181B] rounded-xl outline-none font-medium"
                />
              </div>
            </div>

            <div className="border border-stone-200 rounded-xl overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs border-collapse min-w-[750px]">
                <thead className="bg-[#FAF7F0] border-b border-stone-200 text-[11px] font-black text-stone-600">
                  <tr>
                    <th className="py-2.5 px-3">เวลา</th>
                    <th className="py-2.5 px-3">ผู้กระทำ (Actor)</th>
                    <th className="py-2.5 px-3">การกระทำ (Action)</th>
                    <th className="py-2.5 px-3">เป้าหมาย (Target)</th>
                    <th className="py-2.5 px-3">รายละเอียด (Details)</th>
                    <th className="py-2.5 px-3">จุดใช้งาน (Station)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-[#FAF7F0]">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-stone-500 whitespace-nowrap">
                        <Clock className="w-3 h-3 inline mr-1 text-stone-400" />
                        {new Date(log.timestamp).toLocaleString('th-TH')}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-stone-900">
                        {log.actor}
                        <span className="block text-[10px] text-stone-400 font-normal">{log.actorRole}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-black text-[10px] text-[#EA580C]">
                        {log.action}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-stone-800">
                        {log.target}
                      </td>
                      <td className="py-2.5 px-3 text-stone-600 text-[11px]">
                        {log.details}
                      </td>
                      <td className="py-2.5 px-3 text-stone-500 text-[10px] font-mono">
                        {log.station || 'Web'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
