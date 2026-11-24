import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { extractAndCleanStudentID } from './thaiKeyboardConverter';

export interface StoredScannerRow {
  line: number;
  studentId: string;
}

export interface ParsedStoredScannerFile {
  rows: StoredScannerRow[];
  invalidLines: number[];
  duplicateLines: number[];
}

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 2000;

const parseCells = (records: unknown[][]): ParsedStoredScannerFile => {
  if (records.length > MAX_ROWS) throw new Error(`ไฟล์มีเกิน ${MAX_ROWS.toLocaleString('th-TH')} แถว กรุณาแบ่งไฟล์`);
  const rows: StoredScannerRow[] = [];
  const invalidLines: number[] = [];
  const duplicateLines: number[] = [];
  const seen = new Set<string>();
  records.forEach((record, index) => {
    const values = record.map(value => String(value ?? '').trim()).filter(Boolean);
    if (!values.length) return;
    const ids = [...new Set(values.map(value => extractAndCleanStudentID(value).studentId).filter(value => /^\d{12}$/.test(value)))];
    if (ids.length !== 1) {
      invalidLines.push(index + 1);
      return;
    }
    if (seen.has(ids[0])) {
      duplicateLines.push(index + 1);
      return;
    }
    seen.add(ids[0]);
    rows.push({ line: index + 1, studentId: ids[0] });
  });
  return { rows, invalidLines, duplicateLines };
};

export const parseStoredScannerText = (text: string): ParsedStoredScannerFile => {
  if (text.length > MAX_BYTES) throw new Error('ข้อมูลใหญ่เกิน 2 MB กรุณาแบ่งข้อมูลก่อนนำเข้า');
  const cleaned = text.replace(/^\uFEFF/, '').trim();
  if (!cleaned) return { rows: [], invalidLines: [], duplicateLines: [] };
  const result = Papa.parse<string[]>(cleaned, { skipEmptyLines: true });
  if (result.errors.some(error => error.code !== 'UndetectableDelimiter')) {
    throw new Error('อ่านไฟล์ข้อความไม่ได้ กรุณาตรวจรูปแบบ CSV/TXT');
  }
  return parseCells(result.data);
};

export const parseStoredScannerFile = async (file: File): Promise<ParsedStoredScannerFile> => {
  if (file.size > MAX_BYTES) throw new Error('ไฟล์ใหญ่เกิน 2 MB กรุณาแบ่งไฟล์ก่อนนำเข้า');
  if (/\.xlsx?$/i.test(file.name)) {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    if (!firstSheet) throw new Error('ไม่พบข้อมูลในไฟล์ Excel');
    return parseCells(XLSX.utils.sheet_to_json<unknown[]>(firstSheet, { header: 1, raw: false, defval: '' }));
  }
  if (/\.(csv|txt)$/i.test(file.name)) return parseStoredScannerText(await file.text());
  throw new Error('รองรับเฉพาะไฟล์ .txt, .csv, .xls และ .xlsx');
};
