import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import XLSX from 'xlsx';

const [outputPath, ...inputPaths] = process.argv.slice(2);
if (!outputPath || inputPaths.length === 0) {
  throw new Error('Usage: node scripts/prepareStudentRoster.mjs <private-output.csv> <roster.xlsx|xls> ...');
}

const supportedMajors = new Set([
  'การศึกษาปฐมวัย', 'การประถมศึกษา', 'คอมพิวเตอร์ศึกษา',
  'วิทยาศาสตร์', 'ภาษาอังกฤษ', 'คณิตศาสตรศึกษา',
  'สังคมศึกษา', 'ภาษาไทย', 'ดนตรีศึกษา'
]);
const records = new Map();
const sources = [];
const majorCounts = {};
const cohortCounts = {};

for (const inputPath of inputPaths) {
  const sourceBytes = fs.readFileSync(inputPath);
  const workbook = XLSX.read(sourceBytes, { type: 'buffer' });
  let count = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '', blankrows: true });
    let currentMajor = '';

    for (const [index, row] of rows.entries()) {
      const heading = String(row[0] || '').trim();
      const match = heading.match(/^สาขาวิชาเอก\s+การศึกษา\s*\(([^)]+)\)/);
      if (match) currentMajor = match[1].trim();

      const id = String(row[2] || '').trim();
      if (!/^\d{12}$/.test(id)) continue;

      const name = String(row[3] || '').trim().replace(/\s+/g, ' ');
      const cohort = Number(id.slice(0, 2));
      const year = 70 - cohort; // Academic year 2569: 66→4, 67→3, 68→2, 69→1.
      const location = `${path.basename(inputPath)}:${sheetName}:${index + 1}`;
      if (!name || !supportedMajors.has(currentMajor) || year < 1 || year > 4) {
        throw new Error(`Incomplete or unexpected roster entry at ${location}`);
      }
      if (records.has(id)) {
        throw new Error(`Duplicate student ID at ${location}; earlier row ${records.get(id).location}`);
      }

      records.set(id, {
        location,
        id,
        name,
        email: '', // The source files do not contain verified university emails.
        faculty: 'คณะครุศาสตร์',
        major: `สาขาวิชา${currentMajor}`,
        year
      });
      count++;
      majorCounts[currentMajor] = (majorCounts[currentMajor] || 0) + 1;
      cohortCounts[cohort] = (cohortCounts[cohort] || 0) + 1;
    }
  }

  sources.push({
    file: path.basename(inputPath),
    students: count,
    sha256: crypto.createHash('sha256').update(sourceBytes).digest('hex')
  });
}

const fields = ['id', 'name', 'email', 'faculty', 'major', 'year'];
const escapeCsv = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
const csv = [fields.join(','), ...[...records.values()].map(record => fields.map(field => escapeCsv(record[field])).join(','))].join('\r\n') + '\r\n';
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, '\uFEFF' + csv, { mode: 0o600 });
const audit = {
  studentCount: records.size,
  sources,
  majorCounts,
  cohortCounts,
  emailStatus: 'not supplied by source files; left blank for verification',
  facultyBasis: 'education-major sections in supplied files',
  outputSha256: crypto.createHash('sha256').update('\uFEFF' + csv).digest('hex')
};
fs.writeFileSync(outputPath + '.audit.json', JSON.stringify(audit, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify({ studentCount: audit.studentCount, sources: sources.map(({ file, students }) => ({ file, students })), majorCounts, cohortCounts, emailStatus: audit.emailStatus }));
