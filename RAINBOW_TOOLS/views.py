# In your Django `views.py` file
from django.http import JsonResponse, Http404
from django.shortcuts import render


def connection_status(request):
    """
    Simple endpoint to check server connection.
    This will return a JSON response indicating the server is up.
    """
    try:
        # Perform any necessary actions to check the server, such as a database check.
        return JsonResponse({"status": "success", "message": "Server is up"}, status=200)
    except Exception as e:
        # If any error occurs (such as database connection error), return failure response
        return JsonResponse({"status": "error", "message": f"Server error: {str(e)}"}, status=500)


TOOLS = [
    {
        'slug': 'remove-background',
        'name': 'Remove Background',
        'icon': '🪄',
        'description': 'Remove image backgrounds instantly with AI.',
        'color': '#ec4899',
    },
    {
        'slug': 'enhance-images',
        'name': 'Enhance Images',
        'icon': '✨',
        'description': 'Sharpen, brighten and boost color in one click.',
        'color': '#f59e0b',
    },
    {
        'slug': 'extract-text',
        'name': 'Extract Text (OCR)',
        'icon': '🔤',
        'description': 'Pull readable text out of any image.',
        'color': '#3b82f6',
    },
    {
        'slug': 'reduce-image-size',
        'name': 'Reduce Image Size',
        'icon': '🗜️',
        'description': 'Compress images down to a target file size.',
        'color': '#10b981',
    },
    {
        'slug': 'pdf-to-docx',
        'name': 'PDF to DOCX',
        'icon': '📄',
        'description': 'Convert PDF documents into editable Word files.',
        'color': '#a855f7',
    },
    {
        'slug': 'optimize-pdf',
        'name': 'Optimize PDF',
        'icon': '📉',
        'description': 'Shrink PDF file size without losing quality.',
        'color': '#ef4444',
    },
    {
        'slug': 'microstock-metadata',
        'name': 'Microstock Metadata AI',
        'icon': '🏷️',
        'description': 'Generate SEO-optimized metadata for stock photography platforms using AI.',
        'color': '#8b5cf6',
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
    return render(request, 'home.html', {'tools': TOOLS})


def tool_detail(request, slug):
    tool = next((t for t in TOOLS if t['slug'] == slug), None)
    if tool is None:
        raise Http404('Tool not found')
    template_name = TOOL_TEMPLATES.get(slug, 'tool_detail.html')
    return render(request, template_name, {'tool': tool})
