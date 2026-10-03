import { useState, type FormEvent } from 'react';
import { changeStudentPassword } from '../services/secureAuth';
import { NPULogo } from './NPULogo';

interface Props {
  studentId: string;
  onComplete: () => void;
  onLogout: () => void;
}

export const StudentPasswordSetup = ({ studentId, onComplete, onLogout }: Props) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmation) {
      setError('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await changeStudentPassword(studentId, oldPassword, newPassword);
      onComplete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'เปลี่ยนรหัสผ่านไม่สำเร็จ');
    } finally {
      setBusy(false);
    }
  };

  return <main className="min-h-[100dvh] bg-[#F4EFE6] px-4 py-8 font-['Prompt','Sarabun',sans-serif] text-[#18181B]">
    <div className="mx-auto max-w-lg border-2 border-[#18181B] bg-white p-5 shadow-[4px_4px_0px_0px_#18181B] sm:p-8">
      <div className="flex items-center gap-3">
        <NPULogo size="custom" className="h-16 w-12 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-stone-600">สมุดบันทึกกิจกรรมดิจิทัล</p>
          <h1 className="text-xl font-bold">ตั้งรหัสผ่านใหม่</h1>
        </div>
      </div>
      <p className="mt-5 text-sm leading-relaxed text-stone-700">รหัสนักศึกษา {studentId} · ก่อนดูข้อมูลกิจกรรม กรุณาเปลี่ยนรหัสผ่านที่ใช้ครั้งแรก</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="old-password" className="block text-sm font-semibold">รหัสผ่านเดิม</label>
          <input id="old-password" type="password" autoComplete="current-password" required value={oldPassword}
            onChange={event => setOldPassword(event.target.value)}
            className="mt-1 min-h-12 w-full border-2 border-stone-400 px-4 py-2 focus:outline-4 focus:outline-[#2563EB]" />
        </div>
        <div>
          <label htmlFor="new-password" className="block text-sm font-semibold">รหัสผ่านใหม่ (อย่างน้อย 12 ตัวอักษร)</label>
          <input id="new-password" type="password" autoComplete="new-password" required minLength={12} value={newPassword}
            onChange={event => setNewPassword(event.target.value)}
            className="mt-1 min-h-12 w-full border-2 border-stone-400 px-4 py-2 focus:outline-4 focus:outline-[#2563EB]" />
        </div>
        <div>
          <label htmlFor="confirm-password" className="block text-sm font-semibold">ยืนยันรหัสผ่านใหม่</label>
          <input id="confirm-password" type="password" autoComplete="new-password" required minLength={12} value={confirmation}
            onChange={event => setConfirmation(event.target.value)}
            className="mt-1 min-h-12 w-full border-2 border-stone-400 px-4 py-2 focus:outline-4 focus:outline-[#2563EB]" />
        </div>
        {error && <p role="alert" className="border-l-4 border-rose-700 bg-rose-50 px-4 py-3 text-sm text-rose-900">{error}</p>}
        <button disabled={busy} type="submit" className="min-h-12 w-full bg-[#EA580C] px-6 py-3 font-bold text-white disabled:opacity-50">
          {busy ? 'กำลังบันทึก...' : 'เปลี่ยนรหัสผ่านและเข้าใช้งาน'}
        </button>
      </form>
      <button type="button" onClick={onLogout} className="mt-4 min-h-11 w-full px-4 py-2 text-sm font-semibold text-stone-700 underline">ออกจากระบบ</button>
    </div>
  </main>;
};
