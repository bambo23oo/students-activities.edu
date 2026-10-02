const fs = require('fs');

let content = fs.readFileSync('src/types.ts', 'utf8');

if (!content.includes('AuditLogEntry')) {
  content = content.replace(
    "// System Core Types",
    `export interface AuditLogEntry {
  action: 'view' | 'edit';
  timestamp: string;
  details: string;
}

// System Core Types`
  );
  
  content = content.replace(
    "approvedBy?: string;",
    "approvedBy?: string;\n  studentNote?: string;\n  auditTrail?: AuditLogEntry[];"
  );
  
  fs.writeFileSync('src/types.ts', content);
}
