import express from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import { renderEpsToPng } from './server/epsRenderer';

dotenv.config();

const app = express();
const PORT = 3000;

// Central Gemini Vision Model Configuration
const GEMINI_VISION_MODEL = 'gemini-3.7-flash';

// Body parser for base64 image payloads (up to 50MB for high-res microstock images)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Lazy Google Gen AI client helper
function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Classify Gemini API errors into clean HTTP status codes and actionable descriptions
 */
function classifyAiError(err: any): {
  statusCode: number;
  errorCode: string;
  error: string;
  technicalDetails: string;
  canRetry: boolean;
} {
  const message = err?.message || String(err);
  const isRateLimit =
    message.includes('429') ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('quota') ||
    message.includes('Rate limit') ||
    message.includes('rate-limit') ||
    message.includes('exhausted');

  const isUnavailable =
    message.includes('503') ||
    message.includes('UNAVAILABLE') ||
    message.includes('overloaded') ||
    message.includes('high demand');

  const isTimeout =
    message.includes('504') ||
    message.includes('TIMEOUT') ||
    message.includes('timed out') ||
    message.includes('DEADLINE_EXCEEDED');

  if (isRateLimit) {
    return {
      statusCode: 429,
      errorCode: '429 / RESOURCE_EXHAUSTED',
      error: 'API quota or rate limit exceeded. Please wait a moment or retry.',
      technicalDetails: message,
      canRetry: true,
    };
  }

  if (isUnavailable) {
    return {
      statusCode: 503,
      errorCode: '503 / SERVICE_UNAVAILABLE',
      error: 'Gemini service is temporarily unavailable or overloaded.',
      technicalDetails: message,
      canRetry: true,
    };
  }

  if (isTimeout) {
    return {
      statusCode: 504,
      errorCode: '504 / TIMEOUT',
      error: 'AI vision analysis timed out.',
      technicalDetails: message,
      canRetry: true,
    };
  }

  return {
    statusCode: 500,
    errorCode: '500 / AI_ANALYSIS_FAILED',
    error: 'AI vision analysis failed. Please retry.',
    technicalDetails: message,
    canRetry: true,
  };
}

// In-memory cache for AI Visual Analysis: hash -> visual analysis object
interface CachedVisualAnalysis {
  analysis: {
    main_subject: string;
    objects: string[];
    visible_text: string[];
    style: string;
    theme: string;
    colors: string[];
    background: string;
    composition: string;
    content_type: string;
    confidence?: number;
  };
  visual_analysis?: {
    main_subject: string;
    objects: string[];
    visible_text: string[];
    style: string;
    theme: string;
    colors: string[];
    background: string;
    composition: string;
    content_type: string;
    confidence?: number;
  };
  metadata: {
    title: string;
    description: string;
    keywords: string[];
    category: string;
    secondary_category: string;
  };
}

const visualAnalysisCache = new Map<string, CachedVisualAnalysis>();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', model: GEMINI_VISION_MODEL, timestamp: new Date().toISOString() });
});

// API: Render EPS to PNG Preview (Server-Side with Ghostscript & ImageMagick fallback)
app.post('/api/render-eps', async (req, res) => {
  try {
    const { fileData, fileName } = req.body;

    if (!fileData) {
      return res.status(400).json({ error: 'EPS file data (base64) is required.' });
    }

    // Strip data url prefix if present
    const base64Clean = fileData.includes(',') ? fileData.split(',')[1] : fileData;
    const epsBuffer = Buffer.from(base64Clean, 'base64');

    if (!epsBuffer || epsBuffer.length === 0) {
      return res.status(400).json({ error: 'Uploaded EPS file is empty or corrupted.' });
    }

    console.log(`[EPS Render] Rendering preview for ${fileName || 'artwork.eps'} (${epsBuffer.length} bytes)...`);

    const result = await renderEpsToPng(epsBuffer, fileName || 'artwork.eps');

    console.log(`[EPS Render] Successfully rendered preview: ${result.dimensions}`);

    return res.json({
      success: true,
      previewUrl: result.previewUrl,
      base64Data: result.base64Data,
      mimeType: result.mimeType,
      width: result.width,
      height: result.height,
      dimensions: result.dimensions,
      orientation: result.orientation,
      hasTransparency: result.hasTransparency,
      backgroundType: result.backgroundType,
      dominantColors: result.dominantColors,
    });
  } catch (error: any) {
    console.error('[EPS Render Error]:', error);
    return res.status(422).json({
      error: 'Unable to render EPS preview. Please retry.',
      canRetry: true,
      details: error?.message || 'Ghostscript / EPS rendering failed.',
    });
  }
});

// Helper: AI Request with Exponential Backoff Retry (Attempt 1: 2s -> Attempt 2: 5s -> Attempt 3: 10s)
const BACKOFF_DELAYS = [2000, 5000, 10000];

async function generateContentWithRetry(ai: GoogleGenAI, requestPayload: any, maxRetries = 3) {
  let attempt = 0;
  let lastError: any = null;

  while (attempt <= maxRetries) {
    try {
      return await ai.models.generateContent(requestPayload);
    } catch (err: any) {
      lastError = err;
      attempt++;
      if (attempt > maxRetries) break;

      const delayMs = BACKOFF_DELAYS[attempt - 1] || 5000;
      console.warn(`[AI Vision] Request failed (attempt ${attempt}/${maxRetries}). Retrying in ${delayMs}ms...`, err?.message);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error('AI processing failed after retries.');
}

// API: Analyze Artwork & Generate Microstock Metadata (Strict ONE Vision Request)
app.post('/api/analyze-metadata', async (req, res) => {
  try {
    const {
      image,
      mimeType = 'image/png',
      fileName,
      fileType,
      platform = 'adobe-stock',
      settings = {},
      fileHash,
    } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image base64 data is required for visual analysis.' });
    }

    // Check Visual Analysis Cache by hash if provided
    const cacheKey = fileHash || crypto.createHash('sha256').update(image.slice(0, 10000)).digest('hex');
    const cached = visualAnalysisCache.get(cacheKey);

    if (cached) {
      console.log(`[AI Vision Cache Hit] Reusing visual analysis for ${fileName || 'artwork'}`);
      return res.json(cached);
    }

    const ai = getGenAIClient();

    const minTitleWords = settings.minTitleWords || 8;
    const maxTitleWords = settings.maxTitleWords || 22;
    const minKeywords = settings.minKeywords || 25;
    const maxKeywords = settings.maxKeywords || 49;
    const minDescWords = settings.minDescriptionWords || 18;
    const maxDescWords = settings.maxDescriptionWords || 32;
    const singleWordKeywords = settings.singleWordKeywords !== false;
    const customPrompt = settings.customPromptEnabled && settings.customPromptText ? settings.customPromptText : '';
    const prohibitedWords = settings.prohibitedWordsEnabled && settings.prohibitedWordsText ? settings.prohibitedWordsText : '';

    const systemInstruction = `You are a professional microstock metadata visual analyst and commercial taxonomist.

CRITICAL DIRECTIVES:
1. TWO-STAGE ANALYSIS ARCHITECTURE:
   - STAGE 1 (VISUAL INSPECTION): First, execute a thorough, deep visual inspection of the rendered artwork. Inspect the main subject, every major visible object, secondary objects, shapes, characters, animals, plants, people, icons, symbols, typography, visible text, background, pattern, composition, dominant colors, artistic style, theme, concept, and intended visual purpose. Assess your visual analysis confidence (0-100).
   - STAGE 2 (METADATA GENERATION): Derive all title, description, category, and keyword metadata EXCLUSIVELY from the STAGE 1 visual inspection inventory.

2. NEVER GUESS OR HALLUCINATE:
   - Base all analysis strictly on what is visibly present in the pixels.
   - Do NOT use or infer from the filename.
   - If visual evidence is ambiguous (e.g. uncertain if an element is a leaf or flame), DO NOT guess. Omit uncertain elements. Accuracy is paramount over volume.
   - Do not invent brands, locations, people, objects, or text.

3. VISIBLE TEXT & OCR:
   - Read actual visible text verbatim. If no readable text is present, visible_text MUST be empty [].
   - If placeholder text like "YOUR TEXT", "LOREM IPSUM", or "SAMPLE TEXT" appears, note it but DO NOT treat it as the artwork's subject.

4. TITLE SPECIFICATION:
   - The title MUST start with or strongly focus on the single most important visual subject.
   - Follow with important secondary objects, artistic style/theme, and specific visual detail in natural English.
   - Length: ${minTitleWords} to ${maxTitleWords} words.
   - STRICTLY FORBIDDEN: Do NOT start titles with generic boilerplate like "EPS", "Vector", "Artwork", "Graphic", "Template", "Design", or "Illustration" unless that is genuinely the visible subject.
   - No keyword stuffing, no generic filler, no hype adjectives.

5. DESCRIPTION SPECIFICATION:
   - Length: ${minDescWords} to ${maxDescWords} words.
   - Provide an accurate description of what is actually visible: main subject, key objects, style, theme, background, composition, and practical commercial applications.
   - Avoid generic boilerplate that could apply to any vector.

6. KEYWORD SPECIFICATION & STRICT RANKING:
   - Do NOT force-fill keywords with irrelevant fluff. Generate only visually supported, highly relevant terms.
   - Maximum ${maxKeywords} keywords. If only 18-25 highly accurate keywords exist, return only those.
   - The first 10 keywords MUST be the absolute strongest search terms.
   - Strict ranking order:
     1. Main visible subject (first 3-5 terms)
     2. Core concept & meaning
     3. Important visible objects & elements
     4. Specific visual details & shapes
     5. Artistic style & execution
     6. Theme & context
     7. Background & composition
     8. Dominant visible colors
     9. Practical commercial use cases
   - Do NOT place generic words like "vector", "graphic", "design" ahead of the actual visual subject in the keyword list.
   - ${singleWordKeywords ? 'Prioritize strong single-word keywords where appropriate, but allow meaningful multi-word phrases if essential for accurate representation.' : 'Multi-word phrases and single words are both permitted where natural.'}
   ${prohibitedWords ? `- STRICTLY PROHIBITED WORDS (Do not use): [${prohibitedWords}].` : ''}
   ${customPrompt ? `- Commercial Focus Directive: "${customPrompt}" (apply strictly to visually supported elements).` : ''}`;

    const userPrompt = `Perform a deep 2-stage visual analysis of this rendered artwork preview.
STAGE 1: Create an exhaustive visual inventory of visible subjects, objects, text, style, colors, and background.
STAGE 2: Generate highly accurate, strictly ranked microstock metadata derived solely from your visual inventory.`;

    const response = await generateContentWithRetry(ai, {
      model: 'gemini-3.7-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'image/png',
              data: image,
            },
          },
          { text: userPrompt },
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis: {
              type: Type.OBJECT,
              properties: {
                main_subject: {
                  type: Type.STRING,
                  description: 'The single most important core subject visibly present in the artwork',
                },
                objects: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Inventory of all major and secondary visible objects, shapes, characters, or elements',
                },
                visible_text: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Exact text visibly printed/drawn in the artwork (empty array if none)',
                },
                style: {
                  type: Type.STRING,
                  description: 'Artistic and visual style (e.g. Flat vector, Isometric, Line art, Vintage engraving, Cartoon, Minimalist, 3D Render)',
                },
                theme: {
                  type: Type.STRING,
                  description: 'Theme or conceptual context (e.g. Botanical Nature, Finance, Healthcare, Cyber Security, Food & Dining)',
                },
                colors: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'List of dominant visible colors',
                },
                background: {
                  type: Type.STRING,
                  description: 'Background description (e.g. Transparent, Isolated on White, Dark Slate, Geometric Pattern, Gradient)',
                },
                composition: {
                  type: Type.STRING,
                  description: 'Composition layout (e.g. Centered emblem, Symmetrical, Grid pattern, Horizontal banner, Floating isometric)',
                },
                content_type: {
                  type: Type.STRING,
                  description: 'Content type classification (e.g. Vector, Illustration, Icon, Logo, Badge, Pattern, Infographic, Background)',
                },
                confidence: {
                  type: Type.INTEGER,
                  description: 'Visual recognition confidence percentage (0 to 100) based on visual clarity and certainty',
                },
              },
              required: [
                'main_subject',
                'objects',
                'visible_text',
                'style',
                'theme',
                'colors',
                'background',
                'composition',
                'content_type',
                'confidence',
              ],
            },
            metadata: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: `Microstock SEO title (${minTitleWords}-${maxTitleWords} words) starting with main subject, no generic prefixes`,
                },
                description: {
                  type: Type.STRING,
                  description: `Commercial microstock description (${minDescWords}-${maxDescWords} words) describing actual visual elements and uses`,
                },
                keywords: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: `Strictly prioritized keywords ranked with top 10 strongest terms first (max ${maxKeywords})`,
                },
                category: {
                  type: Type.STRING,
                  description: 'Primary microstock category (e.g. Plants and Flowers, Technology, Business, Food, Graphic Resources, Animals, Architecture)',
                },
                secondary_category: {
                  type: Type.STRING,
                  description: 'Secondary related microstock category',
                },
              },
              required: [
                'title',
                'description',
                'keywords',
                'category',
                'secondary_category',
              ],
            },
          },
          required: ['analysis', 'metadata'],
        },
      },
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error('AI returned empty response.');
    }

    let parsed: CachedVisualAnalysis;
    try {
      parsed = JSON.parse(textOutput);
      if (parsed.analysis && !parsed.visual_analysis) {
        parsed.visual_analysis = parsed.analysis;
      } else if (parsed.visual_analysis && !parsed.analysis) {
        parsed.analysis = parsed.visual_analysis;
      }
    } catch (parseErr) {
      console.error('[AI JSON Parse Error]:', textOutput);
      throw new Error('AI returned malformed JSON structure.');
    }

    // Cache the visual analysis
    visualAnalysisCache.set(cacheKey, parsed);

    return res.json(parsed);
  } catch (error: any) {
    console.error('[AI Vision Analysis Error]:', error);
    const classified = classifyAiError(error);
    return res.status(classified.statusCode).json(classified);
  }
});

// API: Image To Prompt Generator (Single Vision Request)
app.post('/api/image-to-prompt', async (req, res) => {
  try {
    const { image, mimeType = 'image/png', fileName } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image base64 data is required.' });
    }

    const ai = getGenAIClient();

    const systemInstruction = `You are an elite AI Prompt Reverse-Engineer and Prompt Engineer for generative image models (Midjourney v6, Stable Diffusion XL, Flux.1, DALL-E 3).
Analyze the visual input deeply to reconstruct the most accurate, detailed, and high-fidelity text prompt that could recreate this artwork from scratch.`;

    const promptText = `Reverse-engineer this artwork (Filename: ${fileName || 'artwork'}) into a comprehensive AI image generation prompt and technical parameters.`;

    const response = await generateContentWithRetry(ai, {
      model: GEMINI_VISION_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'image/png',
              data: image,
            },
          },
          { text: promptText },
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prompt: {
              type: Type.STRING,
              description: 'Complete high-fidelity positive prompt describing subject, style, lighting, render engine, and mood',
            },
            negativePrompt: {
              type: Type.STRING,
              description: 'Optimized negative prompt to prevent artifacts, blur, bad anatomy, distortions',
            },
            style: {
              type: Type.STRING,
              description: 'Artistic medium and style descriptor (e.g. 3D Isometric Octane Render, Vector Flat Illustration, 35mm Film Photography)',
            },
            lighting: {
              type: Type.STRING,
              description: 'Lighting setup (e.g. Volumetric neon rim lighting, Soft golden hour, Studio softbox)',
            },
            composition: {
              type: Type.STRING,
              description: 'Compositional structure (e.g. Dynamic wide-angle, Centered symmetrical, Macro close-up)',
            },
            camera: {
              type: Type.STRING,
              description: 'Camera lens, angle, and viewpoint',
            },
            colors: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Dominant color palette and tones',
            },
            aspectRatio: {
              type: Type.STRING,
              description: 'Estimated aspect ratio (e.g. 16:9, 1:1, 4:3, 9:16)',
            },
            parameters: {
              type: Type.STRING,
              description: 'Standard Midjourney / SD parameters (e.g. --ar 16:9 --v 6.0 --style raw --stylize 250)',
            },
          },
          required: [
            'prompt',
            'negativePrompt',
            'style',
            'lighting',
            'composition',
            'camera',
            'colors',
            'aspectRatio',
            'parameters',
          ],
        },
      },
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error('AI returned empty response.');
    }

    const parsed = JSON.parse(textOutput);
    return res.json(parsed);
  } catch (error: any) {
    console.error('Prompt generation error:', error);
    const classified = classifyAiError(error);
    return res.status(classified.statusCode).json(classified);
  }
});

// Vite Middleware for dev / static for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Microstock Metadata AI Server running on http://localhost:${PORT}`);
  });
}

startServer();
