import io
import os
import base64
import asyncio
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from PIL import Image, ImageEnhance, ImageOps
from rembg import remove
import easyocr
import numpy as np


# ── Shared resources ──────────────────────────────────────────────────────────
_pool = ThreadPoolExecutor(max_workers=4)
_ocr  = easyocr.Reader(['en'], gpu=False)

_MAX_PX = 1920


def _resize_if_large(img: Image.Image) -> Image.Image:
    w, h = img.size
    if max(w, h) > _MAX_PX:
        ratio = _MAX_PX / max(w, h)
        img = img.resize((int(w * ratio), int(h * ratio)), Image.LANCZOS)
    return img


def _b64(buf: io.BytesIO) -> str:
    return base64.b64encode(buf.getvalue()).decode('utf-8')


# ── Tool 1: Background Removal ────────────────────────────────────────────────

def _process_bg_remove(img_file) -> str:
    """Full pipeline in memory → base64 PNG string. Nothing saved to disk."""
    pil = ImageOps.exif_transpose(Image.open(img_file))
    raw = io.BytesIO()
    pil.save(raw, format='PNG')

    out = remove(raw.getvalue())
    img = Image.open(io.BytesIO(out)).convert("RGBA")
    img = _resize_if_large(img)

    result = io.BytesIO()
    img.save(result, format="PNG", optimize=True, compress_level=7)
    return _b64(result)


@csrf_exempt
async def remove_background(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=405)
    if 'images' not in request.FILES:
        return JsonResponse({'error': 'No image files provided'}, status=400)

    files = request.FILES.getlist('images')
    if len(files) > 5:
        return JsonResponse({'error': 'Cannot upload more than 5 images'}, status=400)

    loop = asyncio.get_running_loop()
    try:
        images = await asyncio.gather(
            *[loop.run_in_executor(_pool, _process_bg_remove, f) for f in files]
        )
        return JsonResponse({'images': list(images)}, status=200)
    except Exception as e:
        print(f"remove_background error: {e}")
        return JsonResponse({'error': str(e)}, status=500)


# ── Tool 2: Image Enhancement ─────────────────────────────────────────────────

def _process_enhance(img_file) -> str:
    """Full pipeline in memory → base64 JPEG string. Nothing saved to disk."""
    img = ImageOps.exif_transpose(Image.open(img_file))
    img = ImageEnhance.Sharpness(img).enhance(2.0)
    img = ImageEnhance.Color(img).enhance(1.5)
    img = ImageEnhance.Brightness(img).enhance(1.2)
    img = ImageEnhance.Contrast(img).enhance(1.3)
    img = _resize_if_large(img).convert("RGB")

    result = io.BytesIO()
    img.save(result, format="JPEG", quality=85, optimize=True, progressive=True)
    return _b64(result)


@csrf_exempt
async def InhanceImages(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=405)
    if 'images' not in request.FILES:
        return JsonResponse({'error': 'No image files provided'}, status=400)

    files = request.FILES.getlist('images')
    if len(files) > 5:
        return JsonResponse({'error': 'Cannot upload more than 5 images'}, status=400)

    loop = asyncio.get_running_loop()
    try:
        images = await asyncio.gather(
            *[loop.run_in_executor(_pool, _process_enhance, f) for f in files]
        )
        return JsonResponse({'images': list(images)}, status=200)
    except Exception as e:
        print(f"InhanceImages error: {e}")
        return JsonResponse({'error': str(e)}, status=500)


# ── Tool 3: Text Extraction ───────────────────────────────────────────────────

def _y_threshold(results):
    heights = [abs(b[0][1] - b[2][1]) for b, _, _ in results]
    return float(np.mean(heights)) * 0.5 if heights else 10.0


def _group_lines(results, threshold):
    lines, cur, prev_y = [], [], None
    for bbox, text, _ in results:
        y = bbox[0][1]
        if prev_y is None or abs(y - prev_y) < threshold:
            cur.append((bbox, text))
        else:
            lines.append(cur)
            cur = [(bbox, text)]
        prev_y = y
    if cur:
        lines.append(cur)
    return lines


def _ocr_extract(image_bytes: bytes) -> str:
    """OCR in memory → plain text string. Nothing saved to disk."""
    results = _ocr.readtext(image_bytes)
    threshold = _y_threshold(results)
    lines = _group_lines(results, threshold)
    return "\n".join(
        " ".join(t for _, t in sorted(line, key=lambda x: x[0][0][0]))
        for line in lines
    )


@csrf_exempt
async def ExtractTextsFromImages(request):
    if request.method != 'POST' or not request.FILES.getlist('images'):
        return JsonResponse({'status': 'error', 'message': 'No images uploaded'}, status=400)

    loop = asyncio.get_running_loop()
    texts = await asyncio.gather(
        *[loop.run_in_executor(_pool, _ocr_extract, img.read())
          for img in request.FILES.getlist('images')]
    )
    return JsonResponse({'texts': list(texts)}, status=200)


# ── Tool 4: Image Size Reduction ──────────────────────────────────────────────

def _compress_png_to_b64(raw_png: bytes, target_kb: int) -> str:
    """pngquant needs real files; write → compress → read → delete."""
    inp = tempfile.NamedTemporaryFile(suffix='.png', delete=False)
    out_path = inp.name + '_out.png'
    try:
        inp.write(raw_png)
        inp.close()
        subprocess.run(
            ["pngquant", "--force", "--quality=60-80", "--output", out_path, inp.name],
            check=True
        )
        with open(out_path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')
    except (FileNotFoundError, subprocess.CalledProcessError):
        # pngquant unavailable or failed — Pillow palette fallback
        buf = io.BytesIO()
        Image.open(io.BytesIO(raw_png)).convert("P").save(buf, format="PNG", optimize=True)
        return _b64(buf)
    finally:
        if os.path.exists(inp.name):  os.unlink(inp.name)
        if os.path.exists(out_path):  os.unlink(out_path)


def _compress_to_b64(img_file, target_kb: int) -> str:
    """Compress in memory → base64 string. Temp files used only for PNG/pngquant."""
    target_bytes = target_kb * 1024
    raw = img_file.read()

    img = Image.open(io.BytesIO(raw))
    fmt = img.format or 'JPEG'
    if fmt not in ("JPEG", "PNG", "WEBP"):
        fmt = "JPEG"

    # Already small enough — send as-is
    if len(raw) <= target_bytes:
        return base64.b64encode(raw).decode('utf-8')

    if fmt == "PNG":
        return _compress_png_to_b64(raw, target_kb)

    # JPEG / WEBP — pure in-memory quality reduction
    quality = 95
    buf = io.BytesIO()
    img.save(buf, format=fmt, quality=quality, optimize=True)
    while buf.tell() > target_bytes and quality > 10:
        quality -= 5
        buf = io.BytesIO()
        img.save(buf, format=fmt, quality=quality, optimize=True)
    return _b64(buf)


@csrf_exempt
async def reduce_image_size_view(request):
    if request.method != "POST":
        return JsonResponse({"error": "Only POST method is allowed"}, status=405)
    if not request.FILES:
        return JsonResponse({"error": "No image files provided"}, status=400)

    raw_sizes = [s.strip('"').strip() for s in request.POST.getlist("target_size")]
    if not raw_sizes or any(not s.isdigit() for s in raw_sizes):
        return JsonResponse({"error": "Invalid or missing target size"}, status=400)
    target_sizes = [int(s) for s in raw_sizes]

    images = request.FILES.getlist("image")
    if len(images) != len(target_sizes):
        return JsonResponse({"error": "Number of images and target sizes must match"}, status=400)

    loop = asyncio.get_running_loop()
    try:
        results = await asyncio.gather(
            *[loop.run_in_executor(_pool, _compress_to_b64, img, kb)
              for img, kb in zip(images, target_sizes)]
        )
        return JsonResponse({"images": list(results)})
    except Exception as e:
        print(f"reduce_image_size_view error: {e}")
        return JsonResponse({"error": "Unexpected server error"}, status=500)
