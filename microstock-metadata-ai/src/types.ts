export type PlatformId =
  | 'adobe-stock'
  | 'general'
  | 'magnific'
  | 'shutterstock'
  | 'vecteezy'
  | 'depositphotos'
  | '123rf'
  | 'dreamstime';

export type AppMode = 'metadata' | 'prompt';

export type FileCategoryFilter = 'images' | 'vectors' | 'videos';

export interface AppSettings {
  platform: PlatformId;
  minTitleWords: number;
  maxTitleWords: number;
  minKeywords: number;
  maxKeywords: number;
  minDescriptionWords: number;
  maxDescriptionWords: number;
  singleWordKeywords: boolean;
  silhouette: boolean;
  customPromptEnabled: boolean;
  customPromptText: string;
  transparentBgEnabled: boolean;
  prohibitedWordsEnabled: boolean;
  prohibitedWordsText: string;
}

export interface PlatformConfig {
  id: PlatformId;
  name: string;
  shortName: string;
  maxKeywords: number;
  recommendedKeywords: number;
  maxTitleLength: number;
  requiresDescription: boolean;
  firstKeywordsPriority: boolean;
  supportSingleWordOnly: boolean;
  badgeColor: string;
  description: string;
  notes: string;
}

export interface QualityScore {
  accuracy: number;
  relevance: number;
  seoPotential: number;
}

export interface ValidationReport {
  valid: boolean;
  issues: string[];
  duplicatesRemoved: number;
  prohibitedRemoved: number;
  keywordCount: number;
  titleWordCount: number;
  descriptionWordCount: number;
}

export interface TechnicalDetails {
  dimensions?: string;
  width?: number;
  height?: number;
  orientation: 'Square' | 'Portrait' | 'Landscape';
  backgroundType: 'Transparent' | 'White' | 'Black' | 'Colored' | 'Gradient' | 'Complex';
  hasTransparency: boolean;
  dominantColors: string[];
  visualStyle: string;
  contentType: string;
  isSilhouette: boolean;
}

export interface VisualAnalysisData {
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
}

export type ItemProcessingStatus =
  | 'idle'
  | 'rendering_eps'
  | 'preview_ready'
  | 'analyzing'
  | 'validating'
  | 'completed'
  | 'error';

export interface ApiErrorInfo {
  userMessage: string;
  reason?: string;
  statusCode?: number;
  errorCode?: string;
  technicalDetails?: string;
  canRetry?: boolean;
}

export interface MetadataItem {
  id: string;
  file: File | null;
  fileName: string;
  fileType: string;
  fileSize: string;
  fileHash?: string;
  previewUrl: string;
  base64Data?: string;
  mimeType: string;
  status: ItemProcessingStatus;
  statusMessage?: string;
  errorMessage?: string;
  apiError?: ApiErrorInfo;
  canRetryRender?: boolean;
  
  // Visual Analysis Object from AI Vision
  analysis?: VisualAnalysisData;
  
  // Generated Stock Metadata
  title: string;
  description: string;
  keywords: string[];
  primaryCategory: string;
  secondaryCategory: string;
  contentType: string;
  visualStyle: string;
  dominantColors: string[];
  backgroundType: string;
  hasTransparency: boolean;
  isSilhouette: boolean;
  mainSubject: string;
  commercialUses: string[];
  
  // Analysis & Quality
  confidence?: number;
  technicalDetails?: TechnicalDetails;
  qualityScore?: QualityScore;
  validation?: ValidationReport;
  
  // Image To Prompt result (if analyzed in prompt mode)
  promptResult?: ImagePromptResult;
}

export interface ImagePromptResult {
  prompt: string;
  negativePrompt: string;
  style: string;
  lighting: string;
  composition: string;
  camera: string;
  colors: string[];
  aspectRatio: string;
  parameters: string;
}

export interface AnalysisRequestPayload {
  image: string; // base64
  mimeType: string;
  fileName: string;
  fileType: string;
  platform: PlatformId;
  settings: AppSettings;
  fileHash?: string;
}

export interface PromptRequestPayload {
  image: string; // base64
  mimeType: string;
  fileName: string;
}
