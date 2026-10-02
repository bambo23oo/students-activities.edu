const fs = require('fs');
let code = fs.readFileSync('src/components/admin/ExecutiveDashboardOverview.tsx', 'utf8');
code = code.replace(
`    const checkIns = await db.checkInLogs.toArray();
    const refs = await db.reflections.toArray();
    const approvedRefs = refs.filter(r => r.status === 'approved');
    const calculatedHours = approvedRefs.length * 8 * 14 + 12867;

    const pendingRefs = refs.filter(r => r.status === 'pending_step1' || r.status === 'pending_step2');`,
`    const checkIns = await db.checkInLogs.toArray();
    const approvedLogs = checkIns.filter(l => l.execStatus === 'approved');
    const calculatedHours = approvedLogs.length * 8 * 14 + 12867;

    const pendingRefs = checkIns.filter(l => l.execStatus === 'pending' && l.staffStatus === 'verified');`
);
fs.writeFileSync('src/components/admin/ExecutiveDashboardOverview.tsx', code);
