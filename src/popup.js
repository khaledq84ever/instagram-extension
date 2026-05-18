/* InstaGet v1.2.0 popup logic */
const ext = typeof browser !== 'undefined' ? browser : chrome;
const API = 'https://sunny-creation-production-05bc.up.railway.app';
const DOWNLOAD_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
const CHECK_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
const ERROR_ICON = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;

const $ = (id) => document.getElementById(id);
const urlInput      = $('urlInput');
const fetchBtn      = $('fetchBtn');
const errorBox      = $('errorBox');
const resultCard    = $('resultCard');
const resultTitle   = $('resultTitle');
const resultMeta    = $('resultMeta');
const resultThumb   = $('resultThumb');
const actionRow     = $('actionRow');
const progressWrap  = $('progressWrap');
const progressBar   = $('progressBar');
const progressLabel = $('progressLabel');
const settingsBtn   = $('settingsBtn');
const settingsDrawer = $('settingsDrawer');
const setInPage     = $('setInPage');
const setFilename   = $('setFilename');
const setQuality    = $('setQuality');
const apiPing       = $('apiPing');
const apiPingLabel  = $('apiPingLabel');
const pasteBtn      = $('pasteBtn');
const toastHost     = $('toastHost');

let currentInfo = null;
let settings    = { inPage: true, filename: '{uploader}_{title}', defaultAction: 'video' };

/* ---------- helpers ---------- */
function show(el)  { el.hidden = false; }
function hide(el)  { el.hidden = true; }
function setError(msg) { errorBox.textContent = msg; show(errorBox); }
function clearError()  { hide(errorBox); errorBox.textContent = ''; }
function setProgress(pct, label) {
  progressBar.style.width = `${pct}%`;
  progressLabel.textContent = label;
  show(progressWrap);
}
function hideProgress() { hide(progressWrap); progressBar.style.width = '0%'; }

function sanitize(name) {
  const s = String(name ?? '').trim();
  return (s || 'download')
    .replace(/[^\w.\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'download';
}

function renderFilename(template, info) {
  return template
    .replace(/\{title\}/g, sanitize(info.title || 'post'))
    .replace(/\{uploader\}/g, sanitize(info.uploader || 'ig'))
    .replace(/\{id\}/g, sanitize(info.id || Date.now()));
}

/* ---------- toasts ---------- */
function toast(message, kind = '') {
  const t = document.createElement('div');
  t.className = `toast${kind ? ' ' + kind : ''}`;
  const icon = kind === 'success' ? CHECK_ICON : kind === 'error' ? ERROR_ICON : DOWNLOAD_ICON;
  t.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
  toastHost.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(20px)';
    setTimeout(() => t.remove(), 240);
  }, 2400);
}

/* ---------- settings ---------- */
function loadSettings() {
  return new Promise((resolve) => {
    if (ext.storage?.sync?.get) {
      ext.storage.sync.get(['ig_settings'], (data) => {
        if (data?.ig_settings) settings = { ...settings, ...data.ig_settings };
        resolve();
      });
    } else resolve();
  });
}

function saveSettings() {
  if (ext.storage?.sync?.set) ext.storage.sync.set({ ig_settings: settings });
}

function syncSettingsUI() {
  setInPage.checked   = settings.inPage;
  setFilename.value   = settings.filename;
  setQuality.value    = settings.defaultAction;
}

function bindSettingsHandlers() {
  setInPage.addEventListener('change',   () => { settings.inPage         = setInPage.checked; saveSettings(); });
  setFilename.addEventListener('change', () => { settings.filename       = setFilename.value || '{uploader}_{title}'; saveSettings(); });
  setQuality.addEventListener('change',  () => { settings.defaultAction  = setQuality.value; saveSettings(); });
}

settingsBtn.addEventListener('click', () => {
  const open = settingsDrawer.hidden;
  if (open) show(settingsDrawer); else hide(settingsDrawer);
  settingsBtn.setAttribute('aria-expanded', String(open));
});

/* ---------- API status pill ---------- */
async function checkApi() {
  const cached = await getSession('ig_api_status');
  if (cached && Date.now() - cached.ts < 60_000) {
    setApiState(cached.state, cached.label);
    return;
  }
  setApiState('checking', 'Checking…');
  const t0 = performance.now();
  try {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 4500);
    const r = await fetch(`${API}/`, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(to);
    const dt = performance.now() - t0;
    if (!r.ok) throw new Error('bad status');
    const state = dt > 1800 ? 'slow' : 'online';
    const label = state === 'slow' ? `Slow · ${Math.round(dt)}ms` : `Online · ${Math.round(dt)}ms`;
    setApiState(state, label);
    setSession('ig_api_status', { state, label, ts: Date.now() });
  } catch {
    setApiState('offline', 'Offline');
    setSession('ig_api_status', { state: 'offline', label: 'Offline', ts: Date.now() });
  }
}

function setApiState(state, label) {
  apiPing.dataset.state = state;
  apiPingLabel.textContent = label;
}

function getSession(key) {
  return new Promise((resolve) => {
    const store = ext.storage?.session || ext.storage?.local;
    if (!store) return resolve(null);
    store.get([key], (data) => resolve(data?.[key] || null));
  });
}
function setSession(key, value) {
  const store = ext.storage?.session || ext.storage?.local;
  if (store) store.set({ [key]: value });
}

/* ---------- API ---------- */
async function apiPost(path, body) {
  const r = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return r.json();
}

async function pollStatus(jobId, btn) {
  for (let i = 0; i < 120; i++) {
    await new Promise(r => setTimeout(r, 500));
    const r = await fetch(`${API}/status/${jobId}`);
    const d = await r.json();
    if (d.status === 'done')  return d;
    if (d.status === 'error') return null;
    const pct = 10 + Math.min(i * 0.7, 75);
    setProgress(pct, `Processing… ${(i * 0.5).toFixed(0)}s`);
    if (btn) btn.style.setProperty('--p', `${pct}%`);
  }
  return null;
}

function downloadFile(jobId, filename, btn) {
  return new Promise((resolve, reject) => {
    const safeFile = `InstaGet/${sanitize(filename)}`;
    const url = `${API}/download/${jobId}`;
    if (ext.downloads?.download) {
      ext.downloads.download(
        { url, filename: safeFile, saveAs: false, conflictAction: 'uniquify' },
        (downloadId) => {
          const err = ext.runtime.lastError;
          if (err) { reject(new Error(err.message)); return; }
          if (btn) { btn.classList.remove('loading'); btn.classList.add('done'); btn.innerHTML = `${CHECK_ICON} Saved`; }
          resolve(downloadId);
        }
      );
    } else {
      window.open(url, '_blank');
      if (btn) { btn.classList.remove('loading'); btn.classList.add('done'); btn.innerHTML = `${CHECK_ICON} Saved`; }
      resolve();
    }
  });
}

async function startDownload(format, btn) {
  if (!currentInfo) return;
  btn.disabled = true;
  btn.classList.add('loading');
  btn.style.setProperty('--p', '5%');
  setProgress(5, 'Starting…');
  try {
    const filename = renderFilename(settings.filename, currentInfo);
    const start = await apiPost('/start', { url: currentInfo.url, title: filename, format });
    if (start.error) throw new Error(start.error);
    setProgress(10, 'Processing…');
    btn.style.setProperty('--p', '10%');
    const result = await pollStatus(start.job_id, btn);
    if (!result) throw new Error('Processing failed');
    setProgress(90, 'Downloading…');
    btn.style.setProperty('--p', '90%');
    await downloadFile(start.job_id, result.filename, btn);
    setProgress(100, 'Done');
    btn.style.setProperty('--p', '100%');
    toast('Saved to Downloads', 'success');
    setTimeout(hideProgress, 1500);
  } catch (err) {
    hideProgress();
    btn.classList.remove('loading');
    btn.classList.add('error');
    btn.innerHTML = `${ERROR_ICON} Error`;
    btn.disabled = false;
    setError(err.message || 'Download failed');
    toast('Download failed', 'error');
  }
}

/* ---------- info fetch ---------- */
async function fetchInfo() {
  const url = urlInput.value.trim();
  if (!url) { setError('Paste an Instagram URL first.'); return; }

  clearError();
  hide(resultCard);
  hideProgress();
  actionRow.innerHTML = '';
  fetchBtn.disabled = true;
  fetchBtn.innerHTML = '<span class="spinner"></span><span class="btn-label">Fetching…</span>';

  try {
    const data = await apiPost('/info', { url });
    if (data.error) throw new Error(data.error);

    currentInfo = { ...data, url };
    resultTitle.textContent = data.title || 'Instagram Post';

    const USER_SVG  = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    const PLAY_SVG  = `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><polygon points="6 4 20 12 6 20 6 4"/></svg>`;
    const IMG_SVG   = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
    resultMeta.innerHTML = '';
    const makeChip = (svg, text) => {
      const span = document.createElement('span');
      span.className = 'meta-chip';
      span.innerHTML = svg + ' ';
      span.appendChild(document.createTextNode(text));
      return span;
    };
    if (data.uploader)  resultMeta.appendChild(makeChip(USER_SVG, data.uploader));
    if (data.is_video)  resultMeta.appendChild(makeChip(PLAY_SVG, 'Video'));
    else                resultMeta.appendChild(makeChip(IMG_SVG, 'Image'));

    if (data.thumbnail && /^https:\/\//.test(data.thumbnail)) {
      resultThumb.style.backgroundImage = `url("${data.thumbnail.replace(/"/g, '%22')}")`;
      resultThumb.classList.add('has-img');
    } else {
      resultThumb.style.backgroundImage = '';
      resultThumb.classList.remove('has-img');
    }

    actionRow.innerHTML = '';
    if (data.is_video) {
      actionRow.appendChild(mkDlBtn('Download Video', () => startDownload('mp4', _b()), false));
      actionRow.appendChild(mkDlBtn('MP3 Audio',     () => startDownload('mp3', _b()), true));
    } else {
      actionRow.appendChild(mkDlBtn('Download Image', () => startDownload('jpg', _b()), false));
    }

    show(resultCard);
  } catch (err) {
    setError(err.message || 'Could not fetch info');
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg><span class="btn-label">Get Post</span>`;
  }
}

let _activeBtn = null;
function _b() { return _activeBtn; }

function mkDlBtn(label, onClick, alt) {
  const btn = document.createElement('button');
  btn.className = 'dl-btn' + (alt ? ' dl-btn-alt' : '');
  btn.type = 'button';
  btn.innerHTML = `${DOWNLOAD_ICON} ${label}`;
  btn.addEventListener('click', () => { _activeBtn = btn; onClick(); });
  return btn;
}

/* ---------- paste ---------- */
pasteBtn.addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      urlInput.value = text.trim();
      urlInput.focus();
      if (/instagram\.com\//.test(urlInput.value)) fetchInfo();
    }
  } catch {
    toast('Clipboard blocked — paste manually', 'error');
  }
});

/* ---------- bind ---------- */
fetchBtn.addEventListener('click', fetchInfo);
urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') fetchInfo(); });

/* ---------- init ---------- */
(async () => {
  await loadSettings();
  syncSettingsUI();
  bindSettingsHandlers();
  checkApi();

  ext.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
    if (tab?.url && /instagram\.com\/(p|reel|reels|tv)\//.test(tab.url)) {
      urlInput.value = tab.url.split('?')[0];
      fetchInfo();
    } else {
      urlInput.focus();
    }
  });
})();
