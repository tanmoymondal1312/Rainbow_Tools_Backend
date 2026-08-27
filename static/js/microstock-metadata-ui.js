window.MMUI = (function () {
    var PLATFORMS = {
        'adobe-stock': { name: 'Adobe Stock', maxKeywords: 49, recommended: 45, maxTitle: 200, requiresDesc: true, firstPriority: true },
        'general': { name: 'General Stock', maxKeywords: 49, recommended: 40, maxTitle: 200, requiresDesc: true, firstPriority: false },
        'magnific': { name: 'Magnific AI', maxKeywords: 40, recommended: 35, maxTitle: 220, requiresDesc: true, firstPriority: true },
        'shutterstock': { name: 'Shutterstock', maxKeywords: 50, recommended: 45, maxTitle: 200, requiresDesc: true, firstPriority: false },
        'vecteezy': { name: 'Vecteezy', maxKeywords: 45, recommended: 35, maxTitle: 180, requiresDesc: false, firstPriority: true },
        'depositphotos': { name: 'Depositphotos', maxKeywords: 50, recommended: 40, maxTitle: 200, requiresDesc: true, firstPriority: false },
        '123rf': { name: '123RF', maxKeywords: 50, recommended: 40, maxTitle: 160, requiresDesc: true, firstPriority: false },
        'dreamstime': { name: 'Dreamstime', maxKeywords: 50, recommended: 45, maxTitle: 200, requiresDesc: true, firstPriority: false },
    };

    function escapeHtml(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : s; return d.innerHTML; }
    function formatSize(b) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }
    function nameWithoutExt(n) { return n.replace(/\.[^/.]+$/, '') || 'file'; }

    function showToast(title, message, type) {
        var container = document.getElementById('mm-toast-container');
        if (!container) return;
        var t = document.createElement('div');
        t.className = 'mm-toast ' + (type || 'info');
        t.innerHTML = '<strong>' + escapeHtml(title) + '</strong> ' + escapeHtml(message);
        container.appendChild(t);
        setTimeout(function () { t.remove(); }, 3500);
    }

    function renderPlatformTabs(container, active, onSelect) {
        container.innerHTML = '';
        Object.keys(PLATFORMS).forEach(function (id) {
            var p = PLATFORMS[id];
            var btn = document.createElement('button');
            btn.className = 'mm-platform-tab' + (id === active ? ' active' : '');
            btn.innerHTML = p.name + '<span class="mm-platform-kw">(' + p.maxKeywords + ' kw)</span>';
            btn.addEventListener('click', function () { onSelect(id); });
            container.appendChild(btn);
        });
    }

    /**
     * Adapt metadata for a specific platform.
     * CRITICAL: Uses AI-generated keywords as the PRIMARY source.
     * Only enforces platform limits — does NOT rebuild from analysis fields.
     */
    function adaptMetadataForPlatform(analysis, baseMetadata, platformId, settings) {
        var pc = PLATFORMS[platformId] || PLATFORMS['adobe-stock'];
        var maxKw = Math.min(settings.maxKeywords || 49, pc.maxKeywords);

        // AI-generated keywords are the canonical source
        var aiKeywords = (baseMetadata && baseMetadata.keywords) ? baseMetadata.keywords.slice() : [];

        // Only supplement if AI gave critically few keywords
        if (aiKeywords.length < 8) {
            var supplementary = [];
            if (analysis && analysis.main_subject) {
                analysis.main_subject.toLowerCase().split(/\s+/).forEach(function (w) { if (w.length > 2) supplementary.push(w); });
            }
            if (analysis && analysis.objects) {
                analysis.objects.forEach(function (o) { supplementary.push(o.toLowerCase()); });
            }
            if (analysis && analysis.style) supplementary.push(analysis.style.toLowerCase());
            if (analysis && analysis.content_type) supplementary.push(analysis.content_type.toLowerCase());
            if (analysis && analysis.theme) supplementary.push(analysis.theme.toLowerCase());

            // Add supplementary only if not already present
            var existingLower = aiKeywords.map(function (k) { return k.toLowerCase(); });
            supplementary.forEach(function (s) {
                var sl = s.trim().toLowerCase().replace(/^[,\.\-_:;]+|[,\.\-_:;]+$/g, '');
                if (sl && sl.length > 2 && existingLower.indexOf(sl) === -1) {
                    aiKeywords.push(sl);
                    existingLower.push(sl);
                }
            });
        }

        // Truncate to platform max (preserve AI ordering)
        var finalKw = aiKeywords.slice(0, maxKw);

        // Title and description from AI (already validated by backend)
        var title = (baseMetadata && baseMetadata.title) ? baseMetadata.title.trim() : '';
        var desc = (baseMetadata && baseMetadata.description) ? baseMetadata.description.trim() : '';

        // Quality scores
        var titleWords = title.split(/\s+/).filter(Boolean);
        var minTitle = settings.minTitleWords || 8;
        var maxTitle = settings.maxTitleWords || 22;
        var minDesc = settings.minDescriptionWords || 18;

        var accuracy = Math.min(99, Math.max(60, 96 - (titleWords.length < minTitle ? 8 : titleWords.length > maxTitle ? 4 : 0) - (finalKw.length < 15 ? 6 : 0)));
        var relevance = Math.min(99, Math.max(60, 94 + (titleWords.length >= minTitle && titleWords.length <= maxTitle ? 2 : -4) + (desc.split(/\s+/).length >= minDesc ? 2 : -3)));
        var kwRatio = Math.min(1, finalKw.length / Math.min(49, settings.maxKeywords || 49));
        var seo = Math.round(75 + kwRatio * 23);
        if (finalKw.length >= 40) seo = Math.min(99, seo + 2);
        seo = Math.max(60, Math.min(99, seo));

        return {
            title: title,
            description: desc,
            keywords: finalKw,
            primaryCategory: (baseMetadata && baseMetadata.category) || 'Graphic Resources',
            secondaryCategory: (baseMetadata && baseMetadata.secondary_category) || 'Illustration',
            qualityScore: { accuracy: accuracy, relevance: relevance, seoPotential: seo },
            validation: { keywordCount: finalKw.length, titleWordCount: titleWords.length },
        };
    }

    function renderDetailView(container, item, platform, callbacks) {
        var a = item.analysis || {};
        var conf = item.confidence || 90;
        var confClass = conf >= 80 ? 'high' : conf >= 60 ? 'medium' : 'low';
        var kw = item.keywords || [];
        var qs = item.qualityScore || { accuracy: 90, relevance: 90, seoPotential: 85 };

        container.innerHTML =
            '<div class="mm-detail">' +
            '<div class="mm-col-left">' +
            '<div class="mm-card"><h3>File Preview</h3>' +
            '<img class="mm-preview-img checkerboard" src="' + (item.previewUrl || '') + '" alt="Preview">' +
            '<div class="mm-tech-specs">' +
            (item.technicalDetails ? '<span class="mm-tech-badge">' + (item.technicalDetails.width || '?') + 'x' + (item.technicalDetails.height || '?') + '</span><span class="mm-tech-badge">' + (item.technicalDetails.orientation || '') + '</span>' : '') +
            '<span class="mm-tech-badge">' + escapeHtml(item.mimeType || '') + '</span>' +
            '<span class="mm-tech-badge">' + (a.background || 'Transparent') + '</span>' +
            '</div></div>' +
            '<div class="mm-card"><h3>AI Visual Inventory</h3>' +
            '<p style="font-size:0.78rem;color:var(--mm-muted);margin:0 0 0.5rem"><strong>Main Subject:</strong> ' + escapeHtml(a.main_subject || item.mainSubject || '') + '</p>' +
            (a.objects && a.objects.length ? '<div class="mm-tag-list">' + a.objects.map(function (o) { return '<span class="mm-tag">' + escapeHtml(o) + '</span>'; }).join('') + '</div>' : '') +
            (a.visible_text && a.visible_text.length ? '<p style="font-size:0.72rem;margin:0.5rem 0 0.3rem;color:var(--mm-muted)">Visible Text:</p><div class="mm-tag-list">' + a.visible_text.map(function (t) { return '<span class="mm-tag amber">' + escapeHtml(t) + '</span>'; }).join('') + '</div>' : '') +
            '<p style="font-size:0.72rem;margin:0.5rem 0 0.2rem;color:var(--mm-muted)"><strong>Style:</strong> ' + escapeHtml(a.style || '') + ' | <strong>Type:</strong> ' + escapeHtml(a.content_type || '') + '</p>' +
            (item.dominantColors && item.dominantColors.length ? '<div style="margin-top:0.4rem">' + item.dominantColors.map(function (c) { return '<span class="mm-color-chip" style="background:' + escapeHtml(c) + '" title="' + escapeHtml(c) + '"></span>'; }).join(' ') + '</div>' : '') +
            '<div style="margin-top:0.5rem"><span class="mm-confidence ' + confClass + '">' + conf + '% confidence</span></div>' +
            '</div>' +
            '<div class="mm-card"><h3>Quality Score</h3>' +
            '<div class="mm-score-row"><span class="mm-score-label">Visual Accuracy</span><div class="mm-score-track"><div class="mm-score-fill" style="width:' + qs.accuracy + '%"></div></div><span class="mm-score-val">' + qs.accuracy + '</span></div>' +
            '<div class="mm-score-row"><span class="mm-score-label">Keyword Relevance</span><div class="mm-score-track"><div class="mm-score-fill" style="width:' + qs.relevance + '%"></div></div><span class="mm-score-val">' + qs.relevance + '</span></div>' +
            '<div class="mm-score-row"><span class="mm-score-label">SEO Potential</span><div class="mm-score-track"><div class="mm-score-fill" style="width:' + qs.seoPotential + '%"></div></div><span class="mm-score-val">' + qs.seoPotential + '</span></div>' +
            '</div></div>' +
            '<div class="mm-col-right">' +
            '<div class="mm-field"><label>Title <span class="mm-field-count">' + (item.title || '').split(/\s+/).filter(Boolean).length + ' words</span></label>' +
            '<input type="text" id="mm-edit-title" value="' + escapeHtml(item.title || '') + '">' +
            '<div class="mm-field-actions"><button class="mm-field-btn" data-action="regen-title">↻ Regenerate</button><button class="mm-field-btn" data-action="copy-title">📋 Copy</button></div></div>' +
            '<div class="mm-field"><label>Description <span class="mm-field-count">' + (item.description || '').split(/\s+/).filter(Boolean).length + ' words</span></label>' +
            '<textarea id="mm-edit-desc">' + escapeHtml(item.description || '') + '</textarea>' +
            '<div class="mm-field-actions"><button class="mm-field-btn" data-action="regen-desc">↻ Regenerate</button><button class="mm-field-btn" data-action="copy-desc">📋 Copy</button></div></div>' +
            '<div class="mm-field"><div class="mm-keywords-header"><label style="margin:0">Keywords <span class="mm-keywords-count">' + kw.length + ' / ' + (PLATFORMS[platform] ? PLATFORMS[platform].maxKeywords : 49) + '</span></label>' +
            '<div class="mm-keywords-toolbar"><button class="mm-field-btn" data-action="sort-kw">A-Z</button><button class="mm-field-btn" data-action="regen-kw">↻ Regenerate</button><button class="mm-field-btn" data-action="copy-kw">📋 Copy All</button></div></div>' +
            '<div class="mm-keyword-tags" id="mm-keyword-tags">' +
            kw.map(function (k, i) {
                return '<span class="mm-kw-tag' + (i < 10 ? ' top-10' : '') + '">' +
                    (i < 10 ? '<span class="mm-kw-rank">#' + (i + 1) + '</span> ' : '') +
                    escapeHtml(k) +
                    (i < 10 ? '<button class="mm-kw-move" data-dir="left" data-idx="' + i + '">&#9664;</button>' : '') +
                    (i < kw.length - 1 && i < 10 ? '<button class="mm-kw-move" data-dir="right" data-idx="' + i + '">&#9654;</button>' : '') +
                    '<button class="mm-kw-remove" data-idx="' + i + '">&times;</button></span>';
            }).join('') +
            '</div>' +
            '<div class="mm-add-kw"><input type="text" id="mm-add-kw-input" placeholder="Add keyword..."><button id="mm-add-kw-btn">Add</button></div>' +
            '</div></div></div>';

        if (callbacks.onBind) callbacks.onBind();
    }

    function renderBatchView(container, items, platform, callbacks) {
        var done = items.filter(function (i) { return i.status === 'completed'; }).length;
        var failed = items.filter(function (i) { return i.status === 'error'; }).length;
        var analyzing = items.filter(function (i) { return i.status === 'analyzing'; }).length;

        container.innerHTML =
            '<div class="mm-batch-header">' +
            '<div class="mm-batch-stats"><strong>' + items.length + '</strong> files | <strong style="color:#10b981">' + done + '</strong> done | <strong style="color:#06b6d4">' + analyzing + '</strong> processing | <strong style="color:#ef4444">' + failed + '</strong> failed</div>' +
            '<div class="mm-batch-actions">' +
            '<button class="mm-header-btn" id="mm-batch-add">+ Add Files</button>' +
            '<button class="mm-header-btn primary" id="mm-batch-generate">Generate All</button>' +
            '<button class="mm-header-btn" id="mm-batch-export-csv">CSV</button>' +
            '<button class="mm-header-btn" id="mm-batch-export-json">JSON</button>' +
            '<button class="mm-header-btn" id="mm-batch-clear">Clear All</button>' +
            '</div></div>' +
            '<table class="mm-table"><thead><tr><th></th><th>Preview</th><th>Filename</th><th>Title</th><th>Keywords</th><th>Status</th><th>Actions</th></tr></thead><tbody>' +
            items.map(function (item, idx) {
                var statusClass = item.status === 'completed' ? 'done' : item.status === 'analyzing' ? 'analyzing' : item.status === 'error' ? 'failed' : 'ready';
                return '<tr data-idx="' + idx + '">' +
                    '<td><input type="checkbox" class="mm-batch-check" data-idx="' + idx + '"></td>' +
                    '<td><img class="mm-table-thumb" src="' + (item.previewUrl || '') + '" alt=""></td>' +
                    '<td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + escapeHtml(item.fileName) + '">' + escapeHtml(item.fileName) + '</td>' +
                    '<td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + escapeHtml(item.title || '—') + '</td>' +
                    '<td>' + (item.keywords ? item.keywords.length : 0) + '</td>' +
                    '<td><span class="mm-status-badge ' + statusClass + '">' + (item.status === 'completed' ? 'Done' : item.status === 'analyzing' ? 'Analyzing...' : item.status === 'error' ? 'Failed' : 'Ready') + '</span></td>' +
                    '<td><button class="mm-field-btn" data-action="inspect" data-idx="' + idx + '">Inspect</button></td></tr>';
            }).join('') +
            '</tbody></table>';

        if (callbacks.onBind) callbacks.onBind();
    }

    function renderPromptView(container, item) {
        var pr = item.promptResult || {};
        container.innerHTML =
            '<div class="mm-detail">' +
            '<div class="mm-col-left"><div class="mm-card"><h3>Source Artwork</h3>' +
            '<img class="mm-preview-img" src="' + (item.previewUrl || '') + '" alt="Preview">' +
            '<div class="mm-prompt-section"><h4>Style & Medium</h4><p style="font-size:0.82rem;margin:0">' + escapeHtml(pr.style || '') + '</p></div>' +
            '<div class="mm-prompt-section"><h4>Lighting</h4><p style="font-size:0.82rem;margin:0">' + escapeHtml(pr.lighting || '') + '</p></div>' +
            '<div class="mm-prompt-section"><h4>Composition</h4><p style="font-size:0.82rem;margin:0">' + escapeHtml(pr.composition || '') + '</p></div>' +
            '<div class="mm-prompt-section"><h4>Camera</h4><p style="font-size:0.82rem;margin:0">' + escapeHtml(pr.camera || '') + '</p></div>' +
            (pr.colors ? '<div class="mm-prompt-section"><h4>Colors</h4><div>' + pr.colors.map(function (c) { return '<span class="mm-tag">' + escapeHtml(c) + '</span>'; }).join(' ') + '</div></div>' : '') +
            '</div></div>' +
            '<div class="mm-col-right">' +
            '<div class="mm-prompt-section"><h4>Positive Prompt</h4><div class="mm-prompt-box">' + escapeHtml(pr.prompt || '') + '</div><button class="mm-field-btn" style="margin-top:0.4rem" onclick="navigator.clipboard.writeText(\'' + escapeHtml((pr.prompt || '').replace(/'/g, "\\'")) + '\')">📋 Copy Prompt</button></div>' +
            '<div class="mm-prompt-section"><h4>Negative Prompt</h4><div class="mm-prompt-box mm-prompt-negative">' + escapeHtml(pr.negativePrompt || '') + '</div><button class="mm-field-btn" style="margin-top:0.4rem" onclick="navigator.clipboard.writeText(\'' + escapeHtml((pr.negativePrompt || '').replace(/'/g, "\\'")) + '\')">📋 Copy Negative</button></div>' +
            '<div class="mm-prompt-section"><h4>Parameters</h4><div class="mm-prompt-box mm-prompt-params">' + escapeHtml(pr.parameters || '') + '</div></div>' +
            '</div></div>';
    }

    return {
        PLATFORMS: PLATFORMS,
        escapeHtml: escapeHtml,
        formatSize: formatSize,
        nameWithoutExt: nameWithoutExt,
        showToast: showToast,
        renderPlatformTabs: renderPlatformTabs,
        adaptMetadataForPlatform: adaptMetadataForPlatform,
        renderDetailView: renderDetailView,
        renderBatchView: renderBatchView,
        renderPromptView: renderPromptView,
    };
})();
