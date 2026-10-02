import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Activity } from '../../types';
import { NPULogo } from '../NPULogo';
import { 
  Printer, 
  Download, 
  X, 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  Sparkles,
  QrCode,
  CheckCircle2
} from 'lucide-react';

interface ActivityQrPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  activity: Activity | null;
}

export const ActivityQrPosterModal: React.FC<ActivityQrPosterModalProps> = ({
  isOpen,
  onClose,
  activity
}) => {
  const posterRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !activity) return null;

  // The payload format for Self-Check-in
  // Encodes activity ID and timestamp validation
  const qrPayload = JSON.stringify({
    type: 'NPU_EVENT_CHECKIN',
    activityId: activity.id,
    activityName: activity.name,
    timestamp: Date.now()
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    const svgElement = posterRef.current?.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 600;
    canvas.height = 600;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 50, 50, 500, 500);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `QR_${activity.id}_${activity.name.slice(0, 20)}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full border-2 border-[#18181B] shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 bg-[#FAF7F0] border-b-2 border-[#18181B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-[#EA580C]" />
            <h3 className="font-black text-sm text-[#18181B]">
              โปสเตอร์ QR Code ประจำกิจกรรม (Self-Check-in Poster)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Poster Area */}
        <div className="p-6 overflow-y-auto bg-stone-50 flex flex-col items-center">
          <div 
            ref={posterRef}
            className="w-full max-w-md bg-white border-2 border-[#18181B] rounded-2xl p-6 text-center shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] space-y-4 print:border-none print:shadow-none"
          >
            {/* University & Faculty Header */}
            <div className="flex items-center justify-center gap-3 pb-3 border-b border-stone-200">
              <NPULogo size="sm" className="w-9 h-12 shrink-0 drop-shadow-xs" />
              <div className="text-left">
                <p className="text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  มหาวิทยาลัยนครพนม
                </p>
                <h4 className="text-xs font-black text-[#5C2A0D]">
                  คณะครุศาสตร์ • คณะวิทยาศาสตร์
                </h4>
              </div>
            </div>

            {/* Event Name */}
            <div>
              <span className="inline-block px-2.5 py-1 bg-amber-100 border border-amber-300 rounded-full text-[10px] font-bold text-amber-900 mb-2">
                จุดสแกนเช็คอินด้วยตนเอง (Self-Check-in Station)
              </span>
              <h2 className="text-base sm:text-lg font-black text-stone-900 leading-snug">
                {activity.name}
              </h2>
            </div>

            {/* Event Details */}
            <div className="grid grid-cols-2 gap-2 text-left bg-stone-50 p-3 rounded-xl border border-stone-200 text-xs">
              <div className="flex items-center gap-1.5 text-stone-700">
                <Calendar className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                <span className="font-bold truncate">{activity.date}</span>
              </div>
              <div className="flex items-center gap-1.5 text-stone-700">
                <Clock className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                <span className="font-bold">{activity.hours || 3} ชั่วโมงกิจกรรม</span>
              </div>
              <div className="flex items-center gap-1.5 text-stone-700 col-span-2">
                <MapPin className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                <span className="font-medium truncate">{activity.location}</span>
              </div>
              {activity.capacity && (
                <div className="flex items-center gap-1.5 text-stone-700 col-span-2">
                  <Users className="w-3.5 h-3.5 text-[#EA580C] shrink-0" />
                  <span className="font-bold">จำกัดผู้เข้าร่วม: {activity.capacity} คน</span>
                </div>
              )}
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-4 bg-white border-2 border-stone-900 rounded-2xl">
              <QRCodeSVG 
                value={qrPayload}
                size={220}
                level="H"
                includeMargin={true}
              />
              <p className="text-[11px] font-bold text-stone-500 mt-2">
                รหัสกิจกรรม: <span className="font-mono text-stone-900">{activity.id}</span>
              </p>
            </div>

            {/* Instruction Callout */}
            <div className="bg-[#FAF7F0] border-2 border-[#18181B] rounded-xl p-3 text-xs text-stone-800 space-y-1">
              <p className="font-black text-[#EA580C] flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>ขั้นตอนการเช็คอิน</span>
              </p>
              <ol className="text-left text-[11px] font-medium space-y-0.5 list-decimal pl-4 text-stone-700">
                <li>เปิดกล้องมือถือหรือเข้าเมนูสแกนในระบบนักศึกษา</li>
                <li>ส่องมาที่ QR Code นี้เพื่อเช็คอินอัตโนมัติ</li>
                <li>ตรวจสอบสถานะเช็คอินบนหน้าจอโทรศัพท์ของตนเอง</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-white border-t-2 border-[#18181B] flex items-center justify-between gap-3">
          <p className="text-xs text-stone-500 font-medium hidden sm:block">
            พรินต์ขนาด A4 หรือบันทึกภาพเพื่อแปะหน้างาน
          </p>

          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-stone-200 border-2 border-[#18181B] rounded-xl text-xs font-bold text-stone-800 transition-colors shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลดภาพ QR</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#EA580C] hover:bg-[#C2410C] text-white border-2 border-[#18181B] rounded-xl text-xs font-bold transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์โปสเตอร์ (Print)</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
