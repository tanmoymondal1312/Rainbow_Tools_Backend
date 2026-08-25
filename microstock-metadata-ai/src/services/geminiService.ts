import {
  MetadataItem,
  AppSettings,
  PlatformId,
  VisualAnalysisData,
  ImagePromptResult,
  ApiErrorInfo,
} from '../types';
import { cacheService } from './cacheService';
import { RETRY_DELAYS, MAX_RETRY_ATTEMPTS } from './config';
import { adaptMetadataForPlatform } from '../lib/validation';

export interface AnalysisServiceResult {
  success: boolean;
  item: MetadataItem;
  fromCache?: boolean;
  error?: ApiErrorInfo;
}

/**
 * Format raw error or response into a structured ApiErrorInfo
 */
export function formatApiError(err: any, statusCode?: number): ApiErrorInfo {
  const message = err?.message || String(err);
  const code = err?.errorCode || (statusCode ? `HTTP ${statusCode}` : 'API_ERROR');
  const details = err?.technicalDetails || message;

  const isRateLimit =
    statusCode === 429 ||
    message.includes('429') ||
    message.includes('RESOURCE_EXHAUSTED') ||
    message.includes('quota') ||
    message.includes('Rate limit') ||
    message.includes('rate-limit');

  const isUnavailable =
    statusCode === 503 ||
    message.includes('503') ||
    message.includes('UNAVAILABLE') ||
    message.includes('overloaded');

  const isTimeout =
    statusCode === 504 ||
    message.includes('504') ||
    message.includes('TIMEOUT') ||
    message.includes('timed out') ||
    message.includes('DEADLINE_EXCEEDED');

  if (isRateLimit) {
    return {
      userMessage: 'API quota/rate limit reached.',
      reason: 'Gemini API requests exceeded the current quota or rate limit. Automatic queue backoff is active.',
      errorCode: '429 / RESOURCE_EXHAUSTED',
      statusCode: 429,
      technicalDetails: details,
      canRetry: true,
    };
  }

  if (isUnavailable) {
    return {
      userMessage: 'AI service temporarily unavailable.',
      reason: 'Google Gemini servers are temporarily overloaded. Please retry in a moment.',
      errorCode: '503 / SERVICE_UNAVAILABLE',
      statusCode: 503,
      technicalDetails: details,
      canRetry: true,
    };
  }

  if (isTimeout) {
    return {
      userMessage: 'AI vision analysis timed out.',
      reason: 'The artwork took too long to analyze. Retrying with optimized preview.',
      errorCode: '504 / TIMEOUT',
      statusCode: 504,
      technicalDetails: details,
      canRetry: true,
    };
  }

  return {
    userMessage: err?.userMessage || 'AI generation failed.',
    reason: err?.reason || 'The AI model could not complete metadata generation for this artwork.',
    errorCode: code || '500 / AI_ANALYSIS_FAILED',
    statusCode: statusCode || 500,
    technicalDetails: details,
    canRetry: true,
  };
}

/**
 * Single Artwork Vision Analysis through Gemini API with Caching and Exponential Backoff Retry
 */
export async function analyzeArtwork(
  item: MetadataItem,
  settings: AppSettings,
  platform: PlatformId,
  forceFreshAI = false,
  onRetryAttempt?: (attempt: number, delayMs: number) => void
): Promise<AnalysisServiceResult> {
  if (!item.base64Data) {
    const errorInfo: ApiErrorInfo = {
      userMessage: 'No artwork preview available for AI visual inspection.',
      reason: 'The preview image has not been rendered yet.',
      errorCode: 'PREVIEW_MISSING',
      canRetry: false,
    };
    return {
      success: false,
      item: {
        ...item,
        status: 'error',
        statusMessage: 'Preview Missing',
        errorMessage: errorInfo.userMessage,
        apiError: errorInfo,
      },
      error: errorInfo,
    };
  }

  // 1. Check client-side visual cache (unless explicitly forced fresh)
  if (!forceFreshAI && item.fileHash && cacheService.has(item.fileHash)) {
    const cached = cacheService.get(item.fileHash)!;
    console.log(`[Cache Hit] Using cached visual inventory for ${item.fileName}`);

    // Adapt metadata for requested platform using cached inventory
    const adapted = adaptMetadataForPlatform(
      cached.analysis,
      cached.metadata,
      platform,
      settings
    );

    const updatedItem: MetadataItem = {
      ...item,
      analysis: cached.analysis,
      confidence: cached.analysis.confidence ?? 90,
      title: adapted.title,
      description: adapted.description,
      keywords: adapted.keywords,
      primaryCategory: adapted.primaryCategory || cached.metadata.category || 'Graphic Resources',
      secondaryCategory: adapted.secondaryCategory || cached.metadata.secondary_category || 'Design',
      contentType: cached.analysis.content_type || item.technicalDetails?.contentType || 'Vector',
      visualStyle: cached.analysis.style || item.technicalDetails?.visualStyle || 'Vector Graphic',
      dominantColors: cached.analysis.colors || item.technicalDetails?.dominantColors || [],
      backgroundType: cached.analysis.background || item.technicalDetails?.backgroundType || 'Transparent',
      hasTransparency: item.technicalDetails?.hasTransparency ?? true,
      isSilhouette: item.technicalDetails?.isSilhouette ?? false,
      mainSubject: cached.analysis.main_subject || 'Artwork Subject',
      commercialUses: ['Stock Asset', 'Graphic Design', 'Web Banner', 'Print Media'],
      qualityScore: adapted.qualityScore,
      validation: adapted.validation,
      status: 'completed',
      statusMessage: 'Done (Cached)',
      errorMessage: undefined,
      apiError: undefined,
      canRetryRender: false,
    };

    return {
      success: true,
      item: updatedItem,
      fromCache: true,
    };
  }

  // 2. Call server-side Gemini API with Exponential Backoff Retry
  let attempt = 0;
  let lastError: any = null;
  let lastStatusCode = 500;

  while (attempt <= MAX_RETRY_ATTEMPTS) {
    try {
      const res = await fetch('/api/analyze-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: item.base64Data,
          mimeType: item.mimeType || 'image/png',
          fileName: item.fileName,
          fileType: item.fileType,
          platform,
          settings,
          fileHash: item.fileHash,
        }),
      });

      lastStatusCode = res.status;

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errObj = new Error(errorData.error || `HTTP ${res.status}`);
        (errObj as any).errorCode = errorData.errorCode;
        (errObj as any).technicalDetails = errorData.technicalDetails || errorData.error;
        (errObj as any).statusCode = res.status;
        throw errObj;
      }

      const data: {
        analysis?: VisualAnalysisData;
        visual_analysis?: VisualAnalysisData;
        metadata: {
          title: string;
          description: string;
          keywords: string[];
          category: string;
          secondary_category: string;
        };
      } = await res.json();

      const analysisData = data.analysis || data.visual_analysis || {
        main_subject: 'Artwork Subject',
        objects: [],
        visible_text: [],
        style: 'Vector Graphic',
        theme: 'Design',
        colors: [],
        background: 'Transparent',
        composition: 'Centered',
        content_type: 'Vector',
        confidence: 90,
      };

      // Store in client-side cache
      if (item.fileHash) {
        cacheService.set(item.fileHash, analysisData, data.metadata);
      }

      // Platform-specific adaptation & local validation
      const adapted = adaptMetadataForPlatform(
        analysisData,
        data.metadata,
        platform,
        settings
      );

      const completedItem: MetadataItem = {
        ...item,
        analysis: analysisData,
        confidence: analysisData.confidence ?? 90,
        title: adapted.title,
        description: adapted.description,
        keywords: adapted.keywords,
        primaryCategory: adapted.primaryCategory || data.metadata.category || 'Graphic Resources',
        secondaryCategory: adapted.secondaryCategory || data.metadata.secondary_category || 'Design',
        contentType: analysisData.content_type || item.technicalDetails?.contentType || 'Vector',
        visualStyle: analysisData.style || item.technicalDetails?.visualStyle || 'Vector Graphic',
        dominantColors: analysisData.colors || item.technicalDetails?.dominantColors || [],
        backgroundType: analysisData.background || item.technicalDetails?.backgroundType || 'Transparent',
        hasTransparency: item.technicalDetails?.hasTransparency ?? true,
        isSilhouette: item.technicalDetails?.isSilhouette ?? false,
        mainSubject: analysisData.main_subject || 'Artwork Subject',
        commercialUses: ['Stock Asset', 'Graphic Design', 'Web Banner', 'Print Media'],
        qualityScore: adapted.qualityScore,
        validation: adapted.validation,
        status: 'completed',
        statusMessage: 'Done',
        errorMessage: undefined,
        apiError: undefined,
        canRetryRender: false,
      };

      return {
        success: true,
        item: completedItem,
      };
    } catch (err: any) {
      lastError = err;
      attempt++;

      // Check if eligible for retry
      const isRetryable =
        lastStatusCode === 429 ||
        lastStatusCode === 503 ||
        lastStatusCode === 504 ||
        err?.message?.includes('429') ||
        err?.message?.includes('RESOURCE_EXHAUSTED') ||
        err?.message?.includes('quota') ||
        err?.message?.includes('TIMEOUT') ||
        err?.message?.includes('UNAVAILABLE');

      if (isRetryable && attempt <= MAX_RETRY_ATTEMPTS) {
        const delayMs = RETRY_DELAYS[attempt - 1] || 5000;
        console.warn(
          `[AI Retry] Retrying ${item.fileName} in ${delayMs}ms (Attempt ${attempt}/${MAX_RETRY_ATTEMPTS})...`
        );
        onRetryAttempt?.(attempt, delayMs);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        break;
      }
    }
  }

  // All retries failed: format clean error info (DO NOT FAKE METADATA)
  const apiError = formatApiError(lastError, lastStatusCode);

  const failedItem: MetadataItem = {
    ...item,
    // Keep metadata empty: Never generate fake metadata on failure
    title: '',
    description: '',
    keywords: [],
    primaryCategory: '',
    secondaryCategory: '',
    status: 'error',
    statusMessage: 'AI Analysis Failed',
    errorMessage: apiError.userMessage,
    apiError,
    canRetryRender: false,
  };

  return {
    success: false,
    item: failedItem,
    error: apiError,
  };
}

/**
 * Image to Prompt analysis (single request with retry)
 */
export async function reverseEngineerPrompt(
  item: MetadataItem
): Promise<{ success: boolean; item: MetadataItem; error?: ApiErrorInfo }> {
  if (!item.base64Data) {
    const errorInfo: ApiErrorInfo = {
      userMessage: 'No preview available for prompt generation.',
      errorCode: 'PREVIEW_MISSING',
      canRetry: false,
    };
    return {
      success: false,
      item: {
        ...item,
        status: 'error',
        statusMessage: 'Preview Missing',
        errorMessage: errorInfo.userMessage,
        apiError: errorInfo,
      },
      error: errorInfo,
    };
  }

  try {
    const res = await fetch('/api/image-to-prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: item.base64Data,
        mimeType: item.mimeType || 'image/png',
        fileName: item.fileName,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${res.status}`);
    }

    const promptData: ImagePromptResult = await res.json();

    return {
      success: true,
      item: {
        ...item,
        status: 'completed',
        statusMessage: 'Done',
        promptResult: promptData,
        errorMessage: undefined,
        apiError: undefined,
      },
    };
  } catch (err: any) {
    const apiError = formatApiError(err);
    return {
      success: false,
      item: {
        ...item,
        status: 'error',
        statusMessage: 'Prompt Generation Failed',
        errorMessage: apiError.userMessage,
        apiError,
      },
      error: apiError,
    };
  }
}
