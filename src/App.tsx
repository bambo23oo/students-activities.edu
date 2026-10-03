import { useEffect, useState } from 'react';
import { getSupabaseClient } from './lib/supabase';
import { clearPrivateBrowserData, initializeLocalActivities, retireLegacyDemoStudents } from './db/db';
import { getVerifiedAccess, signOut, type VerifiedAccess } from './services/secureAuth';
import { getPendingSyncCount, pullFromSupabase, pullStudentUpdates, setupRealtimeSync, stopRealtimeSync } from './services/supabaseApi';
import { LoginView } from './components/LoginView';
import { StudentPasswordSetup } from './components/StudentPasswordSetup';
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
    let studentPoll: number | undefined;
    let studentIdForPolling: string | undefined;
    let pollBusy = false;
    const pollStudent = async () => {
      if (!studentIdForPolling || pollBusy || document.hidden || !navigator.onLine) return;
      pollBusy = true;
      try { await pullStudentUpdates(studentIdForPolling); }
      catch (cause) { console.warn('Student refresh failed:', cause); }
      finally { pollBusy = false; }
    };
    const onVisible = () => { if (!document.hidden) void pollStudent(); };
    document.addEventListener('visibilitychange', onVisible);
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
          if (studentPoll) window.clearInterval(studentPoll);
          studentPoll = undefined;
          studentIdForPolling = undefined;
          setAccess(null);
          const { data: { session } } = await getSupabaseClient()!.auth.getSession();
          if (active && currentRevision === revision) {
            setError(session ? 'บัญชีนี้ยังไม่ได้รับสิทธิ์ใช้งาน กรุณาติดต่อเจ้าหน้าที่กิจกรรม' : null);
          }
        } else {
          const cacheOwner = localStorage.getItem('npu_cache_owner');
          if (cacheOwner !== verified.userId) {
            if (await getPendingSyncCount() > 0) {
              await signOut();
              throw new Error('เครื่องนี้ยังมีรายการเช็คอินของบัญชีเดิมที่รอส่ง กรุณาให้เจ้าหน้าที่บัญชีเดิมส่งข้อมูลก่อน');
            }
            await clearPrivateBrowserData();
            localStorage.setItem('npu_cache_owner', verified.userId);
          }
          if (!verified.requiresPasswordChange) {
            await localReady;
            await pullFromSupabase();
          }
          if (active && currentRevision === revision) {
            setAccess(verified);
            setError(null);
            if (studentPoll) window.clearInterval(studentPoll);
            studentPoll = undefined;
            studentIdForPolling = undefined;
            if (!verified.requiresPasswordChange) {
              if (verified.role === 'student' && verified.studentId) {
                studentIdForPolling = verified.studentId;
                studentPoll = window.setInterval(pollStudent, 30_000);
              } else setupRealtimeSync();
            }
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
      if (studentPoll) window.clearInterval(studentPoll);
      document.removeEventListener('visibilitychange', onVisible);
      stopRealtimeSync();
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    if (await getPendingSyncCount() > 0) {
      window.alert('ยังมีรายการเช็คอินที่ไม่ได้ส่ง กรุณากลับไปที่หน้าสแกนแล้วกด “ส่งอีกครั้ง” ก่อนออกจากระบบ');
      return;
    }
    await signOut();
    stopRealtimeSync();
    await clearPrivateBrowserData();
    localStorage.removeItem('npu_cache_owner');
    setAccess(null);
  };

  if (checking) {
    return <main className="min-h-screen flex items-center justify-center bg-[#FAF9F6] p-6 font-['Prompt','Sarabun',sans-serif] text-[#0F172A]" role="status">กำลังตรวจสอบบัญชีมหาวิทยาลัย...</main>;
  }
  if (!access) return <LoginView error={error} />;
  if (access.role === 'student' && access.requiresPasswordChange && access.studentId) {
    return <StudentPasswordSetup studentId={access.studentId} onLogout={logout} onComplete={() => window.location.reload()} />;
  }

  const commonClass = "h-[100dvh] min-h-[100dvh] flex flex-col bg-[#F4EFE6] text-[#18181B] font-['Prompt','Sarabun',sans-serif] antialiased overflow-hidden";
  if (access.role === 'student') {
    return <div className={commonClass}><StudentPortal studentId={access.studentId} studentName={access.name} studentEmail={access.email} onLogout={logout} isUserAdmin={false} /></div>;
  }
  if (access.role === 'staff') {
    return <div className={commonClass}><StaffPortal onLogout={logout} userName={access.name} userEmail={access.email} isUserAdmin={false} /></div>;
  }
  return <div className={commonClass}><ExecutiveAdminDashboard onLogout={logout} userName={access.name} userEmail={access.email} isUserAdmin={false} /></div>;
}
