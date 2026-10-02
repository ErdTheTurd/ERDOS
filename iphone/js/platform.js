/* Capacitor adapter for the iPhone shell.
   Electron keeps using electron/preload.js. The desktop web fallback
   stays in desktop/js/platform.js. This file is the third adapter:
   native calls when Capacitor is present, and the same method names
   against on-device storage when the phone UI is opened in a browser. */
(function installIphonePlatform() {
  if (window.erdos && window.erdos.__provider) return;

  const Logic = window.BlokLogic;
  const SETTINGS_KEY = 'erdos-blok-settings';
  const SITES_KEY = 'erdos-blok-sites';
  const COUNTS_KEY = 'erdos-blok-counts';
  const LEARNING_KEY = 'erdos-blok-learning';
  const FILES_KEY = 'erdos-iphone-files';
  const listeners = new Set();

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (_) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }

  function emit(event, detail) {
    listeners.forEach((fn) => {
      try { fn(event, detail); } catch (_) { /* listener */ }
    });
  }

  function defaultSettings() {
    return {
      visual: true,
      textDetection: true,
      textThreshold: Logic.TEXT_THRESHOLD,
      minWords: Logic.MIN_WORDS,
      shareFeedback: false,
      reviewBeforeSending: true,
      shareChoice: 'unset',
    };
  }

  function settings() {
    return Object.assign(defaultSettings(), readJSON(SETTINGS_KEY, {}));
  }

  function setSettings(partial) {
    const next = Object.assign(settings(), partial || {});
    writeJSON(SETTINGS_KEY, next);
    emit('settings', next);
    return next;
  }

  function sites() {
    return readJSON(SITES_KEY, {});
  }

  function sitePrefs(host) {
    const key = String(host || '').replace(/^www\./i, '');
    return Object.assign({ ads: true, ai: true }, sites()[key] || {});
  }

  function setSite(host, partial) {
    const key = String(host || '').replace(/^www\./i, '');
    const all = sites();
    all[key] = Object.assign({ ads: true, ai: true }, all[key] || {}, partial || {});
    writeJSON(SITES_KEY, all);
    emit('site', { host: key, prefs: all[key] });
    return all[key];
  }

  function counts() {
    const stored = readJSON(COUNTS_KEY, null);
    if (!stored || stored.date !== today()) {
      return { date: today(), ads: 0, overview: 0, widget: 0, text: 0, image: 0, video: 0, audio: 0 };
    }
    return stored;
  }

  function bump(kind) {
    const map = { ads: 'ads', overview: 'overview', widget: 'widget', text: 'text', image: 'image', video: 'video', audio: 'audio' };
    const field = map[kind];
    if (!field) return counts();
    const next = counts();
    next[field] = (next[field] || 0) + 1;
    writeJSON(COUNTS_KEY, next);
    emit('counts', next);
    return next;
  }

  function learningState() {
    const stored = readJSON(LEARNING_KEY, { records: [] });
    if (!stored || !Array.isArray(stored.records)) return { records: [] };
    return stored;
  }

  function saveLearning(state) {
    writeJSON(LEARNING_KEY, { records: state.records.slice(-1000) });
    emit('learning', adapterView());
    return adapterView();
  }

  function adapterView() {
    const prefs = settings();
    const records = learningState().records;
    return {
      records,
      summary: Logic.adapterSummary(records),
      queue: Logic.shareQueue(records),
      shareChoice: prefs.shareChoice,
      shareFeedback: prefs.shareFeedback,
      reviewBeforeSending: prefs.reviewBeforeSending,
      transport: 'on-device-only',
    };
  }

  function saveFeedback(input) {
    const prefs = settings();
    const record = Logic.buildFeedbackRecord(input, prefs);
    const state = learningState();
    state.records = Logic.upsertRecord(state.records, record);
    saveLearning(state);
    emit('feedback', record);
    if (prefs.shareChoice === 'unset') emit('share-prompt', record);
    return record;
  }

  function undoFeedback(id) {
    const state = learningState();
    state.records = Logic.undoRecord(state.records, id);
    saveLearning(state);
    emit('undo', { id });
    return adapterView();
  }

  function verdict(hash) {
    return Logic.verdictFor(learningState().records, hash);
  }

  function setShareChoice(choice) {
    const shareFeedback = choice === 'share';
    const next = setSettings({
      shareChoice: choice === 'share' ? 'share' : 'local',
      shareFeedback,
    });
    emit('share-choice', next);
    return next;
  }

  function reviewShare(id, approve) {
    const state = learningState();
    state.records = state.records.map((record) => {
      if (!record || record.id !== id) return record;
      const sharing = Object.assign({}, record.sharing, approve
        ? { state: 'queued', eligible: true, reason: 'approved-on-device' }
        : { state: 'on-device', eligible: false, reason: 'kept-local' });
      return Object.assign({}, record, { sharing });
    });
    saveLearning(state);
    return adapterView();
  }

  function clearLearning(scope) {
    if (scope === 'shared') {
      const state = learningState();
      state.records = state.records.map((record) => {
        if (!record || !record.sharing) return record;
        if (record.sharing.state !== 'queued' && record.sharing.state !== 'needs-review') return record;
        return Object.assign({}, record, {
          excerpt: '',
          sharing: { eligible: false, state: 'on-device', reason: 'deleted-share-copy' },
        });
      });
      saveLearning(state);
      return adapterView();
    }
    writeJSON(LEARNING_KEY, { records: [] });
    emit('learning', adapterView());
    return adapterView();
  }

  function seedFiles() {
    return {
      files: {
        'Notes/Welcome.txt': 'Welcome to ERDOS notes. What you write here stays on this phone.',
        'Files/Read me.txt': 'Files in this list stay in the app. On iPhone, Open from Files can bring in a text file from the Files app.',
      },
      dirs: ['Notes', 'Files'],
    };
  }

  function readFs() {
    const stored = readJSON(FILES_KEY, null);
    if (!stored || !stored.files) return seedFiles();
    return {
      files: stored.files,
      dirs: Array.isArray(stored.dirs) ? stored.dirs : ['Notes', 'Files'],
    };
  }

  function writeFs(fs) {
    writeJSON(FILES_KEY, fs);
    return fs;
  }

  function normalizePath(target) {
    const parts = String(target || '').split(/[/\\]+/).filter(Boolean);
    const safe = [];
    parts.forEach((part) => {
      if (part === '..') throw new Error('That path is not available.');
      if (part !== '.') safe.push(part);
    });
    return safe.join('/');
  }

  function listDir(target) {
    const dir = normalizePath(target);
    const fs = readFs();
    const names = new Map();
    fs.dirs.forEach((entry) => {
      if (!dir && entry.indexOf('/') === -1) names.set(entry, true);
      if (dir && entry.indexOf(dir + '/') === 0) {
        const rest = entry.slice(dir.length + 1);
        if (rest && rest.indexOf('/') === -1) names.set(rest, true);
      }
    });
    Object.keys(fs.files).forEach((filePath) => {
      if (!dir) {
        const top = filePath.split('/')[0];
        if (filePath.indexOf('/') !== -1) names.set(top, true);
        else names.set(filePath, false);
        return;
      }
      const prefix = dir + '/';
      if (filePath.indexOf(prefix) !== 0) return;
      const rest = filePath.slice(prefix.length);
      if (!rest) return;
      if (rest.indexOf('/') === -1) names.set(rest, false);
      else names.set(rest.split('/')[0], true);
    });
    const entries = [];
    names.forEach((isDirectory, name) => entries.push({ name, isDirectory }));
    entries.sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return { path: dir, entries };
  }

  function readFile(target) {
    const path = normalizePath(target);
    const fs = readFs();
    if (!Object.prototype.hasOwnProperty.call(fs.files, path)) throw new Error('File not found.');
    return fs.files[path];
  }

  function writeFile(target, content) {
    const path = normalizePath(target);
    const fs = readFs();
    fs.files[path] = String(content == null ? '' : content);
    const folder = path.split('/').slice(0, -1).join('/');
    if (folder && fs.dirs.indexOf(folder) === -1) fs.dirs.push(folder);
    writeFs(fs);
    return path;
  }

  function createFolder(target) {
    const path = normalizePath(target);
    const fs = readFs();
    if (fs.dirs.indexOf(path) === -1) fs.dirs.push(path);
    writeFs(fs);
    return path;
  }

  function deletePath(target) {
    const path = normalizePath(target);
    const fs = readFs();
    delete fs.files[path];
    const prefix = path + '/';
    Object.keys(fs.files).forEach((filePath) => {
      if (filePath.indexOf(prefix) === 0) delete fs.files[filePath];
    });
    fs.dirs = fs.dirs.filter((entry) => entry !== path && entry.indexOf(prefix) !== 0);
    writeFs(fs);
    return true;
  }

  function disabledHosts(flag) {
    return Object.keys(sites()).filter((host) => sites()[host] && sites()[host][flag] === false);
  }

  function blokConfig() {
    const prefs = settings();
    return {
      ads: true,
      ai: true,
      visual: prefs.visual,
      textDetection: prefs.textDetection,
      textThreshold: prefs.textThreshold,
      minWords: prefs.minWords,
      disabledAds: disabledHosts('ads'),
      disabledAi: disabledHosts('ai'),
    };
  }

  function nativePlugin() {
    const cap = window.Capacitor;
    if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return null;
    try {
      return cap.registerPlugin('ErdosNative');
    } catch (_) {
      return null;
    }
  }

  const plugin = nativePlugin();
  const native = !!plugin;

  async function pushNativeConfig() {
    if (!plugin || !plugin.setBlokConfig) return;
    try {
      await plugin.setBlokConfig(blokConfig());
    } catch (_) { /* plugin still starting */ }
  }

  if (plugin && plugin.addListener) {
    plugin.addListener('navigation', (payload) => emit('navigation', payload));
    plugin.addListener('counts', (payload) => emit('counts', payload));
    plugin.addListener('learning', (payload) => emit('learning', payload));
    plugin.addListener('sharePrompt', () => emit('share-prompt', { source: 'native' }));
    plugin.addListener('toast', (payload) => emit('toast', payload));
  }

  const browser = {
    native,
    async setVisible(visible) {
      if (plugin && plugin.setBrowserVisible) await plugin.setBrowserVisible({ visible: !!visible });
    },
    async setFrame(rect) {
      if (plugin && plugin.setBrowserFrame) await plugin.setBrowserFrame(rect || {});
    },
    async load(url) {
      if (plugin && plugin.loadUrl) return plugin.loadUrl({ url });
      return { ok: false, preview: true };
    },
    async back() {
      if (plugin && plugin.goBack) return plugin.goBack();
      return { ok: false };
    },
    async forward() {
      if (plugin && plugin.goForward) return plugin.goForward();
      return { ok: false };
    },
    async reload() {
      if (plugin && plugin.reload) return plugin.reload();
      return { ok: false };
    },
    async state() {
      if (plugin && plugin.browserState) return plugin.browserState();
      return { native: false };
    },
  };

  window.erdos = {
    __provider: native ? 'capacitor' : 'web',
    browser,
    getSystemInfo: () => Promise.resolve({
      platform: native ? 'ios' : 'web',
      arch: 'iphone',
      version: Logic.APP_VERSION,
      hostname: 'erdos-iphone',
      home: 'On this phone',
      cpus: navigator.hardwareConcurrency || 1,
      memoryGB: null,
      freememGB: null,
      uptime: Math.floor(performance.now() / 1000),
      isPackaged: native,
    }),
    getProgress: () => Promise.resolve(readJSON('erdos-iphone-progress', null)),
    setProgress: (data) => Promise.resolve(writeJSON('erdos-iphone-progress', data)),
    listDir: (target) => {
      if (plugin && plugin.listDir) return plugin.listDir({ path: target || '' });
      return Promise.resolve(listDir(target));
    },
    readFile: (target) => {
      if (plugin && plugin.readFile) return plugin.readFile({ path: target }).then((res) => res.text || res);
      return Promise.resolve(readFile(target));
    },
    writeFile: (target, content) => {
      if (plugin && plugin.writeFile) return plugin.writeFile({ path: target, content: String(content) });
      return Promise.resolve(writeFile(target, content));
    },
    createFolder: (target) => {
      if (plugin && plugin.createFolder) return plugin.createFolder({ path: target });
      return Promise.resolve(createFolder(target));
    },
    deletePath: (target) => {
      if (plugin && plugin.deletePath) return plugin.deletePath({ path: target });
      return Promise.resolve(deletePath(target));
    },
    openExternal: (url) => {
      if (typeof url === 'string' && /^https?:/i.test(url)) window.open(url, '_blank', 'noopener,noreferrer');
      return Promise.resolve();
    },
    pickOpenPath: () => {
      if (plugin && plugin.pickOpenPath) return plugin.pickOpenPath();
      return Promise.reject(new Error('The Files app is available on iPhone.'));
    },
    pickSavePath: () => Promise.reject(new Error('Save uses the name in Notes and Files.')),
    checkUpdates: () => Promise.resolve({ status: 'web', message: 'Install updates from TestFlight or the App Store.' }),
    downloadUpdate: () => Promise.resolve({ ok: false }),
    installUpdate: () => Promise.resolve({ ok: false }),
    onUpdateStatus: () => () => {},
    getBrowserDownloads: () => Promise.resolve([]),
    clearBrowserDownloads: () => Promise.resolve([]),
    openBrowserDownload: () => Promise.reject(new Error('Downloads open from the Files app later.')),
    onBrowserDownload: () => () => {},
    blok: {
      settings: () => Promise.resolve(settings()),
      setSettings: (partial) => {
        const next = setSettings(partial);
        pushNativeConfig();
        return Promise.resolve(next);
      },
      site: (host) => Promise.resolve(sitePrefs(host)),
      setSite: (host, partial) => {
        const next = setSite(host, partial);
        pushNativeConfig();
        return Promise.resolve(next);
      },
      counts: async () => {
        if (plugin && plugin.getBlokState) {
          try {
            const state = await plugin.getBlokState();
            if (state && state.counts) return state.counts;
          } catch (_) { /* use local */ }
        }
        return counts();
      },
      bump: (kind) => Promise.resolve(bump(kind)),
      configFor: (host) => {
        const site = sitePrefs(host);
        const prefs = settings();
        return {
          ads: site.ads !== false,
          ai: site.ai !== false,
          visual: prefs.visual !== false,
          textDetection: prefs.textDetection !== false,
          textThreshold: prefs.textThreshold,
          minWords: prefs.minWords,
        };
      },
      detectText: (text) => {
        const result = Logic.mockDetectText(text);
        const hash = Logic.hashText(text);
        return Promise.resolve(Object.assign({ hash, remembered: verdict(hash) }, result));
      },
      detect: (kind) => Promise.resolve(Logic.detectorStub(kind)),
      learning: async () => {
        if (plugin && plugin.getLearning) {
          try { return await plugin.getLearning(); } catch (_) { /* local */ }
        }
        return adapterView();
      },
      saveFeedback: async (input) => {
        if (plugin && plugin.saveFeedback) {
          try { return await plugin.saveFeedback(input); } catch (_) { /* local */ }
        }
        return saveFeedback(input);
      },
      undoFeedback: async (id) => {
        if (plugin && plugin.undoFeedback) {
          try { return await plugin.undoFeedback({ id }); } catch (_) { /* local */ }
        }
        return undoFeedback(id);
      },
      verdict: (hash) => verdict(hash),
      setShareChoice: async (choice) => {
        if (plugin && plugin.setShareChoice) {
          try { await plugin.setShareChoice({ choice }); } catch (_) { /* local */ }
        }
        return setShareChoice(choice);
      },
      reviewShare: async (id, approve) => {
        if (plugin && plugin.reviewShare) {
          try { return await plugin.reviewShare({ id, approve: !!approve }); } catch (_) { /* local */ }
        }
        return reviewShare(id, approve);
      },
      clearLearning: async (scope) => {
        if (plugin && plugin.clearLearning) {
          try { return await plugin.clearLearning({ scope: scope || 'all' }); } catch (_) { /* local */ }
        }
        return clearLearning(scope);
      },
      disabledHosts,
    },
    on: (fn) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    setStatusBar: async (mode) => {
      const cap = window.Capacitor;
      if (!cap || !cap.isNativePlatform || !cap.isNativePlatform()) return;
      try {
        const StatusBar = cap.registerPlugin('StatusBar');
        await StatusBar.setOverlaysWebView({ overlay: true });
        await StatusBar.setStyle({ style: mode === 'light-text' ? 'DARK' : 'LIGHT' });
      } catch (_) { /* status bar plugin missing */ }
    },
  };

  pushNativeConfig();
})();
