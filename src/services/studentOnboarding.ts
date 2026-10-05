import imageCompression from 'browser-image-compression';
import { getSupabaseClient } from '../lib/supabase';

export interface StudentOnboardingProfile {
  id: string;
  prefix: string;
  firstName: string;
  lastName: string;
  major: string;
  year: number | null;
  universityEmail: string;
  photoPath: string;
  photoUrl: string;
}

const client = () => {
  const supabase = getSupabaseClient();
  if (!supabase) throw new Error('ยังเชื่อมต่อฐานข้อมูลไม่ได้ กรุณาลองใหม่');
  return supabase;
};

export const splitRosterName = (name: string) => {
  const trimmed = name.trim();
  const prefix = ['นางสาว', 'นาย', 'นาง'].find(value => trimmed.startsWith(value)) || '';
  const rest = prefix ? trimmed.slice(prefix.length).trim() : trimmed;
  const [firstName = '', ...last] = rest.split(/\s+/);
  return { prefix, firstName, lastName: last.join(' ') };
};

export const loadStudentOnboardingProfile = async (studentId: string): Promise<StudentOnboardingProfile> => {
  const supabase = client();
  const [{ data: student, error: studentError }, { data: contact, error: contactError }] = await Promise.all([
    supabase.from('students').select('id,name,prefix,first_name,last_name,major,year').eq('id', studentId).single(),
    supabase.from('student_contact').select('university_email,profile_photo_path').eq('student_id', studentId).maybeSingle()
  ]);
  if (studentError || !student || contactError) throw new Error('โหลดข้อมูลทะเบียนไม่สำเร็จ กรุณาลองใหม่หรือติดต่อเจ้าหน้าที่');
  const parsed = splitRosterName(student.name || '');
  const photoPath = contact?.profile_photo_path || '';
  let photoUrl = '';
  if (photoPath) {
    const { data } = await supabase.storage.from('student-photos').createSignedUrl(photoPath, 60 * 10);
    photoUrl = data?.signedUrl || '';
  }
  return {
    id: student.id,
    prefix: student.prefix || parsed.prefix,
    firstName: student.first_name || parsed.firstName,
    lastName: student.last_name || parsed.lastName,
    major: student.major || '',
    year: student.year || null,
    universityEmail: contact?.university_email || '',
    photoPath,
    photoUrl
  };
};

export const validateStudentPhoto = (file: File): void => {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('รูปภาพต้องเป็นไฟล์ JPG, PNG หรือ WebP');
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('ไฟล์รูปภาพต้นฉบับต้องมีขนาดไม่เกิน 2 MB');
  }
};

export const saveStudentOnboardingProfile = async (
  studentId: string,
  profile: Omit<StudentOnboardingProfile, 'id' | 'photoUrl'>,
  photo: File | null
): Promise<void> => {
  const prefix = profile.prefix.trim();
  const firstName = profile.firstName.trim().replace(/\s+/g, ' ');
  const lastName = profile.lastName.trim().replace(/\s+/g, ' ');
  const major = profile.major.trim();
  const universityEmail = profile.universityEmail.trim().toLowerCase();
  if (!prefix || !firstName || !lastName || !major || !profile.year || profile.year < 1 || profile.year > 6) {
    throw new Error('กรุณาตรวจและกรอกข้อมูลนักศึกษาให้ครบทุกช่อง');
  }
  if (!/^[^\s@]+@npu\.ac\.th$/.test(universityEmail)) {
    throw new Error('กรุณากรอกอีเมลมหาวิทยาลัยที่ลงท้ายด้วย @npu.ac.th');
  }
  if (!photo && !profile.photoPath) throw new Error('กรุณาเพิ่มรูปภาพประจำตัว');

  const supabase = client();
  let photoPath = profile.photoPath;
  if (photo) {
    validateStudentPhoto(photo);
    const compressed = await imageCompression(photo, {
      maxSizeMB: 0.75, maxWidthOrHeight: 800,
      useWebWorker: true, fileType: 'image/jpeg'
    });
    if (compressed.size > 1024 * 1024) throw new Error('รูปภาพหลังปรับขนาดยังเกิน 1 MB กรุณาเลือกภาพอื่น');
    photoPath = `${studentId}/profile.jpg`;
    const { error } = await supabase.storage.from('student-photos').upload(photoPath, compressed, {
      contentType: 'image/jpeg', upsert: true
    });
    if (error) throw new Error('อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่');
  }

  const { data: saved, error: studentError } = await supabase.from('students').update({
    prefix, first_name: firstName, last_name: lastName,
    name: `${prefix}${firstName} ${lastName}`, major, year: profile.year
  }).eq('id', studentId).select('id').single();
  if (studentError || !saved) throw new Error('บันทึกข้อมูลทะเบียนไม่สำเร็จ กรุณาลองใหม่');

  const { error: contactError } = await supabase.from('student_contact').upsert({
    student_id: studentId, university_email: universityEmail,
    profile_photo_path: photoPath, verified_at: null
  }, { onConflict: 'student_id' });
  if (contactError) throw new Error('บันทึกอีเมลและรูปภาพไม่สำเร็จ กรุณาลองใหม่');

  const { data: complete, error: completeError } = await supabase.rpc('complete_student_onboarding');
  if (completeError || !complete) throw new Error('ยังยืนยันข้อมูลแรกเข้าไม่ได้ กรุณาตรวจทุกช่องแล้วลองใหม่');
};
