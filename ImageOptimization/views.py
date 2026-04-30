import io
import os
import uuid
import asyncio
import subprocess
from concurrent.futures import ThreadPoolExecutor

from django.http import JsonResponse, FileResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

from PIL import Image, ImageEnhance
from rembg import remove
import easyocr
import numpy as np


# ── Output directories ────────────────────────────────────────────────────────
BG_REMOVED_DIR    = os.path.join(settings.MEDIA_ROOT, 'bg_removed_images')
INHANCE_DIR       = os.path.join(settings.MEDIA_ROOT, 'inhance_images')
EXTRACT_TEXTS_DIR = os.path.join(settings.MEDIA_ROOT, 'extracted_texts')
UPLOAD_DIR        = os.path.join(settings.MEDIA_ROOT, 'uploads')
REDUCED_DIR       = os.path.join(settings.MEDIA_ROOT, 'reduced_images')

for _d in (BG_REMOVED_DIR, INHANCE_DIR, EXTRACT_TEXTS_DIR, UPLOAD_DIR, REDUCED_DIR):
    os.makedirs(_d, exist_ok=True)


# ── Shared resources ──────────────────────────────────────────────────────────
# max_workers=4 keeps CPU-bound ONNX/PIL tasks from thrashing the machine
_pool = ThreadPoolExecutor(max_workers=4)

# EasyOCR reader is expensive to build; initialise once at startup
_ocr = easyocr.Reader(['en'], gpu=False)


def _uid(ext: str) -> str:
    return f"rbgt_{uuid.uuid4().hex}{ext}"


# ── Serve saved files ─────────────────────────────────────────────────────────

@csrf_exempt
def GetBgRemovedImages(request, imageNo):
    path = os.path.join(BG_REMOVED_DIR, imageNo)
    if not os.path.exists(path):
        return JsonResponse({'error': 'Image not found'}, status=404)
    return FileResponse(open(path, 'rb'), content_type='image/png')


@csrf_exempt
def GetInhanceImages(request, imageNo):
    path = os.path.join(INHANCE_DIR, imageNo)
    if not os.path.exists(path):
        return JsonResponse({'error': 'Image not found'}, status=404)
    return FileResponse(open(path, 'rb'), content_type='image/png')


@csrf_exempt
def GetExtractedTextFile(request, fileName):
    path = os.path.join(EXTRACT_TEXTS_DIR, fileName)
    if not os.path.exists(path):
        return JsonResponse({'error': 'File not found'}, status=404)
    return FileResponse(open(path, 'rb'), content_type='text/plain')


# ── Tool 1: Background Removal ────────────────────────────────────────────────

def _bg_remove_one(raw_bytes: bytes) -> str:
    """CPU-bound: runs rembg (ONNX releases GIL) in thread pool."""
    out_bytes = remove(raw_bytes)
    name = _uid('.png')
    Image.open(io.BytesIO(out_bytes)).save(os.path.join(BG_REMOVED_DIR, name))
    print(f"BG removed: {name}")
    return name


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

    def _read_and_remove(img_file):
        pil = Image.open(img_file)
        buf = io.BytesIO()
        pil.save(buf, format=pil.format or 'PNG')
        return _bg_remove_one(buf.getvalue())

    try:
        # All images processed concurrently in the thread pool
        names = await asyncio.gather(
            *[loop.run_in_executor(_pool, _read_and_remove, f) for f in files]
        )
        return JsonResponse({'image_names': list(names)}, status=200)
    except Exception as e:
        print(f"remove_background error: {e}")
        return JsonResponse({'error': str(e)}, status=500)


# ── Tool 2: Image Enhancement ─────────────────────────────────────────────────

def _enhance_one(img_file) -> str:
    """CPU-bound: PIL chained enhancements run in thread pool."""
    img = Image.open(img_file)
    img = ImageEnhance.Sharpness(img).enhance(2.0)
    img = ImageEnhance.Color(img).enhance(1.5)
    img = ImageEnhance.Brightness(img).enhance(1.2)
    img = ImageEnhance.Contrast(img).enhance(1.3)
    name = _uid('.png')
    img.save(os.path.join(INHANCE_DIR, name))
    print(f"Enhanced: {name}")
    return name


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
        names = await asyncio.gather(
            *[loop.run_in_executor(_pool, _enhance_one, f) for f in files]
        )
        return JsonResponse({'image_names': list(names)}, status=200)
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


def _ocr_and_save(image_bytes: bytes) -> str:
    """CPU-bound: OCR + file write runs in thread pool."""
    results = _ocr.readtext(image_bytes)
    threshold = _y_threshold(results)
    lines = _group_lines(results, threshold)
    text = "\n".join(
        " ".join(t for _, t in sorted(line, key=lambda x: x[0][0][0]))
        for line in lines
    )
    name = f"rbgt_{uuid.uuid4().hex}.txt"
    with open(os.path.join(EXTRACT_TEXTS_DIR, name), "w", encoding="utf-8") as fh:
        fh.write(text)
    return name


@csrf_exempt
async def ExtractTextsFromImages(request):
    print("Image Get")
    if request.method != 'POST' or not request.FILES.getlist('images'):
        return JsonResponse({'status': 'error', 'message': 'No images uploaded'}, status=400)

    loop = asyncio.get_running_loop()
    names = await asyncio.gather(
        *[loop.run_in_executor(_pool, _ocr_and_save, img.read())
          for img in request.FILES.getlist('images')]
    )
    return JsonResponse({'image_names': list(names)}, status=200)


# ── Tool 4: Image Size Reduction ──────────────────────────────────────────────

def _compress_png(inp: str, out: str, target_kb: int) -> bool:
    try:
        subprocess.run(
            ["pngquant", "--force", "--quality=60-80", "--output", out, inp],
            check=True
        )
        return os.path.exists(out) and os.path.getsize(out) <= target_kb * 1024
    except FileNotFoundError:
        Image.open(inp).convert("P").save(out, format="PNG", optimize=True)
        return os.path.exists(out)


def _compress_image(inp: str, out: str, target_kb: int) -> str | None:
    """Returns actual output path on success, None on failure."""
    target_bytes = target_kb * 1024
    if not os.path.exists(inp):
        return None

    img = Image.open(inp)
    fmt = img.format
    ext = os.path.splitext(inp)[1].lower()

    if fmt not in ("JPEG", "PNG", "WEBP"):
        fmt, ext = "JPEG", ".jpg"

    out = os.path.splitext(out)[0] + ext

    if os.path.getsize(inp) <= target_bytes:
        img.save(out, format=fmt)
        return out

    if fmt == "PNG":
        return out if _compress_png(inp, out, target_kb) else None

    quality = 95
    img.save(out, format=fmt, quality=quality, optimize=True)
    while os.path.getsize(out) > target_bytes and quality > 10:
        quality -= 5
        img.save(out, format=fmt, quality=quality, optimize=True)

    return out


def _reduce_one(img_file, target_kb: int, base_url: str) -> dict:
    """CPU-bound: save upload + compress + return result dict."""
    name = img_file.name
    inp = os.path.join(UPLOAD_DIR, name)
    out = os.path.join(REDUCED_DIR, name)

    with open(inp, "wb") as fh:
        for chunk in img_file.chunks():
            fh.write(chunk)

    actual_out = _compress_image(inp, out, target_kb)
    if actual_out:
        served = os.path.basename(actual_out)
        return {"image": name, "url": f"{base_url}{settings.MEDIA_URL}reduced_images/{served}"}
    return {"image": name, "error": "Compression failed"}


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

    # Build base URL in async context (not thread-safe inside the executor)
    base_url = request.build_absolute_uri('/').rstrip('/')
    loop = asyncio.get_running_loop()

    try:
        results = await asyncio.gather(
            *[loop.run_in_executor(_pool, _reduce_one, img, kb, base_url)
              for img, kb in zip(images, target_sizes)]
        )
        return JsonResponse({"reduced_images": list(results)})
    except Exception as e:
        print(f"reduce_image_size_view error: {e}")
        return JsonResponse({"error": "Unexpected server error"}, status=500)
