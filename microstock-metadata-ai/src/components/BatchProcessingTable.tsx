import React, { useState } from 'react';
import {
  Sparkles,
  Download,
  FileJson,
  Copy,
  Check,
  RotateCw,
  Trash2,
  Eye,
  Plus,
  Layers,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Pause,
  Play,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { MetadataItem } from '../types';
import { useToast } from './Toast';

interface BatchProcessingTableProps {
  items: MetadataItem[];
  selectedId: string | null;
  onSelectItem: (id: string) => void;
  onGenerateItem: (id: string) => void;
  onRetryRender?: (id: string) => void;
  onGenerateAll: () => void;
  onRegenerateSelected: (ids: string[]) => void;
  onRemoveItem: (id: string) => void;
  onClearAll: () => void;
  onViewFullPreview?: (previewUrl: string) => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onAddMoreFiles: () => void;
  isProcessingBatch: boolean;
  isPaused?: boolean;
  onPauseBatch?: () => void;
  onResumeBatch?: () => void;
  onRetryFailed?: () => void;
  rateLimitWaiting?: boolean;
}

export const BatchProcessingTable: React.FC<BatchProcessingTableProps> = ({
  items,
  selectedId,
  onSelectItem,
  onGenerateItem,
  onRetryRender,
  onGenerateAll,
  onRegenerateSelected,
  onRemoveItem,
  onClearAll,
  onViewFullPreview,
  onExportCsv,
  onExportJson,
  onAddMoreFiles,
  isProcessingBatch,
  isPaused = false,
  onPauseBatch,
  onResumeBatch,
  onRetryFailed,
  rateLimitWaiting = false,
}) => {
  const { showToast } = useToast();
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);

  const toggleSelectAll = () => {
    if (selectedRowIds.length === items.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(items.map((i) => i.id));
    }
  };

  const toggleRowSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const handleCopyAllBatchMetadata = () => {
    const csvHeader = 'Filename\tTitle\tDescription\tKeywords\tCategory\tContentType\n';
    const rows = items
      .map(
        (item) =>
          `"${item.fileName}"\t"${(item.title || '').replace(/"/g, '""')}"\t"${(item.description || '').replace(
            /"/g,
            '""'
          )}"\t"${(item.keywords || []).join(', ')}"\t"${item.primaryCategory || ''}"\t"${item.contentType || ''}"`
      )
      .join('\n');

    navigator.clipboard.writeText(csvHeader + rows);
    setCopiedAll(true);
    showToast('Batch Metadata Copied', `Copied ${items.length} items to clipboard in TSV table format.`, 'success');
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const completedCount = items.filter((i) => i.status === 'completed').length;
  const failedCount = items.filter((i) => i.status === 'error').length;
  const pendingCount = items.filter((i) => (i.status === 'idle' || i.status === 'error') && i.base64Data).length;
  const analyzingCount = items.filter((i) => i.status === 'analyzing' || i.status === 'rendering_eps').length;

  return (
    <div id="batch-processing-container" className="w-full space-y-4 animate-in fade-in">
      {/* Rate Limit Active Notice */}
      {rateLimitWaiting && (
        <div className="p-3 rounded-xl bg-amber-950/70 border border-amber-700/60 flex items-center justify-between gap-3 text-amber-200 text-xs animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold">AI rate limit reached. Processing will resume automatically in a few seconds...</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-900/60 border border-amber-700/50 font-mono">
            Rate Limit Guard (Max 2 Concurrency)
          </span>
        </div>
      )}

      {/* Batch Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Batch File Workspace</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {items.length} Files
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950/60 border border-purple-800/40 text-purple-300 font-mono">
                Max Concurrency: 2
              </span>
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span className="text-emerald-400 font-medium">✓ {completedCount} Done</span>
              <span>•</span>
              <span className="text-amber-400 font-medium">⏳ {pendingCount} Ready</span>
              {analyzingCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-cyan-400 font-medium animate-pulse">⚡ {analyzingCount} Processing</span>
                </>
              )}
              {failedCount > 0 && (
                <>
                  <span>•</span>
                  <span className="text-rose-400 font-medium">⚠ {failedCount} Failed</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Batch Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-add-more-files"
            type="button"
            onClick={onAddMoreFiles}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Files</span>
          </button>

          {/* Pause / Resume Controls during batch */}
          {isProcessingBatch && (
            <>
              {isPaused ? (
                <button
                  id="btn-resume-batch"
                  type="button"
                  onClick={onResumeBatch}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-md"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Resume Processing</span>
                </button>
              ) : (
                <button
                  id="btn-pause-batch"
                  type="button"
                  onClick={onPauseBatch}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-xs font-bold transition-all shadow-md"
                >
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Processing</span>
                </button>
              )}
            </>
          )}

          {/* Retry Failed Batch Button */}
          {failedCount > 0 && !isProcessingBatch && onRetryFailed && (
            <button
              id="btn-retry-failed-batch"
              type="button"
              onClick={onRetryFailed}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-rose-700 hover:bg-rose-600 text-white text-xs font-bold transition-all shadow-md shadow-rose-950/40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Failed ({failedCount})</span>
            </button>
          )}

          {!isProcessingBatch && (
            <button
              id="btn-generate-all-batch"
              type="button"
              disabled={isProcessingBatch || pendingCount === 0}
              onClick={onGenerateAll}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold shadow-md shadow-cyan-950/50 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate All ({pendingCount})</span>
            </button>
          )}

          {selectedRowIds.length > 0 && (
            <button
              id="btn-regenerate-selected-batch"
              type="button"
              disabled={isProcessingBatch}
              onClick={() => onRegenerateSelected(selectedRowIds)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-900/60 hover:bg-purple-800/80 text-purple-200 border border-purple-700/60 text-xs font-semibold transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5 text-purple-400" />
              <span>Regenerate Selected ({selectedRowIds.length})</span>
            </button>
          )}

          <button
            id="btn-batch-copy-all"
            type="button"
            onClick={handleCopyAllBatchMetadata}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
          >
            {copiedAll ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>Copy All</span>
          </button>

          <button
            id="btn-batch-export-csv"
            type="button"
            onClick={onExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/60 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            id="btn-batch-export-json"
            type="button"
            onClick={onExportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors"
          >
            <FileJson className="w-3.5 h-3.5 text-purple-400" />
            <span>JSON</span>
          </button>

          <button
            id="btn-clear-all-batch"
            type="button"
            onClick={onClearAll}
            title="Clear List"
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-900 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Files Table */}
      <div className="rounded-xl bg-[#161d31] border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table id="batch-metadata-table" className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider select-none">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedRowIds.length === items.length}
                    onChange={toggleSelectAll}
                    className="accent-cyan-500 rounded cursor-pointer"
                  />
                </th>
                <th className="py-3 px-3 w-14">Preview</th>
                <th className="py-3 px-3 min-w-[180px]">Filename / Specs</th>
                <th className="py-3 px-3 min-w-[240px]">Generated Title</th>
                <th className="py-3 px-3 w-28 text-center">Keywords</th>
                <th className="py-3 px-3 w-32">Category</th>
                <th className="py-3 px-3 w-32 text-center">Status</th>
                <th className="py-3 px-3 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {items.map((item) => {
                const isSelected = selectedId === item.id;
                const isChecked = selectedRowIds.includes(item.id);

                return (
                  <tr
                    key={item.id}
                    id={`batch-row-${item.id}`}
                    onClick={() => onSelectItem(item.id)}
                    className={`group cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-950/30 border-l-4 border-l-cyan-400'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-2.5 px-3 text-center" onClick={(e) => toggleRowSelect(item.id, e)}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="accent-cyan-500 rounded cursor-pointer"
                      />
                    </td>

                    {/* Preview Thumbnail with View Preview hover */}
                    <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                      <div
                        className="relative w-10 h-10 rounded bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden p-0.5 group/thumb cursor-pointer"
                        onClick={() => item.previewUrl && onViewFullPreview?.(item.previewUrl)}
                        title={item.previewUrl ? 'Click to view full preview' : 'No preview'}
                      >
                        {item.previewUrl ? (
                          <>
                            <img
                              src={item.previewUrl}
                              alt={item.fileName}
                              referrerPolicy="no-referrer"
                              className="max-h-full max-w-full object-contain"
                            />
                            <div className="absolute inset-0 bg-cyan-950/70 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                              <Eye className="w-3.5 h-3.5 text-cyan-300" />
                            </div>
                          </>
                        ) : (
                          <Layers className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                    </td>

                    {/* Filename & Info */}
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-200 truncate max-w-[200px]" title={item.fileName}>
                        {item.fileName}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        <span className="uppercase font-mono text-cyan-400">{item.fileType}</span>
                        <span>•</span>
                        <span>{item.fileSize}</span>
                      </div>
                    </td>

                    {/* Title */}
                    <td className="py-2.5 px-3">
                      {item.title ? (
                        <p className="text-slate-300 line-clamp-2 leading-relaxed" title={item.title}>
                          {item.title}
                        </p>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">
                          {item.status === 'error'
                            ? 'Metadata unavailable because AI analysis failed.'
                            : item.status === 'analyzing'
                            ? 'AI visual analysis in progress...'
                            : 'Pending AI metadata generation...'}
                        </span>
                      )}
                    </td>

                    {/* Keywords Count */}
                    <td className="py-2.5 px-3 text-center">
                      {item.keywords && item.keywords.length > 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-purple-950/70 border border-purple-800/60 text-purple-300 font-mono font-bold text-[11px]">
                          {item.keywords.length} tags
                        </span>
                      ) : (
                        <span className="text-slate-600 font-mono">-</span>
                      )}
                    </td>

                    {/* Category */}
                    <td className="py-2.5 px-3">
                      {item.primaryCategory ? (
                        <span className="text-slate-300 text-[11px] truncate block" title={item.primaryCategory}>
                          {item.primaryCategory}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 text-center">
                      {item.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-300 text-[10px] font-bold">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Done
                        </span>
                      )}
                      {item.status === 'rendering_eps' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 text-[10px] font-bold animate-pulse">
                          <RefreshCw className="w-3 h-3 text-cyan-400 animate-spin" />
                          Rendering EPS
                        </span>
                      )}
                      {item.status === 'analyzing' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 text-[10px] font-bold animate-pulse">
                          <Sparkles className="w-3 h-3 text-cyan-400 animate-spin" />
                          {item.statusMessage || 'Analyzing'}
                        </span>
                      )}
                      {item.status === 'idle' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                          <Clock className="w-3 h-3" />
                          Ready
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-800/60 text-rose-300 text-[10px] font-bold"
                          title={item.apiError?.userMessage || item.errorMessage || 'Processing error'}
                        >
                          <AlertCircle className="w-3 h-3 text-rose-400" />
                          {item.apiError?.statusCode === 429 ? 'Quota Limit' : 'Failed'}
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {item.status === 'error' && item.canRetryRender && onRetryRender ? (
                          <button
                            id={`btn-retry-render-${item.id}`}
                            type="button"
                            onClick={() => onRetryRender(item.id)}
                            className="px-2 py-1 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-[10px] font-semibold border border-rose-700/60 transition-colors flex items-center gap-1"
                            title="Retry EPS Render"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Retry Render</span>
                          </button>
                        ) : item.status !== 'completed' ? (
                          <button
                            id={`btn-generate-single-${item.id}`}
                            type="button"
                            disabled={item.status === 'analyzing' || item.status === 'rendering_eps' || !item.base64Data}
                            onClick={() => onGenerateItem(item.id)}
                            className="p-1.5 rounded bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 transition-colors disabled:opacity-40"
                            title={item.status === 'error' ? 'Retry AI Analysis' : 'Generate Metadata'}
                          >
                            {item.status === 'error' ? (
                              <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                          </button>
                        ) : (
                          <button
                            id={`btn-inspect-single-${item.id}`}
                            type="button"
                            onClick={() => onSelectItem(item.id)}
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 transition-colors"
                            title="Inspect & Edit"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          id={`btn-remove-single-${item.id}`}
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          className="p-1.5 rounded bg-slate-900 hover:bg-rose-950/50 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Remove File"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
