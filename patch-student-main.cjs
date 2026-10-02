const fs = require('fs');

let content = fs.readFileSync('src/components/StudentPortal.tsx', 'utf8');

content = content.replace(
  /<div className="flex-1 flex flex-col h-screen w-full min-w-0">/g,
  '<div className="flex-1 flex flex-col h-screen w-full min-w-0 overflow-x-hidden">'
);

fs.writeFileSync('src/components/StudentPortal.tsx', content);
