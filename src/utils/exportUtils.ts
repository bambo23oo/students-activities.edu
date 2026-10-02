import * as XLSX from 'xlsx';
import { db } from '../db/db';

export const exportDatabaseToExcel = async () => {
  const students = await db.students.toArray();
  const activities = await db.activities.toArray();
  const checkInLogs = await db.checkInLogs.toArray();

  const wb = XLSX.utils.book_new();

  // 1. Students Sheet
  const studentsData = students.map(s => ({
    'รหัสนักศึกษา (id)': s.id,
    'ชื่อ-นามสกุล (name)': s.name,
    'อีเมล (email)': s.email,
    'สาขาวิชา (major)': s.major || 'สาขาวิชาคอมพิวเตอร์ศึกษา',
    'คณะ (faculty)': s.faculty || 'คณะครุศาสตร์',
    'ชั้นปี (year)': s.year || 1,
    'มหาวิทยาลัย (university)': s.university || 'มหาวิทยาลัยนครพนม (NPU)'
  }));
  const wsStudents = XLSX.utils.json_to_sheet(studentsData);
  XLSX.utils.book_append_sheet(wb, wsStudents, 'students');

  // 2. Activities Sheet
  const activitiesData = activities.map(a => ({
    'รหัสกิจกรรม (id)': a.id,
    'ชื่อกิจกรรม (name)': a.name,
    'วันที่จัดกิจกรรม (date)': a.date,
    'วันที่สิ้นสุด (endDate)': a.endDate || a.date,
    'สถานที่จัดกิจกรรม (location)': a.location,
    'รายละเอียดกิจกรรม (description)': a.description,
    'สถานะ (status)': a.status
  }));
  const wsActivities = XLSX.utils.json_to_sheet(activitiesData);
  XLSX.utils.book_append_sheet(wb, wsActivities, 'activities');

  // 3. CheckInLogs Sheet
  const checkInsData = checkInLogs.map(c => ({
    'รหัสบันทึก (id)': c.id,
    'รหัสนักศึกษา (studentId)': c.studentId,
    'รหัสกิจกรรม (activityId)': c.activityId,
    'วันเวลาที่เช็คอิน (timestamp)': c.timestamp,
    'วิธีการบันทึก (method)': c.method,
    'สถานะ (status)': c.status
  }));
  const wsCheckIns = XLSX.utils.json_to_sheet(checkInsData);
  XLSX.utils.book_append_sheet(wb, wsCheckIns, 'checkInLogs');


  // Generate file name with date stamp
  const today = new Date().toISOString().split('T')[0];
  const filename = `TPC_NPU_Database_Std_activities_${today}.xlsx`;
  XLSX.writeFile(wb, filename);

  return filename;
};
