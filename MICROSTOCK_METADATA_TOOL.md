# Microstock Metadata AI Tool - Complete Documentation

## Overview

Microstock Metadata AI Tool is a browser-based application that uses Google Gemini AI to automatically generate SEO-optimized metadata (title, description, keywords) for stock images/vectors, and reverse-engineers AI image generation prompts from uploaded artwork.

URL: https://rainbowtools.mediaghor.com/tools/microstock-metadata/

---

## Features

### 1. AI Metadata Generation (2-Stage Architecture)

**How it works:**
- STAGE 1 (Visual Inspection): Gemini AI performs deep visual inspection of the uploaded image — identifies main subject, all visible objects, text (OCR), artistic style, theme, colors, background, composition, content type, and confidence score (0-100%).
- STAGE 2 (Metadata Generation): From the Stage 1 visual inventory ONLY, generates SEO-optimized title, description, keywords, primary category, and secondary category. Never guesses or hallucinates — strictly pixel-based analysis.

**Key behaviors:**
- Titles NEVER start with generic prefixes like "EPS Vector of..." or "Graphic Design of..."
- First 10 keywords are the strongest search terms (ranked by relevance)
- Keywords are deduplicated, sanitized, and filtered against prohibited word list
- Single-word keyword splitting option available

### 2. Multi-Platform Support (8 Platforms)

Each platform has its own constraints and optimization rules:

| Platform | Max Keywords | Recommended | Max Title | Requires Description | First Keywords Priority |
|---|---|---|---|---|---|
| Adobe Stock | 49 | 45 | 200 chars | Yes | Yes |
| General Stock | 49 | 40 | 200 chars | Yes | No |
| Magnific AI | 40 | 35 | 220 chars | Yes | Yes |
| Shutterstock | 50 | 45 | 200 chars | Yes | No |
| Vecteezy | 45 | 35 | 180 chars | No | Yes |
| Depositphotos | 50 | 40 | 200 chars | Yes | No |
| 123RF | 50 | 40 | 160 chars | Yes | No |
| Dreamstime | 50 | 45 | 200 chars | Yes | No |

When switching platforms, metadata is automatically adapted — keywords are re-filtered, title/description constraints are applied, and Vecteezy gets special vector-related tags (vector, illustration, graphic, eps, editable, design asset).

### 3. Image-to-Prompt Reverse Engineering

Upload any image and get a complete AI generation prompt that could recreate it:
- **Positive Prompt**: Full detailed prompt for Midjourney v6 / SDXL / Flux.1 / DALL-E 3
- **Negative Prompt**: Optimized negative prompt
- **Style**: Artistic medium and style descriptor
- **Lighting**: Lighting setup description
- **Composition**: Compositional structure
- **Camera**: Lens, angle, and viewpoint
- **Colors**: Dominant color palette
- **Aspect Ratio**: Estimated aspect ratio
- **Parameters**: Standard Midjourney/SD parameters

### 4. EPS File Support (Server-Side Rendering)

- Upload .EPS files (Encapsulated PostScript vectors)
- Server renders EPS to PNG preview using Ghostscript (primary) or ImageMagick (fallback)
- Parses %%BoundingBox for DPI calculation (auto-scales to 1800px target)
- Handles DSC binary EPS headers
- Validates output PNG (magic bytes, dimensions)
- Transparent background support

**Rendering pipeline:**
```
EPS Upload → Base64 decode → Binary header clean → BoundingBox parse → DPI calculation
→ Ghostscript (gs -dSAFER -dBATCH -dNOPAUSE -dEPSCrop -sDEVICE=pngalpha) → PNG validate → Return preview
```

### 5. Batch Processing

- Upload multiple files at once (drag-drop or file picker)
- "Generate All" button processes entire batch
- Concurrency control: max 2 simultaneous AI requests
- Inter-request delay: 600ms between requests
- Rate limit handling: 4-second cooldown on 429 errors
- Progress bar with real-time stats (completed/total, rate limit indicators)
- Pause/Resume capability
- Individual file inspection from batch view

### 6. Metadata Editing & Management

**Title:**
- Editable text input
- Word count display (live)
- Regenerate button (re-runs AI analysis)
- Copy to clipboard

**Description:**
- Editable textarea
- Word count display (live)
- Regenerate button
- Copy to clipboard

**Keywords:**
- Tag-based display with rank indicators (#1-#10 highlighted as "top 10")
- Move left/right to reorder keywords (within top 10)
- Remove individual keywords
- Add new keywords manually (comma-separated input)
- Sort alphabetically (A-Z button)
- Copy all keywords to clipboard
- Live count display (current / max for platform)

### 7. Quality Scoring System

Three automated quality scores (0-99):
- **Visual Accuracy**: Based on prohibited word removal, keyword count, confidence
- **Keyword Relevance**: Based on duplicate removal, title word count compliance
- **SEO Potential**: Based on keyword count ratio (more keywords = higher score)

Score thresholds:
- Accuracy starts at 96, penalized by prohibited words and low keyword count
- Relevance starts at 94, boosted by title compliance, penalized by duplicates
- SEO starts at 75-98 based on keyword fill ratio, boosted at 40+ keywords

### 8. Export

- **CSV**: Filename, File Type, Title, Description, Keywords, Category, Secondary Category, Content Type, Style, Colors, Orientation, Background
- **JSON**: Structured data with all metadata fields
- Proper CSV escaping (quotes, commas, newlines)
- Blob download with correct MIME types

### 9. Client-Side & Server-Side Caching

**Client-side (browser):**
- In-memory Map cache keyed by file hash
- Avoids redundant API calls for same file
- Cache survives within session

**Server-side:**
- In-memory dict cache in `gemini_client.py` for visual analysis results
- In-memory dict cache in `eps_renderer.py` for EPS render results
- Keyed by SHA-256 file hash
- Persists across requests (until server restart)

### 10. Settings Panel

All settings persisted to localStorage:

| Setting | Default | Description |
|---|---|---|
| Min Title Words | 8 | Minimum title word count |
| Max Title Words | 22 | Maximum title word count |
| Min Keywords | 25 | Minimum keyword count |
| Max Keywords | 49 | Maximum keyword count |
| Min Description Words | 18 | Minimum description word count |
| Max Description Words | 32 | Maximum description word count |
| Single Word Keywords | true | Split multi-word keywords into individual words |
| Custom Prompt | false | Enable custom AI instructions |
| Custom Prompt Text | (empty) | Custom instructions injected into AI system prompt |
| Prohibited Words | false | Enable banned word filtering |
| Prohibited Words Text | (empty) | Comma-separated words to exclude |

Reset button restores all defaults.

### 11. Sample Artworks

4 embedded SVG sample artworks for quick demo without uploading:
- **Tropical Monsetera Botanical** (Plants and Flowers)
- **Isometric AI Cloud Computing** (Technology)
- **Corporate Business Team** (Business)
- **Vintage Coffee Roasters Badge** (Food)

---

## Technical Architecture

### Backend Stack

| Component | Technology | Purpose |
|---|---|---|
| Framework | Django 5.1.4 | Web framework |
| Language | Python 3.12 | Server runtime |
| AI Model | Google Gemini 3.7-flash | Visual analysis + metadata generation |
| AI SDK | google-genai 2.19.0 | Gemini API client |
| EPS Renderer | Ghostscript 10.02.1 | EPS-to-PNG rendering (fallback: ImageMagick) |
| WSGI Server | Gunicorn 23.0.0 | Production app server |
| Web Server | Nginx | Reverse proxy, static files |
| OS | Ubuntu (Linux) | Server platform |

### Frontend Stack

| Component | Technology | Purpose |
|---|---|---|
| Language | Vanilla JavaScript (ES6+) | No framework, pure JS |
| Architecture | IIFE + Module pattern | Encapsulated modules |
| Styling | Custom CSS (912 lines) | Dark theme, responsive |
| Templates | Django Templates (161 lines) | Server-rendered HTML |

### API Endpoints

| Endpoint | Method | Purpose |
|---|---|---|
| `/microstock-metadata/api/analyze-metadata/` | POST | 2-stage AI metadata generation |
| `/microstock-metadata/api/image-to-prompt/` | POST | Image-to-prompt reverse engineering |
| `/microstock-metadata/api/render-eps/` | POST | EPS-to-PNG server-side rendering |

### Request/Response Schema

**analyze-metadata Request:**
```json
{
    "image": "base64...",
    "mimeType": "image/png",
    "fileName": "artwork.png",
    "platform": "adobe-stock",
    "settings": { "minTitleWords": 8, "maxKeywords": 49, ... },
    "fileHash": "abc123"
}
```

**analyze-metadata Response:**
```json
{
    "analysis": {
        "main_subject": "Tropical monstera leaves",
        "objects": ["monstera leaf", "flower"],
        "visible_text": [],
        "style": "Digital Illustration",
        "theme": "Nature",
        "colors": ["green", "red", "yellow"],
        "background": "Dark gradient",
        "composition": "Centered",
        "content_type": "Vector",
        "confidence": 95
    },
    "metadata": {
        "title": "Tropical Monstera Deliciosa Botanical Leaves",
        "description": "Vibrant tropical monstera...",
        "keywords": ["monstera", "tropical", "botanical", ...],
        "category": "Plants and Flowers",
        "secondary_category": "Illustration"
    }
}
```

### AI Prompt Architecture

**System Instruction (Metadata Mode):**
- Two-stage analysis directive (visual inspection → metadata generation)
- Anti-hallucination rules (pixel-based only, no filename guessing)
- OCR rules (verbatim text reading, placeholder text handling)
- Title rules (no generic prefixes, subject-first)
- Description rules (word count limits)
- Keyword rules (ranking priority, single-word splitting, prohibited words)
- Custom prompt injection (user-defined commercial focus)

**System Instruction (Prompt Mode):**
- Elite AI Prompt Reverse-Engineer persona
- Targets Midjourney v6, SDXL, Flux.1, DALL-E 3
- Reconstructs full prompt with technical parameters

### Error Handling

| Error Code | User Message | Retryable |
|---|---|---|
| 429 / RESOURCE_EXHAUSTED | API quota/rate limit reached | Yes |
| 503 / UNAVAILABLE | AI service temporarily unavailable | Yes |
| 504 / TIMEOUT | AI vision analysis timed out | Yes |
| 500 / AI_ANALYSIS_FAILED | AI generation failed | Yes |
| EPS_RENDER_FAILED | Unable to render EPS preview | Yes |

Retry logic: 3 attempts with exponential backoff (2s, 5s, 10s)

### File Processing Pipeline

```
Image Upload (JPG/PNG/WebP/SVG)
→ Client-side resize (max 1800px)
→ Canvas toDataURL (JPEG 85% quality or PNG)
→ Base64 encode + simple hash
→ POST to /api/analyze-metadata/
→ Gemini AI analysis (2-stage)
→ Platform adaptation (keyword re-ranking, constraint filtering)
→ Quality scoring
→ Display in detail/batch view

EPS Upload
→ Base64 encode
→ POST to /api/render-eps/
→ Server: base64 decode → binary clean → BoundingBox parse → DPI calc
→ Ghostscript render → PNG validate → base64 encode
→ Return preview to client
→ POST to /api/analyze-metadata/ (same as image flow)
```

### Dependencies

**Python packages:**
- google-genai==2.19.0
- Django==5.1.4
- gunicorn==23.0.0
- firebase-admin==6.6.0

**System packages:**
- Ghostscript (gs) — EPS rendering
- ImageMagick (convert) — EPS fallback renderer

### Configuration

**Environment Variables:**
- `GEMINI_API_KEY` — Google Gemini API key (set in systemd service)
- `DJANGO_DEBUG` — Debug mode
- `ALLOWED_HOSTS` — Allowed hostnames
- `SECRET_KEY` — Django secret key

**Django Settings:**
- `DATA_UPLOAD_MAX_MEMORY_SIZE` = 100MB (for large EPS files)
- CSRF exempt on all API views (stateless API)

---

## Security Notes

- All API views are `@csrf_exempt` (stateless API, no session auth)
- No rate limiting on server side (relies on Gemini's own quota)
- No user authentication required (public tool)
- API key stored in systemd environment (not in code)
- Firebase service account for auth (separate system)

---

## Performance

- Client-side image resize before upload (reduces payload)
- Server-side in-memory caching (avoids redundant AI calls)
- Batch concurrency limit (2 simultaneous requests)
- Inter-request delay (600ms) to avoid rate limits
- Ghostscript timeout (15 seconds) for EPS rendering
- Gunicorn workers: 2, timeout: 120s
