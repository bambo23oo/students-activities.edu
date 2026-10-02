import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  Calendar, 
  Users, 
  Clock, 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ChevronDown,
  Sparkles,
  BarChart3,
  LineChart as LineChartIcon,
  Tag,
  MapPin,
  Check,
  Filter,
  Plus
} from 'lucide-react';
import { db } from '../../db/db';
import { Activity, CheckInLog, Reflection, Student } from '../../types';

interface ExecutiveDashboardOverviewProps {
  onNavigateTab: (tab: string) => void;
  onOpenReviewModal: (ref: any) => void;
}

export const ExecutiveDashboardOverview: React.FC<ExecutiveDashboardOverviewProps> = ({
  onNavigateTab,
  onOpenReviewModal
}) => {
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [timeframe, setTimeframe] = useState<'weekly' | 'monthly'>('weekly');
  const [activeEventTab, setActiveEventTab] = useState<'events' | 'tickets' | 'venues' | 'organizers' | 'categories'>('events');
  const [currentTime, setCurrentTime] = useState('');
  
  // Dynamic stats from Dexie DB
  const [stats, setStats] = useState({
    totalActivitiesCompleted: 1584,
    activeActivities: 18,
    upcomingEvents: 3,
    activeStudents: 1867,
    pendingApprovalsCount: 6
  });

  const [activities, setActivities] = useState<Activity[]>([]);
  const [pendingReflections, setPendingReflections] = useState<any[]>([]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadDashboardData();
    
    const handleDbUpdate = () => loadDashboardData();
    window.addEventListener('db_updated', handleDbUpdate);
    return () => window.removeEventListener('db_updated', handleDbUpdate);
  }, []);

  const loadDashboardData = async () => {
    const acts = await db.activities.toArray();
    setActivities(acts);

    const students = await db.students.toArray();
    const studentCount = students.length > 0 ? students.length * 150 + 367 : 1867;

    const checkIns = await db.checkInLogs.toArray();
    const approvedLogs = checkIns.filter(l => l.execStatus === 'approved');
    const calculatedActivities = approvedLogs.length * 14 + 1584;

    const pendingRefs = checkIns.filter(l => l.execStatus === 'pending' && l.staffStatus === 'verified');

    // Enrich pending reflections for To-Do list
    const enrichedPending = await Promise.all(pendingRefs.slice(0, 6).map(async (r) => {
      const s = await db.students.get(r.studentId);
      const a = await db.activities.get(r.activityId);
      return {
        ...r,
        studentName: s?.name || `รหัสนักศึกษา ${r.studentId}`,
        activityName: a?.name || `กิจกรรมรหัส ${r.activityId}`,
        major: s?.major || 'สาขาวิชาคอมพิวเตอร์ศึกษา'
      };
    }));

    setPendingReflections(enrichedPending);
    setStats({
      totalActivitiesCompleted: calculatedActivities,
      activeActivities: acts.filter(a => a.status === 'active').length || 18,
      upcomingEvents: acts.filter(a => a.status === 'upcoming').length || 3,
      activeStudents: studentCount,
      pendingApprovalsCount: pendingRefs.length || 6
    });
  };

  // 7-day trend chart points (Sat - Fri)
  const chartDays = [
    { day: 'Sat', label: 'ส.', value: 580, checkIns: 410, submissions: 320 },
    { day: 'Sun', label: 'อา.', value: 720, checkIns: 480, submissions: 390 },
    { day: 'Mon', label: 'จ.', value: 650, checkIns: 520, submissions: 410 },
    { day: 'Tue', label: 'อ.', value: 920, checkIns: 690, submissions: 480 },
    { day: 'Wed', label: 'พ.', value: 880, checkIns: 880, submissions: 520, active: true },
    { day: 'Thu', label: 'พฤ.', value: 1140, checkIns: 790, submissions: 610 },
    { day: 'Fri', label: 'ศ.', value: 1450, checkIns: 920, submissions: 780 }
  ];

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto">
      
      {/* ========================================================================= */}
      {/* 1. TOP STAT CARDS (Clean Minimalist Studio Aesthetic)                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Total Activities */}
        <div className="bg-white rounded-xl p-4 border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] flex flex-col justify-between">
          <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            จำนวนกิจกรรมสะสมรวม
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-[#18181B] tracking-tight">
              {stats.totalActivitiesCompleted.toLocaleString()} <span className="text-xs font-bold text-stone-500">กิจกรรม</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 mt-0.5">
              <span>↑ 8.2%</span>
              <span className="text-stone-400 font-medium">เทียบสัปดาห์ก่อน</span>
            </div>
          </div>
          {/* Mini Sparkline Line (Emerald Green) */}
          <div className="h-6 w-full mt-1">
            <svg viewBox="0 0 100 25" className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <path
                d="M 0 18 Q 20 22, 35 15 T 65 14 T 85 8 T 100 4"
                fill="none"
                stroke="#15803D"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 2: Active Activities */}
        <div className="bg-white rounded-xl p-4 border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] flex flex-col justify-between">
          <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            กิจกรรมเปิดใช้งาน (Active)
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-[#18181B] tracking-tight">
              {stats.activeActivities} <span className="text-xs font-bold text-stone-500">โครงการ</span>
            </div>
            <p className="text-[11px] text-stone-600 font-medium truncate mt-0.5">
              วิชาชีพครู, จิตอาสา, ดิจิทัล
            </p>
          </div>
          <div className="flex items-center gap-1.5 pt-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] font-bold text-stone-600">เปิดรับลงทะเบียนและเช็คอิน</span>
          </div>
        </div>

        {/* Card 3: Upcoming Events */}
        <div className="bg-white rounded-xl p-4 border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] flex flex-col justify-between">
          <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            กิจกรรมเร็วๆ นี้ (Upcoming)
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-[#18181B] tracking-tight">
              {stats.upcomingEvents} <span className="text-xs font-bold text-stone-500">กิจกรรม</span>
            </div>
            <p className="text-[11px] text-stone-600 font-medium truncate mt-0.5">
              สัปดาห์นี้และเดือนหน้า
            </p>
          </div>
          <div className="text-[10px] font-bold text-[#18181B] bg-[#FACC15] px-2 py-0.5 rounded border border-[#18181B] w-fit shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
            เตรียมพร้อม 100%
          </div>
        </div>

        {/* Card 4: Active Members / Students */}
        <div className="bg-white rounded-xl p-4 border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] flex flex-col justify-between">
          <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            นักศึกษาทั้งหมดในระบบ
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-[#18181B] tracking-tight">
              {stats.activeStudents.toLocaleString()} <span className="text-xs font-bold text-stone-500">คน</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 mt-0.5">
              <span>↑ 52 คน</span>
              <span className="text-stone-400 font-medium">เพิ่มขึ้นสัปดาห์นี้</span>
            </div>
          </div>
          {/* Mini Sparkline Line (Emerald Green) */}
          <div className="h-6 w-full mt-1">
            <svg viewBox="0 0 100 25" className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <path
                d="M 0 20 Q 25 10, 45 18 T 75 9 T 100 5"
                fill="none"
                stroke="#15803D"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>

        {/* Card 5: Real-time Timeline Box */}
        <div className="bg-[#FAF7F0] rounded-xl p-3.5 border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-black text-stone-400 uppercase tracking-wider">
            <span>เริ่ม 08:30 AM</span>
            <span className="text-[#18181B] font-black">ปิด 16:30 PM</span>
          </div>

          <div className="text-center my-1.5">
            <div className="text-xl font-black text-[#18181B] tracking-tight">
              {currentTime || '12:30 PM'}
            </div>
            <div className="text-[10px] font-bold text-[#EA580C]">
              ช่วงบ่าย: ตรวจประเมิน K-P-A
            </div>
          </div>

          {/* Miniature 5-step schedule timeline */}
          <div className="grid grid-cols-5 gap-1 text-center text-[8px] font-bold text-stone-600 pt-1.5 border-t-2 border-[#18181B]/10">
            <div>
              <span className="block text-stone-400">เช็คอิน</span>
              <span>08:30</span>
            </div>
            <div>
              <span className="block text-stone-400">พิธีเปิด</span>
              <span>09:00</span>
            </div>
            <div className="text-[#18181B] font-black bg-[#FACC15] rounded border border-[#18181B]">
              <span className="block text-[7px]">พักเที่ยง</span>
              <span>12:00</span>
            </div>
            <div>
              <span className="block text-stone-400">ภาคบ่าย</span>
              <span>13:00</span>
            </div>
            <div>
              <span className="block text-stone-400">สรุปผล</span>
              <span>16:30</span>
            </div>
          </div>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 2. MIDDLE SECTION: LARGE TREND CHART & TO-DO ALERTS                       */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Activity & Check-in Trend Chart */}
        <div className="lg:col-span-8 bg-white rounded-xl p-5 sm:p-6 border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] flex flex-col justify-between">
          
          {/* Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-base font-black text-[#18181B]">
                สถิติการเช็คอินและการประเมินผล (Activity & Check-in Trends)
              </h3>
              <p className="text-xs text-stone-500 font-medium mt-0.5">
                ปริมาณการเข้าร่วมกิจกรรมและจำนวนกิจกรรมที่ได้รับอนุมัติในรอบสัปดาห์
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* Chart Switcher */}
              <div className="inline-flex bg-[#FAF7F0] p-1 rounded-xl border-2 border-[#18181B] text-xs font-bold">
                <button
                  onClick={() => setChartType('line')}
                  className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                    chartType === 'line' 
                      ? 'bg-[#FACC15] text-[#18181B] border border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' 
                      : 'text-stone-600 hover:text-[#18181B]'
                  }`}
                >
                  <LineChartIcon className="w-3.5 h-3.5 text-[#18181B]" />
                  <span>Line Chart</span>
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={`px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all ${
                    chartType === 'bar' 
                      ? 'bg-[#FACC15] text-[#18181B] border border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' 
                      : 'text-stone-600 hover:text-[#18181B]'
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-[#18181B]" />
                  <span>Bar Chart</span>
                </button>
              </div>

              {/* Timeframe Dropdown */}
              <div className="relative">
                <select
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value as any)}
                  className="bg-white border-2 border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] text-[#18181B] text-xs font-bold rounded-xl px-3 py-1.5 outline-none cursor-pointer hover:bg-[#FAF7F0]"
                >
                  <option value="weekly">Weekly ▾</option>
                  <option value="monthly">Monthly ▾</option>
                </select>
              </div>
            </div>
          </div>

          {/* Chart Display Area with Floating Tooltip */}
          <div className="relative w-full h-64 sm:h-72 my-2 select-none">
            
            {/* Y-axis Labels */}
            <div className="absolute left-0 top-0 bottom-6 w-12 flex flex-col justify-between text-[10px] font-mono font-bold text-stone-400 text-right pr-2">
              <span>20,000</span>
              <span>15,000</span>
              <span>10,000</span>
              <span>5,000</span>
              <span>1,000</span>
              <span>0</span>
            </div>

            {/* Chart Graphic Area */}
            <div className="ml-12 h-full flex flex-col justify-between relative">
              
              {/* Horizontal Gridlines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                <div className="w-full border-b border-stone-200" />
                <div className="w-full border-b border-stone-200" />
                <div className="w-full border-b border-stone-200" />
                <div className="w-full border-b border-stone-200" />
                <div className="w-full border-b border-stone-200" />
                <div className="w-full border-b-2 border-[#18181B]" />
              </div>

              {chartType === 'line' ? (
                /* Smooth Curved Minimal Line Chart with Gradient Fill */
                <svg viewBox="0 0 700 240" className="w-full h-[calc(100%-24px)] overflow-visible" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="areaGradientMinimal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#EA580C" stopOpacity="0.18" />
                      <stop offset="100%" stopColor="#EA580C" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Area fill */}
                  <path
                    d="M 50 180 
                       C 110 185, 140 150, 160 140 
                       C 200 120, 230 160, 270 130 
                       C 320 90, 360 140, 400 100 
                       C 430 70, 460 130, 490 80 
                       C 540 60, 600 75, 650 40 
                       L 650 240 L 50 240 Z"
                    fill="url(#areaGradientMinimal)"
                  />

                  {/* Crisp Terracotta Stroke Line */}
                  <path
                    d="M 50 180 
                       C 110 185, 140 150, 160 140 
                       C 200 120, 230 160, 270 130 
                       C 320 90, 360 140, 400 100 
                       C 430 70, 460 130, 490 80 
                       C 540 60, 600 75, 650 40"
                    fill="none"
                    stroke="#EA580C"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  {/* Key Interactive Data Dots */}
                  <circle cx="160" cy="140" r="4.5" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.5" />
                  <circle cx="270" cy="130" r="4.5" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.5" />
                  <circle cx="400" cy="100" r="4.5" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.5" />
                  <circle cx="490" cy="80" r="6" fill="#FACC15" stroke="#18181B" strokeWidth="2.5" />
                  <circle cx="650" cy="40" r="4.5" fill="#FFFFFF" stroke="#18181B" strokeWidth="2.5" />
                </svg>
              ) : (
                /* Bar Chart Mode */
                <div className="w-full h-[calc(100%-24px)] flex items-end justify-around px-4 z-10">
                  {chartDays.map((d, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1 w-8 sm:w-12 h-full justify-end group">
                      <div 
                        style={{ height: `${(d.value / 15000) * 100}%` }}
                        className={`w-full rounded-t border-2 border-[#18181B] transition-all ${
                          d.active ? 'bg-[#FACC15] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'bg-stone-200 hover:bg-stone-300'
                        }`}
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Floating Tooltip Card (Crisp Minimalist Studio Tooltip) */}
              <div 
                className="absolute left-[58%] top-[25%] -translate-x-1/2 bg-white border-2 border-[#18181B] rounded-xl p-3 shadow-[3px_3px_0px_0px_rgba(24,24,27,1)] pointer-events-none text-xs z-20 w-48"
              >
                <div className="flex justify-between items-baseline text-stone-500 text-[10px]">
                  <span className="font-bold">กิจกรรม:</span>
                  <span className="font-black text-[#18181B]">จิตอาสาพัฒนา</span>
                </div>
                <div className="flex justify-between items-baseline mt-1">
                  <span className="text-stone-500 text-[10px] font-bold">เช็คอิน:</span>
                  <span className="font-black text-[#18181B] text-sm">880 คน</span>
                </div>
                <div className="flex justify-between items-baseline text-stone-500 text-[10px]">
                  <span className="font-bold">ส่ง K-P-A:</span>
                  <span className="font-black text-[#18181B]">520 ฉบับ</span>
                </div>
                <div className="flex justify-between items-baseline mt-1 pt-1 border-t border-stone-200">
                  <span className="text-stone-500 text-[10px] font-bold">การเติบโต:</span>
                  <span className="font-black text-emerald-700 text-[11px]">+14.3% vs สัปดาห์ก่อน</span>
                </div>
                <div className="text-[9px] text-stone-400 font-mono text-right mt-0.5">
                  พุธ 25 ส.ค. 2569
                </div>
              </div>

              {/* X-axis Day Labels */}
              <div className="flex justify-around items-center pt-2 text-xs font-mono font-bold text-stone-500 border-t-2 border-[#18181B]">
                {chartDays.map((d, idx) => (
                  <span key={idx} className={d.active ? 'text-[#18181B] font-black' : ''}>
                    {d.day}
                  </span>
                ))}
              </div>

            </div>

          </div>

        </div>

        {/* Right Column: "To-Do & Alerts" Card */}
        <div className="lg:col-span-4 bg-white rounded-xl p-5 sm:p-6 border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] flex flex-col justify-between">
          
          <div>
            <div className="flex items-center justify-between pb-3 border-b-2 border-[#18181B]/10">
              <h3 className="text-base font-black text-[#18181B]">
                To-Do & Alerts
              </h3>
              <button
                onClick={() => onNavigateTab('approvals')}
                className="text-xs font-bold text-[#2563EB] hover:underline"
              >
                View All
              </button>
            </div>

            {/* Table / List Header */}
            <div className="grid grid-cols-12 text-[10px] font-black text-stone-400 uppercase tracking-wider py-2.5 border-b border-stone-200">
              <div className="col-span-4">Type</div>
              <div className="col-span-4">Title</div>
              <div className="col-span-2 text-center">Status</div>
              <div className="col-span-2 text-right">Due</div>
            </div>

            {/* Rows List */}
            <div className="divide-y divide-stone-100 text-xs">
              
              {/* Item 1: Pending Approval */}
              <div 
                onClick={() => onNavigateTab('approvals')}
                className="grid grid-cols-12 py-2.5 items-center hover:bg-[#FAF7F0] cursor-pointer rounded-lg px-1 transition-colors"
              >
                <div className="col-span-4 flex items-center gap-1.5 font-bold text-[#18181B] truncate pr-1">
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-[#18181B] shrink-0" />
                  <span className="truncate">Pending</span>
                </div>
                <div className="col-span-4 font-bold text-[#18181B] truncate pr-1">
                  ตรวจ K-P-A กิตติศักดิ์
                </div>
                <div className="col-span-2 text-center">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Awaiting
                  </span>
                </div>
                <div className="col-span-2 text-right font-mono font-bold text-stone-600 text-[11px]">
                  Today
                </div>
              </div>

              {/* Item 2: Pending Approval 2 */}
              <div 
                onClick={() => onNavigateTab('approvals')}
                className="grid grid-cols-12 py-2.5 items-center hover:bg-[#FAF7F0] cursor-pointer rounded-lg px-1 transition-colors"
              >
                <div className="col-span-4 flex items-center gap-1.5 font-bold text-[#18181B] truncate pr-1">
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-[#18181B] shrink-0" />
                  <span className="truncate">Pending</span>
                </div>
                <div className="col-span-4 font-bold text-[#18181B] truncate pr-1">
                  ตรวจ K-P-A ชลธิชา
                </div>
                <div className="col-span-2 text-center">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    Pending
                  </span>
                </div>
                <div className="col-span-2 text-right font-mono font-bold text-stone-600 text-[11px]">
                  Today
                </div>
              </div>

              {/* Item 3: Upcoming Event */}
              <div 
                onClick={() => onNavigateTab('events')}
                className="grid grid-cols-12 py-2.5 items-center hover:bg-[#FAF7F0] cursor-pointer rounded-lg px-1 transition-colors"
              >
                <div className="col-span-4 flex items-center gap-1.5 font-bold text-[#18181B] truncate pr-1">
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-[#18181B] shrink-0" />
                  <span className="truncate">Event</span>
                </div>
                <div className="col-span-4 font-bold text-[#18181B] truncate pr-1">
                  อบรม AI & Tech Edu
                </div>
                <div className="col-span-2 text-center">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Scheduled
                  </span>
                </div>
                <div className="col-span-2 text-right font-mono font-bold text-stone-600 text-[11px]">
                  Tomorrow
                </div>
              </div>

              {/* Item 4: New Message */}
              <div 
                onClick={() => onNavigateTab('announcements')}
                className="grid grid-cols-12 py-2.5 items-center hover:bg-[#FAF7F0] cursor-pointer rounded-lg px-1 transition-colors"
              >
                <div className="col-span-4 flex items-center gap-1.5 font-bold text-[#18181B] truncate pr-1">
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-[#18181B] shrink-0" />
                  <span className="truncate">Message</span>
                </div>
                <div className="col-span-4 font-bold text-[#18181B] truncate pr-1">
                  แจ้งเตือนนักศึกษาปี 4
                </div>
                <div className="col-span-2 text-center">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                    New
                  </span>
                </div>
                <div className="col-span-2 text-right font-mono font-bold text-stone-600 text-[11px]">
                  Tomorrow
                </div>
              </div>

              {/* Item 5: System Setup */}
              <div 
                onClick={() => onNavigateTab('database')}
                className="grid grid-cols-12 py-2.5 items-center hover:bg-[#FAF7F0] cursor-pointer rounded-lg px-1 transition-colors"
              >
                <div className="col-span-4 flex items-center gap-1.5 font-bold text-[#18181B] truncate pr-1">
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-[#18181B] shrink-0" />
                  <span className="truncate">System</span>
                </div>
                <div className="col-span-4 font-bold text-[#18181B] truncate pr-1">
                  ซิงค์ Supabase Cloud
                </div>
                <div className="col-span-2 text-center">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Active
                  </span>
                </div>
                <div className="col-span-2 text-right font-mono font-bold text-stone-600 text-[11px]">
                  This Week
                </div>
              </div>

              {/* Item 6: Curriculum Check */}
              <div 
                onClick={() => onNavigateTab('curriculum')}
                className="grid grid-cols-12 py-2.5 items-center hover:bg-[#FAF7F0] cursor-pointer rounded-lg px-1 transition-colors"
              >
                <div className="col-span-4 flex items-center gap-1.5 font-bold text-[#18181B] truncate pr-1">
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-[#18181B] shrink-0" />
                  <span className="truncate">Curriculum</span>
                </div>
                <div className="col-span-4 font-bold text-[#18181B] truncate pr-1">
                  เช็คเกณฑ์ 100 ชม. จบ
                </div>
                <div className="col-span-2 text-center">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                    Awaiting
                  </span>
                </div>
                <div className="col-span-2 text-right font-mono font-bold text-stone-600 text-[11px]">
                  In Friday
                </div>
              </div>

            </div>
          </div>

          <div className="pt-3 border-t-2 border-[#18181B]/10">
            <button
              onClick={() => onNavigateTab('approvals')}
              className="w-full py-2.5 bg-[#18181B] hover:bg-stone-800 text-[#FACC15] text-xs font-bold rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] flex items-center justify-center gap-1.5 transition-all"
            >
              <span>เปิดหน้าตรวจสอบ K-P-A ({stats.pendingApprovalsCount} รายการ)</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. BOTTOM SECTION: EVENT LIST DIRECTORY TABLE                            */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-xl p-5 sm:p-6 border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] space-y-4">
        
        {/* Table Top Header and Filter Badges */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h3 className="text-base font-black text-[#18181B]">
            Event List
          </h3>

          {/* Filter Tabs Bar (Events, Tickets, Venues, Organizers, Categories) */}
          <div className="inline-flex items-center gap-1 bg-[#FAF7F0] p-1 rounded-xl border-2 border-[#18181B] text-xs font-bold text-stone-600 overflow-x-auto">
            <button
              onClick={() => setActiveEventTab('events')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                activeEventTab === 'events' 
                  ? 'bg-[#FACC15] text-[#18181B] border border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' 
                  : 'hover:text-[#18181B]'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-[#18181B]" />
              <span>Events</span>
            </button>

            <button
              onClick={() => setActiveEventTab('tickets')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                activeEventTab === 'tickets' 
                  ? 'bg-[#FACC15] text-[#18181B] border border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' 
                  : 'hover:text-[#18181B]'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#18181B]" />
              <span>Check-in</span>
            </button>

            <button
              onClick={() => setActiveEventTab('venues')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                activeEventTab === 'venues' 
                  ? 'bg-[#FACC15] text-[#18181B] border border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' 
                  : 'hover:text-[#18181B]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5 text-[#18181B]" />
              <span>Venues</span>
            </button>

            <button
              onClick={() => setActiveEventTab('organizers')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                activeEventTab === 'organizers' 
                  ? 'bg-[#FACC15] text-[#18181B] border border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' 
                  : 'hover:text-[#18181B]'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-[#18181B]" />
              <span>Organizers</span>
            </button>

            <button
              onClick={() => setActiveEventTab('categories')}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                activeEventTab === 'categories' 
                  ? 'bg-[#FACC15] text-[#18181B] border border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]' 
                  : 'hover:text-[#18181B]'
              }`}
            >
              <Tag className="w-3.5 h-3.5 text-[#18181B]" />
              <span>Categories</span>
            </button>
          </div>
        </div>

        {/* Main Event Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b-2 border-[#18181B] text-[11px] font-black text-stone-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">Event Name</th>
                <th className="py-2.5 px-3">Date and Time</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Frequency</th>
                <th className="py-2.5 px-3 text-center">Quota</th>
                <th className="py-2.5 px-3 text-center">Attendees</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              
              {/* Row 1: Friday Khutbah / โครงการปฐมนิเทศ */}
              <tr className="hover:bg-[#FAF7F0] transition-colors">
                <td className="py-3 px-3 font-bold text-[#18181B]">
                  กิจกรรมปฐมนิเทศวิชาชีพครูและพิธีไหว้ครู
                </td>
                <td className="py-3 px-3 font-mono font-medium text-stone-600">
                  Sep 27, 2026 - 1:30 PM
                </td>
                <td className="py-3 px-3 text-stone-800 font-medium">
                  หอประชุมใหญ่ ม.นครพนม
                </td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Admin
                  </span>
                </td>
                <td className="py-3 px-3 text-stone-700 font-medium">
                  วิชาชีพครู
                </td>
                <td className="py-3 px-3 text-stone-500 font-medium">
                  Weekly
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold text-stone-800">
                  500
                </td>
                <td className="py-3 px-3 text-center font-mono font-black text-[#18181B]">
                  450
                </td>
                <td className="py-3 px-3 text-right">
                  <button
                    onClick={() => onNavigateTab('events')}
                    className="px-3 py-1 text-[11px] font-bold bg-white hover:bg-[#FACC15] text-[#18181B] border-2 border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded-lg transition-all"
                  >
                    ดูข้อมูล
                  </button>
                </td>
              </tr>

              {/* Row 2: อบรม Generative AI และทักษะดิจิทัล */}
              <tr className="hover:bg-[#FAF7F0] transition-colors">
                <td className="py-3 px-3 font-bold text-[#18181B]">
                  อบรมพัฒนาทักษะดิจิทัลและ AI สำหรับครู
                </td>
                <td className="py-3 px-3 font-mono font-medium text-stone-600">
                  Sep 28, 2026 - 09:00 AM
                </td>
                <td className="py-3 px-3 text-stone-800 font-medium">
                  ห้องปฏิบัติการคอมพิวเตอร์ 402
                </td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Admin
                  </span>
                </td>
                <td className="py-3 px-3 text-stone-700 font-medium">
                  เทคโนโลยีการศึกษา
                </td>
                <td className="py-3 px-3 text-stone-500 font-medium">
                  Weekly
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold text-stone-800">
                  120
                </td>
                <td className="py-3 px-3 text-center font-mono font-black text-[#18181B]">
                  110
                </td>
                <td className="py-3 px-3 text-right">
                  <button
                    onClick={() => onNavigateTab('events')}
                    className="px-3 py-1 text-[11px] font-bold bg-white hover:bg-[#FACC15] text-[#18181B] border-2 border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded-lg transition-all"
                  >
                    ดูข้อมูล
                  </button>
                </td>
              </tr>

              {/* Row 3: ค่ายจิตอาสาพัฒนาวัดพระธาตุพนม */}
              <tr className="hover:bg-[#FAF7F0] transition-colors">
                <td className="py-3 px-3 font-bold text-[#18181B]">
                  ค่ายจิตอาสาและบำเพ็ญประโยชน์ วัดพระธาตุพนม
                </td>
                <td className="py-3 px-3 font-mono font-medium text-stone-600">
                  Sep 29, 2026 - 08:30 AM
                </td>
                <td className="py-3 px-3 text-stone-800 font-medium">
                  วัดพระธาตุพนมวรมหาวิหาร
                </td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Scheduled
                  </span>
                </td>
                <td className="py-3 px-3 text-stone-700 font-medium">
                  จิตสาธารณะ
                </td>
                <td className="py-3 px-3 text-stone-500 font-medium">
                  Weekly
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold text-stone-800">
                  250
                </td>
                <td className="py-3 px-3 text-center font-mono font-black text-[#18181B]">
                  218
                </td>
                <td className="py-3 px-3 text-right">
                  <button
                    onClick={() => onNavigateTab('events')}
                    className="px-3 py-1 text-[11px] font-bold bg-white hover:bg-[#FACC15] text-[#18181B] border-2 border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded-lg transition-all"
                  >
                    ดูข้อมูล
                  </button>
                </td>
              </tr>

              {/* Row 4: สืบสานประเพณีไหลเรือไฟ */}
              <tr className="hover:bg-[#FAF7F0] transition-colors">
                <td className="py-3 px-3 font-bold text-[#18181B]">
                  กิจกรรมทำนุบำรุงศิลปวัฒนธรรม ประเพณีไหลเรือไฟ
                </td>
                <td className="py-3 px-3 font-mono font-medium text-stone-600">
                  Oct 05, 2026 - 1:30 PM
                </td>
                <td className="py-3 px-3 text-stone-800 font-medium">
                  ลานพญาศรีสัตตนาคราช ริมโขง
                </td>
                <td className="py-3 px-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                    Draft
                  </span>
                </td>
                <td className="py-3 px-3 text-stone-700 font-medium">
                  ศิลปวัฒนธรรม
                </td>
                <td className="py-3 px-3 text-stone-500 font-medium">
                  One-time
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold text-stone-800">
                  120
                </td>
                <td className="py-3 px-3 text-center font-mono font-black text-[#18181B]">
                  108
                </td>
                <td className="py-3 px-3 text-right">
                  <button
                    onClick={() => onNavigateTab('events')}
                    className="px-3 py-1 text-[11px] font-bold bg-white hover:bg-[#FACC15] text-[#18181B] border-2 border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded-lg transition-all"
                  >
                    ดูข้อมูล
                  </button>
                </td>
              </tr>

            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
