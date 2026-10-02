const fs = require('fs');

let content = fs.readFileSync('src/services/supabaseApi.ts', 'utf8');

// Update pull mapping
content = content.replace(
  /await db\.checkInLogs\.bulkPut\(\s*logs\.map\(\(l: any\) => \(\{\s*id: l\.id,\s*studentId: l\.student_id,\s*activityId: l\.activity_id,\s*timestamp: l\.timestamp,\s*method: l\.method,\s*staffStatus: l\.staff_status,\s*execStatus: l\.exec_status\s*\}\)\)\s*\);/g,
  `await db.checkInLogs.bulkPut(
      logs.map((l: any) => ({
        id: l.id,
        studentId: l.student_id,
        activityId: l.activity_id,
        timestamp: l.timestamp,
        method: l.method,
        staffStatus: l.staff_status,
        execStatus: l.exec_status,
        studentNote: l.student_note || undefined,
        auditTrail: l.audit_trail || undefined
      }))
    );`
);

// Update logCheckInToSupabase
content = content.replace(
  /staff_status: log\.staffStatus, exec_status: log\.execStatus\s*\}\, \{ onConflict: 'id' \}\);/g,
  `staff_status: log.staffStatus, exec_status: log.execStatus,
        student_note: log.studentNote || null,
        audit_trail: log.auditTrail || null
      }, { onConflict: 'id' });`
);

// Update syncAllDataToSupabase
content = content.replace(
  /method: l\.method \|\| 'camera',\s*staff_status: l\.staffStatus,\s*exec_status: l\.execStatus\s*\}\)\);/g,
  `method: l.method || 'camera',
      staff_status: l.staffStatus,
      exec_status: l.execStatus,
      student_note: l.studentNote || null,
      audit_trail: l.auditTrail || null
    }));`
);

// Update syncChangesFromSupabase
content = content.replace(
  /await db\.checkInLogs\.put\(\{\s*id: newRec\.id,\s*studentId: newRec\.student_id,\s*activityId: newRec\.activity_id,\s*timestamp: newRec\.timestamp,\s*method: newRec\.method,\s*staffStatus: newRec\.staff_status,\s*execStatus: newRec\.exec_status\s*\}\);/g,
  `await db.checkInLogs.put({
            id: newRec.id,
            studentId: newRec.student_id,
            activityId: newRec.activity_id,
            timestamp: newRec.timestamp,
            method: newRec.method,
            staffStatus: newRec.staff_status,
            execStatus: newRec.exec_status,
            studentNote: newRec.student_note || undefined,
            auditTrail: newRec.audit_trail || undefined
          });`
);

fs.writeFileSync('src/services/supabaseApi.ts', content);
