import React, { useState, useEffect } from 'react';
import { db } from '../db/db';
import { getSupabaseClient, resetSupabaseClient, checkSupabaseHealth, SupabaseHealthCheck, getSupabaseConfig } from '../lib/supabase';
import { exportDatabaseToExcel } from '../utils/exportUtils';
import { 
  Database, 
  Link as LinkIcon, 
  Check, 
  Save, 
  Copy, 
  AlertCircle, 
  RefreshCw, 
  Server, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  XCircle, 
  HelpCircle,
  X,
  ShieldCheck,
  HardDrive
} from 'lucide-react';

interface SupabaseSettingsProps {
  onClose?: () => void;
}

export const SupabaseSettings: React.FC<SupabaseSettingsProps> = ({ onClose }) => {
  const [supabaseUrl, setSupabaseUrl] = useState('');
  const [supabaseAnonKey, setSupabaseAnonKey] = useState('');
  
  const [isCopied, setIsCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [healthStatus, setHealthStatus] = useState<SupabaseHealthCheck | null>(null);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' });
  
  const [isConnected, setIsConnected] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Local Storage Database counts
  const [localCounts, setLocalCounts] = useState<{
    students: number;
    activities: number;
    checkInLogs: number;
    reflections: number;
  }>({
    students: 0,
    activities: 0,
    checkInLogs: 0,
    reflections: 0
  });

  // Concurrency Load Test State

  const loadLocalCounts = async () => {
    try {
      const [sCount, aCount, cCount, rCount] = await Promise.all([
        db.students.count(),
        db.activities.count(),
        db.checkInLogs.count(),
        db.reflections.count()
      ]);
      setLocalCounts({
        students: sCount,
        activities: aCount,
        checkInLogs: cCount,
        reflections: rCount
      });
    } catch (e) {
      console.error('Error loading local counts:', e);
    }
  };

  useEffect(() => {
    loadLocalCounts();
    const { url, key } = getSupabaseConfig();
    setSupabaseUrl(url);
    setSupabaseAnonKey(key);
    
    if (url && key && getSupabaseClient()) {
      setIsConnected(true);
      // Auto run diagnostic on mount if configured
      checkSupabaseHealth().then(res => {
        setHealthStatus(res);
        setIsConnected(res.connected);
      });
    }
  }, []);

  const handleTestConnection = async () => {
    setSyncStatus({ type: null, message: '' });

    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setSyncStatus({ 
        type: 'error', 
        message: 'กรุณากรอก Project URL และ API Key (anon public) ในส่วนข้อมูลการเชื่อมต่อด้านล่าง ก่อนกดตรวจสอบตาราง' 
      });
      setHealthStatus({
        connected: false,
        message: 'ยังไม่ได้ระบุ Project URL และ API Key',
        tables: { students: false, activities: false, check_in_logs: false, reflections: false },
        allTablesExist: false,
        details: 'กรุณากรอก Project URL และ API Key (anon public) ในช่องข้อมูลการเชื่อมต่อด้านล่าง'
      });
      const el = document.getElementById('supabase-credentials-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        el.classList.add('ring-2', 'ring-amber-500');
        setTimeout(() => el.classList.remove('ring-2', 'ring-amber-500'), 2500);
      }
      return;
    }

    setIsTesting(true);
    try {
      // Save current input temporarily to test
      localStorage.setItem('supabaseUrl', supabaseUrl.trim());
      localStorage.setItem('supabaseAnonKey', supabaseAnonKey.trim());
      resetSupabaseClient();

      const result = await checkSupabaseHealth();
      setHealthStatus(result);
      setIsConnected(result.connected);

      if (result.allTablesExist) {
        setSyncStatus({ 
          type: 'success', 
          message: 'ยอดเยี่ยม! เชื่อมต่อ Supabase สำเร็จและพบโครงสร้างตารางครบถ้วนทั้ง 4 ตาราง พร้อมรับข้อมูล' 
        });
      } else if (result.connected) {
        setSyncStatus({ 
          type: 'error', 
          message: result.message || 'เชื่อมต่อโฮสต์ได้ แต่ยังพบตารางไม่ครบถ้วน กรุณารันคำสั่ง SQL ด้านล่าง' 
        });
      } else {
        setSyncStatus({ 
          type: 'error', 
          message: result.message || 'ไม่พบฐานข้อมูล Supabase กรุณาตรวจสอบ URL หรือสร้างตารางผ่าน SQL Editor' 
        });
      }
    } catch (err: any) {
      setSyncStatus({ 
        type: 'error', 
        message: 'การทดสอบล้มเหลว: ' + (err.message || 'Network Error') 
      });
    } finally {
      setIsTesting(false);
      loadLocalCounts();
    }
  };

  const handleSaveCredentials = async () => {
    setIsSaving(true);
    setSyncStatus({ type: null, message: '' });
    
    try {
      localStorage.setItem('supabaseUrl', supabaseUrl.trim());
      localStorage.setItem('supabaseAnonKey', supabaseAnonKey.trim());
      resetSupabaseClient();
      
      if (supabaseUrl.trim() && supabaseAnonKey.trim()) {
        const health = await checkSupabaseHealth();
        setHealthStatus(health);
        setIsConnected(health.connected);
        
        if (health.allTablesExist) {
          setSyncStatus({ type: 'success', message: 'บันทึกและเชื่อมต่อ Supabase เรียบร้อยแล้ว (พบตารางครบถ้วน)' });
        } else if (!health.tables.students && !health.tables.activities) {
          setSyncStatus({ 
            type: 'error', 
            message: 'บันทึกสำเร็จ แต่ยังไม่พบตารางในฐานข้อมูล กรุณาคัดลอกสคริปต์ SQL ด้านล่างไปรันใน Supabase SQL Editor' 
          });
        } else {
          setSyncStatus({ type: 'success', message: 'บันทึกการเชื่อมต่อเรียบร้อยแล้ว' });
        }
      } else {
        setIsConnected(false);
        setHealthStatus(null);
        setSyncStatus({ type: 'success', message: 'ยกเลิกการเชื่อมต่อเรียบร้อยแล้ว' });
      }
    } catch (err: any) {
      setSyncStatus({ type: 'error', message: err.message || 'เกิดข้อผิดพลาดในการบันทึก' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_TEMPLATE);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 3000);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const filename = await exportDatabaseToExcel();
      setSyncStatus({ type: 'success', message: `ดาวน์โหลดไฟล์ Excel (${filename}) สำเร็จเรียบร้อย` });
    } catch (err: any) {
      setSyncStatus({ type: 'error', message: 'ดาวน์โหลดไฟล์ล้มเหลว: ' + err.message });
    } finally {
      setIsExporting(false);
      setTimeout(() => setSyncStatus({ type: null, message: '' }), 4000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      
      {/* Header Info */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 shadow-inner">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900">ฐานข้อมูล Supabase (PostgreSQL Cloud)</h2>
                <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${
                  healthStatus?.allTablesExist
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : isConnected
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {healthStatus?.allTablesExist 
                    ? '🟡 พบตารางครบ (ยังต้องตรวจสิทธิ์)'
                    : isConnected 
                    ? '🟡 เชื่อมต่อแล้ว (ตรวจตาราง)' 
                    : '⚪ ยังไม่เชื่อมต่อ'}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                ระบบจัดเก็บข้อมูลแบบ Relational Database ความเร็วสูง รองรับการสแกนเช็คอินหลายจุดพร้อมกัน และพร้อมย้ายกลับสู่ Server ภายในมหาวิทยาลัยในอนาคต
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Database Diagnostics Box */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-600" />
              สถานะการตรวจเช็คฐานข้อมูลและโครงสร้างตาราง (Database Health)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              กดตรวจสอบเพื่อดูว่า Supabase ของคุณมีตารางครบ 4 ตารางพร้อมรับข้อมูลหรือไม่
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopySql}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all shadow-xs"
              title="คัดลอกคำสั่ง SQL สำหรับสร้างตาราง"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{isCopied ? 'คัดลอกแล้ว' : 'คัดลอก SQL 4 ตาราง'}</span>
            </button>
            <button
              onClick={handleTestConnection}
              disabled={isTesting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 disabled:opacity-50"
            >
              {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span>ตรวจสอบการเชื่อมต่อและตาราง</span>
            </button>
          </div>
        </div>

        {/* 1. Local Database Status (Always Ready) */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-slate-800">ฐานข้อมูลในเครื่อง (Local Database / IndexedDB)</span>
            </div>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-full inline-flex items-center gap-1 self-start sm:self-auto">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              4 ตารางพร้อมรับข้อมูลในเครื่อง 100% (ทำงาน Offline ได้)
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-white p-2 rounded-xl border border-slate-200 text-center">
              <div className="text-[10px] text-slate-500 font-medium">students</div>
              <div className="text-xs font-black text-slate-800">{localCounts.students.toLocaleString()} คน</div>
            </div>
            <div className="bg-white p-2 rounded-xl border border-slate-200 text-center">
              <div className="text-[10px] text-slate-500 font-medium">activities</div>
              <div className="text-xs font-black text-slate-800">{localCounts.activities.toLocaleString()} กิจกรรม</div>
            </div>
            <div className="bg-white p-2 rounded-xl border border-slate-200 text-center">
              <div className="text-[10px] text-slate-500 font-medium">check_in_logs</div>
              <div className="text-xs font-black text-slate-800">{localCounts.checkInLogs.toLocaleString()} รายการ</div>
            </div>
            <div className="bg-white p-2 rounded-xl border border-slate-200 text-center">
              <div className="text-[10px] text-slate-500 font-medium">reflections</div>
              <div className="text-xs font-black text-slate-800">{localCounts.reflections.toLocaleString()} รายการ</div>
            </div>
          </div>
        </div>

        {/* 2. Supabase Cloud Database Status (4 Tables Checklist) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-600" />
              สถานะ 4 ตารางบน Supabase Cloud (PostgreSQL)
            </span>
            <span className="text-[11px] text-slate-500 font-medium">
              {!healthStatus 
                ? 'กดปุ่ม "ตรวจสอบการเชื่อมต่อและตาราง" เพื่อเริ่มตรวจ' 
                : healthStatus.allTablesExist 
                ? '✅ ครบถ้วนทั้ง 4 ตาราง' 
                : '⚠️ ยังมีตารางไม่ครบถ้วน'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* 1. students */}
            <div className={`p-3 rounded-2xl border text-center transition-all ${
              !healthStatus
                ? 'bg-slate-50/70 border-slate-200 text-slate-600'
                : healthStatus.tables.students 
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 shadow-xs' 
                : 'bg-rose-50/70 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                {!healthStatus ? (
                  <div className="w-4 h-4 rounded-full border-2 border-dashed border-slate-300 shrink-0" />
                ) : healthStatus.tables.students ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <span className="text-xs font-mono font-bold">students</span>
              </div>
              <div className="text-[11px] text-slate-500">
                {!healthStatus 
                  ? '⚪ รอการกดตรวจ' 
                  : healthStatus.tables.students 
                  ? '✅ พบตารางแล้ว' 
                  : '❌ ยังไม่พบตาราง'}
              </div>
            </div>

            {/* 2. activities */}
            <div className={`p-3 rounded-2xl border text-center transition-all ${
              !healthStatus
                ? 'bg-slate-50/70 border-slate-200 text-slate-600'
                : healthStatus.tables.activities 
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 shadow-xs' 
                : 'bg-rose-50/70 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                {!healthStatus ? (
                  <div className="w-4 h-4 rounded-full border-2 border-dashed border-slate-300 shrink-0" />
                ) : healthStatus.tables.activities ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <span className="text-xs font-mono font-bold">activities</span>
              </div>
              <div className="text-[11px] text-slate-500">
                {!healthStatus 
                  ? '⚪ รอการกดตรวจ' 
                  : healthStatus.tables.activities 
                  ? '✅ พบตารางแล้ว' 
                  : '❌ ยังไม่พบตาราง'}
              </div>
            </div>

            {/* 3. check_in_logs */}
            <div className={`p-3 rounded-2xl border text-center transition-all ${
              !healthStatus
                ? 'bg-slate-50/70 border-slate-200 text-slate-600'
                : healthStatus.tables.check_in_logs 
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 shadow-xs' 
                : 'bg-rose-50/70 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                {!healthStatus ? (
                  <div className="w-4 h-4 rounded-full border-2 border-dashed border-slate-300 shrink-0" />
                ) : healthStatus.tables.check_in_logs ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <span className="text-xs font-mono font-bold">check_in_logs</span>
              </div>
              <div className="text-[11px] text-slate-500">
                {!healthStatus 
                  ? '⚪ รอการกดตรวจ' 
                  : healthStatus.tables.check_in_logs 
                  ? '✅ พบตารางแล้ว' 
                  : '❌ ยังไม่พบตาราง'}
              </div>
            </div>

            {/* 4. reflections */}
            <div className={`p-3 rounded-2xl border text-center transition-all ${
              !healthStatus
                ? 'bg-slate-50/70 border-slate-200 text-slate-600'
                : healthStatus.tables.reflections 
                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-900 shadow-xs' 
                : 'bg-rose-50/70 border-rose-200 text-rose-900'
            }`}>
              <div className="flex items-center justify-center gap-1.5 mb-1">
                {!healthStatus ? (
                  <div className="w-4 h-4 rounded-full border-2 border-dashed border-slate-300 shrink-0" />
                ) : healthStatus.tables.reflections ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                )}
                <span className="text-xs font-mono font-bold">reflections</span>
              </div>
              <div className="text-[11px] text-slate-500">
                {!healthStatus 
                  ? '⚪ รอการกดตรวจ' 
                  : healthStatus.tables.reflections 
                  ? '✅ พบตารางแล้ว' 
                  : '❌ ยังไม่พบตาราง'}
              </div>
            </div>
          </div>
        </div>

        {/* All tables exist celebration */}
        {healthStatus?.allTablesExist && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-950 text-xs leading-relaxed space-y-1">
            <div className="font-bold flex items-center gap-2 text-sm text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              พบโครงสร้างตารางครบ 4 ตาราง
            </div>
            <p className="text-emerald-800">
              ยังต้องทดสอบสิทธิ์ผู้ใช้ การบันทึกข้อมูลและรูปภาพ รวมถึงการซิงก์ข้ามอุปกรณ์ก่อนเปิดใช้งานจริง
            </p>
          </div>
        )}

        {/* Alert Guide if tables not found */}
        {healthStatus && !healthStatus.allTablesExist && (
          <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-amber-950 text-xs leading-relaxed space-y-2">
            <div className="font-bold flex items-center justify-between gap-2 text-sm text-amber-900">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                {healthStatus.connected 
                  ? 'เชื่อมต่อ Supabase ได้แล้ว แต่ยังไม่มีตาราง หรือตารางไม่ครบทั้ง 4 ตาราง'
                  : 'ยังไม่ได้เชื่อมต่อ Supabase หรือไม่พบตาราง'}
              </div>
              <button
                onClick={handleCopySql}
                className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
              >
                {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'คัดลอกแล้ว' : 'คัดลอก SQL ทันที'}</span>
              </button>
            </div>
            <p className="text-slate-700">
              เมื่อสร้างโปรเจกต์ Supabase ใหม่ จะยังไม่มีตารางเก็บข้อมูล กรุณาทำตาม 3 ขั้นตอนด้านล่างนี้ (ใช้เวลาเพียง 1 นาที):
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-slate-800 pl-1 font-medium">
              <li>
                กดปุ่ม <span className="font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">"คัดลอก SQL ทันที"</span> เพื่อคัดลอกสคริปต์สร้างทั้ง 4 ตาราง
              </li>
              <li>
                เปิดไปที่ <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-700 font-bold underline inline-flex items-center gap-1">Supabase Dashboard <ExternalLink className="w-3 h-3" /></a> แล้วคลิกที่เมนู <strong>SQL Editor</strong> ทางด้านซ้ายมือ
              </li>
              <li>
                กดปุ่ม <strong>New Query</strong> นำโค้ดที่คัดลอกไปวาง แล้วกดปุ่ม <strong>Run</strong> (สีเขียว)
              </li>
              <li>
                เมื่อขึ้น <em>Success</em> ให้กลับมากดปุ่ม <strong>"ตรวจสอบการเชื่อมต่อและตาราง"</strong> ด้านบนนี้อีกครั้ง
              </li>
            </ol>
          </div>
        )}
      </div>

      {/* Connection Settings */}
      <div id="supabase-credentials-section" className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6 transition-all">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-emerald-600" />
            ข้อมูลการเชื่อมต่อ Supabase (API Credentials)
          </h3>
          <a
            href="https://supabase.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            <span>เปิด Supabase Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-bold text-slate-700">Project URL</label>
              <span className="text-[11px] text-slate-400">ดูได้จาก Project Settings → Data API</span>
            </div>
            <input 
              type="text" 
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              placeholder="https://xxxxxxxxxxxx.supabase.co"
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-800"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-bold text-slate-700">API Key (anon public)</label>
              <span className="text-[11px] text-slate-400">Project Settings → Data API → anon public</span>
            </div>
            <input 
              type="password" 
              value={supabaseAnonKey}
              onChange={(e) => setSupabaseAnonKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-mono text-slate-800"
            />
          </div>
        </div>

        {syncStatus.type && (
          <div className={`p-4 rounded-2xl text-xs font-bold flex items-start gap-2.5 transition-all ${
            syncStatus.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}>
            {syncStatus.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 leading-relaxed">{syncStatus.message}</div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleSaveCredentials}
            disabled={isSaving}
            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm active:scale-95"
          >
            {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            บันทึกการเชื่อมต่อ
          </button>

        </div>
      </div>

      {/* Local Data Actions */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Database className="w-5 h-5 text-amber-600" />
            จัดการข้อมูลในเครื่องและสำรองข้อมูล (Local Data & Excel)
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 active:scale-95"
          >
            {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            ดาวน์โหลดเป็น Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* SQL Setup Guide */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Server className="w-5 h-5 text-emerald-600" />
              คำสั่ง SQL สำหรับสร้างโครงสร้างตาราง (Supabase Schema SQL)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              สคริปต์นี้สร้างตารางและปิดสิทธิ์สาธารณะ ยังต้องกำหนดการเข้าสู่ระบบและสิทธิ์รายบทบาทก่อนใช้งานจริง
            </p>
          </div>
          <button
            onClick={handleCopySql}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0"
          >
            {isCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{isCopied ? 'คัดลอก SQL เรียบร้อยแล้ว!' : 'คัดลอกคำสั่ง SQL'}</span>
          </button>
        </div>
        
        <div className="relative rounded-2xl bg-[#0f172a] border border-slate-800 p-4 text-xs font-mono text-emerald-300 max-h-96 overflow-y-auto leading-relaxed shadow-inner">
          <pre>{SUPABASE_SQL_TEMPLATE}</pre>
        </div>
      </div>

    </div>
  );
};

const SUPABASE_SQL_TEMPLATE = `-- ==============================================================================
-- NPU Student Activity Management System - Supabase Schema (High-Concurrency)
-- Schema only. Capacity must be measured with a real load test before use.
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Create Students Table
CREATE TABLE IF NOT EXISTS public.students (
    id text PRIMARY KEY,
    name text NOT NULL,
    email text,
    faculty text,
    major text,
    year integer,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Activities Table
CREATE TABLE IF NOT EXISTS public.activities (
    id text PRIMARY KEY,
    name text NOT NULL,
    date text NOT NULL,
    end_date text,
    location text,
    description text,
    status text NOT NULL DEFAULT 'active',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Check-In Logs Table (High-Speed Multi-Scanner Support)
CREATE TABLE IF NOT EXISTS public.check_in_logs (
    id text PRIMARY KEY,
    student_id text NOT NULL,
    activity_id text NOT NULL,
    timestamp text NOT NULL,
    method text,
    status text NOT NULL DEFAULT 'checked_in',
    staff_status text NOT NULL DEFAULT 'verified',
    exec_status text NOT NULL DEFAULT 'pending',
    scanner_station text,
    student_note text,
    audit_trail jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Reflections Table
CREATE TABLE IF NOT EXISTS public.reflections (
    id text PRIMARY KEY,
    log_id text,
    student_id text NOT NULL,
    activity_id text NOT NULL,
    k_knowledge text,
    p_skill text,
    a_attitude text,
    moral text,
    feedback text,
    status text NOT NULL DEFAULT 'pending_step1',
    reject_reason text,
    submitted_at text NOT NULL,
    updated_at text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- High-Concurrency Indices & Race Condition Guard
-- ==============================================================================

-- Unique composite index: guarantees single check-in per student per activity across all devices
CREATE UNIQUE INDEX IF NOT EXISTS idx_check_in_logs_student_activity ON public.check_in_logs(student_id, activity_id);

-- Lookup indices for high-speed concurrent queries
CREATE INDEX IF NOT EXISTS idx_check_in_logs_activity ON public.check_in_logs(activity_id);
CREATE INDEX IF NOT EXISTS idx_check_in_logs_student ON public.check_in_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_check_in_logs_timestamp ON public.check_in_logs(timestamp DESC);

-- ==============================================================================
-- Row Level Security: deny anonymous access until authenticated roles are configured.
-- ==============================================================================

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_in_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reflections ENABLE ROW LEVEL SECURITY;

-- Remove legacy public policies. RLS with no permissive policy denies client access.
DROP POLICY IF EXISTS "Allow public access to students" ON public.students;

DROP POLICY IF EXISTS "Allow public access to activities" ON public.activities;

DROP POLICY IF EXISTS "Allow public access to check_in_logs" ON public.check_in_logs;

DROP POLICY IF EXISTS "Allow public access to reflections" ON public.reflections;

-- Do not grant access until Supabase Auth and role-specific RLS policies are installed.

-- ==============================================================================
-- Enable Realtime Sync for Multi-Device Simultaneous Scanning
-- ==============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.check_in_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reflections;
`;
