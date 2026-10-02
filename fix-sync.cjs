const fs = require('fs');
let code = fs.readFileSync('src/services/supabaseApi.ts', 'utf8');

code = code.replace(
`    const mappedLogs = data.checkInLogs.map(l => ({
      id: l.id,
      student_id: l.studentId,
      activity_id: l.activityId,
      timestamp: l.timestamp,
      method: l.method || 'camera',
      staffStatus: l.staff_status || 'pending', execStatus: l.exec_status || 'pending'
    }));`,
`    const mappedLogs = data.checkInLogs.map(l => ({
      id: l.id,
      student_id: l.studentId,
      activity_id: l.activityId,
      timestamp: l.timestamp,
      method: l.method || 'camera',
      staff_status: l.staffStatus,
      exec_status: l.execStatus
    }));`);

fs.writeFileSync('src/services/supabaseApi.ts', code);
