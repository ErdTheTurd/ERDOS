/* Platform adapter for the desktop renderer.
   Electron's preload script assigns window.erdos before any page script runs.
   A normal browser has no preload, so install the same method names here.
   Never replace an object the preload already provided. */
(function installErdOSPlatform() {
  if (window.erdos) return;

  const PROGRESS_KEY = 'erdos-progress';

  function unavailable(feature) {
    return new Error(`${feature} is not available in the browser.`);
  }

  function readStoredProgress() {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (_) {
      return null;
    }
  }

  function systemInfo() {
    const nav = navigator;
    const uaData = nav.userAgentData || {};
    const memory = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null;
    return {
      platform: uaData.platform || nav.platform || 'web',
      arch: uaData.architecture || 'web',
      version: '1.7.0',
      hostname: location.hostname || 'browser',
      home: 'Not available in the browser',
      cpus: nav.hardwareConcurrency || 1,
      memoryGB: memory,
      freememGB: null,
      uptime: Math.floor(performance.now() / 1000),
      isPackaged: false,
    };
  }

  window.erdos = {
    getSystemInfo: () => Promise.resolve(systemInfo()),
    getProgress: () => Promise.resolve(readStoredProgress()),
    setProgress: (data) => {
      try {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
      } catch (_) { /* private mode or quota */ }
      return Promise.resolve(data);
    },
    listDir: () => Promise.reject(unavailable('The local file system')),
    readFile: () => Promise.reject(unavailable('Reading local files')),
    writeFile: () => Promise.reject(unavailable('Writing local files')),
    createFolder: () => Promise.reject(unavailable('Creating folders')),
    deletePath: () => Promise.reject(unavailable('Deleting files')),
    openExternal: (url) => {
      if (typeof url === 'string' && /^https?:/i.test(url)) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      return Promise.resolve();
    },
    pickSavePath: () => Promise.reject(unavailable('Saving files')),
    pickOpenPath: () => Promise.reject(unavailable('Opening files')),
    checkUpdates: () => Promise.resolve({
      status: 'web',
      message: 'Updates are not available in the browser.',
    }),
    downloadUpdate: () => Promise.resolve({
      ok: false,
      message: 'Updates are not available in the browser.',
    }),
    installUpdate: () => Promise.resolve({
      ok: false,
      message: 'Updates are not available in the browser.',
    }),
    onUpdateStatus: () => () => {},
    getBrowserDownloads: () => Promise.resolve([]),
    clearBrowserDownloads: () => Promise.resolve([]),
    openBrowserDownload: () => Promise.reject(unavailable('Opening downloads')),
    onBrowserDownload: () => () => {},
  };
})();
