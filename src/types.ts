// Base Types for Authentication and Roles
export type UserRole = 'student' | 'staff' | 'approver' | 'none';

export interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  user: {
    name?: string;
    email?: string;
    picture?: string;
    role?: UserRole;
    studentId?: string;
    isAdmin?: boolean;
  } | null;
  expiresAt?: number;
}

export interface AuditLogEntry {
  action: 'view' | 'edit';
  timestamp: string;
  details: string;
}

// System Core Types
export interface Activity {
  id: string;
  name: string;
  date: string;
  endDate?: string;
  description: string;
  location: string;
  status: 'active' | 'completed' | 'upcoming';
  category?: string;
  hours?: number;
  points?: number; // คะแนนสะสม
  capacity?: number; // จำนวนรับสมัครสูงสุด (Capacity)
  assignedStaffEmails?: string[]; // รายชื่อเจ้าหน้าที่ที่ได้รับสิทธิ์ดูแลกิจกรรมนี้
  selfCheckInAllowed?: boolean; // อนุญาตให้นักศึกษาสแกน QR ประจำกิจกรรมเอง (Self-Check-in)
  yearLevel?: string; // e.g. 'ปี 1 (รหัส 69)'
  cohort?: string; // e.g. '69'
  scheduleStatus?: 'คงเดิม' | 'เปลี่ยนวัน' | 'เปลี่ยนช่วงเวลา';
  originalSchedule?: string;
  newSchedule?: string;
  duration?: string;
  note?: string;
  isImported?: boolean;
  source?: 'imported' | 'custom';
}

export interface Student {
  id: string; // e.g. 64010101
  name: string;
  email: string;
  prefix?: string;
  firstName?: string;
  lastName?: string;
  major?: string;
  year?: number;
  profileImage?: string;
  faculty?: string;
  university?: string;
  isPreRegistered?: boolean;
  isTemporary?: boolean; // Flagged when created via on-site emergency manual entry without full profile/photo
  registeredAt?: string;
  password?: string; // Default password is id, or custom password set by student
  isPasswordChanged?: boolean; // false until student changes password
  passwordUpdatedAt?: string;
}


export interface CheckInLog {
  id: string;
  studentId: string;
  activityId: string;
  timestamp: string;
  method: 'usb' | 'camera' | 'manual';
  status?: string; // Keep for backward compatibility temporarily if needed
  staffStatus: 'pending' | 'verified' | 'rejected';
  execStatus: 'pending' | 'approved' | 'rejected';
  verifiedBy?: string;
  approvedBy?: string;
  studentNote?: string;
  auditTrail?: AuditLogEntry[];
  scannerStation?: string; // e.g. 'Station 1 (ประตูหลัก)', 'Station 2', etc.
  syncStatus?: 'synced' | 'pending' | 'failed';
  isTemporary?: boolean; // Flagged if checked in as emergency temporary entry
  scannedBy?: string; // อีเมลหรือชื่อของเจ้าหน้าที่ที่ทำการสแกนหรือกดเช็คอิน
  overrideReason?: string; // เหตุผลกรณีสตาฟฟ์กด Override เช็คอินให้แบบ Manual
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  username?: string;
  password?: string;
  role: UserRole;
  faculty?: string;
  permissions: {
    canScan: boolean;
    canExport: boolean;
    canApprove: boolean;
    isSuperAdmin: boolean;
  };
  status: 'active' | 'suspended';
  lastLogin?: string;
}

export interface SystemAuditLog {
  id: string;
  actor: string;
  actorRole: string;
  action: string;
  target: string;
  details: string;
  timestamp: string;
  station?: string;
  ipOrDevice?: string;
}

export interface Reflection {
  id: string;
  logId?: string;
  studentId?: string;
  activityId?: string;
  knowledge?: string;
  practice?: string;
  attitude?: string;
  status: 'draft' | 'pending_step1' | 'pending_step2' | 'approved' | 'rejected';
  submittedAt?: string;
  step1ApprovedBy?: string;
  step1ApprovedAt?: string;
  step2ApprovedBy?: string;
  step2ApprovedAt?: string;
  rejectionReason?: string;
  evidenceUrl?: string;
  staffReviewedAt?: string;
  staffReviewerName?: string;
  execApprovedAt?: string;
  execApproverName?: string;
}
