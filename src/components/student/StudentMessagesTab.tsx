import React, { useState } from 'react';
import { 
  MessageSquare, 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Calendar, 
  Clock,
  Sparkles
} from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  category: 'approval' | 'reminder' | 'announcement';
  timestamp: string;
  isRead: boolean;
}

const INITIAL_MESSAGES: NotificationItem[] = [
  {
    id: 'msg-1',
    title: 'ผลการประเมิน K-P-A กิจกรรมปฐมนิเทศ ได้รับการอนุมัติแล้ว',
    body: 'อาจารย์ผู้รับผิดชอบได้ตรวจสอบและอนุมัติผลสะท้อนคิดการเรียนรู้ 5 ด้าน (K-P-A-Moral) ของคุณเรียบร้อยแล้ว เพิ่มกิจกรรมสะสม +1 กิจกรรม',
    category: 'approval',
    timestamp: '2026-08-21T10:00:00Z',
    isRead: false
  },
  {
    id: 'msg-2',
    title: 'แจ้งเตือน: ส่งรายงานผลสะท้อนคิด K-P-A กิจกรรมจิตอาสาพัฒนาวัดพระธาตุพนม',
    body: 'คุณได้เช็คอินกิจกรรมแล้ว กรุณากรอกแบบสะท้อนคิด K-P-A ให้ครบทั้ง 5 องค์ประกอบภายใน 7 วัน เพื่อให้อาจารย์ประเมินผล',
    category: 'reminder',
    timestamp: '2026-08-26T08:30:00Z',
    isRead: false
  },
  {
    id: 'msg-3',
    title: 'เปิดรับสมัครกิจกรรมอบรม AI & Generative Tools สำหรับนักศึกษา',
    body: 'ฝ่ายพัฒนานักศึกษา คณะครุศาสตร์ ขอเชิญชวนนักศึกษาเข้าร่วมอบรม ณ ห้องปฏิบัติการคอมพิวเตอร์ 402 วันที่ 28-29 สิงหาคมนี้',
    category: 'announcement',
    timestamp: '2026-08-24T14:15:00Z',
    isRead: true
  },
  {
    id: 'msg-4',
    title: 'ระบบเชื่อมต่อฐานข้อมูล Supabase และอัปเดตแบบเรียลไทม์พร้อมใช้งาน',
    body: 'ข้อมูลการเช็คอินและการส่งรายงานสะท้อนคิดของนักศึกษาจะถูกบันทึกและซิงค์อย่างปลอดภัยไปยังระบบคลาวด์ส่วนกลาง',
    category: 'announcement',
    timestamp: '2026-08-15T09:00:00Z',
    isRead: true
  }
];

export const StudentMessagesTab: React.FC = () => {
  const [messages, setMessages] = useState<NotificationItem[]>(INITIAL_MESSAGES);

  const markAllAsRead = () => {
    setMessages(prev => prev.map(m => ({ ...m, isRead: true })));
  };

  const toggleRead = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, isRead: !m.isRead } : m));
  };

  const unreadCount = messages.filter(m => !m.isRead).length;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-[#F7F4EB] border-2 border-[#18181B] p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-[#18181B] flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-[#EA580C]" />
            <span>ประกาศและข้อความแจ้งเตือน (NOTIFICATIONS)</span>
          </h2>
          <p className="text-xs text-stone-600 font-bold mt-0.5">
            กล่องข้อความจากฝ่ายพัฒนานักศึกษาและระบบบันทึกกิจกรรมประสบการณ์วิชาชีพครู คณะครุศาสตร์
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-3 py-1.5 bg-white border-2 border-black font-black uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-stone-50 self-start sm:self-auto"
          >
            ทำเครื่องหมายว่าอ่านทั้งหมด ({unreadCount})
          </button>
        )}
      </div>

      {/* Message List */}
      <div className="space-y-3">
        {messages.map((msg) => {
          const date = new Date(msg.timestamp);
          const formatted = date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });

          return (
            <div
              key={msg.id}
              onClick={() => toggleRead(msg.id)}
              className={`p-4 border-2 border-[#18181B] cursor-pointer transition-all ${
                !msg.isRead 
                  ? 'bg-amber-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' 
                  : 'bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] opacity-90'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="pt-0.5 shrink-0">
                  {msg.category === 'approval' ? (
                    <div className="w-9 h-9 bg-emerald-100 border-2 border-black flex items-center justify-center text-emerald-800">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : msg.category === 'reminder' ? (
                    <div className="w-9 h-9 bg-amber-200 border-2 border-black flex items-center justify-center text-amber-900">
                      <Clock className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 bg-blue-100 border-2 border-black flex items-center justify-center text-blue-900">
                      <Info className="w-5 h-5" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-xs sm:text-sm font-black uppercase ${!msg.isRead ? 'text-stone-900' : 'text-stone-700'}`}>
                        {msg.title}
                      </h3>
                      {!msg.isRead && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] font-mono text-stone-500 font-bold shrink-0">
                      {formatted}
                    </span>
                  </div>

                  <p className="text-xs text-stone-700 font-medium mt-1 leading-relaxed">
                    {msg.body}
                  </p>

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-stone-200 text-[10px] font-bold text-stone-500">
                    <span>ผู้ส่ง: งานพัฒนานักศึกษา คณะครุศาสตร์</span>
                    <span>•</span>
                    <span>{msg.isRead ? 'คลิกเพื่อทำเครื่องหมายว่ายังไม่ได้อ่าน' : 'คลิกเพื่อทำเครื่องหมายว่าอ่านแล้ว'}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
