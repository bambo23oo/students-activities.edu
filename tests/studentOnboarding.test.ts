import assert from 'node:assert/strict';
import test from 'node:test';
import { splitRosterName, validateStudentPhoto } from '../src/services/studentOnboarding';

test('prefills title and name from the imported Thai roster', () => {
  assert.deepEqual(splitRosterName('นางสาวนัทตญา ไกยะฝ่าย'), {
    prefix: 'นางสาว', firstName: 'นัทตญา', lastName: 'ไกยะฝ่าย'
  });
  assert.deepEqual(splitRosterName('นายสมชาย ใจดี'), {
    prefix: 'นาย', firstName: 'สมชาย', lastName: 'ใจดี'
  });
});

test('rejects oversize and non-image profile files before upload', () => {
  assert.throws(() => validateStudentPhoto(new File(['x'], 'note.txt', { type: 'text/plain' })), /รูปภาพ/);
  assert.throws(() => validateStudentPhoto(new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'photo.png', { type: 'image/png' })), /2 MB/);
  assert.doesNotThrow(() => validateStudentPhoto(new File(['x'], 'photo.jpg', { type: 'image/jpeg' })));
});
