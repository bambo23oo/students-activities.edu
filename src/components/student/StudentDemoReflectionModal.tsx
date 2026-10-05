import { useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { Reflection } from '../../types';
import type { JournalEntry } from '../../services/studentJournal';

export const StudentDemoReflectionModal = ({ entry, onClose, onSave }: {
  entry: JournalEntry;
  onClose: () => void;
  onSave: (reflection: Reflection) => void;
}) => {
  const [knowledge, setKnowledge] = useState(entry.reflection?.knowledge || '');
  const [practice, setPractice] = useState(entry.reflection?.practice || '');
  const [attitude, setAttitude] = useState(entry.reflection?.attitude || '');
  const [evidenceName, setEvidenceName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const save = (status: 'draft' | 'pending_step1') => {
    if (status === 'pending_step1' && ![knowledge, practice, attitude].every(value => value.trim())) {
      setError('กรุณากรอกความรู้ ทักษะ และเจตคติให้ครบก่อนส่ง');
      return;
    }
    onSave({
      id: `DEMO-REFLECTION-${entry.log.id}`,
      logId: entry.log.id,
      studentId: entry.log.studentId,
      activityId: entry.log.activityId,
      knowledge: knowledge.trim(),
      practice: practice.trim(),
      attitude: attitude.trim(),
      status
    });
  };

  const submit = (event: FormEvent) => { event.preventDefault(); save('pending_step1'); };

  return <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-3 font-['Prompt','Sarabun',sans-serif]" role="presentation">
    <section role="dialog" aria-modal="true" aria-labelledby="demo-kpa-title"
      className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto border-2 border-[#1C1917] bg-white p-4 shadow-xl sm:p-6">
      <div className="flex items-start justify-between gap-4 border-b border-[#E7E5E4] pb-4">
        <div>
          <h2 id="demo-kpa-title" className="text-xl font-bold">บันทึก K-P-A ตัวอย่าง</h2>
          <p className="mt-1 text-sm text-[#57534E]">{entry.activity?.name || entry.log.activityId}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="ปิดหน้าต่าง" className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#1C1917] focus-visible:outline-4 focus-visible:outline-[#2563EB]">
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
      <p className="mt-4 border-l-4 border-[#B45309] bg-[#FCF8ED] px-4 py-3 text-sm leading-relaxed text-[#78350F]">
        แบบทดลองนี้ไม่ส่งข้อความหรือภาพไปยังระบบจริง ข้อมูลจะหายเมื่อปิดหรือรีเฟรชหน้า
      </p>
      <form onSubmit={submit} className="mt-5 space-y-4">
        {([
          ['ความรู้ (Knowledge)', knowledge, setKnowledge, 'สรุปสิ่งที่ได้เรียนรู้'],
          ['ทักษะ (Practice)', practice, setPractice, 'อธิบายสิ่งที่ได้ลงมือปฏิบัติ'],
          ['เจตคติ (Attitude)', attitude, setAttitude, 'สะท้อนคุณค่าและความรับผิดชอบ']
        ] as const).map(([label, value, setValue, placeholder]) => <label key={label} className="block text-sm font-semibold">
          {label}
          <textarea value={value} onChange={event => setValue(event.target.value)} placeholder={placeholder} rows={3}
            className="mt-1 block min-h-24 w-full resize-y border border-[#A8A29E] bg-white px-4 py-2 text-base font-normal focus-visible:outline-4 focus-visible:outline-[#2563EB]" />
        </label>)}
        <label className="block text-sm font-semibold">
          ภาพหลักฐาน (ทดลองเลือกไฟล์ ไม่อัปโหลด)
          <input type="file" accept="image/*" onChange={event => {
            const file = event.target.files?.[0];
            if (file && file.size > 5 * 1024 * 1024) { setError('ภาพต้องมีขนาดไม่เกิน 5 MB'); event.target.value = ''; return; }
            setEvidenceName(file?.name || ''); setError(null);
          }} className="mt-1 block w-full border border-[#A8A29E] bg-white p-2 text-sm" />
          {evidenceName && <span className="mt-1 block font-normal text-[#57534E]">เลือกไฟล์: {evidenceName}</span>}
        </label>
        {error && <p role="alert" className="border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p>}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => save('draft')} className="min-h-11 border-2 border-[#1C1917] bg-white px-4 py-2 text-sm font-bold focus-visible:outline-4 focus-visible:outline-[#2563EB]">บันทึกร่างตัวอย่าง</button>
          <button type="submit" className="min-h-11 border-2 border-[#1C1917] bg-[#EA580C] px-4 py-2 text-sm font-bold text-white focus-visible:outline-4 focus-visible:outline-[#2563EB]">ส่ง K-P-A ตัวอย่าง</button>
        </div>
      </form>
    </section>
  </div>;
};
