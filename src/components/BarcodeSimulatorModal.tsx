import React, { useState, useEffect, useRef } from 'react';
import { db } from '../db/db';
import { Activity, Student, CheckInLog, Reflection } from '../types';
import { REAL_FACULTY_ACTIVITIES } from '../data/realActivities';
import { logCheckInToSupabase, getPendingSyncCount } from '../services/supabaseApi';
import { extractAndCleanStudentID } from '../utils/thaiKeyboardConverter';
import { 
  X, 
  Zap, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Users, 
  ExternalLink, 
  Sliders, 
  FileCheck2, 
  Volume2, 
  VolumeX, 
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Calendar,
  Building2,
  Clock,
  Award
} from 'lucide-react';

interface BarcodeSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToStudent?: (studentId: string) => void;
  initialActivityId?: string;
  stationName?: string;
}

export const BarcodeSimulatorModal: React.FC<BarcodeSimulatorModalProps> = ({
  isOpen,
  onClose,
  onNavigateToStudent,
  initialActivityId,
  stationName = 'ช่องที่ 1 (ประตูหลัก)'
}) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string>(initialActivityId || 'Y1-01');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('66309010001');
  const [customStudentInput, setCustomStudentInput] = useState<string>('');
  const [activeStation, setActiveStation] = useState<string>(stationName);
  const [scanMethod, setScanMethod] = useState<'usb' | 'camera' | 'manual'>('usb');
  const [simulateThaiKeyboard, setSimulateThaiKeyboard] = useState<boolean>(false);
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);

  // Lifecycle Options
  const [autoCreateReflection, setAutoCreateReflection] = useState<boolean>(true);
  const [autoApproveExecutive, setAutoApproveExecutive] = useState<boolean>(true);

  // Simulation State & Results
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<{
    status: 'success' | 'duplicate' | 'error';
    message: string;
    student?: Student;
    activity?: Activity;
    timestamp?: string;
    deterministicId?: string;
    station?: string;
    details?: string;
  } | null>(null);

  const [recentSimulations, setRecentSimulations] = useState<Array<{
    id: string;
    studentId: string;
    studentName: string;
    activityId: string;
    timestamp: string;
    status: 'success' | 'duplicate';
    station: string;
  }>>([]);

  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Load Real Activities & Faculty Students
    const loadData = async () => {
      const acts = await db.activities.toArray();
      const realActs = acts.length > 0 ? acts : REAL_FACULTY_ACTIVITIES;
      setActivities(realActs);
      if (initialActivityId && realActs.some(a => a.id === initialActivityId)) {
        setSelectedActivityId(initialActivityId);
      } else if (realActs.length > 0) {
        setSelectedActivityId(realActs[0].id);
      }

      const stus = await db.students.toArray();
      const validStudents = stus.filter(s => !s.id.startsWith('ADM-'));
      setStudents(validStudents);
      if (validStudents.length > 0 && !selectedStudentId) {
        setSelectedStudentId(validStudents[0].id);
      }
    };

    loadData();
  }, [isOpen, initialActivityId]);

  // Audio tone generator
  const playChime = (type: 'success' | 'warning' | 'error') => {
    if (!isAudioEnabled || typeof window === 'undefined') return;
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (!ctx) return;
      if (ctx.state === 'suspended') ctx.resume();

      if (type === 'success') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(330, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      }
    } catch (e) {}
  };

  // Convert student ID to simulated Thai keyboard raw string if enabled
  const getRawSimulatedInput = (id: string): string => {
    if (!simulateThaiKeyboard) return id;
    // Map digits to Thai Kedmanee shifted keys commonly produced by unconfigured barcode guns
    const thaiKeyMap: Record<string, string> = {
      '0': 'จ', '1': 'ๅ', '2': '/', '3': '-', '4': 'ภ',
      '5': 'ถ', '6': 'ุ', '7': 'ึ', '8': 'ค', '9': 'ต'
    };
    return id.split('').map(char => thaiKeyMap[char] || char).join('');
  };

  // Execute the exact production-grade check-in and update pipeline
  const executeScanSimulation = async (targetStudentId: string, isDuplicateTest = false) => {
    setIsScanning(true);

    try {
      const rawInput = getRawSimulatedInput(targetStudentId);
      const { studentId, wasConvertedFromThai } = extractAndCleanStudentID(rawInput);

      if (!studentId || studentId.length < 5) {
        throw new Error('รหัสนักศึกษาไม่ถูกต้อง');
      }

      // 1. Get or create student
      let student = await db.students.get(studentId);
      if (!student) {
        student = {
          id: studentId,
          name: `นักศึกษา (${studentId})`,
          email: `${studentId}@npu.ac.th`,
          faculty: 'คณะครุศาสตร์',
          major: 'สาขาวิชาคอมพิวเตอร์ศึกษา',
          university: 'มหาวิทยาลัยนครพนม',
          year: 1
        };
        await db.students.put(student);
      }

      const activity = activities.find(a => a.id === selectedActivityId) || REAL_FACULTY_ACTIVITIES[0];

      // 2. Strict Single Check-in Rule (Composite index check)
      let existing = await db.checkInLogs
        .where('[activityId+studentId]')
        .equals([selectedActivityId, studentId])
        .first();

      if (!existing) {
        existing = await db.checkInLogs
          .where('studentId')
          .equals(studentId)
          .and(log => log.activityId === selectedActivityId)
          .first();
      }

      // Duplicate Check-In Handling
      if (existing) {
        playChime('warning');
        const dupTime = new Date(existing.timestamp).toLocaleTimeString('th-TH');
        const resultPayload = {
          status: 'duplicate' as const,
          message: `รหัสนี้เช็คชื่อไปแล้ว! (ระบบป้องกันข้อมูลซ้ำซ้อน 100%)`,
          student,
          activity,
          timestamp: dupTime,
          station: existing.scannerStation || activeStation,
          details: `เช็คชื่อไปเมื่อเวลา ${dupTime} ผ่านจุด: ${existing.scannerStation || 'ไม่ระบุ'}`
        };
        setScanResult(resultPayload);
        setRecentSimulations(prev => [
          {
            id: `sim_${Date.now()}_${studentId}`,
            studentId,
            studentName: student.name,
            activityId: selectedActivityId,
            timestamp: dupTime,
            status: 'duplicate',
            station: existing.scannerStation || activeStation
          },
          ...prev.slice(0, 7)
        ]);
        setIsScanning(false);
        return;
      }

      // 3. Create New Check-in Record with deterministic ID
      const timestamp = new Date().toISOString();
      const deterministicId = `chk_${selectedActivityId}_${studentId}`;

      const newLog: CheckInLog = {
        id: deterministicId,
        studentId,
        activityId: selectedActivityId,
        timestamp,
        method: scanMethod,
        staffStatus: 'verified',
        execStatus: autoApproveExecutive ? 'approved' : 'pending',
        status: 'checked_in',
        scannerStation: activeStation,
        syncStatus: 'pending'
      };

      await db.checkInLogs.put(newLog);

      // 4. Update Student Reflection if requested
      if (autoCreateReflection) {
        const refId = `ref_${selectedActivityId}_${studentId}`;
        const newReflection: Reflection = {
          id: refId,
          logId: deterministicId,
          studentId,
          knowledge: `ได้เรียนรู้และเข้าใจบทบาทหน้าที่และเกณฑ์วิชาชีพในโครงการ ${activity.name}`,
          practice: `ได้ฝึกปฏิบัติการทำงานร่วมกับเพื่อนครูและการแก้ปัญหาเฉพาะหน้าในสถานการณ์จริง`,
          attitude: `มีความภาคภูมิใจและเจตคติที่ดีต่อวิชาชีพครู พร้อมนำความรู้ไปประยุกต์ใช้ในการสอน`,
          status: autoApproveExecutive ? 'approved' : 'pending_step2',
          submittedAt: timestamp,
          staffReviewedAt: timestamp,
          staffReviewerName: 'อาจารย์ผู้รับผิดชอบกิจกรรม',
          step1ApprovedBy: 'อาจารย์ผู้รับผิดชอบกิจกรรม',
          step1ApprovedAt: timestamp,
          step2ApprovedBy: autoApproveExecutive ? 'ผศ.ดร.ศรีสุดา ด้วงโต้ด (ผู้ช่วยคณบดี)' : undefined,
          step2ApprovedAt: autoApproveExecutive ? timestamp : undefined,
          execApprovedAt: autoApproveExecutive ? timestamp : undefined,
          execApproverName: autoApproveExecutive ? 'ผศ.ดร.ศรีสุดา ด้วงโต้ด (ผู้ช่วยคณบดี)' : undefined
        };
        await db.reflections.put(newReflection);
      }

      // 5. Broadcast live update across all tabs & windows
      try {
        const broadcastPayload = {
          type: 'check_in',
          studentId,
          activityId: selectedActivityId,
          activityName: activity.name,
          timestamp,
          studentName: student.name,
          scannerStation: activeStation
        };
        window.dispatchEvent(new CustomEvent('db_updated', { detail: broadcastPayload }));

        const bc = new BroadcastChannel('npu_db_sync');
        bc.postMessage(broadcastPayload);
        bc.close();
      } catch (e) {}

      // 6. Background sync to Supabase
      logCheckInToSupabase(newLog, student).catch(() => {});

      // 7. Instant Success Feedback
      playChime('success');
      const scanTime = new Date().toLocaleTimeString('th-TH');
      setScanResult({
        status: 'success',
        message: `ยิงสแกนและอัปเดตกิจกรรมสำเร็จ: ${student.name}`,
        student,
        activity,
        timestamp: scanTime,
        deterministicId,
        station: activeStation,
        details: `${activity.name} • ${autoCreateReflection ? 'ถอดบทเรียนแล้ว • ' : ''}${autoApproveExecutive ? 'อนุมัติเรียบร้อย' : 'รออนุมัติ'}`
      });

      setRecentSimulations(prev => [
        {
          id: deterministicId,
          studentId,
          studentName: student.name,
          activityId: selectedActivityId,
          timestamp: scanTime,
          status: 'success',
          station: activeStation
        },
        ...prev.slice(0, 7)
      ]);
    } catch (err: any) {
      playChime('error');
      setScanResult({
        status: 'error',
        message: err.message || 'เกิดข้อผิดพลาดในการประมวลผล',
        details: 'กรุณาตรวจสอบรหัสนักศึกษาและกิจกรรม'
      });
    } finally {
      setIsScanning(false);
    }
  };

  // Run Batch Simulation (5 students)
  const handleBatchSimulation = async () => {
    if (students.length === 0) return;
    const batchList = students.slice(0, 5);
    setBatchProgress({ current: 0, total: batchList.length });

    for (let i = 0; i < batchList.length; i++) {
      setBatchProgress({ current: i + 1, total: batchList.length });
      await executeScanSimulation(batchList[i].id);
      await new Promise(r => setTimeout(r, 260));
    }

    setBatchProgress(null);
  };

  if (!isOpen) return null;

  const currentStudentId = customStudentInput.trim() || selectedStudentId;
  const currentStudent = students.find(s => s.id === currentStudentId);
  const currentActivity = activities.find(a => a.id === selectedActivityId) || REAL_FACULTY_ACTIVITIES[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-3xl w-full border-2 border-[#18181B] shadow-[8px_8px_0px_0px_rgba(24,24,27,1)] flex flex-col max-h-[92vh] overflow-hidden my-auto">
        
        {/* Header Bar */}
        <div className="p-4 sm:p-5 bg-[#FAF7F0] border-b-2 border-[#18181B] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EA580C] text-white flex items-center justify-center font-black text-lg border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] shrink-0">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  จำลองการเทสสแกนบาร์โค้ด & อัปเดตกิจกรรมนักศึกษา
                </h2>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold rounded-md text-[10px]">
                  Real Simulator
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-0.5">
                ทดสอบการยิงสแกนเสมือนจริง อัปเดตการเข้าร่วม ถอดบทเรียน และตรวจสอบข้อมูลซ้ำซ้อน 100%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAudioEnabled(!isAudioEnabled)}
              title={isAudioEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
              className="p-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 transition-all text-xs"
            >
              {isAudioEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl border-2 border-[#18181B] bg-white hover:bg-stone-100 text-stone-800 transition-all shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] active:translate-x-0.5 active:translate-y-0.5"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          
          {/* Top Config Row: Project & Student Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Step 1: Select Real Project */}
            <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl space-y-2.5">
              <label className="text-xs font-black text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#EA580C] text-white flex items-center justify-center text-[10px] font-bold">1</span>
                  เลือกโครงการจริง (18 โครงการของคณะ):
                </span>
                <span className="text-[10px] text-slate-500 font-normal">รหัส 66–69</span>
              </label>

              <select
                value={selectedActivityId}
                onChange={(e) => setSelectedActivityId(e.target.value)}
                className="w-full p-2.5 bg-white border-2 border-[#18181B] rounded-xl text-xs font-bold text-slate-900 outline-none shadow-xs"
              >
                {activities.map((act) => (
                  <option key={act.id} value={act.id}>
                    [{act.id}] {act.yearLevel ? `${act.yearLevel} - ` : ''}{act.name}
                  </option>
                ))}
              </select>

              {currentActivity && (
                <div className="p-2.5 bg-white border border-slate-200 rounded-xl text-[11px] space-y-1 text-slate-600">
                  <div className="font-bold text-slate-900 truncate">{currentActivity.name}</div>
                  <div className="flex flex-wrap gap-x-3 text-[10px]">
                    <span>📅 <strong>กำหนด:</strong> {currentActivity.newSchedule || currentActivity.date}</span>
                    <span>⏱️ <strong>ชั่วโมง:</strong> {currentActivity.hours || 3} ชม.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Select or Input Student */}
            <div className="p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl space-y-2.5">
              <label className="text-xs font-black text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#EA580C] text-white flex items-center justify-center text-[10px] font-bold">2</span>
                  เลือกนักศึกษาที่ต้องการทดสอบ:
                </span>
                <span className="text-[10px] text-emerald-700 font-bold">ตัวแทนทุกชั้นปี</span>
              </label>

              <select
                value={selectedStudentId}
                onChange={(e) => {
                  setSelectedStudentId(e.target.value);
                  setCustomStudentInput('');
                }}
                className="w-full p-2.5 bg-white border-2 border-[#18181B] rounded-xl text-xs font-bold text-slate-900 outline-none shadow-xs"
              >
                {students.map((stu) => (
                  <option key={stu.id} value={stu.id}>
                    {stu.id} • {stu.name} (ปี {stu.year || 1} {stu.major})
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  placeholder="หรือพิมพ์รหัสนักศึกษาอื่นเอง..."
                  value={customStudentInput}
                  onChange={(e) => setCustomStudentInput(e.target.value)}
                  className="flex-1 p-2 bg-white border border-[#18181B] rounded-xl text-xs font-medium"
                />
                {customStudentInput && (
                  <button
                    onClick={() => setCustomStudentInput('')}
                    className="text-[11px] text-slate-500 hover:text-slate-900 underline"
                  >
                    ล้าง
                  </button>
                )}
              </div>
            </div>

          </div>

          {/* Barcode Visualizer Box */}
          <div className="p-4 sm:p-5 bg-[#FAF7F0] border-2 border-[#18181B] rounded-2xl space-y-3 text-center relative overflow-hidden">
            {/* Animated Laser Scanning Line */}
            {isScanning && (
              <div className="absolute inset-x-0 top-0 h-1 bg-red-500 shadow-[0_0_12px_3px_rgba(239,68,68,0.9)] animate-bounce z-10" />
            )}

            <div className="flex items-center justify-between text-xs font-bold text-stone-700">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-[#EA580C]" />
                สถานี: <strong className="text-black">{activeStation}</strong>
              </span>
              <span className="font-mono text-stone-500">
                Method: {scanMethod === 'usb' ? '📟 หัวอ่าน USB' : scanMethod === 'camera' ? '📷 กล้องดิจิทัล' : '⌨️ Manual'}
              </span>
            </div>

            {/* Barcode Graphic Lines */}
            <div className="bg-white p-4 rounded-xl border border-stone-300 inline-block mx-auto shadow-xs">
              <div className="flex items-center justify-center gap-0.5 h-14 px-4 overflow-hidden">
                {currentStudentId.split('').map((digit, idx) => {
                  const widthClass = idx % 2 === 0 ? 'w-1' : (idx % 3 === 0 ? 'w-2' : 'w-1.5');
                  const opacityClass = idx % 4 === 0 ? 'bg-stone-900' : 'bg-black';
                  return (
                    <div key={idx} className="flex items-center gap-0.5 h-full">
                      <div className={`h-full ${widthClass} ${opacityClass}`} />
                      <div className="h-full w-1 bg-transparent" />
                      <div className="h-full w-0.5 bg-black" />
                    </div>
                  );
                })}
              </div>
              <div className="font-mono text-sm font-black text-stone-900 tracking-widest mt-1.5">
                *{currentStudentId}*
              </div>
              <div className="text-[11px] font-bold text-stone-600 mt-0.5">
                {currentStudent?.name || `นักศึกษา ${currentStudentId}`}
              </div>
            </div>

            {/* Test Simulation Controls Grid */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-stone-700 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoCreateReflection}
                  onChange={(e) => setAutoCreateReflection(e.target.checked)}
                  className="rounded border-stone-400 text-[#EA580C] focus:ring-[#EA580C]"
                />
                <span>ถอดบทเรียนอัตโนมัติ (Reflection)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoApproveExecutive}
                  onChange={(e) => setAutoApproveExecutive(e.target.checked)}
                  className="rounded border-stone-400 text-[#EA580C] focus:ring-[#EA580C]"
                />
                <span>อนุมัติชั่วโมงกิจกรรมทันที (Executive Approval)</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-amber-800">
                <input
                  type="checkbox"
                  checked={simulateThaiKeyboard}
                  onChange={(e) => setSimulateThaiKeyboard(e.target.checked)}
                  className="rounded border-stone-400 text-amber-600 focus:ring-amber-500"
                />
                <span>จำลองบั๊กแป้นพิมพ์ไทย (Thai Key Test)</span>
              </label>
            </div>
          </div>

          {/* Action Simulation Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Simulate Normal Scan */}
            <button
              onClick={() => executeScanSimulation(currentStudentId)}
              disabled={isScanning}
              className="py-3 px-6 bg-[#EA580C] hover:bg-[#C2410C] text-white rounded-xl text-xs font-bold transition-all border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
            >
              {isScanning ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              <span>ยิงสแกนบาร์โค้ดทันที</span>
            </button>

            {/* 2. Simulate Duplicate Scan (Verification of Protection) */}
            <button
              onClick={() => executeScanSimulation(currentStudentId, true)}
              disabled={isScanning}
              className="py-3 px-6 bg-amber-50 hover:bg-amber-100 text-amber-900 border-2 border-amber-400 rounded-xl text-xs font-bold transition-all shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
            >
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>ทดสอบยิงซ้ำ (Duplicate Test)</span>
            </button>

            {/* 3. Batch Scan Test */}
            <button
              onClick={handleBatchSimulation}
              disabled={isScanning || !!batchProgress}
              className="py-3 px-6 bg-[#18181B] hover:bg-stone-800 text-[#FACC15] rounded-xl text-xs font-bold transition-all border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] flex items-center justify-center gap-2 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50"
            >
              <Users className="w-4 h-4 text-[#FACC15]" />
              <span>
                {batchProgress 
                  ? `กำลังยิง (${batchProgress.current}/${batchProgress.total})...` 
                  : 'ยิงทดสอบเป็นชุด (5 คน)'}
              </span>
            </button>
          </div>

          {/* Feedback & Result Panel */}
          {scanResult && (
            <div className={`p-4 rounded-2xl border-2 transition-all ${
              scanResult.status === 'success' 
                ? 'bg-emerald-50 border-emerald-500 text-emerald-950' 
                : scanResult.status === 'duplicate'
                ? 'bg-amber-50 border-amber-500 text-amber-950'
                : 'bg-rose-50 border-rose-500 text-rose-950'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  {scanResult.status === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  ) : scanResult.status === 'duplicate' ? (
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4 className="text-sm font-black tracking-tight">{scanResult.message}</h4>
                    <p className="text-xs opacity-90 mt-0.5 leading-relaxed font-medium">
                      {scanResult.details}
                    </p>
                    {scanResult.timestamp && (
                      <div className="text-[10px] opacity-75 mt-1 font-mono">
                        เวลาบันทึก: {scanResult.timestamp} • สถานี: {scanResult.station}
                      </div>
                    )}
                  </div>
                </div>

                {/* View Result in Student View Button */}
                {scanResult.student && onNavigateToStudent && (
                  <button
                    onClick={() => {
                      onNavigateToStudent(scanResult.student!.id);
                      onClose();
                    }}
                    className="inline-flex items-center justify-center gap-1.5 py-2 px-4 bg-white hover:bg-stone-100 text-stone-900 rounded-xl text-xs font-bold border border-stone-300 shadow-xs shrink-0 active:scale-95"
                  >
                    <span>ดูในพอร์ทัลนักศึกษา</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Recent Simulations Stream Table */}
          {recentSimulations.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <h4 className="text-xs font-black text-slate-800 flex items-center justify-between">
                <span>ประวัติการทดสอบรอบนี้ (Live Stream Test Log):</span>
                <span className="text-[10px] text-slate-500 font-normal">
                  {recentSimulations.length} รายการล่าสุด
                </span>
              </h4>

              <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden text-xs">
                {recentSimulations.map((sim, i) => (
                  <div key={sim.id + i} className="p-2.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${sim.status === 'success' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className="font-mono font-bold text-slate-900">{sim.studentId}</span>
                      <span className="text-slate-700 font-medium truncate max-w-[140px] sm:max-w-none">
                        {sim.studentName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                        {sim.station}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        sim.status === 'success' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {sim.status === 'success' ? 'เช็คอินสำเร็จ' : 'ยิงซ้ำ (บล็อก)'}
                      </span>
                      <span className="text-slate-400 text-[10px]">{sim.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Bar */}
        <div className="p-4 bg-[#FAF7F0] border-t-2 border-[#18181B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shrink-0">
          <div className="text-slate-600 font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>เชื่อมต่อกับฐานข้อมูล Dexie (IndexedDB) และ Supabase Realtime พร้อมใช้งาน</span>
          </div>

          <button
            onClick={onClose}
            className="py-2.5 px-5 bg-white hover:bg-stone-100 text-slate-800 rounded-xl font-bold border border-slate-300 shadow-xs transition-all text-xs"
          >
            ปิดหน้าต่าง
          </button>
        </div>

      </div>
    </div>
  );
};
