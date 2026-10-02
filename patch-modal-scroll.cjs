const fs = require('fs');

let content = fs.readFileSync('src/components/student/StudentPassModal.tsx', 'utf8');

content = content.replace(
  /className="fixed inset-0 bg-stone-900\/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"/g,
  'className="fixed inset-0 bg-stone-900/80 backdrop-blur-xs z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto"'
);

content = content.replace(
  /overflow-hidden my-auto animate-in/g,
  'overflow-hidden my-8 sm:my-auto shrink-0 animate-in'
);

fs.writeFileSync('src/components/student/StudentPassModal.tsx', content);
