import React, { useState } from 'react';
import {
  Sparkles,
  Sliders,
  Settings as SettingsIcon,
  ChevronDown,
  ChevronUp,
  Image,
  Tag,
  RotateCcw,
  SlidersHorizontal,
  Check,
  Ban,
  Layers,
  FileText
} from 'lucide-react';
import { AppMode, AppSettings } from '../types';

interface SidebarProps {
  mode: AppMode;
  onModeChange: (mode: AppMode) => void;
  settings: AppSettings;
  onSettingsChange: (settings: Partial<AppSettings>) => void;
  onResetSettings: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  mode,
  onModeChange,
  settings,
  onSettingsChange,
  onResetSettings,
  isOpenMobile,
  onCloseMobile,
}) => {
  const [customizationExpanded, setCustomizationExpanded] = useState(true);
  const [settingsExpanded, setSettingsExpanded] = useState(true);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed lg:static top-0 left-0 bottom-0 z-40 w-[240px] bg-[#0b0f19] border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out shrink-0 overflow-y-auto custom-scrollbar select-none ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* App Branding Header */}
        <div className="p-4 border-b border-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-900/30 ring-1 ring-cyan-400/30">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
                Microstock<span className="text-cyan-400 font-extrabold">AI</span>
              </h1>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase font-medium">Metadata Engine</p>
            </div>
          </div>
        </div>

        <div className="p-3 space-y-4 flex-1">
          {/* Mode Selection */}
          <div id="mode-selection-container" className="space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between px-1">
              <span>Mode Selection</span>
            </label>

            {/* Mode Toggle Buttons */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900/90 rounded-lg border border-slate-800">
              <button
                id="mode-btn-metadata"
                type="button"
                onClick={() => onModeChange('metadata')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
                  mode === 'metadata'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-900/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Metadata</span>
              </button>

              <button
                id="mode-btn-prompt"
                type="button"
                onClick={() => onModeChange('prompt')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-xs font-semibold transition-all ${
                  mode === 'prompt'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-900/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Image className="w-3.5 h-3.5" />
                <span>To Prompt</span>
              </button>
            </div>
          </div>

          {/* Metadata Customization Section */}
          {mode === 'metadata' && (
            <div id="metadata-customization-section" className="space-y-2 pt-1 border-t border-slate-800/60">
              <button
                id="btn-toggle-customization"
                type="button"
                onClick={() => setCustomizationExpanded(!customizationExpanded)}
                className="w-full flex items-center justify-between py-1.5 px-1 text-[11px] font-semibold text-slate-300 uppercase tracking-wider hover:text-cyan-400 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  Metadata Customization
                </span>
                {customizationExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                )}
              </button>

              {customizationExpanded && (
                <div className="space-y-3.5 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60 text-xs">
                  {/* Min Title Words */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-[11px]">Min Title Words</span>
                      <span className="text-cyan-400 font-mono font-bold text-xs">{settings.minTitleWords}</span>
                    </div>
                    <input
                      id="slider-min-title"
                      type="range"
                      min={4}
                      max={15}
                      value={settings.minTitleWords}
                      onChange={(e) => onSettingsChange({ minTitleWords: parseInt(e.target.value) })}
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Max Title Words */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-[11px]">Max Title Words</span>
                      <span className="text-cyan-400 font-mono font-bold text-xs">{settings.maxTitleWords}</span>
                    </div>
                    <input
                      id="slider-max-title"
                      type="range"
                      min={12}
                      max={35}
                      value={settings.maxTitleWords}
                      onChange={(e) => onSettingsChange({ maxTitleWords: parseInt(e.target.value) })}
                      className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Min Keywords */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-[11px]">Min Keywords</span>
                      <span className="text-purple-400 font-mono font-bold text-xs">{settings.minKeywords}</span>
                    </div>
                    <input
                      id="slider-min-keywords"
                      type="range"
                      min={10}
                      max={35}
                      value={settings.minKeywords}
                      onChange={(e) => onSettingsChange({ minKeywords: parseInt(e.target.value) })}
                      className="w-full accent-purple-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Max Keywords */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-[11px]">Max Keywords</span>
                      <span className="text-purple-400 font-mono font-bold text-xs">{settings.maxKeywords}</span>
                    </div>
                    <input
                      id="slider-max-keywords"
                      type="range"
                      min={25}
                      max={50}
                      value={settings.maxKeywords}
                      onChange={(e) => onSettingsChange({ maxKeywords: parseInt(e.target.value) })}
                      className="w-full accent-purple-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Min Description Words */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-[11px]">Min Description Words</span>
                      <span className="text-emerald-400 font-mono font-bold text-xs">{settings.minDescriptionWords}</span>
                    </div>
                    <input
                      id="slider-min-desc"
                      type="range"
                      min={10}
                      max={25}
                      value={settings.minDescriptionWords}
                      onChange={(e) => onSettingsChange({ minDescriptionWords: parseInt(e.target.value) })}
                      className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Max Description Words */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center text-slate-300">
                      <span className="text-[11px]">Max Description Words</span>
                      <span className="text-emerald-400 font-mono font-bold text-xs">{settings.maxDescriptionWords}</span>
                    </div>
                    <input
                      id="slider-max-desc"
                      type="range"
                      min={25}
                      max={50}
                      value={settings.maxDescriptionWords}
                      onChange={(e) => onSettingsChange({ maxDescriptionWords: parseInt(e.target.value) })}
                      className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settings Section */}
          <div id="settings-section" className="space-y-2 pt-1 border-t border-slate-800/60">
            <button
              id="btn-toggle-settings"
              type="button"
              onClick={() => setSettingsExpanded(!settingsExpanded)}
              className="w-full flex items-center justify-between py-1.5 px-1 text-[11px] font-semibold text-slate-300 uppercase tracking-wider hover:text-cyan-400 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <SettingsIcon className="w-3.5 h-3.5 text-cyan-400" />
                Settings
              </span>
              {settingsExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              )}
            </button>

            {settingsExpanded && (
              <div className="space-y-3 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60 text-xs">
                {/* Single Word Keywords Toggle */}
                <div className="flex items-center justify-between">
                  <label htmlFor="toggle-single-word" className="text-[11px] text-slate-300 cursor-pointer flex items-center gap-1.5">
                    <span>Single Word Keywords</span>
                  </label>
                  <button
                    id="toggle-single-word"
                    type="button"
                    role="switch"
                    aria-checked={settings.singleWordKeywords}
                    onClick={() => onSettingsChange({ singleWordKeywords: !settings.singleWordKeywords })}
                    className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center p-0.5 ${
                      settings.singleWordKeywords ? 'bg-cyan-500' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                        settings.singleWordKeywords ? 'translate-x-3.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Silhouette Toggle */}
                <div className="flex items-center justify-between">
                  <label htmlFor="toggle-silhouette" className="text-[11px] text-slate-300 cursor-pointer flex items-center gap-1.5">
                    <span>Silhouette</span>
                  </label>
                  <button
                    id="toggle-silhouette"
                    type="button"
                    role="switch"
                    aria-checked={settings.silhouette}
                    onClick={() => onSettingsChange({ silhouette: !settings.silhouette })}
                    className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center p-0.5 ${
                      settings.silhouette ? 'bg-cyan-500' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                        settings.silhouette ? 'translate-x-3.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Transparent Background Toggle */}
                <div className="flex items-center justify-between">
                  <label htmlFor="toggle-transparent-bg" className="text-[11px] text-slate-300 cursor-pointer flex items-center gap-1.5">
                    <span>Transparent Background</span>
                  </label>
                  <button
                    id="toggle-transparent-bg"
                    type="button"
                    role="switch"
                    aria-checked={settings.transparentBgEnabled}
                    onClick={() => onSettingsChange({ transparentBgEnabled: !settings.transparentBgEnabled })}
                    className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center p-0.5 ${
                      settings.transparentBgEnabled ? 'bg-cyan-500' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                        settings.transparentBgEnabled ? 'translate-x-3.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Custom Prompt Toggle */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="toggle-custom-prompt" className="text-[11px] text-slate-300 cursor-pointer flex items-center gap-1.5">
                      <span>Custom Prompt</span>
                    </label>
                    <button
                      id="toggle-custom-prompt"
                      type="button"
                      role="switch"
                      aria-checked={settings.customPromptEnabled}
                      onClick={() => onSettingsChange({ customPromptEnabled: !settings.customPromptEnabled })}
                      className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center p-0.5 ${
                        settings.customPromptEnabled ? 'bg-cyan-500' : 'bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                          settings.customPromptEnabled ? 'translate-x-3.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {settings.customPromptEnabled && (
                    <div className="pt-1">
                      <textarea
                        id="input-custom-prompt-text"
                        rows={2}
                        value={settings.customPromptText}
                        onChange={(e) => onSettingsChange({ customPromptText: e.target.value })}
                        placeholder="e.g. Focus on T-shirt design keywords, vintage vibes..."
                        className="w-full bg-slate-950/80 border border-cyan-500/30 rounded p-1.5 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 resize-none"
                      />
                    </div>
                  )}
                </div>

                {/* Prohibited Words Toggle */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="toggle-prohibited-words" className="text-[11px] text-slate-300 cursor-pointer flex items-center gap-1.5">
                      <span>Prohibited Words</span>
                    </label>
                    <button
                      id="toggle-prohibited-words"
                      type="button"
                      role="switch"
                      aria-checked={settings.prohibitedWordsEnabled}
                      onClick={() => onSettingsChange({ prohibitedWordsEnabled: !settings.prohibitedWordsEnabled })}
                      className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center p-0.5 ${
                        settings.prohibitedWordsEnabled ? 'bg-cyan-500' : 'bg-slate-800'
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                          settings.prohibitedWordsEnabled ? 'translate-x-3.5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {settings.prohibitedWordsEnabled && (
                    <div className="pt-1">
                      <textarea
                        id="input-prohibited-words-text"
                        rows={2}
                        value={settings.prohibitedWordsText}
                        onChange={(e) => onSettingsChange({ prohibitedWordsText: e.target.value })}
                        placeholder="badword1, logo, brand, trademark..."
                        className="w-full bg-slate-950/80 border border-rose-500/30 rounded p-1.5 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 resize-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Reset Settings Button */}
          <div className="pt-2">
            <button
              id="btn-reset-settings"
              type="button"
              onClick={onResetSettings}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md bg-slate-900 border border-slate-800 text-[11px] text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>Reset Defaults</span>
            </button>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800/60 text-[10px] text-slate-500 flex items-center justify-between">
          <span>v2.5 Microstock Pro</span>
          <span className="flex items-center gap-1 text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            AI Ready
          </span>
        </div>
      </aside>
    </>
  );
};
