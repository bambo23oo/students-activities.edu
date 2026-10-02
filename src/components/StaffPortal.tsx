import React, { useState } from 'react';
import { StaffDashboardView } from './StaffDashboardView';
import { StaffScanner } from './StaffScanner';
import { CheckInHistory } from './CheckInHistory';
import { ActivityManager } from './ActivityManager';
import { ReportsView } from './ReportsView';
import { SupabaseSettings } from './SupabaseSettings';
import { StaffReviewTab } from './staff/StaffReviewTab';
import { 
  LayoutDashboard, 
  QrCode, 
  Users, 
  FileCheck, 
  CalendarDays, 
  FileSpreadsheet, 
  Database, 
  Settings, 
  Search, 
  Bell, 
  PanelLeftClose, 
  PanelLeft, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  Award, 
  LogOut, 
  UserCheck,
  ChevronDown,
  Menu,
  X,
  Smartphone
} from 'lucide-react';
import { MobileDeviceTesterModal } from './MobileDeviceTesterModal';

interface StaffPortalProps {
  onRoleChange?: (role: 'student' | 'staff' | 'approver', targetStudentId?: string) => void;
  onLogout?: () => void;
  userName?: string;
  userEmail?: string;
  isUserAdmin?: boolean;
}

export const StaffPortal: React.FC<StaffPortalProps> = ({
  onRoleChange,
  onLogout,
  userName = 'เจ้าหน้าที่สแกนเนอร์ (Staff)',
  userEmail = 'tpc.edu@npu.ac.th',
  isUserAdmin = true
}) => {
  const [activeMenu, setActiveMenu] = useState<
    'dashboard' | 'scanner' | 'reviews' | 'history' | 'activities' | 'reports' | 'database'
  >('scanner');

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showWhatNewModal, setShowWhatNewModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showMobileTester, setShowMobileTester] = useState(false);

  const getPageTitle = () => {
    switch (activeMenu) {
      case 'dashboard': return 'Staff Dashboard (ภาพรวมเจ้าหน้าที่)';
      case 'scanner': return 'สถานีสแกนเนอร์ความเร็วสูง (High-Speed Scanner)';
      case 'reviews': return 'ตรวจอนุมัติบันทึก K-P-A ขั้นที่ 1 (Staff Review)';
      case 'history': return 'ประวัติการสแกนเช็คอิน (Check-in Logs)';
      case 'activities': return 'จัดการรายการกิจกรรม (Activity Management)';
      case 'reports': return 'สรุปรายงานและทรานสคริปต์ (Reports)';
      case 'database': return 'การตั้งค่าฐานข้อมูล Supabase (Database)';
      default: return 'Staff Station';
    }
  };

  const navItems = [
    { id: 'scanner', label: 'สถานีสแกนเนอร์ (Scanner)', icon: QrCode, badge: 'LIVE' },
    { id: 'reviews', label: 'ตรวจผล K-P-A (Step 6)', icon: FileCheck, badge: 'STEP 6' },
    { id: 'dashboard', label: 'ภาพรวม (Dashboard)', icon: LayoutDashboard },
    { id: 'history', label: 'ประวัติเช็คอิน (Logs)', icon: Users },
    { id: 'activities', label: 'กิจกรรม (Activities)', icon: CalendarDays },
    { id: 'reports', label: 'รายงาน (Reports)', icon: FileSpreadsheet },
    { id: 'database', label: 'ฐานข้อมูล (Database)', icon: Database },
  ];

  return (
    <div className="flex h-screen w-full bg-[#F4EFE6] font-sans antialiased text-[#18181B] overflow-hidden">
      
      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR NAVIGATION (Charcoal Studio Rail)                        */}
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
              {/* Studio Scanner Badge */}
              <div className="w-8 h-8 rounded-lg bg-[#FACC15] text-[#18181B] flex items-center justify-center font-black text-sm shrink-0 border border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                📷
              </div>
              {!sidebarCollapsed && (
                <div className="truncate leading-tight">
                  <div className="font-black text-white text-sm tracking-tight truncate">
                    Staff Scanner
                  </div>
                  <div className="text-[10px] text-stone-400 font-medium truncate">
                    คณะครุศาสตร์ ม.นครพนม
                  </div>
                </div>
              )}
            </div>

            <button 
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 text-stone-400 hover:text-white rounded-md hover:bg-stone-800 transition-colors"
              title={sidebarCollapsed ? 'ขยายแถบเมนู' : 'ย่อแถบเมนู'}
            >
              {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Menu List */}
          <nav className="flex-1 px-3 py-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeMenu === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveMenu(item.id as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all relative ${
                    isActive
                      ? 'bg-[#FACC15] text-[#18181B] font-bold border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                      : 'text-stone-300 hover:text-white hover:bg-stone-800/90 font-semibold'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#18181B]' : 'text-stone-400'}`} />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  {item.badge && !sidebarCollapsed && (
                    <span className={`ml-auto px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                      isActive ? 'bg-[#18181B] text-[#FACC15]' : 'bg-[#EF4444] text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Bottom Card: Fast Tips */}
          {!sidebarCollapsed && (
            <div className="p-3 mx-3 mb-3 bg-[#FAF7F0] text-[#18181B] border-2 border-[#18181B] rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-2">
              <div className="flex items-center gap-1.5 font-black text-xs text-[#18181B]">
                <Sparkles className="w-3.5 h-3.5 text-[#F59E0B]" />
                <span>คำแนะนำสแกนเนอร์</span>
              </div>
              <p className="text-[11px] text-stone-600 leading-snug font-medium">
                รองรับเครื่องยิง USB Barcode แบบ Plug & Play และแปลงภาษาไทยอัตโนมัติ
              </p>
              <button 
                onClick={() => setShowWhatNewModal(true)}
                className="w-full py-1.5 px-2 bg-white hover:bg-stone-100 text-[#18181B] rounded-lg text-[10px] font-bold border-2 border-[#18181B] transition-all flex items-center justify-center gap-1 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
              >
                <span>ดูรายละเอียด</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Bottom Settings Link */}
          <div className="p-3 border-t border-stone-800">
            <button 
              onClick={() => setActiveMenu('database')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeMenu === 'database'
                  ? 'bg-[#FACC15] text-[#18181B] font-bold border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
                  : 'text-stone-300 hover:text-white hover:bg-stone-800/80'
              }`}
            >
              <Settings className="w-4 h-4 shrink-0 text-stone-400" />
              {!sidebarCollapsed && <span>ตั้งค่าระบบ (Settings)</span>}
            </button>
          </div>

        </div>
      </aside>

      {/* Mobile Drawer for Staff */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 md:hidden flex">
          <div className="w-64 bg-[#18181B] text-white h-full flex flex-col justify-between p-4 border-r-2 border-[#18181B] animate-in slide-in-from-left">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-stone-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#FACC15] text-[#18181B] flex items-center justify-center font-black text-sm border border-[#18181B]">
                    📷
                  </div>
                  <span className="font-bold text-sm">Staff Scanner</span>
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
                      onClick={() => { setActiveMenu(item.id as any); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold ${
                        activeMenu === item.id
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
      {/* 2. MAIN WORKSPACE CANVAS (Warm Sand Canvas)                               */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Top Header Bar */}
        <header className="h-16 bg-[#F4EFE6] border-b-2 border-[#18181B] px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
          
          {/* Page Title & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-xl bg-white text-[#18181B] border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-stone-100 md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm sm:text-base font-black text-[#18181B] tracking-tight truncate">
              {getPageTitle()}
            </h1>
          </div>

          {/* Right Controls: Search, Notification Bell, User Profile */}
          <div className="flex items-center gap-3">
            
            {/* Search Box */}
            <div className="relative hidden lg:block w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหากิจกรรม, นักศึกษา..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border-2 border-[#18181B] rounded-xl text-xs text-[#18181B] outline-none shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] placeholder:text-stone-400 font-medium"
              />
            </div>

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
              className="w-9 h-9 rounded-xl bg-white border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-stone-50 text-[#18181B] flex items-center justify-center transition-all relative"
              title="แจ้งเตือน"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#EF4444] border-2 border-[#18181B]" />
            </button>

            {/* User Profile Avatar with dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2.5 px-2.5 py-1 bg-white border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rounded-xl hover:bg-stone-50 transition-all text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-[#18181B] text-[#FACC15] flex items-center justify-center font-black text-xs shrink-0 border border-[#18181B] overflow-hidden">
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80"
                    alt="Staff"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <span>จนท</span>
                </div>
                <div className="hidden sm:block leading-tight">
                  <div className="text-xs font-black text-[#18181B] truncate max-w-[130px]">{userName}</div>
                  <div className="text-[10px] text-stone-500 font-bold">เจ้าหน้าที่จุดสแกน</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#18181B] hidden sm:block" />
              </button>

              {/* Dropdown Menu */}
              {showUserDropdown && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border-2 border-[#18181B] rounded-xl shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] py-2 z-50 text-xs animate-in fade-in-50">
                  <div className="px-3 py-2 border-b-2 border-[#18181B]/10">
                    <p className="font-bold text-[#18181B]">{userName}</p>
                    <p className="text-[11px] text-stone-500 font-mono truncate">{userEmail}</p>
                  </div>

                  {onRoleChange && isUserAdmin && (
                    <div className="py-1 border-b-2 border-[#18181B]/10">
                      <div className="px-3 py-1 text-[10px] font-black text-stone-400 uppercase tracking-wider">
                        สลับโหมดการทำงาน
                      </div>
                      <button
                        onClick={() => { onRoleChange('student'); setShowUserDropdown(false); }}
                        className="w-full text-left px-3 py-1.5 hover:bg-[#F4EFE6] flex items-center gap-2 text-stone-800 font-semibold"
                      >
                        <span>🎓</span>
                        <span>โหมดนักศึกษา (Student)</span>
                      </button>
                      <button
                        onClick={() => { onRoleChange('approver'); setShowUserDropdown(false); }}
                        className="w-full text-left px-3 py-1.5 hover:bg-[#F4EFE6] flex items-center gap-2 text-stone-800 font-semibold"
                      >
                        <span>🛡️</span>
                        <span>โหมดผู้บริหาร (Approver)</span>
                      </button>
                      <button
                        onClick={() => { onRoleChange('staff'); setShowUserDropdown(false); }}
                        className="w-full text-left px-3 py-1.5 bg-[#FAF7F0] font-bold text-[#18181B] flex items-center gap-2"
                      >
                        <span>📷</span>
                        <span>โหมดเจ้าหน้าที่ (Staff)</span>
                      </button>
                    </div>
                  )}

                  {onLogout && (
                    <div className="pt-1">
                      <button
                        onClick={() => { onLogout(); setShowUserDropdown(false); }}
                        className="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-600 font-bold flex items-center gap-2"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>ออกจากระบบ</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {activeMenu === 'scanner' && (
            <StaffScanner 
              onNavigateToStudent={(targetStudentId) => {
                if (onRoleChange) {
                  onRoleChange('student', targetStudentId);
                }
              }} 
            />
          )}
          {activeMenu === 'reviews' && (
            <StaffReviewTab 
              staffName={userName}
              onNavigateToScanner={() => setActiveMenu('scanner')}
            />
          )}
          {activeMenu === 'dashboard' && (
            <StaffDashboardView 
              onNavigate={(tab) => setActiveMenu(tab)}
              onQuickScan={() => setActiveMenu('scanner')}
              onAddActivity={() => setActiveMenu('activities')}
            />
          )}
          {activeMenu === 'history' && <CheckInHistory />}
          {activeMenu === 'activities' && <ActivityManager />}
          {activeMenu === 'reports' && <ReportsView />}
          {activeMenu === 'database' && <SupabaseSettings />}
        </main>

      </div>

      {/* What's New Detail Modal */}
      {showWhatNewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border-2 border-[#18181B] shadow-[6px_6px_0px_0px_rgba(24,24,27,1)] space-y-4 animate-in zoom-in-95">
            <div className="w-12 h-12 rounded-xl bg-[#FACC15] border-2 border-[#18181B] flex items-center justify-center text-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <Sparkles className="w-6 h-6" />
            </div>
            
            <div>
              <h3 className="text-base font-black text-[#18181B]">ฟีเจอร์ใหม่สำหรับเจ้าหน้าที่สแกนเนอร์</h3>
              <p className="text-xs text-stone-600 font-medium mt-0.5">
                ระบบสแกนความเร็วสูง คณะครุศาสตร์ มหาวิทยาลัยนครพนม
              </p>
            </div>

            <ul className="space-y-2 text-xs text-stone-700 font-medium">
              <li className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold">✓</span>
                <span>รองรับเครื่องยิงบาร์โค้ด USB ทั้งบาร์โค้ดบัตรจริงและ QR Code ดิจิทัล</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold">✓</span>
                <span>ระบบแปลงภาษาไทยกลับเป็นรหัสนักศึกษาอัตโนมัติเมื่อลืมสลับแป้นพิมพ์</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold">✓</span>
                <span>เสียงแจ้งเตือน Beep ยืนยันผลการสแกนทันทีโดยไม่ต้องเหลือบมองจอ</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-700 font-bold">✓</span>
                <span>ซิงค์ขึ้น Supabase Cloud Real-time ใช้งานพร้อมกันได้หลายจุดสแกน</span>
              </li>
            </ul>

            <button
              onClick={() => setShowWhatNewModal(false)}
              className="w-full py-2.5 bg-[#18181B] hover:bg-stone-800 text-[#FACC15] rounded-xl text-xs font-bold border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
            >
              รับทราบ
            </button>
          </div>
        </div>
      )}

      {/* Mobile Device Tester Modal */}
      <MobileDeviceTesterModal
        isOpen={showMobileTester}
        onClose={() => setShowMobileTester(false)}
      />

    </div>
  );
};
