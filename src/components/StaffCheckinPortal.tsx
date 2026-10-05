import { useRef, useState } from 'react';
import { CalendarDays, ClipboardList, KeyRound, LogOut, Plus, ScanLine } from 'lucide-react';
import { NPULogo } from './NPULogo';
import { StaffScanner } from './StaffScanner';
import { CheckInHistory } from './CheckInHistory';
import { ActivityManager } from './ActivityManager';
import { AdminStudentPasswordReset } from './admin/AdminStudentPasswordReset';

type StaffTab = 'scanner' | 'history' | 'activities' | 'create' | 'reset';

const tabs = [
  { id: 'scanner', label: 'สแกนเช็กอิน', icon: ScanLine },
  { id: 'history', label: 'ประวัติ', icon: ClipboardList },
  { id: 'activities', label: 'กิจกรรม', icon: CalendarDays },
  { id: 'create', label: 'เพิ่มกิจกรรม', icon: Plus }
] as const;

export const StaffCheckinPortal = ({ userName, onLogout, canResetStudentPassword }: {
  userName: string;
  onLogout: () => void;
  canResetStudentPassword: boolean;
}) => {
  const [activeTab, setActiveTab] = useState<StaffTab>('scanner');
  const mainRef = useRef<HTMLElement>(null);

  return <div className="flex h-[100dvh] min-w-0 flex-col bg-[#F4EFE6] font-['Prompt','Sarabun',sans-serif] text-[#18181B]">
    <header className="shrink-0 border-b-2 border-[#18181B] bg-white px-4 py-2 sm:px-6">
      <div className="mx-auto flex max-w-7xl min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <NPULogo size="custom" className="h-12 w-9 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold sm:text-base">สมุดบันทึกกิจกรรมดิจิทัล</p>
            <p className="truncate text-xs text-[#57534E]">เช็กอินกิจกรรม · คณะครุศาสตร์ มหาวิทยาลัยนครพนม</p>
          </div>
        </div>
        <button type="button" onClick={onLogout}
          className="inline-flex min-h-11 shrink-0 items-center gap-2 border-2 border-[#18181B] bg-white px-4 py-2 text-sm font-semibold focus-visible:outline-4 focus-visible:outline-[#2563EB]">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">ออกจากระบบ</span>
          <span className="sr-only sm:hidden">ออกจากระบบ</span>
        </button>
      </div>
      <p className="mx-auto max-w-7xl truncate pt-1 text-xs text-[#57534E]">ผู้ใช้งาน: {userName}</p>
    </header>

    <nav aria-label="งานเจ้าหน้าที่" className="shrink-0 border-b border-[#D6D3D1] bg-white px-3 sm:px-6">
      <div className={`mx-auto grid max-w-7xl gap-1 sm:flex sm:gap-2 ${canResetStudentPassword ? 'grid-cols-5' : 'grid-cols-4'}`}>
        {[...tabs, ...(canResetStudentPassword ? [{ id: 'reset' as const, label: 'รีเซ็ตรหัส', icon: KeyRound }] : [])].map(({ id, label, icon: Icon }) => <button key={id} type="button"
          aria-current={activeTab === id ? 'page' : undefined}
          onClick={() => {
            setActiveTab(id);
            mainRef.current?.scrollTo({ top: 0 });
          }}
          className={`inline-flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 border-b-4 px-1 py-1 text-[11px] font-bold sm:flex-row sm:gap-1 sm:px-4 sm:py-3 sm:text-sm ${activeTab === id ? 'border-[#EA580C] text-[#18181B]' : 'border-transparent text-[#57534E]'}`}>
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="text-center leading-tight sm:whitespace-nowrap">{label}</span>
        </button>)}
      </div>
    </nav>

    <main ref={mainRef} className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-4 sm:px-6 sm:py-6">
      {activeTab === 'scanner' && <StaffScanner />}
      {activeTab === 'history' && <CheckInHistory />}
      {activeTab === 'activities' && <ActivityManager />}
      {activeTab === 'create' && <ActivityManager initialCreateOpen />}
      {activeTab === 'reset' && canResetStudentPassword && <AdminStudentPasswordReset />}
    </main>
  </div>;
};
