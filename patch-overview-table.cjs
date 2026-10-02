const fs = require('fs');

let content = fs.readFileSync('src/components/student/StudentOverviewTab.tsx', 'utf8');

const tableBlockStart = '<table className="w-full text-left text-xs border-collapse min-w-[550px]">';
const newTableBlockStart = `
              {/* Mobile/Tablet Card View (Hidden on larger screens) */}
              <div className="md:hidden space-y-3">
                {displayedLogs.map((log) => {
                  const hasReflection = !!log.reflection;
                  const isApproved = log.reflection?.status === 'approved';
                  const isInReview = log.reflection && (log.reflection.status === 'pending_step1' || log.reflection.status === 'pending_step2');
                  const activityName = log.activity?.name || \`กิจกรรมรหัส \${log.activityId}\`;
                  const locationName = log.activity?.location || 'คณะครุศาสตร์ ม.นครพนม';
                  const dateStr = log.activity?.date 
                    ? new Date(log.activity.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
                    : new Date(log.timestamp).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
                  const timeStr = new Date(log.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <div key={log.id} className="border-2 border-black bg-white p-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <div className="font-black text-sm text-[#18181B] leading-tight mb-1">{activityName}</div>
                          <div className="text-[10px] font-bold text-stone-500">{dateStr} • {timeStr} น.</div>
                        </div>
                        <div className="font-black text-lg text-[#EA580C] shrink-0">{HOURS_PER_ACTIVITY} ชม.</div>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-stone-600 mb-3">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{locationName}</span>
                      </div>
                      <div className="pt-2 border-t-2 border-stone-100 flex items-center justify-between">
                        <div className="text-[10px] font-bold uppercase">
                          {isApproved ? (
                            <span className="text-[#15803D] flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> อนุมัติแล้ว</span>
                          ) : isInReview ? (
                            <span className="text-[#EAB308] flex items-center gap-1"><Clock className="w-3 h-3" /> รอตรวจ</span>
                          ) : (
                            <span className="text-stone-500">รอส่ง K-P-A</span>
                          )}
                        </div>
                        {!isApproved && !isInReview && (
                          <button
                            onClick={() => onOpenSubmitModal(log.id)}
                            className="px-2.5 py-1 bg-[#2563EB] text-white border-2 border-black text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1"
                          >
                            <Send className="w-3 h-3" />
                            ส่ง K-P-A
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View */}
              <table className="hidden md:table w-full text-left text-xs border-collapse">`;

content = content.replace(tableBlockStart, newTableBlockStart);
fs.writeFileSync('src/components/student/StudentOverviewTab.tsx', content);
