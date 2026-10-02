const fs = require('fs');
let content = fs.readFileSync('src/components/StaffScanner.tsx', 'utf8');

const target = `            {/* Live Scan Notification Toast Banner */}
            {scanResult && (
              <div className={\`absolute inset-x-4 top-4 p-4 rounded-xl border-2 border-[#18181B] shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200 z-30 \${
                scanResult.status === 'success' 
                  ? 'bg-emerald-500 text-white' 
                  : scanResult.status === 'warning'
                  ? 'bg-amber-500 text-white'
                  : 'bg-rose-600 text-white'
              }\`}>`;

const replacement = `            {/* Live Scan Notification Popup Box */}
            {scanResult && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
                <div className={\`w-full max-w-sm p-6 rounded-2xl border-4 border-[#18181B] shadow-[8px_8px_0px_0px_rgba(24,24,27,1)] flex flex-col items-center text-center gap-4 \${
                  scanResult.status === 'success' 
                    ? 'bg-emerald-400 text-black' 
                    : scanResult.status === 'warning'
                    ? 'bg-amber-400 text-black'
                    : 'bg-rose-500 text-white'
                }\`}>`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/StaffScanner.tsx', content);
  console.log('Target replaced successfully');
} else {
  console.log('Target not found');
}
