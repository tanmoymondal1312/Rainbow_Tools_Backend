import os
import base64
import asyncio
import tempfile
from concurrent.futures import ThreadPoolExecutor

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from pdf2docx import Converter
import pikepdf


# PDF conversion is CPU-heavy; keep worker count low to avoid OOM
_pool = ThreadPoolExecutor(max_workers=2)


# ── PDF → DOCX ────────────────────────────────────────────────────────────────

def _convert(pdf_bytes: bytes) -> bytes:
    """
    Uses pdf2docx which preserves:
      - text with font/size/bold/italic
      - tables (including merged cells)
      - embedded images
      - multi-column layouts
      - headers and footers
    Needs real temp files because pdf2docx uses file paths internally.
    """
    pdf_tmp = tempfile.NamedTemporaryFile(suffix='.pdf', delete=False)
    pdf_tmp.write(pdf_bytes)
    pdf_tmp.close()
    docx_path = pdf_tmp.name + '.docx'

    try:
        cv = Converter(pdf_tmp.name)
        cv.convert(docx_path, start=0, end=None)
        cv.close()
        with open(docx_path, 'rb') as f:
            return f.read()
    finally:
        if os.path.exists(pdf_tmp.name): os.unlink(pdf_tmp.name)
        if os.path.exists(docx_path):    os.unlink(docx_path)


@csrf_exempt
async def convert_pdf_to_docx(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST method required'}, status=405)
    if 'pdf' not in request.FILES:
        return JsonResponse({'error': 'No PDF file provided'}, status=400)

    pdf_bytes = request.FILES['pdf'].read()
    loop = asyncio.get_running_loop()
    try:
        docx_bytes = await loop.run_in_executor(_pool, _convert, pdf_bytes)
        return JsonResponse({'docx': base64.b64encode(docx_bytes).decode()}, status=200)
    except Exception as e:
        print(f"PDF→DOCX error: {e}")
        return JsonResponse({'error': str(e)}, status=500)


# ── PDF Optimizer ─────────────────────────────────────────────────────────────

def _optimize(pdf_bytes: bytes) -> bytes:
    """
    Compresses PDF using pikepdf:
      - Re-streams all object streams (deduplicate objects)
      - Recompresses Flate (DEFLATE) streams at max level
      - Removes redundant metadata where safe
    Returns the smaller of original vs compressed (never inflates).
    """
    inp = tempfile.NamedTemporaryFile(suffix='.pdf', delete=False)
    inp.write(pdf_bytes)
    inp.close()
    out_path = inp.name + '_opt.pdf'

    try:
        with pikepdf.open(inp.name) as pdf:
            pdf.save(
                out_path,
                compress_streams=True,
                object_stream_mode=pikepdf.ObjectStreamMode.generate,
                recompress_flate=True,
            )
        with open(out_path, 'rb') as f:
            opt_bytes = f.read()
        # Never return a larger file than what came in
        return opt_bytes if len(opt_bytes) < len(pdf_bytes) else pdf_bytes
    finally:
        if os.path.exists(inp.name):  os.unlink(inp.name)
        if os.path.exists(out_path):  os.unlink(out_path)


@csrf_exempt
async def optimize_pdf(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST method required'}, status=405)
    if 'pdf' not in request.FILES:
        return JsonResponse({'error': 'No PDF file provided'}, status=400)

    pdf_bytes = request.FILES['pdf'].read()
    loop = asyncio.get_running_loop()
    try:
        result = await loop.run_in_executor(_pool, _optimize, pdf_bytes)
        saved_pct = round((1 - len(result) / len(pdf_bytes)) * 100, 1)
        return JsonResponse({
            'pdf': base64.b64encode(result).decode(),
            'original_kb': round(len(pdf_bytes) / 1024, 1),
            'optimized_kb': round(len(result) / 1024, 1),
            'saved_percent': saved_pct,
        }, status=200)
    except Exception as e:
        print(f"PDF optimize error: {e}")
        return JsonResponse({'error': str(e)}, status=500)
