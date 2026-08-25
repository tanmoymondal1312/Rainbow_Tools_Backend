import { MetadataItem, AppSettings, PlatformId } from '../types';
import { analyzeArtwork } from './geminiService';
import { MAX_CONCURRENT_REQUESTS, INTER_REQUEST_DELAY_MS } from './config';

export interface QueueProgress {
  total: number;
  completed: number;
  processing: number;
  pending: number;
  failed: number;
  isPaused: boolean;
  isProcessing: boolean;
  rateLimitWaiting: boolean;
  rateLimitSecondsRemaining?: number;
}

export type QueueProgressCallback = (progress: QueueProgress) => void;
export type ItemUpdatedCallback = (item: MetadataItem) => void;

/**
 * Robust AI Request Queue with:
 * - Max concurrency = 2
 * - Automatic exponential backoff
 * - Rate-limit backoff pause & resume
 * - Fault tolerance (1 failed file does not stop batch)
 * - Pause and Resume controls
 * - Retry failed files support
 */
export class AIRequestQueue {
  private queue: MetadataItem[] = [];
  private activeCount = 0;
  private isPaused = false;
  private isCancelled = false;
  private isProcessing = false;
  private rateLimitWaiting = false;
  private rateLimitTimer: NodeJS.Timeout | null = null;

  private totalCount = 0;
  private completedCount = 0;
  private failedCount = 0;

  private settings: AppSettings = {} as AppSettings;
  private platform: PlatformId = 'adobe-stock';

  private onProgressChange?: QueueProgressCallback;
  private onItemUpdated?: ItemUpdatedCallback;
  private onBatchComplete?: () => void;

  /**
   * Start processing a batch of items
   */
  public async startBatch(
    items: MetadataItem[],
    settings: AppSettings,
    platform: PlatformId,
    callbacks: {
      onProgress?: QueueProgressCallback;
      onItemUpdated?: ItemUpdatedCallback;
      onBatchComplete?: () => void;
    }
  ): Promise<void> {
    this.cancel(); // Cancel any existing queue

    this.settings = settings;
    this.platform = platform;
    this.onProgressChange = callbacks.onProgress;
    this.onItemUpdated = callbacks.onItemUpdated;
    this.onBatchComplete = callbacks.onBatchComplete;

    // Enqueue items that need processing and have a preview
    const pendingItems = items.filter(
      (item) => (item.status === 'idle' || item.status === 'error') && item.base64Data
    );

    if (pendingItems.length === 0) {
      this.emitProgress();
      callbacks.onBatchComplete?.();
      return;
    }

    this.queue = [...pendingItems];
    this.totalCount = items.length;
    this.completedCount = items.filter((i) => i.status === 'completed').length;
    this.failedCount = items.filter((i) => i.status === 'error').length;
    this.activeCount = 0;
    this.isPaused = false;
    this.isCancelled = false;
    this.isProcessing = true;
    this.rateLimitWaiting = false;

    this.emitProgress();
    this.pump();
  }

  /**
   * Process next items in queue with concurrency limit
   */
  private pump(): void {
    if (this.isCancelled) return;

    // Check if entire batch is finished
    if (this.queue.length === 0 && this.activeCount === 0) {
      this.isProcessing = false;
      this.rateLimitWaiting = false;
      this.emitProgress();
      this.onBatchComplete?.();
      return;
    }

    if (this.isPaused || this.rateLimitWaiting) {
      this.emitProgress();
      return;
    }

    // Launch workers up to MAX_CONCURRENT_REQUESTS
    while (
      this.activeCount < MAX_CONCURRENT_REQUESTS &&
      this.queue.length > 0 &&
      !this.isPaused &&
      !this.rateLimitWaiting &&
      !this.isCancelled
    ) {
      const nextItem = this.queue.shift()!;
      this.activeCount++;
      this.processItem(nextItem);
    }

    this.emitProgress();
  }

  /**
   * Process a single artwork item
   */
  private async processItem(item: MetadataItem): Promise<void> {
    if (this.isCancelled) {
      this.activeCount--;
      return;
    }

    // Mark item as analyzing
    const analyzingItem: MetadataItem = {
      ...item,
      status: 'analyzing',
      statusMessage: 'AI Vision Analysis...',
      errorMessage: undefined,
    };
    this.onItemUpdated?.(analyzingItem);
    this.emitProgress();

    try {
      const result = await analyzeArtwork(
        item,
        this.settings,
        this.platform,
        false,
        (attempt, delayMs) => {
          // If retrying, update UI status message
          const retryingItem: MetadataItem = {
            ...item,
            status: 'analyzing',
            statusMessage: `Retrying AI (Wait ${Math.round(delayMs / 1000)}s)...`,
          };
          this.onItemUpdated?.(retryingItem);
        }
      );

      if (this.isCancelled) {
        this.activeCount--;
        return;
      }

      if (result.success) {
        this.completedCount++;
        this.onItemUpdated?.(result.item);
      } else {
        this.failedCount++;
        this.onItemUpdated?.(result.item);

        // Check if rate limit reached (429) to trigger gentle queue cooldown
        if (result.error?.statusCode === 429) {
          this.handleRateLimitEncountered();
        }
      }
    } catch (err: any) {
      this.failedCount++;
      const failedItem: MetadataItem = {
        ...item,
        status: 'error',
        statusMessage: 'AI Analysis Failed',
        errorMessage: err?.message || 'Processing failed.',
      };
      this.onItemUpdated?.(failedItem);
    } finally {
      this.activeCount--;

      // Gentle pause between subsequent request dispatches
      if (!this.rateLimitWaiting && !this.isPaused && this.queue.length > 0) {
        setTimeout(() => {
          this.pump();
        }, INTER_REQUEST_DELAY_MS);
      } else {
        this.pump();
      }
    }
  }

  /**
   * Handle 429 rate limit backoff across queue
   */
  private handleRateLimitEncountered(): void {
    if (this.rateLimitWaiting) return;
    this.rateLimitWaiting = true;
    console.warn('[AI Queue] Rate limit encountered. Cooling down for 4 seconds before next dispatch...');

    this.emitProgress();

    if (this.rateLimitTimer) clearTimeout(this.rateLimitTimer);
    this.rateLimitTimer = setTimeout(() => {
      this.rateLimitWaiting = false;
      this.emitProgress();
      this.pump();
    }, 4000);
  }

  /**
   * Pause processing queue
   */
  public pause(): void {
    this.isPaused = true;
    this.emitProgress();
  }

  /**
   * Resume processing queue
   */
  public resume(): void {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.emitProgress();
    this.pump();
  }

  /**
   * Cancel all pending items
   */
  public cancel(): void {
    this.isCancelled = true;
    this.isProcessing = false;
    this.isPaused = false;
    this.rateLimitWaiting = false;
    if (this.rateLimitTimer) {
      clearTimeout(this.rateLimitTimer);
      this.rateLimitTimer = null;
    }
    this.queue = [];
    this.activeCount = 0;
  }

  /**
   * Clear all pending items
   */
  public clear(): void {
    this.cancel();
  }

  /**
   * Get current queue status
   */
  public getProgress(): QueueProgress {
    return {
      total: this.totalCount,
      completed: this.completedCount,
      processing: this.activeCount,
      pending: this.queue.length,
      failed: this.failedCount,
      isPaused: this.isPaused,
      isProcessing: this.isProcessing,
      rateLimitWaiting: this.rateLimitWaiting,
    };
  }

  private emitProgress(): void {
    this.onProgressChange?.(this.getProgress());
  }
}

export const requestQueue = new AIRequestQueue();
