const ext = typeof browser !== 'undefined' ? browser : chrome;

const ACTIVE_RE = /^https?:\/\/(www\.)?instagram\.com\//i;

function setTabState(tabId, isActive) {
  if (!ext.action?.setBadgeText) return;
  ext.action.setBadgeBackgroundColor({ color: isActive ? '#10B981' : '#3F3F46', tabId });
  ext.action.setBadgeText({ text: isActive ? '' : '○', tabId });
  ext.action.setTitle({
    title: isActive ? 'InstaGet — ready on this page' : 'InstaGet — open an Instagram post or Reel',
    tabId
  });
}

function refreshTab(tabId) {
  ext.tabs.get(tabId, (tab) => {
    if (ext.runtime.lastError || !tab) return;
    setTabState(tabId, ACTIVE_RE.test(tab.url || ''));
  });
}

ext.tabs.onActivated.addListener(({ tabId }) => refreshTab(tabId));
ext.tabs.onUpdated.addListener((tabId, info) => {
  if (info.url || info.status === 'complete') refreshTab(tabId);
});

ext.runtime.onInstalled.addListener(({ reason }) => {
  ext.contextMenus.create({
    id: 'ig-download',
    title: 'Download with InstaGet',
    contexts: ['link'],
    targetUrlPatterns: [
      '*://www.instagram.com/p/*',
      '*://www.instagram.com/reel/*',
      '*://www.instagram.com/tv/*',
      '*://instagram.com/p/*',
      '*://instagram.com/reel/*',
      '*://instagram.com/tv/*'
    ]
  });

  if (reason === 'install') {
    ext.tabs.create({ url: ext.runtime.getURL('src/welcome.html') });
  }
});

ext.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'ig-download') return;
  ext.tabs.sendMessage(tab.id, { type: 'IG_CONTEXT_DOWNLOAD', url: info.linkUrl });
});

function sanitize(name) {
  // Keep Unicode (Arabic etc); strip only Windows/Chrome-forbidden characters.
  let s = String(name ?? '')
    .replace(/[<>:"/\\|?*\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const i = s.lastIndexOf('.');
  const hasExt = i >= 0 && s.length - i <= 6;
  let stem = (hasExt ? s.slice(0, i) : s).replace(/^[. ]+|[. ]+$/g, '');
  const ext = hasExt ? s.slice(i) : '';
  if (/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(stem)) stem = '_' + stem;
  if (!stem) stem = 'download';
  return stem.slice(0, 150) + ext;
}

ext.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'IG_DOWNLOAD') return false;

  const raw = String(msg.filename ?? '').replace(/^InstaGet\//, '');
  const safeFile = sanitize(raw);
  const filename = `InstaGet/${safeFile}`;

  ext.downloads.download(
    { url: msg.url, filename, saveAs: false, conflictAction: 'uniquify' },
    (downloadId) => {
      const err = ext.runtime.lastError;
      sendResponse(err ? { error: err.message } : { downloadId });
    }
  );

  return true;
});
