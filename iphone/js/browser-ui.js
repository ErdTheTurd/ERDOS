/* Browser chrome. On iPhone the page itself is a WKWebView managed by
   the ErdosNative plugin. In a desktop browser the sample page is shown
   in an iframe so Blok's injected script can be tried at phone size. */
const BrowserUI = (() => {
  const Logic = () => window.BlokLogic;
  let host;
  let frame;
  let viewport;
  let omnibox;
  let hint;
  let home;
  let sheetOpen = false;
  const tabs = [{ id: 't1', title: 'Start', url: '' }];
  let active = 't1';

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (key === 'className') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
      else if (value != null) node.setAttribute(key, value);
    });
    [].concat(children || []).forEach((child) => {
      if (child == null) return;
      node.append(child.nodeType ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  function currentTab() {
    return tabs.find((tab) => tab.id === active) || tabs[0];
  }

  function previewUrl(query) {
    const q = query || 'erdos';
    return 'demo/search.html?q=' + encodeURIComponent(q);
  }

  function googleFor(query) {
    return Logic().googleWebResultsUrl('https://www.google.com/search?q=' + encodeURIComponent(query || 'erdos'));
  }

  async function syncNativeFrame() {
    if (!window.erdos.browser.native || !frame) return;
    const rect = frame.getBoundingClientRect();
    const show = !sheetOpen && !!currentTab().url && rect.width > 0 && rect.height > 0;
    await window.erdos.browser.setVisible(show);
    if (show) {
      await window.erdos.browser.setFrame({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      });
    }
  }

  async function navigate(raw) {
    const tab = currentTab();
    const text = String(raw || '').trim();
    if (!text) return showHome();
    const looksUrl = /^https?:\/\//i.test(text) || /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(text);
    let target = text;
    if (!looksUrl) target = googleFor(text);
    else if (!/^https?:\/\//i.test(target)) target = 'https://' + target;
    const rewritten = Logic().googleWebResultsUrl(target);
    if (rewritten) target = rewritten;
    tab.url = target;
    tab.title = text.slice(0, 24) || 'Page';
    omnibox.value = target;
    home.hidden = true;
    frame.hidden = false;
    if (viewport) viewport.hidden = false;
    if (window.erdos.browser.native) {
      frame.src = 'about:blank';
      await window.erdos.browser.load(target);
    } else if (/^https?:\/\//i.test(target) && Logic().googleWebResultsUrl(target)) {
      const q = new URL(target).searchParams.get('q') || 'search';
      frame.src = previewUrl(q);
      hint.hidden = false;
      hint.textContent = target;
    } else if (/^https?:\/\//i.test(target)) {
      frame.hidden = true;
      home.hidden = false;
      if (viewport) viewport.hidden = true;
      home.innerHTML = '';
      home.append(el('div', { className: 'preview-note', text: 'On your iPhone, ERDOS opens this in its own browser view so Blok can filter it. This preview only loads ERDOS sample pages.' }));
      hint.hidden = false;
      hint.textContent = target;
    } else {
      frame.src = target;
    }
    renderTabs();
    syncNativeFrame();
  }

  function showHome() {
    const tab = currentTab();
    tab.url = '';
    tab.title = 'Start';
    omnibox.value = '';
    frame.hidden = true;
    frame.src = 'about:blank';
    home.hidden = false;
    if (viewport) viewport.hidden = true;
    hint.hidden = true;
    home.innerHTML = '';
    home.append(
      el('p', { className: 'start-kicker', text: 'Start' }),
      el('h1', { text: 'Search the web' }),
      el('p', { text: 'Blok covers ads and AI on the page. Tap a chip to show one.' }),
      el('div', { className: 'tile-grid' }, [
        el('button', {
          className: 'tile tile-accent',
          type: 'button',
          id: 'open-sample',
          onClick: () => navigate('erdos browser'),
        }, [el('strong', { text: 'Try Blok on a search' }), el('span', { text: 'Sample results, with ads and AI covered' })]),
      ])
    );
    renderTabs();
    if (window.erdos.browser.native) window.erdos.browser.setVisible(false);
  }

  function renderTabs() {
    const row = host.querySelector('.tab-row');
    row.innerHTML = '';
    tabs.forEach((tab) => {
      const button = el('button', {
        className: 'page-tab',
        type: 'button',
        text: tab.title,
        onClick: () => {
          active = tab.id;
          if (tab.url) navigate(tab.url);
          else showHome();
        },
      });
      if (tab.id === active) button.setAttribute('aria-current', 'true');
      row.append(button);
    });
    row.append(el('button', {
      className: 'add-tab',
      type: 'button',
      text: '+',
      'aria-label': 'New tab',
      onClick: () => {
        const id = 't' + Date.now();
        tabs.push({ id, title: 'Start', url: '' });
        active = id;
        showHome();
      },
    }));
  }

  async function openSheet() {
    sheetOpen = true;
    if (window.erdos.browser.native) await window.erdos.browser.setVisible(false);
    const hostName = 'sample-page';
    const prefs = await window.erdos.blok.site(hostName);
    const counts = await window.erdos.blok.counts();
    const paused = prefs.ads === false && prefs.ai === false;
    const scrim = el('div', { className: 'sheet-scrim', id: 'blok-sheet' });
    const sheet = el('div', { className: 'sheet', role: 'dialog', 'aria-label': 'Blok for this site' });
    const close = () => {
      scrim.remove();
      sheetOpen = false;
      syncNativeFrame();
    };
    scrim.addEventListener('click', (event) => { if (event.target === scrim) close(); });
    const ads = el('button', { className: 'switch-row', type: 'button' });
    const ai = el('button', { className: 'switch-row', type: 'button' });
    function paint() {
      ads.innerHTML = '';
      ai.innerHTML = '';
      ads.append(el('span', { className: 'switch' + (prefs.ads ? ' on' : ' off') }), el('span', {}, [el('strong', { text: 'Ads: ' + (prefs.ads ? 'on' : 'off') }), document.createElement('br'), el('small', { text: 'Network and cosmetic rules for this site' })]));
      ai.append(el('span', { className: 'switch' + (prefs.ai ? ' on' : ' off') }), el('span', {}, [el('strong', { text: 'AI: ' + (prefs.ai ? 'on' : 'off') }), document.createElement('br'), el('small', { text: 'Overviews, widgets, and the text detector' })]));
    }
    ads.addEventListener('click', async () => {
      prefs.ads = !prefs.ads;
      await window.erdos.blok.setSite(hostName, { ads: prefs.ads });
      paint();
      reloadPreview();
    });
    ai.addEventListener('click', async () => {
      prefs.ai = !prefs.ai;
      await window.erdos.blok.setSite(hostName, { ai: prefs.ai });
      paint();
      reloadPreview();
    });
    paint();
    const pause = el('button', {
      className: paused ? 'danger-btn' : 'primary',
      type: 'button',
      text: paused ? 'Blok is paused — resume' : 'Pause Blok on this site',
      onClick: async () => {
        const next = paused;
        await window.erdos.blok.setSite(hostName, { ads: next, ai: next });
        close();
        if (frame && frame.src && frame.src !== 'about:blank') frame.contentWindow.location.reload();
      },
    });
    sheet.append(
      el('div', { className: 'sheet-handle' }),
      el('div', { className: 'sheet-top' }, [
        el('span', { className: 'pill-tag', text: 'Blok' }),
        el('span', { className: 'spacer' }),
        el('button', { className: 'icon-btn plain', type: 'button', text: '⚙', 'aria-label': 'Blok settings', onClick: () => { close(); window.ErdosPhone.show('blok'); } }),
        el('button', { className: 'icon-btn plain', type: 'button', text: '×', 'aria-label': 'Close', onClick: close }),
      ]),
      el('h2', { text: 'On this site' }),
      el('div', { className: 'count-grid' }, [
        countCard(counts.ads, 'Ads'),
        countCard(counts.text, 'AI text'),
        countCard(counts.image, 'AI images'),
        countCard(counts.video, 'AI video'),
        countCard(counts.audio, 'AI audio'),
        countCard((counts.overview || 0) + (counts.widget || 0), 'AI blocks'),
      ]),
      ads,
      ai,
      pause
    );
    scrim.append(sheet);
    document.getElementById('sheet-host').append(scrim);
  }

  function countCard(value, label) {
    return el('div', {}, [el('strong', { text: String(value || 0) }), el('span', { text: label })]);
  }

  function reloadPreview() {
    if (frame && !frame.hidden && frame.src && frame.src !== 'about:blank') {
      const win = frame.contentWindow;
      if (win) win.location.reload();
    }
  }

  function onFrameMessage(event) {
    if (!frame || event.source !== frame.contentWindow) return;
    const data = event.data;
    if (!data || data.source !== 'erdos-blok') return;
    if (data.type === 'ready') {
      const cfg = window.erdos.blok.configFor('sample-page');
      frame.contentWindow.postMessage({ source: 'erdos-blok-host', type: 'config', config: cfg }, '*');
      return;
    }
    if (data.type === 'detect-text') {
      window.erdos.blok.detectText(data.text).then((result) => {
        frame.contentWindow.postMessage({
          source: 'erdos-blok-host',
          type: 'detect-result',
          id: data.id,
          confidence: result.confidence,
          hash: result.hash,
          remembered: result.remembered,
          signals: result.signals,
          placeholder: true,
        }, '*');
      });
      return;
    }
    if (data.type === 'feedback') {
      window.erdos.blok.saveFeedback(data).then(() => window.BlokUI.refresh && window.BlokUI.refresh());
      return;
    }
    if (data.type === 'undo') {
      window.erdos.blok.undoFeedback(data.id);
      window.ErdosPhone.toast('Undone. That mark was removed.');
      return;
    }
    if (data.type === 'hid') {
      window.erdos.blok.bump(data.kind);
      return;
    }
    if (data.type === 'toast' && data.text) window.ErdosPhone.toast(data.text);
  }

  function mount(panel) {
    host = panel;
    frame = el('iframe', { id: 'page-preview', title: 'Page preview' });
    frame.hidden = true;
    viewport = el('div', { className: 'viewport', id: 'browser-viewport' }, [frame]);
    viewport.hidden = true;
    omnibox = el('input', { type: 'search', placeholder: 'Search or type a URL', 'aria-label': 'Address', autocomplete: 'off', enterkeyhint: 'go' });
    hint = el('p', { className: 'hint' });
    hint.hidden = true;
    home = el('div', { className: 'home', id: 'browser-home' });
    const form = el('form', {
      className: 'omnibox',
      onSubmit: (event) => {
        event.preventDefault();
        navigate(omnibox.value);
      },
    }, [omnibox]);
    const tabs = el('div', { className: 'tab-row' });
    panel.append(
      el('header', { className: 'browser-chrome' }, [
        el('div', { className: 'nav-row' }, [form, el('button', { className: 'blok-pill', type: 'button', id: 'blok-badge', 'aria-label': 'Blok for this site', onClick: openSheet }, [
          el('img', { src: 'assets/blok-mark.svg', alt: '' }),
        ])]),
        el('div', { className: 'tool-row' }, [
          el('button', { className: 'icon-btn', type: 'button', text: '‹', 'aria-label': 'Back', onClick: () => { if (window.erdos.browser.native) window.erdos.browser.back(); else showHome(); } }),
          el('button', { className: 'icon-btn', type: 'button', text: '›', 'aria-label': 'Forward', onClick: () => window.erdos.browser.forward() }),
          tabs,
          el('button', { className: 'icon-btn', type: 'button', text: '↻', 'aria-label': 'Reload', onClick: () => { if (window.erdos.browser.native) window.erdos.browser.reload(); else reloadPreview(); } }),
        ]),
        hint,
      ]),
      home,
      viewport
    );
    window.addEventListener('message', onFrameMessage);
    window.addEventListener('resize', () => syncNativeFrame());
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => syncNativeFrame());
    showHome();
  }

  return { mount, navigate, openSheet, syncNativeFrame };
})();
window.BrowserUI = BrowserUI;
