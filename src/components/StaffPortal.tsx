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
  PanelLeftClose, 
  PanelLeft, 
  ShieldCheck, 
  Award, 
  LogOut, 
  UserCheck,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';

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
  userName = 'เจ้าหน้าที่',
  userEmail = '',
  isUserAdmin = false
}) => {
  const [activeMenu, setActiveMenu] = useState<
    'dashboard' | 'scanner' | 'reviews' | 'history' | 'activities' | 'reports' | 'database'
  >('scanner');

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  const getPageTitle = () => {
    switch (activeMenu) {
      case 'dashboard': return 'ภาพรวม';
      case 'scanner': return 'สแกนเช็คอิน';
      case 'reviews': return 'ตรวจผล K-P-A';
      case 'history': return 'ประวัติเช็คอิน';
      case 'activities': return 'จัดการกิจกรรม';
      case 'reports': return 'รายงาน';
      case 'database': return 'ฐานข้อมูล';
      default: return 'งานเจ้าหน้าที่';
    }
  };

  const navItems = [
    { id: 'scanner', label: 'สแกนเช็คอิน', icon: QrCode },
    { id: 'reviews', label: 'ตรวจผล K-P-A', icon: FileCheck },
    { id: 'dashboard', label: 'ภาพรวม', icon: LayoutDashboard },
    { id: 'history', label: 'ประวัติเช็คอิน', icon: Users },
    { id: 'activities', label: 'จัดการกิจกรรม', icon: CalendarDays },
    { id: 'reports', label: 'รายงาน', icon: FileSpreadsheet },
    ...(isUserAdmin ? [{ id: 'database', label: 'ฐานข้อมูล', icon: Database }] : []),
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
                    สมุดบันทึกกิจกรรมดิจิทัล
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
                </button>
              );
            })}
          </nav>

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
                  <span className="font-bold text-sm">งานเจ้าหน้าที่</span>
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
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="min-w-11 min-h-11 flex items-center justify-center rounded-xl bg-white text-[#18181B] border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-stone-100 md:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-sm sm:text-base font-black text-[#18181B] tracking-tight truncate">
              {getPageTitle()}
            </h1>
          </div>

          {/* Right Controls: Search, Notification Bell, User Profile */}
          <div className="flex items-center gap-2 shrink-0">
            
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
          {activeMenu === 'scanner' && <StaffScanner />}
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
          {activeMenu === 'database' && isUserAdmin && <SupabaseSettings />}
        </main>

      </div>

    </div>
  );
};
