export interface MajorOption {
  id: string;
  name: string;
  shortName: string;
  faculty: string;
  code?: string;
  degree?: string;
}

export const FACULTY_OF_EDUCATION_MAJORS: MajorOption[] = [
  { id: 'ece-edu', name: 'สาขาวิชาการศึกษาปฐมวัย', shortName: 'การศึกษาปฐมวัย', faculty: 'คณะครุศาสตร์', degree: 'ค.บ.' },
  { id: 'pri-edu', name: 'สาขาวิชาการประถมศึกษา', shortName: 'การประถมศึกษา', faculty: 'คณะครุศาสตร์', degree: 'ค.บ.' },
  { id: 'com-edu', name: 'สาขาวิชาคอมพิวเตอร์ศึกษา', shortName: 'คอมพิวเตอร์ศึกษา', faculty: 'คณะครุศาสตร์', degree: 'ค.บ.' },
  { id: 'sci-edu', name: 'สาขาวิชาวิทยาศาสตร์', shortName: 'วิทยาศาสตร์', faculty: 'คณะครุศาสตร์', degree: 'ค.บ.' },
  { id: 'eng-edu', name: 'สาขาวิชาภาษาอังกฤษ', shortName: 'ภาษาอังกฤษ', faculty: 'คณะครุศาสตร์', degree: 'ค.บ.' },
  { id: 'mat-edu', name: 'สาขาวิชาคณิตศาสตรศึกษา', shortName: 'คณิตศาสตรศึกษา', faculty: 'คณะครุศาสตร์', degree: 'ค.บ.' },
  { id: 'soc-edu', name: 'สาขาวิชาสังคมศึกษา', shortName: 'สังคมศึกษา', faculty: 'คณะครุศาสตร์', degree: 'ค.บ.' },
  { id: 'tha-edu', name: 'สาขาวิชาภาษาไทย', shortName: 'ภาษาไทย', faculty: 'คณะครุศาสตร์', degree: 'ค.บ.' },
  { id: 'mus-edu', name: 'สาขาวิชาดนตรีศึกษา', shortName: 'ดนตรีศึกษา', faculty: 'คณะครุศาสตร์', degree: 'ค.บ.' }
];

export const FACULTY_OF_SCIENCE_MAJORS: MajorOption[] = [
  { id: 'sci-bio', name: 'สาขาวิชาชีววิทยา', shortName: 'ชีววิทยา', faculty: 'คณะวิทยาศาสตร์' },
  { id: 'sci-chem', name: 'สาขาวิชาเคมี', shortName: 'เคมี', faculty: 'คณะวิทยาศาสตร์' },
  { id: 'sci-phy', name: 'สาขาวิชาฟิสิกส์', shortName: 'ฟิสิกส์', faculty: 'คณะวิทยาศาสตร์' }
];

export const OTHER_NPU_MAJORS: MajorOption[] = FACULTY_OF_SCIENCE_MAJORS;

export const ALL_STANDARD_MAJORS: MajorOption[] = [
  ...FACULTY_OF_EDUCATION_MAJORS,
  ...FACULTY_OF_SCIENCE_MAJORS
];

export const FACULTIES = [
  'คณะครุศาสตร์',
  'คณะวิทยาศาสตร์'
];

export const getMajorsForFaculty = (faculty: string): MajorOption[] =>
  ALL_STANDARD_MAJORS.filter(major => major.faculty === faculty);

export const isValidMajorForFaculty = (faculty: string, majorName: string): boolean =>
  getMajorsForFaculty(faculty).some(major => major.name === majorName);

/**
 * Checks whether a major belongs to Faculty of Science
 */
export const isScienceMajor = (majorName?: string | null): boolean => {
  if (!majorName) return false;
  const clean = majorName.trim().toLowerCase();
  return (
    clean.includes('ฟิสิกส์') ||
    clean.includes('ชีววิทยา') ||
    clean.includes('เคมี') ||
    clean.includes('physics') ||
    clean.includes('biology') ||
    clean.includes('chemistry')
  );
};

/**
 * Returns faculty name by major
 */
export const getFacultyByMajor = (majorName?: string | null): string => {
  return isScienceMajor(majorName) ? 'คณะวิทยาศาสตร์' : 'คณะครุศาสตร์';
};

/**
 * Finds a matching major from either faculty by full name, shortName, or keyword
 */
export const findMajorOption = (majorName?: string | null): MajorOption | undefined => {
  if (!majorName) return undefined;
  const clean = majorName.trim();
  return ALL_STANDARD_MAJORS.find(
    m => m.name === clean || 
         m.shortName === clean || 
         clean.includes(m.shortName) || 
         m.name.includes(clean)
  );
};

const CUSTOM_MAJORS_STORAGE_KEY = 'npu_custom_majors_list';

/**
 * Returns saved custom majors added by students
 */
export const getCustomMajors = (): string[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_MAJORS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
};

/**
 * Save a newly added custom major so it persists and becomes available
 */
export const saveCustomMajor = (majorName: string): void => {
  if (!majorName || !majorName.trim()) return;
  const cleanName = majorName.trim();
  const existing = getCustomMajors();
  if (!existing.includes(cleanName) && !ALL_STANDARD_MAJORS.some(m => m.name === cleanName)) {
    const updated = [cleanName, ...existing];
    try {
      localStorage.setItem(CUSTOM_MAJORS_STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {}
  }
};
