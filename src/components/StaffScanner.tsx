import React, { useState, useEffect, useRef } from 'react';
import { db, cleanCorruptedThaiRecords } from '../db/db';
import { Activity, CheckInLog, Student } from '../types';
import { 
  Camera, 
  Keyboard, 
  CheckCircle, 
  XCircle, 
  ArrowLeft, 
  Play, 
  Users, 
  Clock, 
  Volume2, 
  VolumeX, 
  CreditCard, 
  Smartphone, 
  Zap, 
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Languages,
  VideoOff,
  SwitchCamera,
  Flashlight,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  Power
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeScannerState } from 'html5-qrcode';
import { logCheckInToSupabase, getPendingSyncCount, syncPendingLogsToSupabase, pullScannerActivityUpdates, pullScannerCheckInUpdates } from '../services/supabaseApi';
import { saveActivityStatus } from '../services/activityRepository';
import { extractAndCleanStudentID } from '../utils/thaiKeyboardConverter';
import { getSupabaseClient } from '../lib/supabase';

interface StaffScannerProps {
  onNavigateToStudent?: (studentId: string) => void;
}

export const DEFAULT_SCANNER_STATIONS = [
  'ช่องที่ 1 (ประตูหลัก)',
  'ช่องที่ 2 (ประตูข้าง)',
  'ช่องที่ 3 (โต๊ะลงทะเบียน 1)',
  'ช่องที่ 4 (โต๊ะลงทะเบียน 2)',
  'ช่องที่ 5 (จุดคัดกรอง)'
];

export const StaffScanner: React.FC<StaffScannerProps> = ({ onNavigateToStudent }) => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [cohortFilter, setCohortFilter] = useState<string>('all');
  
  // Multi-Device & Station Configuration
  const [scannerStation, setScannerStation] = useState<string>(() => {
    return localStorage.getItem('npu_scanner_station') || 'ช่องที่ 1 (ประตูหลัก)';
  });
  const [isEditingStation, setIsEditingStation] = useState(false);
  const [customStationInput, setCustomStationInput] = useState('');
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isSyncingPending, setIsSyncingPending] = useState(false);
  const [totalActivityCount, setTotalActivityCount] = useState<number>(0);

  // Workflow state
  const [isScanningMode, setIsScanningMode] = useState(false);
  const [mode, setMode] = useState<'usb' | 'camera' | 'manual'>('camera');
  
  // Scanner state
  const [inputValue, setInputValue] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [manualCandidate, setManualCandidate] = useState<{ student: Student; activityId: string } | null>(null);
  const [manualLookupError, setManualLookupError] = useState('');
  const [manualLookingUp, setManualLookingUp] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Instant visual feedback states (Non-blocking)
  const [screenFlash, setScreenFlash] = useState<'success' | 'warning' | 'error' | null>(null);
  const [scanResult, setScanResult] = useState<{ 
    status: 'success' | 'warning' | 'error'; 
    message: string; 
    student?: any;
    activityName?: string;
    time?: string;
    cardSource?: 'physical' | 'digital' | 'manual';
    wasConvertedFromThai?: boolean;
    duplicateTime?: string;
    scannedStation?: string;
  } | null>(null);

  // References
  const inputRef = useRef<HTMLInputElement>(null);
  const isProcessingRef = useRef<boolean>(false);
  const dismissTimerRef = useRef<any>(null);
  const flashTimerRef = useRef<any>(null);
  const lastScanKeyRef = useRef<{ id: string; time: number }>({ id: '', time: 0 });
  const manualLookupRequestRef = useRef(0);
  const dbUpdateDebounceRef = useRef<any>(null);
  
  // Recent check-in logs in this session
  const [sessionLogs, setSessionLogs] = useState<{ 
    id: string; 
    studentId: string; 
    studentName: string; 
    faculty?: string; 
    major?: string; 
    timestamp: string; 
    method?: string; 
    cardType?: 'physical' | 'digital' | 'manual';
    scannerStation?: string;
    isTemporary?: boolean;
    isPreRegistered?: boolean;
    isNew?: boolean;
  }[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'invalid'>('all');
  
  // Camera scanner state & refs
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const directCameraInputRef = useRef<HTMLInputElement>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraLoading, setCameraLoading] = useState<boolean>(false);
  const [availableCameras, setAvailableCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);

  useEffect(() => {
    ++manualLookupRequestRef.current;
    setManualCandidate(null);
    setManualLookupError('');
    setManualLookingUp(false);
  }, [selectedActivityId]);

  useEffect(() => {
    // Initial cleanup of any corrupted Thai logs in IndexedDB
    cleanCorruptedThaiRecords().then(() => {
      loadActivities();
    });
  }, []);

  useEffect(() => {
    if (selectedActivityId) {
      loadSessionLogs(selectedActivityId);
    }
    
    // Refresh pending sync counter
    getPendingSyncCount().then(setPendingSyncCount).catch(() => {});

    const handleDbUpdate = () => {
      if (dbUpdateDebounceRef.current) clearTimeout(dbUpdateDebounceRef.current);
      dbUpdateDebounceRef.current = setTimeout(() => {
        loadActivities();
        if (selectedActivityId) loadSessionLogs(selectedActivityId);
        getPendingSyncCount().then(setPendingSyncCount).catch(() => {});
      }, 120);
    };

    window.addEventListener('db_updated', handleDbUpdate);
    return () => {
      if (dbUpdateDebounceRef.current) clearTimeout(dbUpdateDebounceRef.current);
      window.removeEventListener('db_updated', handleDbUpdate);
    };
  }, [selectedActivityId]);

  useEffect(() => {
    if (!selectedActivityId) return;
    let stopped = false;
    let busy = false;
    const refresh = async () => {
      if (busy || document.hidden || !navigator.onLine) return;
      busy = true;
      try {
        const centralCount = await pullScannerCheckInUpdates(selectedActivityId);
        if (!stopped) {
          await loadSessionLogs(selectedActivityId);
          setTotalActivityCount(centralCount);
        }
      } catch (cause) {
        console.warn('Scanner check-in refresh failed:', cause);
      } finally {
        busy = false;
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 10_000);
    const onVisible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [selectedActivityId]);

  useEffect(() => {
    let busy = false;
    const refresh = async () => {
      if (busy || document.hidden || !navigator.onLine) return;
      busy = true;
      try { await pullScannerActivityUpdates(); }
      catch (cause) { console.warn('Scanner activity refresh failed:', cause); }
      finally { busy = false; }
    };
    const timer = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const loadActivities = async () => {
    const acts = await db.activities.toArray();
    acts.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
    setActivities(acts);
    if (acts.length > 0 && !selectedActivityId) {
      setSelectedActivityId(acts[0].id);
    }
  };

  const loadSessionLogs = async (actId: string) => {
    // Total count across all staff stations for this activity
    const totalCount = await db.checkInLogs.where('activityId').equals(actId).count();
    setTotalActivityCount(totalCount);

    const logs = await db.checkInLogs.where('activityId').equals(actId).reverse().sortBy('timestamp');
    const enriched = await Promise.all(logs.slice(0, 20).map(async (l, idx) => {
      const student = await db.students.get(l.studentId);
      const cardType: 'physical' | 'digital' | 'manual' = 
        l.method === 'camera' ? 'digital' : 
        l.method === 'usb' ? 'physical' : 'manual';
      const isTemporary = l.isTemporary || student?.isTemporary;
      const isPreRegistered = student?.isPreRegistered;

      return {
        id: l.id,
        studentId: l.studentId,
        studentName: student?.name || `รหัสนักศึกษา ${l.studentId}`,
        faculty: student?.faculty,
        major: student?.major,
        timestamp: l.timestamp,
        method: l.method,
        cardType,
        scannerStation: l.scannerStation,
        isTemporary,
        isPreRegistered,
        isNew: idx === 0
      };
    }));
    setSessionLogs(enriched);
  };

  const handleManualSyncPending = async () => {
    setIsSyncingPending(true);
    try {
      const res = await syncPendingLogsToSupabase();
      const remaining = await getPendingSyncCount();
      setPendingSyncCount(remaining);
      if (res.synced > 0) {
        setScanResult({
          status: 'success',
          message: `ซิงก์ข้อมูลขึ้นคลาวด์สำเร็จ ${res.synced} รายการ`
        });
        setTimeout(() => setScanResult(null), 2500);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSyncingPending(false);
    }
  };

  const handleSelectStation = (newStation: string) => {
    setScannerStation(newStation);
    localStorage.setItem('npu_scanner_station', newStation);
    setIsEditingStation(false);
  };

  // Staff Open/Close Activity Toggle Handler
  const handleToggleActivityStatus = async (activityIdToToggle?: string) => {
    const actId = activityIdToToggle || selectedActivityId;
    const target = activities.find(a => a.id === actId);
    if (!target) return;

    const newStatus = target.status === 'active' ? 'completed' : 'active';
    try {
      await saveActivityStatus(target, newStatus);
      setActivities(prev => prev.map(a => a.id === actId ? { ...a, status: newStatus } : a));
    } catch (error) {
      setScanResult({ status: 'error', message: error instanceof Error ? error.message : 'เปลี่ยนสถานะกิจกรรมไม่สำเร็จ' });
    }
  };

  // Web Audio API synthesizers for crisp, non-blocking feedback
  const triggerAudioAndHaptic = (type: 'success' | 'warning' | 'error') => {
    // 1. Haptic Vibration (Mobile Hardware)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        if (type === 'success') {
          navigator.vibrate([70]);
        } else if (type === 'warning') {
          navigator.vibrate([150, 60, 150]);
        } else {
          navigator.vibrate([220]);
        }
      } catch (e) {}
    }

    // 2. Synthesized Sound
    if (!soundEnabled) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (type === 'success') {
        // Bright two-tone crystal chime (880Hz -> 1320Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.22);
      } else if (type === 'warning') {
        // Distinctive double buzz for duplicate
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(330, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.22, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.28);
      } else {
        // Low error buzz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {}
  };

  // Trigger high-contrast screen flash
  const triggerScreenFlash = (type: 'success' | 'warning' | 'error') => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setScreenFlash(type);
    flashTimerRef.current = setTimeout(() => {
      setScreenFlash(null);
    }, 450);
  };

  // Camera Management
  const startCamera = async (specificCameraId?: string) => {
    setCameraError(null);
    setCameraLoading(true);
    setIsTorchOn(false);

    try {
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
            await scannerRef.current.stop();
          }
          await scannerRef.current.clear();
        } catch (e) {
          console.log('Previous scanner clear info:', e);
        }
        scannerRef.current = null;
      }

      const readerElem = document.getElementById('camera-stream-reader');
      if (!readerElem) {
        throw new Error('ไม่พบตัวรับภาพกล้องในหน้าจอ');
      }

      const html5QrCode = new Html5Qrcode('camera-stream-reader');
      scannerRef.current = html5QrCode;

      let cameras: Array<{ id: string; label: string }> = [];
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          cameras = devices.map(d => ({ id: d.id, label: d.label || `กล้อง ${d.id.slice(0, 5)}` }));
          setAvailableCameras(cameras);
        }
      } catch (devErr) {
        console.warn('Get cameras list warning:', devErr);
      }

      const qrConfig: any = {
        fps: 20,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const safeSize = Math.max(120, Math.floor(minEdge * 0.8));
          const safeWidth = Math.min(safeSize, viewfinderWidth - 10);
          const safeHeight = Math.min(Math.floor(safeSize * 0.7), viewfinderHeight - 10);
          return { 
            width: Math.max(90, safeWidth), 
            height: Math.max(70, safeHeight) 
          };
        },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE
        ]
      };

      const handleDecoded = async (decodedText: string) => {
        const raw = decodedText.trim();
        const now = Date.now();
        // Intelligent debounce: prevent double firing same code within 2 seconds
        if (lastScanKeyRef.current.id === raw && now - lastScanKeyRef.current.time < 2000) {
          return;
        }
        lastScanKeyRef.current = { id: raw, time: now };
        await processScan(raw, 'camera');
      };

      if (specificCameraId) {
        await html5QrCode.start(
          specificCameraId,
          qrConfig,
          handleDecoded,
          () => {}
        );
        setSelectedCameraId(specificCameraId);
        setCameraActive(true);
        setCameraLoading(false);
        checkTorchCapability();
        return;
      }

      // Default: back camera (environment)
      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          qrConfig,
          handleDecoded,
          () => {}
        );
        setCameraActive(true);
        setCameraLoading(false);
        checkTorchCapability();
        return;
      } catch (backCamErr) {
        console.warn('Back camera failed, fallback camera:', backCamErr);
      }

      if (cameras.length > 0) {
        const firstCamId = cameras[0].id;
        await html5QrCode.start(
          firstCamId,
          qrConfig,
          handleDecoded,
          () => {}
        );
        setSelectedCameraId(firstCamId);
        setCameraActive(true);
        setCameraLoading(false);
        checkTorchCapability();
        return;
      }

      await html5QrCode.start(
        { facingMode: 'user' },
        qrConfig,
        handleDecoded,
        () => {}
      );
      setCameraActive(true);
      setCameraLoading(false);
      checkTorchCapability();

    } catch (err: any) {
      console.error('Camera startup error:', err);
      setCameraActive(false);
      setCameraLoading(false);

      const errMsg = err?.message || String(err);
      if (errMsg.includes('Permission') || errMsg.includes('NotAllowedError') || errMsg.includes('Permission denied')) {
        setCameraError('เบราว์เซอร์ไม่อนุญาตให้เข้าถึงกล้อง กรุณาคลิกที่รูปแม่กุญแจ 🔒 ที่แถบ URL ของเบราว์เซอร์ แล้วเลือก "อนุญาตให้ใช้กล้อง" (Allow Camera)');
      } else if (errMsg.includes('NotFoundError') || errMsg.includes('DevicesNotFoundError')) {
        setCameraError('ไม่พบอุปกรณ์กล้องบนเครื่องนี้ กรุณาใช้โหมดเครื่องยิงบาร์โค้ด USB หรือพิมพ์รหัส');
      } else if (errMsg.includes('NotReadableError') || errMsg.includes('TrackStartError')) {
        setCameraError('กล้องอาจถูกใช้งานโดยแอปพลิเคชันอื่นอยู่ (เช่น Zoom/Meet) กรุณาปิดโปรแกรมอื่นแล้วลองใหม่');
      } else {
        setCameraError('ไม่สามารถเปิดกล้องสดได้ในขณะนี้ คุณสามารถใช้ปุ่ม "ถ่ายรูปสแกนด่วน" หรือใช้โหมดเครื่องยิงบาร์โค้ด USB ได้อย่างรวดเร็ว');
      }
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }
    setCameraActive(false);
    setIsTorchOn(false);
  };

  const checkTorchCapability = () => {
    try {
      const videoElem = document.querySelector('#camera-stream-reader video') as HTMLVideoElement;
      if (videoElem && videoElem.srcObject) {
        const stream = videoElem.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        if (track && track.getCapabilities) {
          const cap: any = track.getCapabilities();
          if (cap.torch) {
            setTorchSupported(true);
            return;
          }
        }
      }
      setTorchSupported(false);
    } catch (e) {
      setTorchSupported(false);
    }
  };

  const toggleTorch = async () => {
    try {
      const videoElem = document.querySelector('#camera-stream-reader video') as HTMLVideoElement;
      if (videoElem && videoElem.srcObject) {
        const stream = videoElem.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        if (track) {
          const nextTorch = !isTorchOn;
          await (track as any).applyConstraints({
            advanced: [{ torch: nextTorch }]
          });
          setIsTorchOn(nextTorch);
        }
      }
    } catch (err) {
      console.warn('Torch toggle error:', err);
    }
  };

  const flipCamera = async () => {
    if (availableCameras.length > 1) {
      const currentIndex = availableCameras.findIndex(c => c.id === selectedCameraId);
      const nextIndex = (currentIndex + 1) % availableCameras.length;
      await startCamera(availableCameras[nextIndex].id);
    } else {
      // Toggle between facing modes
      await startCamera();
    }
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    try {
      setCameraLoading(true);
      const tempScanner = new Html5Qrcode('camera-stream-reader');
      const decoded = await tempScanner.scanFile(file, true);
      await tempScanner.clear();
      setCameraLoading(false);
      await processScan(decoded.trim(), 'camera');
    } catch (err) {
      setCameraLoading(false);
      triggerAudioAndHaptic('error');
      triggerScreenFlash('error');
      setScanResult({
        status: 'error',
        message: 'ไม่พบ QR Code หรือแถบบาร์โค้ดในภาพที่เลือก กรุณาถ่ายภาพให้ชัดเจน'
      });
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => setScanResult(null), 3000);
    }
  };

  useEffect(() => {
    if (isScanningMode && mode === 'camera' && selectedActivityId) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [isScanningMode, mode, selectedActivityId]);

  // Keep focus locked on USB scanner input for continuous hardware flow
  useEffect(() => {
    if (isScanningMode && mode === 'usb' && selectedActivityId) {
      inputRef.current?.focus();
    }
  }, [isScanningMode, mode, selectedActivityId]);

  // Window-level keydown listener: redirects hardware barcode gun typing even if clicked outside
  useEffect(() => {
    if (!isScanningMode || mode !== 'usb') return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Ignore if focus is in a manual text input or textarea
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'INPUT' && target !== inputRef.current) {
        return;
      }
      // Re-focus scanner input
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isScanningMode, mode]);

  const handleUSBScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !selectedActivityId || isProcessingRef.current) return;

    const raw = inputValue.trim();
    setInputValue('');
    await processScan(raw, 'usb');
    // Ensure focus remains immediately ready for the very next student
    inputRef.current?.focus();
  };

  const handleManualLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    const requestId = ++manualLookupRequestRef.current;
    setManualCandidate(null);
    setManualLookupError('');
    const studentId = manualInput.trim();
    if (!/^\d{12}$/.test(studentId)) {
      setManualLookupError('กรุณากรอกรหัสนักศึกษา 12 หลัก');
      return;
    }
    if (!selectedActivityId || activities.find(a => a.id === selectedActivityId)?.status !== 'active') {
      setManualLookupError('กรุณาเลือกกิจกรรมที่เปิดรับเช็กอิน');
      return;
    }
    const client = getSupabaseClient();
    if (!client || !navigator.onLine) {
      setManualLookupError('ต้องเชื่อมต่ออินเทอร์เน็ตเพื่อตรวจสอบรายชื่อนักศึกษาก่อนบันทึก');
      return;
    }
    setManualLookingUp(true);
    try {
      const [{ data: studentRow, error: studentError }, { data: existing, error: existingError }] = await Promise.all([
        client.from('students').select('id, name, email, faculty, major, year').eq('id', studentId).maybeSingle(),
        client.from('check_in_logs').select('id').eq('activity_id', selectedActivityId).eq('student_id', studentId).maybeSingle()
      ]);
      if (studentError || existingError) throw new Error('ตรวจสอบข้อมูลกลางไม่ได้ กรุณาลองใหม่');
      if (!studentRow) throw new Error('ไม่พบรหัสนี้ในทะเบียนนักศึกษา กรุณาตรวจสอบรหัสอีกครั้ง');
      if (existing || await db.checkInLogs.where('[activityId+studentId]').equals([selectedActivityId, studentId]).first()) {
        throw new Error('นักศึกษาคนนี้เช็กอินกิจกรรมนี้แล้ว ไม่ต้องบันทึกซ้ำ');
      }
      const student: Student = {
        id: studentRow.id,
        name: studentRow.name,
        email: studentRow.email || '',
        faculty: studentRow.faculty || undefined,
        major: studentRow.major || undefined,
        year: studentRow.year || undefined
      };
      if (manualLookupRequestRef.current === requestId) {
        setManualCandidate({ student, activityId: selectedActivityId });
      }
    } catch (error) {
      if (manualLookupRequestRef.current === requestId) {
        setManualLookupError(error instanceof Error ? error.message : 'ตรวจสอบข้อมูลไม่ได้ กรุณาลองใหม่');
      }
    } finally {
      if (manualLookupRequestRef.current === requestId) setManualLookingUp(false);
    }
  };

  const handleManualConfirm = async () => {
    if (!manualCandidate || manualCandidate.activityId !== selectedActivityId || manualCandidate.student.id !== manualInput || isProcessingRef.current) return;
    const studentId = manualCandidate.student.id;
    setManualCandidate(null);
    setManualInput('');
    await processScan(studentId, 'manual');
  };

  // High-Speed Check-In Engine (No blocking dialogs, instantaneous feedback)
  const processScan = async (rawInput: string, method: 'usb' | 'camera' | 'manual') => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      const activeActivity = activities.find(a => a.id === selectedActivityId);
      if (!activeActivity || activeActivity.status !== 'active') {
        throw new Error('กิจกรรมนี้ปิดรับบันทึกอยู่ กรุณาเปิดบันทึกก่อนสแกน');
      }
      // 1. Convert Thai keyboard encoding and extract clean student ID
      const { studentId, wasConvertedFromThai } = extractAndCleanStudentID(rawInput);
      const effectiveSource = method === 'manual' ? 'manual' : (method === 'camera' ? 'digital' : 'physical');

      if (!/^\d{12}$/.test(studentId)) {
        throw new Error('รหัสนักศึกษาต้องเป็นตัวเลข 12 หลัก กรุณาสแกนใหม่อีกครั้ง');
      }

      // 2. Resolve the student from the verified roster. A scanned number alone
      // is never enough to create a student identity.
      let student = await db.students.get(studentId);
      if (!student) {
        const client = getSupabaseClient();
        if (client) {
          const { data: rosterStudent, error: lookupError } = await client
            .from('students')
            .select('id, name, email, faculty, major, year')
            .eq('id', studentId)
            .maybeSingle();
          if (lookupError) throw new Error('ตรวจสอบทะเบียนนักศึกษาไม่ได้ กรุณาลองอีกครั้งหรือติดต่อเจ้าหน้าที่');
          if (rosterStudent) {
            student = {
              id: rosterStudent.id,
              name: rosterStudent.name,
              email: rosterStudent.email || '',
              faculty: rosterStudent.faculty || undefined,
              major: rosterStudent.major || undefined,
              year: rosterStudent.year || undefined
            };
            await db.students.put(student);
          }
        }
        if (!student) {
          throw new Error('ไม่พบรหัสนี้ในทะเบียนนักศึกษา กรุณาให้เจ้าหน้าที่ตรวจสอบข้อมูลก่อนเช็คอิน');
        }
      }

      // 3. Strict Single Check-in Rule (รับข้อมูลแค่ 1 ครั้งต่อกิจกรรม ตรวจสอบทั้งในเครื่องและที่ซิงก์มาจากเครื่องอื่น)
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

      if (existing) {
        // Instant Feedback: Warning / Duplicate
        triggerAudioAndHaptic('warning');
        triggerScreenFlash('warning');

        const existingTime = new Date(existing.timestamp).toLocaleTimeString('th-TH');
        const stationLabel = existing.scannerStation ? ` [${existing.scannerStation}]` : '';
        setScanResult({ 
          status: 'warning', 
          message: `รหัสนี้เช็คชื่อไปแล้ว!${stationLabel}`,
          student,
          duplicateTime: existingTime,
          scannedStation: existing.scannerStation,
          cardSource: effectiveSource,
          wasConvertedFromThai
        });

        if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
        dismissTimerRef.current = setTimeout(() => {
          setScanResult(null);
        }, 2600);

        return;
      }

      // 4. Save new log immediately (Deterministic ID prevents duplicate collisions across multiple devices)
      const currentAct = activities.find(a => a.id === selectedActivityId);
      const checkInTimestamp = new Date().toISOString();
      const deterministicId = `chk_${selectedActivityId}_${studentId}`;
      const newLog: CheckInLog = {
        id: deterministicId,
        studentId,
        activityId: selectedActivityId,
        timestamp: checkInTimestamp,
        method,
        staffStatus: 'verified',
        execStatus: 'pending',
        status: 'checked_in',
        scannerStation,
        syncStatus: 'pending'
      };
      await db.checkInLogs.put(newLog);

      // Confirm the central write before telling staff that a check-in succeeded.
      const syncResult = await logCheckInToSupabase(newLog, student);
      if (syncResult === 'closed') {
        await db.checkInLogs.delete(newLog.id);
        throw new Error('กิจกรรมนี้ปิดบันทึกในฐานข้อมูลกลางแล้ว กรุณาเลือกกิจกรรมที่เปิดอยู่');
      }
      if (syncResult === 'synced' || syncResult === 'duplicate') {
        window.dispatchEvent(new Event('db_updated'));
        const bc = new BroadcastChannel('npu_db_sync');
        bc.postMessage({ type: 'check_in', studentId, activityId: selectedActivityId });
        bc.close();
      }
      getPendingSyncCount().then(setPendingSyncCount).catch(() => {});
      triggerAudioAndHaptic(syncResult === 'synced' ? 'success' : 'warning');
      triggerScreenFlash(syncResult === 'synced' ? 'success' : 'warning');

      const scanTime = new Date().toLocaleTimeString('th-TH');
      setScanResult({ 
        status: syncResult === 'synced' ? 'success' : 'warning',
        message: syncResult === 'synced'
          ? `เช็คชื่อสำเร็จ: ${student.name}`
          : syncResult === 'duplicate'
            ? `รหัสนี้เช็คชื่อในกิจกรรมนี้แล้ว: ${student.name}`
            : `บันทึกในเครื่องแล้ว แต่ยังไม่ส่งถึงฐานข้อมูลกลาง: ${student.name}`,
        student,
        activityName: currentAct?.name || 'กิจกรรมประจำรอบ',
        time: scanTime,
        cardSource: effectiveSource,
        wasConvertedFromThai
      });

      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        setScanResult(null);
      }, 2600);

      // Reload live session logs
      await loadSessionLogs(selectedActivityId);
      
    } catch (err: any) {
      triggerAudioAndHaptic('error');
      triggerScreenFlash('error');
      setScanResult({ 
        status: 'error', 
        message: err.message || 'เกิดข้อผิดพลาดในการสแกน' 
      });
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = setTimeout(() => {
        setScanResult(null);
      }, 3000);
    } finally {
      // Re-enable processing with ultra-short cooldown for true continuous flow
      setTimeout(() => {
        isProcessingRef.current = false;
        if (mode === 'usb') {
          inputRef.current?.focus();
        }
      }, 200);
    }
  };

  const selectedActivityObj = activities.find(a => a.id === selectedActivityId);

  // --- Step 1: Session Selector ---
  if (!isScanningMode) {
    return (
      <div className="max-w-4xl min-w-0 mx-auto py-4 font-sans">
        <div className="min-w-0 bg-white rounded-xl p-4 sm:p-8 border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] space-y-6">
          
          <div className="flex items-center gap-3 pb-4 border-b-2 border-stone-100">
            <div className="w-12 h-12 rounded-xl bg-[#FACC15] text-[#18181B] border-2 border-[#18181B] flex items-center justify-center font-black text-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              ⚡
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-[#18181B]">เลือกกิจกรรมเพื่อเช็คอิน</h2>
              <p className="text-xs text-stone-600 font-medium mt-0.5">เลือกกิจกรรมและจุดสแกน แล้วเริ่มรับบัตรนักศึกษา</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <label className="block text-xs font-bold text-[#18181B]">
                  กิจกรรม
                </label>

                {/* Cohort quick filter pills */}
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'all', label: 'ทั้งหมด' },
                    { id: '69', label: 'ปี 1 (69)' },
                    { id: '68', label: 'ปี 2 (68)' },
                    { id: '67', label: 'ปี 3 (67)' },
                    { id: '66', label: 'ปี 4 (66)' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        setCohortFilter(tab.id);
                        const filtered = tab.id === 'all' 
                          ? activities 
                          : activities.filter(a => a.cohort === tab.id);
                        if (filtered.length > 0 && (!selectedActivityObj || selectedActivityObj.cohort !== tab.id)) {
                          setSelectedActivityId(filtered[0].id);
                        }
                      }}
                      className={`min-h-11 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                        cohortFilter === tab.id
                          ? 'bg-[#18181B] text-white shadow-sm'
                          : 'bg-[#FAF7F0] text-stone-600 hover:bg-stone-200 border border-stone-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {activities.length === 0 ? (
                <div className="p-4 bg-amber-50 border-2 border-amber-300 text-amber-900 rounded-xl text-xs flex items-center gap-3 font-medium">
                  <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
                  <span>ยังไม่มีกิจกรรม กรุณาเพิ่มที่เมนู “จัดการกิจกรรม”</span>
                </div>
              ) : (
                <select 
                  value={selectedActivityId}
                  onChange={(e) => setSelectedActivityId(e.target.value)}
                  className="w-full p-3 bg-[#FAF7F0] border-2 border-[#18181B] rounded-xl outline-none text-xs sm:text-sm font-bold text-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]"
                >
                  {(cohortFilter === 'all' ? activities : activities.filter(a => a.cohort === cohortFilter)).map(a => (
                    <option key={a.id} value={a.id}>
                      {a.status === 'active' ? '🟢 [เปิด] ' : '🔴 [ปิด] '}
                      [{a.id}] {a.yearLevel ? `${a.yearLevel} - ` : ''}{a.name} ({a.newSchedule || a.date})
                    </option>
                  ))}
                </select>
              )}

              {/* Selected Activity Preview Card */}
              {selectedActivityObj && (
                <div className="mt-3 p-3.5 bg-[#FAF7F0] rounded-xl border-2 border-[#18181B] space-y-1.5 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2 py-0.5 bg-[#18181B] text-[#FACC15] font-black rounded-md text-[10px]">
                      {selectedActivityObj.id}
                    </span>
                    {selectedActivityObj.yearLevel && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-900 border border-orange-300 font-bold rounded-md text-[10px]">
                        {selectedActivityObj.yearLevel}
                      </span>
                    )}
                    {selectedActivityObj.category && (
                      <span className="px-2 py-0.5 bg-sky-100 text-sky-900 border border-sky-300 font-bold rounded-md text-[10px]">
                        {selectedActivityObj.category}
                      </span>
                    )}
                  </div>
                  <div className="font-black text-stone-900 text-sm">
                    {selectedActivityObj.name}
                  </div>
                  <div className="text-[11px] text-stone-600 flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
                    <span>📅 <strong>กำหนด:</strong> {selectedActivityObj.newSchedule || selectedActivityObj.date}</span>
                    <span>📍 {selectedActivityObj.location || 'คณะครุศาสตร์ ม.นครพนม'}</span>
                  </div>

                  {/* Staff Open / Close Activity Toggle Control */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2.5 border-t border-stone-200 mt-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-stone-700">สถานะกิจกรรม:</span>
                      {selectedActivityObj.status === 'active' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                          <span>เปิดบันทึก</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1">
                          <span>ปิดบันทึก</span>
                        </span>
                      )}
                      <span className="text-[10px] text-stone-500 font-medium">
                        {selectedActivityObj.status === 'active'
                          ? '• แสดงบนแดชบอร์ดนักศึกษา'
                          : '• ซ่อนจากแดชบอร์ดนักศึกษา (ยกเว้นผู้ที่เข้าร่วมแล้ว)'}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleActivityStatus(selectedActivityObj.id)}
                      className={`min-h-11 px-4 py-2 rounded-xl text-xs font-black border-2 border-[#18181B] transition-all flex items-center justify-center gap-1.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 shrink-0 ${
                        selectedActivityObj.status === 'active'
                          ? 'bg-rose-50 hover:bg-rose-100 text-rose-800'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                      }`}
                      title={selectedActivityObj.status === 'active' ? 'คลิกเพื่อปิดกิจกรรม (นักศึกษาจะมองไม่เห็นบนแดชบอร์ด)' : 'คลิกเพื่อเปิดกิจกรรม (นักศึกษาจะมองเห็น)'}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{selectedActivityObj.status === 'active' ? 'ปิดบันทึก' : 'เปิดบันทึก'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Multi-Device Station & Concurrency Configuration */}
            <div className="p-4 bg-[#FAF7F0] rounded-xl border-2 border-[#18181B] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-black text-[#18181B] flex items-center gap-1.5">
                    จุดสแกนของเครื่องนี้
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-[#FACC15] text-[#18181B] border border-[#18181B] rounded-lg text-xs font-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                    {scannerStation}
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsEditingStation(!isEditingStation)}
                    className="text-xs font-bold text-stone-600 hover:text-black underline"
                  >
                    {isEditingStation ? 'ปิด' : 'เปลี่ยนจุด'}
                  </button>
                </div>
              </div>

              {isEditingStation && (
                <div className="pt-2 border-t border-stone-200 space-y-2">
                  <div className="flex flex-wrap gap-1.5">
                    {DEFAULT_SCANNER_STATIONS.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleSelectStation(st)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                          scannerStation === st
                            ? 'bg-[#18181B] text-white border-[#18181B]'
                            : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-100'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                    <input
                      type="text"
                      placeholder="หรือพิมพ์ชื่อจุดสแกนเอง (เช่น ประตูทิศเหนือ)"
                      value={customStationInput}
                      onChange={(e) => setCustomStationInput(e.target.value)}
                      className="min-w-0 flex-1 px-3 py-2 text-xs bg-white border border-[#18181B] rounded-lg font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customStationInput.trim()) {
                          handleSelectStation(customStationInput.trim());
                          setCustomStationInput('');
                        }
                      }}
                      className="min-h-11 px-4 py-2 bg-[#18181B] text-white text-xs font-bold rounded-lg"
                    >
                      บันทึกจุด
                    </button>
                  </div>
                </div>
              )}

              {/* Show only records that still need attention on this device. */}
              {pendingSyncCount > 0 && <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200 text-xs">
                <span className="text-amber-900 font-semibold">ยังไม่ส่งข้อมูลจากเครื่องนี้</span>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded font-bold text-[11px]">{pendingSyncCount} รายการ</span>
                  <button type="button" onClick={handleManualSyncPending} disabled={isSyncingPending}
                    className="min-h-11 px-4 py-2 bg-amber-500 text-stone-950 rounded-md text-xs font-bold hover:bg-amber-600 flex items-center gap-1.5 disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 ${isSyncingPending ? 'animate-spin' : ''}`} />
                    <span>{isSyncingPending ? 'กำลังส่ง...' : 'ส่งอีกครั้ง'}</span>
                  </button>
                </div>
              </div>}
            </div>

            {/* Main Action Buttons */}
            <div className="space-y-2.5">
              <button 
                disabled={!selectedActivityId || activities.length === 0}
                onClick={() => setIsScanningMode(true)}
                className="w-full py-3.5 px-7 bg-[#18181B] hover:bg-stone-800 text-[#FACC15] rounded-xl font-bold text-xs sm:text-sm border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:translate-x-0.5 active:translate-y-0.5"
              >
                <Play className="w-4 h-4 text-[#FACC15]" />
                <span>เริ่มสแกนเช็คอิน</span>
              </button>
            </div>

            <div className="pt-4 border-t-2 border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="text-xs text-stone-600 font-medium">สแกนด้วยกล้องหรือเครื่องยิงบาร์โค้ดได้</div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  // --- Step 2: Active Scanner Station (Continuous Flow & Real-time Stream) ---
  return (
    <div className="max-w-6xl min-w-0 mx-auto py-2 space-y-4 font-['Prompt','Sarabun',sans-serif] relative">

      {/* Screen Flash Visual Feedback (Success = Vivid Green, Warning = Amber, Error = Red) */}
      {screenFlash && (
        <div 
          className={`fixed inset-0 pointer-events-none z-50 transition-opacity duration-300 ${
            screenFlash === 'success' 
              ? 'bg-emerald-500/25 border-8 border-emerald-500 animate-in fade-in duration-100' 
              : screenFlash === 'warning'
              ? 'bg-amber-500/30 border-8 border-amber-500 animate-in fade-in duration-100'
              : 'bg-rose-500/35 border-8 border-rose-500 animate-in fade-in duration-100'
          }`}
        />
      )}
      
      {/* Session Top Bar */}
      <div className="bg-white rounded-xl p-4 sm:p-5 border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {selectedActivityObj?.status === 'active' ? (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md text-[10px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                <span>เปิดรับสแกน</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-300 rounded-md text-[10px] font-black">
                <span>ปิดรับสแกน</span>
              </div>
            )}
            {selectedActivityObj?.id && (
              <span className="px-2 py-0.5 bg-[#18181B] text-[#FACC15] font-black rounded text-[10px]">
                {selectedActivityObj.id}
              </span>
            )}
            {selectedActivityObj?.yearLevel && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-900 border border-orange-300 font-bold rounded text-[10px]">
                {selectedActivityObj.yearLevel}
              </span>
            )}
          </div>
          <h2 className="text-base sm:text-lg font-black text-[#18181B] leading-tight">
            {selectedActivityObj?.name}
          </h2>
          <p className="text-xs text-stone-600 font-medium flex flex-wrap gap-x-3 gap-y-1">
            <span>📅 {selectedActivityObj?.newSchedule || selectedActivityObj?.date}</span>
            <span>🎯 นับสะสม 1 กิจกรรม</span>
            <span>📍 {selectedActivityObj?.location || 'คณะครุศาสตร์'}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
          {/* Quick Staff Toggle Open / Close Button */}
          {selectedActivityObj && (
            <button
              type="button"
              onClick={() => handleToggleActivityStatus(selectedActivityObj.id)}
              className={`min-h-11 px-4 py-2 rounded-xl text-xs font-black border-2 border-[#18181B] transition-all flex items-center gap-1.5 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 ${
                selectedActivityObj.status === 'active'
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-800'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white animate-pulse'
              }`}
              title={selectedActivityObj.status === 'active' ? 'คลิกเพื่อปิดกิจกรรม (จะซ่อนจากแดชบอร์ดนักศึกษา)' : 'คลิกเพื่อเปิดกิจกรรม (จะแสดงบนแดชบอร์ดนักศึกษา)'}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{selectedActivityObj.status === 'active' ? 'ปิดบันทึก' : 'เปิดบันทึก'}</span>
            </button>
          )}

          <div className="w-full sm:w-auto min-w-0 px-3 py-1.5 bg-[#FAF7F0] border-2 border-[#18181B] rounded-xl text-xs font-black text-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex flex-wrap items-center gap-2">
            <span>🏢 {scannerStation}</span>
            <span className="text-stone-300">|</span>
            <span>
              รวมทุกเครื่อง:{' '}
              <strong className="text-[#EA580C] text-sm">
                {totalActivityCount}
                {selectedActivityObj?.capacity ? ` / ${selectedActivityObj.capacity}` : ''}
              </strong> คน
            </span>
          </div>

          {pendingSyncCount > 0 && (
            <button
              onClick={handleManualSyncPending}
              disabled={isSyncingPending}
              className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5"
              title="ซิงก์ข้อมูลออฟไลน์ขึ้นคลาวด์"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingPending ? 'animate-spin' : ''}`} />
              <span>รอซิงก์ {pendingSyncCount}</span>
            </button>
          )}

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border-2 border-[#18181B] text-xs font-bold transition-all shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] min-h-[44px] min-w-[44px] flex items-center justify-center ${
              soundEnabled ? 'bg-[#FACC15] text-[#18181B]' : 'bg-white text-stone-400'
            }`}
            title={soundEnabled ? 'ปิดเสียงแจ้งเตือน' : 'เปิดเสียงแจ้งเตือน'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5 text-[#18181B]" /> : <VolumeX className="w-5 h-5" />}
          </button>
          
          <button 
            onClick={() => setIsScanningMode(false)}
            className="px-3.5 py-2 bg-white hover:bg-[#FAF7F0] text-[#18181B] rounded-xl text-xs font-bold transition-all border-2 border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1.5 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>เปลี่ยนกิจกรรม</span>
          </button>
        </div>
      </div>

      {/* Closed Activity Status Alert Banner for Staff */}
      {selectedActivityObj && selectedActivityObj.status !== 'active' && (
        <div className="p-3.5 bg-rose-50 border-2 border-rose-400 rounded-xl text-rose-950 font-bold text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[2px_2px_0px_0px_rgba(244,63,94,0.3)] animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <div>
              <span>กิจกรรมนี้ปิดบันทึกอยู่</span>
              <p className="text-[11px] text-stone-600 font-medium">
                กิจกรรมนี้จะไม่แสดงบนแดชบอร์ดของนักศึกษา ยกเว้นนักศึกษาที่เคยเช็คอินเข้าร่วมแล้ว
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Capacity Alert Banner (Requirement: เมื่อจำนวนผู้เข้าร่วมใกล้เต็ม 90% มีแถบสีส้มแจ้งเตือน) */}
      {selectedActivityObj?.capacity && totalActivityCount >= Math.floor(selectedActivityObj.capacity * 0.9) && (
        <div className="p-3.5 bg-amber-100 border-2 border-amber-500 rounded-xl text-amber-950 font-bold text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-[2px_2px_0px_0px_rgba(245,158,11,1)] animate-in fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
            <span>
              <strong>⚠️ แจ้งเตือนความจุ (Capacity Alert):</strong> มีผู้เข้าร่วมแล้ว {totalActivityCount} จากความจุสูงสุด {selectedActivityObj.capacity} คน ({Math.min(100, Math.round((totalActivityCount / selectedActivityObj.capacity) * 100))}%) {totalActivityCount >= selectedActivityObj.capacity ? '— เต็มความจุแล้ว!' : '— ใกล้เต็มความจุแล้ว!'}
            </span>
          </div>
          <span className="text-[10px] px-2.5 py-1 bg-amber-300 text-amber-950 rounded-lg font-black shrink-0 self-start sm:self-auto border border-amber-500">
            {totalActivityCount >= selectedActivityObj.capacity ? 'FULL CAPACITY' : 'CAPACITY 90%+'}
          </span>
        </div>
      )}

      {/* Floating Non-Blocking HUD Toast (Zero interruption for queue) */}
      {scanResult && (
        <div 
          onClick={() => setScanResult(null)}
          className={`p-3.5 sm:p-4 rounded-xl border-2 border-[#18181B] shadow-[4px_4px_0px_0px_rgba(24,24,27,1)] flex items-center justify-between gap-3 animate-in slide-in-from-top-3 duration-150 cursor-pointer ${
            scanResult.status === 'success' 
              ? 'bg-emerald-400 text-stone-900' 
              : scanResult.status === 'warning'
              ? 'bg-amber-300 text-stone-900'
              : 'bg-rose-500 text-white'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            {scanResult.status === 'success' ? (
              <div className="w-10 h-10 rounded-lg bg-black text-[#FACC15] flex items-center justify-center shrink-0 border border-black shadow-sm">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
            ) : scanResult.status === 'warning' ? (
              <div className="w-10 h-10 rounded-lg bg-black text-amber-400 flex items-center justify-center shrink-0 border border-black shadow-sm">
                <AlertTriangle className="w-6 h-6 text-amber-400" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-black text-rose-400 flex items-center justify-center shrink-0 border border-black shadow-sm">
                <XCircle className="w-6 h-6 text-rose-400" />
              </div>
            )}

            <div className="min-w-0">
              <div className="text-sm sm:text-base font-black tracking-tight leading-tight flex items-center gap-2 flex-wrap">
                <span>{scanResult.message}</span>
                {scanResult.time && (
                  <span className="text-[11px] px-2 py-0.5 rounded bg-black/15 font-bold">
                    เวลา {scanResult.time} น.
                  </span>
                )}
              </div>

              {scanResult.student && (
                <div className="text-xs font-bold mt-0.5 truncate opacity-95">
                  {scanResult.student.id} • {scanResult.student.name} • {scanResult.student.major}
                </div>
              )}

              {scanResult.duplicateTime && (
                <div className="text-xs font-bold text-amber-950 mt-0.5">
                  เคยเช็คชื่อไปแล้วเมื่อ {scanResult.duplicateTime} น. (ระบบไม่บันทึกซ้ำ)
                </div>
              )}

              {/* Direct Quick Action Buttons for Testing & Updating Activities */}
              {scanResult.student && (
                <div className="flex flex-wrap items-center gap-2 mt-2 pt-1 border-t border-black/10">
                  {onNavigateToStudent && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToStudent(scanResult.student.id);
                      }}
                      className="px-3 py-1 bg-black text-[#FACC15] hover:bg-stone-800 rounded-lg text-xs font-bold shadow-xs flex items-center gap-1 active:scale-95"
                    >
                      <span>🎓 ดูหน้ากิจกรรมของ {scanResult.student.name.split(' ')[0]} ↗</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {scanResult.cardSource && (
              <span className="hidden sm:inline-block text-[10px] font-black px-2 py-1 rounded bg-black/10 border border-black/20">
                {scanResult.cardSource === 'physical' ? '💳 เครื่องสแกน' :
                 scanResult.cardSource === 'digital' ? '📱 กล้อง/QR' : '⌨️ กรอกรหัส'}
              </span>
            )}
            <span className="text-[10px] font-bold opacity-60">แตะเพื่อปิด</span>
          </div>
        </div>
      )}

      {/* Main Responsive Grid: Left Scanner (7 Cols) & Right Live Stream (5 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Left Scanner Control (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Two check-in paths */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { ++manualLookupRequestRef.current; setMode('camera'); setManualCandidate(null); setManualLookupError(''); setManualLookingUp(false); }}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all border-2 border-[#18181B] min-h-[44px] ${
                mode !== 'manual'
                  ? 'bg-[#FACC15] text-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)]'
                  : 'bg-white text-stone-600 hover:bg-[#FAF7F0]'
              }`}
            >
              <Camera className="w-4 h-4 shrink-0" />
              <span>มีบัตร: สแกน</span>
            </button>
            <button
              onClick={() => { ++manualLookupRequestRef.current; setMode('manual'); setManualCandidate(null); setManualLookupError(''); setManualLookingUp(false); }}
              className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all border-2 border-[#18181B] min-h-[44px] ${
                mode === 'manual'
                  ? 'bg-[#FACC15] text-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)]'
                  : 'bg-white text-stone-600 hover:bg-[#FAF7F0]'
              }`}
            >
              <Keyboard className="w-4 h-4 shrink-0" />
              <span>ไม่มีบัตร: กรอกรหัส</span>
            </button>
          </div>

          {mode !== 'manual' && (
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="text-stone-600">อุปกรณ์สแกน:</span>
              <button type="button" onClick={() => setMode('camera')}
                className={`min-h-11 px-3 rounded-lg border-2 border-[#18181B] ${mode === 'camera' ? 'bg-[#18181B] text-white' : 'bg-white text-[#18181B]'}`}>
                กล้องมือถือ/เว็บแคม
              </button>
              <button type="button" onClick={() => setMode('usb')}
                className={`min-h-11 px-3 rounded-lg border-2 border-[#18181B] ${mode === 'usb' ? 'bg-[#18181B] text-white' : 'bg-white text-[#18181B]'}`}>
                เครื่องสแกน USB
              </button>
            </div>
          )}

          {/* Scanner Viewport Box */}
          <div className="bg-white rounded-xl border-2 border-[#18181B] p-5 sm:p-7 text-center min-h-[350px] flex flex-col items-center justify-center shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] relative overflow-hidden">
            
            {mode === 'manual' ? (
              <div className="w-full max-w-md space-y-4 text-left">
                <div className="text-center space-y-1">
                  <div className="w-14 h-14 rounded-xl bg-[#FACC15] border-2 border-[#18181B] flex items-center justify-center mx-auto">
                    <Keyboard className="w-7 h-7" />
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-[#18181B]">นักศึกษาไม่มีบัตร</h3>
                  <p className="text-sm text-stone-600">กรอกรหัส 12 หลัก แล้วตรวจสอบชื่อและข้อมูลนักศึกษาก่อนยืนยัน</p>
                </div>
                <form onSubmit={handleManualLookup} className="space-y-3">
                  <label htmlFor="manual-student-id" className="block text-sm font-bold text-stone-900">รหัสนักศึกษา</label>
                  <input id="manual-student-id" type="text" inputMode="numeric" autoComplete="off" maxLength={12}
                    value={manualInput}
                    onChange={(e) => { ++manualLookupRequestRef.current; setManualInput(e.target.value.replace(/\D/g, '').slice(0, 12)); setManualCandidate(null); setManualLookupError(''); setManualLookingUp(false); }}
                    placeholder="กรอกรหัสนักศึกษา 12 หลัก"
                    className="w-full min-h-12 px-4 bg-[#FAF7F0] border-2 border-[#18181B] rounded-xl text-base font-mono font-bold text-[#18181B] outline-none focus:ring-4 focus:ring-[#FACC15]"
                  />
                  <button type="submit" disabled={manualLookingUp || selectedActivityObj?.status !== 'active'}
                    className="w-full min-h-12 px-4 bg-[#18181B] text-[#FACC15] rounded-xl font-bold disabled:opacity-50">
                    {manualLookingUp ? 'กำลังตรวจสอบรายชื่อ...' : 'ค้นหารายชื่อนักศึกษา'}
                  </button>
                </form>
                {manualLookupError && <p role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-400 text-rose-900 text-sm font-bold">{manualLookupError}</p>}
                {manualCandidate && manualCandidate.activityId === selectedActivityId && (
                  <div className="space-y-3 rounded-xl border-2 border-[#18181B] bg-amber-50 p-4" aria-live="polite">
                    <p className="text-sm font-black text-stone-900">ตรวจสอบตัวตนก่อนบันทึก</p>
                    <div className="text-sm text-stone-900 space-y-1 break-words">
                      <p><strong>ชื่อ:</strong> {manualCandidate.student.name}</p>
                      <p><strong>รหัส:</strong> {manualCandidate.student.id}</p>
                      <p><strong>สาขา:</strong> {manualCandidate.student.major || 'ไม่ระบุ'}</p>
                      <p><strong>ชั้นปี:</strong> {manualCandidate.student.year || 'ไม่ระบุ'}</p>
                      <p><strong>กิจกรรม:</strong> {selectedActivityObj?.name}</p>
                    </div>
                    <p className="text-xs text-stone-700">สอบถามชื่อ–รหัสจากนักศึกษา และเปรียบเทียบกับข้อมูลข้างต้น</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button type="button" onClick={() => { setManualCandidate(null); setManualInput(''); }}
                        className="min-h-12 rounded-xl border-2 border-[#18181B] bg-white px-3 font-bold text-sm">ข้อมูลไม่ตรง / ยกเลิก</button>
                      <button type="button" onClick={handleManualConfirm}
                        className="min-h-12 rounded-xl border-2 border-[#18181B] bg-emerald-500 px-3 font-black text-sm text-white">ข้อมูลตรง ยืนยันเช็กอิน</button>
                    </div>
                  </div>
                )}
              </div>
            ) : mode === 'usb' ? (
              <div className="w-full max-w-md space-y-4">
                
                <div className="w-14 h-14 rounded-xl bg-[#FACC15] border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center mx-auto">
                  <Zap className="w-7 h-7 text-[#18181B]" />
                </div>
                
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#18181B]">
                    พร้อมรับรหัสนักศึกษา
                  </h3>
                  <p className="text-xs text-stone-600 font-medium mt-1">
                    ใช้เครื่องยิงบาร์โค้ดยิงหลัง <strong>บัตรนักศึกษาจริง</strong> หรือ <strong>บัตรดิจิทัลบนมือถือ</strong> ได้ทันที
                  </p>
                </div>

                {/* Visible, high-contrast, permanent auto-focus input bar */}
                <form onSubmit={handleUSBScan} className="w-full space-y-2">
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onBlur={() => {
                        // Quick auto-refocus if in USB mode
                        if (mode === 'usb' && isScanningMode) {
                          setTimeout(() => inputRef.current?.focus(), 50);
                        }
                      }}
                      placeholder="ยิงบาร์โค้ดที่นี่ (เคอร์เซอร์กระพริบพร้อมรับค่า)..."
                      className="w-full py-3.5 px-4 bg-[#FAF7F0] border-2 border-[#18181B] rounded-xl text-center text-sm sm:text-base font-mono font-black text-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:ring-4 focus:ring-[#FACC15]"
                      autoFocus
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    </div>
                  </div>
                  <div className="text-[11px] text-stone-500 font-bold flex items-center justify-center gap-1.5">
                    <span className="text-emerald-700">ยิงบาร์โค้ดแล้วระบบบันทึกให้อัตโนมัติ</span>
                  </div>
                </form>

              </div>
            ) : (
              <div className="w-full max-w-md space-y-3">
                
                {/* Camera Container always rendered in DOM */}
                <div className={`space-y-3 ${cameraError ? 'hidden' : 'block'}`}>
                  
                  {/* Camera Top Controls Bar */}
                  <div className="flex items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-stone-700 flex items-center gap-1">
                        <Camera className="w-3.5 h-3.5 text-[#18181B]" />
                        <span>กล้องสแกนเนอร์</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Torch Button */}
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`px-2.5 py-1.5 rounded-lg border-2 border-[#18181B] text-xs font-bold flex items-center gap-1 transition-all shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] min-h-[36px] ${
                          isTorchOn ? 'bg-[#FACC15] text-[#18181B]' : 'bg-white text-stone-700 hover:bg-stone-100'
                        }`}
                        title="เปิด/ปิดไฟฉายช่วยส่อง"
                      >
                        <Flashlight className={`w-3.5 h-3.5 ${isTorchOn ? 'text-[#18181B]' : 'text-stone-500'}`} />
                        <span>{isTorchOn ? 'ปิดไฟ' : 'เปิดไฟฉาย'}</span>
                      </button>

                      {/* Flip Camera Button */}
                      <button
                        type="button"
                        onClick={flipCamera}
                        className="px-2.5 py-1.5 bg-white hover:bg-stone-100 border-2 border-[#18181B] text-stone-800 text-xs font-bold rounded-lg transition-all shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1 min-h-[36px]"
                        title="สลับกล้องหน้า/หลัง"
                      >
                        <SwitchCamera className="w-3.5 h-3.5 text-[#18181B]" />
                        <span>สลับกล้อง</span>
                      </button>
                    </div>
                  </div>

                  {/* Camera Viewfinder with Target Frame */}
                  <div className="relative aspect-[4/3] sm:aspect-video max-w-[340px] mx-auto rounded-xl overflow-hidden bg-black border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(24,24,27,1)]">
                    <div id="camera-stream-reader" className="w-full h-full object-cover"></div>
                    
                    {cameraLoading && (
                      <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-[#FACC15] gap-2 z-10">
                        <RefreshCw className="w-6 h-6 animate-spin text-[#FACC15]" />
                        <span className="text-xs font-bold">กำลังเปิดการทำงานของกล้อง...</span>
                      </div>
                    )}

                    {/* Laser Viewfinder Visual Overlay */}
                    <div className="absolute inset-0 pointer-events-none m-4 rounded-xl border-2 border-dashed border-[#FACC15]/80 flex flex-col items-center justify-center">
                      <div className="w-full h-0.5 bg-rose-500/80 shadow-[0_0_8px_rgba(244,63,94,1)] animate-pulse" />
                      <span className="text-[10px] text-[#18181B] bg-[#FACC15] px-2 py-0.5 rounded font-black border border-[#18181B] mt-auto mb-2 shadow-sm">
                        นำแถบบาร์โค้ดหรือ QR Code มาวางตรงกลาง
                      </span>
                    </div>
                  </div>

                  {/* Mobile Actions: Direct Camera Snapshot & File */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      onClick={() => directCameraInputRef.current?.click()}
                      className="px-3.5 py-2 bg-[#FACC15] hover:bg-amber-400 text-[#18181B] text-xs font-bold border-2 border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded-xl transition-all flex items-center gap-1.5 min-h-[44px]"
                    >
                      <Camera className="w-4 h-4 text-[#18181B]" />
                      <span>ถ่ายรูปสแกนด่วน (กล้องมือถือ)</span>
                    </button>
                    <input 
                      ref={directCameraInputRef} 
                      type="file" 
                      accept="image/*" 
                      capture="environment" 
                      onChange={handleFileScan} 
                      className="hidden" 
                    />

                    <button
                      onClick={() => startCamera(selectedCameraId)}
                      className="px-3 py-2 bg-white hover:bg-stone-100 text-[#18181B] text-xs font-bold border-2 border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] rounded-xl transition-all flex items-center gap-1.5 min-h-[44px]"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#18181B]" />
                      <span>รีสตาร์ท</span>
                    </button>

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-2 bg-[#FAF7F0] hover:bg-amber-100 text-[#18181B] border-2 border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 min-h-[44px]"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-[#18181B]" />
                      <span>เลือกภาพ</span>
                    </button>
                    <input 
                      ref={fileInputRef} 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileScan} 
                      className="hidden" 
                    />
                  </div>
                </div>

                {/* Camera Error / Permission Guide Banner */}
                {cameraError && (
                  <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl text-left space-y-3 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)]">
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
                        <VideoOff className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-900">ไม่สามารถเชื่อมต่อกล้องสดได้</h4>
                        <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">
                          {cameraError}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        onClick={() => directCameraInputRef.current?.click()}
                        className="py-2.5 px-3.5 bg-[#FACC15] hover:bg-amber-400 text-[#18181B] text-xs font-bold rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-1.5 min-h-[44px]"
                      >
                        <Camera className="w-4 h-4" />
                        <span>ถ่ายรูปสแกนด่วน</span>
                      </button>
                      <button
                        onClick={() => setMode('usb')}
                        className="flex-1 py-2.5 px-3 bg-[#18181B] hover:bg-stone-800 text-[#FACC15] text-xs font-bold rounded-xl border-2 border-[#18181B] shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all text-center min-h-[44px]"
                      >
                        สลับไปโหมดเครื่องยิง
                      </button>
                      <button
                        onClick={() => startCamera()}
                        className="px-3 py-2.5 bg-white border-2 border-[#18181B] text-[#18181B] text-xs font-bold rounded-xl shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-stone-50 min-h-[44px]"
                      >
                        ลองใหม่
                      </button>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>

          {mode === 'usb' && (
            <div className="text-[11px] text-stone-500 flex items-center justify-between px-2 font-medium gap-2">
              <span>สแกนต่อเนื่องได้ เมื่อได้ยินเสียงตอบรับให้ดูผลการบันทึกบนหน้าจอ</span>
              <button type="button" onClick={() => inputRef.current?.focus()}
                className="text-[#18181B] font-bold hover:underline shrink-0">พร้อมสแกน</button>
            </div>
          )}

        </div>

        {/* Right Live Stream Feed (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border-2 border-[#18181B] p-4 sm:p-5 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)]">
            <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-stone-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#18181B]" />
                <h3 className="text-xs sm:text-sm font-black text-[#18181B]">
                  รายการเช็กอินล่าสุด
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-stone-500">
                  {sessionLogs.length} รายการ
                </span>
                <button 
                  onClick={() => selectedActivityId && loadSessionLogs(selectedActivityId)}
                  className="p-1 text-stone-500 hover:text-[#18181B] rounded-lg hover:bg-stone-100 transition-colors"
                  title="รีเฟรชรายชื่อ"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Filter Tabs for All vs Invalid Data (Post-Event & Reporting Requirement) */}
            <div className="flex items-center gap-1.5 mb-2.5 pb-2 border-b border-stone-200">
              <button
                type="button"
                onClick={() => setLogFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  logFilter === 'all'
                    ? 'bg-[#18181B] text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                ทั้งหมด ({sessionLogs.length})
              </button>
              <button
                type="button"
                onClick={() => setLogFilter('invalid')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                  logFilter === 'invalid'
                    ? 'bg-amber-500 text-white'
                    : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
                }`}
                title="นักศึกษาที่คีย์ Manual หน้างานแต่ยังไม่อัปโหลดรูป/ไม่มี Digital ID"
              >
                <span>⚠️ ข้อมูลไม่สมบูรณ์</span>
                <span className="px-1.5 py-0.2 bg-black/10 rounded text-[10px] font-black">
                  {sessionLogs.filter(l => l.isTemporary).length}
                </span>
              </button>
            </div>

            {sessionLogs.length === 0 ? (
              <div className="text-center py-12 px-4 border-2 border-dashed border-stone-200 rounded-xl">
                <div className="w-10 h-10 rounded-xl bg-[#FAF7F0] border border-[#18181B] text-stone-400 flex items-center justify-center mx-auto mb-2 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                  <Users className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-stone-700">ยังไม่มีประวัติการสแกนในรอบนี้</div>
                <p className="text-[11px] text-stone-400 mt-0.5 font-medium">
                  เมื่อบันทึกเช็กอินสำเร็จ รายชื่อจะปรากฏที่นี่
                </p>
              </div>
            ) : logFilter === 'invalid' && sessionLogs.filter(l => l.isTemporary).length === 0 ? (
              <div className="text-center py-8 px-4 border-2 border-dashed border-emerald-200 bg-emerald-50/50 rounded-xl">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-1.5" />
                <div className="text-xs font-bold text-emerald-900">ไม่มีข้อมูลที่ผิดปกติหรือขาดรูปถ่าย</div>
                <p className="text-[11px] text-emerald-700 mt-0.5 font-medium">
                  นักศึกษาทุกคนที่สแกนในรอบนี้มีข้อมูลและบัตรดิจิทัลสมบูรณ์ครบถ้วน
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {(logFilter === 'invalid' ? sessionLogs.filter(l => l.isTemporary) : sessionLogs).map((log, idx) => (
                  <div 
                    key={log.id}
                    className={`p-3 rounded-xl border-2 border-[#18181B] transition-all flex items-center justify-between gap-2 ${
                      idx === 0 
                        ? 'bg-amber-50 shadow-[2px_2px_0px_0px_rgba(24,24,27,1)] border-[#EA580C]' 
                        : 'bg-[#FAF7F0] hover:bg-white shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-black w-4 ${idx === 0 ? 'text-[#EA580C]' : 'text-stone-400'}`}>
                          {idx + 1}.
                        </span>
                        <span className="font-bold text-xs text-[#18181B] truncate">
                          {log.studentName}
                        </span>
                        {idx === 0 && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-black border border-emerald-300">
                            ล่าสุด
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-stone-500 font-mono pl-5 truncate flex items-center gap-1.5 flex-wrap">
                        <span>{log.studentId} • {log.major || 'คณะครุศาสตร์'}</span>
                        {log.scannerStation && (
                          <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-900 border border-amber-300 font-bold text-[9px]">
                            {log.scannerStation}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0 flex flex-col items-end">
                      <span className="text-[10px] font-mono font-bold text-stone-600 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-stone-400" />
                        {new Date(log.timestamp).toLocaleTimeString('th-TH')}
                      </span>
                      <div className="mt-1">
                        {log.isTemporary ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-black border border-amber-300 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                            ⚠️ ฉุกเฉิน (รอรูป)
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white text-[#18181B] font-bold border border-[#18181B] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                            {log.method === 'camera' ? '📱 กล้อง/QR' : log.method === 'usb' ? '💳 เครื่องสแกน' : '⌨️ กรอกรหัส'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
