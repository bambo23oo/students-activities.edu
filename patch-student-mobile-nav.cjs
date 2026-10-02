const fs = require('fs');

let content = fs.readFileSync('src/components/StudentPortal.tsx', 'utf8');

content = content.replace(
  /navTab === 'calendar' \? 'text-\[\#FACC15\]' : 'text-stone-400'/g,
  "navTab === 'activities' ? 'text-[#FACC15]' : 'text-stone-400'"
);
content = content.replace(
  /onClick=\{\(\) => setNavTab\('calendar'\)\}/g,
  "onClick={() => setNavTab('activities')}"
);

content = content.replace(
  /<CalendarDays className="w-5 h-5" \/>\s*<span className="text-\[10px\] font-bold uppercase mt-0\.5">ปฏิทิน<\/span>/g,
  `<CalendarDays className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase mt-0.5">กิจกรรม</span>`
);

content = content.replace(
  /<button\s*onClick=\{\(\) => setNavTab\('attendance'\)\}\s*className=\{`flex flex-col items-center justify-center p-1\.5 min-w-\[56px\] min-h-\[44px\] \$\{\s*navTab === 'attendance' \? 'text-\[\#FACC15\]' : 'text-stone-400'\s*\}\`\}\s*>\s*<CheckSquare className="w-5 h-5" \/>\s*<span className="text-\[10px\] font-bold uppercase mt-0\.5">เช็คอิน<\/span>\s*<\/button>/g,
  `<button
          onClick={() => setNavTab('messages')}
          className={\`flex flex-col items-center justify-center p-1.5 min-w-[56px] min-h-[44px] \${
            navTab === 'messages' ? 'text-[#FACC15]' : 'text-stone-400'
          }\`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] font-bold uppercase mt-0.5">ข้อความ</span>
        </button>`
);

content = content.replace(
  /<button\s*onClick=\{\(\) => \{\s*setNavTab\('students'\);\s*setShowMobileMoreMenu\(false\);\s*\}\}.*?<\/button>/s,
  `<button
                onClick={() => { setShowStudentProfileModal(true); setShowMobileMoreMenu(false); }}
                className="w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-stone-800 flex items-center gap-2"
              >
                <Users className="w-4 h-4 text-amber-400" />
                <span>บัตรนักศึกษา & ประวัติ</span>
              </button>`
);

content = content.replace(
  /<button\s*onClick=\{\(\) => \{\s*setNavTab\('events'\);\s*setShowMobileMoreMenu\(false\);\s*\}\}.*?<\/button>/s,
  ""
);

content = content.replace(
  /<button\s*onClick=\{\(\) => \{\s*setNavTab\('messages'\);\s*setShowMobileMoreMenu\(false\);\s*\}\}.*?<\/button>/s,
  ""
);

fs.writeFileSync('src/components/StudentPortal.tsx', content);
