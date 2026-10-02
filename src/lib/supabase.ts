import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

export interface SupabaseHealthCheck {
  connected: boolean;
  message: string;
  tables: {
    students: boolean;
    activities: boolean;
    check_in_logs: boolean;
    reflections: boolean;
  };
  allTablesExist: boolean;
  details?: string;
  error?: string;
}

export const getSupabaseConfig = () => {
  const url = localStorage.getItem('supabaseUrl') || (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const key = localStorage.getItem('supabaseAnonKey') || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
  return { 
    url: typeof url === 'string' ? url.trim() : '', 
    key: typeof key === 'string' ? key.trim() : '' 
  };
};

export const isSupabaseConfigured = (): boolean => {
  const { url, key } = getSupabaseConfig();
  return Boolean(url && key);
};

export const getSupabaseClient = (): SupabaseClient | null => {
  if (supabaseInstance) return supabaseInstance;

  const { url, key } = getSupabaseConfig();

  if (url && key) {
    try {
      supabaseInstance = createClient(url, key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      return supabaseInstance;
    } catch (err) {
      console.error('Failed to initialize Supabase client:', err);
      return null;
    }
  }

  return null;
};

export const resetSupabaseClient = () => {
  supabaseInstance = null;
};

/**
 * Diagnostic test that verifies both the connection and table schema existence in Supabase
 */
export const checkSupabaseHealth = async (): Promise<SupabaseHealthCheck> => {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) {
    return {
      connected: false,
      message: 'ยังไม่ได้ระบุ Project URL และ API Key',
      tables: { students: false, activities: false, check_in_logs: false, reflections: false },
      allTablesExist: false,
      details: 'กรุณากรอก Project URL และ API Key (anon public) จาก Supabase Dashboard'
    };
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    return {
      connected: false,
      message: 'รูปแบบ Project URL ไม่ถูกต้อง',
      tables: { students: false, activities: false, check_in_logs: false, reflections: false },
      allTablesExist: false,
      details: 'Project URL ต้องเริ่มต้นด้วย https:// เช่น https://xxxxxxxxxxxx.supabase.co'
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      connected: false,
      message: 'ไม่สามารถสร้าง Client เชื่อมต่อได้',
      tables: { students: false, activities: false, check_in_logs: false, reflections: false },
      allTablesExist: false,
      details: 'กรุณาตรวจสอบ URL และ API Key ให้ถูกต้อง'
    };
  }

    const checkTable = async (tableName: string): Promise<{ exists: boolean; hostReachable?: boolean; error?: string }> => {
    try {
      const { error } = await client.from(tableName).select('id').limit(1);
      if (!error) return { exists: true, hostReachable: true };
      
      const msg = error.message || '';
      const code = error.code || '';
      
      // PostgreSQL / PostgREST error for missing table: 42P01 or PGRST204 or schema cache
      if (
        code === '42P01' || 
        code === 'PGRST204' || 
        code === 'PGRST200' || 
        msg.includes('schema cache') || 
        msg.includes('does not exist') ||
        msg.includes('relation')
      ) {
        return { exists: false, hostReachable: true, error: 'ไม่พบตารางในฐานข้อมูล' };
      }

      // If RLS blocks select, the table exists
      if (code === '42501' || msg.includes('permission') || msg.includes('row-level security')) {
        return { exists: true, hostReachable: true };
      }

      // Network / Auth errors
      return { exists: false, hostReachable: false, error: msg };
    } catch (e: any) {
      return { exists: false, hostReachable: false, error: e.message || 'เกิดข้อผิดพลาดในการเรียกดูตาราง' };
    }
  };

  try {
    const [tStudents, tActivities, tLogs, tReflections] = await Promise.all([
      checkTable('students'),
      checkTable('activities'),
      checkTable('check_in_logs'),
      checkTable('reflections')
    ]);

    const tables = {
      students: tStudents.exists,
      activities: tActivities.exists,
      check_in_logs: tLogs.exists,
      reflections: tReflections.exists
    };

    const isAnyHostReachable = tStudents.hostReachable || tActivities.hostReachable || tLogs.hostReachable || tReflections.hostReachable;
    const allTablesExist = tables.students && tables.activities && tables.check_in_logs && tables.reflections;
    const anyTableExists = tables.students || tables.activities || tables.check_in_logs || tables.reflections;

    if (allTablesExist) {
      return {
        connected: true,
        message: 'เชื่อมต่อ Supabase สำเร็จและพบโครงสร้างตารางครบถ้วนทั้ง 4 ตาราง พร้อมรับข้อมูล',
        tables,
        allTablesExist: true,
        details: 'ระบบพร้อมใช้งานสำหรับการบันทึกการเช็คอิน ผลสะท้อนคิด K-P-A และซิงก์ข้อมูลแบบ Real-time'
      };
    } else if (anyTableExists) {
      return {
        connected: true,
        message: 'เชื่อมต่อโฮสต์ได้ แต่ยังพบตารางไม่ครบถ้วนใน Supabase (ต้องการครบทั้ง 4 ตาราง)',
        tables,
        allTablesExist: false,
        details: 'กรุณาคัดลอกสคริปต์ SQL ด้านล่างไปวางใน Supabase SQL Editor แล้วกด Run อีกครั้ง'
      };
    } else if (isAnyHostReachable) {
      return {
        connected: true,
        message: 'เชื่อมต่อโปรเจกต์ Supabase ได้สำเร็จ แต่ยังไม่ได้สร้างตารางในฐานข้อมูล',
        tables,
        allTablesExist: false,
        details: 'กรุณานำสคริปต์ SQL ด้านล่างไปรันในเมนู "SQL Editor" ของ Supabase เพื่อสร้างตาราง students, activities, check_in_logs และ reflections'
      };
    } else {
      return {
        connected: false,
        message: 'ไม่สามารถเชื่อมต่อไปยัง Supabase ได้ กรุณาตรวจสอบ URL และ API Key',
        tables,
        allTablesExist: false,
        details: 'กรุณาตรวจสอบว่า Project URL และ API Key ถูกต้อง และอินเทอร์เน็ตเชื่อมต่ออยู่'
      };
    }
  } catch (err: any) {
    return {
      connected: false,
      message: 'เชื่อมต่อกับ Supabase ไม่สำเร็จ: ' + (err.message || 'Network error'),
      tables: { students: false, activities: false, check_in_logs: false, reflections: false },
      allTablesExist: false,
      error: err.message
    };
  }
};
