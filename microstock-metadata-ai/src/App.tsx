import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { PlatformSelector } from './components/PlatformSelector';
import { UploadZone } from './components/UploadZone';
import { MetadataResultView } from './components/MetadataResultView';
import { BatchProcessingTable } from './components/BatchProcessingTable';
import { ImageToPromptView } from './components/ImageToPromptView';
import { ToastProvider, useToast } from './components/Toast';
import {
  AppMode,
  AppSettings,
  FileCategoryFilter,
  MetadataItem,
  PlatformId,
  ImagePromptResult,
  VisualAnalysisData,
} from './types';
import { PLATFORMS } from './lib/platforms';
import { processImageFile, formatFileSize, getFileExtension } from './lib/imageUtils';
import { adaptMetadataForPlatform } from './lib/validation';
import { exportToCsv, exportToJson } from './lib/exportUtils';
import { SampleArtwork, createSampleFile } from './lib/sampleData';
import { analyzeArtwork, reverseEngineerPrompt } from './services/geminiService';
import { requestQueue, QueueProgress } from './services/queueService';
import { cacheService } from './services/cacheService';
import {
  Menu,
  Sparkles,
  Layers,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Zap,
} from 'lucide-react';

const DEFAULT_SETTINGS: AppSettings = {
  platform: 'adobe-stock',
  minTitleWords: 8,
  maxTitleWords: 22,
  minKeywords: 25,
  maxKeywords: 49,
  minDescriptionWords: 18,
  maxDescriptionWords: 32,
  singleWordKeywords: true,
  silhouette: false,
  customPromptEnabled: false,
  customPromptText: '',
  transparentBgEnabled: false,
  prohibitedWordsEnabled: false,
  prohibitedWordsText: '',
};

function MainAppContent() {
  const { showToast } = useToast();

  // Settings State with LocalStorage Persistence
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('microstock_settings');
      if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    } catch (e) {
      console.error('Failed to load settings from localStorage', e);
    }
    return DEFAULT_SETTINGS;
  });

  const [mode, setMode] = useState<AppMode>('metadata');
  const [platform, setPlatform] = useState<PlatformId>(settings.platform || 'adobe-stock');
  const [activeFilter, setActiveFilter] = useState<FileCategoryFilter>('vectors');
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

  // Files & Processing State
  const [items, setItems] = useState<MetadataItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [isBatchPaused, setIsBatchPaused] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [rateLimitWaiting, setRateLimitWaiting] = useState(false);
  const [activeWorkspaceView, setActiveWorkspaceView] = useState<'detail' | 'batch' | 'auto'>('auto');

  // Preview Modal State for full-size inspection
  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  // Save settings on change
  useEffect(() => {
    try {
      localStorage.setItem('microstock_settings', JSON.stringify({ ...settings, platform }));
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  }, [settings, platform]);

  const handleSettingsChange = (updated: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...updated }));
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    setPlatform('adobe-stock');
    showToast('Settings Reset', 'Restored default microstock configuration.', 'info');
  };

  // Instant Platform Switching: re-adapt existing visual analysis without extra AI calls!
  const handlePlatformChange = (newPlatform: PlatformId) => {
    setPlatform(newPlatform);
    setSettings((prev) => ({ ...prev, platform: newPlatform }));

    // Re-adapt metadata for all items with completed visual analysis
    setItems((prev) =>
      prev.map((item) => {
        if (item.status === 'completed' && item.analysis) {
          const adapted = adaptMetadataForPlatform(
            item.analysis,
            {
              title: item.title,
              description: item.description,
              keywords: item.keywords,
              category: item.primaryCategory,
              secondary_category: item.secondaryCategory,
            },
            newPlatform,
            { ...settings, platform: newPlatform }
          );

          return {
            ...item,
            title: adapted.title,
            description: adapted.description,
            keywords: adapted.keywords,
            primaryCategory: adapted.primaryCategory,
            secondaryCategory: adapted.secondaryCategory,
            qualityScore: adapted.qualityScore,
            validation: adapted.validation,
          };
        }
        return item;
      })
    );

    showToast(
      `${PLATFORMS[newPlatform].name} Selected`,
      `Adjusted metadata constraints (0 extra AI calls).`,
      'info'
    );
  };

  // Single AI Request Helper (using geminiService)
  const analyzeItemWithAI = useCallback(
    async (item: MetadataItem, currentSettings: AppSettings, currentPlatform: PlatformId, forceFresh = false): Promise<MetadataItem> => {
      if (!item.base64Data) {
        return {
          ...item,
          status: 'error',
          errorMessage: 'No artwork preview available for AI visual inspection.',
        };
      }

      if (mode === 'prompt') {
        const promptRes = await reverseEngineerPrompt(item);
        return promptRes.item;
      }

      const res = await analyzeArtwork(item, currentSettings, currentPlatform, forceFresh);
      return res.item;
    },
    [mode]
  );

  // File Upload Handlers (Handles EPS rendering & Preview extraction)
  const handleFilesSelected = async (files: File[]) => {
    if (!files.length) return;

    showToast('Loading Artwork', `Processing ${files.length} file(s)...`, 'info');

    const newItems: MetadataItem[] = [];

    for (const file of files) {
      const ext = getFileExtension(file.name);
      const isEps = ext.toLowerCase() === 'eps';
      const itemId = Math.random().toString(36).substring(2, 9);

      try {
        const { previewUrl, base64Data, mimeType, fileHash, technicalDetails } = await processImageFile(file);

        const newItem: MetadataItem = {
          id: itemId,
          file,
          fileName: file.name,
          fileType: ext,
          fileSize: formatFileSize(file.size),
          fileHash,
          previewUrl,
          base64Data,
          mimeType,
          status: 'idle',
          statusMessage: 'Preview Ready',
          title: '',
          description: '',
          keywords: [],
          primaryCategory: '',
          secondaryCategory: '',
          contentType: technicalDetails.contentType,
          visualStyle: technicalDetails.visualStyle,
          dominantColors: technicalDetails.dominantColors,
          backgroundType: technicalDetails.backgroundType,
          hasTransparency: technicalDetails.hasTransparency,
          isSilhouette: technicalDetails.isSilhouette,
          mainSubject: '',
          commercialUses: [],
          technicalDetails,
        };

        newItems.push(newItem);
      } catch (e: any) {
        console.error('Error rendering artwork file:', file.name, e);
        // Add item in error state if EPS or image failed to render
        newItems.push({
          id: itemId,
          file,
          fileName: file.name,
          fileType: ext,
          fileSize: formatFileSize(file.size),
          previewUrl: '',
          mimeType: 'image/png',
          status: 'error',
          statusMessage: isEps ? 'Render Failed' : 'Load Failed',
          errorMessage: isEps ? 'Unable to render EPS preview. Please retry.' : 'Failed to decode image file.',
          canRetryRender: isEps,
          title: '',
          description: '',
          keywords: [],
          primaryCategory: '',
          secondaryCategory: '',
          contentType: 'Vector',
          visualStyle: 'Vector Graphic',
          dominantColors: [],
          backgroundType: 'Transparent',
          hasTransparency: true,
          isSilhouette: false,
          mainSubject: '',
          commercialUses: [],
        });
      }
    }

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems]);
      if (!selectedItemId) {
        setSelectedItemId(newItems[0].id);
      }

      // If single file successfully prepared, auto-generate metadata
      const validNewItems = newItems.filter((i) => i.status === 'idle' && i.base64Data);
      if (validNewItems.length === 1 && newItems.length === 1) {
        const target = validNewItems[0];
        setSelectedItemId(target.id);
        handleGenerateSingle(target.id, target);
      } else {
        showToast('Files Added', `${newItems.length} files loaded in workspace.`, 'success');
      }
    }
  };

  // Quick Load Sample Artwork
  const handleLoadSample = async (sample: SampleArtwork) => {
    const file = await createSampleFile(sample);
    handleFilesSelected([file]);
  };

  // Generate Metadata for a single item
  const handleGenerateSingle = async (id: string, directItem?: MetadataItem) => {
    const target = directItem || items.find((i) => i.id === id);
    if (!target) return;

    if (!target.base64Data) {
      showToast('Artwork Preview Missing', 'Please render the EPS preview before AI analysis.', 'error');
      return;
    }

    setItems((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, status: 'analyzing', statusMessage: 'Analyzing Artwork...', errorMessage: undefined, apiError: undefined } : it
      )
    );

    const updated = await analyzeItemWithAI(target, settings, platform, true);

    setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));

    if (updated.status === 'completed') {
      showToast('Metadata Generated', `Generated metadata for ${updated.fileName}`, 'success');
    } else {
      showToast('Generation Notice', updated.apiError?.userMessage || updated.errorMessage || 'AI analysis could not complete.', 'error');
    }
  };

  // Centralized Queue Batch Generator (Strict Concurrency = 2)
  const handleGenerateAllBatch = async () => {
    const pendingItems = items.filter((i) => (i.status === 'idle' || i.status === 'error') && i.base64Data);
    if (!pendingItems.length) {
      showToast('No Pending Items', 'All files have been analyzed or have preview errors.', 'info');
      return;
    }

    setIsProcessingBatch(true);
    setIsBatchPaused(false);
    showToast(
      'Batch Processing Started',
      `Analyzing ${pendingItems.length} files with rate-limit queue (Max Concurrency: 2)...`,
      'info'
    );

    await requestQueue.startBatch(pendingItems, settings, platform, {
      onItemUpdated: (updatedItem) => {
        setItems((prev) => prev.map((it) => (it.id === updatedItem.id ? updatedItem : it)));
      },
      onProgress: (progress) => {
        setRateLimitWaiting(progress.rateLimitWaiting);
      },
      onBatchComplete: () => {
        setIsProcessingBatch(false);
        setIsBatchPaused(false);
        setRateLimitWaiting(false);
        showToast('Batch Complete', `Finished batch metadata processing.`, 'success');
      },
    });
  };

  // Pause batch processing
  const handlePauseBatch = () => {
    requestQueue.pause();
    setIsBatchPaused(true);
    showToast('Batch Paused', 'Processing paused. You can resume at any time.', 'info');
  };

  // Resume batch processing
  const handleResumeBatch = () => {
    requestQueue.resume();
    setIsBatchPaused(false);
    showToast('Batch Resumed', 'Resuming queued metadata analysis...', 'info');
  };

  // Retry Failed items in batch
  const handleRetryFailedBatch = async () => {
    const failedItems = items.filter((i) => i.status === 'error' && i.base64Data);
    if (!failedItems.length) {
      showToast('No Failed Items', 'There are no failed items to retry.', 'info');
      return;
    }

    setIsProcessingBatch(true);
    setIsBatchPaused(false);
    showToast('Retrying Failed Files', `Retrying ${failedItems.length} files...`, 'info');

    // Reset status to idle first
    setItems((prev) =>
      prev.map((it) =>
        failedItems.some((f) => f.id === it.id)
          ? { ...it, status: 'idle', statusMessage: 'Ready for retry', errorMessage: undefined, apiError: undefined }
          : it
      )
    );

    await requestQueue.startBatch(failedItems, settings, platform, {
      onItemUpdated: (updatedItem) => {
        setItems((prev) => prev.map((it) => (it.id === updatedItem.id ? updatedItem : it)));
      },
      onProgress: (progress) => {
        setRateLimitWaiting(progress.rateLimitWaiting);
      },
      onBatchComplete: () => {
        setIsProcessingBatch(false);
        setIsBatchPaused(false);
        setRateLimitWaiting(false);
        showToast('Retry Complete', `Finished retrying failed files.`, 'success');
      },
    });
  };

  // Regenerate selected items in batch
  const handleRegenerateSelectedBatch = async (selectedIds: string[]) => {
    if (!selectedIds.length) return;

    const targets = items.filter((i) => selectedIds.includes(i.id) && i.base64Data);
    if (!targets.length) return;

    setIsProcessingBatch(true);
    setIsBatchPaused(false);
    showToast('Regenerating Selected', `Regenerating ${targets.length} files...`, 'info');

    await requestQueue.startBatch(targets, settings, platform, {
      onItemUpdated: (updatedItem) => {
        setItems((prev) => prev.map((it) => (it.id === updatedItem.id ? updatedItem : it)));
      },
      onProgress: (progress) => {
        setRateLimitWaiting(progress.rateLimitWaiting);
      },
      onBatchComplete: () => {
        setIsProcessingBatch(false);
        setIsBatchPaused(false);
        setRateLimitWaiting(false);
        showToast('Regeneration Complete', `Updated selected metadata.`, 'success');
      },
    });
  };

  // Retry EPS rendering
  const handleRetryRender = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item || !item.file) return;

    setItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              status: 'rendering_eps',
              statusMessage: 'Rendering EPS Preview...',
              errorMessage: undefined,
              apiError: undefined,
            }
          : it
      )
    );

    try {
      const { previewUrl, base64Data, mimeType, fileHash, technicalDetails } = await processImageFile(item.file);

      const updated: MetadataItem = {
        ...item,
        previewUrl,
        base64Data,
        mimeType,
        fileHash,
        technicalDetails,
        status: 'idle',
        statusMessage: 'Preview Ready',
        errorMessage: undefined,
        apiError: undefined,
        canRetryRender: false,
      };

      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      showToast('Render Complete', `Rendered preview for ${item.fileName}`, 'success');

      // Proceed to generate metadata
      handleGenerateSingle(id, updated);
    } catch (err: any) {
      setItems((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                status: 'error',
                statusMessage: 'Render Failed',
                errorMessage: 'Unable to render EPS preview. Please retry.',
                canRetryRender: true,
              }
            : it
        )
      );
      showToast('EPS Render Failed', 'Unable to render EPS preview. Please retry.', 'error');
    }
  };

  // Regenerate parts of currently inspected item
  const handleRegenerateCurrentItem = async (type: 'all' | 'title' | 'keywords' | 'description') => {
    const current = items.find((i) => i.id === selectedItemId);
    if (!current) return;

    setIsRegenerating(true);

    if (type === 'all' || mode === 'prompt') {
      const updated = await analyzeItemWithAI(current, settings, platform, true);
      setItems((prev) => prev.map((it) => (it.id === current.id ? updated : it)));
    } else {
      // For specific fields: if analysis exists, adapt locally without hitting AI quota!
      if (current.analysis) {
        const adapted = adaptMetadataForPlatform(
          current.analysis,
          {
            title: current.title,
            description: current.description,
            keywords: current.keywords,
            category: current.primaryCategory,
            secondary_category: current.secondaryCategory,
          },
          platform,
          settings
        );

        setItems((prev) =>
          prev.map((it) => {
            if (it.id !== current.id) return it;
            if (type === 'title') return { ...it, title: adapted.title, validation: adapted.validation, qualityScore: adapted.qualityScore };
            if (type === 'keywords') return { ...it, keywords: adapted.keywords, validation: adapted.validation, qualityScore: adapted.qualityScore };
            if (type === 'description') return { ...it, description: adapted.description, validation: adapted.validation, qualityScore: adapted.qualityScore };
            return it;
          })
        );
      } else {
        const updated = await analyzeItemWithAI(current, settings, platform, false);
        setItems((prev) =>
          prev.map((it) => {
            if (it.id !== current.id) return it;
            if (type === 'title') return { ...it, title: updated.title };
            if (type === 'keywords') return { ...it, keywords: updated.keywords };
            if (type === 'description') return { ...it, description: updated.description };
            return updated;
          })
        );
      }
    }

    setIsRegenerating(false);
    showToast('Regenerated', `Updated ${type} successfully.`, 'success');
  };

  // Item Updates from Editor
  const handleUpdateCurrentItem = (updatedProps: Partial<MetadataItem>) => {
    if (!selectedItemId) return;
    setItems((prev) =>
      prev.map((it) => (it.id === selectedItemId ? { ...it, ...updatedProps } : it))
    );
  };

  // Remove Item
  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    if (selectedItemId === id) {
      const remaining = items.filter((it) => it.id !== id);
      setSelectedItemId(remaining.length ? remaining[0].id : null);
    }
    showToast('File Removed', 'Removed file from workspace.', 'info');
  };

  // Clear All
  const handleClearAll = () => {
    requestQueue.clear();
    setItems([]);
    setSelectedItemId(null);
    setIsProcessingBatch(false);
    setIsBatchPaused(false);
    showToast('Workspace Cleared', 'All files removed.', 'info');
  };

  // Current selected item
  const currentItem = items.find((i) => i.id === selectedItemId) || items[0] || null;

  // Determine current active view
  const isMultiple = items.length > 1;
  const isDetailView =
    (activeWorkspaceView === 'auto' && !isMultiple && items.length > 0 && currentItem?.status === 'completed') ||
    activeWorkspaceView === 'detail';
  const isBatchTableView =
    (activeWorkspaceView === 'auto' && isMultiple) || activeWorkspaceView === 'batch';

  return (
    <div className="flex h-screen w-full bg-[#080c14] text-slate-100 overflow-hidden font-sans">
      {/* Left Sidebar (240px) */}
      <Sidebar
        mode={mode}
        onModeChange={(newMode) => {
          setMode(newMode);
          showToast(`Mode Changed`, `Switched to ${newMode === 'metadata' ? 'Metadata' : 'Image to Prompt'} mode.`, 'info');
        }}
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onResetSettings={handleResetSettings}
        isOpenMobile={isSidebarOpenMobile}
        onCloseMobile={() => setIsSidebarOpenMobile(false)}
      />

      {/* Main Content Workspace */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-y-auto custom-scrollbar">
        {/* Top Navbar */}
        <header className="sticky top-0 z-30 bg-[#0b0f19]/95 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Trigger */}
            <button
              id="btn-mobile-menu"
              type="button"
              onClick={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
              className="lg:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Microstock Metadata AI</span>
                <span className="hidden sm:inline-block text-[10px] px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 font-mono">
                  Visual AI Engine & EPS Renderer
                </span>
              </h1>
            </div>
          </div>

          {/* View Switcher if files exist */}
          {items.length > 0 && (
            <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-lg border border-slate-800 text-xs">
              <button
                id="btn-view-inspector"
                type="button"
                onClick={() => setActiveWorkspaceView('detail')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
                  isDetailView
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Inspector</span>
              </button>

              <button
                id="btn-view-batch"
                type="button"
                onClick={() => setActiveWorkspaceView('batch')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
                  isBatchTableView
                    ? 'bg-cyan-600 text-slate-950 font-bold shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Batch ({items.length})</span>
              </button>

              <button
                id="btn-view-upload"
                type="button"
                onClick={() => setActiveWorkspaceView('auto')}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-slate-400 hover:text-slate-200"
                title="Upload More Files"
              >
                <UploadCloud className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </header>

        {/* Workspace Body */}
        <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {/* Top Platform Selector */}
          <PlatformSelector
            selectedPlatform={platform}
            onSelectPlatform={handlePlatformChange}
          />

          {/* Case 1: No Files Uploaded Yet -> Show Main Upload Card */}
          {items.length === 0 && (
            <div className="pt-4">
              <UploadZone
                onFilesSelected={handleFilesSelected}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                onLoadSample={handleLoadSample}
                isProcessing={isProcessingBatch}
              />
            </div>
          )}

          {/* Case 2: Files Uploaded and in Detail View */}
          {items.length > 0 && isDetailView && currentItem && (
            <>
              {mode === 'metadata' ? (
                <MetadataResultView
                  item={currentItem}
                  settings={settings}
                  platform={platform}
                  onUpdateItem={handleUpdateCurrentItem}
                  onRegenerate={handleRegenerateCurrentItem}
                  onRetryRender={() => handleRetryRender(currentItem.id)}
                  onViewFullPreview={(url) => setPreviewModalUrl(url)}
                  isRegenerating={isRegenerating || currentItem.status === 'analyzing' || currentItem.status === 'rendering_eps'}
                  onExportCsv={() => exportToCsv([currentItem], `${currentItem.fileName.split('.')[0]}_metadata.csv`)}
                  onExportJson={() => exportToJson([currentItem], `${currentItem.fileName.split('.')[0]}_metadata.json`)}
                  onBackToUpload={() => setActiveWorkspaceView('batch')}
                />
              ) : (
                <ImageToPromptView
                  item={currentItem}
                  promptResult={currentItem.promptResult || null}
                  onRegenerate={() => handleRegenerateCurrentItem('all')}
                  isRegenerating={isRegenerating || currentItem.status === 'analyzing'}
                  onBackToUpload={() => setActiveWorkspaceView('batch')}
                />
              )}
            </>
          )}

          {/* Case 3: Files Uploaded and in Batch Table View */}
          {items.length > 0 && isBatchTableView && (
            <div className="space-y-6">
              <BatchProcessingTable
                items={items}
                selectedId={selectedItemId}
                onSelectItem={(id) => {
                  setSelectedItemId(id);
                  setActiveWorkspaceView('detail');
                }}
                onGenerateItem={(id) => handleGenerateSingle(id)}
                onRetryRender={handleRetryRender}
                onGenerateAll={handleGenerateAllBatch}
                onRegenerateSelected={handleRegenerateSelectedBatch}
                onRemoveItem={handleRemoveItem}
                onClearAll={handleClearAll}
                onViewFullPreview={(url) => setPreviewModalUrl(url)}
                onExportCsv={() => exportToCsv(items, `batch_microstock_metadata.csv`)}
                onExportJson={() => exportToJson(items, `batch_microstock_metadata.json`)}
                onAddMoreFiles={() => {
                  const input = document.getElementById('file-upload-input');
                  if (input) input.click();
                }}
                isProcessingBatch={isProcessingBatch}
                isPaused={isBatchPaused}
                onPauseBatch={handlePauseBatch}
                onResumeBatch={handleResumeBatch}
                onRetryFailed={handleRetryFailedBatch}
                rateLimitWaiting={rateLimitWaiting}
              />

              {/* Collapsed Upload Zone under table to easily drop more files */}
              <div className="pt-2">
                <UploadZone
                  onFilesSelected={handleFilesSelected}
                  activeFilter={activeFilter}
                  onFilterChange={setActiveFilter}
                  onLoadSample={handleLoadSample}
                  isProcessing={isProcessingBatch}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Full Preview Modal for inspecting real rendered EPS artwork */}
      {previewModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPreviewModalUrl(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl p-2 flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full flex justify-between items-center px-4 py-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300">Rendered Visual Artwork Preview</span>
              <button
                type="button"
                onClick={() => setPreviewModalUrl(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 bg-slate-800 rounded"
              >
                ✕ Close
              </button>
            </div>
            <div className="p-4 max-h-[80vh] overflow-auto flex items-center justify-center">
              <img
                src={previewModalUrl}
                alt="Artwork Full Preview"
                referrerPolicy="no-referrer"
                className="max-h-[70vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function App() {
  return (
    <ToastProvider>
      <MainAppContent />
    </ToastProvider>
  );
}

export default App;
