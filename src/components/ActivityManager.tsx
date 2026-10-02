import React, { useState, useEffect, useRef } from 'react';
import { db, purgeSelfCreatedActivities } from '../db/db';
import { Activity } from '../types';
import { REAL_FACULTY_ACTIVITIES } from '../data/realActivities';
import * as XLSX from 'xlsx';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Power, 
  Search, 
  RotateCcw, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  GraduationCap,
  Upload,
  Download,
  FileSpreadsheet,
  Check,
  X,
  QrCode,
  Users
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';
import { ActivityQrPosterModal } from './admin/ActivityQrPosterModal';

export const ActivityManager: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedCohort, setSelectedCohort] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<'all' | 'imported' | 'custom'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [selectedActivityForPoster, setSelectedActivityForPoster] = useState<Activity | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newActivity, setNewActivity] = useState({ 
    id: '',
    name: '', 
    date: '', 
    endDate: '', 
    category: 'ประสบการณ์วิชาชีพ (ก่อนฝึก)',
    yearLevel: 'ปี 1 (รหัส 69)',
    cohort: '69',
    hours: 3,
    points: 10,
    capacity: 150,
    assignedStaff: '',
    selfCheckInAllowed: true,
    description: '', 
    location: '',
    scheduleStatus: 'คงเดิม' as 'คงเดิม' | 'เปลี่ยนวัน' | 'เปลี่ยนช่วงเวลา',
    originalSchedule: '',
    newSchedule: '',
    duration: '',
    note: ''
  });

  const [activityToDelete, setActivityToDelete] = useState<Activity | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Set of real faculty activity IDs
  const realIds = React.useMemo(() => new Set(REAL_FACULTY_ACTIVITIES.map(a => a.id)), []);

  const isActivityImported = (act: Activity): boolean => {
    return act.isImported === true || realIds.has(act.id);
  };

  const loadActivities = async () => {
    const acts = await db.activities.toArray();
    // Sort logically: by cohort order (69, 68, 67, 66) or by ID
    const sorted = acts.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    setActivities(sorted);
  };

  useEffect(() => {
    loadActivities();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const customActivitiesCount = activities.filter(a => !isActivityImported(a)).length;
  const importedActivitiesCount = activities.filter(isActivityImported).length;

  const handleAddActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.name.trim()) return;

    const genId = newActivity.id.trim() || `ACT_${Date.now()}`;
    const staffList = newActivity.assignedStaff
      ? newActivity.assignedStaff.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    const newAct: Activity = {
      id: genId,
      name: newActivity.name,
      date: newActivity.date || new Date().toISOString().split('T')[0],
      endDate: newActivity.endDate || undefined,
      description: newActivity.description || '',
      location: newActivity.location || 'คณะครุศาสตร์ มหาวิทยาลัยนครพนม',
      status: 'active',
      category: newActivity.category,
      yearLevel: newActivity.yearLevel,
      cohort: newActivity.cohort,
      hours: Number(newActivity.hours) || 3,
      points: Number(newActivity.points) || 10,
      capacity: Number(newActivity.capacity) || 150,
      assignedStaffEmails: staffList.length > 0 ? staffList : undefined,
      selfCheckInAllowed: newActivity.selfCheckInAllowed,
      scheduleStatus: newActivity.scheduleStatus,
      originalSchedule: newActivity.originalSchedule,
      newSchedule: newActivity.newSchedule,
      duration: newActivity.duration,
      note: newActivity.note,
      isImported: false,
      source: 'custom'
    };

    await db.activities.put(newAct);
    setNewActivity({ 
      id: '',
      name: '', 
      date: '', 
      endDate: '', 
      category: 'ประสบการณ์วิชาชีพ (ก่อนฝึก)',
      yearLevel: 'ปี 1 (รหัส 69)',
      cohort: '69',
      hours: 3,
      description: '', 
      location: '',
      scheduleStatus: 'คงเดิม',
      originalSchedule: '',
      newSchedule: '',
      duration: '',
      note: ''
    });
    setIsFormOpen(false);
    window.dispatchEvent(new CustomEvent('db_updated'));
    await loadActivities();
    setNotification({
      type: 'info',
      message: `เพิ่มกิจกรรม "${newAct.name}" สำเร็จ (สร้างขึ้นเอง สามารถลบออกได้ตลอดเวลา)`
    });
  };

  const handleDeleteActivity = async () => {
    if (!activityToDelete) return;
    await db.activities.delete(activityToDelete.id);
    setActivityToDelete(null);
    window.dispatchEvent(new CustomEvent('db_updated'));
    await loadActivities();
    setNotification({
      type: 'success',
      message: 'ลบกิจกรรมสำเร็จ'
    });
  };

  const toggleStatus = async (act: Activity) => {
    const newStatus = act.status === 'active' ? 'completed' : 'active';
    await db.activities.update(act.id, { status: newStatus });
    await loadActivities();
  };

  const handleRestoreRealActivities = async () => {
    await db.activities.bulkPut(REAL_FACULTY_ACTIVITIES);
    setShowResetConfirm(false);
    window.dispatchEvent(new CustomEvent('db_updated'));
    await loadActivities();
    setNotification({
      type: 'success',
      message: 'ซิงค์และรีเซ็ตข้อมูลกิจกรรม 18 รายการของคณะครุศาสตร์เรียบร้อยแล้ว'
    });
  };

  const handlePurgeSelfCreatedActivities = async () => {
    const result = await purgeSelfCreatedActivities();
    setShowPurgeConfirm(false);
    await loadActivities();
    setNotification({
      type: 'success',
      message: `ลบกิจกรรมที่สร้างขึ้นเองเรียบร้อยแล้ว (${result.deletedCount} รายการ) เหลือเฉพาะที่นำเข้าทั้งหมด (${result.keptCount} รายการ)`
    });
  };

  // Excel / CSV File Import Handler
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawRows = XLSX.utils.sheet_to_json<any>(worksheet);

      if (!rawRows || rawRows.length === 0) {
        setNotification({ type: 'error', message: 'ไฟล์ที่อัปโหลดไม่มีข้อมูลกิจกรรม' });
        return;
      }

      const importedActivities: Activity[] = rawRows.map((row, index) => {
        const id = String(row['รหัสกิจกรรม'] || row['รหัส'] || row['id'] || row['ID'] || `IMP_${Date.now()}_${index + 1}`).trim();
        const name = String(row['ชื่อกิจกรรม'] || row['ชื่อ'] || row['name'] || row['title'] || `กิจกรรมนำเข้า ${index + 1}`).trim();
        const date = String(row['วันที่'] || row['วันที่จัดกิจกรรม'] || row['date'] || new Date().toISOString().split('T')[0]).trim();
        const endDate = row['วันที่สิ้นสุด'] || row['endDate'] || row['end_date'] ? String(row['วันที่สิ้นสุด'] || row['endDate'] || row['end_date']).trim() : undefined;
        const hours = Number(row['จำนวนกิจกรรม'] || row['กิจกรรมสะสม'] || row['ชั่วโมง'] || row['ชั่วโมงสะสม'] || row['hours'] || 1);
        const location = String(row['สถานที่'] || row['สถานที่จัด'] || row['location'] || 'คณะครุศาสตร์ มหาวิทยาลัยนครพนม').trim();
        const description = String(row['คำอธิบาย'] || row['รายละเอียด'] || row['description'] || '').trim();
        const category = String(row['ประเภทกิจกรรม'] || row['หมวดหมู่'] || row['category'] || 'กิจกรรมวิชาชีพครู').trim();
        const yearLevel = String(row['ชั้นปี'] || row['yearLevel'] || 'ทุกชั้นปี').trim();
        const cohort = String(row['รุ่น'] || row['cohort'] || '').trim();
        const scheduleStatus = row['สถานะกำหนดการ'] || 'คงเดิม';
        const originalSchedule = row['กำหนดการเดิม'] ? String(row['กำหนดการเดิม']) : undefined;
        const newSchedule = row['กำหนดการใหม่'] ? String(row['กำหนดการใหม่']) : undefined;
        const duration = row['ระยะเวลา'] || row['duration'] ? String(row['ระยะเวลา'] || row['duration']) : undefined;
        const note = row['หมายเหตุ'] || row['note'] ? String(row['หมายเหตุ'] || row['note']) : undefined;

        return {
          id,
          name,
          date,
          endDate,
          hours: isNaN(hours) ? 3 : hours,
          location,
          description,
          category,
          yearLevel,
          cohort,
          scheduleStatus,
          originalSchedule,
          newSchedule,
          duration,
          note,
          status: 'active' as const,
          isImported: true,
          source: 'imported' as const
        };
      });

      await db.activities.bulkPut(importedActivities);
      window.dispatchEvent(new CustomEvent('db_updated'));
      await loadActivities();

      setNotification({ 
        type: 'success', 
        message: `นำเข้ากิจกรรมจากไฟล์สำเร็จจำนวน ${importedActivities.length} รายการ` 
      });
    } catch (err: any) {
      console.error('Import error:', err);
      setNotification({ 
        type: 'error', 
        message: `เกิดข้อผิดพลาดในการนำเข้าไฟล์: ${err.message || 'รูปแบบไฟล์ไม่ถูกต้อง'}` 
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'รหัสกิจกรรม': 'ACT-EX-01',
        'ชื่อกิจกรรม': 'ตัวอย่าง: สัมมนาเชิงปฏิบัติการวิชาชีพครู',
        'วันที่': '2027-02-15',
        'วันที่สิ้นสุด': '2027-02-15',
        'จำนวนกิจกรรม': 1,
        'สถานที่': 'หอประชุม คณะครุศาสตร์ มหาวิทยาลัยนครพนม',
        'ประเภทกิจกรรม': 'กิจกรรมวิชาชีพครู',
        'ชั้นปี': 'ปี 1 (รหัส 69)',
        'รุ่น': '69',
        'กำหนดการเดิม': '15 ก.พ. 2570',
        'กำหนดการใหม่': '15 ก.พ. 2570',
        'สถานะกำหนดการ': 'คงเดิม',
        'ระยะเวลา': '1 วัน',
        'คำอธิบาย': 'อบรมเพื่อพัฒนาทักษะวิชาชีพครูและเจตคติทางการศึกษา'
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    XLSX.utils.book_append_sheet(wb, ws, 'แบบฟอร์มกิจกรรม');
    XLSX.writeFile(wb, 'แบบฟอร์มนำเข้ากิจกรรม_NPU.xlsx');
  };

  // Filter logic
  const filteredActivities = activities.filter(act => {
    // Cohort filter
    if (selectedCohort !== 'all' && act.cohort !== selectedCohort) {
      return false;
    }
    // Category filter
    if (selectedCategory !== 'all' && act.category !== selectedCategory) {
      return false;
    }
    // Source filter (imported vs custom)
    const isImp = isActivityImported(act);
    if (selectedSource === 'imported' && !isImp) {
      return false;
    }
    if (selectedSource === 'custom' && isImp) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = act.name.toLowerCase().includes(q);
      const matchId = (act.id || '').toLowerCase().includes(q);
      const matchLoc = (act.location || '').toLowerCase().includes(q);
      const matchYear = (act.yearLevel || '').toLowerCase().includes(q);
      if (!matchName && !matchId && !matchLoc && !matchYear) return false;
    }
    return true;
  });

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'เปลี่ยนช่วงเวลา':
        return <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300">เปลี่ยนช่วงเวลา</span>;
      case 'เปลี่ยนวัน':
        return <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-orange-100 text-orange-800 border border-orange-300">เปลี่ยนวัน</span>;
      case 'คงเดิม':
      default:
        return <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">คงเดิม</span>;
    }
  };

  const getCategoryBadgeColor = (cat?: string) => {
    if (!cat) return 'bg-slate-100 text-slate-700';
    if (cat.includes('ก่อนฝึก')) return 'bg-sky-100 text-sky-800 border-sky-200';
    if (cat.includes('หลังฝึก')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (cat.includes('กิจกรรมวิชาชีพครู')) return 'bg-teal-100 text-teal-800 border-teal-200';
    return 'bg-amber-100 text-amber-800 border-amber-200';
  };

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 font-sans space-y-6">
      
      {/* Hidden File Input for Excel Import */}
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleImportExcel}
        accept=".xlsx,.xls,.csv"
        className="hidden"
      />

      {/* Notification Banner */}
      {notification && (
        <div className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 text-xs font-bold transition-all shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] ${
          notification.type === 'success' 
            ? 'bg-emerald-50 text-emerald-900 border-emerald-600' 
            : notification.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-600'
              : 'bg-amber-50 text-amber-900 border-amber-600'
        }`}>
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-black/5 rounded-lg"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 bg-[#EA580C] text-white text-xs font-black rounded-lg">
              FACULTY OF EDUCATION
            </span>
            <span className="text-xs font-bold text-stone-500">
              คณะครุศาสตร์ มหาวิทยาลัยนครพนม
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-[#18181B] mt-1">
            รายการกิจกรรมตามแผนปฏิบัติการ ({activities.length} กิจกรรม)
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
            ครอบคลุมนักศึกษา 4 ชั้นปี (รหัส 69, 68, 67, 66) คณะครุศาสตร์และคณะวิทยาศาสตร์
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Add Activity Button */}
          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="px-4 py-2 text-xs font-bold bg-[#FACC15] hover:bg-amber-400 text-[#18181B] rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{isFormOpen ? 'ปิดฟอร์ม' : 'เพิ่มกิจกรรมใหม่'}</span>
          </button>
        </div>
      </div>

      {/* Warning Banner if Custom Activities are detected */}
      {customActivitiesCount > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[2px_2px_0px_0px_rgba(245,158,11,0.2)]">
          <div className="flex items-start sm:items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <p className="font-black text-amber-900 text-sm">
                ตรวจพบกิจกรรมที่สร้างขึ้นเอง {customActivitiesCount} รายการในระบบ
              </p>
              <p className="text-amber-700 text-xs mt-0.5 font-medium">
                ต้องการลบออกให้เหลือเฉพาะกิจกรรมที่นำเข้า (18 รายการของคณะครุศาสตร์ และไฟล์ที่นำเข้า) หรือไม่?
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPurgeConfirm(true)}
            className="px-4 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white text-xs font-black rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] whitespace-nowrap self-start sm:self-center transition-all flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>ลบกิจกรรมที่สร้างเองออกทันที ({customActivitiesCount})</span>
          </button>
        </div>
      )}

      {/* Add New Activity Collapsible Form */}
      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-black text-[#18181B] flex items-center gap-2">
              <Plus className="w-5 h-5 text-[#EA580C]" /> เพิ่มกิจกรรมการเรียนรู้ / ฝึกประสบการณ์
            </h3>
            <span className="text-[11px] px-2.5 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg font-bold">
              กิจกรรมที่สร้างด้วยฟอร์มนี้จะถูกจัดเป็น "สร้างขึ้นเอง" (สามารถลบออกได้)
            </span>
          </div>

          <form onSubmit={handleAddActivity} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block font-bold text-stone-700 mb-1">รหัสกิจกรรม (ID)</label>
                <input 
                  type="text" 
                  value={newActivity.id}
                  onChange={(e) => setNewActivity({...newActivity, id: e.target.value})}
                  className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-200 rounded-xl outline-none focus:border-[#EA580C] font-semibold"
                  placeholder="เช่น ACT-01"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block font-bold text-stone-700 mb-1">ชื่อกิจกรรม *</label>
                <input 
                  type="text" 
                  required
                  value={newActivity.name}
                  onChange={(e) => setNewActivity({...newActivity, name: e.target.value})}
                  className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-200 rounded-xl outline-none focus:border-[#EA580C] font-semibold"
                  placeholder="ระบุชื่อกิจกรรม"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">จำนวนกิจกรรมสะสม (ครั้ง/กิจกรรม)</label>
                <input 
                  type="number" 
                  value={newActivity.hours}
                  onChange={(e) => setNewActivity({...newActivity, hours: Number(e.target.value)})}
                  className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-200 rounded-xl outline-none focus:border-[#EA580C] font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-stone-700 mb-1">ชั้นปี / รุ่น</label>
                <select
                  value={newActivity.cohort}
                  onChange={(e) => {
                    const c = e.target.value;
                    const map: Record<string, string> = {
                      '69': 'ปี 1 (รหัส 69)',
                      '68': 'ปี 2 (รหัส 68)',
                      '67': 'ปี 3 (รหัส 67)',
                      '66': 'ปี 4 (รหัส 66)'
                    };
                    setNewActivity({
                      ...newActivity,
                      cohort: c,
                      yearLevel: map[c] || `รหัส ${c}`
                    });
                  }}
                  className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-200 rounded-xl outline-none font-semibold"
                >
                  <option value="69">ปี 1 (รหัส 69)</option>
                  <option value="68">ปี 2 (รหัส 68)</option>
                  <option value="67">ปี 3 (รหัส 67)</option>
                  <option value="66">ปี 4 (รหัส 66)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">ประเภทกิจกรรม</label>
                <select
                  value={newActivity.category}
                  onChange={(e) => setNewActivity({...newActivity, category: e.target.value})}
                  className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-200 rounded-xl outline-none font-semibold"
                >
                  <option value="ประสบการณ์วิชาชีพ (ก่อนฝึก)">ประสบการณ์วิชาชีพ (ก่อนฝึก)</option>
                  <option value="ประสบการณ์วิชาชีพ">ประสบการณ์วิชาชีพ</option>
                  <option value="ประสบการณ์วิชาชีพ (หลังฝึก)">ประสบการณ์วิชาชีพ (หลังฝึก)</option>
                  <option value="กิจกรรมวิชาชีพครู">กิจกรรมวิชาชีพครู</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-stone-700 mb-1">สถานะกำหนดการ</label>
                <select
                  value={newActivity.scheduleStatus}
                  onChange={(e) => setNewActivity({...newActivity, scheduleStatus: e.target.value as any})}
                  className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-200 rounded-xl outline-none font-semibold"
                >
                  <option value="คงเดิม">คงเดิม</option>
                  <option value="เปลี่ยนวัน">เปลี่ยนวัน</option>
                  <option value="เปลี่ยนช่วงเวลา">เปลี่ยนช่วงเวลา</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-stone-700 mb-1">วันที่เริ่ม</label>
                <input 
                  type="date" 
                  value={newActivity.date}
                  onChange={(e) => setNewActivity({...newActivity, date: e.target.value})}
                  className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-200 rounded-xl outline-none font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">วันที่สิ้นสุด</label>
                <input 
                  type="date" 
                  value={newActivity.endDate}
                  onChange={(e) => setNewActivity({...newActivity, endDate: e.target.value})}
                  className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-200 rounded-xl outline-none font-semibold"
                />
              </div>
              <div>
                <label className="block font-bold text-stone-700 mb-1">สถานที่จัด</label>
                <input 
                  type="text" 
                  value={newActivity.location}
                  onChange={(e) => setNewActivity({...newActivity, location: e.target.value})}
                  className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-200 rounded-xl outline-none font-semibold"
                  placeholder="เช่น หอประชุม คณะครุศาสตร์"
                />
              </div>
            </div>

            {/* Pre-Event Advanced Configuration: Capacity, Points & Staff Assignment */}
            <div className="p-3 bg-amber-50/70 border-2 border-amber-200 rounded-xl space-y-3">
              <div className="text-xs font-black text-amber-900 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-amber-700" />
                <span>การตั้งค่าล่วงหน้า (Pre-Event Configuration & Staff Assignment)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    จำนวนรับสมัครสูงสุด (Capacity)
                  </label>
                  <input 
                    type="number"
                    min="1"
                    value={newActivity.capacity}
                    onChange={(e) => setNewActivity({...newActivity, capacity: Number(e.target.value)})}
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg font-bold outline-none"
                    placeholder="เช่น 150 (คน)"
                  />
                  <span className="text-[10px] text-stone-500">ระบบจะขึ้นแถบเตือนสีส้มเมื่อผู้เข้าร่วมถึง 90%</span>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    คะแนนสะสมกิจกรรม (Activity Points)
                  </label>
                  <input 
                    type="number"
                    min="0"
                    value={newActivity.points}
                    onChange={(e) => setNewActivity({...newActivity, points: Number(e.target.value)})}
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg font-bold outline-none"
                    placeholder="เช่น 10 (คะแนน)"
                  />
                  <span className="text-[10px] text-stone-500">บันทึกลงสมุดกิจกรรมนักศึกษา</span>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">
                    กำหนดสิทธิ์เจ้าหน้าที่ (Staff Emails)
                  </label>
                  <input 
                    type="text"
                    value={newActivity.assignedStaff}
                    onChange={(e) => setNewActivity({...newActivity, assignedStaff: e.target.value})}
                    className="w-full px-3 py-1.5 bg-white border border-stone-300 rounded-lg font-medium outline-none"
                    placeholder="เช่น staff1@npu.ac.th, staff2@npu.ac.th"
                  />
                  <span className="text-[10px] text-stone-500">เว้นว่างไว้หากอนุญาตให้สตาฟฟ์ทุกคนสแกนได้</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input 
                  type="checkbox"
                  id="selfCheckInAllowed"
                  checked={newActivity.selfCheckInAllowed}
                  onChange={(e) => setNewActivity({...newActivity, selfCheckInAllowed: e.target.checked})}
                  className="rounded border-stone-300 text-[#EA580C] focus:ring-[#EA580C] w-4 h-4 cursor-pointer"
                />
                <label htmlFor="selfCheckInAllowed" className="text-xs font-bold text-stone-800 cursor-pointer">
                  อนุญาตให้นักศึกษาสแกน QR ประจำกิจกรรมด้วยตนเอง (Self-Check-in) ผ่านโปสเตอร์หน้างาน
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white font-bold rounded-xl shadow-sm"
              >
                บันทึกกิจกรรม
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Cohort Tabs, Source Filter & Search */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] space-y-4">
        
        {/* Source Filter Tabs (All vs Imported vs Custom) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-stone-700">ที่มาของกิจกรรม:</span>
            {[
              { id: 'all', label: 'ทั้งหมด', count: activities.length },
              { id: 'imported', label: 'ที่นำเข้าเท่านั้น', count: importedActivitiesCount },
              { id: 'custom', label: 'สร้างขึ้นเอง', count: customActivitiesCount },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedSource(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  selectedSource === tab.id
                    ? 'bg-[#18181B] text-white shadow-[2px_2px_0px_0px_rgba(234,88,12,1)]'
                    : 'bg-[#FAF7F0] text-stone-700 hover:bg-stone-200 border border-stone-300'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  selectedSource === tab.id ? 'bg-[#EA580C] text-white' : 'bg-stone-200 text-stone-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {customActivitiesCount > 0 && (
            <button
              onClick={() => setShowPurgeConfirm(true)}
              className="text-xs text-rose-600 hover:text-rose-800 font-bold underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ลบรายการสร้างเอง ({customActivitiesCount}) ออกทั้งหมด</span>
            </button>
          )}
        </div>

        {/* Cohort Navigation Pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'all', label: 'ทุกชั้นปี', count: activities.length },
            { id: '69', label: 'ปี 1 (รหัส 69)', count: activities.filter(a => a.cohort === '69').length },
            { id: '68', label: 'ปี 2 (รหัส 68)', count: activities.filter(a => a.cohort === '68').length },
            { id: '67', label: 'ปี 3 (รหัส 67)', count: activities.filter(a => a.cohort === '67').length },
            { id: '66', label: 'ปี 4 (รหัส 66)', count: activities.filter(a => a.cohort === '66').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedCohort(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedCohort === tab.id
                  ? 'bg-[#EA580C] text-white shadow-[1px_1px_0px_0px_rgba(24,24,27,1)]'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                selectedCohort === tab.id ? 'bg-white text-[#EA580C]' : 'bg-stone-200 text-stone-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Category Filter Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อกิจกรรม, รหัส เช่น Y1-01, สถานที่..."
              className="w-full pl-9 pr-3 py-2 bg-[#FAF7F0] border-2 border-stone-200 rounded-xl text-xs font-semibold outline-none focus:border-[#EA580C]"
            />
          </div>

          <div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-[#FAF7F0] border-2 border-stone-200 rounded-xl text-xs font-bold outline-none focus:border-[#EA580C]"
            >
              <option value="all">ทุกประเภทกิจกรรม ({activities.length})</option>
              <option value="ประสบการณ์วิชาชีพ (ก่อนฝึก)">ประสบการณ์วิชาชีพ (ก่อนฝึก)</option>
              <option value="ประสบการณ์วิชาชีพ">ประสบการณ์วิชาชีพ</option>
              <option value="ประสบการณ์วิชาชีพ (หลังฝึก)">ประสบการณ์วิชาชีพ (หลังฝึก)</option>
              <option value="กิจกรรมวิชาชีพครู">กิจกรรมวิชาชีพครู</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity Cards List */}
      <div className="space-y-3">
        {filteredActivities.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border-2 border-stone-200">
            <Calendar className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="font-bold text-stone-600">ไม่พบกิจกรรมที่ตรงกับเงื่อนไขการค้นหา</p>
            <p className="text-xs text-stone-400 mt-1">ลองเปลี่ยนตัวกรองชั้นปีหรือล้างคำค้นหา</p>
          </div>
        ) : (
          filteredActivities.map((act) => {
            const isLive = act.status === 'active';
            const isImp = isActivityImported(act);

            return (
              <div 
                key={act.id} 
                className={`bg-white rounded-2xl p-5 border-2 transition-all ${
                  isLive 
                    ? 'border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)]' 
                    : 'border-stone-200 opacity-65 bg-stone-50'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Left Column: Badges & Title */}
                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* ID Badge */}
                      <span className="px-2.5 py-0.5 bg-[#18181B] text-[#FACC15] text-xs font-black rounded-lg">
                        {act.id}
                      </span>

                      {/* Import Status Badge */}
                      {isImp ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 text-[11px] font-black rounded-lg border border-emerald-300 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>นำเข้าแล้ว</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-50 text-amber-800 text-[11px] font-black rounded-lg border border-amber-300 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          <span>สร้างขึ้นเอง</span>
                        </span>
                      )}

                      {/* Cohort Badge */}
                      {act.yearLevel && (
                        <span className="px-2.5 py-0.5 bg-orange-50 text-[#EA580C] text-[11px] font-bold rounded-lg border border-orange-200 flex items-center gap-1">
                          <GraduationCap className="w-3 h-3" />
                          {act.yearLevel}
                        </span>
                      )}

                      {/* Category Badge */}
                      {act.category && (
                        <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-lg border ${getCategoryBadgeColor(act.category)}`}>
                          {act.category}
                        </span>
                      )}

                      {/* Schedule Status Badge */}
                      {getStatusBadge(act.scheduleStatus)}

                      {/* Live Scanning Badge */}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        isLive ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-200 text-stone-600'
                      }`}>
                        {isLive ? '● เปิดรับสแกน' : '○ ปิดการรับ'}
                      </span>
                    </div>

                    {/* Activity Name */}
                    <h3 className="text-base sm:text-lg font-black text-[#18181B] leading-snug">
                      {act.name}
                    </h3>

                    {/* Meta info: Schedule Comparison & Location */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-stone-600 pt-1">
                      {/* Schedule info */}
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                        <span>
                          {act.newSchedule ? (
                            <>
                              <strong className="text-stone-900">กำหนดใหม่:</strong> {act.newSchedule}
                              {act.originalSchedule && act.scheduleStatus !== 'คงเดิม' && (
                                <span className="text-stone-400 block text-[10px]">
                                  (เดิม: {act.originalSchedule})
                                </span>
                              )}
                            </>
                          ) : (
                            <span>{act.date} {act.endDate ? `- ${act.endDate}` : ''}</span>
                          )}
                        </span>
                      </div>

                      {/* Duration & Count */}
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                        <span>
                          {act.duration && <span>{act.duration} • </span>}
                          <strong className="text-stone-900">{act.hours || 1} กิจกรรม</strong>
                        </span>
                      </div>

                      {/* Location */}
                      <div className="flex items-center gap-1.5 sm:col-span-2 lg:col-span-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span className="truncate">{act.location || 'คณะครุศาสตร์'}</span>
                      </div>

                      {/* Capacity if available */}
                      {act.capacity && (
                        <div className="flex items-center gap-1.5 sm:col-span-2 lg:col-span-1">
                          <Users className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                          <span className="font-semibold text-purple-900">
                            จำกัด: {act.capacity} คน
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Note if any */}
                    {act.note && (
                      <p className="text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-medium inline-block">
                        ℹ️ {act.note}
                      </p>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-stone-100">
                    <button
                      onClick={() => setSelectedActivityForPoster(act)}
                      className="px-2.5 py-1.5 text-xs font-bold rounded-xl transition-all border border-stone-300 bg-white hover:bg-stone-50 text-stone-800 flex items-center gap-1.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                      title="พิมพ์ QR Code โปสเตอร์ติดหน้างานสำหรับเช็คอินตนเอง"
                    >
                      <QrCode className="w-3.5 h-3.5 text-[#EA580C]" />
                      <span>QR โปสเตอร์</span>
                    </button>

                    <button
                      onClick={() => toggleStatus(act)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all border flex items-center gap-1.5 ${
                        isLive
                          ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      {isLive ? 'ปิดรับสแกน' : 'เปิดรับสแกน'}
                    </button>

                    <button
                      onClick={() => setActivityToDelete(act)}
                      className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      title={isImp ? "ลบกิจกรรม (รายการที่นำเข้า)" : "ลบกิจกรรม (สร้างขึ้นเอง)"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Single Activity Delete Confirmation Modal */}
      <ConfirmModal 
        isOpen={!!activityToDelete}
        title="ยืนยันการลบกิจกรรม"
        message={
          <span>
            คุณแน่ใจหรือไม่ว่าต้องการลบกิจกรรม <strong>{activityToDelete?.name} ({activityToDelete?.id})</strong> ออกจากระบบ?
          </span>
        }
        confirmText="ยืนยันการลบ"
        cancelText="ยกเลิก"
        onConfirm={handleDeleteActivity}
        onCancel={() => setActivityToDelete(null)}
        variant="danger"
      />

      {/* Purge All Self-Created Activities Modal */}
      <ConfirmModal
        isOpen={showPurgeConfirm}
        title="ลบกิจกรรมที่สร้างขึ้นมาเองทั้งหมด"
        message={
          <div className="space-y-2">
            <p>
              ระบบจะทำการ <strong>ลบกิจกรรมที่สร้างขึ้นมาเองทั้งหมด ({customActivitiesCount} รายการ)</strong> ออกจากฐานข้อมูล
            </p>
            <p className="text-stone-600 text-xs">
              กิจกรรมที่นำเข้า (ทั้ง 18 รายการของคณะครุศาสตร์ และรายการที่นำเข้าจากไฟล์ Excel/CSV) จะยังคงอยู่ครบถ้วน
            </p>
          </div>
        }
        confirmText={`ยืนยันลบ (${customActivitiesCount} รายการ)`}
        cancelText="ยกเลิก"
        onConfirm={handlePurgeSelfCreatedActivities}
        onCancel={() => setShowPurgeConfirm(false)}
        variant="danger"
      />

      {/* Reset Real Activities Modal */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="รีเซ็ตและโหลดกิจกรรมจริง 18 รายการ"
        message={
          <span>
            ระบบจะอัปเดตและเขียนทับรายการกิจกรรมทั้ง 18 รายการของคณะครุศาสตร์ มหาวิทยาลัยนครพนม (รหัส 69, 68, 67, 66) ให้เป็นไปตามแผนปฏิบัติการล่าสุด
          </span>
        }
        confirmText="ยืนยันโหลด 18 รายการ"
        cancelText="ยกเลิก"
        onConfirm={handleRestoreRealActivities}
        onCancel={() => setShowResetConfirm(false)}
        variant="warning"
      />

      {/* Printable Activity QR Self-Check-in Poster Modal */}
      <ActivityQrPosterModal
        isOpen={!!selectedActivityForPoster}
        onClose={() => setSelectedActivityForPoster(null)}
        activity={selectedActivityForPoster}
      />
    </div>
  );
};
