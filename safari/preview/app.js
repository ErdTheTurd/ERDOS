(function () {
  const steps = [
    'Open the Settings app',
    'Tap Apps',
    'Tap Safari',
    'Tap Extensions',
    'Turn on Blok and Blok Content Blocker',
    'Tap each one and allow All Websites',
  ];
  const pages = [
    {
      title: 'Ads and AI, covered until you tap.',
      body: 'Blok hides ads, trackers, and AI content in Safari. Tap a placeholder to show it again. Text detection is Beta.',
    },
    {
      title: 'Turn it on in Safari.',
      body: 'Blok cannot block until Safari is allowed to use the extension.',
      steps: true,
    },
    {
      title: 'It stays on this iPhone.',
      body: 'Corrections stay on this phone. Share feedback is off. The detectors in this build are placeholders, and text detection is marked Beta.',
    },
  ];

  let host = null;
  let page = 0;

  function state() {
    return host.snapshot();
  }

  function show(id) {
    document.querySelectorAll('.screen').forEach((node) => {
      node.hidden = node.id !== id;
    });
  }

  function renderOnboarding() {
    const item = pages[page];
    document.getElementById('onboard-title').textContent = item.title;
    document.getElementById('onboard-body').textContent = item.body;
    const list = document.getElementById('enable-steps');
    const older = document.getElementById('older-path');
    list.hidden = !item.steps;
    older.hidden = !item.steps;
    list.replaceChildren();
    if (item.steps) {
      steps.forEach((text, index) => {
        const li = document.createElement('li');
        const badge = document.createElement('b');
        badge.textContent = String(index + 1);
        li.append(badge, document.createTextNode(text));
        list.append(li);
      });
    }
    const next = document.getElementById('onboard-next');
    next.textContent = page === pages.length - 1 ? 'Start blocking' : 'Next';
  }

  function counts(stats) {
    const wrap = document.createElement('div');
    wrap.className = 'counts';
    [['ads', 'Ads'], ['text', 'AI text'], ['image', 'Images'], ['video', 'Video'], ['audio', 'Audio']].forEach((item) => {
      const cell = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = String((stats && stats[item[0]]) || 0);
      const span = document.createElement('span');
      span.textContent = item[1];
      cell.append(strong, span);
      wrap.append(cell);
    });
    return wrap;
  }

  function renderHome() {
    const snap = state();
    const sheet = document.getElementById('home-sheet');
    sheet.replaceChildren();
    const today = document.createElement('div');
    today.className = 'card';
    const title = document.createElement('h2');
    title.textContent = 'Today';
    today.append(title, counts(snap.stats));
    const setup = document.createElement('div');
    setup.className = 'card';
    setup.id = 'safari-steps';
    const heading = document.createElement('h2');
    heading.textContent = 'Enable in Safari';
    const list = document.createElement('ol');
    list.className = 'steps';
    steps.forEach((text, index) => {
      const li = document.createElement('li');
      const badge = document.createElement('b');
      badge.textContent = String(index + 1);
      li.append(badge, document.createTextNode(text));
      list.append(li);
    });
    const note = document.createElement('p');
    note.className = 'fine';
    note.textContent = 'On iOS 17 and earlier: Settings, then Safari, then Extensions.';
    setup.append(heading, list, note);
    const sites = document.createElement('button');
    sites.type = 'button';
    sites.className = 'ghost';
    sites.id = 'open-sites';
    sites.textContent = 'Sites';
    sites.addEventListener('click', () => {
      renderSites();
      show('sites');
    });
    sheet.append(today, setup, sites);
    show('home');
  }

  function renderSites() {
    const snap = state();
    const sheet = document.getElementById('sites-sheet');
    sheet.replaceChildren();
    const form = document.createElement('form');
    form.className = 'card';
    const field = document.createElement('input');
    field.type = 'text';
    field.id = 'site-field';
    field.placeholder = 'example.com';
    field.setAttribute('aria-label', 'Site');
    const add = document.createElement('button');
    add.type = 'submit';
    add.className = 'ghost';
    add.textContent = 'Pause this site';
    form.append(field, add);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const value = field.value.trim();
      if (!value) return;
      host.handle({ type: 'pause-site', host: value, paused: true });
      renderSites();
    });
    sheet.append(form);
    if (!snap.knownSites.length) {
      const empty = document.createElement('p');
      empty.className = 'fine';
      empty.id = 'sites-empty';
      empty.textContent = 'No paused sites yet. You can also pause the open site from the Safari popup.';
      sheet.append(empty);
    }
    snap.knownSites.forEach((name) => {
      const adsOn = snap.settings.disabledAds.indexOf(name) === -1 && snap.settings.pausedSites.indexOf(name) === -1;
      const aiOn = snap.settings.disabledAi.indexOf(name) === -1 && snap.settings.pausedSites.indexOf(name) === -1;
      const card = document.createElement('div');
      card.className = 'card site';
      const strong = document.createElement('strong');
      strong.textContent = name;
      const row = document.createElement('div');
      row.className = 'pair';
      row.append(siteToggle(name, 'Ads', adsOn, aiOn, true), siteToggle(name, 'AI', adsOn, aiOn, false));
      card.append(strong, row);
      sheet.append(card);
    });
  }

  function siteToggle(name, label, adsOn, aiOn, isAds) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'ghost';
    const on = isAds ? adsOn : aiOn;
    button.textContent = label + ': ' + (on ? 'on' : 'off');
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
    button.addEventListener('click', () => {
      host.handle({
        type: 'set-site',
        host: name,
        ads: isAds ? !adsOn : adsOn,
        ai: isAds ? aiOn : !aiOn,
      });
      renderSites();
    });
    return button;
  }

  function switchRow(id, title, detail, on, patch) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'switch-row';
    button.id = id;
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
    const copy = document.createElement('span');
    const strong = document.createElement('strong');
    strong.textContent = title;
    const small = document.createElement('small');
    small.textContent = detail;
    copy.append(strong, document.createElement('br'), small);
    const knob = document.createElement('span');
    knob.className = 'switch' + (on ? ' on' : '');
    button.append(copy, knob);
    button.addEventListener('click', () => {
      host.handle({ type: 'set-settings', patch: patch(!on) });
      renderSettings();
    });
    return button;
  }

  function renderSettings() {
    const snap = state();
    const settings = snap.settings;
    const sheet = document.getElementById('settings-sheet');
    sheet.replaceChildren();
    const look = document.createElement('div');
    look.className = 'card';
    const lookTitle = document.createElement('h2');
    lookTitle.textContent = 'Look';
    const modes = document.createElement('div');
    modes.className = 'modes';
    ['Visual', 'Clean'].forEach((label) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      const visual = label === 'Visual';
      button.setAttribute('aria-pressed', (settings.visual !== false) === visual ? 'true' : 'false');
      button.addEventListener('click', () => {
        host.handle({ type: 'set-settings', patch: { visual: visual } });
        renderSettings();
      });
      modes.append(button);
    });
    look.append(lookTitle, modes);

    const text = document.createElement('div');
    text.className = 'card';
    const beta = document.createElement('span');
    beta.className = 'pill';
    beta.textContent = 'Beta';
    text.append(
      beta,
      switchRow('text-detection-toggle', 'Text detection', 'Hides a long block at 80% or more. Placeholder score.', settings.textDetection !== false, (value) => ({ textDetection: value }))
    );

    const share = document.createElement('div');
    share.className = 'card';
    const shareTitle = document.createElement('h2');
    shareTitle.textContent = 'Feedback';
    const explain = document.createElement('p');
    explain.className = 'fine';
    explain.textContent = 'Off by default. If you turn sharing on, a review queue on this iPhone can hold the text (emails and numbers removed) or a media link, the site domain, the score, your answer, and the app version. History, cookies, logins, and private-tab pages are not included. This build does not upload anything.';
    const queue = document.createElement('div');
    queue.id = 'share-queue';
    if (!snap.queue.length) {
      const empty = document.createElement('p');
      empty.className = 'fine';
      empty.textContent = 'No corrections are waiting to be shared.';
      queue.append(empty);
    }
    snap.queue.forEach((item) => {
      const row = document.createElement('p');
      row.textContent = (item.kind || 'item') + ' · ' + item.verdict + ' · ' + (item.sharing && item.sharing.state);
      queue.append(row);
    });
    const clearShared = document.createElement('button');
    clearShared.type = 'button';
    clearShared.className = 'ghost';
    clearShared.textContent = "Delete what I've queued";
    clearShared.addEventListener('click', () => {
      host.handle({ type: 'clear-learning', scope: 'shared' });
      renderSettings();
    });
    const clearAll = document.createElement('button');
    clearAll.type = 'button';
    clearAll.className = 'ghost';
    clearAll.textContent = 'Delete on-device learning';
    clearAll.addEventListener('click', () => {
      host.handle({ type: 'clear-learning', scope: 'all' });
      renderSettings();
    });
    share.append(
      shareTitle,
      explain,
      switchRow('share-toggle', 'Share feedback', 'Default off. Nothing leaves this iPhone in this build.', settings.shareFeedback === true, (value) => ({ shareFeedback: value })),
      switchRow('review-toggle', 'Review before sending', 'You approve each one on this iPhone.', settings.reviewBeforeSending !== false, (value) => ({ reviewBeforeSending: value })),
      queue,
      clearShared,
      clearAll
    );

    const detectors = document.createElement('div');
    detectors.className = 'card';
    const detTitle = document.createElement('h2');
    detTitle.textContent = 'Detectors';
    detectors.append(detTitle);
    [
      ['text', 'Text', 'Beta · placeholder, not the proprietary model'],
      ['image', 'Image', 'Proprietary · not installed'],
      ['video', 'Video', 'Proprietary · not installed'],
      ['audio', 'Audio', 'Proprietary · not installed'],
    ].forEach((item) => {
      const row = document.createElement('div');
      row.className = 'row';
      const copy = document.createElement('span');
      const strong = document.createElement('strong');
      strong.textContent = item[1];
      const small = document.createElement('small');
      small.className = 'fine';
      small.textContent = item[2];
      copy.append(strong, document.createElement('br'), small);
      const count = document.createElement('strong');
      const info = snap.summary[item[0]];
      count.textContent = String(info && info.examples ? info.examples : 0);
      row.append(copy, count);
      detectors.append(row);
    });
    const tryButton = document.createElement('button');
    tryButton.type = 'button';
    tryButton.className = 'ghost';
    tryButton.id = 'try-placeholder';
    tryButton.textContent = 'Try the text placeholder';
    const result = document.createElement('p');
    result.className = 'fine';
    result.id = 'placeholder-result';
    tryButton.addEventListener('click', () => {
      const sample = "As an AI language model, it is important to note that in today's rapidly changing web we should delve into a tapestry of sources before publishing a long answer that is clearly over fifty words so the beta rule can run. This extra sentence is here so the block is long enough for the beta rule to judge it.";
      const detected = host.handle({ type: 'detect-text', text: sample }).response;
      const hide = window.BlokLogic.shouldHideText({
        confidence: detected.confidence,
        words: window.BlokLogic.wordCount(sample),
      });
      result.textContent = 'Placeholder ' + Math.round(detected.confidence * 100) + '% · ' + (hide ? 'would hide' : 'would show') + ' · Beta';
    });
    detectors.append(tryButton, result);
    sheet.append(look, text, share, detectors);
    show('settings');
  }

  function finishOnboarding() {
    host.handle({ type: 'set-settings', patch: { onboardingDone: true } });
    renderHome();
  }

  document.getElementById('onboard-next').addEventListener('click', () => {
    if (page < pages.length - 1) {
      page += 1;
      renderOnboarding();
      return;
    }
    finishOnboarding();
  });
  document.getElementById('onboard-skip').addEventListener('click', finishOnboarding);
  document.getElementById('open-settings').addEventListener('click', renderSettings);
  document.getElementById('settings-back').addEventListener('click', renderHome);
  document.getElementById('sites-back').addEventListener('click', renderHome);

  fetch('/blok/rules.json').then((res) => res.json()).then((rules) => {
    host = window.BlokLogic.createHost({ rules: rules, appVersion: '1.0.0' });
    window.__blokPreview = host;
    renderOnboarding();
    document.body.dataset.ready = '1';
  });
})();
