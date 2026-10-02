const fs = require('fs');
let content = fs.readFileSync('src/components/StaffScanner.tsx', 'utf8');

const target = `                {scanResult.status === 'success' ? (
                  <CheckCircle className="w-7 h-7 shrink-0 text-white" />
                ) : scanResult.status === 'warning' ? (
                  <AlertTriangle className="w-7 h-7 shrink-0 text-white" />
                ) : (
                  <XCircle className="w-7 h-7 shrink-0 text-white" />
                )}
                <div className="text-left min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold truncate">{scanResult.message}</span>
                    {scanResult.cardSource && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-semibold shrink-0">
                        {scanResult.cardSource === 'physical' ? '💳 บัตรนักศึกษาจริง' : 
                         scanResult.cardSource === 'digital' ? '📱 บัตรดิจิทัล' : '⌨️ คีย์ตรง'}
                      </span>
                    )}
                    {scanResult.wasConvertedFromThai && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/30 text-amber-200 font-semibold shrink-0">
                        🔄 แก้ไขแป้นไทยอัตโนมัติ
                      </span>
                    )}
                  </div>
                  {scanResult.student && (
                    <div className="text-[10px] text-white/90 truncate mt-0.5">
                      {scanResult.student.major} • {scanResult.student.faculty}
                    </div>
                  )}
                </div>
              </div>
            )}`;

const replacement = `                {scanResult.status === 'success' ? (
                  <CheckCircle className="w-16 h-16 shrink-0" />
                ) : scanResult.status === 'warning' ? (
                  <AlertTriangle className="w-16 h-16 shrink-0" />
                ) : (
                  <XCircle className="w-16 h-16 shrink-0" />
                )}
                <div className="flex flex-col items-center gap-3">
                  <span className="text-lg font-black leading-tight">{scanResult.message}</span>
                  
                  {scanResult.student && (
                    <div className="text-sm font-bold opacity-90">
                      {scanResult.student.major} • {scanResult.student.faculty}
                    </div>
                  )}
                  
                  <div className="flex flex-wrap justify-center gap-2 mt-2">
                    {scanResult.cardSource && (
                      <span className="text-xs px-3 py-1 rounded-full bg-black/10 font-bold border-2 border-black/20 shadow-[1px_1px_0px_0px_rgba(0,0,0,0.2)]">
                        {scanResult.cardSource === 'physical' ? '💳 บัตรนักศึกษาจริง' : 
                         scanResult.cardSource === 'digital' ? '📱 บัตรดิจิทัล' : '⌨️ คีย์ตรง'}
                      </span>
                    )}
                    {scanResult.wasConvertedFromThai && (
                      <span className="text-xs px-3 py-1 rounded-full bg-black text-amber-300 font-bold border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                        🔄 แก้ไขแป้นไทยอัตโนมัติ
                      </span>
                    )}
                  </div>
                </div>
              </div>
              </div>
            )}`;

if (content.includes(target)) {
  content = content.replace(target, replacement);
  fs.writeFileSync('src/components/StaffScanner.tsx', content);
  console.log('Target 2 replaced successfully');
} else {
  console.log('Target 2 not found');
}
