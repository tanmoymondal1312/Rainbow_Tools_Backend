import json
import logging

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from .gemini_client import (
    GEMINI_MODEL,
    get_gemini_client,
    classify_ai_error,
    generate_content_with_retry,
    get_cached_analysis,
    set_cached_analysis,
)
from .eps_renderer import render_eps_to_png
from .platforms import PLATFORMS
from .validation import adapt_metadata_for_platform

logger = logging.getLogger(__name__)

GENAI_SCHEMA = {
    'response_mime_type': 'application/json',
    'response_schema': {
        'type': 'object',
        'properties': {
            'analysis': {
                'type': 'object',
                'properties': {
                    'main_subject': {'type': 'string', 'description': 'The single most important core subject visibly present in the artwork'},
                    'objects': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Inventory of all major and secondary visible objects'},
                    'visible_text': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Exact text visibly printed/drawn in the artwork'},
                    'style': {'type': 'string', 'description': 'Artistic and visual style'},
                    'theme': {'type': 'string', 'description': 'Theme or conceptual context'},
                    'colors': {'type': 'array', 'items': {'type': 'string'}, 'description': 'List of dominant visible colors'},
                    'background': {'type': 'string', 'description': 'Background description'},
                    'composition': {'type': 'string', 'description': 'Composition layout'},
                    'content_type': {'type': 'string', 'description': 'Content type classification'},
                    'confidence': {'type': 'integer', 'description': 'Visual recognition confidence percentage (0 to 100)'},
                },
                'required': ['main_subject', 'objects', 'visible_text', 'style', 'theme', 'colors', 'background', 'composition', 'content_type', 'confidence'],
            },
            'metadata': {
                'type': 'object',
                'properties': {
                    'title': {'type': 'string', 'description': 'Microstock SEO title'},
                    'description': {'type': 'string', 'description': 'Commercial microstock description'},
                    'keywords': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Strictly prioritized keywords'},
                    'category': {'type': 'string', 'description': 'Primary microstock category'},
                    'secondary_category': {'type': 'string', 'description': 'Secondary related microstock category'},
                },
                'required': ['title', 'description', 'keywords', 'category', 'secondary_category'],
            },
        },
        'required': ['analysis', 'metadata'],
    },
}

PROMPT_SCHEMA = {
    'response_mime_type': 'application/json',
    'response_schema': {
        'type': 'object',
        'properties': {
            'prompt': {'type': 'string', 'description': 'Complete positive prompt'},
            'negativePrompt': {'type': 'string', 'description': 'Optimized negative prompt'},
            'style': {'type': 'string', 'description': 'Artistic medium and style descriptor'},
            'lighting': {'type': 'string', 'description': 'Lighting setup'},
            'composition': {'type': 'string', 'description': 'Compositional structure'},
            'camera': {'type': 'string', 'description': 'Camera lens, angle, and viewpoint'},
            'colors': {'type': 'array', 'items': {'type': 'string'}, 'description': 'Dominant color palette'},
            'aspectRatio': {'type': 'string', 'description': 'Estimated aspect ratio'},
            'parameters': {'type': 'string', 'description': 'Standard Midjourney / SD parameters'},
        },
        'required': ['prompt', 'negativePrompt', 'style', 'lighting', 'composition', 'camera', 'colors', 'aspectRatio', 'parameters'],
    },
}


def _build_system_instruction(settings):
    min_title = settings.get('minTitleWords', 8)
    max_title = settings.get('maxTitleWords', 22)
    min_kw = settings.get('minKeywords', 25)
    max_kw = settings.get('maxKeywords', 49)
    min_desc = settings.get('minDescriptionWords', 18)
    max_desc = settings.get('maxDescriptionWords', 32)
    single_word = settings.get('singleWordKeywords', True)
    custom_prompt = settings.get('customPromptText', '') if settings.get('customPromptEnabled') else ''
    prohibited = settings.get('prohibitedWordsText', '') if settings.get('prohibitedWordsEnabled') else ''

    return f"""You are a professional microstock metadata visual analyst and commercial taxonomist.

CRITICAL DIRECTIVES:
1. TWO-STAGE ANALYSIS ARCHITECTURE:
   - STAGE 1 (VISUAL INSPECTION): First, execute a thorough, deep visual inspection of the rendered artwork. Inspect the main subject, every major visible object, secondary objects, shapes, characters, animals, plants, people, icons, symbols, typography, visible text, background, pattern, composition, dominant colors, artistic style, theme, concept, and intended visual purpose. Assess your visual analysis confidence (0-100).
   - STAGE 2 (METADATA GENERATION): Derive all title, description, category, and keyword metadata EXCLUSIVELY from the STAGE 1 visual inspection inventory.

2. NEVER GUESS OR HALLUCINATE:
   - Base all analysis strictly on what is visibly present in the pixels.
   - Do NOT use or infer from the filename.
   - If visual evidence is ambiguous, DO NOT guess. Omit uncertain elements. Accuracy is paramount over volume.

3. VISIBLE TEXT & OCR:
   - Read actual visible text verbatim. If no readable text is present, visible_text MUST be empty [].
   - If placeholder text like "YOUR TEXT", "LOREM IPSUM", or "SAMPLE TEXT" appears, note it but DO NOT treat it as the artwork's subject.

4. TITLE SPECIFICATION:
   - The title MUST start with or strongly focus on the single most important visual subject.
   - Length: {min_title} to {max_title} words.
   - STRICTLY FORBIDDEN: Do NOT start titles with generic boilerplate like "EPS", "Vector", "Artwork", "Graphic", "Template", "Design", or "Illustration" unless that is genuinely the visible subject.

5. DESCRIPTION SPECIFICATION:
   - Length: {min_desc} to {max_desc} words.
   - Provide an accurate description of what is actually visible.

6. KEYWORD SPECIFICATION & STRICT RANKING:
   - Do NOT force-fill keywords with irrelevant fluff. Generate only visually supported, highly relevant terms.
   - Maximum {max_kw} keywords. If only 18-25 highly accurate keywords exist, return only those.
   - The first 10 keywords MUST be the absolute strongest search terms.
   - {"Prioritize strong single-word keywords where appropriate, but allow meaningful multi-word phrases if essential." if single_word else "Multi-word phrases and single words are both permitted where natural."}
   {"- STRICTLY PROHIBITED WORDS (Do not use): [" + prohibited + "]." if prohibited else ""}
   {"- Commercial Focus Directive: \"" + custom_prompt + "\" (apply strictly to visually supported elements)." if custom_prompt else ""}"""


@csrf_exempt
async def analyze_metadata(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({'error': 'Invalid JSON body'}, status=400)

    image = body.get('image')
    if not image:
        return JsonResponse({'error': 'Image base64 data is required for visual analysis.'}, status=400)

    mime_type = body.get('mimeType', 'image/png')
    file_name = body.get('fileName', '')
    platform = body.get('platform', 'adobe-stock')
    settings = body.get('settings', {})
    file_hash = body.get('fileHash', '')

    cached, cache_key = get_cached_analysis(file_hash, image)
    if cached:
        logger.info(f'[AI Vision Cache Hit] Reusing visual analysis for {file_name or "artwork"}')
        return JsonResponse(cached)

    try:
        client = get_gemini_client()
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=500)

    system_instruction = _build_system_instruction(settings)
    user_prompt = """Perform a deep 2-stage visual analysis of this rendered artwork preview.
STAGE 1: Create an exhaustive visual inventory of visible subjects, objects, text, style, colors, and background.
STAGE 2: Generate highly accurate, strictly ranked microstock metadata derived solely from your visual inventory."""

    request_payload = {
        'model': GEMINI_MODEL,
        'contents': {
            'parts': [
                {'inline_data': {'mime_type': mime_type, 'data': image}},
                {'text': user_prompt},
            ],
        },
        'config': {
            'system_instruction': system_instruction,
            **GENAI_SCHEMA,
        },
    }

    try:
        response = generate_content_with_retry(client, request_payload)
        text_output = response.text
        if not text_output:
            raise Exception('AI returned empty response.')

        parsed = json.loads(text_output)
        if parsed.get('analysis') and not parsed.get('visual_analysis'):
            parsed['visual_analysis'] = parsed['analysis']
        elif parsed.get('visual_analysis') and not parsed.get('analysis'):
            parsed['analysis'] = parsed['visual_analysis']

        set_cached_analysis(cache_key, parsed)
        return JsonResponse(parsed)

    except Exception as e:
        logger.error(f'[AI Vision Analysis Error]: {e}')
        classified = classify_ai_error(e)
        return JsonResponse(classified, status=classified['statusCode'])


@csrf_exempt
async def image_to_prompt(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({'error': 'Invalid JSON body'}, status=400)

    image = body.get('image')
    if not image:
        return JsonResponse({'error': 'Image base64 data is required.'}, status=400)

    mime_type = body.get('mimeType', 'image/png')
    file_name = body.get('fileName', 'artwork')

    try:
        client = get_gemini_client()
    except ValueError as e:
        return JsonResponse({'error': str(e)}, status=500)

    system_instruction = """You are an elite AI Prompt Reverse-Engineer and Prompt Engineer for generative image models (Midjourney v6, Stable Diffusion XL, Flux.1, DALL-E 3).
Analyze the visual input deeply to reconstruct the most accurate, detailed, and high-fidelity text prompt that could recreate this artwork from scratch."""

    prompt_text = f'Reverse-engineer this artwork (Filename: {file_name}) into a comprehensive AI image generation prompt and technical parameters.'

    request_payload = {
        'model': GEMINI_MODEL,
        'contents': {
            'parts': [
                {'inline_data': {'mime_type': mime_type, 'data': image}},
                {'text': prompt_text},
            ],
        },
        'config': {
            'system_instruction': system_instruction,
            **PROMPT_SCHEMA,
        },
    }

    try:
        response = generate_content_with_retry(client, request_payload)
        text_output = response.text
        if not text_output:
            raise Exception('AI returned empty response.')

        parsed = json.loads(text_output)
        return JsonResponse(parsed)

    except Exception as e:
        logger.error(f'Prompt generation error: {e}')
        classified = classify_ai_error(e)
        return JsonResponse(classified, status=classified['statusCode'])


@csrf_exempt
async def render_eps(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid request method'}, status=405)

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, ValueError):
        return JsonResponse({'error': 'Invalid JSON body'}, status=400)

    file_data = body.get('fileData')
    file_name = body.get('fileName', 'artwork.eps')

    if not file_data:
        return JsonResponse({'error': 'EPS file data (base64) is required.'}, status=400)

    try:
        result = render_eps_to_png(file_data, file_name)
        return JsonResponse({'success': True, **result})
    except Exception as e:
        logger.error(f'[EPS Render Error]: {e}')
        return JsonResponse({
            'error': 'Unable to render EPS preview. Please retry.',
            'canRetry': True,
            'details': str(e),
        }, status=422)
