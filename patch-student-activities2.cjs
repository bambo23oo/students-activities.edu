const fs = require('fs');

let content = fs.readFileSync('src/components/student/StudentActivitiesTab.tsx', 'utf8');

// Update card to be clickable if log exists
content = content.replace(
  /<div key=\{activity\.id\} className="bg-white border-2 border-black rounded-2xl p-4 sm:p-5 shadow-\[4px_4px_0px_0px_rgba\(0,0,0,1\)\] hover:translate-x-\[2px\] hover:translate-y-\[2px\] hover:shadow-\[2px_2px_0px_0px_rgba\(0,0,0,1\)\] transition-all flex flex-col h-full">/g,
  `<div 
                key={activity.id} 
                onClick={() => log && handleOpenActivity(activity, log)}
                className={\`bg-white border-2 border-black rounded-2xl p-4 sm:p-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all flex flex-col h-full \${log ? 'cursor-pointer hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' : 'opacity-80 grayscale-[20%]'}\`}
              >`
);

// Add Modal JSX
const modalJSX = `
      {/* Activity Details & Edit Modal */}
      {selectedActivityData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#F4EFE6] w-full max-w-2xl max-h-[90vh] overflow-y-auto border-4 border-black rounded-2xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col relative animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b-2 border-black bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3 pr-4">
                <div className="w-10 h-10 bg-emerald-400 flex items-center justify-center rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-black text-stone-900 leading-tight">{selectedActivityData.activity.name}</h2>
                  <p className="text-xs font-bold text-stone-500 mt-0.5">รายละเอียดและการบันทึกผล</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedActivityData(null)}
                className="p-2 bg-stone-100 hover:bg-rose-100 border-2 border-transparent hover:border-black rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0"
              >
                <X className="w-5 h-5 text-stone-900" />
              </button>
            </div>
            
            <div className="p-4 sm:p-6 space-y-6">
              {/* Activity Info */}
              <div className="bg-white border-2 border-black rounded-xl p-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] space-y-3">
                <div className="flex items-center gap-2 text-sm text-stone-700">
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span className="font-bold">วันที่:</span> {dayjs(selectedActivityData.activity.date).format('DD MMMM YYYY')}
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-700">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span className="font-bold">เวลา:</span> {selectedActivityData.activity.startTime} - {selectedActivityData.activity.endTime}
                </div>
                <div className="flex items-center gap-2 text-sm text-stone-700">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="font-bold">สถานที่:</span> {selectedActivityData.activity.location}
                </div>
              </div>

              {/* Student Note / Reflection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-black text-stone-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4" />
                    บันทึกผลการเข้าร่วมกิจกรรม
                  </label>
                  {!isEditingNote ? (
                    <button 
                      onClick={() => setIsEditingNote(true)}
                      className="text-xs font-bold text-[#EA580C] hover:underline flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" /> แก้ไขข้อมูล
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => {
                          setEditNote(selectedActivityData.log.studentNote || '');
                          setIsEditingNote(false);
                        }}
                        className="text-xs font-bold text-stone-500 hover:underline"
                      >
                        ยกเลิก
                      </button>
                      <button 
                        onClick={handleSaveNote}
                        className="text-xs font-bold bg-[#FACC15] text-black px-3 py-1 rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all"
                      >
                        บันทึก
                      </button>
                    </div>
                  )}
                </div>
                
                {isEditingNote ? (
                  <textarea
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="พิมพ์บันทึกสิ่งที่คุณได้รับจากกิจกรรมนี้..."
                    className="w-full min-h-[120px] p-3 text-sm font-medium border-2 border-black rounded-xl resize-y focus:outline-none focus:ring-2 focus:ring-[#FACC15] shadow-[inset_0px_2px_4px_rgba(0,0,0,0.05)]"
                  />
                ) : (
                  <div className="w-full min-h-[80px] p-4 text-sm bg-stone-50 border-2 border-stone-200 rounded-xl whitespace-pre-wrap text-stone-700">
                    {selectedActivityData.log.studentNote ? (
                      selectedActivityData.log.studentNote
                    ) : (
                      <span className="text-stone-400 italic">ยังไม่มีบันทึกข้อมูล (สามารถกดแก้ไขเพื่อเพิ่มข้อมูลได้)</span>
                    )}
                  </div>
                )}
              </div>

              {/* Audit Log / History */}
              <div className="space-y-3 pt-4 border-t-2 border-stone-200">
                <h3 className="text-sm font-black text-stone-900 flex items-center gap-1.5">
                  <History className="w-4 h-4" />
                  ประวัติการเข้าถึงข้อมูล (Audit Log)
                </h3>
                <div className="bg-white border-2 border-stone-300 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-100 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 font-bold text-stone-600 border-b-2 border-stone-300">วัน-เวลา</th>
                        <th className="px-3 py-2 font-bold text-stone-600 border-b-2 border-stone-300">การกระทำ</th>
                        <th className="px-3 py-2 font-bold text-stone-600 border-b-2 border-stone-300">รายละเอียด</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {(selectedActivityData.log.auditTrail || []).slice().reverse().map((audit, idx) => (
                        <tr key={idx} className="hover:bg-stone-50">
                          <td className="px-3 py-2 text-stone-500 font-mono">{dayjs(audit.timestamp).format('DD/MM/YYYY HH:mm:ss')}</td>
                          <td className="px-3 py-2">
                            <span className={\`px-1.5 py-0.5 rounded-md font-bold text-[10px] uppercase \${audit.action === 'edit' ? 'bg-[#FACC15]/20 text-amber-700 border border-amber-300' : 'bg-blue-100 text-blue-700 border border-blue-300'}\`}>
                              {audit.action}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-stone-700">{audit.details}</td>
                        </tr>
                      ))}
                      {(!selectedActivityData.log.auditTrail || selectedActivityData.log.auditTrail.length === 0) && (
                        <tr>
                          <td colSpan={3} className="px-3 py-4 text-center text-stone-400 italic">ไม่มีประวัติ</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
};
`

content = content.replace(
  /    <\/div>\n  \);\n};\n$/,
  modalJSX
);

fs.writeFileSync('src/components/student/StudentActivitiesTab.tsx', content);
