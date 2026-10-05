import { useEffect, useState, type FormEvent } from 'react';
import { Camera, CheckCircle2, LogOut } from 'lucide-react';
import { NPULogo } from './NPULogo';
import { FACULTIES, getMajorsForFaculty, isValidMajorForFaculty } from '../data/majors';
import {
  loadStudentOnboardingProfile, saveStudentOnboardingProfile, validateStudentPhoto, validateStudentOnboardingProfile,
  type StudentOnboardingProfile
} from '../services/studentOnboarding';

const suggestedYear = (studentId: string): number | null => {
  const cohort = Number(studentId.slice(0, 2));
  const current = (new Date().getFullYear() + 543) % 100;
  const year = current - cohort + 1;
  return Number.isInteger(year) && year >= 1 && year <= 6 ? year : null;
};

export const StudentOnboarding = ({ studentId, onComplete, onLogout, onCancel, isEditing = false, demoProfile }: {
  studentId: string;
  onComplete: () => void;
  onLogout: () => void;
  onCancel?: () => void;
  isEditing?: boolean;
  demoProfile?: StudentOnboardingProfile;
}) => {
  const [profile, setProfile] = useState<StudentOnboardingProfile | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [demoSaved, setDemoSaved] = useState(false);

  useEffect(() => {
    if (demoProfile) { setProfile(demoProfile); setLoading(false); return; }
    let active = true;
    loadStudentOnboardingProfile(studentId).then(value => {
      if (active) setProfile({ ...value, year: value.year || suggestedYear(studentId) });
    }).catch(cause => {
      if (active) setError(cause instanceof Error ? cause.message : 'โหลดข้อมูลไม่สำเร็จ');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [studentId, demoProfile]);

  useEffect(() => {
    if (!photo) { setPhotoPreview(''); return; }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  const patch = (values: Partial<StudentOnboardingProfile>) => {
    setProfile(current => current ? { ...current, ...values } : current);
  };
  const pickPhoto = (file?: File) => {
    if (!file) return;
    try { validateStudentPhoto(file); setPhoto(file); setError(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'รูปภาพไม่ถูกต้อง'); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!profile) return;
    setBusy(true);
    setError(null);
    try {
      validateStudentOnboardingProfile(profile, photo);
      if (demoProfile) { setDemoSaved(true); return; }
      await saveStudentOnboardingProfile(studentId, profile, photo);
      onComplete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'บันทึกข้อมูลไม่สำเร็จ');
    } finally { setBusy(false); }
  };

  const field = 'mt-1 min-h-12 w-full min-w-0 border-2 border-stone-400 bg-white px-4 py-2 text-base focus:outline-4 focus:outline-offset-2 focus:outline-[#2563EB]';
  const label = 'block text-sm font-semibold text-[#1C1917]';

  return <main className="min-h-[100dvh] bg-[#FAF9F6] px-4 py-6 font-['Prompt','Sarabun',sans-serif] text-[#1C1917] sm:py-10">
    <div className="mx-auto max-w-2xl">
      <header className="flex items-center gap-3 border-b-2 border-[#EA580C] pb-4">
        <NPULogo size="custom" className="h-16 w-12 shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#57534E]">สมุดบันทึกกิจกรรมดิจิทัล</p>
          <h1 className="text-xl font-bold leading-tight sm:text-2xl">{isEditing ? 'แก้ไขข้อมูลนักศึกษา' : 'ตรวจข้อมูลก่อนเริ่มใช้งาน'}</h1>
        </div>
      </header>

      <div className="mt-5 border-l-4 border-[#2563EB] bg-[#EFF6FF] px-4 py-3 text-sm leading-relaxed text-[#1E40AF]">
        ข้อมูลชื่อ คณะ และสาขาดึงจากทะเบียนนักศึกษา กรุณาตรวจความถูกต้องก่อนบันทึก หากแก้ไข ระบบจะอัปเดตทะเบียนกลางด้วย
      </div>
      {demoProfile && <p role="status" className="mt-4 border-l-4 border-[#B45309] bg-[#FCF8ED] px-4 py-3 text-sm text-[#78350F]">
        ตัวอย่างฟอร์มเท่านั้น · ข้อมูลและรูปภาพที่กรอกจะไม่ส่งไปยังฐานข้อมูลจริง
      </p>}
      {loading && <p role="status" className="mt-6">กำลังโหลดข้อมูลจากทะเบียน...</p>}
      {!loading && !profile && <button type="button" onClick={onLogout} className="mt-5 min-h-11 px-4 py-2 underline">ออกจากระบบ</button>}
      {profile && <form onSubmit={submit} className="mt-6 space-y-6 bg-white p-5 shadow-[4px_4px_0px_0px_#1C1917] ring-2 ring-[#1C1917] sm:p-8">
        <section aria-labelledby="profile-fields" className="space-y-4">
          <h2 id="profile-fields" className="text-lg font-bold">ข้อมูลจากทะเบียนนักศึกษา</h2>
          <div>
            <label htmlFor="onboard-id" className={label}>รหัสนักศึกษา</label>
            <input id="onboard-id" value={studentId} readOnly className={`${field} bg-stone-100 font-semibold`} />
            <p className="mt-1 text-xs text-[#57534E]">ใช้เป็นชื่อผู้ใช้ และไม่สามารถเปลี่ยนรหัสนักศึกษาได้</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-[0.8fr_1.2fr]">
            <div>
              <label htmlFor="onboard-prefix" className={label}>คำนำหน้า <span className="text-red-700">*</span></label>
              <select id="onboard-prefix" required value={profile.prefix} onChange={event => patch({ prefix: event.target.value })} className={field}>
                <option value="">เลือกคำนำหน้า</option>
                <option value="นาย">นาย</option><option value="นางสาว">นางสาว</option><option value="นาง">นาง</option>
              </select>
            </div>
            <div>
              <label htmlFor="onboard-first" className={label}>ชื่อ <span className="text-red-700">*</span></label>
              <input id="onboard-first" required value={profile.firstName} onChange={event => patch({ firstName: event.target.value })} className={field} />
            </div>
          </div>
          <div>
            <label htmlFor="onboard-last" className={label}>นามสกุล <span className="text-red-700">*</span></label>
            <input id="onboard-last" required value={profile.lastName} onChange={event => patch({ lastName: event.target.value })} className={field} />
          </div>
          <div>
            <label htmlFor="onboard-faculty" className={label}>คณะ <span className="text-red-700">*</span></label>
            <select id="onboard-faculty" required value={profile.faculty} onChange={event => {
              const faculty = event.target.value;
              patch({ faculty, major: isValidMajorForFaculty(faculty, profile.major) ? profile.major : '' });
            }} className={field}>
              <option value="">เลือกคณะ</option>
              {FACULTIES.map(faculty => <option key={faculty} value={faculty}>{faculty}</option>)}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1.5fr_0.5fr]">
            <div>
              <label htmlFor="onboard-major" className={label}>สาขาวิชา <span className="text-red-700">*</span></label>
              <select id="onboard-major" required value={profile.major} disabled={!profile.faculty}
                onChange={event => patch({ major: event.target.value })} className={field}>
                <option value="">{profile.faculty ? 'เลือกสาขาวิชา' : 'เลือกคณะก่อน'}</option>
                {getMajorsForFaculty(profile.faculty).map(major =>
                  <option key={major.id} value={major.name}>{major.name}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="onboard-year" className={label}>ชั้นปี <span className="text-red-700">*</span></label>
              <select id="onboard-year" required value={profile.year ?? ''} onChange={event => patch({ year: Number(event.target.value) || null })} className={field}>
                <option value="">เลือกชั้นปี</option>
                {[1, 2, 3, 4, 5, 6].map(value => <option key={value} value={value}>ปี {value}</option>)}
              </select>
            </div>
          </div>
          {!profile.year && <p className="text-xs text-[#57534E]">ทะเบียนยังไม่มีข้อมูลชั้นปี กรุณาเลือกตามสถานะปัจจุบัน</p>}
        </section>

        <section aria-labelledby="contact-fields" className="space-y-4 border-t border-[#E7E5E4] pt-5">
          <h2 id="contact-fields" className="text-lg font-bold">ข้อมูลที่ต้องเพิ่ม</h2>
          <div>
            <label htmlFor="onboard-email" className={label}>อีเมลมหาวิทยาลัย <span className="text-red-700">*</span></label>
            <input id="onboard-email" type="email" inputMode="email" autoComplete="email" required
              placeholder="ชื่อผู้ใช้@npu.ac.th" value={profile.universityEmail}
              onChange={event => patch({ universityEmail: event.target.value })} className={field} />
            <p className="mt-1 text-xs text-[#57534E]">ระบบบันทึกอีเมลนี้ไว้ แต่ยังไม่ยืนยันว่าใช้งานรับอีเมลได้</p>
          </div>
          <div>
            <label htmlFor="onboard-photo" className={label}>รูปภาพประจำตัว <span className="text-red-700">*</span></label>
            <p className="mt-1 text-xs text-[#57534E]">JPG, PNG หรือ WebP · ภาพต้นฉบับไม่เกิน 2 MB · ระบบย่อก่อนเก็บไม่เกิน 1 MB</p>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              {(photoPreview || profile.photoUrl) && <img src={photoPreview || profile.photoUrl} alt="รูปภาพประจำตัวที่เลือก" className="h-24 w-24 border border-[#E7E5E4] object-cover" />}
              <label htmlFor="onboard-photo" className="inline-flex min-h-11 cursor-pointer items-center gap-2 border-2 border-[#1C1917] bg-white px-4 py-2 text-sm font-semibold focus-within:outline-4 focus-within:outline-[#2563EB]">
                <Camera className="h-5 w-5" aria-hidden="true" />{photo || profile.photoPath ? 'เปลี่ยนรูปภาพ' : 'เลือกรูปภาพ'}
              </label>
              <input id="onboard-photo" type="file" accept="image/jpeg,image/png,image/webp" required={!profile.photoPath}
                onChange={event => pickPhoto(event.target.files?.[0])} className="sr-only" />
              {photo && <span className="max-w-full break-all text-xs text-[#57534E]">{photo.name}</span>}
            </div>
          </div>
        </section>
        {error && <p role="alert" className="border-l-4 border-red-700 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p>}
        {demoSaved && <p role="status" className="border-l-4 border-green-700 bg-green-50 px-4 py-3 text-sm text-green-900">ทดสอบกรอกฟอร์มสำเร็จ ไม่มีข้อมูลส่งไปฐานข้อมูลจริง</p>}
        <button type="submit" disabled={busy} className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#EA580C] px-6 py-3 font-bold text-white disabled:opacity-50 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />{busy ? 'กำลังบันทึก...' : isEditing ? 'บันทึกการแก้ไข' : 'ยืนยันข้อมูลและเปิดสมุดบันทึก'}
        </button>
      </form>}
      <button type="button" onClick={onCancel || onLogout} className="mt-5 inline-flex min-h-11 items-center gap-2 px-4 py-2 text-sm font-semibold underline">
        <LogOut className="h-4 w-4" aria-hidden="true" />{onCancel ? 'กลับสมุดบันทึก' : 'ออกจากระบบ'}
      </button>
    </div>
  </main>;
};
