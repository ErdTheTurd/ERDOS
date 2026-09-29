/* global erdos */
/**
 * ErdOS Browser — Chromium webviews with ErdOS chrome.
 * ErdOS Search: local library + encyclopedia + explore routes. No search-engine SERP.
 */
const ErdOSBrowser = (() => {
  const STORAGE_KEY = 'erdos-browser';
  const PARTITION = 'persist:erdos-browser';
  const MAX_HISTORY = 400;
  const HOME = 'erdos://home';

  const BANGS = {
    w: (q) => `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}`,
    wiki: (q) => `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(q)}`,
    gh: (q) => `https://github.com/search?q=${encodeURIComponent(q)}&type=repositories`,
    github: (q) => `https://github.com/search?q=${encodeURIComponent(q)}&type=repositories`,
    mdn: (q) => `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(q)}`,
    yt: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
    youtube: (q) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`,
    r: (q) => `https://www.reddit.com/search/?q=${encodeURIComponent(q)}`,
    reddit: (q) => `https://www.reddit.com/search/?q=${encodeURIComponent(q)}`,
    so: (q) => `https://stackoverflow.com/search?q=${encodeURIComponent(q)}`,
    maps: (q) => `https://www.openstreetmap.org/search?query=${encodeURIComponent(q)}`,
    ol: (q) => `https://openlibrary.org/search?q=${encodeURIComponent(q)}`,
    archive: (q) => `https://archive.org/search?query=${encodeURIComponent(q)}`,
  };

  const PAGE_CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Sora:wght@400;500;600;700&display=swap');
    :root{
      color-scheme:light;
      --ink:#171b24;--fog:#f7f8fb;--mute:#5c6578;--line:rgba(23,27,36,.1);
      --glow:rgba(88,140,230,.16);--mint:#1f9d86;--surface:rgba(23,27,36,.035);
      --font:"Sora",system-ui,sans-serif;--display:"Instrument Serif",Georgia,serif;
    }
    *{box-sizing:border-box}
    html,body{margin:0;min-height:100%}
    body{
      font-family:var(--font);color:var(--ink);
      background:
        radial-gradient(ellipse 90% 55% at 50% -8%,var(--glow),transparent 55%),
        radial-gradient(ellipse 45% 35% at 100% 100%,rgba(31,157,134,.08),transparent 50%),
        linear-gradient(180deg,#ffffff 0%,#f4f6fa 52%,#eef1f6 100%);
      animation:rise .7s cubic-bezier(.22,1,.36,1) both;
    }
    @keyframes rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
    @keyframes softIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
    main{width:min(44rem,100%);margin:0 auto;padding:clamp(40px,10vh,88px) 28px 72px}
    .hero{text-align:center;padding:12px 0 8px}
    .brand{
      font-family:var(--display);font-style:italic;font-size:clamp(3.4rem,9vw,5.2rem);
      line-height:.92;letter-spacing:-.03em;margin:0;color:var(--ink);
    }
    .lede{margin:18px auto 0;max-width:30rem;font-size:1.02rem;line-height:1.55;color:var(--mute);font-weight:400}
    .nav{display:flex;justify-content:center;gap:28px;margin-top:36px;flex-wrap:wrap}
    .nav a{
      color:var(--ink);text-decoration:none;font-size:.84rem;font-weight:500;
      letter-spacing:.02em;border-bottom:1px solid transparent;padding-bottom:2px;
      transition:color .2s ease,border-color .2s ease;
    }
    .nav a:hover{color:var(--mint);border-color:rgba(31,157,134,.55)}
    .section{margin-top:40px;animation:softIn .6s .12s both}
    .section h2{
      margin:0 0 16px;font-size:.72rem;font-weight:600;letter-spacing:.16em;
      text-transform:uppercase;color:var(--mute);
    }
    .list{list-style:none;margin:0;padding:0;display:grid;gap:0}
    .list a,.row{
      display:grid;gap:4px;padding:16px 4px;text-decoration:none;color:inherit;
      border-bottom:1px solid var(--line);transition:background .2s ease,padding-left .2s ease;
    }
    .list a:hover,.row:hover{background:var(--surface);padding-left:10px;border-radius:10px}
    .list .t{font-size:1rem;font-weight:500;color:var(--ink)}
    .list .u,.meta{font-size:.78rem;color:var(--mute);word-break:break-all}
    .src{font-size:.68rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:var(--mint)}
    .page-head{margin-bottom:28px}
    .page-head .kicker{font-size:.72rem;letter-spacing:.14em;text-transform:uppercase;color:var(--mute);margin:0 0 10px}
    .page-head h1{
      margin:0;font-family:var(--display);font-size:clamp(2.4rem,6vw,3.4rem);
      font-weight:400;letter-spacing:-.02em;color:var(--ink);line-height:1.05;
    }
    .page-head .q,.page-head p{margin:12px 0 0;color:var(--mute);line-height:1.5;font-size:1rem}
    .empty{
      padding:36px 20px;text-align:center;color:var(--mute);border:1px solid var(--line);
      border-radius:18px;background:rgba(255,255,255,.7);
    }
    .answer{
      display:block;text-decoration:none;color:inherit;padding:22px 22px 20px;
      border-radius:18px;border:1px solid rgba(88,140,230,.22);
      background:linear-gradient(160deg,rgba(88,140,230,.1),rgba(255,255,255,.85) 55%);
      box-shadow:0 10px 30px rgba(23,27,36,.05);transition:transform .2s ease,box-shadow .2s ease;
    }
    .answer:hover{transform:translateY(-1px);box-shadow:0 14px 34px rgba(23,27,36,.08)}
    .answer .src{color:#3b6fbf}
    .answer .t{font-family:var(--display);font-size:1.55rem;letter-spacing:-.02em;margin-top:6px;color:var(--ink)}
    .answer .meta{margin-top:10px;font-size:.95rem;line-height:1.55;color:#3d4658;word-break:normal}
    .answer .u{margin-top:12px}
    .explore{display:flex;flex-wrap:wrap;gap:10px}
    .explore a{
      display:inline-flex;align-items:center;gap:8px;padding:10px 14px;border-radius:999px;
      border:1px solid var(--line);background:#fff;color:var(--ink);text-decoration:none;
      font-size:.84rem;font-weight:500;transition:border-color .2s ease,color .2s ease,background .2s ease;
    }
    .explore a:hover{border-color:rgba(31,157,134,.45);color:var(--mint);background:rgba(31,157,134,.05)}
    .tip{margin-top:28px;font-size:.8rem;color:var(--mute);line-height:1.5}
    .tip code{font-family:ui-monospace,monospace;font-size:.78rem;background:rgba(23,27,36,.05);padding:2px 6px;border-radius:6px}
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
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>${escapeHtml(title)}</title><style>${PAGE_CSS}</style></head><body>${bodyHtml}</body></html>`;
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
    const ICO = {
      back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      fwd: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      reload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 12a7.5 7.5 0 0112.7-5.4M19.5 12a7.5 7.5 0 01-12.7 5.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M17 3.5v4h-4M7 20.5v-4h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 11.5L12 5l7.5 6.5V20a1 1 0 01-1 1h-4.5v-5h-4v5H5.5a1 1 0 01-1-1v-8.5z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
      star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="star-path" d="M12 3.8l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.2 7.2 18.7l.9-5.4L4.2 9.5l5.4-.8L12 3.8z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
      menu: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12M6 12h12M6 16h12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
      go: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
    };

    const root = document.createElement('div');
    root.className = 'app-root browser-app';

    const chrome = document.createElement('div');
    chrome.className = 'browser-chrome';

    const tabsEl = document.createElement('div');
    tabsEl.className = 'browser-tabs';
    const tabList = document.createElement('div');
    tabList.className = 'browser-tab-list';
    const newTabBtn = document.createElement('button');
    newTabBtn.type = 'button';
    newTabBtn.className = 'browser-tab-new';
    newTabBtn.title = 'New tab';
    newTabBtn.innerHTML = ICO.plus;
    tabsEl.append(tabList, newTabBtn);

    const urlInput = document.createElement('input');
    urlInput.type = 'text';
    urlInput.className = 'browser-url';
    urlInput.placeholder = 'Search, URL, or !bang';
    urlInput.spellcheck = false;
    urlInput.autocomplete = 'off';

    const loading = document.createElement('div');
    loading.className = 'browser-loading';

    const frames = document.createElement('div');
    frames.className = 'browser-frames app-content flush';

    const backBtn = iconBtn(ICO.back, 'Back');
    const fwdBtn = iconBtn(ICO.fwd, 'Forward');
    const reloadBtn = iconBtn(ICO.reload, 'Reload');
    const homeBtn = iconBtn(ICO.home, 'Home');
    const starBtn = iconBtn(ICO.star, 'Bookmark');
    starBtn.classList.add('browser-star');
    const menuBtn = iconBtn(ICO.menu, 'Menu');
    const goBtn = iconBtn(ICO.go, 'Go');
    goBtn.classList.add('browser-go');

    const nav = document.createElement('div');
    nav.className = 'browser-nav';
    nav.append(backBtn, fwdBtn, reloadBtn, homeBtn);

    const omnibox = document.createElement('div');
    omnibox.className = 'browser-omnibox';
    omnibox.append(urlInput, goBtn);

    const actions = document.createElement('div');
    actions.className = 'browser-actions';
    actions.append(starBtn, menuBtn);

    const bar = document.createElement('div');
    bar.className = 'browser-bar';
    bar.append(nav, omnibox, actions);

    chrome.append(tabsEl, bar, loading);

    const menu = document.createElement('div');
    menu.className = 'browser-menu';
    menu.hidden = true;
    menu.append(
      menuItem('Bookmarks', () => { closeMenu(); navigateActive('erdos://bookmarks'); }),
      menuItem('History', () => { closeMenu(); navigateActive('erdos://history'); }),
      menuItem('Downloads', () => { closeMenu(); navigateActive('erdos://downloads'); }),
      menuItem('New tab', () => { closeMenu(); createTab(HOME); }),
    );

    root.append(chrome, frames, menu);
    body.append(root);

    /** @type {{ id:string, title:string, url:string, webview:HTMLElement, tabEl:HTMLElement, navSeq:number }[]} */
    const tabs = [];
    let activeId = null;
    let idSeq = 0;

    function iconBtn(svg, title) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'browser-icon-btn';
      b.title = title;
      b.innerHTML = svg;
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
          ? `<section class="section"><h2>Recent</h2><ul class="list">${recent.map((h) =>
              `<li><a href="${escapeHtml(h.url)}"><span class="t">${escapeHtml(h.title)}</span><span class="u">${escapeHtml(h.url)}</span></a></li>`
            ).join('')}</ul></section>`
          : '';
        return {
          title: 'ErdOS',
          display: HOME,
          src: dataPage('ErdOS', `
            <main>
              <div class="hero">
                <h1 class="brand">ErdOS</h1>
                <p class="lede">Search or enter an address above. ErdOS Search answers from your library, encyclopedias, and direct paths into the open web — not a search-engine results page.</p>
                <nav class="nav" aria-label="Quick links">
                  <a href="erdos://bookmarks">Bookmarks</a>
                  <a href="erdos://history">History</a>
                  <a href="erdos://downloads">Downloads</a>
                </nav>
              </div>
              ${recentHtml}
            </main>`),
        };
      }

      if (path === 'search') {
        const q = (parsed.query.get('q') || '').trim();
        const pack = await runSearch(q);
        const renderList = (items) => {
          if (!items.length) return '';
          return `<ul class="list">${items.map((r) =>
            `<li><a href="${escapeHtml(r.url)}"><span class="src">${escapeHtml(r.source)}</span><span class="t">${escapeHtml(r.title)}</span>${r.snippet ? `<span class="meta">${escapeHtml(r.snippet)}</span>` : ''}<span class="u">${escapeHtml(r.url)}</span></a></li>`
          ).join('')}</ul>`;
        };
        const answerHtml = pack.answer
          ? `<section class="section" style="margin-top:8px"><h2>Answer</h2>${
              pack.answer.url
                ? `<a class="answer" href="${escapeHtml(pack.answer.url)}">`
                : `<div class="answer">`
            }<span class="src">${escapeHtml(pack.answer.source)}</span><div class="t">${escapeHtml(pack.answer.title)}</div>${
              pack.answer.snippet ? `<div class="meta">${escapeHtml(pack.answer.snippet)}</div>` : ''
            }${pack.answer.url ? `<div class="u">${escapeHtml(pack.answer.url)}</div></a>` : '</div>'}</section>`
          : '';
        const libraryHtml = pack.library.length
          ? `<section class="section"><h2>Your library</h2>${renderList(pack.library)}</section>`
          : '';
        const knowledgeHtml = pack.knowledge.length
          ? `<section class="section"><h2>Knowledge</h2>${renderList(pack.knowledge)}</section>`
          : '';
        const exploreHtml = pack.explore.length
          ? `<section class="section"><h2>Explore</h2><div class="explore">${pack.explore.map((r) =>
              `<a href="${escapeHtml(r.url)}">${escapeHtml(r.title)}</a>`
            ).join('')}</div></section>`
          : '';
        const empty = !pack.answer && !pack.library.length && !pack.knowledge.length && !pack.explore.length;
        return {
          title: q ? `Search — ${q}` : 'Search',
          display: `erdos://search?q=${encodeURIComponent(q)}`,
          src: dataPage('ErdOS Search', `
            <main>
              <header class="page-head">
                <p class="kicker">ErdOS Search</p>
                <h1>Results</h1>
                <p class="q">${escapeHtml(q || '—')}</p>
              </header>
              ${answerHtml}
              ${libraryHtml}
              ${knowledgeHtml}
              ${exploreHtml}
              ${empty ? `<div class="empty">${q ? 'No matches yet. Try a bang like !gh or !yt, or enter a full URL.' : 'Enter a search query in the address bar.'}</div>` : ''}
              <p class="tip">Shortcuts: <code>!w</code> Wikipedia · <code>!gh</code> GitHub · <code>!mdn</code> MDN · <code>!yt</code> YouTube · <code>!r</code> Reddit · <code>!so</code> Stack Overflow · <code>!maps</code> OpenStreetMap</p>
            </main>`),
        };
      }

      if (path === 'bookmarks') {
        const list = store.bookmarks.length
          ? `<ul class="list">${store.bookmarks.map((b) =>
              `<li><a href="${escapeHtml(b.url)}"><span class="t">${escapeHtml(b.title)}</span><span class="u">${escapeHtml(b.url)}</span></a></li>`
            ).join('')}</ul>`
          : '<div class="empty">No bookmarks yet. Star any page from the toolbar.</div>';
        return {
          title: 'Bookmarks',
          display: 'erdos://bookmarks',
          src: dataPage('Bookmarks', `<main><header class="page-head"><p class="kicker">ErdOS Browser</p><h1>Bookmarks</h1><p>Saved pages on this device.</p></header><section class="section" style="margin-top:8px"><h2>All</h2>${list}</section></main>`),
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
          src: dataPage('History', `<main><header class="page-head"><p class="kicker">ErdOS Browser</p><h1>History</h1><p>Pages you’ve opened in ErdOS Browser.</p></header><section class="section" style="margin-top:8px"><h2>Recent</h2>${list}</section></main>`),
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
          src: dataPage('Downloads', `<main><header class="page-head"><p class="kicker">ErdOS Browser</p><h1>Downloads</h1><p>Files fetched by ErdOS Browser.</p></header><section class="section" style="margin-top:8px"><h2>Recent</h2>${list}</section></main>`),
        };
      }

      return {
        title: 'Not found',
        display: erdosUrl,
        src: dataPage('Not found', `<main><header class="page-head"><h1>Unknown page</h1><p>${escapeHtml(erdosUrl)} isn’t a built-in ErdOS page.</p></header><nav class="nav"><a href="erdos://home">Home</a></nav></main>`),
      };
    }

    function formatBytes(n) {
      if (n == null || Number.isNaN(n)) return '';
      if (n < 1024) return `${n} B`;
      if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
      if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
      return `${(n / 1024 ** 3).toFixed(2)} GB`;
    }

    function scoreLocalMatch(query, title, url) {
      const q = query.toLowerCase();
      const t = (title || '').toLowerCase();
      const u = (url || '').toLowerCase();
      if (!q) return 0;
      if (t === q || u === q || u === `https://${q}` || u === `http://${q}`) return 100;
      if (t.startsWith(q)) return 80;
      if (u.includes(`://${q}`) || u.includes(`www.${q}`)) return 75;
      if (t.includes(q)) return 60;
      if (u.includes(q)) return 45;
      const parts = q.split(/\s+/).filter(Boolean);
      if (parts.length > 1 && parts.every((p) => t.includes(p) || u.includes(p))) return 50;
      return 0;
    }

    function tryCalculate(query) {
      const expr = query.trim().replace(/×/g, '*').replace(/÷/g, '/').replace(/\^/g, '**');
      if (!/^[\d\s+\-*/().%]+$/.test(expr) || !/\d/.test(expr) || !/[+*/%\-]/.test(expr)) return null;
      try {
        // eslint-disable-next-line no-new-func
        const value = Function(`"use strict"; return (${expr})`)();
        if (typeof value !== 'number' || !Number.isFinite(value)) return null;
        const pretty = Number.isInteger(value) ? String(value) : String(Math.round(value * 1e10) / 1e10);
        return {
          title: pretty,
          snippet: `${query.trim()} = ${pretty}`,
          url: '',
          source: 'Calculator',
        };
      } catch {
        return null;
      }
    }

    function parseBang(input) {
      const m = input.trim().match(/^!([a-zA-Z]+)\s+(.+)$/);
      if (!m) return null;
      const key = m[1].toLowerCase();
      const rest = m[2].trim();
      const fn = BANGS[key];
      if (!fn || !rest) return null;
      return fn(rest);
    }

    function isDevQuery(query) {
      return /\b(css|html|javascript|typescript|python|api|function|array|promise|regex|http|json|npm|node|react|vue|rust|golang|sql|flexbox|flex-box|grid|dom|cors|websocket|async|await|typescript)\b/i.test(query)
        || /^(mdn|how to|what is the|docs?)\b/i.test(query)
        || /^[a-z][a-z0-9_-]{1,28}$/i.test(query.trim());
    }

    function isBookQuery(query) {
      return /\b(book|novel|author|isbn|read|library)\b/i.test(query);
    }

    function exploreRoutes(query) {
      const q = query.trim();
      if (!q) return [];
      const enc = encodeURIComponent(q);
      const routes = [
        { title: 'Wikipedia', url: `https://en.wikipedia.org/wiki/Special:Search?search=${enc}`, source: 'Explore' },
        { title: 'YouTube', url: `https://www.youtube.com/results?search_query=${enc}`, source: 'Explore' },
        { title: 'GitHub', url: `https://github.com/search?q=${enc}&type=repositories`, source: 'Explore' },
        { title: 'Reddit', url: `https://www.reddit.com/search/?q=${enc}`, source: 'Explore' },
        { title: 'OpenStreetMap', url: `https://www.openstreetmap.org/search?query=${enc}`, source: 'Explore' },
        { title: 'Internet Archive', url: `https://archive.org/search?query=${enc}`, source: 'Explore' },
      ];
      if (isDevQuery(q)) {
        routes.unshift(
          { title: 'MDN Web Docs', url: `https://developer.mozilla.org/en-US/search?q=${enc}`, source: 'Explore' },
          { title: 'Stack Overflow', url: `https://stackoverflow.com/search?q=${enc}`, source: 'Explore' },
        );
      }
      if (isBookQuery(q)) {
        routes.unshift({ title: 'Open Library', url: `https://openlibrary.org/search?q=${enc}`, source: 'Explore' });
      }
      const seen = new Set();
      return routes.filter((r) => {
        if (seen.has(r.title)) return false;
        seen.add(r.title);
        return true;
      });
    }

    async function fetchJson(url, ms = 4500) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), ms);
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      } finally {
        clearTimeout(timer);
      }
    }

    async function runSearch(q) {
      const query = (q || '').trim();
      const empty = { answer: null, library: [], knowledge: [], explore: [] };
      if (!query) return empty;

      const library = [];
      for (const b of store.bookmarks) {
        const score = scoreLocalMatch(query, b.title, b.url);
        if (score) library.push({ title: b.title, url: b.url, source: 'Bookmark', snippet: 'Saved in ErdOS', score });
      }
      for (const h of store.history) {
        const score = scoreLocalMatch(query, h.title, h.url);
        if (!score) continue;
        const ageDays = (Date.now() - (h.visitedAt || 0)) / 86400000;
        const recency = Number.isFinite(ageDays) ? Math.max(0, 10 - Math.floor(ageDays)) : 0;
        library.push({
          title: h.title,
          url: h.url,
          source: 'History',
          snippet: 'Recently visited',
          score: score + recency,
        });
      }
      library.sort((a, b) => (b.score || 0) - (a.score || 0));
      const libraryDedup = [];
      const seenLib = new Set();
      for (const item of library) {
        if (seenLib.has(item.url)) continue;
        seenLib.add(item.url);
        libraryDedup.push(item);
        if (libraryDedup.length >= 8) break;
      }

      let answer = tryCalculate(query);
      const knowledge = [];
      const seenKnow = new Set();

      if (looksLikeUrl(query) || /^https?:\/\//i.test(query)) {
        const url = /^https?:\/\//i.test(query) ? query : `https://${query}`;
        knowledge.push({ title: `Open ${url.replace(/^https?:\/\//i, '')}`, url, source: 'Open URL', snippet: 'Visit this address directly', score: 95 });
        seenKnow.add(url);
      }

      const wikiPromise = fetchJson(
        `https://en.wikipedia.org/w/api.php?action=opensearch&limit=8&namespace=0&format=json&origin=*&search=${encodeURIComponent(query)}`
      );
      const wikidataPromise = fetchJson(
        `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(query)}&language=en&uselang=en&limit=6&format=json&origin=*`
      );
      const openLibPromise = isBookQuery(query) || query.split(/\s+/).length <= 5
        ? fetchJson(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`)
        : Promise.resolve(null);
      // Always ask MDN — short tech queries often miss keyword heuristics.
      const mdnPromise = fetchJson(
        `https://developer.mozilla.org/api/v1/search?q=${encodeURIComponent(query)}&locale=en-US`
      );

      const [wikiData, wikidata, openLib, mdn] = await Promise.all([
        wikiPromise, wikidataPromise, openLibPromise, mdnPromise,
      ]);

      let topWikiTitle = '';
      if (wikiData && Array.isArray(wikiData[1])) {
        const titles = wikiData[1] || [];
        const descs = wikiData[2] || [];
        const urls = wikiData[3] || [];
        topWikiTitle = titles[0] || '';
        for (let i = 0; i < titles.length; i++) {
          const url = urls[i];
          if (!url || seenKnow.has(url)) continue;
          seenKnow.add(url);
          knowledge.push({
            title: titles[i],
            url,
            source: 'Wikipedia',
            snippet: descs[i] || 'Encyclopedia article',
            score: 70 - i,
          });
        }
      }

      if (topWikiTitle && !answer) {
        const summary = await fetchJson(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topWikiTitle.replace(/ /g, '_'))}`
        );
        if (summary?.extract && summary?.content_urls?.desktop?.page) {
          answer = {
            title: summary.title || topWikiTitle,
            snippet: summary.extract,
            url: summary.content_urls.desktop.page,
            source: summary.description ? `Wikipedia · ${summary.description}` : 'Wikipedia',
          };
        }
      }

      if (wikidata?.search?.length) {
        for (const ent of wikidata.search.slice(0, 5)) {
          const url = ent.concepturi || (ent.id ? `https://www.wikidata.org/wiki/${ent.id}` : '');
          if (!url || seenKnow.has(url)) continue;
          seenKnow.add(url);
          knowledge.push({
            title: ent.label || ent.id,
            url,
            source: 'Wikidata',
            snippet: ent.description || 'Structured knowledge entity',
            score: 55,
          });
        }
      }

      if (openLib?.docs?.length) {
        for (const doc of openLib.docs.slice(0, 4)) {
          const key = doc.key || (doc.cover_edition_key ? `/books/${doc.cover_edition_key}` : '');
          if (!key) continue;
          const url = `https://openlibrary.org${key}`;
          if (seenKnow.has(url)) continue;
          seenKnow.add(url);
          const author = Array.isArray(doc.author_name) ? doc.author_name[0] : '';
          knowledge.push({
            title: doc.title || 'Untitled',
            url,
            source: 'Open Library',
            snippet: [author, doc.first_publish_year].filter(Boolean).join(' · ') || 'Book record',
            score: 50,
          });
        }
      }

      if (mdn?.documents?.length) {
        for (const doc of mdn.documents.slice(0, 5)) {
          const url = doc.mdn_url
            ? (doc.mdn_url.startsWith('http') ? doc.mdn_url : `https://developer.mozilla.org${doc.mdn_url}`)
            : '';
          if (!url || seenKnow.has(url)) continue;
          seenKnow.add(url);
          knowledge.push({
            title: doc.title || 'MDN',
            url,
            source: 'MDN',
            snippet: doc.summary || 'Web documentation',
            score: 65,
          });
        }
      }

      knowledge.sort((a, b) => (b.score || 0) - (a.score || 0));

      // If the best library hit is very strong and no calculator answer, surface it as answer.
      if (!answer && libraryDedup[0] && (libraryDedup[0].score || 0) >= 80) {
        answer = {
          title: libraryDedup[0].title,
          snippet: libraryDedup[0].snippet || 'From your ErdOS library',
          url: libraryDedup[0].url,
          source: libraryDedup[0].source,
        };
      }

      return {
        answer,
        library: libraryDedup,
        knowledge: knowledge.slice(0, 12),
        explore: exploreRoutes(query),
      };
    }

    async function resolveNavigation(raw) {
      let input = (raw ?? '').trim();
      if (!input) return { display: HOME, ...(await buildInternalPage(HOME)) };

      const bangUrl = parseBang(input);
      if (bangUrl) {
        return { title: bangUrl, display: bangUrl, src: bangUrl };
      }

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
      const seq = ++tab.navSeq;
      setLoading(true);
      try {
        const target = await resolveNavigation(raw);
        if (!target || seq !== tab.navSeq) return;
        tab.url = target.display || target.src;
        tab.title = target.title || 'New Tab';
        if (fromOmnibox) urlInput.value = displayUrl(tab.url);
        tab.webview.setAttribute('src', target.src);
        if (tab.id === activeId) updateChrome();
        else {
          const label = tab.tabEl.querySelector('.browser-tab-label');
          if (label) label.textContent = tab.title || 'New Tab';
          const fav = tab.tabEl.querySelector('.browser-tab-favicon');
          if (fav) fav.textContent = faviconLetter(tab.title, tab.url);
        }
      } catch (err) {
        if (seq === tab.navSeq) {
          console.error(err);
          setLoading(false);
        }
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

      const tab = { id, title: 'New Tab', url: HOME, webview, tabEl, navSeq: 0 };
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
