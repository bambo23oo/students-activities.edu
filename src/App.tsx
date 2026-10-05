import { useEffect, useState } from 'react';
import { getSupabaseClient } from './lib/supabase';
import { clearPrivateBrowserData, retireLegacyDemoStudents } from './db/db';
import { getVerifiedAccess, signOut, type VerifiedAccess } from './services/secureAuth';
import { getPendingSyncCount, pullFromSupabase, setupRealtimeSync, stopRealtimeSync } from './services/supabaseApi';
import { LoginView } from './components/LoginView';
import { StaffCheckinPortal } from './components/StaffCheckinPortal';
import { StaffPasswordSetup } from './components/StaffPasswordSetup';
import { StudentPasswordSetup } from './components/StudentPasswordSetup';
import { StudentJournalPortal } from './components/StudentJournalPortal';
import { StudentOnboarding } from './components/StudentOnboarding';

export default function App() {
  const [access, setAccess] = useState<VerifiedAccess | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recoveringPassword, setRecoveringPassword] = useState(() => sessionStorage.getItem('npu_staff_password_recovery') === '1');
  const [editingStudentProfile, setEditingStudentProfile] = useState(false);

  useEffect(() => {
    let active = true;
    let revision = 0;
    const localReady = retireLegacyDemoStudents()
      .catch(cause => console.error('Local data migration failed:', cause));
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
          const cacheOwner = localStorage.getItem('npu_cache_owner');
          if (cacheOwner !== verified.userId) {
            if (await getPendingSyncCount() > 0) {
              await signOut();
              throw new Error('เครื่องนี้ยังมีรายการเช็คอินของบัญชีเดิมที่รอส่ง กรุณาให้เจ้าหน้าที่บัญชีเดิมส่งข้อมูลก่อน');
            }
            await clearPrivateBrowserData();
            localStorage.removeItem('npu_last_checkin');
            localStorage.setItem('npu_cache_owner', verified.userId);
          }
          if (verified.role === 'staff' && !verified.requiresPasswordChange && sessionStorage.getItem('npu_staff_password_recovery') !== '1') {
            await localReady;
            await pullFromSupabase(true);
          }
          if (active && currentRevision === revision) {
            setAccess(verified);
            setError(null);
            if (verified.role === 'staff' && !verified.requiresPasswordChange && sessionStorage.getItem('npu_staff_password_recovery') !== '1') setupRealtimeSync();
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
    const { data: { subscription } } = client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem('npu_staff_password_recovery', '1');
        setRecoveringPassword(true);
      }
      window.setTimeout(refresh, 0);
    });
    return () => {
      active = false;
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
    localStorage.removeItem('npu_last_checkin');
    localStorage.removeItem('npu_cache_owner');
    sessionStorage.removeItem('npu_staff_password_recovery');
    setRecoveringPassword(false);
    setAccess(null);
  };

  if (checking) {
    return <main className="min-h-screen flex items-center justify-center bg-[#FAF9F6] p-6 font-['Prompt','Sarabun',sans-serif] text-[#0F172A]" role="status">กำลังตรวจสอบบัญชี...</main>;
  }
  if (!access) return <LoginView error={error} />;
  if (access.role === 'staff' && (access.requiresPasswordChange || recoveringPassword)) {
    return <StaffPasswordSetup onLogout={logout} onComplete={() => {
      sessionStorage.removeItem('npu_staff_password_recovery');
      window.location.reload();
    }} />;
  }
  if (access.role === 'staff') return <StaffCheckinPortal onLogout={logout} userName={access.name}
    canResetStudentPassword={access.canResetStudentPassword} />;
  if (access.role === 'student' && access.studentId) {
    if (access.requiresPasswordChange) return <StudentPasswordSetup studentId={access.studentId} onLogout={logout} onComplete={() => window.location.reload()} />;
    if (access.requiresOnboarding || editingStudentProfile) return <StudentOnboarding studentId={access.studentId}
      isEditing={editingStudentProfile} onLogout={logout}
      onCancel={editingStudentProfile ? () => setEditingStudentProfile(false) : undefined}
      onComplete={() => window.location.reload()} />;
    return <StudentJournalPortal studentId={access.studentId} studentName={access.name}
      onLogout={logout} onEditProfile={() => setEditingStudentProfile(true)} />;
  }
  return <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#F4EFE6] p-6 text-center font-['Prompt','Sarabun',sans-serif] text-[#18181B]">
    <h1 className="text-2xl font-bold">ขณะนี้เปิดเฉพาะระบบเช็กอินสำหรับเจ้าหน้าที่</h1>
    <p className="max-w-lg text-[#57534E]">ระบบบันทึกของนักศึกษาจะเปิดในระยะถัดไป ข้อมูลการเช็กอินที่เจ้าหน้าที่บันทึกไว้จะเก็บในฐานข้อมูลกลาง</p>
    <button type="button" onClick={logout} className="min-h-11 bg-[#EA580C] px-6 py-3 font-semibold text-white">ออกจากระบบ</button>
  </main>;
}
