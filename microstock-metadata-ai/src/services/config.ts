/**
 * Central Configuration for Gemini AI Services, Queueing, and Batch Processing
 */

// Central model configuration (Gemini 3 series multimodal model)
export const GEMINI_MODEL = 'gemini-3.7-flash';

// AI Batch Processing Concurrency Limit (Strictly 2 simultaneous requests max to prevent 429)
export const MAX_CONCURRENT_REQUESTS = 2;

// Automatic Exponential Backoff Delays (in milliseconds)
export const RETRY_DELAYS = [2000, 5000, 10000]; // Attempt 1 -> 2s, Attempt 2 -> 5s, Attempt 3 -> 10s

// Maximum automatic retry attempts per item
export const MAX_RETRY_ATTEMPTS = 3;

// Gentle spacing delay between queued request dispatches to prevent rate-limit bursts (in ms)
export const INTER_REQUEST_DELAY_MS = 600;
