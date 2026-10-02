import { useEffect, useState } from 'react';
import { getSupabaseClient } from './lib/supabase';
import { initializeLocalActivities, retireLegacyDemoStudents } from './db/db';
import { getVerifiedAccess, signOut, type VerifiedAccess } from './services/secureAuth';
import { pullFromSupabase, setupRealtimeSync, stopRealtimeSync } from './services/supabaseApi';
import { LoginView } from './components/LoginView';
import { StaffPortal } from './components/StaffPortal';
import { StudentPortal } from './components/StudentPortal';
import { ExecutiveAdminDashboard } from './components/ExecutiveAdminDashboard';

export default function App() {
  const [access, setAccess] = useState<VerifiedAccess | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let revision = 0;
    const localReady = Promise.all([
      initializeLocalActivities(),
      retireLegacyDemoStudents()
    ]).catch(cause => console.error('Local data migration failed:', cause));
    const refresh = async () => {
      const currentRevision = ++revision;
      try {
        const verified = await getVerifiedAccess();
        if (!active || currentRevision !== revision) return;
        if (!verified) {
          stopRealtimeSync();
          setAccess(null);
          const { data: { session } } = await getSupabaseClient()!.auth.getSession();
          if (active && currentRevision === revision) {
            setError(session ? 'บัญชีนี้ยังไม่ได้รับสิทธิ์ใช้งาน กรุณาติดต่อเจ้าหน้าที่กิจกรรม' : null);
          }
        } else {
          await localReady;
          await pullFromSupabase();
          if (active && currentRevision === revision) {
            setAccess(verified);
            setError(null);
            setupRealtimeSync();
          }
        }
      } catch (cause) {
        if (active && currentRevision === revision) {
          setAccess(null);
          setError(cause instanceof Error ? cause.message : 'ไม่สามารถตรวจสอบสิทธิ์ได้');
        }
      } finally {
        if (active && currentRevision === revision) setChecking(false);
      }
    };

    const client = getSupabaseClient();
    if (!client) {
      setError('ระบบลงชื่อเข้าใช้ยังไม่พร้อม กรุณาติดต่อเจ้าหน้าที่');
      setChecking(false);
      return;
    }
    const { data: { subscription } } = client.auth.onAuthStateChange(() => {
      window.setTimeout(refresh, 0);
    });
    return () => {
      active = false;
      stopRealtimeSync();
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await signOut();
    stopRealtimeSync();
    setAccess(null);
  };

  if (checking) {
    return <main className="min-h-screen flex items-center justify-center bg-[#FAF9F6] p-6 font-['Prompt','Sarabun',sans-serif] text-[#0F172A]" role="status">กำลังตรวจสอบบัญชีมหาวิทยาลัย...</main>;
  }
  if (!access) return <LoginView error={error} />;

  const commonClass = "h-[100dvh] min-h-[100dvh] flex flex-col bg-[#F4EFE6] text-[#18181B] font-['Prompt','Sarabun',sans-serif] antialiased overflow-hidden";
  if (access.role === 'student') {
    return <div className={commonClass}><StudentPortal studentId={access.studentId} studentName={access.name} studentEmail={access.email} onLogout={logout} isUserAdmin={false} /></div>;
  }
  if (access.role === 'staff') {
    return <div className={commonClass}><StaffPortal onLogout={logout} userName={access.name} userEmail={access.email} isUserAdmin={false} /></div>;
  }
  return <div className={commonClass}><ExecutiveAdminDashboard onLogout={logout} userName={access.name} userEmail={access.email} isUserAdmin={false} /></div>;
}
