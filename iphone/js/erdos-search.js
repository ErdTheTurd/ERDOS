/* ErdOS Search, the same address-bar behavior as the desktop browser.
   Queries stay inside ERDOS. They are not sent to another search engine.
   A site you open after that is drawn by the phone's web view. */
const ErdOSSearch = (() => {
  const HOME = 'erdos://home';
  const BANGS = {
    w: (q) => 'https://en.wikipedia.org/wiki/Special:Search?search=' + encodeURIComponent(q),
    wiki: (q) => 'https://en.wikipedia.org/wiki/Special:Search?search=' + encodeURIComponent(q),
    gh: (q) => 'https://github.com/search?q=' + encodeURIComponent(q) + '&type=repositories',
    github: (q) => 'https://github.com/search?q=' + encodeURIComponent(q) + '&type=repositories',
    mdn: (q) => 'https://developer.mozilla.org/en-US/search?q=' + encodeURIComponent(q),
    yt: (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q),
    youtube: (q) => 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q),
    r: (q) => 'https://www.reddit.com/search/?q=' + encodeURIComponent(q),
    reddit: (q) => 'https://www.reddit.com/search/?q=' + encodeURIComponent(q),
    so: (q) => 'https://stackoverflow.com/search?q=' + encodeURIComponent(q),
    maps: (q) => 'https://www.openstreetmap.org/search?query=' + encodeURIComponent(q),
    ol: (q) => 'https://openlibrary.org/search?q=' + encodeURIComponent(q),
    archive: (q) => 'https://archive.org/search?query=' + encodeURIComponent(q),
  };
  const CSS = [
    'body{margin:0;padding:28px 18px 48px;font:16px/1.45 -apple-system,BlinkMacSystemFont,sans-serif;color:#171b24;background:#f7f8fb;}',
    'h1{margin:0;font:400 40px/1.05 Georgia,serif;letter-spacing:-.03em;}',
    '.kicker{margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#5c6578;}',
    '.q{margin:8px 0 0;color:#5c6578;}',
    'h2{margin:28px 0 8px;font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#5c6578;}',
    'a{color:inherit;text-decoration:none;}',
    '.answer,.row{display:block;padding:14px 0;border-bottom:1px solid rgba(23,27,36,.1);}',
    '.src{display:block;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#1f9d86;}',
    '.t{display:block;margin-top:4px;font-size:17px;font-weight:600;}',
    '.meta,.u{display:block;margin-top:4px;font-size:13px;color:#5c6578;}',
    '.meta{color:#3d4658;line-height:1.45;}',
    '.explore{display:flex;flex-wrap:wrap;gap:8px;}',
    '.explore a{padding:10px 12px;border-radius:999px;background:#fff;border:1px solid rgba(23,27,36,.1);font-size:14px;font-weight:600;}',
    '.empty{margin-top:20px;padding:20px;border-radius:16px;background:#fff;color:#5c6578;text-align:center;}',
    '.tip{margin-top:22px;font-size:13px;color:#5c6578;}',
    'code{font-family:ui-monospace,monospace;background:rgba(23,27,36,.06);padding:1px 5px;border-radius:6px;}',
  ].join('');

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function store() {
    try {
      const raw = JSON.parse(localStorage.getItem('erdos-browser') || '{}');
      return {
        bookmarks: Array.isArray(raw.bookmarks) ? raw.bookmarks : [],
        history: Array.isArray(raw.history) ? raw.history : [],
      };
    } catch (_) {
      return { bookmarks: [], history: [] };
    }
  }

  function parseErdosUrl(url) {
    if (!url || typeof url !== 'string') return null;
    if (!/^erdos:/i.test(url)) return null;
    try {
      const normalized = url.replace(/^erdos:\/\//i, 'http://erdos.local/').replace(/^erdos:/i, 'http://erdos.local/');
      const parsed = new URL(normalized);
      const path = (parsed.pathname.replace(/^\/+/, '') || 'home').replace(/\/+$/, '') || 'home';
      return { path, query: parsed.searchParams };
    } catch (_) {
      const rest = url.replace(/^erdos:\/\//i, '').replace(/^erdos:/i, '');
      const parts = rest.split('?');
      return { path: (parts[0] || 'home').replace(/\/$/, '') || 'home', query: new URLSearchParams(parts[1] || '') };
    }
  }

  function looksLikeUrl(input) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(input)) return true;
    if (input.includes(' ') || !input.includes('.')) return false;
    if (/^(localhost|(\d{1,3}\.){3}\d{1,3})(:\d+)?(\/|$)/i.test(input)) return true;
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/.*)?$/i.test(input);
  }

  function parseBang(input) {
    const match = input.trim().match(/^!([a-zA-Z]+)\s+(.+)$/);
    if (!match) return null;
    const fn = BANGS[match[1].toLowerCase()];
    return fn && match[2].trim() ? fn(match[2].trim()) : null;
  }

  function tryCalculate(query) {
    const expr = query.trim().replace(/×/g, '*').replace(/÷/g, '/').replace(/\^/g, '**');
    if (!/^[\d\s+\-*/().%]+$/.test(expr) || !/\d/.test(expr) || !/[+*/%\-]/.test(expr)) return null;
    try {
      const value = Function('"use strict"; return (' + expr + ')')();
      if (typeof value !== 'number' || !Number.isFinite(value)) return null;
      const pretty = Number.isInteger(value) ? String(value) : String(Math.round(value * 1e10) / 1e10);
      return { title: pretty, snippet: query.trim() + ' = ' + pretty, url: '', source: 'Calculator' };
    } catch (_) {
      return null;
    }
  }

  function scoreLocalMatch(query, title, url) {
    const q = query.toLowerCase();
    const t = (title || '').toLowerCase();
    const u = (url || '').toLowerCase();
    if (!q) return 0;
    if (t === q || u === q) return 100;
    if (t.startsWith(q)) return 80;
    if (t.includes(q)) return 60;
    if (u.includes(q)) return 45;
    return 0;
  }

  function isDevQuery(query) {
    return /\b(css|html|javascript|typescript|python|api|function|array|promise|regex|http|json|npm|node|react|vue|rust|sql|flexbox|grid|dom)\b/i.test(query);
  }

  function isBookQuery(query) {
    return /\b(book|novel|author|isbn|read|library)\b/i.test(query);
  }

  function exploreRoutes(query) {
    const enc = encodeURIComponent(query.trim());
    const routes = [
      { title: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Special:Search?search=' + enc },
      { title: 'YouTube', url: 'https://www.youtube.com/results?search_query=' + enc },
      { title: 'GitHub', url: 'https://github.com/search?q=' + enc + '&type=repositories' },
      { title: 'Reddit', url: 'https://www.reddit.com/search/?q=' + enc },
      { title: 'OpenStreetMap', url: 'https://www.openstreetmap.org/search?query=' + enc },
      { title: 'Internet Archive', url: 'https://archive.org/search?query=' + enc },
    ];
    if (isDevQuery(query)) {
      routes.unshift(
        { title: 'MDN Web Docs', url: 'https://developer.mozilla.org/en-US/search?q=' + enc },
        { title: 'Stack Overflow', url: 'https://stackoverflow.com/search?q=' + enc }
      );
    }
    if (isBookQuery(query)) routes.unshift({ title: 'Open Library', url: 'https://openlibrary.org/search?q=' + enc });
    return routes;
  }

  async function fetchJson(url) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4500);
    try {
      const res = await fetch(url, { signal: ctrl.signal });
      if (!res.ok) return null;
      return await res.json();
    } catch (_) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  async function runSearch(q) {
    const query = (q || '').trim();
    const empty = { answer: null, library: [], knowledge: [], explore: [] };
    if (!query) return empty;
    const saved = store();
    const library = [];
    saved.bookmarks.forEach((item) => {
      const score = scoreLocalMatch(query, item.title, item.url);
      if (score) library.push({ title: item.title, url: item.url, source: 'Bookmark', snippet: 'Saved in ErdOS', score });
    });
    saved.history.forEach((item) => {
      const score = scoreLocalMatch(query, item.title, item.url);
      if (score) library.push({ title: item.title, url: item.url, source: 'History', snippet: 'Recently visited', score });
    });
    library.sort((a, b) => b.score - a.score);
    const seenLib = new Set();
    const libraryDedup = [];
    library.forEach((item) => {
      if (seenLib.has(item.url) || libraryDedup.length >= 8) return;
      seenLib.add(item.url);
      libraryDedup.push(item);
    });

    let answer = tryCalculate(query);
    const knowledge = [];
    const seen = new Set();
    if (looksLikeUrl(query) || /^https?:\/\//i.test(query)) {
      const url = /^https?:\/\//i.test(query) ? query : 'https://' + query;
      knowledge.push({ title: 'Open ' + url.replace(/^https?:\/\//i, ''), url, source: 'Open URL', snippet: 'Visit this address directly' });
      seen.add(url);
    }

    const [wikiData, wikidata, openLib, mdn] = await Promise.all([
      fetchJson('https://en.wikipedia.org/w/api.php?action=opensearch&limit=8&namespace=0&format=json&origin=*&search=' + encodeURIComponent(query)),
      fetchJson('https://www.wikidata.org/w/api.php?action=wbsearchentities&search=' + encodeURIComponent(query) + '&language=en&limit=6&format=json&origin=*'),
      isBookQuery(query) || query.split(/\s+/).length <= 5
        ? fetchJson('https://openlibrary.org/search.json?q=' + encodeURIComponent(query) + '&limit=5')
        : Promise.resolve(null),
      fetchJson('https://developer.mozilla.org/api/v1/search?q=' + encodeURIComponent(query) + '&locale=en-US'),
    ]);

    let topWiki = '';
    if (wikiData && Array.isArray(wikiData[1])) {
      topWiki = wikiData[1][0] || '';
      wikiData[1].forEach((title, i) => {
        const url = (wikiData[3] || [])[i];
        if (!url || seen.has(url)) return;
        seen.add(url);
        knowledge.push({ title, url, source: 'Wikipedia', snippet: (wikiData[2] || [])[i] || 'Encyclopedia article' });
      });
    }
    if (topWiki && !answer) {
      const summary = await fetchJson('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(topWiki.replace(/ /g, '_')));
      if (summary && summary.extract && summary.content_urls && summary.content_urls.desktop && summary.content_urls.desktop.page) {
        answer = {
          title: summary.title || topWiki,
          snippet: summary.extract,
          url: summary.content_urls.desktop.page,
          source: summary.description ? 'Wikipedia · ' + summary.description : 'Wikipedia',
        };
      }
    }
    (wikidata && wikidata.search || []).slice(0, 5).forEach((ent) => {
      const url = ent.concepturi || (ent.id ? 'https://www.wikidata.org/wiki/' + ent.id : '');
      if (!url || seen.has(url)) return;
      seen.add(url);
      knowledge.push({ title: ent.label || ent.id, url, source: 'Wikidata', snippet: ent.description || 'Structured knowledge entity' });
    });
    (openLib && openLib.docs || []).slice(0, 4).forEach((doc) => {
      if (!doc.key) return;
      const url = 'https://openlibrary.org' + doc.key;
      if (seen.has(url)) return;
      seen.add(url);
      const author = Array.isArray(doc.author_name) ? doc.author_name[0] : '';
      knowledge.push({ title: doc.title || 'Untitled', url, source: 'Open Library', snippet: [author, doc.first_publish_year].filter(Boolean).join(' · ') || 'Book record' });
    });
    (mdn && mdn.documents || []).slice(0, 5).forEach((doc) => {
      const url = doc.mdn_url ? (doc.mdn_url.startsWith('http') ? doc.mdn_url : 'https://developer.mozilla.org' + doc.mdn_url) : '';
      if (!url || seen.has(url)) return;
      seen.add(url);
      knowledge.push({ title: doc.title || 'MDN', url, source: 'MDN', snippet: doc.summary || 'Web documentation' });
    });

    if (!answer && libraryDedup[0] && libraryDedup[0].score >= 80) {
      answer = { title: libraryDedup[0].title, snippet: libraryDedup[0].snippet, url: libraryDedup[0].url, source: libraryDedup[0].source };
    }
    return { answer, library: libraryDedup, knowledge: knowledge.slice(0, 12), explore: exploreRoutes(query) };
  }

  function page(title, body) {
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'
      + escapeHtml(title) + '</title><style>' + CSS + '</style></head><body>' + body
      + '<script>document.addEventListener("click",function(event){var link=event.target.closest&&event.target.closest("a");if(!link)return;var href=link.getAttribute("data-href");if(!href)return;event.preventDefault();parent.postMessage({source:"erdos-browser",type:"open",url:href},"*");});<\/script></body></html>';
    return html;
  }

  function linkList(items) {
    if (!items.length) return '';
    return items.map((item) => '<a class="row" href="#" data-href="' + escapeHtml(item.url) + '"><span class="src">' + escapeHtml(item.source) + '</span><span class="t">' + escapeHtml(item.title) + '</span>'
      + (item.snippet ? '<span class="meta">' + escapeHtml(item.snippet) + '</span>' : '')
      + '<span class="u">' + escapeHtml(item.url) + '</span></a>').join('');
  }

  async function buildInternalPage(erdosUrl) {
    const parsed = parseErdosUrl(erdosUrl);
    if (!parsed) return null;
    const path = parsed.path || 'home';
    if (path === 'home') {
      return {
        title: 'ErdOS',
        display: HOME,
        kind: 'html',
        html: page('ErdOS', '<p class="kicker">ErdOS</p><h1>Search</h1><p class="q">Type in the address bar. Results come from your library, encyclopedias, and direct paths. This is not another search engine.</p>'),
      };
    }
    if (path === 'search') {
      const q = (parsed.query.get('q') || '').trim();
      const pack = await runSearch(q);
      const answer = pack.answer
        ? '<h2>Answer</h2>' + (pack.answer.url
          ? '<a class="answer" href="#" data-href="' + escapeHtml(pack.answer.url) + '">'
          : '<div class="answer">')
          + '<span class="src">' + escapeHtml(pack.answer.source) + '</span><span class="t">' + escapeHtml(pack.answer.title) + '</span>'
          + (pack.answer.snippet ? '<span class="meta">' + escapeHtml(pack.answer.snippet) + '</span>' : '')
          + (pack.answer.url ? '</a>' : '</div>')
        : '';
      const library = pack.library.length ? '<h2>Your library</h2>' + linkList(pack.library) : '';
      const knowledge = pack.knowledge.length ? '<h2>Knowledge</h2>' + linkList(pack.knowledge) : '';
      const explore = pack.explore.length
        ? '<h2>Explore</h2><div class="explore">' + pack.explore.map((item) => '<a href="#" data-href="' + escapeHtml(item.url) + '">' + escapeHtml(item.title) + '</a>').join('') + '</div>'
        : '';
      const empty = !pack.answer && !pack.library.length && !pack.knowledge.length && !pack.explore.length;
      return {
        title: q ? 'Search — ' + q : 'Search',
        display: 'erdos://search?q=' + encodeURIComponent(q),
        kind: 'html',
        html: page('ErdOS Search', '<p class="kicker">ErdOS Search</p><h1>Results</h1><p class="q">' + escapeHtml(q || '—') + '</p>'
          + answer + library + knowledge + explore
          + (empty ? '<div class="empty">No matches yet. Try a bang like !w or !gh, or enter a full URL.</div>' : '')
          + '<p class="tip">Shortcuts: <code>!w</code> Wikipedia · <code>!gh</code> GitHub · <code>!mdn</code> MDN · <code>!yt</code> YouTube · <code>!r</code> Reddit · <code>!so</code> Stack Overflow · <code>!maps</code> OpenStreetMap</p>'),
      };
    }
    if (path === 'bookmarks' || path === 'history') {
      const saved = store();
      const items = path === 'bookmarks' ? saved.bookmarks : saved.history;
      const list = items.length
        ? linkList(items.map((item) => ({ title: item.title, url: item.url, source: path, snippet: '' })))
        : '<div class="empty">Nothing here yet.</div>';
      const label = path === 'bookmarks' ? 'Bookmarks' : 'History';
      return {
        title: label,
        display: 'erdos://' + path,
        kind: 'html',
        html: page(label, '<p class="kicker">ErdOS Browser</p><h1>' + label + '</h1>' + list),
      };
    }
    return {
      title: 'Not found',
      display: erdosUrl,
      kind: 'html',
      html: page('Not found', '<h1>Unknown page</h1><p class="q">' + escapeHtml(erdosUrl) + ' is not an ErdOS page.</p>'),
    };
  }

  async function resolve(raw) {
    const input = String(raw || '').trim();
    if (!input) return buildInternalPage(HOME);
    const bang = parseBang(input);
    if (bang) return { title: bang, display: bang, kind: 'url', src: bang };
    if (parseErdosUrl(input) || /^erdos:/i.test(input)) {
      return buildInternalPage(/^erdos:/i.test(input) ? input : 'erdos://' + input);
    }
    if (/^https?:\/\//i.test(input)) return { title: input, display: input, kind: 'url', src: input };
    if (looksLikeUrl(input)) {
      const url = 'https://' + input;
      return { title: url, display: url, kind: 'url', src: url };
    }
    return buildInternalPage('erdos://search?q=' + encodeURIComponent(input));
  }

  return { resolve, HOME };
})();
window.ErdOSSearch = ErdOSSearch;
