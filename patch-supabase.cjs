const fs = require('fs');

let content = fs.readFileSync('src/lib/supabase.ts', 'utf8');

content = content.replace(
  "    check_in_logs: boolean;\n    reflections: boolean;",
  "    check_in_logs: boolean;"
);

content = content.replace(
  "tables: { students: false, activities: false, check_in_logs: false, reflections: false }",
  "tables: { students: false, activities: false, check_in_logs: false }"
);
content = content.replace(
  "tables: { students: false, activities: false, check_in_logs: false, reflections: false }",
  "tables: { students: false, activities: false, check_in_logs: false }"
);
content = content.replace(
  "tables: { students: false, activities: false, check_in_logs: false, reflections: false }",
  "tables: { students: false, activities: false, check_in_logs: false }"
);
content = content.replace(
  "tables: { students: false, activities: false, check_in_logs: false, reflections: false }",
  "tables: { students: false, activities: false, check_in_logs: false }"
);

content = content.replace(
  /const \[tStudents, tActivities, tLogs, tReflections\] = await Promise\.all\(\[\s+checkTable\('students'\),\s+checkTable\('activities'\),\s+checkTable\('check_in_logs'\),\s+checkTable\('reflections'\)\s+\]\);/,
  `const [tStudents, tActivities, tLogs] = await Promise.all([
      checkTable('students'),
      checkTable('activities'),
      checkTable('check_in_logs')
    ]);`
);

content = content.replace(
  /const tables = \{\s+students: tStudents\.exists,\s+activities: tActivities\.exists,\s+check_in_logs: tLogs\.exists,\s+reflections: tReflections\.exists,\s+\};/,
  `const tables = {
      students: tStudents.exists,
      activities: tActivities.exists,
      check_in_logs: tLogs.exists
    };`
);

content = content.replace(
  "const allTablesExist = tables.students && tables.activities && tables.check_in_logs && tables.reflections;",
  "const allTablesExist = tables.students && tables.activities && tables.check_in_logs;"
);

content = content.replace(
  "const anyTableExists = tables.students || tables.activities || tables.check_in_logs || tables.reflections;",
  "const anyTableExists = tables.students || tables.activities || tables.check_in_logs;"
);

content = content.replace(
  "message: 'เชื่อมต่อ Supabase สำเร็จและพบโครงสร้างตารางครบถ้วนทั้ง 4 ตาราง',",
  "message: 'เชื่อมต่อ Supabase สำเร็จและพบโครงสร้างตารางครบถ้วนทั้ง 3 ตาราง',"
);

content = content.replace(
  "message: 'พบตารางบางส่วน แต่ไม่ครบ 4 ตาราง (ขาดบางตาราง)',",
  "message: 'พบตารางบางส่วน แต่ไม่ครบ 3 ตาราง (ขาดบางตาราง)',"
);

content = content.replace(
  "details: 'กรุณานำสคริปต์ SQL ด้านล่างไปรันในเมนู \"SQL Editor\" ของ Supabase เพื่อสร้างตาราง students, activities, check_in_logs และ reflections'",
  "details: 'กรุณานำสคริปต์ SQL ด้านล่างไปรันในเมนู \"SQL Editor\" ของ Supabase เพื่อสร้างตาราง students, activities, และ check_in_logs'"
);

content = content.replace(
  /export const DEFAULT_SQL_SCHEMA = `[\s\S]*?`;/m,
  "export const DEFAULT_SQL_SCHEMA = `-- TPC Check-in Supabase SQL Schema\\n-- สร้างตาราง students (นักศึกษา)\\ncreate table public.students (\\n  id text primary key,\\n  name text not null,\\n  email text not null,\\n  prefix text,\\n  first_name text,\\n  last_name text,\\n  major text,\\n  year smallint,\\n  faculty text,\\n  university text,\\n  profile_image text,\\n  created_at timestamp with time zone default timezone('utc'::text, now())\\n);\\n\\n-- สร้างตาราง activities (กิจกรรม)\\ncreate table public.activities (\\n  id text primary key,\\n  name text not null,\\n  date date not null,\\n  end_date date,\\n  start_time text,\\n  end_time text,\\n  description text,\\n  location text,\\n  status text default 'upcoming'::text,\\n  category text,\\n  hours smallint,\\n  created_at timestamp with time zone default timezone('utc'::text, now())\\n);\\n\\n-- สร้างตาราง check_in_logs (ประวัติการเช็คอินและสถานะ)\\ncreate table public.check_in_logs (\\n  id text primary key,\\n  student_id text not null references public.students(id) on delete cascade,\\n  activity_id text not null references public.activities(id) on delete cascade,\\n  timestamp timestamp with time zone not null,\\n  method text default 'manual'::text,\\n  staff_status text default 'pending'::text,\\n  exec_status text default 'pending'::text,\\n  verified_by text,\\n  approved_by text,\\n  created_at timestamp with time zone default timezone('utc'::text, now())\\n);\\n\\n-- ตั้งค่า Row Level Security (RLS) เพื่อความปลอดภัย (ปิดเพื่อให้อ่าน/เขียนง่ายสำหรับ Demo)\\nalter table public.students disable row level security;\\nalter table public.activities disable row level security;\\nalter table public.check_in_logs disable row level security;`;"
);


fs.writeFileSync('src/lib/supabase.ts', content);
