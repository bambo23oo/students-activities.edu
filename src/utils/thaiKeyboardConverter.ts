/**
 * Thai Keyboard to English / Number Converter Utility
 * Solves the issue where USB Barcode/QR Scanners output Thai characters
 * when the host system's keyboard layout is set to Thai (Kedmanee / Pattachote).
 */

const THAI_TO_ENG_MAP: Record<string, string> = {
  // Row 1: Number Row (Kedmanee)
  'ๅ': '1', '+': '!',
  '/': '2', '๑': '@',
  '-': '3', '๒': '#',
  'ภ': '4', '๓': '$',
  'ถ': '5', '๔': '%',
  'ุ': '6', 'ู': '^',
  'ึ': '7', '฿': '&',
  'ค': '8', '๕': '*',
  'ต': '9', '๖': '(',
  'จ': '0', '๗': ')',
  'ข': '-', '๘': '_',
  'ช': '=', '๙': '+',

  // Row 2: QWERTY Row
  'ๆ': 'q', '๐': 'Q',
  'ไ': 'w', '"': 'W',
  'ำ': 'e', 'ฎ': 'E',
  'พ': 'r', 'ฑ': 'R',
  'ะ': 't', 'ธ': 'T',
  'ั': 'y', 'ํ': 'Y',
  'ี': 'u', '๊': 'U',
  'ร': 'i', 'ณ': 'I',
  'น': 'o', 'ฯ': 'O',
  'ย': 'p', 'ญ': 'P',
  'บ': '[', 'ฐ': '{',
  'ล': ']', ',': '}',
  'ฃ': '\\', 'ฅ': '|',

  // Row 3: ASDF Row
  'ฟ': 'a', 'ฤ': 'A',
  'ห': 's', 'ฆ': 'S',
  'ก': 'd', 'ฏ': 'D',
  'ด': 'f', 'โ': 'F',
  'เ': 'g', 'ฌ': 'G',
  '้': 'h', '็': 'H',
  '่': 'j', '๋': 'J',
  'า': 'k', 'ษ': 'K',
  'ส': 'l', 'ศ': 'L',
  'ว': ';', 'ซ': ':',
  'ง': "'", '.': '"',

  // Row 4: ZXCV Row
  'ผ': 'z', '(': 'Z',
  'ป': 'x', ')': 'X',
  'แ': 'c', 'ฉ': 'C',
  'อ': 'v', 'ฮ': 'V',
  'ิ': 'b', 'ฺ': 'B',
  'ท': 'n', '์': 'N',
  'ม': 'm', '?': 'M',
  'ใ': ',', 'ฒ': '<',
  'ฝ': '.', 'ฬ': '>',
  'ฦ': '/'
};

/**
 * Checks if a string contains Thai characters
 */
export function hasThaiCharacters(text: string): boolean {
  return /[\u0E00-\u0E7F]/.test(text);
}

/**
 * Converts Thai keyboard keystrokes to their English / numeric equivalents
 */
export function convertThaiKeyboardToEnglish(input: string): string {
  if (!input) return '';
  return input
    .split('')
    .map(char => THAI_TO_ENG_MAP[char] !== undefined ? THAI_TO_ENG_MAP[char] : char)
    .join('');
}

export interface ExtractedStudentID {
  studentId: string;
  source: 'physical' | 'digital' | 'manual';
  wasConvertedFromThai: boolean;
  originalRaw: string;
}

/**
 * Extracts and cleans a Student ID from raw scanner / barcode input.
 * Handles Thai keyboard artifacts, JSON Digital Passes, URLs, and standard prefixes.
 */
export function extractAndCleanStudentID(rawInput: string): ExtractedStudentID {
  let raw = (rawInput || '').trim();
  const originalRaw = raw;
  let wasConvertedFromThai = false;

  // 1. Detect and convert Thai keyboard layout input
  if (hasThaiCharacters(raw)) {
    raw = convertThaiKeyboardToEnglish(raw);
    wasConvertedFromThai = true;
  }

  let source: 'physical' | 'digital' | 'manual' = 'physical';

  // 2. Try parsing JSON if encoded from Digital Pass QR
  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed.studentId || parsed.id) {
        return {
          studentId: String(parsed.studentId || parsed.id).trim(),
          source: 'digital',
          wasConvertedFromThai,
          originalRaw
        };
      }
    } catch (e) {}
  }

  // 3. URL format: https://.../student/{student-id}
  if (raw.includes('/')) {
    source = 'digital';
    const segments = raw.split('/');
    const last = segments[segments.length - 1];
    if (last && /^[0-9A-Za-z_-]+$/.test(last)) {
      raw = last;
    }
  }

  // 4. Strip prefixes like NPU:, STUDENT:, ID:, S
  if (raw.toUpperCase().startsWith('NPU:')) {
    raw = raw.slice(4).trim();
    source = 'digital';
  } else if (raw.toUpperCase().startsWith('STUDENT:')) {
    raw = raw.slice(8).trim();
  } else if (raw.toUpperCase().startsWith('ID:')) {
    raw = raw.slice(3).trim();
  } else if (/^[Ss][0-9]{8,13}$/.test(raw)) {
    raw = raw.slice(1);
  }

  // 5. Look for consecutive digits of 8 to 13 characters (Standard Student ID pattern)
  const digitMatch = raw.match(/\d{8,13}/);
  if (digitMatch) {
    raw = digitMatch[0];
  } else {
    // Clean any unwanted non-alphanumeric characters except dashes
    raw = raw.replace(/[^A-Za-z0-9_-]/g, '');
  }

  return {
    studentId: raw,
    source,
    wasConvertedFromThai,
    originalRaw
  };
}
