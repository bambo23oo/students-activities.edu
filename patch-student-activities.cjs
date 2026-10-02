const fs = require('fs');

let content = fs.readFileSync('src/components/student/StudentActivitiesTab.tsx', 'utf8');

// Add new imports
if (!content.includes('import { db }')) {
  content = content.replace(
    "import { Search, MapPin, Calendar, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';",
    "import { Search, MapPin, Calendar, Clock, CheckCircle2, XCircle, AlertCircle, Edit, FileText, History, X } from 'lucide-react';\nimport { db } from '../../db/db';"
  );
}

// Update component state
if (!content.includes('selectedActivityData')) {
  content = content.replace(
    "const [searchQuery, setSearchQuery] = useState('');",
    `const [searchQuery, setSearchQuery] = useState('');
  const [selectedActivityData, setSelectedActivityData] = useState<{ activity: Activity, log: CheckInLog } | null>(null);
  const [editNote, setEditNote] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [localLogs, setLocalLogs] = useState<CheckInLog[]>([]);

  // Update local logs when props.logs changes
  React.useEffect(() => {
    setLocalLogs(logs);
  }, [logs]);

  const handleOpenActivity = async (activity: Activity, log: CheckInLog) => {
    let currentLog = await db.checkInLogs.get(log.id);
    if (!currentLog) currentLog = log;
    
    // Log 'view' action
    const newTrail = [...(currentLog.auditTrail || [])];
    newTrail.push({
      action: 'view',
      timestamp: new Date().toISOString(),
      details: 'เข้าดูรายละเอียดกิจกรรม'
    });
    
    const updatedLog = { ...currentLog, auditTrail: newTrail };
    await db.checkInLogs.put(updatedLog);
    
    // Update local state
    setLocalLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l));
    setSelectedActivityData({ activity, log: updatedLog });
    setEditNote(updatedLog.studentNote || '');
    setIsEditingNote(false);
  };

  const handleSaveNote = async () => {
    if (!selectedActivityData) return;
    const { log } = selectedActivityData;
    
    let currentLog = await db.checkInLogs.get(log.id);
    if (!currentLog) currentLog = log;

    const newTrail = [...(currentLog.auditTrail || [])];
    newTrail.push({
      action: 'edit',
      timestamp: new Date().toISOString(),
      details: 'แก้ไขบันทึกผลการเข้าร่วมกิจกรรม'
    });
    
    const updatedLog = { ...currentLog, studentNote: editNote, auditTrail: newTrail };
    await db.checkInLogs.put(updatedLog);
    
    setLocalLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l));
    setSelectedActivityData({ ...selectedActivityData, log: updatedLog });
    setIsEditingNote(false);
  };`
  );
}

// Use localLogs instead of logs for finding log
content = content.replace(
  /const log = logs\.find\(l => l\.activityId === act\.id\);/g,
  "const log = localLogs.find(l => l.activityId === act.id);"
);
content = content.replace(
  /\[allActivities, logs, filterMode, searchQuery\]/g,
  "[allActivities, localLogs, filterMode, searchQuery]"
);


fs.writeFileSync('src/components/student/StudentActivitiesTab.tsx', content);
