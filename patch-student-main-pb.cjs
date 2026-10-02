const fs = require('fs');

let content = fs.readFileSync('src/components/StudentPortal.tsx', 'utf8');

content = content.replace(
  /<main className="p-3 sm:p-6 max-w-\[1400px\] w-full mx-auto">/g,
  '<main className="p-3 sm:p-6 pb-24 md:pb-6 max-w-[1400px] w-full mx-auto">'
);

fs.writeFileSync('src/components/StudentPortal.tsx', content);
