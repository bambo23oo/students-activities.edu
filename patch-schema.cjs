const fs = require('fs');
let content = fs.readFileSync('src/lib/supabase.ts', 'utf8');

content = content.replace(
  "approved_by text,\\n  created_at",
  "approved_by text,\\n  student_note text,\\n  audit_trail jsonb,\\n  created_at"
);

fs.writeFileSync('src/lib/supabase.ts', content);
