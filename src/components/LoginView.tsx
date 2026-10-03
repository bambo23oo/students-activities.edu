import { useState, type FormEvent } from 'react';
import { ArrowRight, BookOpenCheck, ShieldCheck } from 'lucide-react';
import { NPULogo } from './NPULogo';
import { signInWithEmail, signInWithStudentId } from '../services/secureAuth';

interface LoginViewProps {
  error?: string | null;
}

export const LoginView = ({ error }: LoginViewProps) => {
  const [isStarting, setIsStarting] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<'student' | 'staff'>('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async (event: FormEvent) => {
    event.preventDefault();
    setIsStarting(true);
    setSignInError(null);
    try {
      if (accountType === 'student') await signInWithStudentId(identifier, password);
      else await signInWithEmail(identifier, password);
    } catch (cause) {
      setSignInError(cause instanceof Error ? cause.message : 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองอีกครั้ง');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <main className="min-h-[100dvh] bg-[#F4EFE6] text-[#18181B] font-['Prompt','Sarabun',sans-serif] flex flex-col">
      <div className="h-2 bg-[#EA580C] border-b-2 border-[#18181B]" aria-hidden="true" />
      <div className="flex-1 w-full max-w-6xl mx-auto grid lg:grid-cols-[1.08fr_0.92fr] items-start lg:items-center gap-5 lg:gap-14 px-5 sm:px-8 lg:px-12 py-5 sm:py-12">
        <section aria-labelledby="system-title" className="text-center lg:text-left">
          <div className="flex justify-center lg:justify-start">
            <NPULogo size="custom" className="w-16 h-24 sm:w-36 sm:h-48 lg:w-44 lg:h-60" />
          </div>
          <div className="mt-2 sm:mt-6">
            <div className="inline-flex items-center gap-2 bg-[#FACC15] border-2 border-[#18181B] px-4 py-2 text-xs sm:text-sm font-bold shadow-[3px_3px_0px_0px_#18181B]">
              <BookOpenCheck className="w-4 h-4" aria-hidden="true" />
              ระบบกิจกรรมสำหรับนักศึกษาและบุคลากร
            </div>
            <h1 id="system-title" className="mt-3 sm:mt-6 text-[clamp(2rem,5vw,3.5rem)] leading-[1.2] font-black tracking-tight text-[#18181B]">
              สมุดบันทึกกิจกรรมดิจิทัล
            </h1>
            <div className="mt-3 h-1.5 w-20 bg-[#EA580C] mx-auto lg:mx-0" aria-hidden="true" />
            <p className="mt-3 sm:mt-5 text-base sm:text-lg font-semibold leading-relaxed">
              ศูนย์ฝึกประสบการณ์วิชาชีพครู
            </p>
            <p className="mt-1 text-sm sm:text-base font-medium text-[#57534E] leading-relaxed">
              คณะครุศาสตร์ มหาวิทยาลัยนครพนม
            </p>
          </div>
        </section>

        <section aria-labelledby="login-title" className="bg-white border-2 border-[#18181B] shadow-[6px_6px_0px_0px_#18181B] p-5 sm:p-8 lg:p-10 max-w-xl w-full mx-auto">
          <div className="flex items-start gap-4 border-b-2 border-[#18181B] pb-5">
            <span className="w-12 h-12 shrink-0 flex items-center justify-center bg-[#EA580C] border-2 border-[#18181B] text-white">
              <ShieldCheck className="w-6 h-6" aria-hidden="true" />
            </span>
            <div>
              <h2 id="login-title" className="text-xl sm:text-2xl font-bold leading-tight">เข้าสู่ระบบ</h2>
              <p className="mt-1 text-sm text-[#57534E] leading-relaxed">นักศึกษาใช้รหัสนักศึกษา เจ้าหน้าที่ใช้อีเมลบัญชีงาน</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2" role="group" aria-label="ประเภทบัญชี">
            {(['student', 'staff'] as const).map(type => (
              <button key={type} type="button" aria-pressed={accountType === type}
                onClick={() => { setAccountType(type); setIdentifier(''); setPassword(''); setSignInError(null); }}
                className={`min-h-11 border-2 border-[#18181B] px-4 py-2 text-sm font-semibold ${accountType === type ? 'bg-[#FACC15] text-[#18181B]' : 'bg-white text-[#57534E]'}`}>
                {type === 'student' ? 'นักศึกษา' : 'เจ้าหน้าที่'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSignIn} className="mt-5 space-y-4">
            <div>
              <label htmlFor="login-identifier" className="block text-sm font-semibold">{accountType === 'student' ? 'รหัสนักศึกษา 12 หลัก' : 'อีเมลเจ้าหน้าที่'}</label>
              <input id="login-identifier" required autoComplete={accountType === 'student' ? 'username' : 'email'}
                inputMode={accountType === 'student' ? 'numeric' : 'email'}
                type={accountType === 'student' ? 'text' : 'email'} maxLength={accountType === 'student' ? 12 : undefined}
                value={identifier} onChange={event => setIdentifier(event.target.value)}
                className="mt-1 min-h-12 w-full min-w-0 border-2 border-stone-400 bg-white px-4 py-2 text-base focus:outline-4 focus:outline-offset-2 focus:outline-[#2563EB]" />
            </div>
            <div>
              <label htmlFor="login-password" className="block text-sm font-semibold">รหัสผ่าน</label>
              <input id="login-password" required type="password" autoComplete="current-password"
                value={password} onChange={event => setPassword(event.target.value)}
                className="mt-1 min-h-12 w-full min-w-0 border-2 border-stone-400 bg-white px-4 py-2 text-base focus:outline-4 focus:outline-offset-2 focus:outline-[#2563EB]" />
            </div>
            <button type="submit" disabled={isStarting}
              className="min-h-14 w-full inline-flex items-center justify-center gap-3 px-6 py-3 bg-[#EA580C] hover:bg-[#C2410C] disabled:opacity-60 border-2 border-[#18181B] shadow-[3px_3px_0px_0px_#18181B] text-white text-base font-bold focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-[#2563EB]">
              <span>{isStarting ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}</span>
              {!isStarting && <ArrowRight className="w-5 h-5 shrink-0" aria-hidden="true" />}
            </button>
          </form>

          {accountType === 'student' && <p className="mt-4 text-sm leading-relaxed text-[#57534E]">เข้าใช้ครั้งแรกให้ใช้รหัสนักศึกษาเป็นรหัสผ่าน ระบบจะให้เปลี่ยนรหัสผ่านทันที</p>}

          {(signInError || error) && (
            <p role="alert" aria-live="polite" className="mt-5 border-l-4 border-rose-700 bg-rose-50 px-4 py-3 text-sm leading-relaxed text-rose-900">
              {signInError || error}
            </p>
          )}

          <p className="mt-6 text-sm leading-relaxed text-[#57534E]">
            หากบัญชีเข้าใช้งานไม่ได้หรือข้อมูลนักศึกษาไม่ตรง โปรดติดต่อเจ้าหน้าที่ศูนย์ฝึกประสบการณ์วิชาชีพครู
          </p>
        </section>
      </div>
      <footer className="border-t-2 border-[#18181B] bg-white px-5 py-4 text-center text-xs sm:text-sm text-[#57534E]">
        ศูนย์ฝึกประสบการณ์วิชาชีพครู · คณะครุศาสตร์ · มหาวิทยาลัยนครพนม
      </footer>
    </main>
  );
};
