const ext = typeof browser !== 'undefined' ? browser : chrome;

ext.runtime.onInstalled.addListener(() => {
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
});

ext.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== 'ig-download') return;
  ext.tabs.sendMessage(tab.id, { type: 'IG_CONTEXT_DOWNLOAD', url: info.linkUrl });
});

function sanitize(name) {
  return (name || 'download')
    .replace(/[^\w.\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'download';
}

ext.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type !== 'IG_DOWNLOAD') return false;

  const safeFile = sanitize(msg.filename.replace('InstaGet/', ''));
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
