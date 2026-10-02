import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  X, 
  Printer, 
  Maximize2, 
  Minimize2, 
  Copy, 
  Check, 
  Sparkles, 
  Smartphone, 
  Zap, 
  CheckCircle2, 
  AlertTriangle,
  QrCode
} from 'lucide-react';
import { NPULogo } from './NPULogo';

interface StandeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPreRegister?: () => void;
}

export const StandeeModal: React.FC<StandeeModalProps> = ({
  isOpen,
  onClose,
  onOpenPreRegister
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  if (!isOpen) return null;

  // Construct current domain pre-registration URL
  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://student-activities.ai.studio';
  const preRegisterUrl = `${currentOrigin}?mode=preregister`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(preRegisterUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto ${isFullScreen ? 'p-0' : ''}`}>
      
      {/* Container - Styled like a physical event roll-up standee */}
      <div 
        className={`bg-white border-4 border-slate-900 shadow-2xl relative flex flex-col transition-all duration-200 overflow-hidden ${
          isFullScreen 
            ? 'w-full h-full max-w-none rounded-none' 
            : 'w-full max-w-md sm:max-w-lg rounded-3xl my-auto'
        }`}
      >
        {/* Top Control Bar (Hidden on print) */}
        <div className="print:hidden bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b-2 border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              ป้าย Standee จุดลงทะเบียน Walk-in หน้างาน
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              title="พิมพ์ป้าย A4 / โปสเตอร์"
              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
            >
              <Printer className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">สั่งพิมพ์</span>
            </button>

            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              title={isFullScreen ? "ย่อหน้าจอ" : "แสดงเต็มจอแท็บเล็ต"}
              className="p-1.5 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition-colors"
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Physical Standee Content */}
        <div className="p-6 sm:p-8 flex flex-col items-center text-center bg-[#FAF9F6] flex-1 justify-between">
          
          {/* 1. Header Banner */}
          <div className="w-full">
            <div className="flex items-center justify-center gap-3 mb-2">
              <NPULogo size="sm" className="w-10 h-14 drop-shadow-sm" />
              <div className="text-left">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">มหาวิทยาลัยนครพนม</p>
                <h3 className="text-sm font-black text-[#5C2A0D]">คณะครุศาสตร์ & คณะวิทยาศาสตร์ NPU</h3>
              </div>
            </div>

            <div className="my-3 px-3 py-1 bg-amber-100 border border-amber-300 rounded-full inline-flex items-center gap-1.5 text-xs font-bold text-amber-900 shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>จุดลงทะเบียนรับ Digital ID สำหรับผู้ที่ยังไม่ได้ลงทะเบียน</span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight mt-1">
              ผู้ที่ยังไม่มี Digital ID<br />
              <span className="text-[#EA580C] underline decoration-[#F59E0B] decoration-4 underline-offset-4">
                สแกนที่นี่เพื่อลงทะเบียน
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-slate-600 mt-2 font-medium max-w-sm mx-auto">
              กรอกข้อมูลเพียง 30 วินาที เพื่อรับรหัส QR Code เข้างานผ่าน <strong className="text-emerald-700">ช่องทางด่วน Fast Track</strong>
            </p>
          </div>

          {/* 2. Massive High-Contrast QR Code */}
          <div className="my-5 p-5 bg-white border-4 border-[#291506] rounded-2xl shadow-xl flex flex-col items-center">
            <QRCodeSVG
              value={preRegisterUrl}
              size={210}
              level="H"
              includeMargin={false}
              className="rounded-lg"
            />
            <div className="mt-3 flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
              <QrCode className="w-3.5 h-3.5 text-[#EA580C]" />
              <span>สแกนด้วยกล้องมือถือได้ทันที</span>
            </div>
          </div>

          {/* 3. Physical Flow Guidance (3-Step Fast Entry) */}
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-4 shadow-xs text-left mb-4">
            <div className="text-[11px] font-black text-slate-700 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>ขั้นตอนง่ายๆ 3 ขั้นตอน:</span>
              <span className="text-emerald-600 font-bold">ใช้เวลา &lt; 1 นาที</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2 bg-amber-50/70 border border-amber-200 rounded-xl">
                <div className="w-7 h-7 mx-auto rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center mb-1">
                  1
                </div>
                <p className="text-[11px] font-bold text-slate-800">สแกน QR</p>
                <p className="text-[9px] text-slate-500 mt-0.5">เปิดกล้องมือถือส่องป้ายนี้</p>
              </div>

              <div className="p-2 bg-sky-50/70 border border-sky-200 rounded-xl">
                <div className="w-7 h-7 mx-auto rounded-full bg-sky-600 text-white font-black text-xs flex items-center justify-center mb-1">
                  2
                </div>
                <p className="text-[11px] font-bold text-slate-800">กรอกข้อมูล</p>
                <p className="text-[9px] text-slate-500 mt-0.5">รหัสนักศึกษา และ สาขาวิชา</p>
              </div>

              <div className="p-2 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <div className="w-7 h-7 mx-auto rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center mb-1">
                  3
                </div>
                <p className="text-[11px] font-bold text-emerald-900">รับ Digital ID</p>
                <p className="text-[9px] text-emerald-700 mt-0.5">เข้าช่อง Fast Track สแกน 3 วิ!</p>
              </div>
            </div>
          </div>

          {/* 4. Physical Queue Management Warning Banner */}
          <div className="w-full max-w-md p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-left mb-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-[11px] text-rose-800 leading-snug">
              <strong>ข้อแนะนำหน้างาน:</strong> กรุณาอย่าต่อคิวที่โต๊ะสแกนเนอร์หากยังไม่มี QR Code ให้ยืนกรอกข้อมูลจากจุดนี้ก่อน เมื่อได้ QR แล้วจึงเดินเข้าจุดสแกน
            </div>
          </div>

          {/* Quick Actions (Non-printable) */}
          <div className="print:hidden w-full flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full sm:flex-1 py-2 px-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
              <span>{copiedLink ? 'คัดลอกลิงก์สำเร็จแล้ว' : 'คัดลอกลิงก์ลงทะเบียน'}</span>
            </button>

            {onOpenPreRegister && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPreRegister();
                }}
                className="w-full sm:flex-1 py-2 px-3 bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>ทดลองเปิดหน้าลงทะเบียน</span>
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};
