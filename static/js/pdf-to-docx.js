(function () {
    const { setupDropzone, setupProgress, escapeHtml, nameWithoutExt } = ToolCommon;
    const ENDPOINT = '/pdf-tools/convert-to-docx/';
    const STAGES = ['Uploading', 'Converting to DOCX', 'Finishing up'];
    const STAGE_DELAYS_MS = [0, 700, 3500];
    const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    const submitBtn = document.getElementById('submit-btn');
    const resultsGrid = document.getElementById('results-grid');

    const dz = setupDropzone({
        dropzone: document.getElementById('dropzone'),
        fileInput: document.getElementById('file-input'),
        fileList: document.getElementById('file-list'),
        submitBtn: submitBtn,
        maxFiles: 1,
        accept: (f) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name),
    });

    const prog = setupProgress({
        progress: document.getElementById('progress'),
        fill: document.getElementById('progress-fill'),
        text: document.getElementById('progress-text'),
    });

    function addResultCard(name, dataUrl, ok, message) {
        const card = document.createElement('div');
        card.className = 'result-card result-card--file' + (ok ? '' : ' result-card--error');
        if (ok) {
            card.innerHTML =
                '<div class="result-file-icon">DOCX</div>' +
                '<div class="result-meta"><div class="result-meta-row">' +
                '<span class="result-name">' + escapeHtml(name) + '</span>' +
                '<a class="btn-download" href="' + dataUrl + '" download="' +
                escapeHtml(nameWithoutExt(name)) + '.docx">Download</a>' +
                '</div></div>';
        } else {
            card.innerHTML =
                '<div class="result-file-icon">!</div>' +
                '<div class="result-meta"><div class="result-meta-row">' +
                '<span class="result-name">' + escapeHtml(name) + '</span>' +
                '<span class="result-error">' + escapeHtml(message || 'Conversion failed') + '</span>' +
                '</div></div>';
        }
        resultsGrid.prepend(card);
    }

    submitBtn.addEventListener('click', async () => {
        const files = dz.getFiles();
        if (!files.length) return;
        const file = files[0];

        submitBtn.disabled = true;
        resultsGrid.innerHTML = '';
        prog.show();
        prog.set(0, 'Starting…');
        const timers = STAGES.map((stage, i) =>
            setTimeout(() => prog.set(i / STAGES.length, stage + ' "' + file.name + '"…'), STAGE_DELAYS_MS[i])
        );

        try {
            const formData = new FormData();
            formData.append('pdf', file);
            const res = await fetch(ENDPOINT, { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Conversion failed');
            addResultCard(file.name, 'data:' + DOCX_MIME + ';base64,' + data.docx, true);
            prog.set(1, 'Done — "' + file.name + '"');
        } catch (err) {
            addResultCard(file.name, null, false, err.message);
            prog.set(1, 'Failed — "' + file.name + '"');
        } finally {
            timers.forEach(clearTimeout);
            submitBtn.disabled = false;
        }
    });
})();
