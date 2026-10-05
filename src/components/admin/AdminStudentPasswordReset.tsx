import { useState, type FormEvent } from 'react';
import { KeyRound } from 'lucide-react';
import { getSupabaseClient } from '../../lib/supabase';

export const AdminStudentPasswordReset = () => {
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [provisionBusy, setProvisionBusy] = useState(false);
  const [provisionProgress, setProvisionProgress] = useState('');

  const provision = async () => {
    if (!window.confirm('ยืนยันสร้างบัญชีนักศึกษาทั้งทะเบียนด้วยรหัสนักศึกษาเป็นรหัสผ่านแรกเข้า? ผู้ที่ทราบรหัสนักศึกษาอาจเข้าสู่บัญชีก่อนเจ้าของ จึงควรแจ้งให้นักศึกษาเปลี่ยนรหัสทันที')) return;
    setProvisionBusy(true); setError(''); setProvisionProgress('กำลังเริ่มสร้างบัญชี...');
    let startAfter = '';
    let processed = 0;
    let created = 0;
    try {
      for (let batch = 0; batch < 100; batch++) {
        const { data, error: provisionError } = await getSupabaseClient()!.functions
          .invoke('provision-students-batch', { body: { startAfter } });
        if (provisionError || !data || typeof data.processed !== 'number') {
          throw new Error('สร้างบัญชีบางส่วนไม่สำเร็จ สามารถกดเริ่มใหม่ได้ ระบบจะข้ามบัญชีที่สร้างแล้ว');
        }
        processed += data.processed;
        created += data.created || 0;
        setProvisionProgress(`ตรวจแล้ว ${processed} คน · สร้างใหม่ ${created} บัญชี · เช็กอินเดิม ${data.checkIns} รายการ`);
        if (data.finished) return;
        startAfter = data.nextCursor;
      }
      throw new Error('ยังตรวจทะเบียนไม่ครบ กรุณากดเริ่มใหม่เพื่อดำเนินต่อ');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'สร้างบัญชีไม่สำเร็จ');
    } finally { setProvisionBusy(false); }
  };

  const inspect = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(''); setError(''); setStudentName('');
    if (!/^\d{12}$/.test(studentId)) { setError('กรุณากรอกรหัสนักศึกษา 12 หลัก'); return; }
    const supabase = getSupabaseClient();
    const { data, error: readError } = await supabase!.from('students')
      .select('name').eq('id', studentId).maybeSingle();
    if (readError || !data) { setError('ไม่พบรหัสนักศึกษาในทะเบียน'); return; }
    setStudentName(data.name);
  };

  const reset = async () => {
    if (!studentName || busy) return;
    if (!window.confirm(`ยืนยันรีเซ็ตรหัสของ ${studentName} (${studentId}) เป็นรหัสนักศึกษา? นักศึกษาต้องเปลี่ยนรหัสใหม่ก่อนดูสมุดบันทึก`)) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const { data, error: resetError } = await getSupabaseClient()!.functions
        .invoke('admin-reset-student-password', { body: { studentId } });
      if (resetError || !data?.ok) throw new Error('รีเซ็ตรหัสไม่สำเร็จ กรุณาตรวจว่าบัญชีถูกสร้างแล้วและฟังก์ชันผู้ดูแลทำงาน');
      setMessage(`รีเซ็ตรหัสของ ${studentName} แล้ว แจ้งรหัสเริ่มต้นให้นักศึกษาเจ้าของบัญชีผ่านช่องทางที่ตรวจตัวตนแล้ว`);
      setStudentName(''); setStudentId('');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'รีเซ็ตรหัสไม่สำเร็จ'); }
    finally { setBusy(false); }
  };

  return <section className="mx-auto max-w-xl bg-white p-5 font-['Prompt','Sarabun',sans-serif] text-[#1C1917] shadow-[4px_4px_0px_0px_#1C1917] ring-2 ring-[#1C1917] sm:p-8" aria-labelledby="reset-title">
    <div className="mb-7 border-b border-[#E7E5E4] pb-6">
      <h2 className="text-lg font-bold">เปิดบัญชีนักศึกษาจากทะเบียน</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#57534E]">สำหรับผู้ดูแลเท่านั้น ระบบสร้างเฉพาะบัญชีที่ยังไม่มี และไม่แก้ข้อมูลเช็กอินเดิม</p>
      <button type="button" onClick={() => void provision()} disabled={provisionBusy}
        className="mt-4 min-h-12 border-2 border-[#1C1917] bg-[#F59E0B] px-6 py-3 text-sm font-bold disabled:opacity-50">
        {provisionBusy ? 'กำลังสร้างบัญชี...' : 'สร้างบัญชีจากทะเบียน'}
      </button>
      {provisionProgress && <p role="status" className="mt-3 text-sm text-[#57534E]">{provisionProgress}</p>}
    </div>
    <div className="flex items-center gap-3">
      <KeyRound className="h-7 w-7 text-[#C2410C]" aria-hidden="true" />
      <h1 id="reset-title" className="text-xl font-bold">รีเซ็ตรหัสผ่านนักศึกษา</h1>
    </div>
    <p className="mt-3 text-sm leading-relaxed text-[#57534E]">สำหรับผู้ดูแลที่ได้รับสิทธิ์เท่านั้น ตรวจชื่อก่อนรีเซ็ต ระบบจะบังคับให้นักศึกษาตั้งรหัสใหม่หลังเข้าสู่ระบบ</p>
    <form onSubmit={inspect} className="mt-6 space-y-3">
      <label htmlFor="reset-student-id" className="block text-sm font-semibold">รหัสนักศึกษา 12 หลัก</label>
      <input id="reset-student-id" inputMode="numeric" pattern="[0-9]{12}" maxLength={12} required value={studentId}
        onChange={event => { setStudentId(event.target.value); setStudentName(''); setMessage(''); }}
        className="min-h-12 w-full border-2 border-stone-400 px-4 py-2 text-base focus:outline-4 focus:outline-[#2563EB]" />
      <button type="submit" className="min-h-11 border-2 border-[#1C1917] bg-white px-4 py-2 text-sm font-semibold">ตรวจชื่อในทะเบียน</button>
    </form>
    {studentName && <div className="mt-5 border-l-4 border-[#2563EB] bg-blue-50 px-4 py-3">
      <p className="text-sm">พบ: <strong>{studentName}</strong> · {studentId}</p>
      <button type="button" disabled={busy} onClick={() => void reset()}
        className="mt-4 min-h-12 bg-[#EA580C] px-6 py-3 font-bold text-white disabled:opacity-50">
        {busy ? 'กำลังรีเซ็ต...' : 'รีเซ็ตรหัสผ่าน'}
      </button>
    </div>}
    {error && <p role="alert" className="mt-4 border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p>}
    {message && <p role="status" className="mt-4 border-l-4 border-green-700 bg-green-50 px-4 py-3 text-sm text-green-900">{message}</p>}
  </section>;
};
