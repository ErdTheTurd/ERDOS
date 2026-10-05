/* Injected into the ERDOS browser view and into Safari as a content script.
   BlokLogic is loaded first. The phone shell sets data-erdos-shell="phone"
   so this file does nothing if it is ever attached to the app UI. */
(function blokPageScript() {
  if (window.__blokInstalled) return;
  if (document.documentElement && document.documentElement.dataset.erdosShell === 'phone') return;
  window.__blokInstalled = true;

  const Logic = window.BlokLogic;
  const AI_HEADINGS = /^(ai overview|ai mode|ai answer|copilot answer)$/i;
  const ASK_AI = /^(ask ai|ask the ai|ai assistant)$/i;
  const WIDGETS = [
    '[data-ai-widget]',
    '[data-ask-ai]',
    'iframe[src*="chatbase.co"]',
    'iframe[src*="intercom.io"]',
    'iframe[src*="crisp.chat"]',
    'iframe[src*="tawk.to"]',
    '#intercom-container',
    '#drift-widget-container',
    '#crisp-chatbox',
    '#hubspot-messages-iframe-container',
  ];
  const ADS = [
    '[aria-label="Advertisement"]',
    '[aria-label="Sponsored"]',
    'ins.adsbygoogle',
    '[data-ad-slot]',
    '[id^="google_ads"]',
    'iframe[src*="doubleclick.net"]',
    'iframe[src*="googlesyndication"]',
  ];

  function config() {
    const base = {
      ads: true,
      ai: true,
      visual: true,
      textDetection: true,
      textThreshold: Logic ? Logic.TEXT_THRESHOLD : 0.8,
      minWords: Logic ? Logic.MIN_WORDS : 50,
    };
    const raw = Object.assign(base, window.__BLOK_CONFIG__ || {});
    const host = (location.hostname || '').replace(/^www\./i, '');
    const listed = (list) => (list || []).some((item) => host === item || (item && host.endsWith('.' + item)));
    if (listed(raw.disabledAds)) raw.ads = false;
    if (listed(raw.disabledAi)) raw.ai = false;
    if (listed(raw.pausedSites)) {
      raw.ads = false;
      raw.ai = false;
    }
    return raw;
  }

  function extensionRuntime() {
    try {
      if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.id) return browser;
    } catch (_) { /* not an extension */ }
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.id) return chrome;
    } catch (_) { /* not chrome */ }
    return null;
  }

  function post(msg) {
    const body = Object.assign({ source: 'erdos-blok', href: location.href }, msg);
    const ext = extensionRuntime();
    if (ext) {
      try {
        ext.runtime.sendMessage(body, (response) => {
          const err = ext.runtime.lastError;
          if (err) return;
          handleExtensionResponse(body, response || {});
        });
      } catch (_) { /* extension gone */ }
      return;
    }
    try {
      if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.blok) {
        window.webkit.messageHandlers.blok.postMessage(body);
      }
    } catch (_) { /* not in WKWebView */ }
    try {
      if (window.parent && window.parent !== window) window.parent.postMessage(body, '*');
    } catch (_) { /* detached */ }
  }

  function handleExtensionResponse(body, response) {
    if (body.type === 'ready' && response.config) {
      window.__BLOK_CONFIG__ = response.config;
      beginScan();
    }
    if (body.type === 'detect-text') onDetect(Object.assign({ id: body.id }, response));
    if (response.askShare) showSharePrompt();
  }

  let sharePromptOpen = false;
  function showSharePrompt() {
    if (sharePromptOpen) return;
    if (document.querySelector('.blok-share-scrim')) return;
    sharePromptOpen = true;
    ensureStyle();
    const scrim = document.createElement('div');
    scrim.className = 'blok-share-scrim';
    const sheet = document.createElement('div');
    sheet.className = 'blok-share-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-label', 'Keep corrections on this phone?');
    const title = document.createElement('h2');
    title.textContent = 'Keep corrections on this phone?';
    const copy = document.createElement('p');
    copy.textContent = 'Your answer is saved on this iPhone either way. Sharing is optional and starts off. If you share, Blok can queue the text (emails and phone numbers removed) or a media link, the site domain, the score, your answer, and the app version. History, cookies, and logins are not included. This build does not upload anything.';
    const row = document.createElement('div');
    row.className = 'blok-share-actions';
    const share = document.createElement('button');
    share.type = 'button';
    share.textContent = 'Share to improve Blok';
    const local = document.createElement('button');
    local.type = 'button';
    local.textContent = 'Keep it on my phone';
    const choose = (choice) => {
      post({ type: 'share-choice', choice: choice });
      scrim.remove();
      sharePromptOpen = false;
    };
    share.addEventListener('click', () => choose('share'));
    local.addEventListener('click', () => choose('local'));
    row.append(share, local);
    sheet.append(title, copy, row);
    scrim.append(sheet);
    document.documentElement.appendChild(scrim);
  }

  function ensureStyle() {
    if (document.getElementById('blok-page-style')) return;
    const style = document.createElement('style');
    style.id = 'blok-page-style';
    style.textContent = [
      '.blok-silent-hide{display:none !important;}',
      '.blok-blur{filter:blur(8px);user-select:none;}',
      '.blok-text-wrap,.blok-media-wrap{position:relative;margin:12px 0;}',
      '.blok-card{position:relative;z-index:2;margin-top:8px;padding:14px;border-radius:18px;background:#2F6BFF;color:#fff;font:600 16px/1.35 -apple-system,BlinkMacSystemFont,sans-serif;}',
      '.blok-card p{margin:0 0 8px;}',
      '.blok-card .blok-note{font-weight:500;font-size:13px;opacity:.9;}',
      '.blok-card button{min-height:44px;border:0;border-radius:12px;padding:8px 12px;font:700 15px/1.2 -apple-system,BlinkMacSystemFont,sans-serif;}',
      '.blok-show{display:block;width:100%;background:#fff;color:#1B4FE0;margin:8px 0;}',
      '.blok-actions{display:flex;gap:8px;}',
      '.blok-actions button{flex:1;background:rgba(255,255,255,.16);color:#fff;}',
      '.blok-chip{display:inline-flex;align-items:center;min-height:44px;margin:8px 0;padding:8px 14px;border:0;border-radius:999px;background:#2F6BFF;color:#fff;font:700 15px/1.2 -apple-system,BlinkMacSystemFont,sans-serif;}',
      '.blok-toast{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483646;display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;background:#102033;color:#fff;font:600 15px/1.3 -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 10px 30px rgba(16,32,51,.28);}',
      '.blok-toast button{min-height:44px;margin-left:auto;border:0;border-radius:12px;padding:8px 14px;background:#fff;color:#1B4FE0;font:800 15px/1;}',
      '.blok-media-hit{position:relative;display:block;max-width:100%;}',
      '.blok-media-hit audio{display:block;width:100%;}',
      '.blok-media-cover{position:absolute;inset:0;z-index:2;min-height:44px;border:0;padding:0;background:transparent;}',
      '.blok-share-scrim{position:fixed;inset:0;z-index:2147483647;background:rgba(16,32,51,.4);display:flex;align-items:flex-end;}',
      '.blok-share-sheet{width:100%;margin:0;padding:22px 18px calc(18px + env(safe-area-inset-bottom,0px));border-radius:28px 28px 0 0;background:#fff;color:#102033;font:600 16px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 -12px 40px rgba(16,32,51,.18);}',
      '.blok-share-sheet h2{margin:0 0 8px;font-size:28px;line-height:1.05;letter-spacing:-.04em;}',
      '.blok-share-sheet p{margin:0 0 14px;font-weight:500;color:#5c6b80;}',
      '.blok-share-actions{display:flex;gap:8px;}',
      '.blok-share-actions button{flex:1;min-height:48px;border:0;border-radius:14px;background:#e7f0ff;color:#1b4fe0;font:800 15px/1.2 -apple-system,BlinkMacSystemFont,sans-serif;}',
    ].join('');
    (document.head || document.documentElement).appendChild(style);
  }

  function maybeForceWebResults() {
    const cfg = config();
    if (!cfg.ai || !Logic || window.top !== window) return;
    const next = Logic.googleWebResultsUrl(location.href);
    if (next && next !== location.href) location.replace(next);
  }

  function sensitivePage() {
    return !!document.querySelector('input[type="password"], input[autocomplete="cc-number"], input[autocomplete="current-password"]');
  }

  function thanksToast() {
    const existing = document.querySelector('.blok-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'blok-toast';
    toast.setAttribute('role', 'status');
    toast.textContent = 'Thanks, Blok is learning';
    document.documentElement.appendChild(toast);
    setTimeout(() => { if (toast.isConnected) toast.remove(); }, 3200);
  }

  function rememberToast(recordId) {
    const existing = document.querySelector('.blok-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = 'blok-toast';
    toast.setAttribute('role', 'status');
    const label = document.createElement('span');
    label.textContent = 'Marked as AI. Saved on this phone.';
    const undo = document.createElement('button');
    undo.type = 'button';
    undo.textContent = 'Undo';
    undo.addEventListener('click', () => {
      const node = document.querySelector('[data-blok-flag="' + recordId + '"]');
      if (node) revealNode(node);
      toast.remove();
      post({ type: 'undo', id: recordId });
    });
    toast.append(label, undo);
    document.documentElement.appendChild(toast);
    setTimeout(() => {
      if (toast.isConnected) toast.remove();
    }, 6000);
  }

  function revealNode(node) {
    node.classList.remove('blok-silent-hide', 'blok-blur');
    node.removeAttribute('aria-hidden');
    delete node.dataset.blokCovered;
    const wrap = node.closest('.blok-text-wrap, .blok-media-wrap');
    if (wrap) {
      const card = wrap.querySelector('.blok-card');
      if (card) card.remove();
    } else {
      const chip = node.nextElementSibling;
      if (chip && chip.classList && chip.classList.contains('blok-chip')) chip.remove();
    }
    node.dataset.blokRevealed = '1';
  }

  function feedbackButtons(card, ctx) {
    const row = document.createElement('div');
    row.className = 'blok-actions';
    const human = document.createElement('button');
    human.type = 'button';
    human.textContent = ctx.kind === 'text' ? "No, that's human" : "No, that's real";
    const ai = document.createElement('button');
    ai.type = 'button';
    ai.textContent = "Yep, that's AI";
    human.addEventListener('click', () => {
      revealNode(ctx.node);
      sendFeedback(ctx, 'human');
      thanksToast();
    });
    ai.addEventListener('click', () => {
      sendFeedback(ctx, 'ai');
      thanksToast();
    });
    row.append(human, ai);
    card.append(row);
  }

  function sendFeedback(ctx, verdict) {
    const id = ctx.id || ('fb_' + Date.now());
    post({
      type: 'feedback',
      id,
      hash: ctx.hash,
      kind: ctx.kind,
      verdict,
      score: ctx.score,
      source: ctx.source || 'buttons',
      signals: ctx.signals || [],
      placeholder: ctx.placeholder !== false,
      text: ctx.text || '',
      mediaKey: ctx.mediaKey || '',
      domain: location.hostname,
      sensitive: sensitivePage(),
      manual: !!ctx.manual,
    });
    return id;
  }

  function coverText(el, info) {
    if (!el || el.dataset.blokCovered === '1' || el.dataset.blokRevealed === '1') return;
    ensureStyle();
    el.dataset.blokCovered = '1';
    const wrap = document.createElement('div');
    wrap.className = 'blok-text-wrap';
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);
    el.classList.add('blok-blur');
    el.setAttribute('aria-hidden', 'true');
    const card = document.createElement('div');
    card.className = 'blok-card';
    const title = document.createElement('p');
    const pct = Math.round(Number(info.confidence) * 100);
    title.textContent = info.manual
      ? 'You marked this as AI-written'
      : 'Blok thinks this is AI-written (' + pct + '% sure)';
    const note = document.createElement('p');
    note.className = 'blok-note';
    note.textContent = info.manual
      ? 'Triple tap. Saved as “Yep, that’s AI” for on-device learning.'
      : 'Text detection is Beta. This score is from the placeholder detector, not the proprietary model.';
    const show = document.createElement('button');
    show.type = 'button';
    show.className = 'blok-show';
    show.textContent = 'Show text';
    show.addEventListener('click', () => revealNode(el));
    card.append(title, note, show);
    const ctx = {
      node: el,
      id: info.id,
      hash: info.hash,
      kind: 'text',
      score: info.manual ? null : info.confidence,
      source: info.manual ? 'triple-tap' : 'buttons',
      signals: info.signals || [],
      placeholder: !info.manual,
      text: info.text || el.innerText || '',
      manual: !!info.manual,
    };
    if (info.manual && info.id) el.dataset.blokFlag = info.id;
    feedbackButtons(card, ctx);
    wrap.appendChild(card);
    post({ type: 'hid', kind: 'text' });
  }

  function coverMedia(el, kind) {
    if (!el || el.dataset.blokCovered === '1') return null;
    ensureStyle();
    const hit = el.closest('.blok-media-hit');
    if (hit) {
      const cover = hit.querySelector('.blok-media-cover');
      if (cover) cover.remove();
    }
    el.dataset.blokCovered = '1';
    const wrap = document.createElement('div');
    wrap.className = 'blok-media-wrap';
    el.parentNode.insertBefore(wrap, el);
    wrap.appendChild(el);
    el.classList.add('blok-blur');
    if (kind === 'video' && el.pause) {
      try { el.pause(); } catch (_) { /* ignore */ }
    }
    if (kind === 'audio' && el.pause) {
      try { el.pause(); el.muted = true; } catch (_) { /* ignore */ }
    }
    const titles = {
      image: 'You marked this image as AI',
      video: 'You marked this video as AI',
      audio: 'You marked this audio as AI',
    };
    const card = document.createElement('div');
    card.className = 'blok-card';
    const title = document.createElement('p');
    title.textContent = titles[kind] || 'You marked this as AI';
    const note = document.createElement('p');
    note.className = 'blok-note';
    note.textContent = 'Triple tap. Saved as “Yep, that’s AI” for on-device learning.';
    const show = document.createElement('button');
    show.type = 'button';
    show.className = 'blok-show';
    show.textContent = kind === 'text' ? 'Show text' : 'Show anyway';
    show.addEventListener('click', () => revealNode(el));
    card.append(title, note, show);
    const mediaKey = el.currentSrc || el.src || el.getAttribute('src') || el.alt || kind;
    const hash = Logic ? Logic.hashText(kind + '|' + mediaKey) : String(mediaKey);
    const id = 'manual_' + hash + '_' + Date.now();
    el.dataset.blokFlag = id;
    feedbackButtons(card, {
      node: el,
      id,
      hash,
      kind,
      score: null,
      source: 'triple-tap',
      signals: ['manual'],
      text: '',
      mediaKey,
      manual: true,
    });
    wrap.appendChild(card);
    post({ type: 'hid', kind });
    const recordId = sendFeedback({
      node: el,
      id,
      hash,
      kind,
      score: null,
      source: 'triple-tap',
      signals: ['manual'],
      text: '',
      mediaKey,
      manual: true,
    }, 'ai');
    rememberToast(recordId);
    return recordId;
  }

  function chipFor(node, label, kind) {
    if (!node || node.dataset.blokHandled || node.dataset.blokRevealed === '1') return;
    if (node.closest('.blok-card, .blok-toast')) return;
    ensureStyle();
    node.dataset.blokHandled = kind;
    node.classList.add('blok-silent-hide');
    const cfg = config();
    if (cfg.visual !== false) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'blok-chip';
      chip.textContent = label;
      chip.addEventListener('click', () => revealNode(node));
      node.insertAdjacentElement('afterend', chip);
    }
    post({ type: 'hid', kind });
  }

  function overviewRoot(heading) {
    let node = heading;
    for (let i = 0; i < 5; i += 1) {
      const parent = node.parentElement;
      if (!parent || parent === document.body) break;
      const text = parent.innerText || '';
      if (text.length > 1200) break;
      node = parent;
      if (parent.tagName === 'SECTION' || parent.tagName === 'ARTICLE' || parent.hasAttribute('data-ai-overview')) break;
    }
    return node;
  }

  function scanStructure(root) {
    const cfg = config();
    const scope = root && root.querySelectorAll ? root : document;
    if (cfg.ads !== false) {
      ADS.forEach((selector) => {
        scope.querySelectorAll(selector).forEach((node) => chipFor(node, 'Blok hid an ad', 'ads'));
      });
    }
    if (cfg.ai === false) return;
    scope.querySelectorAll('h1,h2,h3,h4,[role="heading"]').forEach((heading) => {
      const text = (heading.textContent || '').trim();
      if (!AI_HEADINGS.test(text)) return;
      chipFor(overviewRoot(heading), 'Blok hid an AI Overview', 'overview');
    });
    scope.querySelectorAll('[data-ai-overview]').forEach((node) => {
      chipFor(node, 'Blok hid an AI Overview', 'overview');
    });
    WIDGETS.forEach((selector) => {
      scope.querySelectorAll(selector).forEach((node) => chipFor(node, 'Blok hid an AI chat widget', 'widget'));
    });
    scope.querySelectorAll('button, a, [role="button"]').forEach((node) => {
      const text = (node.getAttribute('aria-label') || node.textContent || '').trim();
      if (!ASK_AI.test(text)) return;
      const box = node.closest('[data-ai-widget], aside, section') || node;
      chipFor(box, 'Blok hid an AI chat widget', 'widget');
    });
  }

  const pending = new Map();

  function scanText(root) {
    const cfg = config();
    if (cfg.ai === false || cfg.textDetection === false || !Logic) return;
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('p, li, blockquote, article').forEach((el) => {
      if (el.dataset.blokTextChecked || el.closest('.blok-card, .blok-text-wrap, .blok-toast')) return;
      const text = (el.innerText || '').trim();
      const words = Logic.wordCount(text);
      if (words < (cfg.minWords || 50)) return;
      el.dataset.blokTextChecked = '1';
      const id = 't' + pending.size + '_' + Date.now();
      el.dataset.blokTextId = id;
      pending.set(id, el);
      post({ type: 'detect-text', id, text, words });
    });
  }

  function onDetect(msg) {
    const el = pending.get(msg.id) || document.querySelector('[data-blok-text-id="' + msg.id + '"]');
    if (!el || !Logic) return;
    const text = (el.innerText || '').trim();
    const hide = Logic.shouldHideText({
      confidence: msg.confidence,
      words: Logic.wordCount(text),
      remembered: msg.remembered,
      threshold: config().textThreshold,
      minWords: config().minWords,
    });
    if (!hide) return;
    coverText(el, {
      confidence: msg.confidence,
      hash: msg.hash,
      signals: msg.signals || [],
      text,
      manual: false,
    });
  }

  window.__blokOnDetect = onDetect;

  function blockFromNode(node) {
    const el = node && node.nodeType === 1 ? node : node && node.parentElement;
    if (!el || !el.closest) return null;
    return el.closest('p, li, blockquote, h1, h2, h3, figcaption, td');
  }

  // Native audio controls swallow taps, so a transparent cover counts the
  // triple-tap and a single tap still plays or pauses.
  function watchAudio(root) {
    const scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll('audio').forEach((el) => {
      if (el.closest('.blok-media-hit') || el.dataset.blokCovered === '1') return;
      const wrap = document.createElement('div');
      wrap.className = 'blok-media-hit';
      el.parentNode.insertBefore(wrap, el);
      wrap.appendChild(el);
      const cover = document.createElement('button');
      cover.type = 'button';
      cover.className = 'blok-media-cover';
      cover.setAttribute('aria-label', 'Triple tap to mark this audio as AI');
      wrap.appendChild(cover);
      let playTimer = 0;
      cover.addEventListener('click', (event) => {
        if (event.detail >= 3) {
          clearTimeout(playTimer);
          return;
        }
        clearTimeout(playTimer);
        playTimer = setTimeout(() => {
          if (el.paused) el.play().catch(() => {});
          else el.pause();
        }, 320);
      });
    });
  }

  function flagSelection(event) {
    const target = event.target;
    if (!target || !target.closest) return;
    const audioCover = target.closest('.blok-media-cover');
    if (audioCover) {
      const hit = audioCover.closest('.blok-media-hit');
      const audio = hit && hit.querySelector('audio');
      if (audio) coverMedia(audio, 'audio');
      return;
    }
    if (target.closest('.blok-card, .blok-chip, .blok-toast, .blok-share-scrim, button, a, input, textarea, select, label')) return;
    const editable = target.closest('[contenteditable="true"], input, textarea');
    const media = target.closest('img, video, audio, picture');
    let mediaKind = null;
    if (media) {
      if (media.tagName === 'IMG' || media.tagName === 'PICTURE') mediaKind = 'image';
      else if (media.tagName === 'VIDEO') mediaKind = 'video';
      else if (media.tagName === 'AUDIO') mediaKind = 'audio';
    }
    const selection = window.getSelection ? window.getSelection() : null;
    const selectionText = selection && !selection.isCollapsed ? selection.toString() : '';
    const decision = Logic.resolveTripleTap({
      inBlokChrome: !!target.closest('.blok-card, .blok-chip, .blok-toast'),
      editable: !!editable,
      mediaKind,
      selectionText,
    });
    if (!decision) return;
    if (decision.kind === 'image' || decision.kind === 'video' || decision.kind === 'audio') {
      const el = media.tagName === 'PICTURE' ? (media.querySelector('img') || media) : media;
      coverMedia(el, decision.kind);
      return;
    }
    let block = blockFromNode(selection && selection.anchorNode) || blockFromNode(target);
    if (!block) return;
    const hash = Logic.hashText(decision.text);
    const id = 'manual_' + hash + '_' + Date.now();
    coverText(block, {
      manual: true,
      confidence: null,
      hash,
      id,
      signals: ['manual'],
      text: decision.text,
    });
    sendFeedback({
      node: block,
      id,
      hash,
      kind: 'text',
      score: null,
      source: 'triple-tap',
      signals: ['manual'],
      text: decision.text,
      manual: true,
    }, 'ai');
    rememberToast(id);
  }

  let lastTriple = { at: 0, target: null };
  function armTriple(event) {
    const now = Date.now();
    // A real triple-tap arrives as touchend and again as click. Ignore that
    // second event on the same element, and still allow the next element.
    if (lastTriple.target === event.target && now - lastTriple.at < 700) return;
    lastTriple = { at: now, target: event.target || null };
    flagSelection(event);
  }

  document.addEventListener('click', (event) => {
    if (event.detail >= 3) armTriple(event);
  }, true);

  let touchTimes = [];
  document.addEventListener('touchend', (event) => {
    const now = Date.now();
    touchTimes = touchTimes.filter((stamp) => now - stamp < 600);
    touchTimes.push(now);
    if (touchTimes.length >= 3) {
      touchTimes = [];
      setTimeout(() => armTriple(event), 0);
    }
  }, true);

  function scanAll() {
    if (!document.body) return;
    scanStructure(document);
    scanText(document);
    watchAudio(document);
  }

  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || data.source !== 'erdos-blok-host') return;
    if (data.type === 'detect-result') onDetect(data);
    if (data.type === 'config' && data.config) {
      window.__BLOK_CONFIG__ = data.config;
      beginScan();
    }
  });

  function beginScan() {
    if (window.__blokScanned) return;
    window.__blokScanned = true;
    ensureStyle();
    scanAll();
  }

  function whenReady(fn) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn);
    else fn();
  }

  maybeForceWebResults();
  if (extensionRuntime()) {
    whenReady(() => {
      post({ type: 'ready' });
      setTimeout(beginScan, 800);
    });
  } else if (window.parent && window.parent !== window) {
    const start = () => post({ type: 'ready' });
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
    setTimeout(beginScan, 400);
  } else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', beginScan);
  } else {
    beginScan();
  }

  const observer = new MutationObserver(() => {
    if (observer._timer) return;
    observer._timer = setTimeout(() => {
      observer._timer = null;
      scanAll();
    }, 200);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
