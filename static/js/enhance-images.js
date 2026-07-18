(function () {
    const { setupDropzone, setupProgress, escapeHtml, nameWithoutExt } = ToolCommon;
    const ENDPOINT = '/image-optimization/enhance-images/';
    const STAGES = ['Uploading', 'Enhancing', 'Finishing up'];
    const STAGE_DELAYS_MS = [0, 500, 1800];

    const submitBtn = document.getElementById('submit-btn');
    const resultsGrid = document.getElementById('results-grid');

    const dz = setupDropzone({
        dropzone: document.getElementById('dropzone'),
        fileInput: document.getElementById('file-input'),
        fileList: document.getElementById('file-list'),
        submitBtn: submitBtn,
        maxFiles: 5,
        accept: (f) => f.type.startsWith('image/'),
    });

    const prog = setupProgress({
        progress: document.getElementById('progress'),
        fill: document.getElementById('progress-fill'),
        text: document.getElementById('progress-text'),
    });

    function addResultCard(name, dataUrl, ok, message) {
        const card = document.createElement('div');
        card.className = 'result-card' + (ok ? '' : ' result-card--error');
        if (ok) {
            card.innerHTML =
                '<div class="result-preview"><img src="' + dataUrl +
                '" alt="' + escapeHtml(name) + ' enhanced"></div>' +
                '<div class="result-meta"><div class="result-meta-row">' +
                '<span class="result-name">' + escapeHtml(name) + '</span>' +
                '<a class="btn-download" href="' + dataUrl + '" download="' +
                escapeHtml(nameWithoutExt(name)) + '-enhanced.jpg">Download</a>' +
                '</div></div>';
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

    async function processOne(file, index, total) {
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
            formData.append('images', file);
            const res = await fetch(ENDPOINT, { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to process image');
            addResultCard(file.name, 'data:image/jpeg;base64,' + data.images[0], true);
        } catch (err) {
            addResultCard(file.name, null, false, err.message);
        } finally {
            timers.forEach(clearTimeout);
            prog.set(base + span, 'Image ' + (index + 1) + '/' + total + ' done — "' + file.name + '"');
        }
    }

    submitBtn.addEventListener('click', async () => {
        const files = dz.getFiles();
        if (!files.length) return;
        submitBtn.disabled = true;
        resultsGrid.innerHTML = '';
        prog.show();
        prog.set(0, 'Starting…');

        for (let i = 0; i < files.length; i++) {
            await processOne(files[i], i, files.length);
        }

        prog.set(1, 'All done.');
        submitBtn.disabled = false;
    });
})();
