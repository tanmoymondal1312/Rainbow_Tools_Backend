(function () {
    var state = {
        mode: 'metadata',
        platform: 'adobe-stock',
        items: [],
        selectedItem: null,
        view: 'upload',
        settings: loadSettings(),
    };

    var DEFAULT_SETTINGS = {
        minTitleWords: 8, maxTitleWords: 22, minKeywords: 25, maxKeywords: 49,
        minDescriptionWords: 18, maxDescriptionWords: 32,
        singleWordKeywords: true, silhouette: false, transparent: false,
        customPromptEnabled: false, customPromptText: '',
        prohibitedWordsEnabled: false, prohibitedWordsText: '',
    };

    function loadSettings() {
        try { var s = JSON.parse(localStorage.getItem('mm_settings')); return s ? Object.assign({}, DEFAULT_SETTINGS, s) : Object.assign({}, DEFAULT_SETTINGS); } catch (e) { return Object.assign({}, DEFAULT_SETTINGS); }
    }
    function saveSettings() { try { localStorage.setItem('mm_settings', JSON.stringify(state.settings)); } catch (e) { } }

    function $(id) { return document.getElementById(id); }

    function updateView() {
        var uploadView = $('mm-upload-view');
        var detailView = $('mm-detail-view');
        var batchView = $('mm-batch-view');
        var promptView = $('mm-prompt-view');
        var header = $('mm-header');
        var platforms = $('mm-platforms');
        var progress = $('mm-progress');

        uploadView.style.display = 'none';
        detailView.style.display = 'none';
        batchView.style.display = 'none';
        promptView.style.display = 'none';
        header.style.display = 'none';
        platforms.style.display = 'none';

        if (state.items.length === 0) {
            uploadView.style.display = '';
            return;
        }

        header.style.display = '';
        platforms.style.display = '';
        MMUI.renderPlatformTabs(platforms, state.platform, function (id) {
            state.platform = id;
            if (state.selectedItem && state.selectedItem.analysis) {
                handlePlatformChange();
            }
            updateView();
        });

        if (state.mode === 'prompt' && state.selectedItem) {
            promptView.style.display = '';
            MMUI.renderPromptView(promptView, state.selectedItem);
        } else if (state.items.length === 1 && state.selectedItem) {
            detailView.style.display = '';
            MMUI.renderDetailView(detailView, state.selectedItem, state.platform, { onBind: bindDetailViewEvents });
        } else if (state.items.length > 1) {
            batchView.style.display = '';
            MMUI.renderBatchView(batchView, state.items, state.platform, { onBind: bindBatchViewEvents });
        } else if (state.selectedItem) {
            detailView.style.display = '';
            MMUI.renderDetailView(detailView, state.selectedItem, state.platform, { onBind: bindDetailViewEvents });
        }
    }

    function handlePlatformChange() {
        if (!state.selectedItem || !state.selectedItem.analysis) return;
        var adapted = MMUI.adaptMetadataForPlatform(
            state.selectedItem.analysis,
            { title: state.selectedItem.title, description: state.selectedItem.description, keywords: state.selectedItem.keywords, category: state.selectedItem.primaryCategory, secondary_category: state.selectedItem.secondaryCategory },
            state.platform, state.settings
        );
        state.selectedItem.title = adapted.title;
        state.selectedItem.description = adapted.description;
        state.selectedItem.keywords = adapted.keywords;
        state.selectedItem.qualityScore = adapted.qualityScore;
        MMUI.showToast('Platform Changed', 'Metadata adapted for ' + (MMUI.PLATFORMS[state.platform] ? MMUI.PLATFORMS[state.platform].name : state.platform), 'info');
    }

    async function processFile(file) {
        var item = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            fileName: file.name, fileType: file.type, mimeType: file.type || 'image/png',
            status: 'idle', base64Data: null, previewUrl: null, fileHash: null,
            analysis: null, title: '', description: '', keywords: [], primaryCategory: '', secondaryCategory: '',
            contentType: '', visualStyle: '', dominantColors: [], backgroundType: 'Transparent',
            mainSubject: '', confidence: 90, qualityScore: null, validation: null,
            apiError: null, errorMessage: null, promptResult: null,
            technicalDetails: null,
        };

        if (file.name.toLowerCase().endsWith('.eps')) {
            item.status = 'rendering_eps';
            updateView();
            try {
                var b64 = await readFileAsBase64(file);
                var res = await fetch('/microstock-metadata/api/render-eps/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileData: b64, fileName: file.name }),
                });
                var data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.error || 'EPS render failed');
                item.base64Data = data.base64Data;
                item.previewUrl = data.previewUrl;
                item.technicalDetails = { width: data.width, height: data.height, orientation: data.orientation, hasTransparency: data.hasTransparency };
                item.status = 'preview_ready';
            } catch (e) {
                item.status = 'error';
                item.errorMessage = 'EPS render failed: ' + e.message;
            }
        } else {
            try {
                var result = await processImageFile(file);
                item.base64Data = result.base64Data;
                item.previewUrl = result.previewUrl;
                item.technicalDetails = result.technicalDetails;
                item.fileHash = result.fileHash;
                item.status = 'preview_ready';
            } catch (e) {
                item.status = 'error';
                item.errorMessage = 'File processing failed: ' + e.message;
            }
        }
        return item;
    }

    function processImageFile(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function (e) {
                var dataUrl = e.target.result;
                var img = new Image();
                img.onload = function () {
                    var maxPx = 1800;
                    var w = img.width, h = img.height;
                    if (Math.max(w, h) > maxPx) { var r = maxPx / Math.max(w, h); w = Math.round(w * r); h = Math.round(h * r); }
                    var canvas = document.createElement('canvas');
                    canvas.width = w; canvas.height = h;
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, w, h);
                    var fmt = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
                    var b64Full = canvas.toDataURL(fmt, 0.85);
                    var b64Data = b64Full.split(',')[1];
                    var hash = b64Data.substring(0, 10000);
                    var hasher = 0;
                    for (var i = 0; i < hash.length; i++) { hasher = ((hasher << 5) - hash.charCodeAt(i)) | 0; }
                    var fileHash = Math.abs(hasher).toString(36);
                    var orient = Math.abs(w / h - 1) < 0.08 ? 'Square' : (w / h < 0.92 ? 'Portrait' : 'Landscape');
                    resolve({
                        base64Data: b64Data, previewUrl: b64Full, fileHash: fileHash,
                        technicalDetails: { width: w, height: h, orientation: orient, hasTransparency: file.type === 'image/png' },
                    });
                };
                img.onerror = function () { reject(new Error('Failed to load image')); };
                img.src = dataUrl;
            };
            reader.onerror = function () { reject(new Error('Failed to read file')); };
            reader.readAsDataURL(file);
        });
    }

    function readFileAsBase64(file) {
        return new Promise(function (resolve, reject) {
            var reader = new FileReader();
            reader.onload = function (e) { resolve(e.target.result.split(',')[1]); };
            reader.onerror = function () { reject(new Error('Failed to read file')); };
            reader.readAsDataURL(file);
        });
    }

    async function generateSingle(item) {
        item.status = 'analyzing';
        updateView();
        var result = await MMGeminiService.analyzeArtwork(item, state.settings, state.platform, false);
        var idx = state.items.findIndex(function (i) { return i.id === item.id; });
        if (idx >= 0) state.items[idx] = result.item;
        if (state.selectedItem && state.selectedItem.id === item.id) state.selectedItem = result.item;
        if (result.success) { MMUI.showToast('Done', result.fromCache ? 'Loaded from cache' : 'AI analysis complete', 'success'); }
        else { MMUI.showToast('Error', result.error ? result.error.userMessage : 'Analysis failed', 'error'); }
        updateView();
    }

    async function generateAllBatch() {
        var pending = state.items.filter(function (i) { return (i.status === 'idle' || i.status === 'error' || i.status === 'preview_ready') && i.base64Data; });
        if (pending.length === 0) { MMUI.showToast('Info', 'No files to process', 'info'); return; }

        var progressEl = $('mm-progress');
        var fillEl = $('mm-progress-fill');
        var textEl = $('mm-progress-text');
        progressEl.style.display = '';
        fillEl.style.width = '0%';
        textEl.textContent = 'Starting batch processing...';

        MMQueue.startBatch(state.items, state.settings, state.platform, {
            onProgress: function (p) {
                var pct = p.total > 0 ? (p.completed / p.total * 100) : 0;
                fillEl.style.width = pct + '%';
                textEl.textContent = p.completed + '/' + p.total + ' completed' + (p.rateLimitWaiting ? ' (rate limit cooldown...)' : '') + (p.isPaused ? ' (paused)' : '');
                if (p.rateLimitWaiting) $('mm-rate-limit').style.display = ''; else $('mm-rate-limit').style.display = 'none';
            },
            onItemUpdated: function (item) {
                var idx = state.items.findIndex(function (i) { return i.id === item.id; });
                if (idx >= 0) state.items[idx] = item;
                if (state.selectedItem && state.selectedItem.id === item.id) state.selectedItem = item;
                updateView();
            },
            onBatchComplete: function () {
                progressEl.style.display = 'none';
                $('mm-rate-limit').style.display = 'none';
                MMUI.showToast('Batch Complete', 'All files processed', 'success');
                updateView();
            },
        });
    }

    function bindDetailViewEvents() {
        var titleInput = $('mm-edit-title');
        var descInput = $('mm-edit-desc');
        if (titleInput) titleInput.addEventListener('input', function () {
            if (state.selectedItem) { state.selectedItem.title = titleInput.value; }
        });
        if (descInput) descInput.addEventListener('input', function () {
            if (state.selectedItem) { state.selectedItem.description = descInput.value; }
        });

        document.querySelectorAll('[data-action="copy-title"]').forEach(function (btn) {
            btn.addEventListener('click', function () { navigator.clipboard.writeText(state.selectedItem ? state.selectedItem.title : ''); MMUI.showToast('Copied', 'Title copied', 'success'); });
        });
        document.querySelectorAll('[data-action="copy-desc"]').forEach(function (btn) {
            btn.addEventListener('click', function () { navigator.clipboard.writeText(state.selectedItem ? state.selectedItem.description : ''); MMUI.showToast('Copied', 'Description copied', 'success'); });
        });
        document.querySelectorAll('[data-action="copy-kw"]').forEach(function (btn) {
            btn.addEventListener('click', function () { navigator.clipboard.writeText(state.selectedItem ? (state.selectedItem.keywords || []).join(', ') : ''); MMUI.showToast('Copied', 'Keywords copied', 'success'); });
        });
        document.querySelectorAll('[data-action="regen-title"]').forEach(function (btn) {
            btn.addEventListener('click', function () { if (state.selectedItem) generateSingle(state.selectedItem); });
        });
        document.querySelectorAll('[data-action="regen-desc"]').forEach(function (btn) {
            btn.addEventListener('click', function () { if (state.selectedItem) generateSingle(state.selectedItem); });
        });
        document.querySelectorAll('[data-action="regen-kw"]').forEach(function (btn) {
            btn.addEventListener('click', function () { if (state.selectedItem) generateSingle(state.selectedItem); });
        });
        document.querySelectorAll('[data-action="sort-kw"]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (state.selectedItem && state.selectedItem.keywords) {
                    state.selectedItem.keywords.sort();
                    updateView();
                }
            });
        });

        document.querySelectorAll('.mm-kw-remove').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var idx = parseInt(btn.dataset.idx);
                if (state.selectedItem && state.selectedItem.keywords) {
                    state.selectedItem.keywords.splice(idx, 1);
                    updateView();
                }
            });
        });

        document.querySelectorAll('.mm-kw-move').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var idx = parseInt(btn.dataset.idx);
                var dir = btn.dataset.dir;
                if (!state.selectedItem || !state.selectedItem.keywords) return;
                var kw = state.selectedItem.keywords;
                var newIdx = dir === 'left' ? idx - 1 : idx + 1;
                if (newIdx < 0 || newIdx >= kw.length) return;
                var tmp = kw[idx]; kw[idx] = kw[newIdx]; kw[newIdx] = tmp;
                updateView();
            });
        });

        var addKwInput = $('mm-add-kw-input');
        var addKwBtn = $('mm-add-kw-btn');
        if (addKwBtn && addKwInput) {
            addKwBtn.addEventListener('click', function () {
                var val = addKwInput.value.trim();
                if (val && state.selectedItem) {
                    val.split(',').forEach(function (k) { var trimmed = k.trim().toLowerCase(); if (trimmed) state.selectedItem.keywords.push(trimmed); });
                    addKwInput.value = '';
                    updateView();
                }
            });
            addKwInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') addKwBtn.click(); });
        }
    }

    function bindBatchViewEvents() {
        document.querySelectorAll('[data-action="inspect"]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var idx = parseInt(btn.dataset.idx);
                state.selectedItem = state.items[idx];
                state.view = 'detail';
                updateView();
            });
        });

        var genBtn = $('mm-batch-generate');
        if (genBtn) genBtn.addEventListener('click', generateAllBatch);

        var csvBtn = $('mm-batch-export-csv');
        if (csvBtn) csvBtn.addEventListener('click', function () { MMExport.toCsv(state.items); });

        var jsonBtn = $('mm-batch-export-json');
        if (jsonBtn) jsonBtn.addEventListener('click', function () { MMExport.toJson(state.items); });

        var clearBtn = $('mm-batch-clear');
        if (clearBtn) clearBtn.addEventListener('click', function () {
            state.items = []; state.selectedItem = null; state.view = 'upload';
            updateView();
        });
    }

    function init() {
        var dropzone = $('mm-dropzone');
        var fileInput = $('mm-file-input');
        var sidebar = $('mm-sidebar');
        var sidebarToggle = $('mm-sidebar-toggle');

        if (sidebarToggle) sidebarToggle.addEventListener('click', function () { sidebar.classList.toggle('open'); });

        dropzone.addEventListener('click', function () { fileInput.click(); });
        dropzone.addEventListener('dragover', function (e) { e.preventDefault(); dropzone.classList.add('dragover'); });
        dropzone.addEventListener('dragleave', function () { dropzone.classList.remove('dragover'); });
        dropzone.addEventListener('drop', function (e) {
            e.preventDefault(); dropzone.classList.remove('dragover');
            handleFiles(Array.from(e.dataTransfer.files));
        });
        fileInput.addEventListener('change', function (e) { handleFiles(Array.from(e.target.files)); fileInput.value = ''; });

        document.querySelectorAll('.mm-sample-btn').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                var sampleId = btn.dataset.sample;
                var sample = MMSamples.find(function (s) { return s.id === sampleId; });
                if (sample) {
                    var blob = new Blob([sample.svg], { type: 'image/svg+xml' });
                    var file = new File([blob], sample.name, { type: 'image/svg+xml' });
                    handleFiles([file]);
                }
            });
        });

        document.querySelectorAll('.mm-mode-btn').forEach(function (btn) {
            btn.addEventListener('click', function () {
                document.querySelectorAll('.mm-mode-btn').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                state.mode = btn.dataset.mode;
                var metaSettings = $('mm-metadata-settings');
                if (metaSettings) metaSettings.style.display = state.mode === 'metadata' ? '' : 'none';
                updateView();
            });
        });

        $('mm-btn-back').addEventListener('click', function () {
            if (state.items.length > 1) { state.selectedItem = null; state.view = 'batch'; }
            else { state.items = []; state.selectedItem = null; state.view = 'upload'; }
            updateView();
        });
        $('mm-btn-regen-all').addEventListener('click', function () {
            if (state.selectedItem) generateSingle(state.selectedItem);
        });
        $('mm-btn-copy-all').addEventListener('click', function () {
            if (!state.selectedItem) return;
            var text = 'Title: ' + (state.selectedItem.title || '') + '\n\nDescription: ' + (state.selectedItem.description || '') + '\n\nKeywords: ' + (state.selectedItem.keywords || []).join(', ');
            navigator.clipboard.writeText(text); MMUI.showToast('Copied', 'All metadata copied', 'success');
        });
        $('mm-btn-csv').addEventListener('click', function () { MMExport.toCsv(state.items); });
        $('mm-btn-json').addEventListener('click', function () { MMExport.toJson(state.items); });

        ['mm-min-title', 'mm-max-title', 'mm-min-kw', 'mm-max-kw', 'mm-min-desc', 'mm-max-desc'].forEach(function (id) {
            var el = $(id);
            if (el) el.addEventListener('input', function () {
                state.settings.minTitleWords = parseInt($('mm-min-title').value);
                state.settings.maxTitleWords = parseInt($('mm-max-title').value);
                state.settings.minKeywords = parseInt($('mm-min-kw').value);
                state.settings.maxKeywords = parseInt($('mm-max-kw').value);
                state.settings.minDescriptionWords = parseInt($('mm-min-desc').value);
                state.settings.maxDescriptionWords = parseInt($('mm-max-desc').value);
                $('mm-title-val').textContent = state.settings.minTitleWords + ' – ' + state.settings.maxTitleWords;
                $('mm-kw-val').textContent = state.settings.minKeywords + ' – ' + state.settings.maxKeywords;
                $('mm-desc-val').textContent = state.settings.minDescriptionWords + ' – ' + state.settings.maxDescriptionWords;
                saveSettings();
            });
        });

        ['mm-single-kw', 'mm-silhouette', 'mm-transparent'].forEach(function (id) {
            var el = $(id);
            if (el) el.addEventListener('change', function () {
                state.settings.singleWordKeywords = $('mm-single-kw').checked;
                state.settings.silhouette = $('mm-silhouette').checked;
                state.settings.transparent = $('mm-transparent').checked;
                saveSettings();
            });
        });

        $('mm-custom-prompt').addEventListener('change', function () {
            state.settings.customPromptEnabled = $('mm-custom-prompt').checked;
            $('mm-custom-prompt-text').hidden = !state.settings.customPromptEnabled;
            saveSettings();
        });
        $('mm-custom-prompt-text').addEventListener('input', function () {
            state.settings.customPromptText = $('mm-custom-prompt-text').value; saveSettings();
        });
        $('mm-prohibited').addEventListener('change', function () {
            state.settings.prohibitedWordsEnabled = $('mm-prohibited').checked;
            $('mm-prohibited-text').hidden = !state.settings.prohibitedWordsEnabled;
            saveSettings();
        });
        $('mm-prohibited-text').addEventListener('input', function () {
            state.settings.prohibitedWordsText = $('mm-prohibited-text').value; saveSettings();
        });

        $('mm-reset-btn').addEventListener('click', function () {
            state.settings = Object.assign({}, DEFAULT_SETTINGS);
            saveSettings(); applySettingsToUI(); updateView();
            MMUI.showToast('Reset', 'Settings reset to defaults', 'info');
        });

        applySettingsToUI();
        updateView();
    }

    function applySettingsToUI() {
        var s = state.settings;
        $('mm-min-title').value = s.minTitleWords; $('mm-max-title').value = s.maxTitleWords;
        $('mm-min-kw').value = s.minKeywords; $('mm-max-kw').value = s.maxKeywords;
        $('mm-min-desc').value = s.minDescriptionWords; $('mm-max-desc').value = s.maxDescriptionWords;
        $('mm-title-val').textContent = s.minTitleWords + ' – ' + s.maxTitleWords;
        $('mm-kw-val').textContent = s.minKeywords + ' – ' + s.maxKeywords;
        $('mm-desc-val').textContent = s.minDescriptionWords + ' – ' + s.maxDescriptionWords;
        $('mm-single-kw').checked = s.singleWordKeywords;
        $('mm-silhouette').checked = s.silhouette;
        $('mm-transparent').checked = s.transparent;
        $('mm-custom-prompt').checked = s.customPromptEnabled;
        $('mm-custom-prompt-text').hidden = !s.customPromptEnabled;
        $('mm-custom-prompt-text').value = s.customPromptText;
        $('mm-prohibited').checked = s.prohibitedWordsEnabled;
        $('mm-prohibited-text').hidden = !s.prohibitedWordsEnabled;
        $('mm-prohibited-text').value = s.prohibitedWordsText;
    }

    async function handleFiles(files) {
        if (!files || files.length === 0) return;
        $('mm-progress').style.display = '';
        $('mm-progress-fill').style.width = '0%';
        $('mm-progress-text').textContent = 'Processing files...';

        for (var i = 0; i < files.length; i++) {
            var pct = (i / files.length) * 100;
            $('mm-progress-fill').style.width = pct + '%';
            $('mm-progress-text').textContent = 'Processing ' + (i + 1) + '/' + files.length + ': ' + files[i].name;
            var item = await processFile(files[i]);
            state.items.push(item);
            if (files.length === 1 && item.status !== 'error') {
                state.selectedItem = item;
            }
        }

        $('mm-progress').style.display = 'none';

        if (state.items.length === 1 && state.selectedItem && state.selectedItem.status !== 'error') {
            generateSingle(state.selectedItem);
        } else {
            updateView();
        }
    }

    if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
