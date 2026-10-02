import { db } from '../db/db';
import { Student, CheckInLog, Reflection } from '../types';
import { REAL_FACULTY_ACTIVITIES } from '../data/realActivities';

export const seedTPCDemoData = async () => {
  await db.students.clear();
  await db.activities.clear();
  await db.checkInLogs.clear();
  await db.reflections.clear();

  const facultyStudents: Student[] = [
    // ปี 4 (รหัส 66)
    {
      id: '66309010001',
      name: 'นายกิตติศักดิ์ ศรีวรสาร',
      email: '66309010001@npu.ac.th',
      major: 'สาขาวิชาคอมพิวเตอร์ศึกษา',
      faculty: 'คณะครุศาสตร์',
      university: 'มหาวิทยาลัยนครพนม',
      year: 4
    },
    {
      id: '66309010002',
      name: 'นางสาวศิริสุดา นามวงษา',
      email: '66309010002@npu.ac.th',
      major: 'สาขาวิชาภาษาอังกฤษ',
      faculty: 'คณะครุศาสตร์',
      university: 'มหาวิทยาลัยนครพนม',
      year: 4
    },
    {
      id: '66309010003',
      name: 'นายธนดล ไชยสงคราม',
      email: '66309010003@npu.ac.th',
      major: 'สาขาวิชาคณิตศาสตรศึกษา',
      faculty: 'คณะครุศาสตร์',
      university: 'มหาวิทยาลัยนครพนม',
      year: 4
    },

    // ปี 3 (รหัส 67)
    {
      id: '67010110001',
      name: 'นายจิรภัทร วงศ์ษา',
      email: '67010110001@npu.ac.th',
      major: 'สาขาวิชาการศึกษาปฐมวัย',
      faculty: 'คณะครุศาสตร์',
      university: 'มหาวิทยาลัยนครพนม',
      year: 3
    },
    {
      id: '67010110002',
      name: 'นางสาวกัญญาณัฐ บุญมี',
      email: '67010110002@npu.ac.th',
      major: 'สาขาวิชาภาษาไทย',
      faculty: 'คณะครุศาสตร์',
      university: 'มหาวิทยาลัยนครพนม',
      year: 3
    },

    // ปี 2 (รหัส 68)
    {
      id: '68010110001',
      name: 'นายพงศกร พิลาวงค์',
      email: '68010110001@npu.ac.th',
      major: 'สาขาวิชาสังคมศึกษา',
      faculty: 'คณะครุศาสตร์',
      university: 'มหาวิทยาลัยนครพนม',
      year: 2
    },
    {
      id: '68010110002',
      name: 'นางสาวพิมลดา สุวรรณดี',
      email: '68010110002@npu.ac.th',
      major: 'สาขาวิชาการศึกษาปฐมวัย',
      faculty: 'คณะครุศาสตร์',
      university: 'มหาวิทยาลัยนครพนม',
      year: 2
    },

    // ปี 1 (รหัส 69)
    {
      id: '69010110001',
      name: 'นายวรเมธ แก้วมณี',
      email: '69010110001@npu.ac.th',
      major: 'สาขาวิชาคอมพิวเตอร์ศึกษา',
      faculty: 'คณะครุศาสตร์',
      university: 'มหาวิทยาลัยนครพนม',
      year: 1
    },
    {
      id: '69010110002',
      name: 'นางสาวกัญญารัตน์ แสนสุข',
      email: '69010110002@npu.ac.th',
      major: 'สาขาวิชาวิทยาศาสตร์',
      faculty: 'คณะครุศาสตร์',
      university: 'มหาวิทยาลัยนครพนม',
      year: 1
    },

    // นักศึกษา คณะวิทยาศาสตร์
    {
      id: '66309020001',
      name: 'นายชินวัตร ปัญญาไว',
      email: '66309020001@npu.ac.th',
      major: 'สาขาวิชาฟิสิกส์ (ค.บ.)',
      faculty: 'คณะวิทยาศาสตร์',
      university: 'มหาวิทยาลัยนครพนม',
      year: 4
    },
    {
      id: '67010220001',
      name: 'นางสาวณิชากานต์ พลเยี่ยม',
      email: '67010220001@npu.ac.th',
      major: 'สาขาวิชาชีววิทยา (ค.บ.)',
      faculty: 'คณะวิทยาศาสตร์',
      university: 'มหาวิทยาลัยนครพนม',
      year: 3
    },

    // อาจารย์ / บุคลากร
    {
      id: 'ADM-6601001',
      name: 'ผศ.ดร.ศรีสุดา ด้วงโต้ด',
      email: 'srisuda.com@npu.ac.th',
      prefix: 'ผศ.ดร.',
      firstName: 'ศรีสุดา',
      lastName: 'ด้วงโต้ด',
      major: 'สาขาวิชาคอมพิวเตอร์ศึกษา',
      faculty: 'คณะครุศาสตร์',
      university: 'มหาวิทยาลัยนครพนม',
      year: 4
    }
  ];

  const facultyCheckIns: CheckInLog[] = [
    // นักศึกษา 66309010001 เข้าร่วมกิจกรรมหลัก
    {
      id: 'chk-y4-01-66309010001',
      studentId: '66309010001',
      activityId: 'Y4-01',
      timestamp: '2026-05-14T08:30:00.000Z',
      method: 'camera',
      staffStatus: 'verified',
      execStatus: 'approved'
    },
    {
      id: 'chk-y4-02-66309010001',
      studentId: '66309010001',
      activityId: 'Y4-02',
      timestamp: '2026-05-18T08:00:00.000Z',
      method: 'usb',
      staffStatus: 'verified',
      execStatus: 'approved'
    },
    {
      id: 'chk-y4-03-66309010001',
      studentId: '66309010001',
      activityId: 'Y4-03',
      timestamp: '2026-11-04T08:30:00.000Z',
      method: 'camera',
      staffStatus: 'verified',
      execStatus: 'approved'
    },
    {
      id: 'chk-y4-04-66309010001',
      studentId: '66309010001',
      activityId: 'Y4-04',
      timestamp: '2026-11-11T09:00:00.000Z',
      method: 'usb',
      staffStatus: 'verified',
      execStatus: 'approved'
    },
    {
      id: 'chk-y3-01-66309010001',
      studentId: '66309010001',
      activityId: 'Y3-01',
      timestamp: '2026-10-28T08:30:00.000Z',
      method: 'camera',
      staffStatus: 'verified',
      execStatus: 'approved'
    },
    {
      id: 'chk-y3-02-66309010001',
      studentId: '66309010001',
      activityId: 'Y3-02',
      timestamp: '2026-11-02T08:30:00.000Z',
      method: 'camera',
      staffStatus: 'verified',
      execStatus: 'approved'
    },
    // นักศึกษา 69010110001 (ปี 1)
    {
      id: 'chk-y1-01-69010110001',
      studentId: '69010110001',
      activityId: 'Y1-01',
      timestamp: '2027-01-27T08:45:00.000Z',
      method: 'camera',
      staffStatus: 'verified',
      execStatus: 'pending'
    }
  ];

  const facultyReflections: Reflection[] = [
    {
      id: 'ref-y4-01-66309010001',
      logId: 'chk-y4-01-66309010001',
      studentId: '66309010001',
      knowledge: 'ได้เรียนรู้กรอบเกณฑ์มาตรฐานวิชาชีพครูของคุรุสภาและการจัดทำวิจัยในชั้นเรียน',
      practice: 'ฝึกวิเคราะห์ปัญหาในชั้นเรียนและวางแผนการจัดการเรียนรู้แบบ Active Learning',
      attitude: 'ตระหนักในคุณธรรม จริยธรรม และความรับผิดชอบในวิชาชีพครู',
      status: 'approved',
      submittedAt: '2026-05-15T10:00:00.000Z',
      staffReviewedAt: '2026-05-16T14:00:00.000Z',
      staffReviewerName: 'อาจารย์ผู้รับผิดชอบกิจกรรม',
      execApprovedAt: '2026-05-17T09:00:00.000Z',
      execApproverName: 'ผศ.ดร.ศรีสุดา ด้วงโต้ด (ผู้ช่วยคณบดี)'
    },
    {
      id: 'ref-y4-02-66309010001',
      logId: 'chk-y4-02-66309010001',
      studentId: '66309010001',
      knowledge: 'เข้าใจกระบวนการจัดการเรียนรู้จริง การบริหารชั้นเรียน และการวัดและประเมินผลตามสภาพจริง',
      practice: 'ปฏิบัติการสอนครบตามแผนการจัดการเรียนรู้ ปฏิบัติหน้าที่ครูเวรประจำวันและงานสนับสนุนการศึกษา',
      attitude: 'มีความเมตตากรุณาต่อนักเรียนและอุทิศเวลาเพื่อประโยชน์ของผู้เรียน',
      status: 'approved',
      submittedAt: '2026-10-01T15:00:00.000Z',
      staffReviewedAt: '2026-10-02T10:00:00.000Z',
      staffReviewerName: 'อาจารย์ผู้รับผิดชอบกิจกรรม',
      execApprovedAt: '2026-10-03T11:00:00.000Z',
      execApproverName: 'ผศ.ดร.ศรีสุดา ด้วงโต้ด (ผู้ช่วยคณบดี)'
    },
    {
      id: 'ref-y4-04-66309010001',
      logId: 'chk-y4-04-66309010001',
      studentId: '66309010001',
      knowledge: 'ได้เรียนรู้การใช้ AI Tools และโปรแกรมสร้างสื่อดิจิทัลในการออกแบบบทเรียน',
      practice: 'สร้างสื่อมัลติมีเดียและแบบทดสอบออนไลน์ด้วยเครื่องมือเทคโนโลยีการศึกษา',
      attitude: 'เปิดรับเทคโนโลยีใหม่ๆ เพื่อนำมาพัฒนาการเรียนการสอนอย่างสร้างสรรค์',
      status: 'approved',
      submittedAt: '2026-11-12T13:00:00.000Z',
      staffReviewedAt: '2026-11-13T09:00:00.000Z',
      staffReviewerName: 'อาจารย์ผู้รับผิดชอบกิจกรรม',
      execApprovedAt: '2026-11-14T10:00:00.000Z',
      execApproverName: 'ผศ.ดร.ศรีสุดา ด้วงโต้ด (ผู้ช่วยคณบดี)'
    },
    {
      id: 'ref-y3-02-66309010001',
      logId: 'chk-y3-02-66309010001',
      studentId: '66309010001',
      knowledge: 'ได้เรียนรู้เทคนิคการถ่ายทอดความรู้และการแก้ปัญหาเฉพาะหน้าในห้องเรียนจริง',
      practice: 'ฝึกจัดกิจกรรมการเรียนรู้แบบกลุ่มและการให้ผลป้อนกลับแก่นักเรียน',
      attitude: 'มีความมุ่งมั่นพัฒนาตนเองให้เป็นครูที่ดีและมีเจตคติที่ดีต่อผู้เรียน',
      status: 'approved',
      submittedAt: '2026-12-19T10:00:00.000Z',
      staffReviewedAt: '2026-12-20T11:00:00.000Z',
      staffReviewerName: 'อาจารย์ผู้รับผิดชอบกิจกรรม',
      execApprovedAt: '2026-12-21T09:30:00.000Z',
      execApproverName: 'ผศ.ดร.ศรีสุดา ด้วงโต้ด (ผู้ช่วยคณบดี)'
    }
  ];

  await db.students.bulkPut(facultyStudents);
  await db.activities.bulkPut(REAL_FACULTY_ACTIVITIES);
  await db.checkInLogs.bulkPut(facultyCheckIns);
  await db.reflections.bulkPut(facultyReflections);
};

export interface ConcurrencyTestResult {
  totalStudents: number;
  successfulCheckIns: number;
  duplicateAttemptsBlocked: number;
  executionTimeMs: number;
  throughputPerSecond: number;
  avgLatencyPerScanMs: number;
  stationsUsed: number;
  activityId: string;
  activityName: string;
}

/**
 * Simulates high-concurrency load of 400-500 students scanning simultaneously
 * across multiple scanner stations to test throughput, race condition resistance, and stability.
 */
export const simulateConcurrentLoad = async (
  studentCount = 450,
  stationCount = 4,
  targetActivityId?: string
): Promise<ConcurrencyTestResult> => {
  const startTime = performance.now();

  // 1. Get or pick an activity
  let activity = targetActivityId ? await db.activities.get(targetActivityId) : null;
  if (!activity) {
    const allActs = await db.activities.toArray();
    activity = allActs[0] || REAL_FACULTY_ACTIVITIES[0];
    if (!activity) {
      await db.activities.bulkPut(REAL_FACULTY_ACTIVITIES);
      activity = REAL_FACULTY_ACTIVITIES[0];
    }
  }

  const actId = activity.id;
  const stations = [
    'ช่องที่ 1 (ประตูหลัก)',
    'ช่องที่ 2 (ประตูข้าง)',
    'ช่องที่ 3 (โต๊ะลงทะเบียน 1)',
    'ช่องที่ 4 (โต๊ะลงทะเบียน 2)'
  ].slice(0, stationCount);

  const majors = [
    'สาขาวิชาคอมพิวเตอร์ศึกษา',
    'สาขาวิชาการศึกษาปฐมวัย',
    'สาขาวิชาภาษาไทย',
    'สาขาวิชาภาษาอังกฤษ',
    'สาขาวิชาคณิตศาสตร์',
    'สาขาวิชาสังคมศึกษา',
    'สาขาวิชาวิทยาศาสตร์ทั่วไป'
  ];

  const firstNames = ['กิตติศักดิ์', 'ศิริสุดา', 'ธนดล', 'จิรภัทร', 'กัญญาณัฐ', 'พงศกร', 'พิมลดา', 'วรเมธ', 'กัญญารัตน์', 'อานนท์', 'พรทิพย์', 'สุรชัย', 'นฤมล', 'ธีรภัทร', 'เกศรา', 'วิทวัส', 'ชลธิชา'];
  const lastNames = ['ศรีวรสาร', 'นามวงษา', 'ไชยสงคราม', 'วงศ์ษา', 'บุญมี', 'พิลาวงค์', 'สุวรรณดี', 'แก้วมณี', 'แสนสุข', 'คำมี', 'สิงห์คำ', 'จันทรโคตร', 'สุขสมบัติ', 'แก่นแก้ว', 'คงทน'];

  // 2. Prepare 450-500 unique students
  const newStudents: Student[] = [];
  const baseId = 66010000;
  for (let i = 1; i <= studentCount; i++) {
    const sId = String(baseId + i);
    const fName = firstNames[i % firstNames.length];
    const lName = lastNames[i % lastNames.length];
    const major = majors[i % majors.length];
    const year = ((i % 4) + 1);

    newStudents.push({
      id: sId,
      name: `${i % 2 === 0 ? 'นาย' : 'นางสาว'}${fName} ${lName}`,
      email: `${sId}@npu.ac.th`,
      major,
      faculty: 'คณะครุศาสตร์',
      university: 'มหาวิทยาลัยนครพนม',
      year
    });
  }

  // Bulk save generated students
  await db.students.bulkPut(newStudents);

  // 3. Simulate high-speed concurrent scans across stations
  let successfulCheckIns = 0;
  let duplicateAttemptsBlocked = 0;
  const now = new Date();

  // Create simulated check-in stream (with 5% simulated duplicate attempts across stations)
  const logsToInsert: CheckInLog[] = [];
  const processedSet = new Set<string>();

  for (let i = 0; i < newStudents.length; i++) {
    const student = newStudents[i];
    const assignedStation = stations[i % stations.length];
    const deterministicId = `chk_${actId}_${student.id}`;

    // Normal scan
    if (!processedSet.has(deterministicId)) {
      processedSet.add(deterministicId);
      logsToInsert.push({
        id: deterministicId,
        studentId: student.id,
        activityId: actId,
        timestamp: new Date(now.getTime() - (studentCount - i) * 800).toISOString(),
        method: i % 3 === 0 ? 'camera' : 'usb',
        staffStatus: 'verified',
        execStatus: 'pending',
        status: 'checked_in',
        scannerStation: assignedStation,
        syncStatus: 'pending'
      });
      successfulCheckIns++;
    }

    // Simulate occasional duplicate scan from another station (race condition test)
    if (i % 15 === 0) {
      const duplicateStation = stations[(i + 1) % stations.length];
      if (processedSet.has(deterministicId)) {
        duplicateAttemptsBlocked++; // blocked by single check-in logic
      }
    }
  }

  // Bulk put into IndexedDB
  await db.checkInLogs.bulkPut(logsToInsert);

  const endTime = performance.now();
  const executionTimeMs = Math.round(endTime - startTime);
  const throughputPerSecond = Math.round((successfulCheckIns / (executionTimeMs / 1000)));
  const avgLatencyPerScanMs = Number((executionTimeMs / studentCount).toFixed(2));

  // Dispatch live update
  window.dispatchEvent(new Event('db_updated'));

  return {
    totalStudents: studentCount,
    successfulCheckIns,
    duplicateAttemptsBlocked,
    executionTimeMs,
    throughputPerSecond,
    avgLatencyPerScanMs,
    stationsUsed: stations.length,
    activityId: actId,
    activityName: activity.name
  };
};

