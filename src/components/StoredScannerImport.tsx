import React, { useRef, useState } from 'react';
import { getSupabaseClient } from '../lib/supabase';
import { pullScannerCheckInUpdates } from '../services/supabaseApi';
import { bangkokScanDate, recordActivityScan, type ScanDirection } from '../services/scanEventRepository';
import type { Activity } from '../types';
import { parseStoredScannerFile, parseStoredScannerText, type ParsedStoredScannerFile } from '../utils/storedScannerImport';

type PreviewRow = { studentId: string; name: string; status: 'ready' | 'unknown' | 'duplicate' };
type ImportResult = { saved: number; duplicate: number; unknown: number; failed: number; missingEntry: number };

interface StoredScannerImportProps {
  activity: Activity;
  scannerStation: string;
}

const chunks = <T,>(items: T[], size: number): T[][] => {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size));
  return result;
};

export const StoredScannerImport: React.FC<StoredScannerImportProps> = ({ activity, scannerStation }) => {
  const captureRef = useRef<HTMLTextAreaElement>(null);
  const captureDirtyRef = useRef(false);
  const [captureActive, setCaptureActive] = useState(false);
  const [sourceName, setSourceName] = useState('');
  const [parsed, setParsed] = useState<ParsedStoredScannerFile | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [direction, setDirection] = useState<ScanDirection>('check_in');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState('');

  const markCaptureChanged = () => {
    if (captureDirtyRef.current) return;
    captureDirtyRef.current = true;
    setParsed(null); setPreview(null); setResult(null); setError('');
  };

  const onFile = async (file?: File) => {
    if (!file) return;
    setError(''); setPreview(null); setResult(null); setParsed(null);
    if (captureRef.current) captureRef.current.value = '';
    captureDirtyRef.current = false;
    try {
      setParsed(await parseStoredScannerFile(file));
      setSourceName(file.name);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'อ่านไฟล์ไม่สำเร็จ');
    }
  };

  const usePastedText = () => {
    setError(''); setPreview(null); setResult(null);
    try {
      const value = parseStoredScannerText(captureRef.current?.value || '');
      if (!value.rows.length) throw new Error('ไม่พบรหัสนักศึกษา 12 หลัก กรุณาตรวจข้อมูลที่วาง');
      setParsed(value);
      setSourceName('ข้อมูลที่ส่งจากเครื่องหรือวาง');
      captureDirtyRef.current = false;
    } catch (cause) {
      setParsed(null);
      setError(cause instanceof Error ? cause.message : 'อ่านข้อมูลไม่สำเร็จ');
    }
  };

  const buildPreview = async () => {
    if (!parsed?.rows.length || busy) return;
    const client = getSupabaseClient();
    if (!client || !navigator.onLine) { setError('ต้องออนไลน์เพื่อตรวจสอบทะเบียนกลางก่อนนำเข้า'); return; }
    setBusy(true); setError(''); setPreview(null); setResult(null);
    setProgress('กำลังตรวจรายชื่อ...');
    try {
      const { data: liveActivity, error: activityError } = await client.from('activities')
        .select('id, status, scan_mode').eq('id', activity.id).single();
      if (activityError || !liveActivity || liveActivity.status !== 'active') throw new Error('กิจกรรมนี้ไม่ได้เปิดบันทึกในฐานข้อมูลกลาง');
      if ((liveActivity.scan_mode || 'single') !== (activity.scanMode || 'single')) throw new Error('วิธีสแกนของกิจกรรมเปลี่ยนแล้ว กรุณาเลือกกิจกรรมใหม่');
      const ids = parsed.rows.map(row => row.studentId);
      const studentRows: { id: string; name: string | null }[] = [];
      const existingIds = new Set<string>();
      const batches = chunks(ids, 100);
      for (let offset = 0; offset < batches.length; offset += 4) {
        const responses = await Promise.all(batches.slice(offset, offset + 4).map(async batch => Promise.all([
          client.from('students').select('id, name').in('id', batch),
          activity.scanMode === 'in_out'
            ? client.from('activity_scan_events').select('student_id').eq('activity_id', activity.id)
              .eq('scan_date', bangkokScanDate()).eq('scan_type', direction).in('student_id', batch)
            : client.from('check_in_logs').select('student_id').eq('activity_id', activity.id).in('student_id', batch)
        ])));
        for (const [students, existing] of responses) {
          if (students.error || existing.error) throw new Error('ตรวจสอบข้อมูลกลางไม่สำเร็จ กรุณาลองใหม่');
          studentRows.push(...(students.data || []));
          for (const row of existing.data || []) existingIds.add(row.student_id);
        }
        setProgress(`ตรวจแล้ว ${Math.min((offset + 4) * 100, ids.length).toLocaleString('th-TH')} / ${ids.length.toLocaleString('th-TH')} รายการ`);
      }
      const names = new Map(studentRows.map(row => [row.id, row.name?.trim() || '']));
      setPreview(parsed.rows.map(row => ({
        studentId: row.studentId,
        name: names.get(row.studentId) || '',
        status: !names.get(row.studentId) ? 'unknown' : existingIds.has(row.studentId) ? 'duplicate' : 'ready'
      })));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'ตรวจสอบข้อมูลไม่สำเร็จ');
    } finally { setBusy(false); setProgress(''); }
  };

  const importRows = async () => {
    if (!preview || busy) return;
    const client = getSupabaseClient();
    if (!client || !navigator.onLine) { setError('ต้องออนไลน์ขณะนำเข้าข้อมูล'); return; }
    setBusy(true); setError(''); setResult(null); setProgress('กำลังนำเข้า...');
    const counts: ImportResult = {
      saved: 0,
      duplicate: preview.filter(row => row.status === 'duplicate').length,
      unknown: preview.filter(row => row.status === 'unknown').length,
      failed: 0, missingEntry: 0
    };
    try {
      const { data: liveActivity, error: activityError } = await client.from('activities')
        .select('id, status, scan_mode').eq('id', activity.id).single();
      if (activityError || !liveActivity || liveActivity.status !== 'active' ||
          (liveActivity.scan_mode || 'single') !== (activity.scanMode || 'single')) {
        throw new Error('กิจกรรมปิดหรือเปลี่ยนวิธีสแกนแล้ว กรุณาตรวจสอบก่อนนำเข้า');
      }
      const ready = preview.filter(row => row.status === 'ready');
      const station = `นำเข้าจากเครื่องบันทึก · ${scannerStation}`.slice(0, 120);
      if (activity.scanMode === 'in_out') {
        // Reuse the same server-side checks and duplicate protection as live scanning.
        for (const [batchIndex, batch] of chunks<PreviewRow>(ready, 5).entries()) {
          const responses = await Promise.all(batch.map(async row => {
            try { return await recordActivityScan(activity.id, row.studentId, direction, 'usb', station); }
            catch { return { status: 'failed' as const }; }
          }));
          let activityChanged = false;
          for (const response of responses) {
            if (response.status === 'recorded') counts.saved++;
            else if (response.status === 'duplicate') counts.duplicate++;
            else if (response.status === 'unknown_student') counts.unknown++;
            else if (response.status === 'missing_check_in') counts.missingEntry++;
            else if (response.status === 'closed' || response.status === 'wrong_mode') activityChanged = true;
            else counts.failed++;
          }
          if (activityChanged) throw new Error('กิจกรรมปิดหรือเปลี่ยนวิธีสแกนระหว่างนำเข้า กรุณาตรวจผลที่บันทึกแล้ว');
          setProgress(`ส่งแล้ว ${Math.min((batchIndex + 1) * 5, ready.length).toLocaleString('th-TH')} / ${ready.length.toLocaleString('th-TH')} รายการ`);
        }
      } else {
        // Insert only. Never upsert or update an existing attendance record.
        for (const [batchIndex, batch] of chunks<PreviewRow>(ready, 50).entries()) {
          const payload = batch.map(row => ({
            id: `chk_${activity.id}_${row.studentId}`,
            activity_id: activity.id, student_id: row.studentId,
            timestamp: new Date().toISOString(), method: 'usb',
            staff_status: 'verified', exec_status: 'pending', scanner_station: station
          }));
          const { error: batchError } = await client.from('check_in_logs').insert(payload);
          if (!batchError) {
            counts.saved += batch.length;
            setProgress(`ส่งแล้ว ${Math.min((batchIndex + 1) * 50, ready.length).toLocaleString('th-TH')} / ${ready.length.toLocaleString('th-TH')} รายการ`);
            continue;
          }
          // A concurrent scanner may have inserted one ID. Retry individually so
          // all other IDs are still imported without replacing that record.
          if (batchError.code !== '23505') { counts.failed += batch.length; continue; }
          for (const record of payload) {
            const { error: rowError } = await client.from('check_in_logs').insert(record);
            if (!rowError) counts.saved++;
            else if (rowError.code === '23505') counts.duplicate++;
            else counts.failed++;
          }
          setProgress(`ส่งแล้ว ${Math.min((batchIndex + 1) * 50, ready.length).toLocaleString('th-TH')} / ${ready.length.toLocaleString('th-TH')} รายการ`);
        }
      }
      setResult(counts);
      setPreview(null);
    } catch (cause) {
      setResult(counts);
      if (counts.saved > 0) setPreview(null);
      setError(cause instanceof Error ? cause.message : 'นำเข้าข้อมูลไม่สำเร็จ');
    } finally {
      if (counts.saved > 0) {
        try { await pullScannerCheckInUpdates(activity.id); }
        catch (cause) { console.warn('Attendance refresh after import failed:', cause); }
        window.dispatchEvent(new Event('db_updated'));
      }
      setBusy(false); setProgress('');
    }
  };

  const readyCount = preview?.filter(row => row.status === 'ready').length || 0;

  return (
    <section className="space-y-4 rounded-xl border-2 border-[#18181B] bg-white p-4 font-['Prompt','Sarabun',sans-serif] sm:p-5" aria-label="นำเข้าจากเครื่องสแกนแบบมีหน่วยความจำ">
      <div>
        <h3 className="text-base font-bold text-[#0F172A]">นำเข้าจากเครื่องสแกนแบบมีหน่วยความจำ</h3>
        <p className="mt-1 text-sm text-stone-700">รุ่น TPD20BG: คลิกช่องรับข้อมูลด้านล่าง แล้วกด Upload Data บนเครื่อง รายการจะถูกพิมพ์เข้าช่องนี้ทีละรายการ</p>
        <p className="mt-1 text-xs text-stone-600">ถ้าเครื่องส่งข้อมูลเข้า Excel แทน ให้บันทึกเป็นไฟล์ Excel แล้วเลือกไฟล์ด้านล่าง ระบบจะไม่บันทึกเช็กอินอัตโนมัติระหว่างรับข้อมูล</p>
        <p className="mt-1 text-xs text-stone-600">กิจกรรม: {activity.name} · รายการใหม่ใช้เวลาที่นำเข้าเป็นเวลาบันทึก</p>
      </div>
      {activity.scanMode === 'in_out' && <fieldset>
        <legend className="mb-2 text-sm font-bold text-stone-900">ประเภทการสแกนในไฟล์นี้</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['check_in', 'check_out'] as const).map(value => <button key={value} type="button" disabled={busy}
            aria-pressed={direction === value}
            onClick={() => { setDirection(value); setPreview(null); setResult(null); }}
            className={`min-h-12 rounded-lg border-2 px-4 py-2 text-sm font-bold ${direction === value ? 'border-[#18181B] bg-[#2563EB] text-white' : 'border-stone-300 bg-white text-stone-800'}`}>
            {value === 'check_in' ? 'เช็กเข้า' : 'เช็กออก'}
          </button>)}
        </div>
      </fieldset>}
      <label className="block text-sm font-bold text-stone-900">
        ไฟล์จากเครื่อง (.txt, .csv, .xls, .xlsx; ไม่เกิน 2 MB)
        <input type="file" accept=".txt,.csv,.xls,.xlsx" disabled={busy}
          onChange={event => { void onFile(event.target.files?.[0]); event.target.value = ''; }}
          className="mt-2 block w-full min-w-0 rounded-lg border border-stone-300 bg-white p-2 text-sm" />
      </label>
      <div className="text-center text-xs text-stone-500">หรือ</div>
      <label className="block text-sm font-bold text-stone-900">
        รับข้อมูลจากเครื่อง / วางรหัส (หนึ่งรายการต่อบรรทัด)
        <textarea ref={captureRef} disabled={busy} rows={5} placeholder="คลิกที่นี่ แล้วกด Upload Data บนเครื่องสแกน"
          onFocus={() => setCaptureActive(true)} onBlur={() => setCaptureActive(false)}
          onInput={markCaptureChanged}
          onKeyDown={event => {
            if (event.key === 'Tab') {
              event.preventDefault();
              event.currentTarget.setRangeText('\n', event.currentTarget.selectionStart, event.currentTarget.selectionEnd, 'end');
              markCaptureChanged();
            }
          }}
          className="mt-2 w-full min-w-0 rounded-lg border border-stone-300 p-3 font-mono text-sm" />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => captureRef.current?.focus()} disabled={busy}
          className="min-h-12 rounded-lg border-2 border-[#18181B] bg-white px-6 py-3 text-sm font-bold disabled:opacity-50">{captureActive ? 'กำลังรับข้อมูลจากเครื่อง' : 'เริ่มรับข้อมูลจากเครื่อง'}</button>
        <button type="button" onClick={usePastedText} disabled={busy}
          className="min-h-12 rounded-lg bg-[#EA580C] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">ตรวจข้อมูลที่รับมา</button>
      </div>
      {progress && <p role="status" className="text-sm font-bold text-[#2563EB]">{progress}</p>}
      {parsed && <div className="space-y-2 rounded-lg bg-[#FAF9F6] p-3 text-sm text-stone-900">
        <p><strong>{sourceName}</strong>: รหัสไม่ซ้ำ {parsed.rows.length} รายการ · ซ้ำในไฟล์ {parsed.duplicateLines.length} · แถวที่อ่านไม่ได้ {parsed.invalidLines.length}</p>
        {parsed.invalidLines.length > 0 && <p className="text-xs text-amber-900">แถวที่อ่านไม่ได้: {parsed.invalidLines.slice(0, 12).join(', ')}{parsed.invalidLines.length > 12 ? '…' : ''} (ข้ามแถวเหล่านี้)</p>}
        {!preview && !result && <button type="button" onClick={buildPreview} disabled={busy || !parsed.rows.length}
          className="min-h-12 rounded-lg bg-[#EA580C] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
          {busy ? 'กำลังตรวจสอบ...' : 'ตรวจรายชื่อและรายการซ้ำ'}
        </button>}
      </div>}
      {preview && <div className="space-y-3" aria-live="polite">
        <p className="text-sm font-bold text-stone-900">พร้อมนำเข้า {readyCount} · มีอยู่แล้ว {preview.filter(row => row.status === 'duplicate').length} · ไม่พบชื่อ {preview.filter(row => row.status === 'unknown').length}</p>
        <div className="max-h-56 overflow-auto rounded-lg border border-stone-300">
          <table className="w-full min-w-[360px] text-left text-xs sm:text-sm"><thead className="sticky top-0 bg-stone-100"><tr><th className="p-2">รหัส</th><th className="p-2">ชื่อ</th><th className="p-2">ผลตรวจ</th></tr></thead>
            <tbody>{preview.slice(0, 50).map(row => <tr key={row.studentId} className="border-t border-stone-200"><td className="p-2 font-mono">{row.studentId}</td><td className="p-2">{row.name || 'ไม่พบ'}</td><td className="p-2">{row.status === 'ready' ? 'พร้อม' : row.status === 'duplicate' ? 'มีรายการแล้ว' : 'ข้าม'}</td></tr>)}</tbody>
          </table>
        </div>
        {preview.length > 50 && <p className="text-xs text-stone-600">แสดง 50 รายการแรกจาก {preview.length} รายการ</p>}
        <p className="text-xs text-stone-700">เมื่อกดบันทึก ระบบจะเพิ่มเฉพาะรายการใหม่ โดยไม่แก้ไขหรือลบรายการเดิม</p>
        <button type="button" onClick={importRows} disabled={busy || readyCount === 0}
          className="min-h-12 rounded-lg bg-[#2563EB] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
          {busy ? 'กำลังนำเข้า...' : `ยืนยันนำเข้า ${readyCount} รายการ`}
        </button>
      </div>}
      {result && <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-stone-900">
        บันทึกใหม่ {result.saved} · ซ้ำ {result.duplicate} · ไม่พบชื่อ {result.unknown} · ยังไม่เช็กเข้า {result.missingEntry} · บันทึกไม่สำเร็จ {result.failed}
      </p>}
      {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}</p>}
    </section>
  );
};
