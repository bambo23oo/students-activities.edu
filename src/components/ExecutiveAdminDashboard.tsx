import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Award, 
  Calendar, 
  Layers, 
  CheckSquare, 
  FileSpreadsheet, 
  Database, 
  Bell, 
  Settings, 
  ChevronDown, 
  Menu, 
  X, 
  Sparkles,
  QrCode,
  LogOut,
  UserCheck,
  ShieldCheck,
  ExternalLink,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Smartphone
} from 'lucide-react';
import { MobileDeviceTesterModal } from './MobileDeviceTesterModal';
import { ExecutiveDashboardOverview } from './admin/ExecutiveDashboardOverview';
import { PeopleManager } from './admin/PeopleManager';
import { ApprovalManager } from './admin/ApprovalManager';
import { ActivityManager } from './ActivityManager';
import { ReportsView } from './ReportsView';
import { SupabaseSettings } from './SupabaseSettings';
import { SuperAdminPanel } from './admin/SuperAdminPanel';
import { db } from '../db/db';
import { UserRole } from '../types';

interface ExecutiveAdminDashboardProps {
  onRoleChange: (newRole: UserRole) => void;
  onLogout: () => void;
  userName?: string;
  userEmail?: string;
  isUserAdmin?: boolean;
}

export const ExecutiveAdminDashboard: React.FC<ExecutiveAdminDashboardProps> = ({
  onRoleChange,
  onLogout,
  userName = 'ผศ.ดร.ศรีสุดา ด้วงโต้ด',
  userEmail = 'srisuda.edu@npu.ac.th',
  isUserAdmin = true
}) => {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'people' | 'approvals' | 'events' | 'curriculum' | 'attendance' | 'reports' | 'database' | 'superadmin' | 'announcements' | 'settings'
  >('dashboard');

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [quickActionOpen, setQuickActionOpen] = useState(false);
  const [campusDropdownOpen, setCampusDropdownOpen] = useState(false);
  const [selectedCampus, setSelectedCampus] = useState('คณะครุศาสตร์ ม.นครพนม');
  const [showMobileTester, setShowMobileTester] = useState(false);

  // Badge count for pending reviews
  const [pendingReviewCount, setPendingReviewCount] = useState(0);

  useEffect(() => {
    const fetchPending = async () => {
      const count = await db.checkInLogs.filter(log => log.staffStatus === "verified" && log.execStatus === "pending").count();
      setPendingReviewCount(count);
    };
    fetchPending();
  }, [activeTab]);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'people', label: 'People', icon: Users },
    { id: 'approvals', label: 'Pending Approvals', icon: Award, badge: pendingReviewCount > 0 ? pendingReviewCount : undefined },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'curriculum', label: 'Programs', icon: BookOpen },
    { id: 'attendance', label: 'Attendance', icon: CheckSquare },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'superadmin', label: 'Super Admin', icon: ShieldCheck },
  ];

  return (
    <div className="h-screen flex bg-[#F4EFE6] text-[#18181B] font-sans antialiased overflow-hidden">
      
      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR (Refined Charcoal Studio Rail with Gold Accent)          */}
      {/* ========================================================================= */}
      <aside 
        className={`${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } bg-[#18181B] text-white flex flex-col justify-between shrink-0 transition-all duration-200 z-30 hidden md:flex border-r-2 border-[#18181B] select-none shadow-[2px_0px_0px_0px_rgba(24,24,27,0.4)]`}
      >
        <div className="flex flex-col h-full overflow-y-auto">
          
          {/* Brand Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-stone-800">
            <div className="flex items-center gap-3 min-w-0">
              {/* Geometric Brand Icon in Sacred Gold */}
              <div className="w-8 h-8 rounded-lg bg-[#FACC15] text-[#18181B] flex items-center justify-center font-black text-sm shrink-0 border border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                ❖
              </div>
              {!sidebarCollapsed && (
                <div className="truncate leading-tight">
                  <div className="font-black text-white text-sm tracking-tight truncate">
                    EduAdmin
                  </div>
                  <div className="text-[10px] text-stone-400 font-medium truncate">
                    คณะครุศาสตร์ ม.นครพนม
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Collapse Toggle Icon */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded-md text-stone-400 hover:text-white hover:bg-stone-800 transition-colors"
              title="ย่อ/ขยายเมนู"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

          {/* Main Navigation Items */}
          <div className="p-3 space-y-1.5 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all relative ${
                    isActive
                      ? 'bg-[#FACC15] text-[#18181B] font-bold border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : 'text-stone-300 hover:text-white hover:bg-stone-800/90 font-semibold'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#18181B]' : 'text-stone-400'}`} />
                  {!sidebarCollapsed && (
                    <span className="truncate">{item.label}</span>
                  )}
                  {item.badge && !sidebarCollapsed && (
                    <span className={`ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-[#18181B] text-[#FACC15]' : 'bg-[#EF4444] text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Navigation Items (Announcements & Settings) */}
          <div className="p-3 border-t border-stone-800 space-y-1.5">
            <button
              onClick={() => setActiveTab('announcements')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'announcements'
                  ? 'bg-[#FACC15] text-[#18181B] font-bold border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/80'
              }`}
            >
              <Bell className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Announcements</span>}
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === 'settings'
                  ? 'bg-[#FACC15] text-[#18181B] font-bold border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/80'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0" />
              {!sidebarCollapsed && <span>Settings</span>}
            </button>
          </div>

        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 md:hidden flex">
          <div className="w-64 bg-[#18181B] text-white h-full flex flex-col justify-between p-4 border-r-2 border-[#18181B] animate-in slide-in-from-left">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#FACC15] text-[#18181B] flex items-center justify-center font-black text-sm border border-[#18181B]">
                    ❖
                  </div>
                  <span className="font-bold text-sm">EduAdmin</span>
                </div>
                <button onClick={() => setMobileMenuOpen(false)} className="p-1 text-stone-400">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="py-4 space-y-1.5">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id as any); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                        activeTab === item.id
                          ? 'bg-[#FACC15] text-[#18181B] font-bold border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                          : 'text-stone-300 hover:bg-stone-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-stone-800 pt-3">
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-950/40 rounded-lg"
              >
                <LogOut className="w-4 h-4" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN CONTENT WRAPPER & TOP BAR (Clean Minimalist Studio Header)         */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="h-16 bg-[#F4EFE6] border-b-2 border-[#18181B] px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
          
          {/* Left: Organization / Campus Dropdown */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-xl bg-white text-[#18181B] border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-stone-100 md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="relative">
              <button
                onClick={() => setCampusDropdownOpen(!campusDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-stone-50 transition-all text-xs font-bold text-[#18181B]"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{selectedCampus}</span>
                <ChevronDown className="w-3.5 h-3.5 text-stone-600" />
              </button>

              {campusDropdownOpen && (
                <div className="absolute left-0 top-full mt-2 w-64 bg-white rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] border-2 border-[#18181B] py-1.5 z-40 text-xs font-medium animate-in fade-in-50">
                  <button
                    onClick={() => { setSelectedCampus('คณะครุศาสตร์ ม.นครพนม'); setCampusDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-[#F4EFE6] text-[#18181B] font-bold"
                  >
                    คณะครุศาสตร์ ม.นครพนม
                  </button>
                  <button
                    onClick={() => { setSelectedCampus('สำนักพัฒนานักศึกษา ม.นครพนม'); setCampusDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-[#F4EFE6] text-stone-700"
                  >
                    สำนักพัฒนานักศึกษา ม.นครพนม
                  </button>
                  <button
                    onClick={() => { setSelectedCampus('ศูนย์ฝึกประสบการณ์วิชาชีพครู'); setCampusDropdownOpen(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-[#F4EFE6] text-stone-700"
                  >
                    ศูนย์ฝึกประสบการณ์วิชาชีพครู
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Notifications & User Profile */}
          <div className="flex items-center gap-3">
            
            {/* Mobile Device UI/UX Tester Button */}
            <button
              onClick={() => setShowMobileTester(true)}
              className="flex items-center gap-1.5 bg-[#EA580C] hover:bg-[#C2410C] text-white border-2 border-[#18181B] px-2.5 py-1.5 text-xs font-bold rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all shrink-0"
              title="ทดสอบ UI/UX สำหรับโทรศัพท์มือถือทั้ง Android และ iOS"
            >
              <Smartphone className="w-3.5 h-3.5 text-white" />
              <span className="hidden sm:inline">ทดสอบมือถือ</span>
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setActiveTab('announcements')}
              className="w-9 h-9 rounded-xl bg-white border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-stone-50 text-[#18181B] flex items-center justify-center transition-all relative"
              title="แจ้งเตือน"
            >
              <Bell className="w-4 h-4" />
              {pendingReviewCount > 0 && (
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#EF4444] border-2 border-[#18181B]" />
              )}
            </button>

            {/* User Profile Avatar with Role Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 px-2.5 py-1 bg-white border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-xl hover:bg-stone-50 transition-all"
              >
                <div className="w-7 h-7 rounded-lg bg-[#18181B] text-[#FACC15] flex items-center justify-center font-black text-xs shrink-0 border border-[#18181B] overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80"
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span>ศส</span>
                </div>
                <div className="text-left hidden sm:block leading-tight">
                  <div className="text-xs font-black text-[#18181B] truncate max-w-[140px]">
                    {userName}
                  </div>
                  <div className="text-[10px] text-stone-500 font-bold">
                    Admin / ผู้บริหาร
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#18181B] hidden sm:block" />
              </button>

              {/* User Menu Dropdown */}
              {userDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] border-2 border-[#18181B] py-2 z-50 text-xs animate-in fade-in-50">
                  <div className="px-3 py-2 border-b-2 border-[#18181B]/10">
                    <p className="font-bold text-[#18181B]">{userName}</p>
                    <p className="text-[11px] text-stone-500 truncate font-mono">{userEmail}</p>
                  </div>

                  <div className="py-1">
                    <div className="px-3 py-1 text-[10px] font-black text-stone-400 uppercase tracking-wider">
                      สลับมุมมองการทำงาน
                    </div>
                    <button
                      onClick={() => { onRoleChange('student'); setUserDropdownOpen(false); }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#F4EFE6] flex items-center gap-2 text-stone-800 font-semibold"
                    >
                      <span>🎓</span>
                      <span>มุมมองนักศึกษา (Student)</span>
                    </button>
                    <button
                      onClick={() => { onRoleChange('staff'); setUserDropdownOpen(false); }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#F4EFE6] flex items-center gap-2 text-stone-800 font-semibold"
                    >
                      <span>📷</span>
                      <span>มุมมองเจ้าหน้าที่สแกน (Staff)</span>
                    </button>
                  </div>

                  <div className="border-t-2 border-[#18181B]/10 pt-1">
                    <button
                      onClick={onLogout}
                      className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-600 font-bold flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>ออกจากระบบ</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </header>

        {/* ========================================================================= */}
        {/* 3. SCROLLABLE DASHBOARD VIEWPORT (Clean Minimalist Canvas)                */}
        {/* ========================================================================= */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 relative">
          
          {activeTab === 'dashboard' && (
            <ExecutiveDashboardOverview 
              onNavigateTab={(t) => setActiveTab(t as any)} 
              onOpenReviewModal={() => setActiveTab('approvals')}
            />
          )}


          {activeTab === 'approvals' && (
            <div className="space-y-4">
              <ApprovalManager />
            </div>
          )}

          {activeTab === 'people' && (
            <PeopleManager />
          )}

          {activeTab === 'events' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-[#18181B]">จัดการกิจกรรมและการลงทะเบียน (Event Manager)</h2>
                  <p className="text-xs text-stone-500 font-medium">สร้าง แก้ไข และเปิดรับการเช็คอินสำหรับกิจกรรมคณะครุศาสตร์</p>
                </div>
              </div>
              <ActivityManager />
            </div>
          )}

          {activeTab === 'curriculum' && (
            <div className="bg-white p-6 rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-[#18181B]">โครงสร้างหลักสูตรและเกณฑ์กิจกรรมสะสม (18 กิจกรรม)</h2>
                <span className="px-3 py-1 bg-[#FACC15] text-[#18181B] border-2 border-[#18181B] rounded-lg text-xs font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                  เกณฑ์มาตรฐานคณะครุศาสตร์
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                <div className="p-4 bg-[#FAF7F0] rounded-xl border-2 border-[#18181B]">
                  <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">ชั้นปีที่ 1 (รหัส 69)</div>
                  <div className="text-2xl font-black text-[#18181B] my-1">5 กิจกรรม</div>
                  <p className="text-[11px] text-stone-600 font-medium">จิตวิญญาณความเป็นครูและทักษะพื้นฐาน</p>
                </div>
                <div className="p-4 bg-[#FAF7F0] rounded-xl border-2 border-[#18181B]">
                  <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">ชั้นปีที่ 2 (รหัส 68)</div>
                  <div className="text-2xl font-black text-[#18181B] my-1">5 กิจกรรม</div>
                  <p className="text-[11px] text-stone-600 font-medium">จิตสาธารณะและการพัฒนาชุมชน</p>
                </div>
                <div className="p-4 bg-[#FAF7F0] rounded-xl border-2 border-[#18181B]">
                  <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">ชั้นปีที่ 3 (รหัส 67)</div>
                  <div className="text-2xl font-black text-[#18181B] my-1">4 กิจกรรม</div>
                  <p className="text-[11px] text-stone-600 font-medium">เทคโนโลยีดิจิทัลและ AI เพื่อการศึกษา</p>
                </div>
                <div className="p-4 bg-[#FAF7F0] rounded-xl border-2 border-[#18181B]">
                  <div className="text-xs font-bold text-stone-500 uppercase tracking-wider">ชั้นปีที่ 4 (รหัส 66)</div>
                  <div className="text-2xl font-black text-[#18181B] my-1">4 กิจกรรม</div>
                  <p className="text-[11px] text-stone-600 font-medium">วิจัย นวัตกรรม และวิชาชีพครูขั้นสูง</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-[#18181B]">ระบบบันทึกเวลาและจุดสแกนเนอร์ (Live Scanner Hub)</h2>
                  <p className="text-xs text-stone-500 font-medium">สถิติการสแกนผ่านเครื่องยิง USB Barcode และกล้องมือถือ QR Code</p>
                </div>
                <button
                  onClick={() => onRoleChange('staff')}
                  className="px-4 py-2 bg-[#18181B] hover:bg-stone-800 text-[#FACC15] rounded-xl text-xs font-bold border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 transition-all"
                >
                  <QrCode className="w-4 h-4 text-[#FACC15]" />
                  <span>เปิดโหมดเครื่องยิงสแกนเนอร์</span>
                </button>
              </div>
              <ReportsView />
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-between">
                <div>
                  <h2 className="text-base font-black text-[#18181B]">สรุปรายงานและส่งออกข้อมูล (Analytics & Export)</h2>
                  <p className="text-xs text-stone-500 font-medium">ออกรายงานแยกตามรายชื่อนักศึกษา กิจกรรม และใบทรานสคริปต์รับรอง</p>
                </div>
              </div>
              <ReportsView />
            </div>
          )}

          {activeTab === 'database' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <h2 className="text-base font-black text-[#18181B]">การเชื่อมต่อฐานข้อมูล Supabase Cloud</h2>
                <p className="text-xs text-stone-500 font-medium">ซิงค์ข้อมูลนักศึกษา กิจกรรม และประวัติเช็คอินแบบ Real-time ข้ามอุปกรณ์</p>
              </div>
              <SupabaseSettings />
            </div>
          )}

          {activeTab === 'superadmin' && (
            <SuperAdminPanel 
              onRoleChange={onRoleChange}
              currentAdminEmail={userEmail}
            />
          )}

          {activeTab === 'announcements' && (
            <div className="bg-white p-6 rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-[#18181B]">ประกาศและข้อความระบบ (Announcements)</h2>
                <button className="px-3.5 py-1.5 bg-[#18181B] text-white rounded-xl text-xs font-bold border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  + สร้างประกาศใหม่
                </button>
              </div>
              <div className="divide-y-2 divide-[#18181B]/10 text-xs">
                <div className="py-3 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-[#18181B]">แจ้งเตือนส่งรายงาน K-P-A กิจกรรมปฐมนิเทศวิชาชีพครู</div>
                    <div className="text-stone-500 text-[11px] mt-0.5">ส่งถึงนักศึกษาชั้นปีที่ 1 ทุกสาขาวิชา • เมื่อวานนี้</div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                    ส่งแล้ว
                  </span>
                </div>
                <div className="py-3 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-[#18181B]">กำหนดการตรวจสอบคุณสมบัติสำเร็จการศึกษา ปีการศึกษา 2569</div>
                    <div className="text-stone-500 text-[11px] mt-0.5">ส่งถึงนักศึกษาชั้นปีที่ 4 • 2 วันที่แล้ว</div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                    ส่งแล้ว
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white p-6 rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-5 max-w-2xl">
              <h2 className="text-base font-black text-[#18181B]">การตั้งค่าระบบและบัญชีผู้บริหาร</h2>
              
              <div className="space-y-3 text-xs">
                <div className="p-3.5 bg-[#FAF7F0] rounded-xl border-2 border-[#18181B]">
                  <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">ผู้ดูแลระบบที่ลงชื่อเข้าใช้:</span>
                  <span className="font-black text-[#18181B] text-sm">{userName}</span>
                  <span className="text-stone-500 block text-[11px] font-mono">{userEmail}</span>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-[#18181B] block">สิทธิ์การใช้งาน (User Role)</label>
                  <select
                    onChange={(e) => onRoleChange(e.target.value as UserRole)}
                    defaultValue="approver"
                    className="w-full p-2.5 bg-white border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-xl outline-none font-bold text-xs"
                  >
                    <option value="approver">🛡️ โหมดผู้บริหาร & คณะกรรมการ (Approver / Executive)</option>
                    <option value="staff">📷 โหมดเจ้าหน้าที่ประจำจุดสแกน (Staff Scanner)</option>
                    <option value="student">🎓 โหมดนักศึกษา (Student)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. FLOATING QUICK ACTION BUTTON (Clean Minimalist Studio Button)          */}
          {/* ========================================================================= */}
          <div className="fixed bottom-6 right-6 z-40">
            <button
              onClick={() => setQuickActionOpen(!quickActionOpen)}
              className="w-12 h-12 rounded-xl bg-[#18181B] text-[#FACC15] border-2 border-[#18181B] shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center hover:bg-stone-800 transition-all active:translate-x-0.5 active:translate-y-0.5"
              title="Quick Action & Tools"
            >
              <Sparkles className="w-5 h-5 text-[#FACC15]" />
            </button>

            {quickActionOpen && (
              <div className="absolute right-0 bottom-14 w-60 bg-white rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-[#18181B] p-2 text-xs animate-in zoom-in-95">
                <div className="px-3 py-1.5 text-[10px] font-black text-stone-400 uppercase tracking-wider border-b border-stone-200 mb-1">
                  เมนูด่วน (Executive Tools)
                </div>
                <button
                  onClick={() => { setActiveTab('approvals'); setQuickActionOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-[#F4EFE6] rounded-lg flex items-center gap-2 text-stone-800 font-bold"
                >
                  <Award className="w-4 h-4 text-[#F59E0B]" />
                  <span>ตรวจรายงาน K-P-A ทันที</span>
                </button>
                <button
                  onClick={() => { setActiveTab('events'); setQuickActionOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-[#F4EFE6] rounded-lg flex items-center gap-2 text-stone-800 font-bold"
                >
                  <Calendar className="w-4 h-4 text-[#2563EB]" />
                  <span>สร้างกิจกรรมใหม่</span>
                </button>
                <button
                  onClick={() => { setActiveTab('reports'); setQuickActionOpen(false); }}
                  className="w-full text-left px-3 py-2 hover:bg-[#F4EFE6] rounded-lg flex items-center gap-2 text-stone-800 font-bold"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#10B981]" />
                  <span>ส่งออกข้อมูล Excel</span>
                </button>
              </div>
            )}
          </div>

        </main>

      </div>

      {/* Mobile Device Tester Modal */}
      <MobileDeviceTesterModal
        isOpen={showMobileTester}
        onClose={() => setShowMobileTester(false)}
      />

    </div>
  );
};
