import { useState, type FormEvent } from 'react';
import { NPULogo } from './NPULogo';
import { setInvitedStaffPassword } from '../services/secureAuth';

export const StaffPasswordSetup = ({ onComplete, onLogout }: {
  onComplete: () => void;
  onLogout: () => void;
}) => {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (password !== confirm) {
      setError('รหัสผ่านทั้งสองช่องไม่ตรงกัน');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await setInvitedStaffPassword(password);
      onComplete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ตั้งรหัสผ่านไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return <main className="flex min-h-[100dvh] items-center justify-center bg-[#F4EFE6] px-4 py-8 font-['Prompt','Sarabun',sans-serif] text-[#18181B]">
    <section className="w-full max-w-md border-2 border-[#18181B] bg-white p-5 shadow-[4px_4px_0px_0px_#18181B] sm:p-8" aria-labelledby="setup-title">
      <div className="flex items-center gap-3">
        <NPULogo size="custom" className="h-16 w-12 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-[#57534E]">สมุดบันทึกกิจกรรมดิจิทัล</p>
          <h1 id="setup-title" className="text-xl font-bold">ตั้งรหัสผ่านเจ้าหน้าที่</h1>
        </div>
      </div>
      <p className="mt-5 text-sm leading-relaxed text-[#57534E]">ยืนยันอีเมลจากลิงก์เชิญแล้ว กรุณาตั้งรหัสผ่านเฉพาะระบบนี้ก่อนเปิดทะเบียนและสแกนเช็กอิน</p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="staff-new-password" className="block text-sm font-semibold">รหัสผ่านใหม่ (อย่างน้อย 12 ตัวอักษร)</label>
          <input id="staff-new-password" type="password" autoComplete="new-password" required minLength={12}
            value={password} onChange={event => setPassword(event.target.value)}
            className="mt-1 min-h-12 w-full border-2 border-[#A8A29E] px-4 py-2 focus-visible:outline-4 focus-visible:outline-[#2563EB]" />
        </div>
        <div>
          <label htmlFor="staff-confirm-password" className="block text-sm font-semibold">ยืนยันรหัสผ่านใหม่</label>
          <input id="staff-confirm-password" type="password" autoComplete="new-password" required minLength={12}
            value={confirm} onChange={event => setConfirm(event.target.value)}
            className="mt-1 min-h-12 w-full border-2 border-[#A8A29E] px-4 py-2 focus-visible:outline-4 focus-visible:outline-[#2563EB]" />
        </div>
        {error && <p role="alert" className="border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p>}
        <button type="submit" disabled={busy} className="min-h-12 w-full bg-[#EA580C] px-6 py-3 font-bold text-white disabled:opacity-60">
          {busy ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่านและเข้าใช้งาน'}
        </button>
      </form>
      <p className="mt-4 text-sm text-[#57534E]">ไม่ควรใช้รหัสเดียวกับอีเมลมหาวิทยาลัย</p>
      <button type="button" onClick={onLogout} className="mt-3 min-h-11 w-full px-4 py-2 text-sm font-semibold underline">ออกจากระบบ</button>
    </section>
  </main>;
};
