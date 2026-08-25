import { VisualAnalysisData } from '../types';

export interface CachedAnalysisEntry {
  analysis: VisualAnalysisData;
  metadata: {
    title: string;
    description: string;
    keywords: string[];
    category: string;
    secondary_category: string;
  };
  timestamp: number;
}

/**
 * In-Memory Visual Analysis Cache
 * Avoids repeated Gemini Vision calls when:
 * 1. Switching platforms (Adobe Stock -> Shutterstock, etc.)
 * 2. Regenerating titles/keywords from the same visual analysis
 * 3. The same file or identical artwork is uploaded multiple times
 */
class VisualAnalysisCacheService {
  private cache = new Map<string, CachedAnalysisEntry>();

  public get(fileHash?: string): CachedAnalysisEntry | undefined {
    if (!fileHash) return undefined;
    return this.cache.get(fileHash);
  }

  public set(
    fileHash: string,
    analysis: VisualAnalysisData,
    metadata: {
      title: string;
      description: string;
      keywords: string[];
      category: string;
      secondary_category: string;
    }
  ): void {
    if (!fileHash) return;
    this.cache.set(fileHash, {
      analysis,
      metadata,
      timestamp: Date.now(),
    });
  }

  public has(fileHash?: string): boolean {
    if (!fileHash) return false;
    return this.cache.has(fileHash);
  }

  public clear(): void {
    this.cache.clear();
  }

  public size(): number {
    return this.cache.size;
  }
}

export const cacheService = new VisualAnalysisCacheService();
