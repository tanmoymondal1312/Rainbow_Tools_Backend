import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileImage,
  Layers,
  Film,
  Sparkles,
  ShieldCheck,
  Zap,
  Info,
  CheckCircle2,
  FileCode2,
} from 'lucide-react';
import { FileCategoryFilter } from '../types';
import { SAMPLE_ARTWORKS, SampleArtwork, createSampleFile } from '../lib/sampleData';

interface UploadZoneProps {
  onFilesSelected: (files: File[]) => void;
  activeFilter: FileCategoryFilter;
  onFilterChange: (filter: FileCategoryFilter) => void;
  onLoadSample: (sample: SampleArtwork) => void;
  isProcessing: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  onFilesSelected,
  activeFilter,
  onFilterChange,
  onLoadSample,
  isProcessing,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      onFilesSelected(files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      onFilesSelected(files);
      // Reset input value to allow re-uploading the same file
      e.target.value = '';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.webp,.eps,.svg,.ai,image/*"
        onChange={handleFileInputChange}
        className="hidden"
        id="file-upload-input"
      />

      {/* Main Upload Card */}
      <div
        id="main-upload-card"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer rounded-2xl bg-gradient-to-b from-[#161d31] to-[#0f172a] p-8 md:p-12 text-center transition-all duration-300 border-2 ${
          isDragOver
            ? 'border-cyan-400 bg-[#1a233d] shadow-2xl shadow-cyan-500/20 scale-[1.01]'
            : 'border-cyan-500/30 hover:border-cyan-400/80 hover:shadow-xl hover:shadow-cyan-950/40'
        }`}
      >
        {/* Subtle decorative glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-cyan-500/5 rounded-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
          {/* Large Upload Icon */}
          <div className="w-20 h-20 rounded-2xl bg-slate-900/90 border border-cyan-500/40 flex items-center justify-center shadow-inner group-hover:scale-105 group-hover:border-cyan-400 transition-all">
            <UploadCloud className="w-10 h-10 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
          </div>

          {/* Primary Action Button / Callout */}
          <div className="space-y-2">
            <button
              type="button"
              id="btn-choose-files"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm shadow-lg shadow-cyan-900/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Choose Files</span>
            </button>
            <p className="text-xs text-slate-400">or drag and drop your artwork files here</p>
          </div>

          {/* Category Filter Badges */}
          <div
            className="flex items-center gap-2 pt-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              id="filter-tab-images"
              type="button"
              onClick={() => onFilterChange('images')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === 'images'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-xs'
                  : 'bg-slate-900/70 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <FileImage className="w-3.5 h-3.5" />
              <span>Images</span>
            </button>

            <button
              id="filter-tab-vectors"
              type="button"
              onClick={() => onFilterChange('vectors')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === 'vectors'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50 shadow-xs'
                  : 'bg-slate-900/70 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Vectors</span>
            </button>

            <button
              id="filter-tab-videos"
              type="button"
              onClick={() => onFilterChange('videos')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeFilter === 'videos'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50 shadow-xs'
                  : 'bg-slate-900/70 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Videos</span>
            </button>
          </div>

          {/* Supported Formats pill */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-[11px] text-slate-400">
            <span className="text-slate-500 font-medium">Supported:</span>
            {['EPS', 'SVG', 'PNG', 'JPG', 'JPEG', 'WEBP', 'AI'].map((fmt) => (
              <span
                key={fmt}
                className="px-2 py-0.5 rounded bg-slate-900/80 border border-slate-800 font-mono text-[10px] text-slate-300"
              >
                .{fmt.toLowerCase()}
              </span>
            ))}
          </div>

          {/* Unlimited processing statement */}
          <div className="pt-2 flex items-center gap-2 text-xs text-cyan-300/90 font-medium">
            <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Process Unlimited Images in a Single Action</span>
          </div>

          {/* Privacy Statement */}
          <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-slate-500 max-w-lg">
            <ShieldCheck className="w-4 h-4 text-emerald-400/80 shrink-0" />
            <span>
              Privacy Statement: We process your files directly on your device. All data is automatically removed after metadata extraction.
            </span>
          </div>
        </div>
      </div>

      {/* Quick Test Samples Bar */}
      <div className="p-3.5 rounded-xl bg-slate-900/50 border border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-semibold text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Quick Demo Vector Artworks (1-Click Test)
          </span>
          <span className="text-[10px] text-slate-500">Test AI instantly without uploading files</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SAMPLE_ARTWORKS.map((sample) => (
            <button
              key={sample.id}
              id={`sample-artwork-${sample.id}`}
              type="button"
              disabled={isProcessing}
              onClick={() => onLoadSample(sample)}
              className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/70 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition-all text-left group disabled:opacity-50"
            >
              <div className="w-7 h-7 rounded bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 text-cyan-400 group-hover:text-cyan-300">
                <FileCode2 className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-slate-200 truncate group-hover:text-cyan-300">
                  {sample.name.replace('.svg', '').replace(/_/g, ' ')}
                </p>
                <p className="text-[9px] text-slate-400 truncate">{sample.category}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
