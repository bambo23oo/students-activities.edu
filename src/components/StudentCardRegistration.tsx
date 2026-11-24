import React, { useState } from 'react';
import { FACULTIES } from '../data/majors';
import { getSupabaseClient } from '../lib/supabase';
import type { Student } from '../types';

interface StudentCardRegistrationProps {
  studentId: string;
  onCancel: () => void;
  onSaved: (student: Student) => void | Promise<void>;
}

export const StudentCardRegistration: React.FC<StudentCardRegistrationProps> = ({ studentId, onCancel, onSaved }) => {
  const [prefix, setPrefix] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [faculty, setFaculty] = useState('');
  const [major, setMajor] = useState('');
  const [year, setYear] = useState('');
  const [cardVerified, setCardVerified] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    const cleanPrefix = prefix.trim();
    const cleanFirst = firstName.trim();
    const cleanLast = lastName.trim();
    if (!/^\d{12}$/.test(studentId) || !cleanFirst || !cleanLast || !cardVerified) {
      setError('กรุณากรอกชื่อ–สกุลจากบัตรและยืนยันว่าตรวจบัตรแล้ว');
      return;
    }
    const client = getSupabaseClient();
    if (!client || !navigator.onLine) {
      setError('ต้องเชื่อมต่ออินเทอร์เน็ตเพื่อเพิ่มข้อมูลนักศึกษา');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const { data: existing, error: lookupError } = await client.from('students')
        .select('id, name').eq('id', studentId).maybeSingle();
      if (lookupError) throw lookupError;
      if (existing?.name?.trim()) {
        throw new Error('รหัสนี้มีชื่อในทะเบียนกลางแล้ว กรุณาค้นหาอีกครั้งและตรวจข้อมูลก่อนเช็กอิน');
      }

      const payload = {
        name: `${cleanPrefix}${cleanFirst} ${cleanLast}`,
        prefix: cleanPrefix || null,
        first_name: cleanFirst,
        last_name: cleanLast,
        ...(faculty.trim() ? { faculty: faculty.trim() } : {}),
        ...(major.trim() ? { major: major.trim() } : {}),
        ...(year ? { year: Number(year) } : {})
      };
      const query = existing
        ? existing.name === null
          ? client.from('students').update(payload).eq('id', studentId).is('name', null)
          : client.from('students').update(payload).eq('id', studentId).eq('name', existing.name)
        : client.from('students').insert({ id: studentId, ...payload });
      const { data: saved, error: saveError } = await query
        .select('id, name, email, prefix, first_name, last_name, faculty, major, year').single();
      if (saveError || !saved) {
        if (saveError?.code === '23505' || saveError?.code === 'PGRST116') {
          throw new Error('มีเจ้าหน้าที่เพิ่มรหัสนี้แล้ว กรุณาค้นหาอีกครั้งและตรวจชื่อก่อนเช็กอิน');
        }
        throw new Error(saveError?.message || 'บันทึกทะเบียนนักศึกษาไม่สำเร็จ');
      }
      await onSaved({
        id: saved.id, name: saved.name, email: saved.email || '',
        prefix: saved.prefix || undefined, firstName: saved.first_name || undefined,
        lastName: saved.last_name || undefined, faculty: saved.faculty || undefined,
        major: saved.major || undefined, year: saved.year || undefined
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'บันทึกทะเบียนนักศึกษาไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-4 rounded-xl border-2 border-[#18181B] bg-white p-4 sm:p-5 font-['Prompt','Sarabun',sans-serif]">
      <div>
        <h3 className="text-base font-bold text-[#0F172A]">เพิ่มข้อมูลนักศึกษาจากบัตร</h3>
        <p className="mt-1 text-sm text-stone-700">บันทึกเฉพาะข้อมูลบนบัตรนักศึกษาจริง ระบบจะยังไม่เช็กอินจนกว่าเจ้าหน้าที่จะยืนยันอีกครั้ง</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-stone-800 sm:col-span-2">
          รหัสนักศึกษา
          <input readOnly value={studentId} className="mt-1 min-h-12 w-full rounded-lg border border-stone-300 bg-stone-100 px-4 py-2 font-mono" />
        </label>
        <label className="block text-sm font-medium text-stone-800">
          คำนำหน้า (ถ้ามีบนบัตร)
          <input value={prefix} onChange={event => setPrefix(event.target.value)} maxLength={30}
            placeholder="เช่น นาย, นางสาว" className="mt-1 min-h-12 w-full rounded-lg border border-stone-300 px-4 py-2" />
        </label>
        <label className="block text-sm font-medium text-stone-800">
          ชั้นปี (ถ้าทราบ)
          <select value={year} onChange={event => setYear(event.target.value)}
            className="mt-1 min-h-12 w-full rounded-lg border border-stone-300 bg-white px-4 py-2">
            <option value="">ไม่ระบุ</option>
            {[1, 2, 3, 4, 5, 6].map(value => <option key={value} value={value}>ปี {value}</option>)}
          </select>
        </label>
        <label className="block text-sm font-medium text-stone-800">
          ชื่อจริงจากบัตร <span className="text-red-700">*</span>
          <input required value={firstName} onChange={event => setFirstName(event.target.value)} maxLength={100}
            className="mt-1 min-h-12 w-full rounded-lg border border-stone-300 px-4 py-2" />
        </label>
        <label className="block text-sm font-medium text-stone-800">
          นามสกุลจากบัตร <span className="text-red-700">*</span>
          <input required value={lastName} onChange={event => setLastName(event.target.value)} maxLength={100}
            className="mt-1 min-h-12 w-full rounded-lg border border-stone-300 px-4 py-2" />
        </label>
        <label className="block text-sm font-medium text-stone-800">
          คณะ (ถ้ามีบนบัตร)
          <input list="card-faculties" value={faculty} onChange={event => setFaculty(event.target.value)} maxLength={100}
            className="mt-1 min-h-12 w-full rounded-lg border border-stone-300 px-4 py-2" />
          <datalist id="card-faculties">{FACULTIES.map(value => <option key={value} value={value} />)}</datalist>
        </label>
        <label className="block text-sm font-medium text-stone-800">
          สาขาวิชา (ถ้ามีบนบัตร)
          <input value={major} onChange={event => setMajor(event.target.value)} maxLength={120}
            className="mt-1 min-h-12 w-full rounded-lg border border-stone-300 px-4 py-2" />
        </label>
      </div>
      <label className="flex items-start gap-3 text-sm text-stone-800">
        <input type="checkbox" checked={cardVerified} onChange={event => setCardVerified(event.target.checked)} className="mt-1 h-5 w-5" />
        <span>ตรวจรหัสและชื่อ–สกุลกับบัตรนักศึกษาจริงแล้ว</span>
      </label>
      {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} disabled={saving}
          className="min-h-12 rounded-lg border border-stone-400 bg-white px-6 py-3 text-sm font-bold text-stone-800">ยกเลิก</button>
        <button type="submit" disabled={saving || !cardVerified}
          className="min-h-12 rounded-lg bg-[#EA580C] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
          {saving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลนักศึกษา'}
        </button>
      </div>
    </form>
  );
};
