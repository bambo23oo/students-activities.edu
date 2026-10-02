import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import { Activity, Student, CheckInLog, Reflection } from '../types';
import { 
  MoreHorizontal, 
  Search, 
  Bell, 
  Plus, 
  Trash2, 
  Edit3, 
  ChevronDown, 
  TrendingUp,
  Calendar as CalendarIcon,
  Download,
  QrCode,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Send,
  Zap,
  FileCheck,
  Check
} from 'lucide-react';

interface StaffDashboardViewProps {
  onNavigate: (tab: 'scanner' | 'history' | 'activities' | 'review' | 'reports' | 'database') => void;
  onQuickScan?: () => void;
  onAddActivity?: () => void;
}

export const StaffDashboardView: React.FC<StaffDashboardViewProps> = ({
  onNavigate,
  onQuickScan,
  onAddActivity
}) => {
  const [calendarView, setCalendarView] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [stats, setStats] = useState({
    totalCheckIns: 4000,
    pendingReview: 3430,
    approved: 570,
    activeStudents: 1250
  });

  const [recentStudents, setRecentStudents] = useState<Array<{
    id: string;
    name: string;
    email: string;
    department: string;
    status: 'active' | 'pending' | 'approved';
    avatarUrl: string;
    studentId: string;
  }>>([
    {
      id: '1',
      name: 'กิตติศักดิ์ ศรีวรสาร',
      email: 'kittisak.s@npu.ac.th',
      department: 'คอมพิวเตอร์ศึกษา',
      status: 'active',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      studentId: '66309010001'
    },
    {
      id: '2',
      name: 'ศิริสุดา นามวงษา',
      email: 'srisuda.n@npu.ac.th',
      department: 'การศึกษาปฐมวัย',
      status: 'active',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80',
      studentId: '66309010002'
    },
    {
      id: '3',
      name: 'ธนดล ไชยสงคราม',
      email: 'thanadol.c@npu.ac.th',
      department: 'พลศึกษา',
      status: 'active',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      studentId: '66309010003'
    },
    {
      id: '4',
      name: 'พิมพาภรณ์ อินทร์ธิราช',
      email: 'pimpaporn.i@npu.ac.th',
      department: 'ภาษาไทย',
      status: 'active',
      avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      studentId: '67309010015'
    },
    {
      id: '5',
      name: 'วรเมธ แก้วมณี',
      email: 'worameth.k@npu.ac.th',
      department: 'วิทยาศาสตร์ทั่วไป',
      status: 'active',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
      studentId: '67309010022'
    }
  ]);

  const [recentActivities] = useState([
    {
      id: '1',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      text: 'สแกนบัตรนักศึกษาสำเร็จ: นายกิตติศักดิ์ ศรีวรสาร',
      time: '2 นาทีที่แล้ว'
    },
    {
      id: '2',
      avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&auto=format&fit=crop&q=80',
      text: 'ส่งแบบประเมิน K-P-A: นางสาวศิริสุดา นามวงษา',
      time: '14 นาทีที่แล้ว'
    },
    {
      id: '3',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      text: 'อนุมัติผลกิจกรรม: พิธีไหว้ครู ประจำปี 2569',
      time: '35 นาทีที่แล้ว'
    },
    {
      id: '4',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      text: 'ลงทะเบียนกิจกรรมใหม่: สัมมนาจิตอาสาพัฒนาภูมิทัศน์',
      time: '1 ชั่วโมงที่แล้ว'
    }
  ]);

  // Load real numbers from IndexedDB
  useEffect(() => {
    const loadRealStats = async () => {
      try {
        const checkInsCount = await db.checkInLogs.count();
        const studentsCount = await db.students.count();

        const allLogs = await db.checkInLogs.toArray();
        const pendingCount = allLogs.filter(l => l.staffStatus === 'verified' && l.execStatus === 'pending').length;
        const approvedCount = allLogs.filter(l => l.execStatus === 'approved').length;

        setStats({
          totalCheckIns: checkInsCount > 0 ? checkInsCount : 4000,
          pendingReview: pendingCount > 0 ? pendingCount : 3430,
          approved: approvedCount > 0 ? approvedCount : 570,
          activeStudents: studentsCount > 0 ? studentsCount : 1250
        });

        const dbStudents = await db.students.limit(5).toArray();
        if (dbStudents.length > 0) {
          setRecentStudents(dbStudents.map((s, idx) => ({
            id: s.id,
            name: s.name,
            email: s.email || `${s.id}@npu.ac.th`,
            department: s.major || 'ครุศาสตร์',
            status: 'active',
            avatarUrl: recentStudents[idx % recentStudents.length].avatarUrl,
            studentId: s.id
          })));
        }
      } catch (e) {
        console.error('Failed to load stats', e);
      }
    };
    loadRealStats();
  }, []);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      
      {/* 1. TOP METRICS CARDS ROW (Clean Minimal Studio Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Total Application */}
        <div className="bg-white border-2 border-[#18181B] rounded-xl p-5 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] relative flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#18181B] mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-stone-500">
              Total Application (เช็คอินทั้งหมด)
            </span>
            <div className="w-6 h-6 rounded-lg bg-[#FACC15] border border-[#18181B] flex items-center justify-center text-[#18181B] text-xs font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
              ⚡
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-[#18181B] tracking-tight my-2">
            {stats.totalCheckIns.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t-2 border-stone-100">
            <span className="text-stone-500 font-medium">รอบ 7 วันล่าสุด</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-300">
              ↑ 20%
            </span>
          </div>
        </div>

        {/* Card 2: Pending Review */}
        <div className="bg-white border-2 border-[#18181B] rounded-xl p-5 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] relative flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#18181B] mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-stone-500">
              Pending Review (รอตรวจ K-P-A)
            </span>
            <div className="w-6 h-6 rounded-lg bg-amber-100 border border-[#18181B] flex items-center justify-center text-amber-900 text-xs font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
              ⏳
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-amber-700 tracking-tight my-2">
            {stats.pendingReview.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t-2 border-stone-100">
            <button 
              onClick={() => onNavigate('review')}
              className="text-[#18181B] font-bold hover:underline flex items-center gap-1"
            >
              <span>เปิดคิวตรวจแบบประเมิน</span>
              <ArrowRight className="w-3 h-3" />
            </button>
            <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-bold text-[11px] border border-amber-300">
              รอ จนท. ตรวจ
            </span>
          </div>
        </div>

        {/* Card 3: Approved */}
        <div className="bg-white border-2 border-[#18181B] rounded-xl p-5 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] relative flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#18181B] mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-stone-500">
              Approved (อนุมัติเสร็จสิ้น)
            </span>
            <div className="w-6 h-6 rounded-lg bg-emerald-100 border border-[#18181B] flex items-center justify-center text-emerald-900 text-xs font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
              ✓
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-black text-emerald-700 tracking-tight my-2">
            {stats.approved.toLocaleString()}
          </div>
          <div className="flex items-center justify-between text-xs pt-2 border-t-2 border-stone-100">
            <span className="text-stone-500 font-medium">บันทึกกิจกรรมสะสมแล้ว</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px] border border-emerald-300">
              ผ่านเกณฑ์
            </span>
          </div>
        </div>

      </div>

      {/* 2. MAIN 2-COLUMN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* LEFT COLUMN: Calendar & Recent Students Table (8 of 12 cols) */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* Calendar Schedule Card */}
          <div className="bg-white border-2 border-[#18181B] rounded-xl p-5 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)]">
            
            {/* Calendar Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-[#18181B]">ตารางกิจกรรมและรอบสแกน (Calendar)</span>
                <div className="flex items-center gap-1 text-xs font-bold text-[#18181B] bg-[#FAF7F0] px-2.5 py-1 rounded-lg border-2 border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] cursor-pointer">
                  <span>มกราคม 2569</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Day / Week / Month / Year Switcher */}
              <div className="inline-flex items-center bg-[#FAF7F0] p-1 rounded-xl border-2 border-[#18181B] text-xs">
                {(['day', 'week', 'month', 'year'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setCalendarView(v)}
                    className={`px-3 py-1 rounded-lg font-bold transition-all capitalize ${
                      calendarView === v
                        ? 'bg-[#18181B] text-[#FACC15] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                        : 'text-stone-600 hover:text-[#18181B]'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Weekly Timetable Grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[560px]">
                <thead>
                  <tr className="border-b-2 border-[#18181B] text-stone-500 font-black text-[11px] uppercase bg-[#FAF7F0]">
                    <th className="py-2.5 px-3 w-16">Time</th>
                    <th className="py-2.5 px-3">Mon</th>
                    <th className="py-2.5 px-3">Tue</th>
                    <th className="py-2.5 px-3">Wed</th>
                    <th className="py-2.5 px-3">Thur</th>
                    <th className="py-2.5 px-3">Fri</th>
                    <th className="py-2.5 px-3">Sat</th>
                    <th className="py-2.5 px-3">Sun</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-stone-700 font-medium">
                  
                  {/* 09:00 */}
                  <tr className="h-10 hover:bg-[#FAF7F0]/60">
                    <td className="py-2 px-3 text-stone-400 font-mono text-[11px]">09:00</td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                  </tr>

                  {/* 09:30 */}
                  <tr className="h-10 hover:bg-[#FAF7F0]/60">
                    <td className="py-2 px-3 text-stone-400 font-mono text-[11px]">09:30</td>
                    <td className="p-1">
                      <div 
                        onClick={() => onNavigate('scanner')}
                        className="bg-[#FACC15] hover:bg-amber-300 text-[#18181B] border-2 border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] px-2 py-1 rounded-lg text-[10px] font-bold truncate cursor-pointer"
                        title="คลิกเพื่อเปิดเครื่องสแกน"
                      >
                        ⚡ พิธีไหว้ครู 2569 (เปิดสแกน)
                      </div>
                    </td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                  </tr>

                  {/* 10:00 */}
                  <tr className="h-10 hover:bg-[#FAF7F0]/60">
                    <td className="py-2 px-3 text-stone-400 font-mono text-[11px]">10:00</td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                    <td className="p-1">
                      <div className="bg-white text-stone-800 border-2 border-[#18181B] px-2 py-1 rounded-lg text-[10px] font-bold truncate">
                        ตรวจรับ K-P-A...
                      </div>
                    </td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                  </tr>

                  {/* 10:30 */}
                  <tr className="h-10 hover:bg-[#FAF7F0]/60">
                    <td className="py-2 px-3 text-stone-400 font-mono text-[11px]">10:30</td>
                    <td className="p-1">
                      <div className="bg-[#FAF7F0] text-stone-800 border border-stone-300 px-2 py-1 rounded-lg text-[10px] font-semibold truncate">
                        ยิงสแกนบัตรจริง...
                      </div>
                    </td>
                    <td className="p-1">
                      <div className="bg-white text-stone-800 border-2 border-[#18181B] px-2 py-1 rounded-lg text-[10px] font-bold truncate">
                        ซิงค์ฐานข้อมูล Cloud
                      </div>
                    </td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                    <td className="p-1"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Students Directory Table */}
          <div className="bg-white border-2 border-[#18181B] rounded-xl p-5 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-[#18181B]">
                รายชื่อนักศึกษาที่เช็คอินล่าสุด (Recent Check-ins)
              </h3>
              <button 
                onClick={() => onNavigate('history')}
                className="text-xs font-bold text-[#18181B] hover:underline flex items-center gap-1"
              >
                <span>ดูประวัติทั้งหมด</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#18181B] text-stone-500 font-black text-[11px] uppercase bg-[#FAF7F0]">
                    <th className="py-2.5 px-3">นักศึกษา</th>
                    <th className="py-2.5 px-3">สาขาวิชา</th>
                    <th className="py-2.5 px-3">สถานะ</th>
                    <th className="py-2.5 px-3 text-right">การจัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {recentStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-[#FAF7F0] transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={s.avatarUrl}
                            alt=""
                            className="w-7 h-7 rounded-lg object-cover border border-[#18181B]"
                          />
                          <div>
                            <div className="font-bold text-[#18181B]">{s.name}</div>
                            <div className="text-[10px] text-stone-500 font-mono">{s.studentId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-stone-700">
                        {s.department}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>เช็คอินสำเร็จ</span>
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button 
                          onClick={() => onNavigate('history')}
                          className="px-2.5 py-1 text-[11px] font-bold bg-white hover:bg-[#FACC15] text-[#18181B] border-2 border-[#18181B] rounded-lg transition-all shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                        >
                          ตรวจสอบ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Application Breakdown & Quick Actions (4 of 12 cols) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* Quick Scanner Action Card */}
          <div className="bg-[#FAF7F0] border-2 border-[#18181B] rounded-xl p-5 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] space-y-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-stone-500">
              <Zap className="w-4 h-4 text-[#F59E0B]" />
              <span>สถานีสแกนด่วน (Quick Station)</span>
            </div>
            <h4 className="text-base font-black text-[#18181B]">
              เปิดรับสแกนบัตรนักศึกษา
            </h4>
            <p className="text-xs text-stone-600 font-medium leading-relaxed">
              รองรับเครื่องยิงบาร์โค้ด USB 1D, บัตรแข็งนักศึกษา และ QR Code ดิจิทัลบนสมาร์ทโฟน
            </p>
            <button
              onClick={() => onNavigate('scanner')}
              className="w-full py-3 bg-[#18181B] hover:bg-stone-800 text-[#FACC15] rounded-xl text-xs font-bold border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] flex items-center justify-center gap-2 transition-all"
            >
              <QrCode className="w-4 h-4 text-[#FACC15]" />
              <span>เปิดสถานีสแกนเนอร์ (Start)</span>
            </button>
          </div>

          {/* Application Breakdown Card */}
          <div className="bg-white border-2 border-[#18181B] rounded-xl p-5 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-[#18181B]">
                สัดส่วนการประเมิน (Application Breakdown)
              </h3>
              <MoreHorizontal className="w-4 h-4 text-stone-400" />
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex justify-between font-bold text-stone-700 mb-1">
                  <span>สแกนเช็คอินสำเร็จแล้ว (Checked-in)</span>
                  <span className="font-black text-[#18181B]">85%</span>
                </div>
                <div className="w-full h-2.5 bg-[#FAF7F0] border-2 border-[#18181B] rounded-full overflow-hidden">
                  <div className="bg-[#18181B] h-full rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-bold text-stone-700 mb-1">
                  <span>ส่งแบบสะท้อนคิด K-P-A (Submitted)</span>
                  <span className="font-black text-amber-700">60%</span>
                </div>
                <div className="w-full h-2.5 bg-[#FAF7F0] border-2 border-[#18181B] rounded-full overflow-hidden">
                  <div className="bg-[#FACC15] h-full rounded-full" style={{ width: '60%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between font-bold text-stone-700 mb-1">
                  <span>อนุมัติรับรองกิจกรรมครบถ้วน (Approved)</span>
                  <span className="font-black text-emerald-700">45%</span>
                </div>
                <div className="w-full h-2.5 bg-[#FAF7F0] border-2 border-[#18181B] rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: '45%' }}></div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t-2 border-stone-100 flex items-center justify-between text-xs">
              <button 
                onClick={() => onNavigate('review')}
                className="text-[#18181B] font-bold hover:underline flex items-center gap-1"
              >
                <span>เปิดคิวตรวจสอบ K-P-A</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Activity Feed Card */}
          <div className="bg-white border-2 border-[#18181B] rounded-xl p-5 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)]">
            <h3 className="text-sm font-black text-[#18181B] mb-3">
              บันทึกกิจกรรมล่าสุด (Live Activity)
            </h3>
            <div className="space-y-3 text-xs">
              {recentActivities.map((act) => (
                <div key={act.id} className="flex items-start gap-2.5">
                  <img
                    src={act.avatar}
                    alt=""
                    className="w-6 h-6 rounded-md object-cover border border-[#18181B] shrink-0 mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-stone-800 font-semibold leading-tight text-[11px] truncate">
                      {act.text}
                    </p>
                    <span className="text-[10px] text-stone-400 font-mono">{act.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
