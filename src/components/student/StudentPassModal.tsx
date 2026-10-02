import React, { useRef, useState, useEffect } from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, CheckCheck, X, Award, Camera, CheckCircle2, ShieldCheck, RefreshCw, Sparkles, Loader2, Download, AlertTriangle } from 'lucide-react';
import { Student } from '../../types';
import { compressAndConvertToBase64 } from '../../utils/imageUtils';
import { downloadDigitalPassCard } from '../../utils/generatePassImage';
import { db } from '../../db/db';

interface StudentPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  studentId: string;
  studentName: string;
  onUpdateProfileImage?: (newImageUrl: string) => Promise<void>;
  onOpenEditMajor?: () => void;
}

export const StudentPassModal: React.FC<StudentPassModalProps> = ({
  isOpen,
  onClose,
  student,
  studentId,
  studentName,
  onUpdateProfileImage,
  onOpenEditMajor
}) => {
  const [barcodeMode, setBarcodeMode] = useState<'both' | 'barcode' | 'qr'>('both');
  const [copied, setCopied] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [saveSuccessToast, setSaveSuccessToast] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Real-time check-in status & anti-duplicate QR guard
  const [latestCheckIn, setLatestCheckIn] = useState<{
    activityName: string;
    timestamp: string;
    timeFormatted: string;
  } | null>(null);
  const [hideQrAfterCheckIn, setHideQrAfterCheckIn] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const effectiveId = student?.id || studentId;
  const effectiveName = student?.name || studentName;
  const major = student?.major || 'สาขาวิชาคอมพิวเตอร์ศึกษา';
  const faculty = student?.faculty || 'คณะครุศาสตร์';
  const university = student?.university || 'มหาวิทยาลัยนครพนม';
  const year = student?.year || 4;

  // Listen to real-time check-in updates for this student
  useEffect(() => {
    if (!isOpen || !effectiveId) return;

    // Check for recent check-in on modal open
    checkRecentCheckIn();

    const handleSync = (e: any) => {
      const data = e?.detail;
      if (data && data.studentId === effectiveId) {
        onCheckInSuccess(data.activityName, data.timestamp);
      } else {
        checkRecentCheckIn();
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'npu_last_checkin' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.studentId === effectiveId) {
            onCheckInSuccess(parsed.activityName, parsed.timestamp);
          }
        } catch (err) {}
      }
    };

    window.addEventListener('db_updated', handleSync);
    window.addEventListener('storage', handleStorage);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('npu_db_sync');
      bc.onmessage = (msg) => {
        const d = msg.data;
        if (d && d.studentId === effectiveId) {
          onCheckInSuccess(d.activityName, d.timestamp);
        }
      };
    } catch (e) {}

    return () => {
      window.removeEventListener('db_updated', handleSync);
      window.removeEventListener('storage', handleStorage);
      if (bc) bc.close();
    };
  }, [isOpen, effectiveId]);

  const checkRecentCheckIn = async () => {
    if (!effectiveId) return;
    try {
      // Find latest log for this student within today/recent
      const latestLog = await db.checkInLogs
        .where('studentId')
        .equals(effectiveId)
        .reverse()
        .sortBy('timestamp');

      if (latestLog && latestLog.length > 0) {
        const topLog = latestLog[0];
        const logTime = new Date(topLog.timestamp).getTime();
        const now = Date.now();
        // If checked in within the last 15 minutes, highlight and guard QR
        if (now - logTime < 15 * 60 * 1000) {
          const act = await db.activities.get(topLog.activityId);
          setLatestCheckIn({
            activityName: act?.name || 'กิจกรรมประจำรอบ',
            timestamp: topLog.timestamp,
            timeFormatted: new Date(topLog.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
          });
        }
      }
    } catch (e) {
      console.warn('Error checking recent log:', e);
    }
  };

  const onCheckInSuccess = (activityName?: string, timestamp?: string) => {
    // Play celebratory sound
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        osc.frequency.setValueAtTime(1318.5, ctx.currentTime + 0.2); // E6
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      }
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
    } catch (e) {}

    const t = timestamp ? new Date(timestamp) : new Date();
    setLatestCheckIn({
      activityName: activityName || 'กิจกรรมคณะครุศาสตร์',
      timestamp: t.toISOString(),
      timeFormatted: t.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    });
    setHideQrAfterCheckIn(true);
  };

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(effectiveId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateProfileImage) return;

    setIsUploading(true);
    setUploadError(null);
    try {
      const base64 = await compressAndConvertToBase64(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true
      });
      await onUpdateProfileImage(base64);
    } catch (err: any) {
      console.error('Pass modal image upload error:', err);
      setUploadError('ไม่สามารถอัปโหลดรูปภาพได้');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSavePassImage = async () => {
    setIsSavingImage(true);
    try {
      const ok = await downloadDigitalPassCard({
        id: effectiveId,
        name: effectiveName,
        major,
        faculty,
        year,
        profileImage: student?.profileImage
      });
      if (ok) {
        setSaveSuccessToast(true);
        setTimeout(() => setSaveSuccessToast(false), 3500);
      }
    } catch (err) {
      console.error('Failed to save pass image:', err);
    } finally {
      setIsSavingImage(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-stone-900/80 backdrop-blur-xs z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-[#F7F4EB] border-4 border-black w-full max-w-md shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden my-8 sm:my-auto shrink-0 animate-in zoom-in-95 duration-150">
        
        {/* Modal Top Bar */}
        <div className="bg-[#18181B] text-white p-3.5 sm:p-4 flex items-center justify-between border-b-2 border-black">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-[#FACC15] rounded-full animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-amber-300">
              DIGITAL STUDENT PASS • บัตรนักศึกษาดิจิทัล
            </span>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 bg-white text-black border-2 border-black font-black flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 text-center space-y-4">
          
          {/* Temporary Account Warning (If created via on-site emergency entry without photo) */}
          {student?.isTemporary && (
            <div className="p-3 bg-amber-100 border-2 border-amber-600 rounded-none text-left flex items-start gap-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <AlertTriangle className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-black text-amber-950">
                  บัญชีของคุณลงทะเบียนฉุกเฉินหน้างาน (ยังไม่มีรูปถ่าย)
                </p>
                <p className="text-[10px] text-amber-800 font-medium mt-0.5">
                  กรุณาคลิกที่รูปถ่ายด้านล่างเพื่ออัปโหลดรูปประจำตัวให้สมบูรณ์
                </p>
              </div>
            </div>
          )}

          {/* Authentic Student Identity Card Frame */}
          <div className="p-4 bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-left">
            <div className="flex items-center gap-2 pb-2 border-b-2 border-stone-200 mb-3">
              <div className="w-8 h-8 rounded-full bg-[#EA580C] flex items-center justify-center text-white font-black text-xs">
                NPU
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase text-stone-500 leading-none">{university}</p>
                <p className="text-xs font-black text-stone-900 leading-tight">{faculty}</p>
              </div>
              <span className="px-2 py-0.5 bg-amber-100 border border-amber-400 text-amber-900 text-[10px] font-black rounded-xs">
                ชั้นปีที่ {year}
              </span>
            </div>

            <div className="flex gap-3.5 items-center">
              {/* Photo Box with Upload Button */}
              <div 
                className="relative group w-20 h-24 rounded-none border-2 border-black overflow-hidden bg-stone-100 flex items-center justify-center shrink-0 cursor-pointer"
                onClick={() => onUpdateProfileImage && fileInputRef.current?.click()}
                title={onUpdateProfileImage ? "คลิกเพื่ออัปโหลดหรือเปลี่ยนรูปถ่าย" : undefined}
              >
                {student?.profileImage ? (
                  <img src={student.profileImage} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex flex-col items-center justify-center text-stone-700">
                    <span className="text-2xl font-black">{effectiveName.charAt(0)}</span>
                    <span className="text-[9px] font-bold mt-1">NPU ID</span>
                  </div>
                )}

                {onUpdateProfileImage && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-center p-1">
                    <Camera className="w-4 h-4 mb-0.5 text-[#FACC15]" />
                    <span className="text-[8px] font-black leading-tight">เปลี่ยนรูป</span>
                  </div>
                )}

                {isUploading && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-[#FACC15]">
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm sm:text-base font-black text-stone-900 truncate">
                    {effectiveName}
                  </h3>
                  {onUpdateProfileImage && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-[10px] text-[#EA580C] hover:underline font-bold flex items-center gap-0.5"
                    >
                      <Camera className="w-3 h-3" />
                      <span>{student?.profileImage ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}</span>
                    </button>
                  )}
                </div>
                
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-black text-[#EA580C] bg-orange-50 px-1.5 py-0.5 border border-orange-200">
                    {effectiveId}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1 hover:bg-stone-100 border border-stone-300 rounded text-stone-600 transition-colors"
                    title="คัดลอกรหัสนักศึกษา"
                  >
                    {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-center justify-between gap-1 text-[11px] font-bold text-stone-700">
                  <span className="truncate text-[#2563EB]">{major}</span>
                  {onOpenEditMajor && (
                    <button
                      type="button"
                      onClick={onOpenEditMajor}
                      className="text-[10px] text-[#EA580C] hover:underline font-black shrink-0"
                    >
                      แก้ไขสาขา
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                  <Award className="w-3 h-3 text-emerald-600" />
                  <span>สถานะ: นักศึกษาปกติ (Active)</span>
                </div>
              </div>
            </div>

            {/* Hidden Input for Fast Profile Upload */}
            <input 
              ref={fileInputRef} 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange} 
              className="hidden" 
            />

            {uploadError && (
              <p className="text-[10px] font-bold text-rose-600 mt-2">{uploadError}</p>
            )}
          </div>

          {/* Real-time Check-In Feedback Banner (WOW Factor) */}
          {latestCheckIn && hideQrAfterCheckIn ? (
            <div className="p-4 bg-emerald-100 border-2 border-black rounded-none shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] text-left space-y-3 animate-in zoom-in-95 duration-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                  <CheckCircle2 className="w-6 h-6 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black uppercase text-emerald-950">
                      เช็คชื่อสำเร็จแล้ว! (CHECKED IN)
                    </span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <h4 className="text-sm font-black text-stone-900 mt-0.5 line-clamp-1">
                    {latestCheckIn.activityName}
                  </h4>
                  <p className="text-[11px] font-bold text-emerald-900 mt-0.5">
                    บันทึกเวลา: {latestCheckIn.timeFormatted} น. • ข้อมูลอัปเดตเรียบร้อย
                  </p>
                </div>
              </div>

              {/* Verified Digital Seal (Replaces active QR to prevent duplicate scans) */}
              <div className="p-5 bg-white border-2 border-dashed border-emerald-600 flex flex-col items-center justify-center text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-50 border-2 border-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-7 h-7 text-emerald-600" />
                </div>
                <span className="text-sm font-black text-stone-900 tracking-wider">
                  บันทึกการเข้าร่วมกิจกรรมแล้ว
                </span>
                <p className="text-[11px] text-stone-500 font-medium">
                  ระบบซ่อน QR Code อัตโนมัติ เพื่อป้องกันการสแกนซ้ำในรอบเดียวกัน
                </p>
                
                <button
                  type="button"
                  onClick={() => setHideQrAfterCheckIn(false)}
                  className="mt-2 px-3 py-1.5 bg-[#FAF7F0] hover:bg-stone-200 text-stone-800 font-bold text-xs border border-stone-400 rounded-none flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3 h-3 text-stone-600" />
                  <span>แสดง QR Code อีกครั้ง</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Format Switcher */}
              <div className="grid grid-cols-3 gap-1 bg-white p-1 border-2 border-black text-xs font-black uppercase">
                <button
                  type="button"
                  onClick={() => setBarcodeMode('both')}
                  className={`py-2 transition-colors ${barcodeMode === 'both' ? 'bg-[#18181B] text-white' : 'text-stone-700 hover:bg-stone-100'}`}
                >
                  ทั้งคู่
                </button>
                <button
                  type="button"
                  onClick={() => setBarcodeMode('barcode')}
                  className={`py-2 transition-colors ${barcodeMode === 'barcode' ? 'bg-[#18181B] text-white' : 'text-stone-700 hover:bg-stone-100'}`}
                >
                  BARCODE (1D)
                </button>
                <button
                  type="button"
                  onClick={() => setBarcodeMode('qr')}
                  className={`py-2 transition-colors ${barcodeMode === 'qr' ? 'bg-[#18181B] text-white' : 'text-stone-700 hover:bg-stone-100'}`}
                >
                  QR CODE (2D)
                </button>
              </div>

              {/* Barcode and/or QR Presentation */}
              <div className="bg-white p-4 border-2 border-black space-y-3 flex flex-col items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] min-h-[160px]">
                {(barcodeMode === 'barcode' || barcodeMode === 'both') && (
                  <div className="w-full flex flex-col items-center">
                    <Barcode 
                      value={effectiveId} 
                      width={1.7} 
                      height={48} 
                      displayValue={true} 
                      fontOptions="bold"
                      textAlign="center"
                      fontSize={13}
                      background="#ffffff"
                      lineColor="#121212"
                      margin={0}
                    />
                    <span className="text-[10px] font-bold text-stone-500 mt-1">Code 128 สำหรับ USB Barcode Scanner</span>
                  </div>
                )}

                {(barcodeMode === 'qr' || barcodeMode === 'both') && (
                  <div className="flex flex-col items-center pt-2">
                    <QRCodeSVG 
                      id="pass-qrcode-svg"
                      value={effectiveId} 
                      size={140}
                      level="H"
                      includeMargin={true}
                    />
                    <span className="text-[10px] font-bold text-stone-500 mt-1">2D QR Code สำหรับสแกนเนอร์หน้ากิจกรรม</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Save Image to Phone Gallery Action Button (Physical UX offline resilience) */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleSavePassImage}
              disabled={isSavingImage}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              {isSavingImage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                  <span>กำลังบันทึกภาพ...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 text-amber-300" />
                  <span>บันทึกรูปลงเครื่อง (เซฟเข้าคลังภาพมือถือ)</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-stone-500 font-medium">
              💡 แนะนำให้เซฟรูปไว้ล่วงหน้า เผื่อกรณีวันงานสัญญาณอินเทอร์เน็ตหน้างานขัดข้อง
            </p>

            {saveSuccessToast && (
              <div className="p-2 bg-emerald-100 border border-emerald-400 text-emerald-900 rounded-none text-xs font-bold flex items-center justify-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>บันทึกรูปบัตร Digital ID เรียบร้อยแล้ว! พร้อมใช้งาน Fast Track</span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 px-5 bg-[#18181B] hover:bg-black text-white font-black uppercase text-xs border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all"
          >
            ปิดหน้าต่าง
          </button>

        </div>
      </div>
    </div>
  );
};
