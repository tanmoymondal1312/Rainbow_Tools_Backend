(function () {
    const { setupDropzone, setupProgress, escapeHtml } = ToolCommon;
    const ENDPOINT = '/image-optimization/extract-texts/';
    const STAGES = ['Uploading', 'Reading text', 'Finishing up'];
    const STAGE_DELAYS_MS = [0, 500, 2200];

    const submitBtn = document.getElementById('submit-btn');
    const resultsList = document.getElementById('results-grid');

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

    function addResultCard(name, text, ok, message) {
        const card = document.createElement('div');
        card.className = 'text-result-card' + (ok ? '' : ' text-result-card--error');
        if (ok) {
            card.innerHTML =
                '<div class="text-result-header">' +
                '<span class="result-name">' + escapeHtml(name) + '</span>' +
                '<button type="button" class="btn-copy">Copy</button>' +
                '</div>' +
                '<pre class="text-result-body">' + escapeHtml(text || '(no text found)') + '</pre>';
            card.querySelector('.btn-copy').addEventListener('click', (e) => {
                navigator.clipboard.writeText(text || '');
                e.target.textContent = 'Copied';
                setTimeout(() => (e.target.textContent = 'Copy'), 1200);
            });
        } else {
            card.innerHTML =
                '<div class="text-result-header"><span class="result-name">' + escapeHtml(name) + '</span></div>' +
                '<span class="result-error">' + escapeHtml(message || 'Failed to extract text') + '</span>';
        }
        resultsList.prepend(card);
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
            if (!res.ok) throw new Error(data.message || data.error || 'Failed to extract text');
            addResultCard(file.name, data.texts[0], true);
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
        resultsList.innerHTML = '';
        prog.show();
        prog.set(0, 'Starting…');

        for (let i = 0; i < files.length; i++) {
            await processOne(files[i], i, files.length);
        }

        prog.set(1, 'All done.');
        submitBtn.disabled = false;
    });
})();
