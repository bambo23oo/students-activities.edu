import React, { useState, useRef } from 'react';
import Barcode from 'react-barcode';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Copy, 
  CheckCheck, 
  Award, 
  BookOpen, 
  GraduationCap, 
  Printer, 
  CheckCircle2, 
  Clock, 
  User, 
  Mail, 
  Building2, 
  ShieldCheck,
  FileCheck,
  Camera,
  Upload,
  Trash2,
  Image as ImageIcon,
  ZoomIn,
  X,
  Sparkles,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Student, CheckInLog, Reflection, Activity } from '../../types';
import { compressAndConvertToBase64 } from '../../utils/imageUtils';

interface StudentProfileTabProps {
  student: Student | null;
  studentId: string;
  studentName: string;
  studentEmail: string;
  logs: (CheckInLog & { activity?: Activity; reflection?: Reflection })[];
  onUpdateProfileImage?: (newImageUrl: string) => Promise<void>;
  onOpenEditMajor?: () => void;
}

export const StudentProfileTab: React.FC<StudentProfileTabProps> = ({
  student,
  studentId,
  studentName,
  studentEmail,
  logs,
  onUpdateProfileImage,
  onOpenEditMajor
}) => {
  const [copied, setCopied] = useState(false);
  const [barcodeMode, setBarcodeMode] = useState<'both' | 'barcode' | 'qr'>('both');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [showFullImageModal, setShowFullImageModal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const effectiveId = student?.id || studentId;
  const effectiveName = student?.name || studentName;
  const effectiveEmail = student?.email || studentEmail;
  const major = student?.major || 'สาขาวิชาคอมพิวเตอร์ศึกษา';
  const faculty = student?.faculty || 'คณะครุศาสตร์';
  const university = student?.university || 'มหาวิทยาลัยนครพนม';
  const year = student?.year || 4;

  const handleCopy = () => {
    navigator.clipboard.writeText(effectiveId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const processFile = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUploadError('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (JPEG, PNG, WebP)');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const base64 = await compressAndConvertToBase64(file, {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true
      });

      if (onUpdateProfileImage) {
        await onUpdateProfileImage(base64);
        setUploadSuccess('อัปโหลดรูปถ่ายประจำตัวนักศึกษาเรียบร้อยแล้ว');
        setTimeout(() => setUploadSuccess(null), 3000);
      }
    } catch (err: any) {
      console.error('Profile photo upload error:', err);
      setUploadError(err.message || 'ไม่สามารถอัปโหลดรูปภาพได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const handleRemovePhoto = async () => {
    if (!onUpdateProfileImage) return;
    if (window.confirm('คุณต้องการลบรูปถ่ายประจำตัวนักศึกษาใช่หรือไม่?')) {
      setIsUploading(true);
      try {
        await onUpdateProfileImage('');
        setUploadSuccess('ลบรูปภาพประจำตัวเรียบร้อยแล้ว');
        setTimeout(() => setUploadSuccess(null), 3000);
      } catch (err: any) {
        setUploadError('เกิดข้อผิดพลาดในการลบรูปภาพ');
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const approvedLogs = logs.filter(l => l.reflection?.status === 'approved');
  const approvedHours = approvedLogs.length * 8;
  const inReviewHours = logs.filter(l => l.reflection && (l.reflection.status === 'pending_step1' || l.reflection.status === 'pending_step2')).length * 8;
  const totalEarnedHours = approvedHours + inReviewHours;

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-[#F7F4EB] border-2 border-[#18181B] p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-[#18181B] flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-[#EA580C]" />
            <span>ข้อมูลนักศึกษารายบุคคล (STUDENT PROFILE & DIGITAL PASS)</span>
          </h2>
          <p className="text-xs text-stone-600 font-bold mt-0.5">
            รหัสนักศึกษา: {effectiveId} • {faculty} {university}
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-white border-2 border-black font-black uppercase text-xs shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-stone-50 flex items-center gap-2 self-start sm:self-auto"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>พิมพ์ใบทรานสคริปต์กิจกรรม</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Digital Student Pass & Photo Uploader */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-[#F7F4EB] border-2 border-[#18181B] p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-4">
            
            <div className="border-b-2 border-[#18181B] pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">
                  บัตรประจำตัวดิจิทัล (OFFICIAL DIGITAL PASS)
                </span>
                <h3 className="text-base font-black text-stone-900 uppercase mt-0.5">
                  บัตรสแกนกิจกรรมนักศึกษา
                </h3>
              </div>
              {student?.profileImage && (
                <button
                  type="button"
                  onClick={() => setShowFullImageModal(true)}
                  className="p-1.5 bg-white border-2 border-black text-xs font-bold shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:bg-stone-100 flex items-center gap-1"
                  title="ดูรูปขนาดเต็ม"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span className="text-[10px]">ดูรูป</span>
                </button>
              )}
            </div>

            {/* Realistic Card Container */}
            <div className="p-4 bg-white border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-4">
              
              {/* University Card Header */}
              <div className="flex items-center gap-3 pb-3 border-b-2 border-stone-200">
                <div className="w-10 h-10 rounded-full bg-[#EA580C] text-white font-black text-sm flex items-center justify-center border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                  NPU
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-black uppercase text-stone-500 tracking-wider leading-none">
                    {university}
                  </p>
                  <p className="text-xs font-black text-stone-900 uppercase leading-tight mt-0.5">
                    {faculty}
                  </p>
                </div>
                <span className="px-2 py-0.5 bg-amber-100 border border-amber-400 text-amber-900 text-[10px] font-black">
                  ปี {year}
                </span>
              </div>

              {/* Photo and Metadata */}
              <div className="flex gap-4 items-center">
                
                {/* Photo frame with quick-upload trigger */}
                <div 
                  className="relative group w-20 h-24 bg-stone-100 border-2 border-black flex items-center justify-center shrink-0 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] overflow-hidden cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                  title="คลิกเพื่ออัปโหลดหรือเปลี่ยนรูปถ่าย"
                >
                  {student?.profileImage ? (
                    <img src={student.profileImage} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-1">
                      <span className="text-2xl font-black text-stone-800">{effectiveName.charAt(0)}</span>
                      <span className="text-[8px] font-black uppercase block text-stone-400 mt-0.5">STUDENT</span>
                    </div>
                  )}

                  {/* Hover Camera Overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-center p-1">
                    <Camera className="w-4 h-4 mb-0.5" />
                    <span className="text-[8px] font-black leading-tight">
                      {student?.profileImage ? 'เปลี่ยนรูป' : 'อัปโหลด'}
                    </span>
                  </div>

                  {isUploading && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-[#FACC15]">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <h4 className="text-sm font-black text-stone-900 truncate">
                    {effectiveName}
                  </h4>
                  
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-black text-[#EA580C] bg-orange-50 px-1.5 py-0.5 border border-orange-200">
                      {effectiveId}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="p-1 hover:bg-stone-100 border border-stone-300 rounded text-stone-600 transition-colors"
                      title="คัดลอกรหัสประจำตัว"
                    >
                      {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <p className="text-[11px] font-bold text-stone-600 truncate">
                    {major}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-700 font-bold">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>สถานะการศึกษา: ปกติ</span>
                  </div>
                </div>
              </div>

              {/* Barcode & QR Code Switcher */}
              <div className="grid grid-cols-3 gap-1 bg-stone-100 p-1 border-2 border-black text-xs font-black uppercase">
                <button
                  type="button"
                  onClick={() => setBarcodeMode('both')}
                  className={`py-1.5 transition-colors ${barcodeMode === 'both' ? 'bg-[#18181B] text-white' : 'text-stone-700'}`}
                >
                  ทั้งคู่
                </button>
                <button
                  type="button"
                  onClick={() => setBarcodeMode('barcode')}
                  className={`py-1.5 transition-colors ${barcodeMode === 'barcode' ? 'bg-[#18181B] text-white' : 'text-stone-700'}`}
                >
                  1D บาร์โค้ด
                </button>
                <button
                  type="button"
                  onClick={() => setBarcodeMode('qr')}
                  className={`py-1.5 transition-colors ${barcodeMode === 'qr' ? 'bg-[#18181B] text-white' : 'text-stone-700'}`}
                >
                  2D คิวอาร์
                </button>
              </div>

              {/* Live Visual Codes */}
              <div className="p-3 bg-white border-2 border-black space-y-3 flex flex-col items-center justify-center">
                {(barcodeMode === 'barcode' || barcodeMode === 'both') && (
                  <div className="w-full flex flex-col items-center">
                    <Barcode 
                      value={effectiveId} 
                      width={1.6} 
                      height={46} 
                      displayValue={true} 
                      fontOptions="bold"
                      textAlign="center"
                      fontSize={13}
                      background="#ffffff"
                      lineColor="#121212"
                      margin={0}
                    />
                    <span className="text-[9px] font-bold text-stone-500 mt-0.5">Code 128 บาร์โค้ดหลังบัตรจริง</span>
                  </div>
                )}

                {(barcodeMode === 'qr' || barcodeMode === 'both') && (
                  <div className="flex flex-col items-center pt-1">
                    <QRCodeSVG 
                      value={effectiveId} 
                      size={130} 
                      level="H" 
                      includeMargin={true}
                    />
                    <span className="text-[9px] font-bold text-stone-500 mt-1">2D QR Code สแกนผ่านกล้อง</span>
                  </div>
                )}
              </div>

            </div>

          </div>

          {/* Dedicated Photo Upload Studio Card */}
          <div className="bg-[#F7F4EB] border-2 border-[#18181B] p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-4">
            
            <div className="border-b-2 border-[#18181B] pb-2.5 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">
                  ระบบจัดการรูปภาพ (STUDENT PHOTO STUDIO)
                </span>
                <h3 className="text-sm sm:text-base font-black text-stone-900 uppercase">
                  อัปโหลดรูปถ่ายประจำตัวนักศึกษา
                </h3>
              </div>
              <span className={`px-2 py-0.5 text-[10px] font-black border ${
                student?.profileImage 
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-400' 
                  : 'bg-amber-100 text-amber-900 border-amber-400'
              }`}>
                {student?.profileImage ? '✓ มีรูปประจำตัวแล้ว' : '⚠️ ยังไม่มีรูปภาพ'}
              </span>
            </div>

            {/* Notifications */}
            {uploadSuccess && (
              <div className="p-2.5 bg-emerald-100 border-2 border-emerald-600 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            {uploadError && (
              <div className="p-2.5 bg-rose-100 border-2 border-rose-600 text-rose-900 text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Drag & Drop Upload Zone */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`p-4 sm:p-5 border-2 border-dashed transition-all text-center ${
                isDragging 
                  ? 'border-[#EA580C] bg-orange-50 scale-[1.01]' 
                  : 'border-[#18181B] bg-white hover:bg-stone-50'
              }`}
            >
              <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 border-2 border-black flex items-center justify-center text-stone-900 mb-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                {isUploading ? (
                  <Loader2 className="w-6 h-6 animate-spin text-[#EA580C]" />
                ) : (
                  <Camera className="w-6 h-6 text-[#18181B]" />
                )}
              </div>

              <h4 className="text-xs font-black uppercase text-stone-900">
                {isUploading ? 'กำลังประมวลผลและบีบอัดรูปภาพ...' : 'ลากไฟล์รูปภาพมาวางที่นี่ หรือเลือกจากอุปกรณ์'}
              </h4>
              <p className="text-[11px] text-stone-500 font-medium mt-0.5">
                รองรับไฟล์ภาพ JPG, PNG, WebP (ระบบจะช่วยบีบอัดให้อัตโนมัติ)
              </p>

              {/* Action Buttons */}
              <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                
                {/* File picker */}
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 bg-[#FACC15] hover:bg-[#EAB308] text-black border-2 border-black text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>เลือกรูปจากเครื่อง</span>
                </button>

                {/* Camera Capture */}
                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => cameraInputRef.current?.click()}
                  className="px-3 py-1.5 bg-white hover:bg-stone-100 text-black border-2 border-black text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Camera className="w-3.5 h-3.5 text-[#EA580C]" />
                  <span>ถ่ายภาพด้วยกล้อง</span>
                </button>

                {/* Delete Photo Button if photo exists */}
                {student?.profileImage && (
                  <button
                    type="button"
                    disabled={isUploading}
                    onClick={handleRemovePhoto}
                    className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border-2 border-rose-600 text-xs font-black uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1 transition-all disabled:opacity-50"
                    title="ลบรูปประจำตัว"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบรูป</span>
                  </button>
                )}
              </div>

              {/* Hidden Inputs */}
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/jpeg,image/png,image/webp,image/*" 
                onChange={handleFileInputChange}
                className="hidden" 
              />
              <input 
                ref={cameraInputRef}
                type="file" 
                accept="image/*" 
                capture="user"
                onChange={handleFileInputChange}
                className="hidden" 
              />
            </div>

            {/* Photography Guideline Box */}
            <div className="p-3 bg-amber-50 border-2 border-amber-300 text-amber-950 text-xs space-y-1">
              <div className="flex items-center gap-1 font-black text-amber-900">
                <Sparkles className="w-3.5 h-3.5 text-[#EA580C]" />
                <span>คำแนะนำการใช้รูปถ่ายติดบัตร:</span>
              </div>
              <ul className="text-[11px] list-disc list-inside text-amber-900 font-medium space-y-0.5">
                <li>แนะนำภาพหน้าตรง ครึ่งตัว สวมชุดนักศึกษาหรือชุดสุภาพ</li>
                <li>ภาพที่คมชัดจะช่วยให้เจ้าหน้าที่สแกนเนอร์ยืนยันตัวตนได้รวดเร็วขึ้น</li>
                <li>รูปถ่ายจะแสดงบนบัตรดิจิทัล และในระบบรายงานผลกิจกรรม K-P-A</li>
              </ul>
            </div>

          </div>

        </div>

        {/* Right Column: Academic Information & Curriculum Progress */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Detailed Info Card */}
          <div className="bg-[#F7F4EB] border-2 border-[#18181B] p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#18181B] pb-2.5">
              <h3 className="text-sm font-black uppercase tracking-wider text-stone-900">
                ข้อมูลทะเบียนประวัติการศึกษา
              </h3>
              {onOpenEditMajor && (
                <button
                  type="button"
                  onClick={onOpenEditMajor}
                  className="px-2.5 py-1 bg-[#FACC15] hover:bg-[#EAB308] text-black text-xs font-black uppercase border-2 border-black rounded-lg shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 transition-all flex items-center gap-1"
                >
                  <span>✏️ แก้ไขสาขาวิชา</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-white border-2 border-stone-300">
                <span className="text-[10px] text-stone-500 font-bold block uppercase">ชื่อ-นามสกุล</span>
                <span className="text-sm font-black text-stone-900">{effectiveName}</span>
              </div>

              <div className="p-3 bg-white border-2 border-stone-300">
                <span className="text-[10px] text-stone-500 font-bold block uppercase">รหัสประจำตัวนักศึกษา</span>
                <span className="text-sm font-mono font-black text-[#EA580C]">{effectiveId}</span>
              </div>

              <div className="p-3 bg-white border-2 border-stone-300">
                <span className="text-[10px] text-stone-500 font-bold block uppercase">คณะ / สถาบัน</span>
                <span className="text-xs font-bold text-stone-800">{faculty} {university}</span>
              </div>

              <div className="p-3 bg-white border-2 border-stone-300 relative group">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-stone-500 font-bold block uppercase">สาขาวิชา / ชั้นปี</span>
                  {onOpenEditMajor && (
                    <button
                      type="button"
                      onClick={onOpenEditMajor}
                      className="text-[10px] text-[#2563EB] hover:underline font-black"
                    >
                      เปลี่ยน
                    </button>
                  )}
                </div>
                <span className="text-xs font-black text-[#2563EB] block mt-0.5">{major} (ปี {year})</span>
              </div>

              <div className="p-3 bg-white border-2 border-stone-300">
                <span className="text-[10px] text-stone-500 font-bold block uppercase">อีเมลมหาวิทยาลัย</span>
                <span className="text-xs font-mono font-bold text-stone-800">{effectiveEmail}</span>
              </div>

              <div className="p-3 bg-white border-2 border-stone-300">
                <span className="text-[10px] text-stone-500 font-bold block uppercase">อาจารย์ที่ปรึกษา</span>
                <span className="text-xs font-bold text-stone-800">ผศ.ดร.ศรีสุดา ด้วงโต้ด</span>
              </div>
            </div>
          </div>

          {/* Curriculum Graduation Tracker */}
          <div className="bg-[#F7F4EB] border-2 border-[#18181B] p-4 sm:p-5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="flex items-center justify-between border-b-2 border-[#18181B] pb-2.5">
              <h3 className="text-sm font-black uppercase tracking-wider text-stone-900">
                เกณฑ์กิจกรรมเสริมหลักสูตรเพื่อการสำเร็จการศึกษา (100 ชม.)
              </h3>
              <span className="text-xs font-black text-[#EA580C] bg-orange-100 px-2 py-0.5 border border-orange-300">
                สะสมได้ {totalEarnedHours} / 100 ชม.
              </span>
            </div>

            <div className="space-y-3">
              {/* Category 1: วิชาการและวิชาชีพครู */}
              <div className="p-3 bg-white border-2 border-black space-y-1.5">
                <div className="flex items-center justify-between text-xs font-black">
                  <span>1. กิจกรรมพัฒนาวิชาการและวิชาชีพครู (เกณฑ์ 30 ชม.)</span>
                  <span className="text-emerald-700">24 / 30 ชม.</span>
                </div>
                <div className="w-full h-2.5 bg-stone-200 border border-black overflow-hidden">
                  <div className="h-full bg-emerald-600" style={{ width: '80%' }} />
                </div>
              </div>

              {/* Category 2: บำเพ็ญประโยชน์และจิตสาธารณะ */}
              <div className="p-3 bg-white border-2 border-black space-y-1.5">
                <div className="flex items-center justify-between text-xs font-black">
                  <span>2. กิจกรรมบำเพ็ญประโยชน์ จิตสาธารณะ และสิ่งแวดล้อม (เกณฑ์ 30 ชม.)</span>
                  <span className="text-blue-700">24 / 30 ชม.</span>
                </div>
                <div className="w-full h-2.5 bg-stone-200 border border-black overflow-hidden">
                  <div className="h-full bg-blue-600" style={{ width: '80%' }} />
                </div>
              </div>

              {/* Category 3: ทำนุบำรุงศิลปวัฒนธรรม */}
              <div className="p-3 bg-white border-2 border-black space-y-1.5">
                <div className="flex items-center justify-between text-xs font-black">
                  <span>3. กิจกรรมส่งเสริมคุณธรรม จริยธรรม และศิลปวัฒนธรรม (เกณฑ์ 20 ชม.)</span>
                  <span className="text-purple-700">16 / 20 ชม.</span>
                </div>
                <div className="w-full h-2.5 bg-stone-200 border border-black overflow-hidden">
                  <div className="h-full bg-purple-600" style={{ width: '80%' }} />
                </div>
              </div>

              {/* Category 4: ส่งเสริมสุขภาพและกีฬา */}
              <div className="p-3 bg-white border-2 border-black space-y-1.5">
                <div className="flex items-center justify-between text-xs font-black">
                  <span>4. กิจกรรมส่งเสริมสุขภาพ กีฬา และนันทนาการ (เกณฑ์ 20 ชม.)</span>
                  <span className="text-amber-700">12 / 20 ชม.</span>
                </div>
                <div className="w-full h-2.5 bg-stone-200 border border-black overflow-hidden">
                  <div className="h-full bg-amber-500" style={{ width: '60%' }} />
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Full Photo Modal */}
      {showFullImageModal && student?.profileImage && (
        <div 
          className="fixed inset-0 bg-stone-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowFullImageModal(false)}
        >
          <div 
            className="bg-[#F7F4EB] border-4 border-black max-w-sm w-full p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <span className="text-xs font-black uppercase text-stone-900">รูปถ่ายประจำตัวนักศึกษา</span>
              <button 
                onClick={() => setShowFullImageModal(false)}
                className="w-7 h-7 bg-white text-black border-2 border-black font-black flex items-center justify-center hover:bg-rose-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="border-2 border-black bg-white overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
              <img src={student.profileImage} alt="" className="w-full h-auto max-h-[60vh] object-contain" />
            </div>

            <div className="text-center text-xs font-bold text-stone-700">
              {effectiveName} • {effectiveId}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
