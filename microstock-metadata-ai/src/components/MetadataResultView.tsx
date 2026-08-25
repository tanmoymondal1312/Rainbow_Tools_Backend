import React, { useState } from 'react';
import {
  Copy,
  Check,
  RotateCw,
  Plus,
  X,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowUpDown,
  Download,
  FileJson,
  Layers,
  Palette,
  Eye,
  Tag,
  FileText,
  Sliders,
  MoveUp,
  MoveDown,
  Trash2,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { MetadataItem, AppSettings, PlatformId } from '../types';
import { PLATFORMS } from '../lib/platforms';
import { useToast } from './Toast';
import { sanitizeAndValidateMetadata } from '../lib/validation';

interface MetadataResultViewProps {
  item: MetadataItem;
  settings: AppSettings;
  platform: PlatformId;
  onUpdateItem: (updated: Partial<MetadataItem>) => void;
  onRegenerate: (type: 'all' | 'title' | 'keywords' | 'description') => void;
  onRetryRender?: () => void;
  onViewFullPreview?: (previewUrl: string) => void;
  isRegenerating: boolean;
  onExportCsv: () => void;
  onExportJson: () => void;
  onBackToUpload?: () => void;
}

export const MetadataResultView: React.FC<MetadataResultViewProps> = ({
  item,
  settings,
  platform,
  onUpdateItem,
  onRegenerate,
  onRetryRender,
  onViewFullPreview,
  isRegenerating,
  onExportCsv,
  onExportJson,
  onBackToUpload,
}) => {
  const { showToast } = useToast();
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [isAddingKeyword, setIsAddingKeyword] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const platformConfig = PLATFORMS[platform] || PLATFORMS['adobe-stock'];
  const maxKeywords = platformConfig.maxKeywords;

  // Copy helper with visual feedback
  const handleCopy = (text: string, sectionName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionName);
    showToast(`Copied ${sectionName}`, text.slice(0, 45) + (text.length > 45 ? '...' : ''), 'success');
    setTimeout(() => setCopiedSection(null), 2000);
  };

  // Copy all keywords as comma-separated string
  const handleCopyAllKeywords = () => {
    const kwString = (item.keywords || []).join(', ');
    handleCopy(kwString, 'All Keywords');
  };

  // Copy full package metadata
  const handleCopyAllMetadata = () => {
    const fullText = `Title: ${item.title}\n\nDescription: ${item.description}\n\nKeywords: ${(item.keywords || []).join(', ')}\n\nCategory: ${item.primaryCategory} > ${item.secondaryCategory}\nContent Type: ${item.contentType}`;
    handleCopy(fullText, 'All Metadata');
  };

  // Keyword Management
  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = newKeywordInput.trim();
    if (!raw) return;

    const parts = raw.split(/[,;\n]+/).map((k) => k.trim().toLowerCase()).filter(Boolean);
    const updatedKeywords = [...(item.keywords || [])];

    parts.forEach((k) => {
      if (!updatedKeywords.includes(k) && updatedKeywords.length < maxKeywords) {
        updatedKeywords.push(k);
      }
    });

    const { report, qualityScore } = sanitizeAndValidateMetadata(
      item.title || '',
      item.description || '',
      updatedKeywords,
      settings,
      maxKeywords
    );

    onUpdateItem({
      keywords: updatedKeywords,
      qualityScore,
      validation: report,
    });

    setNewKeywordInput('');
    setIsAddingKeyword(false);
    showToast('Keyword(s) added', `Added ${parts.length} keyword(s)`, 'info');
  };

  const handleRemoveKeyword = (indexToRemove: number) => {
    const updatedKeywords = (item.keywords || []).filter((_, i) => i !== indexToRemove);
    const { report, qualityScore } = sanitizeAndValidateMetadata(
      item.title || '',
      item.description || '',
      updatedKeywords,
      settings,
      maxKeywords
    );

    onUpdateItem({
      keywords: updatedKeywords,
      qualityScore,
      validation: report,
    });
  };

  const handleMoveKeyword = (fromIndex: number, toIndex: number) => {
    if (!item.keywords || toIndex < 0 || toIndex >= item.keywords.length) return;
    const updatedKeywords = [...item.keywords];
    const [moved] = updatedKeywords.splice(fromIndex, 1);
    updatedKeywords.splice(toIndex, 0, moved);

    onUpdateItem({ keywords: updatedKeywords });
  };

  const handleSortKeywordsAlphabetically = () => {
    const sorted = [...(item.keywords || [])].sort((a, b) => a.localeCompare(b));
    onUpdateItem({ keywords: sorted });
    showToast('Keywords Sorted', 'Sorted alphabetically A-Z', 'info');
  };

  const handleDeduplicateAndClean = () => {
    const { cleanTitle, cleanDescription, cleanKeywords, qualityScore, report } =
      sanitizeAndValidateMetadata(item.title || '', item.description || '', item.keywords || [], settings, maxKeywords);

    onUpdateItem({
      title: cleanTitle,
      description: cleanDescription,
      keywords: cleanKeywords,
      qualityScore,
      validation: report,
    });

    showToast('Metadata Sanitized', `Validation passed. Cleaned and deduplicated.`, 'success');
  };

  const titleWordCount = item.title ? item.title.trim().split(/\s+/).filter(Boolean).length : 0;
  const descWordCount = item.description ? item.description.trim().split(/\s+/).filter(Boolean).length : 0;

  return (
    <div id="metadata-result-panel" className="w-full space-y-6 animate-in fade-in duration-300">
      {/* If Render Error for EPS (no preview available) */}
      {item.status === 'error' && (!item.previewUrl || !item.base64Data) && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-rose-200">{item.errorMessage || 'Unable to render EPS preview. Please retry.'}</p>
              <p className="text-xs text-rose-300/80">AI will only analyze artwork after a valid visual preview is rendered.</p>
            </div>
          </div>
          {item.canRetryRender && onRetryRender && (
            <button
              type="button"
              onClick={onRetryRender}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shrink-0"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Render</span>
            </button>
          )}
        </div>
      )}

      {/* If AI Generation Error (preview exists, but AI quota/rate-limit/network failed) */}
      {item.status === 'error' && item.base64Data && (
        <div id="ai-error-card" className="p-4 rounded-xl bg-slate-900/90 border border-rose-800/80 space-y-3 shadow-lg">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-950/80 border border-rose-700/60 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-rose-300 uppercase tracking-wider">AI Generation Failed</h3>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 font-mono font-bold">
                    {item.apiError?.errorCode || (item.apiError?.statusCode ? `HTTP ${item.apiError.statusCode}` : '429 / RESOURCE_EXHAUSTED')}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 font-medium">
                  {item.apiError?.reason || item.apiError?.userMessage || item.errorMessage || 'API quota/rate limit reached. Please wait or retry.'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  The visual preview is ready. You can retry AI analysis below without re-rendering the artwork.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-retry-ai-single"
                type="button"
                disabled={isRegenerating}
                onClick={() => onRegenerate('all')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shrink-0 disabled:opacity-50"
              >
                <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                <span>Retry AI Analysis</span>
              </button>
            </div>
          </div>

          {/* Expandable Technical Details */}
          {(item.apiError?.technicalDetails || item.errorMessage) && (
            <div className="pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowTechnicalDetails((prev) => !prev)}
                className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 font-mono transition-colors"
              >
                <ChevronDown className={`w-3 h-3 transition-transform ${showTechnicalDetails ? 'rotate-180' : ''}`} />
                <span>{showTechnicalDetails ? 'Hide Technical Details' : 'View Technical Details'}</span>
              </button>
              {showTechnicalDetails && (
                <pre className="mt-2 p-2.5 rounded-lg bg-black/60 border border-slate-800 text-[10px] text-rose-300/90 font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {item.apiError?.technicalDetails || item.errorMessage}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          {onBackToUpload && (
            <button
              id="btn-back-to-upload"
              type="button"
              onClick={onBackToUpload}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              ← Back to Files
            </button>
          )}
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>{item.fileName}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/70 border border-purple-800/60 text-purple-300 font-mono">
                {platformConfig.name} Optimized
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              {item.technicalDetails?.dimensions || item.fileType} • {item.fileSize} • Visual AI Engine
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Regenerate Dropdown / Buttons */}
          <button
            id="btn-regenerate-all"
            type="button"
            disabled={isRegenerating || !item.base64Data}
            onClick={() => onRegenerate('all')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700 disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 text-cyan-400 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>Regenerate All</span>
          </button>

          <button
            id="btn-copy-all-metadata"
            type="button"
            disabled={!item.title}
            onClick={handleCopyAllMetadata}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-purple-950/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {copiedSection === 'All Metadata' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy All</span>
          </button>

          <button
            id="btn-export-csv"
            type="button"
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV</span>
          </button>

          <button
            id="btn-export-json"
            type="button"
            onClick={onExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-all"
          >
            <FileJson className="w-3.5 h-3.5 text-purple-400" />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* Low Confidence Warning Banner */}
      {((item.confidence !== undefined && item.confidence < 60) ||
        (item.analysis?.confidence !== undefined && item.analysis.confidence < 60)) && (
        <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/60 flex items-start justify-between gap-3 text-xs shadow-lg">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-200">
                Visual Recognition Confidence is Low ({item.confidence ?? item.analysis?.confidence ?? 45}%)
              </p>
              <p className="text-amber-300/80 text-[11px] mt-0.5">
                The visual subject in this artwork may be ambiguous or abstract. Please review the visual inventory below or click Regenerate to re-analyze with Gemini Vision.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRegenerate('all')}
            disabled={isRegenerating}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>Regenerate Analysis</span>
          </button>
        </div>
      )}

      {/* Main 2-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (4 cols): File Preview & AI Visual/Technical Analysis */}
        <div className="lg:col-span-4 space-y-4">
          {/* File Preview Card */}
          <div id="file-preview-card" className="rounded-xl bg-[#161d31] border border-slate-800 overflow-hidden shadow-lg">
            <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                Artwork Preview
              </span>
              <div className="flex items-center gap-1.5">
                {item.previewUrl && (
                  <button
                    type="button"
                    onClick={() => onViewFullPreview?.(item.previewUrl)}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-0.5 px-1.5 py-0.5 bg-cyan-950/80 border border-cyan-800/60 rounded"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Zoom</span>
                  </button>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono uppercase">
                  {item.fileType}
                </span>
              </div>
            </div>

            {/* Image Container with checkerboard background for transparency checking */}
            <div
              className="relative aspect-4/3 w-full bg-[#0a0d14] flex items-center justify-center overflow-hidden p-4 group cursor-pointer"
              onClick={() => item.previewUrl && onViewFullPreview?.(item.previewUrl)}
            >
              {item.previewUrl ? (
                <>
                  <img
                    src={item.previewUrl}
                    alt={item.fileName}
                    referrerPolicy="no-referrer"
                    className="max-h-full max-w-full object-contain rounded drop-shadow-md transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  {/* Verified AI Inspection Overlay Badge */}
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-950/85 border border-cyan-500/40 text-[10px] text-cyan-300 backdrop-blur-sm shadow-md">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span className="font-semibold">AI analyzed this preview</span>
                  </div>
                </>
              ) : (
                <div className="text-slate-600 text-xs font-mono text-center p-4">
                  {item.status === 'error' ? 'Preview Failed to Render' : 'No Preview Available'}
                </div>
              )}
            </div>

            {/* Technical Metadata Specs */}
            <div className="p-3 bg-slate-900/60 border-t border-slate-800/60 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Dimensions</span>
                <span className="text-slate-200 font-mono text-[11px] font-medium">{item.technicalDetails?.dimensions || 'Auto'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Orientation</span>
                <span className="text-slate-200 font-medium text-[11px]">{item.technicalDetails?.orientation || 'Landscape'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Background</span>
                <span className="text-slate-200 font-medium text-[11px]">{item.backgroundType || 'Transparent'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Transparency</span>
                <span className={`text-[11px] font-semibold ${item.hasTransparency ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {item.hasTransparency ? 'Yes (Transparent)' : 'No (Opaque)'}
                </span>
              </div>
            </div>
          </div>

          {/* AI Visual & Concept Analysis Card */}
          <div id="ai-analysis-card" className="rounded-xl bg-[#161d31] border border-slate-800 p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                AI Visual Inventory
              </h3>
              {(item.confidence !== undefined || item.analysis?.confidence !== undefined) && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    (item.confidence ?? item.analysis?.confidence ?? 0) >= 80
                      ? 'bg-emerald-950/60 border-emerald-800/50 text-emerald-400'
                      : (item.confidence ?? item.analysis?.confidence ?? 0) >= 60
                      ? 'bg-cyan-950/60 border-cyan-800/50 text-cyan-400'
                      : 'bg-amber-950/60 border-amber-800/50 text-amber-400'
                  }`}
                >
                  {item.confidence ?? item.analysis?.confidence}% Confidence
                </span>
              )}
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Main Subject</span>
                <p className="text-slate-200 font-semibold text-[11px]">{item.mainSubject || item.analysis?.main_subject || 'Artwork Subject'}</p>
              </div>

              {/* Objects Inventory */}
              {item.analysis?.objects && item.analysis.objects.length > 0 && (
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Visible Elements & Objects</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {item.analysis.objects.map((obj, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[10px]">
                        {obj}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {item.analysis?.visible_text && item.analysis.visible_text.length > 0 && (
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Visible OCR Text</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {item.analysis.visible_text.map((txt, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-amber-950/60 border border-amber-800/40 text-amber-300 font-mono text-[10px]">
                        "{txt}"
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Primary Category</span>
                  <p className="text-purple-300 font-medium text-[11px]">{item.primaryCategory || 'Graphic Resources'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Secondary Category</span>
                  <p className="text-slate-300 text-[11px]">{item.secondaryCategory || 'Illustration'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Content Type</span>
                  <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 text-[10px] font-bold">
                    {item.contentType || 'Vector'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Visual Style</span>
                  <p className="text-slate-300 text-[11px]">{item.visualStyle || 'Vector Graphic'}</p>
                </div>
              </div>

              {/* Dominant Colors */}
              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Dominant Palette</span>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {item.dominantColors && item.dominantColors.length > 0 ? (
                    item.dominantColors.map((color, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 text-[10px]"
                      >
                        {color}
                      </span>
                    ))
                  ) : (
                    <span className="text-slate-500 text-[10px]">Multi-color</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quality Score & Validation Card */}
          <div id="quality-score-card" className="rounded-xl bg-[#161d31] border border-slate-800 p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Metadata Quality Score
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 font-bold">
                {item.qualityScore ? Math.round((item.qualityScore.accuracy + item.qualityScore.relevance + item.qualityScore.seoPotential) / 3) : 94}% Overall
              </span>
            </div>

            {/* Score Progress Bars */}
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Visual Accuracy</span>
                  <span className="text-cyan-400 font-mono font-bold">{item.qualityScore?.accuracy || 95}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.qualityScore?.accuracy || 95}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Keyword Relevance</span>
                  <span className="text-purple-400 font-mono font-bold">{item.qualityScore?.relevance || 92}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.qualityScore?.relevance || 92}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Microstock SEO Potential</span>
                  <span className="text-emerald-400 font-mono font-bold">{item.qualityScore?.seoPotential || 90}%</span>
                </div>
                <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.qualityScore?.seoPotential || 90}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Validation Mini Audit */}
            <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-2 text-center text-[10px]">
              <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                <span className="text-slate-500 block">Keywords</span>
                <span className="text-slate-200 font-bold font-mono">{(item.keywords || []).length} / {maxKeywords}</span>
              </div>
              <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                <span className="text-slate-500 block">Duplicates</span>
                <span className="text-emerald-400 font-bold font-mono">{item.validation?.duplicatesRemoved || 0}</span>
              </div>
              <div className="bg-slate-900/80 p-1.5 rounded border border-slate-800">
                <span className="text-slate-500 block">Prohibited</span>
                <span className="text-emerald-400 font-bold font-mono">{item.validation?.prohibitedRemoved || 0}</span>
              </div>
            </div>

            {/* Validation Checklist / Auto Clean */}
            <div className="pt-1">
              <button
                id="btn-auto-clean-metadata"
                type="button"
                onClick={handleDeduplicateAndClean}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-800 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Re-Verify & Clean Metadata</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (8 cols): Title, Description, and Interactive Keyword Tag Cloud */}
        <div className="lg:col-span-8 space-y-5">
          {/* TITLE SECTION */}
          <div id="section-title" className="rounded-xl bg-[#161d31] border border-slate-800 p-4 space-y-2 shadow-lg">
            <div className="flex items-center justify-between">
              <label htmlFor="input-title" className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                Title
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-mono">
                  {titleWordCount} words • {item.title?.length || 0} chars
                </span>
                <button
                  id="btn-regenerate-title"
                  type="button"
                  disabled={isRegenerating || !item.base64Data}
                  onClick={() => onRegenerate('title')}
                  title="Regenerate Title"
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-colors disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                </button>
                <button
                  id="btn-copy-title"
                  type="button"
                  onClick={() => handleCopy(item.title, 'Title')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                >
                  {copiedSection === 'Title' ? <Check className="w-3 h-3 text-cyan-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy</span>
                </button>
              </div>
            </div>

            <input
              id="input-title"
              type="text"
              value={item.title || ''}
              onChange={(e) => onUpdateItem({ title: e.target.value })}
              className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-lg p-2.5 text-sm text-slate-100 placeholder-slate-500 font-medium transition-all"
              placeholder="Microstock SEO Title..."
            />
            <p className="text-[10px] text-slate-500">
              Rule: Main Subject first, followed by visual style, concept and specific detail without spam adjectives.
            </p>
          </div>

          {/* DESCRIPTION SECTION */}
          <div id="section-description" className="rounded-xl bg-[#161d31] border border-slate-800 p-4 space-y-2 shadow-lg">
            <div className="flex items-center justify-between">
              <label htmlFor="input-description" className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-purple-400" />
                Description
              </label>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400 font-mono">
                  {descWordCount} words • {item.description?.length || 0} chars
                </span>
                <button
                  id="btn-regenerate-description"
                  type="button"
                  disabled={isRegenerating || !item.base64Data}
                  onClick={() => onRegenerate('description')}
                  title="Regenerate Description"
                  className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-purple-400 transition-colors disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                </button>
                <button
                  id="btn-copy-description"
                  type="button"
                  onClick={() => handleCopy(item.description, 'Description')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                >
                  {copiedSection === 'Description' ? <Check className="w-3 h-3 text-purple-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy</span>
                </button>
              </div>
            </div>

            <textarea
              id="input-description"
              rows={3}
              value={item.description || ''}
              onChange={(e) => onUpdateItem({ description: e.target.value })}
              className="w-full bg-slate-950/80 border border-slate-700/80 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 rounded-lg p-2.5 text-xs text-slate-200 placeholder-slate-500 leading-relaxed resize-y transition-all"
              placeholder="Commercial Microstock Description..."
            />
          </div>

          {/* KEYWORDS SECTION */}
          <div id="section-keywords" className="rounded-xl bg-[#161d31] border border-slate-800 p-4 space-y-3 shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Keywords
                </span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                    (item.keywords || []).length >= platformConfig.recommendedKeywords
                      ? 'bg-emerald-950/70 border border-emerald-800/60 text-emerald-300'
                      : 'bg-cyan-950/70 border border-cyan-800/60 text-cyan-300'
                  }`}
                >
                  {(item.keywords || []).length} / {maxKeywords}
                </span>
                <span className="text-[10px] text-purple-400 font-semibold hidden sm:inline">
                  ★ First 10 are Top Priority
                </span>
              </div>

              {/* Keyword Toolbar */}
              <div className="flex items-center gap-1.5">
                <button
                  id="btn-sort-keywords"
                  type="button"
                  onClick={handleSortKeywordsAlphabetically}
                  title="Sort A-Z"
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1 transition-colors"
                >
                  <ArrowUpDown className="w-3 h-3" />
                  <span className="hidden sm:inline">A-Z</span>
                </button>

                <button
                  id="btn-regenerate-keywords"
                  type="button"
                  disabled={isRegenerating || !item.base64Data}
                  onClick={() => onRegenerate('keywords')}
                  title="Regenerate Keywords"
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-cyan-400 transition-colors disabled:opacity-50"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                </button>

                <button
                  id="btn-add-keyword-toggle"
                  type="button"
                  onClick={() => setIsAddingKeyword(!isAddingKeyword)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-bold transition-all"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </button>

                <button
                  id="btn-copy-all-keywords"
                  type="button"
                  onClick={handleCopyAllKeywords}
                  className="flex items-center gap-1 px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-sm"
                >
                  {copiedSection === 'All Keywords' ? <Check className="w-3 h-3 text-white" /> : <Copy className="w-3 h-3" />}
                  <span>Copy All</span>
                </button>
              </div>
            </div>

            {/* Inline Add Keyword Form */}
            {isAddingKeyword && (
              <form onSubmit={handleAddKeyword} className="flex gap-2 p-2 rounded-lg bg-slate-950 border border-cyan-500/40 animate-in fade-in">
                <input
                  id="input-new-keyword"
                  type="text"
                  autoFocus
                  value={newKeywordInput}
                  onChange={(e) => setNewKeywordInput(e.target.value)}
                  placeholder="Enter keyword(s) separated by commas (e.g. vector, summer, botanical)..."
                  className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none px-2"
                />
                <button
                  type="submit"
                  className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded text-xs font-bold"
                >
                  Insert
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingKeyword(false)}
                  className="px-2 py-1 bg-slate-800 text-slate-400 hover:text-white rounded text-xs"
                >
                  Cancel
                </button>
              </form>
            )}

            {/* Interactive Keyword Tags Container */}
            <div
              id="keywords-tag-container"
              className="flex flex-wrap gap-1.5 max-h-[360px] overflow-y-auto p-1 custom-scrollbar"
            >
              {(item.keywords || []).map((kw, index) => {
                const isTop10 = index < 10;

                return (
                  <div
                    key={`${kw}-${index}`}
                    id={`keyword-tag-${index}`}
                    className={`group flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-lg text-xs font-medium transition-all ${
                      isTop10
                        ? 'bg-purple-950/80 border border-purple-600/60 text-purple-200 shadow-xs shadow-purple-950/40 hover:border-purple-400'
                        : 'bg-slate-900 border border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                    }`}
                  >
                    {/* Priority Index Indicator for Top 10 */}
                    {isTop10 && (
                      <span className="text-[9px] font-mono font-extrabold text-purple-400 select-none mr-0.5">
                        #{index + 1}
                      </span>
                    )}

                    <span className="select-text">{kw}</span>

                    {/* Move Controls on Hover */}
                    <div className="hidden group-hover:flex items-center ml-1 space-x-0.5">
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMoveKeyword(index, index - 1)}
                          title="Move Left/Up"
                          className="text-slate-400 hover:text-cyan-400 p-0.5 rounded"
                        >
                          <MoveUp className="w-2.5 h-2.5 -rotate-90" />
                        </button>
                      )}
                      {index < (item.keywords || []).length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMoveKeyword(index, index + 1)}
                          title="Move Right/Down"
                          className="text-slate-400 hover:text-cyan-400 p-0.5 rounded"
                        >
                          <MoveDown className="w-2.5 h-2.5 -rotate-90" />
                        </button>
                      )}
                    </div>

                    {/* Delete Tag Button */}
                    <button
                      id={`btn-remove-keyword-${index}`}
                      type="button"
                      onClick={() => handleRemoveKeyword(index)}
                      title="Remove Keyword"
                      className="ml-0.5 text-slate-500 hover:text-rose-400 transition-colors p-0.5 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Keyword Ranking Guide */}
            <div className="pt-2 flex flex-wrap items-center justify-between text-[11px] text-slate-500 border-t border-slate-800/60">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                <span>Purple tags (#1-#10) are indexed as primary search ranking keywords</span>
              </span>
              <span>Click [X] to remove or drag to reorder</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
