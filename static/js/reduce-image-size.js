(function () {
    const { setupDropzone, setupProgress, escapeHtml, nameWithoutExt, extOf, formatSize, base64Size } = ToolCommon;
    const ENDPOINT = '/image-optimization/reduce-images-size/';
    const STAGES = ['Uploading', 'Compressing', 'Finishing up'];
    const STAGE_DELAYS_MS = [0, 500, 1800];
    const DEFAULT_TARGET_KB = 200;

    const submitBtn = document.getElementById('submit-btn');
    const resultsGrid = document.getElementById('results-grid');
    const fileListEl = document.getElementById('file-list');

    const dz = setupDropzone({
        dropzone: document.getElementById('dropzone'),
        fileInput: document.getElementById('file-input'),
        fileList: fileListEl,
        submitBtn: submitBtn,
        maxFiles: 5,
        accept: (f) => f.type.startsWith('image/'),
        extraChip: (file, i) =>
            '<label class="target-size"><input type="number" class="target-size-input" data-index="' + i +
            '" value="' + DEFAULT_TARGET_KB + '" min="10" max="20000" step="10"> KB</label>',
    });

    const prog = setupProgress({
        progress: document.getElementById('progress'),
        fill: document.getElementById('progress-fill'),
        text: document.getElementById('progress-text'),
    });

    function addResultCard(name, dataUrl, originalBytes, ok, message) {
        const card = document.createElement('div');
        card.className = 'result-card' + (ok ? '' : ' result-card--error');
        if (ok) {
            const newBytes = base64Size(dataUrl);
            card.innerHTML =
                '<div class="result-preview"><img src="' + dataUrl + '" alt="' + escapeHtml(name) + ' compressed"></div>' +
                '<div class="result-meta"><div class="result-meta-row">' +
                '<span class="result-name">' + escapeHtml(name) + '</span>' +
                '<a class="btn-download" href="' + dataUrl + '" download="' +
                escapeHtml(nameWithoutExt(name)) + '-reduced' + (extOf(name) || '.jpg') + '">Download</a>' +
                '</div><span class="result-size">' + formatSize(originalBytes) + ' → ' + formatSize(newBytes) + '</span></div>';
        } else {
            card.innerHTML =
                '<div class="result-preview result-preview--error">!</div>' +
                '<div class="result-meta"><div class="result-meta-row">' +
                '<span class="result-name">' + escapeHtml(name) + '</span>' +
                '<span class="result-error">' + escapeHtml(message || 'Failed to process') + '</span>' +
                '</div></div>';
        }
        resultsGrid.prepend(card);
    }

    async function processOne(file, index, total, targetKb) {
        const base = index / total;
        const span = 1 / total;
        const timers = STAGES.map((stage, i) =>
            setTimeout(
                () => prog.set(base, 'Image ' + (index + 1) + '/' + total + ' — ' + stage + ' "' + file.name + '"…'),
                STAGE_DELAYS_MS[i]
            )
        );

        try {
            const formData = new FormData();
            formData.append('image', file);
            formData.append('target_size', String(targetKb));
            const res = await fetch(ENDPOINT, { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to process image');
            addResultCard(file.name, 'data:' + (file.type || 'image/jpeg') + ';base64,' + data.images[0], file.size, true);
        } catch (err) {
            addResultCard(file.name, null, 0, false, err.message);
        } finally {
            timers.forEach(clearTimeout);
            prog.set(base + span, 'Image ' + (index + 1) + '/' + total + ' done — "' + file.name + '"');
        }
    }

    submitBtn.addEventListener('click', async () => {
        const files = dz.getFiles();
        if (!files.length) return;
        const targets = Array.from(fileListEl.querySelectorAll('.target-size-input')).map(
            (el) => Number(el.value) || DEFAULT_TARGET_KB
        );
        submitBtn.disabled = true;
        resultsGrid.innerHTML = '';
        prog.show();
        prog.set(0, 'Starting…');

        for (let i = 0; i < files.length; i++) {
            await processOne(files[i], i, files.length, targets[i]);
        }

        prog.set(1, 'All done.');
        submitBtn.disabled = false;
    });
})();
