import { Student } from '../types';

/**
 * Generates and downloads a high-resolution, branded PNG image of the student's
 * Digital ID Pass for offline use at event check-in stations.
 */
export async function downloadDigitalPassCard(student: {
  id: string;
  name: string;
  major?: string;
  faculty?: string;
  year?: number;
  profileImage?: string;
}): Promise<boolean> {
  try {
    const width = 640;
    const height = 960;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;

    // Enable high quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Clean Background
    ctx.fillStyle = '#FAF9F6';
    ctx.fillRect(0, 0, width, height);

    // Outer subtle card border
    ctx.strokeStyle = '#E7E5E4';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, width - 20, height - 20);

    // 2. Header Banner (Academic Terracotta & Golden Accent)
    ctx.fillStyle = '#EA580C'; // Warm Terracotta
    ctx.fillRect(10, 10, width - 20, 140);

    // Gold accent stripe
    ctx.fillStyle = '#F59E0B'; // Sacred Gold
    ctx.fillRect(10, 145, width - 20, 8);

    // Header Title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px "Prompt", sans-serif';
    ctx.textAlign = 'center';
    const facultyTitle = student.faculty ? `${student.faculty} มหาวิทยาลัยนครพนม` : 'คณะครุศาสตร์ มหาวิทยาลัยนครพนม';
    ctx.fillText(facultyTitle, width / 2, 58);

    ctx.font = '500 13px "Prompt", sans-serif';
    ctx.fillStyle = '#FED7AA';
    const enFaculty = student.faculty === 'คณะวิทยาศาสตร์'
      ? 'FACULTY OF SCIENCE • NAKHON PHANOM UNIVERSITY'
      : 'FACULTY OF EDUCATION • NAKHON PHANOM UNIVERSITY';
    ctx.fillText(enFaculty, width / 2, 85);

    // Fast Track Pill
    ctx.fillStyle = '#FEF3C7';
    ctx.beginPath();
    ctx.roundRect(width / 2 - 140, 102, 280, 32, 16);
    ctx.fill();

    ctx.fillStyle = '#9A3412';
    ctx.font = 'bold 13px "Prompt", sans-serif';
    ctx.fillText('⚡ FAST TRACK DIGITAL PASS • บัตรเข้างานด่วน', width / 2, 123);

    // 3. Inner White Container
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#D6D3D1';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(30, 175, width - 60, 715, 20);
    ctx.fill();
    ctx.stroke();

    // 4. Student Photo / Avatar
    const photoSize = 130;
    const photoX = width / 2 - photoSize / 2;
    const photoY = 195;

    let imageLoaded = false;
    if (student.profileImage && student.profileImage.startsWith('data:image')) {
      try {
        const img = new Image();
        img.src = student.profileImage;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          setTimeout(reject, 1200); // 1.2s timeout fallback
        });

        ctx.save();
        ctx.beginPath();
        ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, photoX, photoY, photoSize, photoSize);
        ctx.restore();

        // Photo border
        ctx.strokeStyle = '#EA580C';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
        ctx.stroke();
        imageLoaded = true;
      } catch (e) {
        imageLoaded = false;
      }
    }

    if (!imageLoaded) {
      // Initials Avatar
      ctx.fillStyle = '#FFF7ED';
      ctx.strokeStyle = '#EA580C';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(photoX + photoSize / 2, photoY + photoSize / 2, photoSize / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#C2410C';
      ctx.font = 'bold 50px "Prompt", sans-serif';
      ctx.textAlign = 'center';
      const initial = student.name ? student.name.charAt(0) : 'N';
      ctx.fillText(initial, width / 2, photoY + photoSize / 2 + 18);
    }

    // 5. Student Information
    ctx.fillStyle = '#1C1917';
    ctx.font = 'bold 22px "Prompt", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(student.name, width / 2, photoY + photoSize + 36);

    // Student ID Pill
    const idPillWidth = 240;
    const idPillHeight = 36;
    const idPillX = width / 2 - idPillWidth / 2;
    const idPillY = photoY + photoSize + 48;

    ctx.fillStyle = '#FEF2F2';
    ctx.strokeStyle = '#FCA5A5';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(idPillX, idPillY, idPillWidth, idPillHeight, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#DC2626';
    ctx.font = 'bold 18px monospace';
    ctx.fillText(student.id, width / 2, idPillY + 24);

    // Major & Academic Year
    ctx.fillStyle = '#2563EB'; // Mekong Blue
    ctx.font = 'bold 15px "Prompt", sans-serif';
    const majorText = student.major || 'สาขาวิชาคอมพิวเตอร์ศึกษา';
    ctx.fillText(majorText, width / 2, idPillY + 62);

    ctx.fillStyle = '#78716C';
    ctx.font = '500 13px "Prompt", sans-serif';
    const yearText = student.year ? `ชั้นปีที่ ${student.year} • ` : '';
    ctx.fillText(`${yearText}${student.faculty || 'คณะครุศาสตร์'}`, width / 2, idPillY + 84);

    // Divider Line
    ctx.strokeStyle = '#E7E5E4';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, idPillY + 102);
    ctx.lineTo(width - 60, idPillY + 102);
    ctx.stroke();

    // 6. QR Code
    // We look for existing rendered QR or QR SVG in document, or generate via temp canvas
    let qrRendered = false;
    const existingQrCanvas = document.querySelector('canvas[data-qr-pass="true"]') as HTMLCanvasElement;
    if (existingQrCanvas) {
      try {
        const qrSize = 220;
        const qrX = width / 2 - qrSize / 2;
        const qrY = idPillY + 120;
        ctx.drawImage(existingQrCanvas, qrX, qrY, qrSize, qrSize);
        qrRendered = true;
      } catch (e) {}
    }

    if (!qrRendered) {
      // Find SVG QR code in DOM if available
      const qrSvg = document.querySelector('#pass-qrcode-svg') as SVGElement;
      if (qrSvg) {
        try {
          const svgData = new XMLSerializer().serializeToString(qrSvg);
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          const urlObj = window.URL || (window as any).webkitURL;
          const blobURL = urlObj.createObjectURL(svgBlob);
          const svgImg = new Image();
          svgImg.src = blobURL;
          await new Promise((res, rej) => {
            svgImg.onload = res;
            svgImg.onerror = rej;
            setTimeout(rej, 1000);
          });
          const qrSize = 210;
          const qrX = width / 2 - qrSize / 2;
          const qrY = idPillY + 120;
          ctx.drawImage(svgImg, qrX, qrY, qrSize, qrSize);
          urlObj.revokeObjectURL(blobURL);
          qrRendered = true;
        } catch (e) {}
      }
    }

    if (!qrRendered) {
      // Fallback box for QR
      const qrSize = 180;
      const qrX = width / 2 - qrSize / 2;
      const qrY = idPillY + 125;
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#CBD5E1';
      ctx.lineWidth = 2;
      ctx.strokeRect(qrX, qrY, qrSize, qrSize);

      ctx.fillStyle = '#0F172A';
      ctx.font = 'bold 16px monospace';
      ctx.fillText(student.id, width / 2, qrY + qrSize / 2);
    }

    // QR Helper text
    ctx.fillStyle = '#57534E';
    ctx.font = 'bold 12px "Prompt", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('แสดงภาพนี้ต่อหน้าเครื่องสแกนเพื่อเข้างานช่องทาง Fast Track', width / 2, idPillY + 355);

    // 7. Security Guarantee Footer Box
    ctx.fillStyle = '#F0FDF4';
    ctx.strokeStyle = '#BBF7D0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(50, height - 120, width - 100, 56, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#15803D';
    ctx.font = 'bold 13px "Prompt", sans-serif';
    ctx.fillText('✓ บันทึกข้อมูลล่วงหน้า (Pre-Registered) • เข้างานได้ใน 3 วินาที', width / 2, height - 86);

    ctx.fillStyle = '#A8A29E';
    ctx.font = '10px "Prompt", sans-serif';
    ctx.fillText('บันทึกรูปเมื่อ: ' + new Date().toLocaleDateString('th-TH') + ' • ระบบบันทึกกิจกรรมประสบการณ์วิชาชีพครู NPU', width / 2, height - 42);

    // 8. Trigger Save / Download
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return false;

    const fileName = `NPU_Digital_ID_${student.id}.png`;

    // Attempt Web Share API if supported on mobile
    if (navigator.canShare && navigator.share) {
      try {
        const file = new File([blob], fileName, { type: 'image/png' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `บัตร Digital ID นักศึกษา - ${student.name}`,
            text: `บัตรเข้างานช่องทาง Fast Track รหัส ${student.id}`,
            files: [file]
          });
          return true;
        }
      } catch (err: any) {
        // User cancelled or aborted share, continue with standard download fallback
        if (err.name === 'AbortError') return true;
      }
    }

    // Standard download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 4000);

    return true;
  } catch (error) {
    console.error('Failed to generate digital pass image:', error);
    return false;
  }
}
