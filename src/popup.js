const ext = typeof browser !== 'undefined' ? browser : chrome;
const API = 'https://sunny-creation-production-05bc.up.railway.app';
const DOWNLOAD_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

const urlInput    = document.getElementById('urlInput');
const fetchBtn    = document.getElementById('fetchBtn');
const errorBox    = document.getElementById('errorBox');
const resultCard  = document.getElementById('resultCard');
const resultTitle = document.getElementById('resultTitle');
const resultMeta  = document.getElementById('resultMeta');
const actionRow   = document.getElementById('actionRow');
const progressWrap  = document.getElementById('progressWrap');
const progressBar   = document.getElementById('progressBar');
const progressLabel = document.getElementById('progressLabel');

let currentInfo = null;

const showError  = (msg) => { errorBox.textContent = msg; errorBox.style.display = 'block'; };
const clearError = ()    => { errorBox.style.display = 'none'; };
const setProgress = (pct, label) => {
  progressBar.style.width = `${pct}%`;
  progressLabel.textContent = label;
  progressWrap.style.display = 'flex';
};
const hideProgress = () => { progressWrap.style.display = 'none'; };

function sanitize(name) {
  return (name || 'download')
    .replace(/[^\w.\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'download';
}

async function apiPost(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return r.json();
}

async function pollStatus(jobId) {
  for (let i = 0; i < 120; i++) {
    await new Promise(r => setTimeout(r, 500));
    const r = await fetch(`${API}/status/${jobId}`);
    const d = await r.json();
    if (d.status === 'done') return d;
    if (d.status === 'error') return null;
    setProgress(10 + Math.min(i * 0.7, 75), `Processing… ${(i * 0.5).toFixed(0)}s`);
  }
  return null;
}

function downloadFile(jobId, filename, btn) {
  return new Promise((resolve, reject) => {
    const safeFile = `InstaGet/${sanitize(filename)}`;
    const url = `${API}/download/${jobId}`;

    if (ext.downloads && ext.downloads.download) {
      ext.downloads.download(
        { url, filename: safeFile, saveAs: false, conflictAction: 'uniquify' },
        (downloadId) => {
          const err = ext.runtime.lastError;
          if (err) { reject(new Error(err.message)); return; }
          if (btn) { btn.classList.add('done'); btn.innerHTML = `${DOWNLOAD_ICON} Saved!`; }
          resolve(downloadId);
        }
      );
    } else {
      window.open(url, '_blank');
      if (btn) { btn.classList.add('done'); btn.innerHTML = `${DOWNLOAD_ICON} Saved!`; }
      resolve();
    }
  });
}

async function startDownload(format, btn, label) {
  if (!currentInfo) return;
  btn.disabled = true;
  setProgress(5, 'Starting…');

  try {
    const body = { url: currentInfo.url, title: currentInfo.title || 'instagram', format };
    const start = await apiPost('/start', body);
    if (start.error) throw new Error(start.error);

    setProgress(10, 'Processing…');
    const result = await pollStatus(start.job_id);
    if (!result) throw new Error('Processing failed');

    setProgress(90, 'Downloading…');
    await downloadFile(start.job_id, result.filename, btn);
    setProgress(100, 'Done!');
    setTimeout(hideProgress, 2000);
  } catch (err) {
    hideProgress();
    showError(err.message);
    btn.disabled = false;
    btn.classList.add('error');
    btn.textContent = '✕ Error';
  }
}

async function fetchInfo() {
  const url = urlInput.value.trim();
  if (!url) { showError('Paste an Instagram URL first.'); return; }

  clearError();
  resultCard.style.display = 'none';
  hideProgress();
  actionRow.innerHTML = '';
  fetchBtn.disabled = true;
  fetchBtn.innerHTML = '<span class="spinner"></span> Fetching…';

  try {
    const data = await apiPost('/info', { url });
    if (data.error) throw new Error(data.error);

    currentInfo = data;
    resultTitle.textContent = data.title || 'Instagram Post';

    resultMeta.innerHTML = '';
    if (data.uploader) resultMeta.innerHTML += `<span class="meta-chip">@${data.uploader}</span>`;
    if (data.is_video) resultMeta.innerHTML += `<span class="meta-chip">🎬 Video</span>`;
    else resultMeta.innerHTML += `<span class="meta-chip">🖼 Image</span>`;

    if (data.is_video) {
      const vBtn = document.createElement('button');
      vBtn.className = 'dl-btn';
      vBtn.innerHTML = `${DOWNLOAD_ICON} Download Video`;
      vBtn.addEventListener('click', () => startDownload('mp4', vBtn, 'Video'));
      actionRow.appendChild(vBtn);

      const aBtn = document.createElement('button');
      aBtn.className = 'dl-btn dl-btn-alt';
      aBtn.innerHTML = `${DOWNLOAD_ICON} MP3 Audio`;
      aBtn.addEventListener('click', () => startDownload('mp3', aBtn, 'MP3'));
      actionRow.appendChild(aBtn);
    } else {
      const iBtn = document.createElement('button');
      iBtn.className = 'dl-btn';
      iBtn.innerHTML = `${DOWNLOAD_ICON} Download Image`;
      iBtn.addEventListener('click', () => startDownload('jpg', iBtn, 'Image'));
      actionRow.appendChild(iBtn);
    }

    resultCard.style.display = 'flex';
  } catch (err) {
    showError(err.message);
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.textContent = 'Get Post';
  }
}

fetchBtn.addEventListener('click', fetchInfo);
urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') fetchInfo(); });

ext.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (tab?.url && /instagram\.com\/(p|reel|reels|tv)\//.test(tab.url)) {
    urlInput.value = tab.url.split('?')[0];
  }
});
