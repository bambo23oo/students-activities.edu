import assert from 'node:assert/strict';
import test from 'node:test';
import { splitRosterName, validateStudentPhoto, validateStudentOnboardingProfile } from '../src/services/studentOnboarding';
import { getMajorsForFaculty } from '../src/data/majors';

test('prefills title and name from the imported Thai roster', () => {
  assert.deepEqual(splitRosterName('นางสาวนัทตญา ไกยะฝ่าย'), {
    prefix: 'นางสาว', firstName: 'นัทตญา', lastName: 'ไกยะฝ่าย'
  });
  assert.deepEqual(splitRosterName('นายสมชาย ใจดี'), {
    prefix: 'นาย', firstName: 'สมชาย', lastName: 'ใจดี'
  });
});

test('requires a university email and photo before journal access', () => {
  const profile = {
    prefix: 'นางสาว', firstName: 'ตัวอย่าง', lastName: 'นักศึกษา',
    faculty: 'คณะครุศาสตร์', major: 'สาขาวิชาการศึกษาปฐมวัย', year: 1,
    universityEmail: 'student@example.com', photoPath: ''
  };
  assert.throws(() => validateStudentOnboardingProfile(profile, new File(['x'], 'photo.jpg', { type: 'image/jpeg' })), /@npu.ac.th/);
  assert.throws(() => validateStudentOnboardingProfile({ ...profile, universityEmail: 'student@npu.ac.th' }, null), /รูปภาพ/);
});

test('offers roster-matching science majors and rejects a mismatched faculty', () => {
  assert.deepEqual(getMajorsForFaculty('คณะวิทยาศาสตร์').map(major => major.name), [
    'สาขาวิชาชีววิทยา', 'สาขาวิชาเคมี', 'สาขาวิชาฟิสิกส์'
  ]);
  const profile = {
    prefix: 'นางสาว', firstName: 'ตัวอย่าง', lastName: 'นักศึกษา',
    faculty: 'คณะวิทยาศาสตร์', major: 'สาขาวิชาเคมี', year: 2,
    universityEmail: 'student@npu.ac.th', photoPath: 'student/profile.jpg'
  };
  assert.doesNotThrow(() => validateStudentOnboardingProfile(profile, null));
  assert.throws(() => validateStudentOnboardingProfile({ ...profile, faculty: 'คณะครุศาสตร์' }, null), /สาขาวิชาที่ตรงกับคณะ/);
});

test('rejects oversize and non-image profile files before upload', () => {
  assert.throws(() => validateStudentPhoto(new File(['x'], 'note.txt', { type: 'text/plain' })), /รูปภาพ/);
  assert.throws(() => validateStudentPhoto(new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'photo.png', { type: 'image/png' })), /2 MB/);
  assert.doesNotThrow(() => validateStudentPhoto(new File(['x'], 'photo.jpg', { type: 'image/jpeg' })));
});
