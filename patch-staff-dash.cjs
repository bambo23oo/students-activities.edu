const fs = require('fs');
let code = fs.readFileSync('src/components/StaffDashboardView.tsx', 'utf8');

code = code.replace(
  `        setStats({
          totalCheckIns: Math.max(checkInsCount, 4000),
          pendingReview: 3430,
          approved: 570,
          activeStudents: Math.max(studentsCount, 1250)
        });`,
  `        const allLogs = await db.checkInLogs.toArray();
        const pendingCount = allLogs.filter(l => l.staffStatus === 'verified' && l.execStatus === 'pending').length;
        const approvedCount = allLogs.filter(l => l.execStatus === 'approved').length;

        setStats({
          totalCheckIns: checkInsCount > 0 ? checkInsCount : 4000,
          pendingReview: pendingCount > 0 ? pendingCount : 3430,
          approved: approvedCount > 0 ? approvedCount : 570,
          activeStudents: studentsCount > 0 ? studentsCount : 1250
        });`
);

fs.writeFileSync('src/components/StaffDashboardView.tsx', code);
