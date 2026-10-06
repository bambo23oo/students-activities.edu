import { getSupabaseClient } from '../lib/supabase';

export type ScanDirection = 'check_in' | 'check_out';
export type ScanMethod = 'usb' | 'camera' | 'manual';

export interface ActivityScanEvent {
  id: string;
  studentId: string;
  scanType: ScanDirection;
  scannedAt: string;
  method: ScanMethod;
  scannerStation?: string;
}

type ScanResponse = {
  status: 'recorded' | 'duplicate' | 'closed' | 'wrong_mode' | 'unknown_student' | 'missing_check_in';
  scan_date?: string;
  scanned_at?: string;
  scanner_station?: string;
};

export const bangkokScanDate = (now = new Date()): string =>
  new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(now);

export const recordActivityScan = async (
  activityId: string,
  studentId: string,
  scanType: ScanDirection,
  method: ScanMethod,
  scannerStation: string
): Promise<ScanResponse> => {
  const client = getSupabaseClient();
  if (!client || !navigator.onLine) throw new Error('การเช็กเข้า–ออกต้องเชื่อมต่ออินเทอร์เน็ต');
  const { data, error } = await client.rpc('record_activity_scan', {
    p_activity_id: activityId,
    p_student_id: studentId,
    p_scan_type: scanType,
    p_method: method,
    p_scanner_station: scannerStation
  });
  if (error) throw new Error(error.code === 'PGRST202'
    ? 'ระบบบันทึกเข้า–ออกยังไม่พร้อม กรุณาติดต่อผู้ดูแลระบบ'
    : `บันทึกเข้า–ออกไม่สำเร็จ: ${error.message}`);
  return data as ScanResponse;
};

export const getDayScanEvents = async (activityId: string, scanDate = bangkokScanDate()): Promise<{
  events: ActivityScanEvent[];
  checkIns: number;
  checkOuts: number;
}> => {
  const client = getSupabaseClient();
  if (!client) throw new Error('ยังเชื่อมต่อฐานข้อมูลกลางไม่ได้');
  const base = () => client.from('activity_scan_events').select('id', { count: 'exact', head: true })
    .eq('activity_id', activityId).eq('scan_date', scanDate);
  const [recent, ins, outs] = await Promise.all([
    client.from('activity_scan_events')
      .select('id, student_id, scan_type, scanned_at, method, scanner_station')
      .eq('activity_id', activityId).eq('scan_date', scanDate)
      .order('scanned_at', { ascending: false }).limit(20),
    base().eq('scan_type', 'check_in'),
    base().eq('scan_type', 'check_out')
  ]);
  const error = recent.error || ins.error || outs.error;
  if (error) throw new Error(`โหลดประวัติสแกนวันนี้ไม่สำเร็จ: ${error.message}`);
  return {
    events: (recent.data || []).map(row => ({
      id: row.id, studentId: row.student_id,
      scanType: row.scan_type as ScanDirection, scannedAt: row.scanned_at,
      method: row.method as ScanMethod, scannerStation: row.scanner_station || undefined
    })),
    checkIns: ins.count || 0,
    checkOuts: outs.count || 0
  };
};
