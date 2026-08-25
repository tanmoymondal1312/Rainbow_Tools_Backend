from django.http import JsonResponse, Http404
from django.shortcuts import render


def connection_status(request):
    try:
        return JsonResponse({"status": "success", "message": "Server is up"}, status=200)
    except Exception as e:
        return JsonResponse({"status": "error", "message": f"Server error: {str(e)}"}, status=500)


TOOLS = [
    {
        'slug': 'remove-background',
        'name': 'Remove Background',
        'icon': 'bg-remove',
        'description': 'Remove image backgrounds instantly with AI.',
        'color': '#ec4899',
        'category': 'image',
    },
    {
        'slug': 'enhance-images',
        'name': 'Enhance Images',
        'icon': 'enhance',
        'description': 'Sharpen, brighten and boost color in one click.',
        'color': '#f59e0b',
        'category': 'image',
    },
    {
        'slug': 'extract-text',
        'name': 'Extract Text (OCR)',
        'icon': 'ocr',
        'description': 'Pull readable text out of any image.',
        'color': '#3b82f6',
        'category': 'image',
    },
    {
        'slug': 'reduce-image-size',
        'name': 'Reduce Image Size',
        'icon': 'compress',
        'description': 'Compress images down to a target file size.',
        'color': '#10b981',
        'category': 'image',
    },
    {
        'slug': 'pdf-to-docx',
        'name': 'PDF to DOCX',
        'icon': 'pdf-docx',
        'description': 'Convert PDF documents into editable Word files.',
        'color': '#a855f7',
        'category': 'pdf',
    },
    {
        'slug': 'optimize-pdf',
        'name': 'Optimize PDF',
        'icon': 'pdf-optimize',
        'description': 'Shrink PDF file size without losing quality.',
        'color': '#ef4444',
        'category': 'pdf',
    },
    {
        'slug': 'microstock-metadata',
        'name': 'Microstock Metadata AI',
        'icon': 'ai-meta',
        'description': 'Generate SEO-optimized metadata for stock photography platforms using AI.',
        'color': '#8b5cf6',
        'category': 'ai',
    },
]


TOOL_TEMPLATES = {
    'remove-background': 'tools/remove_background.html',
    'enhance-images': 'tools/enhance_images.html',
    'extract-text': 'tools/extract_text.html',
    'reduce-image-size': 'tools/reduce_image_size.html',
    'pdf-to-docx': 'tools/pdf_to_docx.html',
    'optimize-pdf': 'tools/optimize_pdf.html',
    'microstock-metadata': 'tools/microstock_metadata.html',
}


def home(request):
    image_tools = [t for t in TOOLS if t['category'] == 'image']
    pdf_tools = [t for t in TOOLS if t['category'] == 'pdf']
    ai_tools = [t for t in TOOLS if t['category'] == 'ai']
    featured = next((t for t in TOOLS if t['slug'] == 'microstock-metadata'), None)
    return render(request, 'home.html', {
        'tools': TOOLS,
        'image_tools': image_tools,
        'pdf_tools': pdf_tools,
        'ai_tools': ai_tools,
        'featured': featured,
    })


def tool_detail(request, slug):
    tool = next((t for t in TOOLS if t['slug'] == slug), None)
    if tool is None:
        raise Http404('Tool not found')
    template_name = TOOL_TEMPLATES.get(slug, 'tool_detail.html')
    return render(request, template_name, {'tool': tool})
