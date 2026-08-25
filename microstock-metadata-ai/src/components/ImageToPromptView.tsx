import React, { useState } from 'react';
import {
  Sparkles,
  Copy,
  Check,
  RotateCw,
  Image,
  Layers,
  Camera,
  Sun,
  Palette,
  Eye,
  Sliders,
  Terminal,
} from 'lucide-react';
import { ImagePromptResult, MetadataItem } from '../types';
import { useToast } from './Toast';

interface ImageToPromptViewProps {
  item: MetadataItem;
  promptResult: ImagePromptResult | null;
  onRegenerate: () => void;
  isRegenerating: boolean;
  onBackToUpload?: () => void;
}

export const ImageToPromptView: React.FC<ImageToPromptViewProps> = ({
  item,
  promptResult,
  onRegenerate,
  isRegenerating,
  onBackToUpload,
}) => {
  const { showToast } = useToast();
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    showToast(`Copied ${type}`, text.slice(0, 50) + (text.length > 50 ? '...' : ''), 'success');
    setTimeout(() => setCopiedType(null), 2000);
  };

  if (!promptResult) {
    return (
      <div className="rounded-xl bg-[#161d31] border border-slate-800 p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-cyan-950 border border-cyan-800 flex items-center justify-center mx-auto text-cyan-400">
          <Sparkles className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Reverse-Engineering AI Prompt...</h3>
          <p className="text-xs text-slate-400 mt-1">
            Analyzing visual composition, lighting, art style, and rendering parameters.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id="image-to-prompt-panel" className="w-full space-y-6 animate-in fade-in duration-300">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          {onBackToUpload && (
            <button
              id="btn-prompt-back"
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
              <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-mono">
                Image to Prompt Mode
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Generative prompt synthesis for Midjourney v6, SDXL, Flux.1, and DALL-E 3
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-regenerate-prompt"
            type="button"
            disabled={isRegenerating}
            onClick={onRegenerate}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 text-cyan-400 ${isRegenerating ? 'animate-spin' : ''}`} />
            <span>Regenerate Prompt</span>
          </button>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Image Preview & Technical Spec breakdown */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl bg-[#161d31] border border-slate-800 overflow-hidden shadow-lg">
            <div className="p-3 border-b border-slate-800/80 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                Source Artwork
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                {promptResult.aspectRatio || '16:9'}
              </span>
            </div>

            <div className="aspect-4/3 w-full bg-[#0a0d14] flex items-center justify-center p-4">
              {item.previewUrl && (
                <img
                  src={item.previewUrl}
                  alt={item.fileName}
                  referrerPolicy="no-referrer"
                  className="max-h-full max-w-full object-contain rounded drop-shadow-md"
                />
              )}
            </div>
          </div>

          {/* Breakdown Attributes */}
          <div className="rounded-xl bg-[#161d31] border border-slate-800 p-4 space-y-3 shadow-lg text-xs">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              Prompt Components
            </h3>

            <div className="space-y-2">
              <div>
                <span className="text-[10px] text-slate-500 block uppercase flex items-center gap-1">
                  <Palette className="w-3 h-3 text-cyan-400" /> Style & Medium
                </span>
                <p className="text-slate-200 font-medium">{promptResult.style}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block uppercase flex items-center gap-1">
                  <Sun className="w-3 h-3 text-amber-400" /> Lighting & Atmosphere
                </span>
                <p className="text-slate-200 font-medium">{promptResult.lighting}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block uppercase flex items-center gap-1">
                  <Camera className="w-3 h-3 text-indigo-400" /> Camera & Viewpoint
                </span>
                <p className="text-slate-200 font-medium">{promptResult.camera}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block uppercase flex items-center gap-1">
                  <Layers className="w-3 h-3 text-emerald-400" /> Composition
                </span>
                <p className="text-slate-200 font-medium">{promptResult.composition}</p>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 block uppercase">Color Harmony</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {promptResult.colors.map((c, i) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Prompts and Generator Flags */}
        <div className="lg:col-span-8 space-y-5">
          {/* Main Positive Prompt */}
          <div className="rounded-xl bg-[#161d31] border border-cyan-500/30 p-5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Detailed AI Image Prompt
                </h3>
              </div>
              <button
                id="btn-copy-main-prompt"
                type="button"
                onClick={() => handleCopy(promptResult.prompt, 'Prompt')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-xs font-bold transition-all shadow-md shadow-cyan-950/40"
              >
                {copiedType === 'Prompt' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Copy Prompt</span>
              </button>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950/90 border border-slate-800 text-sm text-slate-100 leading-relaxed font-mono select-all">
              {promptResult.prompt}
            </div>

            <p className="text-[10px] text-slate-500">
              Ready to paste into Midjourney, Stable Diffusion WebUI, ComfyUI, Leonardo AI, or DALL-E.
            </p>
          </div>

          {/* Negative Prompt */}
          <div className="rounded-xl bg-[#161d31] border border-slate-800 p-4 space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-rose-400" />
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Negative Prompt
                </h3>
              </div>
              <button
                id="btn-copy-negative-prompt"
                type="button"
                onClick={() => handleCopy(promptResult.negativePrompt, 'Negative Prompt')}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
              >
                {copiedType === 'Negative Prompt' ? <Check className="w-3 h-3 text-rose-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy Negative</span>
              </button>
            </div>

            <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 text-xs text-rose-200/90 font-mono select-all">
              {promptResult.negativePrompt}
            </div>
          </div>

          {/* Model Parameters / CLI String */}
          <div className="rounded-xl bg-[#161d31] border border-slate-800 p-4 space-y-2 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Midjourney / CLI Parameters
              </span>
              <button
                id="btn-copy-full-prompt-params"
                type="button"
                onClick={() => handleCopy(`${promptResult.prompt} ${promptResult.parameters}`, 'Full Midjourney Prompt')}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
              >
                Copy Prompt + Flags
              </button>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-xs text-purple-300 select-all">
              {promptResult.parameters}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
