/* global erdos */
/**
 * ErdOS Browser — Chromium webviews with ErdOS chrome.
 * Custom erdos:// pages and ErdOS Search (Wikipedia + local). No DuckDuckGo.
 */
const ErdOSBrowser = (() => {
  const STORAGE_KEY = 'erdos-browser';
  const PARTITION = 'persist:erdos-browser';
  const MAX_HISTORY = 400;
  const HOME = 'erdos://home';

  const PAGE_CSS = `
    :root{color-scheme:dark;--bg:#031018;--text:#e6f7f4;--muted:#8aa8a2;--accent:#7dffc8;--line:rgba(255,255,255,.1);--card:rgba(255,255,255,.04)}
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;font-family:Outfit,system-ui,sans-serif;background:
      radial-gradient(ellipse at 28% 12%,rgba(47,224,184,.16),transparent 42%),
      radial-gradient(ellipse at 82% 78%,rgba(58,180,216,.12),transparent 40%),var(--bg);color:var(--text)}
    main{max-width:44rem;margin:0 auto;padding:48px 24px 64px}
    h1{margin:0;font-size:2.4rem;letter-spacing:-.04em;color:var(--accent)}
    h2{margin:28px 0 12px;font-size:1rem;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}
    p{margin:10px 0 0;color:var(--muted);line-height:1.55}
    .brand{font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
    .hero{text-align:center;padding:24px 0 8px}
    .hero h1{font-size:3rem}
    .links{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:28px}
    a.chip{display:inline-flex;align-items:center;gap:6px;padding:10px 16px;border-radius:12px;border:1px solid var(--line);
      background:var(--card);color:var(--text);text-decoration:none;font-size:.92rem}
    a.chip:hover{border-color:rgba(125,255,200,.45);color:var(--accent)}
    .list{list-style:none;margin:0;padding:0;display:grid;gap:8px}
    .list a,.row{display:flex;flex-direction:column;gap:4px;padding:12px 14px;border-radius:12px;border:1px solid var(--line);
      background:var(--card);color:var(--text);text-decoration:none}
    .list a:hover,.row:hover{border-color:rgba(125,255,200,.35)}
    .list .t{font-weight:600;font-size:.95rem}
    .list .u,.meta{font-size:.78rem;color:var(--muted);word-break:break-all;font-family:ui-monospace,monospace}
    .empty{padding:24px;text-align:center;color:var(--muted);border:1px dashed var(--line);border-radius:14px}
    .q{font-size:1.15rem;color:var(--text);margin-top:4px}
    .src{font-size:.7rem;letter-spacing:.06em;text-transform:uppercase;color:var(--accent);opacity:.85}
  `;

  function loadStore() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return {
        bookmarks: Array.isArray(raw.bookmarks) ? raw.bookmarks : [],
        history: Array.isArray(raw.history) ? raw.history : [],
      };
    } catch {
      return { bookmarks: [], history: [] };
    }
  }

  function saveStore(store) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      bookmarks: store.bookmarks.slice(0, 200),
      history: store.history.slice(0, MAX_HISTORY),
    }));
  }

  function escapeHtml(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function dataPage(title, bodyHtml) {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
      <style>${PAGE_CSS}</style></head><body>${bodyHtml}</body></html>`;
    return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
  }

  function parseErdosUrl(url) {
    if (!url || typeof url !== 'string') return null;
    if (!url.startsWith('erdos://') && !url.startsWith('erdos:')) return null;
    try {
      // erdos://home → http://erdos.local/home (path in pathname, not hostname)
      const normalized = url
        .replace(/^erdos:\/\//i, 'http://erdos.local/')
        .replace(/^erdos:/i, 'http://erdos.local/');
      const u = new URL(normalized);
      const path = (u.pathname.replace(/^\/+/, '') || 'home').replace(/\/+$/, '') || 'home';
      return { path, query: u.searchParams };
    } catch {
      const rest = url.replace(/^erdos:\/\//i, '').replace(/^erdos:/i, '');
      const [pathPart, qs] = rest.split('?');
      const query = new URLSearchParams(qs || '');
      return { path: (pathPart || 'home').replace(/\/$/, '') || 'home', query };
    }
  }

  function isWebUrl(url) {
    return /^https?:\/\//i.test(url) || url.startsWith('about:') || url.startsWith('data:');
  }

  function looksLikeUrl(input) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(input)) return true;
    if (input.includes(' ') || !input.includes('.')) return false;
    if (/^(localhost|(\d{1,3}\.){3}\d{1,3})(:\d+)?(\/|$)/i.test(input)) return true;
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(input);
  }

  function displayUrl(url) {
    if (!url || url.startsWith('data:')) return '';
    return url;
  }

  function faviconLetter(title, url) {
    const t = (title || url || '?').trim();
    return (t[0] || '?').toUpperCase();
  }

  function mount(body) {
    const store = loadStore();
    const root = document.createElement('div');
    root.className = 'app-root browser-app';

    const tabsEl = document.createElement('div');
    tabsEl.className = 'browser-tabs';
    const tabList = document.createElement('div');
    tabList.className = 'browser-tab-list';
    const newTabBtn = document.createElement('button');
    newTabBtn.type = 'button';
    newTabBtn.className = 'browser-tab-new';
    newTabBtn.title = 'New tab';
    newTabBtn.textContent = '+';
    tabsEl.append(tabList, newTabBtn);

    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.className = 'browser-url';
    urlInput.placeholder = 'Search ErdOS or enter address';
    urlInput.spellcheck = false;
    urlInput.autocomplete = 'off';

    const loading = document.createElement('div');
    loading.className = 'browser-loading';

    const frames = document.createElement('div');
    frames.className = 'browser-frames app-content flush';

    const backBtn = iconBtn('←', 'Back');
    const fwdBtn = iconBtn('→', 'Forward');
    const reloadBtn = iconBtn('↻', 'Reload');
    const homeBtn = iconBtn('⌂', 'Home');
    const starBtn = iconBtn('☆', 'Bookmark');
    const menuBtn = iconBtn('☰', 'Menu');

    const bar = document.createElement('div');
    bar.className = 'browser-bar';
    const goBtn = document.createElement('button');
    goBtn.type = 'button';
    goBtn.className = 'app-btn';
    goBtn.textContent = 'Go';
    bar.append(backBtn, fwdBtn, reloadBtn, homeBtn, urlInput, goBtn, starBtn, menuBtn);

    const menu = document.createElement('div');
    menu.className = 'browser-menu';
    menu.hidden = true;
    menu.append(
      menuItem('Bookmarks', () => { closeMenu(); navigateActive(HOME.replace('home', 'bookmarks')); }),
      menuItem('History', () => { closeMenu(); navigateActive('erdos://history'); }),
      menuItem('Downloads', () => { closeMenu(); navigateActive('erdos://downloads'); }),
      menuItem('New tab', () => { closeMenu(); createTab(HOME); }),
    );

    root.append(tabsEl, bar, loading, frames, menu);
    body.append(root);

    /** @type {{ id:string, title:string, url:string, webview:HTMLElement, tabEl:HTMLElement }[]} */
    const tabs = [];
    let activeId = null;
    let idSeq = 0;

    function iconBtn(label, title) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'browser-icon-btn';
      b.title = title;
      b.textContent = label;
      return b;
    }

    function menuItem(label, onClick) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'browser-menu-item';
      b.textContent = label;
      b.addEventListener('click', onClick);
      return b;
    }

    function closeMenu() {
      menu.hidden = true;
    }

    function toggleMenu() {
      menu.hidden = !menu.hidden;
    }

    function activeTab() {
      return tabs.find((t) => t.id === activeId) || null;
    }

    function setLoading(on) {
      loading.classList.toggle('is-on', !!on);
    }

    function updateChrome() {
      const tab = activeTab();
      if (!tab) return;
      urlInput.value = displayUrl(tab.url) || (tab.url.startsWith('data:') ? '' : tab.url);
      const bookmarked = store.bookmarks.some((b) => b.url === tab.url);
      starBtn.textContent = bookmarked ? '★' : '☆';
      starBtn.title = bookmarked ? 'Remove bookmark' : 'Bookmark';
      starBtn.classList.toggle('is-on', bookmarked);
      try {
        backBtn.disabled = !tab.webview.canGoBack();
        fwdBtn.disabled = !tab.webview.canGoForward();
      } catch {
        backBtn.disabled = false;
        fwdBtn.disabled = false;
      }
      if (body.__windowApi) {
        body.__windowApi.setTitle(tab.title ? `Browser — ${tab.title}` : 'Browser');
      }
      tabs.forEach((t) => {
        t.tabEl.classList.toggle('is-active', t.id === activeId);
        t.webview.classList.toggle('is-active', t.id === activeId);
        const label = t.tabEl.querySelector('.browser-tab-label');
        if (label) label.textContent = t.title || 'New Tab';
        const fav = t.tabEl.querySelector('.browser-tab-favicon');
        if (fav) fav.textContent = faviconLetter(t.title, t.url);
      });
    }

    function pushHistory(title, url) {
      if (!url || url.startsWith('data:') || url.startsWith('erdos://')) return;
      if (!/^https?:\/\//i.test(url)) return;
      store.history = store.history.filter((h) => h.url !== url);
      store.history.unshift({ title: title || url, url, visitedAt: Date.now() });
      if (store.history.length > MAX_HISTORY) store.history.length = MAX_HISTORY;
      saveStore(store);
    }

    function toggleBookmark() {
      const tab = activeTab();
      if (!tab || !tab.url || tab.url.startsWith('data:')) return;
      const url = tab.url.startsWith('erdos://') ? tab.url : tab.url;
      if (!/^https?:\/\//i.test(url) && !url.startsWith('erdos://')) return;
      const idx = store.bookmarks.findIndex((b) => b.url === url);
      if (idx >= 0) store.bookmarks.splice(idx, 1);
      else store.bookmarks.unshift({ title: tab.title || url, url, createdAt: Date.now() });
      saveStore(store);
      updateChrome();
    }

    async function buildInternalPage(erdosUrl) {
      const parsed = parseErdosUrl(erdosUrl);
      if (!parsed) return null;
      const path = parsed.path.replace(/^\/+/, '') || 'home';

      if (path === 'home' || path === '') {
        const recent = store.history.slice(0, 6);
        const recentHtml = recent.length
          ? `<h2>Recent</h2><ul class="list">${recent.map((h) =>
              `<li><a href="${escapeHtml(h.url)}"><span class="t">${escapeHtml(h.title)}</span><span class="u">${escapeHtml(h.url)}</span></a></li>`
            ).join('')}</ul>`
          : '';
        return {
          title: 'ErdOS',
          display: HOME,
          src: dataPage('ErdOS', `
            <main>
              <div class="hero">
                <div class="brand">ErdOS Browser</div>
                <h1>ErdOS</h1>
                <p>Type a URL or search above. Results come from ErdOS Search — your history, bookmarks, and Wikipedia. No third-party search engine.</p>
                <div class="links">
                  <a class="chip" href="erdos://bookmarks">Bookmarks</a>
                  <a class="chip" href="erdos://history">History</a>
                  <a class="chip" href="erdos://downloads">Downloads</a>
                </div>
              </div>
              ${recentHtml}
            </main>`),
        };
      }

      if (path === 'search') {
        const q = (parsed.query.get('q') || '').trim();
        const results = await runSearch(q);
        const list = results.length
          ? `<ul class="list">${results.map((r) =>
              `<li><a href="${escapeHtml(r.url)}"><span class="src">${escapeHtml(r.source)}</span><span class="t">${escapeHtml(r.title)}</span><span class="u">${escapeHtml(r.url)}</span>${r.snippet ? `<span class="meta">${escapeHtml(r.snippet)}</span>` : ''}</a></li>`
            ).join('')}</ul>`
          : `<div class="empty">${q ? 'No results. Try another query or a full URL.' : 'Enter a search query in the address bar.'}</div>`;
        return {
          title: q ? `Search — ${q}` : 'Search',
          display: `erdos://search?q=${encodeURIComponent(q)}`,
          src: dataPage('ErdOS Search', `
            <main>
              <div class="brand">ErdOS Search</div>
              <h1>Results</h1>
              <p class="q">${escapeHtml(q || '—')}</p>
              <h2>Matches</h2>
              ${list}
            </main>`),
        };
      }

      if (path === 'bookmarks') {
        const list = store.bookmarks.length
          ? `<ul class="list">${store.bookmarks.map((b) =>
              `<li><a href="${escapeHtml(b.url)}"><span class="t">${escapeHtml(b.title)}</span><span class="u">${escapeHtml(b.url)}</span></a></li>`
            ).join('')}</ul>`
          : '<div class="empty">No bookmarks yet. Tap ★ in the toolbar on any page.</div>';
        return {
          title: 'Bookmarks',
          display: 'erdos://bookmarks',
          src: dataPage('Bookmarks', `<main><div class="brand">ErdOS Browser</div><h1>Bookmarks</h1><p>Saved pages on this device.</p><h2>All</h2>${list}</main>`),
        };
      }

      if (path === 'history') {
        const list = store.history.length
          ? `<ul class="list">${store.history.slice(0, 100).map((h) =>
              `<li><a href="${escapeHtml(h.url)}"><span class="t">${escapeHtml(h.title)}</span><span class="u">${escapeHtml(h.url)}</span></a></li>`
            ).join('')}</ul>`
          : '<div class="empty">History is empty. Visited sites will appear here.</div>';
        return {
          title: 'History',
          display: 'erdos://history',
          src: dataPage('History', `<main><div class="brand">ErdOS Browser</div><h1>History</h1><p>Pages you’ve opened in ErdOS Browser.</p><h2>Recent</h2>${list}</main>`),
        };
      }

      if (path === 'downloads') {
        let downloads = [];
        try {
          if (window.erdos?.getBrowserDownloads) downloads = await window.erdos.getBrowserDownloads();
        } catch (_) { /* browser mode */ }
        const list = downloads.length
          ? `<ul class="list">${downloads.map((d) =>
              `<li class="row"><span class="t">${escapeHtml(d.filename || d.url)}</span><span class="u">${escapeHtml(d.savePath || d.url)}</span><span class="meta">${escapeHtml(d.state)}${d.receivedBytes != null ? ` · ${formatBytes(d.receivedBytes)}${d.totalBytes ? ` / ${formatBytes(d.totalBytes)}` : ''}` : ''}</span></li>`
            ).join('')}</ul>`
          : '<div class="empty">No downloads yet. Files save to your ErdOS Downloads folder.</div>';
        return {
          title: 'Downloads',
          display: 'erdos://downloads',
          src: dataPage('Downloads', `<main><div class="brand">ErdOS Browser</div><h1>Downloads</h1><p>Files fetched by ErdOS Browser.</p><h2>Recent</h2>${list}</main>`),
        };
      }

      return {
        title: 'Not found',
        display: erdosUrl,
        src: dataPage('Not found', `<main><h1>Unknown page</h1><p>${escapeHtml(erdosUrl)} isn’t a built-in ErdOS page.</p><div class="links"><a class="chip" href="erdos://home">Home</a></div></main>`),
      };
    }

    function formatBytes(n) {
      if (n == null || Number.isNaN(n)) return '';
      if (n < 1024) return `${n} B`;
      if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
      if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
      return `${(n / 1024 ** 3).toFixed(2)} GB`;
    }

    async function runSearch(q) {
      const query = (q || '').trim();
      if (!query) return [];
      const lower = query.toLowerCase();
      const out = [];
      const seen = new Set();

      const add = (item) => {
        if (!item?.url || seen.has(item.url)) return;
        seen.add(item.url);
        out.push(item);
      };

      for (const b of store.bookmarks) {
        if (b.title.toLowerCase().includes(lower) || b.url.toLowerCase().includes(lower)) {
          add({ title: b.title, url: b.url, source: 'Bookmark', snippet: '' });
        }
      }
      for (const h of store.history) {
        if (h.title.toLowerCase().includes(lower) || h.url.toLowerCase().includes(lower)) {
          add({ title: h.title, url: h.url, source: 'History', snippet: '' });
        }
      }

      try {
        const api = `https://en.wikipedia.org/w/api.php?action=opensearch&limit=8&namespace=0&format=json&origin=*&search=${encodeURIComponent(query)}`;
        const res = await fetch(api);
        if (res.ok) {
          const data = await res.json();
          const titles = data[1] || [];
          const descs = data[2] || [];
          const urls = data[3] || [];
          for (let i = 0; i < titles.length; i++) {
            add({
              title: titles[i],
              url: urls[i],
              source: 'Wikipedia',
              snippet: descs[i] || '',
            });
          }
        }
      } catch (_) { /* offline / blocked */ }

      if (!out.length && looksLikeUrl(query)) {
        const url = /^https?:\/\//i.test(query) ? query : `https://${query}`;
        add({ title: url, url, source: 'Open URL', snippet: 'Visit this address directly' });
      }

      return out;
    }

    async function resolveNavigation(raw) {
      let input = (raw ?? '').trim();
      if (!input) return { display: HOME, ...(await buildInternalPage(HOME)) };

      const erdos = parseErdosUrl(input);
      if (erdos || input.startsWith('erdos:')) {
        const page = await buildInternalPage(input.startsWith('erdos:') ? input : `erdos://${input}`);
        return page;
      }

      if (isWebUrl(input)) {
        return { title: input, display: input, src: input };
      }

      if (looksLikeUrl(input)) {
        const url = `https://${input}`;
        return { title: url, display: url, src: url };
      }

      const searchUrl = `erdos://search?q=${encodeURIComponent(input)}`;
      return buildInternalPage(searchUrl);
    }

    async function navigateTab(tab, raw, { fromOmnibox = false } = {}) {
      setLoading(true);
      try {
        const target = await resolveNavigation(raw);
        if (!target) return;
        tab.url = target.display || target.src;
        tab.title = target.title || 'New Tab';
        if (fromOmnibox) urlInput.value = displayUrl(tab.url);
        tab.webview.setAttribute('src', target.src);
        updateChrome();
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    }

    function navigateActive(raw) {
      const tab = activeTab();
      if (tab) navigateTab(tab, raw, { fromOmnibox: true });
    }

    function attachWebview(tab) {
      const wv = tab.webview;
      wv.setAttribute('partition', PARTITION);
      wv.setAttribute('allowpopups', 'true');
      wv.classList.add('browser-frame');

      const onNav = (e) => {
        const url = e.url || '';
        if (!url || url.startsWith('data:')) {
          // keep erdos display url
        } else if (url.startsWith('erdos:')) {
          e.preventDefault?.();
          navigateTab(tab, url);
          return;
        } else {
          tab.url = url;
        }
        setLoading(false);
        if (tab.id === activeId) updateChrome();
      };

      wv.addEventListener('did-start-loading', () => {
        if (tab.id === activeId) setLoading(true);
      });
      wv.addEventListener('did-stop-loading', () => {
        if (tab.id === activeId) setLoading(false);
        updateChrome();
      });
      wv.addEventListener('did-navigate', (e) => {
        if (e.url && !e.url.startsWith('data:')) {
          tab.url = e.url;
          pushHistory(tab.title, e.url);
        }
        onNav(e);
      });
      wv.addEventListener('did-navigate-in-page', (e) => {
        if (e.url && !e.url.startsWith('data:')) tab.url = e.url;
        if (tab.id === activeId) updateChrome();
      });
      wv.addEventListener('page-title-updated', (e) => {
        if (e.title) {
          tab.title = e.title;
          if (tab.url && !tab.url.startsWith('data:') && !tab.url.startsWith('erdos://')) {
            pushHistory(e.title, tab.url);
          }
        }
        updateChrome();
      });
      wv.addEventListener('did-fail-load', (e) => {
        if (e.errorCode === -3) return; // aborted
        setLoading(false);
        if (e.validatedURL?.startsWith('erdos:')) {
          navigateTab(tab, e.validatedURL);
        }
      });

      wv.addEventListener('will-navigate', (e) => {
        if (e.url?.startsWith('erdos:')) {
          e.preventDefault();
          navigateTab(tab, e.url);
        }
      });
      wv.addEventListener('did-start-navigation', (e) => {
        const url = e.url || e.detail?.url;
        if (url?.startsWith('erdos:')) {
          try { wv.stop(); } catch (_) { /* */ }
          navigateTab(tab, url);
        }
      });

      wv.addEventListener('new-window', (e) => {
        const url = e.url;
        if (!url) return;
        e.preventDefault?.();
        createTab(url);
      });
    }

    function createTab(initialUrl = HOME, { activate = true } = {}) {
      const id = `t${++idSeq}`;
      const tabEl = document.createElement('button');
      tabEl.type = 'button';
      tabEl.className = 'browser-tab';
      tabEl.innerHTML = `<span class="browser-tab-favicon">${faviconLetter('New Tab')}</span><span class="browser-tab-label">New Tab</span>`;
      const close = document.createElement('span');
      close.className = 'browser-tab-close';
      close.title = 'Close tab';
      close.textContent = '×';
      tabEl.append(close);

      const webview = document.createElement('webview');
      webview.className = 'browser-frame';

      const tab = { id, title: 'New Tab', url: HOME, webview, tabEl };
      tabs.push(tab);
      tabList.append(tabEl);
      frames.append(webview);
      attachWebview(tab);

      tabEl.addEventListener('click', (e) => {
        if (e.target === close || close.contains(e.target)) {
          e.stopPropagation();
          closeTab(id);
          return;
        }
        activateTab(id);
      });

      if (activate) activateTab(id);
      navigateTab(tab, initialUrl);
      return tab;
    }

    function activateTab(id) {
      activeId = id;
      updateChrome();
      const tab = activeTab();
      if (tab) setTimeout(() => urlInput.focus(), 20);
    }

    function closeTab(id) {
      const idx = tabs.findIndex((t) => t.id === id);
      if (idx < 0) return;
      const [tab] = tabs.splice(idx, 1);
      tab.tabEl.remove();
      try { tab.webview.remove(); } catch (_) { /* */ }
      if (!tabs.length) {
        createTab(HOME);
        return;
      }
      if (activeId === id) {
        const next = tabs[Math.max(0, idx - 1)] || tabs[0];
        activateTab(next.id);
      }
    }

    // Toolbar
    backBtn.addEventListener('click', () => {
      const tab = activeTab();
      try { tab?.webview.goBack(); } catch (_) { /* */ }
    });
    fwdBtn.addEventListener('click', () => {
      const tab = activeTab();
      try { tab?.webview.goForward(); } catch (_) { /* */ }
    });
    reloadBtn.addEventListener('click', () => {
      const tab = activeTab();
      if (!tab) return;
      if (tab.url?.startsWith('erdos://')) navigateTab(tab, tab.url);
      else {
        try { tab.webview.reload(); } catch (_) { tab.webview.src = tab.webview.src; }
      }
    });
    homeBtn.addEventListener('click', () => navigateActive(HOME));
    starBtn.addEventListener('click', toggleBookmark);
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });
    goBtn.addEventListener('click', () => navigateActive(urlInput.value));
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        navigateActive(urlInput.value);
      }
    });
    newTabBtn.addEventListener('click', () => createTab(HOME));
    root.addEventListener('click', () => closeMenu());
    menu.addEventListener('click', (e) => e.stopPropagation());

    // Download updates → refresh downloads page if open
    let unsubDownloads = null;
    if (window.erdos?.onBrowserDownload) {
      unsubDownloads = window.erdos.onBrowserDownload(() => {
        const tab = activeTab();
        if (tab?.url?.startsWith('erdos://downloads')) navigateTab(tab, 'erdos://downloads');
      });
    }

    createTab(HOME);
    setTimeout(() => urlInput.focus(), 40);

    // Cleanup hook if window closes
    body.__browserCleanup = () => {
      try { unsubDownloads?.(); } catch (_) { /* */ }
    };
  }

  return { mount };
})();
