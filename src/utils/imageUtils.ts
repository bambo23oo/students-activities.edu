import imageCompression from 'browser-image-compression';

export interface CompressOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
}

/**
 * Compresses an image file and converts it to a base64 Data URL.
 * Includes a fallback to standard FileReader/Canvas in case compression encounters any issue.
 */
export async function compressAndConvertToBase64(
  file: File,
  options: CompressOptions = { maxSizeMB: 0.6, maxWidthOrHeight: 1024, useWebWorker: true }
): Promise<string> {
  // If not an image, throw
  if (!file.type.startsWith('image/')) {
    throw new Error('กรุณาเลือกไฟล์รูปภาพที่ถูกต้อง (JPEG, PNG, WebP)');
  }

  try {
    const compressedFile = await imageCompression(file, {
      maxSizeMB: options.maxSizeMB ?? 0.6,
      maxWidthOrHeight: options.maxWidthOrHeight ?? 1024,
      useWebWorker: options.useWebWorker ?? true,
      fileType: 'image/jpeg'
    });

    return await fileToDataUrl(compressedFile);
  } catch (error) {
    console.warn('Image compression fallback to direct read:', error);
    return await fileToDataUrl(file);
  }
}

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('ไม่สามารถแปลงไฟล์รูปภาพได้'));
      }
    };
    reader.onerror = () => reject(new Error('เกิดข้อผิดพลาดในการอ่านไฟล์'));
    reader.readAsDataURL(file);
  });
}
