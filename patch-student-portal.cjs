const fs = require('fs');

let content = fs.readFileSync('src/components/StudentPortal.tsx', 'utf8');

// 1. Change navTab type
content = content.replace(
  "export type StudentNavTab = 'overview' | 'calendar' | 'students' | 'attendance' | 'events' | 'messages' | 'settings';",
  "export type StudentNavTab = 'overview' | 'activities' | 'messages' | 'settings';"
);

// 2. Remove old imports
content = content.replace("import { StudentCalendarTab } from './student/StudentCalendarTab';", "");
content = content.replace("import { StudentProfileTab } from './student/StudentProfileTab';", "");
content = content.replace("import { StudentAttendanceTab } from './student/StudentAttendanceTab';", "");
content = content.replace("import { StudentEventsTab } from './student/StudentEventsTab';", "");

// 3. Add new import
content = content.replace(
  "import { StudentOverviewTab } from './student/StudentOverviewTab';",
  "import { StudentOverviewTab } from './student/StudentOverviewTab';\nimport { StudentActivitiesTab } from './student/StudentActivitiesTab';\nimport { StudentProfileTab } from './student/StudentProfileTab';"
);

// 4. Update getTabTitle function
content = content.replace(
  /switch \(tab\) \{[\s\S]*?default: return 'STUDENT OVERVIEW';[\s\S]*?\}/,
  `switch (tab) {
      case 'overview': return 'STUDENT OVERVIEW';
      case 'activities': return 'MY ACTIVITIES';
      case 'messages': return 'NOTIFICATIONS & MESSAGES';
      case 'settings': return 'SYSTEM SETTINGS';
      default: return 'STUDENT OVERVIEW';
    }`
);

// 5. Update Desktop Left Nav Rail buttons
// We will replace the whole nav block to be simpler
content = content.replace(
  /<nav className="flex flex-col items-center gap-2\.5 w-full px-2">[\s\S]*?<\/nav>/,
  `<nav className="flex flex-col items-center gap-2.5 w-full px-2">
            
            {/* OVERVIEW */}
            <button
              onClick={() => setNavTab('overview')}
              className={\`flex flex-col items-center justify-center p-2 rounded-lg transition-all group w-full \${
                navTab === 'overview' ? 'text-[#FACC15]' : 'text-stone-400 hover:text-white'
              }\`}
              title="ภาพรวมข้อมูลนักศึกษา"
            >
              <div className={\`p-1.5 rounded-md border-2 transition-all \${
                navTab === 'overview'
                  ? 'border-[#FACC15] bg-[#FACC15]/10 shadow-[2px_2px_0px_0px_rgba(250,204,21,0.5)]'
                  : 'border-transparent group-hover:border-stone-600'
              }\`}>
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-black uppercase tracking-wider mt-1">
                OVERVIEW
              </span>
            </button>

            {/* ACTIVITIES */}
            <button
              onClick={() => setNavTab('activities')}
              className={\`flex flex-col items-center justify-center p-2 rounded-lg transition-all group w-full \${
                navTab === 'activities' ? 'text-[#FACC15]' : 'text-stone-400 hover:text-white'
              }\`}
              title="ตารางกิจกรรม"
            >
              <div className={\`p-1.5 rounded-md border-2 transition-all \${
                navTab === 'activities'
                  ? 'border-[#FACC15] bg-[#FACC15]/10 shadow-[2px_2px_0px_0px_rgba(250,204,21,0.5)]'
                  : 'border-transparent group-hover:border-stone-600'
              }\`}>
                <CalendarDays className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider mt-1">
                ACTIVITY
              </span>
            </button>

            {/* MESSAGES */}
            <button
              onClick={() => setNavTab('messages')}
              className={\`flex flex-col items-center justify-center p-2 rounded-lg transition-all group w-full \${
                navTab === 'messages' ? 'text-[#FACC15]' : 'text-stone-400 hover:text-white'
              }\`}
              title="ประกาศและข้อความ"
            >
              <div className={\`p-1.5 rounded-md border-2 transition-all \${
                navTab === 'messages'
                  ? 'border-[#FACC15] bg-[#FACC15]/10 shadow-[2px_2px_0px_0px_rgba(250,204,21,0.5)]'
                  : 'border-transparent group-hover:border-stone-600'
              }\`}>
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider mt-1">
                MESSAGES
              </span>
            </button>

          </nav>`
);

// 6. Update Profile Dropdown inside header
content = content.replace(
  /<button\s+onClick=\{\(\) => \{ setNavTab\('students'\); setShowUserDropdown\(false\); \}\}[\s\S]*?<\/button>/,
  `<button
                      onClick={() => { setShowStudentProfileModal(true); setShowUserDropdown(false); }}
                      className="w-full text-left px-3 py-1.5 text-xs font-bold text-stone-800 hover:bg-stone-100 flex items-center gap-2"
                    >
                      <Users className="w-3.5 h-3.5 text-stone-600" />
                      <span>ข้อมูลนักศึกษา & โปรไฟล์</span>
                    </button>`
);

// We need to add state for showStudentProfileModal
content = content.replace(
  "const [showUserDropdown, setShowUserDropdown] = useState(false);",
  "const [showUserDropdown, setShowUserDropdown] = useState(false);\n  const [showStudentProfileModal, setShowStudentProfileModal] = useState(false);"
);

// 7. Update rendering components
content = content.replace(
  /\{navTab === 'calendar' && \([\s\S]*?\{navTab === 'settings'/m,
  `{navTab === 'activities' && (
            <StudentActivitiesTab
              allActivities={allActivities}
              logs={logs}
            />
          )}

          {navTab === 'settings'`
);

// Also we need to render the profile modal
content = content.replace(
  "{/* Toast Feedback */}",
  `{/* Profile Modal */}
      {showStudentProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#F4EFE6] w-full max-w-4xl max-h-[90vh] overflow-y-auto border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b-2 border-black bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#EA580C] flex items-center justify-center rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                  <Users className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-stone-900 uppercase tracking-wider">Student Profile</h2>
                  <p className="text-xs font-bold text-stone-500">ข้อมูลนักศึกษาและบัตรดิจิทัล</p>
                </div>
              </div>
              <button 
                onClick={() => setShowStudentProfileModal(false)}
                className="p-2 bg-stone-100 hover:bg-rose-100 border-2 border-transparent hover:border-black rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                <X className="w-5 h-5 text-stone-900" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6">
              <StudentProfileTab
                student={studentProfile}
                studentId={currentStudentId}
                studentName={effectiveStudentName}
                studentEmail={studentProfile?.email || studentEmail}
                logs={logs}
                onUpdateProfileImage={handleUpdateProfileImage}
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback */}`
);

// 8. Update mobile bottom navigation
content = content.replace(
  /<nav className="md:hidden fixed bottom-0 left-0 right-0 bg=\[\#18181B\] border-t-2 border-black z-30 flex items-center justify-around py-1\.5 px-2">[\s\S]*?<\/nav>/,
  `<nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#18181B] border-t-2 border-black z-30 flex items-center justify-around py-1.5 px-2">
        <button
          onClick={() => setNavTab('overview')}
          className={\`flex flex-col items-center justify-center p-1.5 min-w-[56px] min-h-[44px] \${
            navTab === 'overview' ? 'text-[#FACC15]' : 'text-stone-400'
          }\`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase mt-0.5">ภาพรวม</span>
        </button>

        <button
          onClick={() => setNavTab('activities')}
          className={\`flex flex-col items-center justify-center p-1.5 min-w-[56px] min-h-[44px] \${
            navTab === 'activities' ? 'text-[#FACC15]' : 'text-stone-400'
          }\`}
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase mt-0.5">กิจกรรม</span>
        </button>

        <button
          onClick={() => setShowStudentProfileModal(true)}
          className={\`flex flex-col items-center justify-center p-1.5 min-w-[56px] min-h-[44px] \${
            showStudentProfileModal ? 'text-[#FACC15]' : 'text-stone-400'
          }\`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase mt-0.5">โปรไฟล์</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMobileMoreMenu(!showMobileMoreMenu)}
            className={\`flex flex-col items-center justify-center p-1.5 min-w-[56px] min-h-[44px] \${
              showMobileMoreMenu ? 'text-[#FACC15]' : 'text-stone-400'
            }\`}
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase mt-0.5">เพิ่มเติม</span>
          </button>

          {showMobileMoreMenu && (
            <div className="absolute bottom-full right-0 mb-2 w-48 bg-[#18181B] border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] py-2 z-50 text-white">
              <button
                onClick={() => { setNavTab('messages'); setShowMobileMoreMenu(false); }}
                className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-stone-800 flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>ประกาศและข้อความ</span>
              </button>
              <button
                onClick={() => { setNavTab('settings'); setShowMobileMoreMenu(false); }}
                className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-stone-800 flex items-center gap-2"
              >
                <Settings className="w-4 h-4 text-amber-400" />
                <span>การตั้งค่าระบบ</span>
              </button>
            </div>
          )}
        </div>
      </nav>`
);


fs.writeFileSync('src/components/StudentPortal.tsx', content);
