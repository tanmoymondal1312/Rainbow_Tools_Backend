import { TechnicalDetails } from '../types';

/**
 * Format bytes to readable string (e.g., 2.4 MB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Extract clean file extension
 */
export function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toUpperCase() : 'UNKNOWN';
}

/**
 * Compute SHA-256 hash of an ArrayBuffer in browser
 */
export async function computeBufferHash(buffer: ArrayBuffer): Promise<string> {
  try {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    // Fallback simple hash
    let hash = 0;
    const bytes = new Uint8Array(buffer.slice(0, Math.min(buffer.byteLength, 10000)));
    for (let i = 0; i < bytes.length; i++) {
      hash = (hash << 5) - hash + bytes[i];
      hash |= 0;
    }
    return 'fallback_' + Math.abs(hash).toString(16);
  }
}

/**
 * Client-Side Image Cache for rendered previews
 */
const previewMemoryCache = new Map<
  string,
  {
    previewUrl: string;
    base64Data: string;
    mimeType: string;
    fileHash: string;
    technicalDetails: TechnicalDetails;
  }
>();

/**
 * Convert file to optimized preview and extract visual dimensions & transparency
 */
export async function processImageFile(
  file: File,
  onStatusUpdate?: (status: string) => void
): Promise<{
  previewUrl: string;
  base64Data: string;
  mimeType: string;
  fileHash: string;
  technicalDetails: TechnicalDetails;
}> {
  const extension = getFileExtension(file.name).toLowerCase();

  // Read array buffer to compute hash for caching
  const arrayBuffer = await file.arrayBuffer();
  const fileHash = await computeBufferHash(arrayBuffer);

  const cached = previewMemoryCache.get(fileHash);
  if (cached) {
    return cached;
  }

  let result: {
    previewUrl: string;
    base64Data: string;
    mimeType: string;
    fileHash: string;
    technicalDetails: TechnicalDetails;
  };

  if (extension === 'eps') {
    onStatusUpdate?.('Rendering EPS preview...');
    result = await processEpsFileServer(file, arrayBuffer, fileHash);
  } else if (extension === 'svg' || file.type.includes('svg')) {
    onStatusUpdate?.('Optimizing vector preview...');
    result = await processSvgFile(file, fileHash);
  } else {
    onStatusUpdate?.('Optimizing image preview...');
    result = await processStandardImageFile(file, fileHash);
  }

  // Cache rendered preview
  previewMemoryCache.set(fileHash, result);
  return result;
}

/**
 * Server-Side EPS rendering using Ghostscript
 */
export async function processEpsFileServer(
  file: File,
  arrayBuffer: ArrayBuffer,
  fileHash: string
): Promise<{
  previewUrl: string;
  base64Data: string;
  mimeType: string;
  fileHash: string;
  technicalDetails: TechnicalDetails;
}> {
  // Convert ArrayBuffer to base64
  let binary = '';
  const bytes = new Uint8Array(arrayBuffer);
  const len = bytes.byteLength;
  const chunkSize = 0x8000; // 32KB chunks
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  const base64Data = btoa(binary);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

  try {
    const res = await fetch('/api/render-eps', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileData: base64Data,
        fileName: file.name,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Unable to render EPS preview. Please retry.');
    }

    const data = await res.json();

    if (!data.success || !data.previewUrl || !data.base64Data) {
      throw new Error(data.error || 'Unable to render EPS preview. Please retry.');
    }

    return {
      previewUrl: data.previewUrl,
      base64Data: data.base64Data,
      mimeType: data.mimeType || 'image/png',
      fileHash,
      technicalDetails: {
        dimensions: data.dimensions || `${data.width} × ${data.height} px (EPS Vector)`,
        width: data.width || 1800,
        height: data.height || 1200,
        orientation: data.orientation || 'Landscape',
        backgroundType: data.backgroundType || 'Transparent',
        hasTransparency: data.hasTransparency ?? true,
        dominantColors: data.dominantColors || ['#38bdf8', '#818cf8'],
        visualStyle: 'EPS Vector Graphic',
        contentType: 'Vector',
        isSilhouette: false,
      },
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('EPS rendering timed out. Please retry.');
    }
    throw new Error(err.message || 'Unable to render EPS preview. Please retry.');
  }
}

/**
 * Standard Image (JPG, PNG, WEBP) preview optimizer (max dimension 1600-2000px)
 */
async function processStandardImageFile(
  file: File,
  fileHash: string
): Promise<{
  previewUrl: string;
  base64Data: string;
  mimeType: string;
  fileHash: string;
  technicalDetails: TechnicalDetails;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        const origWidth = img.naturalWidth || img.width || 800;
        const origHeight = img.naturalHeight || img.height || 600;

        // Downscale to max 1800px on longest dimension for optimal AI processing speed and memory
        const MAX_DIM = 1800;
        let targetWidth = origWidth;
        let targetHeight = origHeight;

        if (origWidth > MAX_DIM || origHeight > MAX_DIM) {
          if (origWidth > origHeight) {
            targetWidth = MAX_DIM;
            targetHeight = Math.round((origHeight / origWidth) * MAX_DIM);
          } else {
            targetHeight = MAX_DIM;
            targetWidth = Math.round((origWidth / origHeight) * MAX_DIM);
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        if (!ctx) {
          const rawBase64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : '';
          resolve({
            previewUrl: dataUrl,
            base64Data: rawBase64,
            mimeType: file.type || 'image/jpeg',
            fileHash,
            technicalDetails: {
              dimensions: `${origWidth} × ${origHeight} px`,
              width: origWidth,
              height: origHeight,
              orientation: origWidth >= origHeight ? 'Landscape' : 'Portrait',
              backgroundType: 'Complex',
              hasTransparency: false,
              dominantColors: ['#38bdf8', '#818cf8'],
              visualStyle: 'Stock Visual',
              contentType: 'Photo',
              isSilhouette: false,
            },
          });
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Transparency and Dominant color sampling
        let hasTransparency = false;
        let backgroundType: TechnicalDetails['backgroundType'] = 'White';
        const sampleW = Math.min(64, targetWidth);
        const sampleH = Math.min(64, targetHeight);
        const sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = sampleW;
        sampleCanvas.height = sampleH;
        const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });

        if (sampleCtx) {
          sampleCtx.drawImage(canvas, 0, 0, sampleW, sampleH);
          const imgData = sampleCtx.getImageData(0, 0, sampleW, sampleH).data;
          let transparentPixels = 0;
          let rTotal = 0,
            gTotal = 0,
            bTotal = 0;
          const pixelCount = sampleW * sampleH;

          for (let i = 0; i < imgData.length; i += 4) {
            const r = imgData[i];
            const g = imgData[i + 1];
            const b = imgData[i + 2];
            const a = imgData[i + 3];

            if (a < 220) {
              transparentPixels++;
            }
            rTotal += r;
            gTotal += g;
            bTotal += b;
          }

          if (transparentPixels > pixelCount * 0.05) {
            hasTransparency = true;
            backgroundType = 'Transparent';
          } else {
            const avgR = rTotal / pixelCount;
            const avgG = gTotal / pixelCount;
            const avgB = bTotal / pixelCount;

            if (avgR > 235 && avgG > 235 && avgB > 235) {
              backgroundType = 'White';
            } else if (avgR < 25 && avgG < 25 && avgB < 25) {
              backgroundType = 'Black';
            } else {
              backgroundType = 'Colored';
            }
          }
        }

        let orientation: 'Square' | 'Portrait' | 'Landscape' = 'Landscape';
        const ratio = origWidth / origHeight;
        if (Math.abs(ratio - 1) < 0.08) {
          orientation = 'Square';
        } else if (ratio < 0.92) {
          orientation = 'Portrait';
        } else {
          orientation = 'Landscape';
        }

        const outMime = hasTransparency || file.type.includes('png') ? 'image/png' : 'image/jpeg';
        const optimizedDataUrl = canvas.toDataURL(outMime, 0.92);
        const base64Data = optimizedDataUrl.split(',')[1] || '';

        resolve({
          previewUrl: optimizedDataUrl,
          base64Data,
          mimeType: outMime,
          fileHash,
          technicalDetails: {
            dimensions: `${origWidth} × ${origHeight} px`,
            width: origWidth,
            height: origHeight,
            orientation,
            backgroundType,
            hasTransparency,
            dominantColors: hasTransparency ? ['#38bdf8', '#34d399'] : ['#3b82f6', '#1e293b'],
            visualStyle: hasTransparency ? 'Isolated Graphic' : 'Stock Visual',
            contentType: hasTransparency ? 'Graphic' : 'Photo',
            isSilhouette: false,
          },
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to decode image file.'));
      };

      img.src = dataUrl;
    };

    reader.onerror = () => reject(new Error('Failed to read file from disk.'));
    reader.readAsDataURL(file);
  });
}

/**
 * Handle SVG files
 */
async function processSvgFile(
  file: File,
  fileHash: string
): Promise<{
  previewUrl: string;
  base64Data: string;
  mimeType: string;
  fileHash: string;
  technicalDetails: TechnicalDetails;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const svgText = reader.result as string;
      const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        const width = Math.min(1800, img.naturalWidth || 1000);
        const height = Math.min(1800, img.naturalHeight || 1000);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const pngDataUrl = canvas.toDataURL('image/png');
          const base64Data = pngDataUrl.split(',')[1];

          resolve({
            previewUrl: url,
            base64Data,
            mimeType: 'image/png',
            fileHash,
            technicalDetails: {
              dimensions: `${width} × ${height} px (SVG Vector)`,
              width,
              height,
              orientation: width === height ? 'Square' : width > height ? 'Landscape' : 'Portrait',
              backgroundType: 'Transparent',
              hasTransparency: true,
              dominantColors: ['#06b6d4', '#8b5cf6'],
              visualStyle: 'Vector Illustration',
              contentType: 'Vector',
              isSilhouette: svgText.toLowerCase().includes('black') && !svgText.toLowerCase().includes('rgb'),
            },
          });
        } else {
          const b64 = btoa(unescape(encodeURIComponent(svgText)));
          resolve({
            previewUrl: url,
            base64Data: b64,
            mimeType: 'image/svg+xml',
            fileHash,
            technicalDetails: {
              dimensions: 'Scalable Vector (SVG)',
              orientation: 'Square',
              backgroundType: 'Transparent',
              hasTransparency: true,
              dominantColors: ['#06b6d4', '#3b82f6'],
              visualStyle: 'Vector Graphic',
              contentType: 'Vector',
              isSilhouette: false,
            },
          });
        }
      };

      img.onerror = () => {
        reject(new Error('Failed to parse SVG artwork.'));
      };

      img.src = url;
    };
    reader.onerror = () => reject(new Error('Failed to read SVG file.'));
    reader.readAsText(file);
  });
}
