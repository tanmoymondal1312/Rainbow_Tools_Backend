import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

// Cache: SHA-256 of EPS content -> Rendered PNG Preview Data
interface CachedEpsPreview {
  previewUrl: string;
  base64Data: string;
  mimeType: string;
  width: number;
  height: number;
  dimensions: string;
  orientation: 'Square' | 'Portrait' | 'Landscape';
  hasTransparency: boolean;
  backgroundType: 'Transparent' | 'White' | 'Black' | 'Colored' | 'Gradient' | 'Complex';
  dominantColors: string[];
}

const epsCache = new Map<string, CachedEpsPreview>();

/**
 * Strips DOS EPS binary header (0xC5D0D3C6) to extract pure PostScript stream
 */
export function cleanEpsBuffer(buffer: Buffer): Buffer {
  if (buffer.length >= 30 && buffer[0] === 0xc5 && buffer[1] === 0xd0 && buffer[2] === 0xd3 && buffer[3] === 0xc6) {
    const psOffset = buffer.readUInt32LE(4);
    const psLength = buffer.readUInt32LE(8);
    if (psOffset > 0 && psLength > 0 && psOffset + psLength <= buffer.length) {
      return buffer.subarray(psOffset, psOffset + psLength);
    }
  }
  return buffer;
}

/**
 * Parse BoundingBox from EPS headers to estimate dimensions & aspect ratio
 */
export function parseEpsBoundingBox(buffer: Buffer): { width: number; height: number; dpi: number } {
  try {
    const textHeader = buffer.toString('latin1', 0, Math.min(buffer.length, 32768));
    const bboxMatch =
      textHeader.match(/%%BoundingBox:\s*(-?\d+)\s+(-?\d+)\s+(\d+)\s+(\d+)/i) ||
      textHeader.match(/%%HiResBoundingBox:\s*([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)\s+([\d\.]+)/i);

    if (bboxMatch) {
      const x1 = parseFloat(bboxMatch[1]);
      const y1 = parseFloat(bboxMatch[2]);
      const x2 = parseFloat(bboxMatch[3]);
      const y2 = parseFloat(bboxMatch[4]);
      const w = Math.abs(x2 - x1);
      const h = Math.abs(y2 - y1);
      if (w > 10 && h > 10) {
        const maxDimPt = Math.max(w, h);
        // Target ~1800px on max dimension (between 1600px - 2400px)
        const targetPx = 1800;
        const calculatedDpi = Math.round((targetPx / maxDimPt) * 72);
        const clampedDpi = Math.max(100, Math.min(300, calculatedDpi));
        return { width: Math.round(w), height: Math.round(h), dpi: clampedDpi };
      }
    }
  } catch (e) {
    console.warn('BoundingBox parse warning:', e);
  }
  return { width: 800, height: 600, dpi: 200 };
}

/**
 * Validate PNG buffer signature and read width/height from IHDR chunk
 */
export function validatePngBuffer(buffer: Buffer): { valid: boolean; width: number; height: number; error?: string } {
  if (!buffer || buffer.length < 24) {
    return { valid: false, width: 0, height: 0, error: 'PNG buffer is too short or empty.' };
  }

  // Check PNG signature 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  if (!isPng) {
    return { valid: false, width: 0, height: 0, error: 'Rendered file is not a valid PNG image.' };
  }

  // Read IHDR width and height (Big Endian at offset 16 and 20)
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  if (width <= 0 || height <= 0) {
    return { valid: false, width, height, error: 'Rendered PNG has invalid dimensions (0 width or height).' };
  }

  return { valid: true, width, height };
}

/**
 * Render EPS Buffer to PNG Preview using Ghostscript or ImageMagick
 */
export async function renderEpsToPng(
  rawBuffer: Buffer,
  fileName: string = 'artwork.eps'
): Promise<CachedEpsPreview> {
  // 1. Calculate SHA-256 hash for caching
  const hash = crypto.createHash('sha256').update(rawBuffer).digest('hex');
  const cached = epsCache.get(hash);
  if (cached) {
    return cached;
  }

  const cleanBuffer = cleanEpsBuffer(rawBuffer);
  const { width: ptW, height: ptH, dpi } = parseEpsBoundingBox(cleanBuffer);

  const tmpDir = '/tmp';
  const fileId = `eps_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
  const epsPath = path.join(tmpDir, `${fileId}.eps`);
  const pngPath = path.join(tmpDir, `${fileId}.png`);

  try {
    await fs.promises.writeFile(epsPath, cleanBuffer);

    let renderSuccess = false;
    let lastError: any = null;

    // Attempt 1: Ghostscript
    try {
      const gsArgs = [
        '-dSAFER',
        '-dBATCH',
        '-dNOPAUSE',
        '-dEPSCrop',
        '-sDEVICE=pngalpha',
        `-r${dpi}`,
        '-dTextAlphaBits=4',
        '-dGraphicsAlphaBits=4',
        `-sOutputFile=${pngPath}`,
        epsPath,
      ];

      await execFileAsync('gs', gsArgs, { timeout: 15000 });
      if (fs.existsSync(pngPath)) {
        renderSuccess = true;
      }
    } catch (gsErr) {
      lastError = gsErr;
      console.warn(`[EPS Renderer] Ghostscript failed for ${fileName}, trying ImageMagick fallback...`, gsErr);
    }

    // Attempt 2: ImageMagick Convert Fallback
    if (!renderSuccess) {
      try {
        const convertArgs = [
          '-density',
          `${dpi}`,
          '-colorspace',
          'sRGB',
          epsPath,
          '-resize',
          '2000x2000>',
          pngPath,
        ];
        await execFileAsync('convert', convertArgs, { timeout: 15000 });
        if (fs.existsSync(pngPath)) {
          renderSuccess = true;
        }
      } catch (convErr) {
        lastError = convErr;
        console.error(`[EPS Renderer] ImageMagick also failed for ${fileName}:`, convErr);
      }
    }

    if (!renderSuccess || !fs.existsSync(pngPath)) {
      throw new Error(`Unable to render EPS preview. Please retry.`);
    }

    const pngBuffer = await fs.promises.readFile(pngPath);
    const validation = validatePngBuffer(pngBuffer);

    if (!validation.valid) {
      throw new Error(validation.error || 'Unable to render EPS preview. Please retry.');
    }

    const { width: pixelWidth, height: pixelHeight } = validation;

    let orientation: 'Square' | 'Portrait' | 'Landscape' = 'Landscape';
    const ratio = pixelWidth / pixelHeight;
    if (Math.abs(ratio - 1) < 0.08) {
      orientation = 'Square';
    } else if (ratio < 0.92) {
      orientation = 'Portrait';
    } else {
      orientation = 'Landscape';
    }

    const base64Data = pngBuffer.toString('base64');
    const previewUrl = `data:image/png;base64,${base64Data}`;

    const result: CachedEpsPreview = {
      previewUrl,
      base64Data,
      mimeType: 'image/png',
      width: pixelWidth,
      height: pixelHeight,
      dimensions: `${pixelWidth} × ${pixelHeight} px (EPS Vector)`,
      orientation,
      hasTransparency: true,
      backgroundType: 'Transparent',
      dominantColors: ['#38bdf8', '#818cf8'],
    };

    // Store in cache
    epsCache.set(hash, result);

    return result;
  } finally {
    // Cleanup temporary files
    try {
      if (fs.existsSync(epsPath)) await fs.promises.unlink(epsPath);
    } catch {}
    try {
      if (fs.existsSync(pngPath)) await fs.promises.unlink(pngPath);
    } catch {}
  }
}
