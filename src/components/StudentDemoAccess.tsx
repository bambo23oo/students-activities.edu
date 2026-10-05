import { useState, type FormEvent } from 'react';
import { NPULogo } from './NPULogo';
import { StudentJournalPreview } from './StudentJournalPreview';

const demoUsername = 'student-demo';
const demoPassword = 'Demo@NPU2026';

/** An isolated UI walkthrough: this route never mounts App or Supabase auth. */
export const StudentDemoAccess = () => {
  const [signedIn, setSignedIn] = useState(false);
  const [username, setUsername] = useState(demoUsername);
  const [password, setPassword] = useState(demoPassword);
  const [error, setError] = useState<string | null>(null);

  const signIn = (event: FormEvent) => {
    event.preventDefault();
    if (username.trim() === demoUsername && password === demoPassword) {
      setError(null);
      setSignedIn(true);
    } else {
      setError('ชื่อผู้ใช้หรือรหัสผ่านตัวอย่างไม่ตรง กรุณาใช้ข้อมูลที่แสดงด้านล่าง');
    }
  };

  if (signedIn) return <StudentJournalPreview interactive onLogout={() => setSignedIn(false)} />;

  return <main className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#FAF9F6] px-4 py-8 font-['Prompt','Sarabun',sans-serif] text-[#1C1917]">
    <section className="w-full max-w-md border-2 border-[#1C1917] bg-white p-5 sm:p-7" aria-labelledby="demo-login-title">
      <div className="flex items-center gap-3">
        <NPULogo size="custom" className="h-16 w-12 shrink-0" />
        <div>
          <p className="text-sm font-semibold">สมุดบันทึกกิจกรรมดิจิทัล</p>
          <p className="text-xs text-[#57534E]">คณะครุศาสตร์ มหาวิทยาลัยนครพนม</p>
        </div>
      </div>
      <h1 id="demo-login-title" className="mt-6 text-2xl font-bold">เข้าระบบนักศึกษาจำลอง</h1>
      <p className="mt-2 border-l-4 border-[#B45309] bg-[#FCF8ED] px-4 py-3 text-sm leading-relaxed text-[#78350F]">
        สำหรับดูหน้าจอและทดลองกรอก K-P-A เท่านั้น ไม่มีข้อมูลนักศึกษาจริง และไม่เชื่อมบัญชีจริง
      </p>
      <form onSubmit={signIn} className="mt-5 space-y-4">
        <label className="block text-sm font-semibold">ชื่อผู้ใช้ตัวอย่าง
          <input value={username} onChange={event => setUsername(event.target.value)} autoComplete="off" required
            className="mt-1 block min-h-12 w-full border-2 border-[#A8A29E] bg-white px-4 py-2 text-base focus-visible:outline-4 focus-visible:outline-[#2563EB]" />
        </label>
        <label className="block text-sm font-semibold">รหัสผ่านตัวอย่าง
          <input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="off" required
            className="mt-1 block min-h-12 w-full border-2 border-[#A8A29E] bg-white px-4 py-2 text-base focus-visible:outline-4 focus-visible:outline-[#2563EB]" />
        </label>
        {error && <p role="alert" className="border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p>}
        <button type="submit" className="min-h-12 w-full border-2 border-[#1C1917] bg-[#EA580C] px-6 py-3 font-bold text-white focus-visible:outline-4 focus-visible:outline-[#2563EB]">เข้าสู่ระบบตัวอย่าง</button>
      </form>
      <p className="mt-4 text-sm text-[#57534E]">ชื่อผู้ใช้ <strong>{demoUsername}</strong> · รหัสผ่าน <strong>{demoPassword}</strong></p>
    </section>
  </main>;
};
