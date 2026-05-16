const ext = typeof browser !== 'undefined' ? browser : chrome;

const API = 'https://sunny-creation-production-05bc.up.railway.app';

const DOWNLOAD_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;

const POST_RE = /\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/;

function getPostUrl(article) {
  const links = article.querySelectorAll('a[href*="/p/"], a[href*="/reel/"], a[href*="/tv/"]');
  for (const a of links) {
    const href = a.getAttribute('href') || '';
    if (POST_RE.test(href)) {
      const clean = href.split('?')[0];
      return clean.startsWith('http') ? clean : `https://www.instagram.com${clean}`;
    }
  }
  return null;
}

function hasMedia(article) {
  return article.querySelector('video, img[srcset]') !== null;
}

function alreadyInjected(article) {
  return article.querySelector('.ig-wrap') !== null;
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
  }
  return null;
}

function sanitize(name) {
  return (name || 'download')
    .replace(/[^\w.\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'download';
}

function triggerDownload(jobId, filename) {
  const url = `${API}/download/${jobId}`;
  const safeFile = `InstaGet/${sanitize(filename)}`;

  return new Promise((resolve) => {
    let settled = false;
    const done = () => { if (!settled) { settled = true; resolve(); } };

    try {
      ext.runtime.sendMessage(
        { type: 'IG_DOWNLOAD', url, filename: safeFile },
        () => {
          if (ext.runtime.lastError) iframeFallback(url);
          done();
        }
      );
    } catch (_) {
      iframeFallback(url);
      done();
    }

    setTimeout(() => {
      if (!settled) { iframeFallback(url); done(); }
    }, 4000);
  });
}

function iframeFallback(url) {
  const a = document.createElement('a');
  a.href = url;
  a.setAttribute('download', '');
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => a.remove(), 2000);
}

async function handleDownload(postUrl, format, btn, label) {
  btn.disabled = true;
  btn.classList.add('ig-loading');
  btn.innerHTML = `<span class="ig-spinner"></span>${label}ing…`;

  try {
    const info = await apiPost('/info', { url: postUrl });
    if (info.error) throw new Error(info.error);

    const startData = await apiPost('/start', {
      url: info.url || postUrl,
      title: info.title || 'instagram',
      format
    });
    if (startData.error) throw new Error(startData.error);

    const result = await pollStatus(startData.job_id);
    if (!result) throw new Error('Processing failed');

    await triggerDownload(startData.job_id, result.filename);

    btn.classList.remove('ig-loading');
    btn.classList.add('ig-done');
    btn.innerHTML = `${DOWNLOAD_ICON} Saved!`;
    setTimeout(() => {
      btn.classList.remove('ig-done');
      btn.disabled = false;
      btn.innerHTML = `${DOWNLOAD_ICON} ${label}`;
    }, 3000);
  } catch (err) {
    btn.classList.remove('ig-loading');
    btn.classList.add('ig-error');
    btn.innerHTML = `✕ ${err.message.slice(0, 28)}`;
    btn.disabled = false;
    setTimeout(() => {
      btn.classList.remove('ig-error');
      btn.innerHTML = `${DOWNLOAD_ICON} ${label}`;
    }, 4000);
  }
}

function injectButtons(article) {
  if (alreadyInjected(article)) return;
  if (!hasMedia(article)) return;

  const postUrl = getPostUrl(article);
  if (!postUrl) return;

  const wrap = document.createElement('div');
  wrap.className = 'ig-wrap';

  const isVideo = article.querySelector('video') !== null;

  const btn = document.createElement('button');
  btn.className = 'ig-btn';
  const label = isVideo ? 'Video' : 'Photo';
  const format = isVideo ? 'mp4' : 'jpg';
  btn.innerHTML = `${DOWNLOAD_ICON} ${label}`;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    handleDownload(postUrl, format, btn, label);
  });
  wrap.appendChild(btn);

  if (isVideo) {
    const mp3Btn = document.createElement('button');
    mp3Btn.className = 'ig-btn ig-btn-alt';
    mp3Btn.innerHTML = `${DOWNLOAD_ICON} MP3`;
    mp3Btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      handleDownload(postUrl, 'mp3', mp3Btn, 'MP3');
    });
    wrap.appendChild(mp3Btn);
  }

  const actionsRow = article.querySelector('section, header + div + div');
  if (actionsRow) {
    actionsRow.insertAdjacentElement('afterend', wrap);
  } else {
    article.appendChild(wrap);
  }
}

function scanArticles() {
  document.querySelectorAll('article').forEach(article => {
    if (alreadyInjected(article)) return;
    if (hasMedia(article)) {
      injectButtons(article);
    } else {
      setTimeout(() => {
        if (!alreadyInjected(article) && hasMedia(article)) injectButtons(article);
      }, 1200);
    }
  });

  // Reels page: standalone player without <article>
  const isReelPage = /\/(reel|reels|tv)\//.test(location.pathname);
  if (isReelPage && !document.querySelector('.ig-reel-fab')) {
    addReelFab();
  }
}

function addReelFab() {
  if (!POST_RE.test(location.pathname)) return;
  const fab = document.createElement('div');
  fab.className = 'ig-reel-fab';
  const btn = document.createElement('button');
  btn.className = 'ig-btn ig-btn-fab';
  btn.innerHTML = `${DOWNLOAD_ICON} Save Reel`;
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const url = `https://www.instagram.com${location.pathname}`;
    handleDownload(url, 'mp4', btn, 'Save Reel');
  });
  fab.appendChild(btn);
  document.body.appendChild(fab);
}

ext.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'IG_CONTEXT_DOWNLOAD') {
    const tmp = document.createElement('button');
    tmp.style.position = 'fixed';
    tmp.style.top = '14px';
    tmp.style.right = '14px';
    tmp.style.zIndex = '999999';
    tmp.className = 'ig-btn ig-btn-fab';
    tmp.innerHTML = `${DOWNLOAD_ICON} Starting…`;
    document.body.appendChild(tmp);
    handleDownload(msg.url, 'mp4', tmp, 'Done');
    setTimeout(() => tmp.remove(), 6000);
  }
});

let debounceTimer = null;
const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(scanArticles, 200);
});
observer.observe(document.body, { childList: true, subtree: true });

setInterval(scanArticles, 2500);
scanArticles();
