import React from 'react';
import { PlatformId } from '../types';
import { PLATFORMS } from '../lib/platforms';
import { Globe, Layers, Sparkles, Check, Info } from 'lucide-react';

interface PlatformSelectorProps {
  selectedPlatform: PlatformId;
  onSelectPlatform: (platform: PlatformId) => void;
}

export const PlatformSelector: React.FC<PlatformSelectorProps> = ({
  selectedPlatform,
  onSelectPlatform,
}) => {
  const currentConfig = PLATFORMS[selectedPlatform];

  return (
    <div id="top-platform-selector-container" className="w-full space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Platforms
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {Object.keys(PLATFORMS).length} Profiles
          </span>
        </div>

        {/* Current Active Platform Highlight Pill */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/90 px-2.5 py-1 rounded-full border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
          <span className="font-medium text-purple-300">{currentConfig.name}</span>
          <span className="text-slate-500">|</span>
          <span className="text-[11px] text-slate-400">Max {currentConfig.maxKeywords} Keywords</span>
        </div>
      </div>

      {/* Horizontal Scrollable Tabs */}
      <div
        id="platform-tabs-scroll-wrapper"
        className="flex items-center gap-1.5 overflow-x-auto pb-1.5 custom-scrollbar select-none"
      >
        {(Object.keys(PLATFORMS) as PlatformId[]).map((platformKey) => {
          const config = PLATFORMS[platformKey];
          const isSelected = selectedPlatform === platformKey;

          return (
            <button
              key={platformKey}
              id={`platform-tab-${platformKey}`}
              type="button"
              onClick={() => onSelectPlatform(platformKey)}
              className={`group relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-200 shrink-0 ${
                isSelected
                  ? 'bg-gradient-to-r from-purple-950/80 via-purple-900/60 to-indigo-950/80 text-white border-2 border-purple-500/80 shadow-lg shadow-purple-950/60 ring-2 ring-purple-500/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-slate-800/80'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full transition-colors ${
                  isSelected ? 'bg-purple-400 shadow-sm shadow-purple-400' : 'bg-slate-700 group-hover:bg-slate-500'
                }`}
              />
              <span>{config.name}</span>

              {/* Special Tag for Adobe Stock */}
              {platformKey === 'adobe-stock' && (
                <span
                  className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded ${
                    isSelected
                      ? 'bg-purple-500 text-white'
                      : 'bg-purple-950/60 text-purple-400 border border-purple-800/50'
                  }`}
                >
                  Primary
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
