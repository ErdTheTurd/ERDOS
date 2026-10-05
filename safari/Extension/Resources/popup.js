(function () {
  const api = typeof browser !== 'undefined' ? browser : (typeof chrome !== 'undefined' ? chrome : null);
  const hostEl = document.getElementById('host');
  const countsEl = document.getElementById('counts');
  const adsToggle = document.getElementById('ads-toggle');
  const aiToggle = document.getElementById('ai-toggle');
  const adsNote = document.getElementById('ads-note');
  const aiNote = document.getElementById('ai-note');
  const pause = document.getElementById('pause');
  let href = '';
  let view = null;

  function send(message) {
    return new Promise((resolve) => {
      try {
        api.runtime.sendMessage(message, (response) => {
          const err = api.runtime.lastError;
          resolve(err ? { ok: false, error: err.message } : (response || { ok: false }));
        });
      } catch (error) {
        resolve({ ok: false, error: String(error) });
      }
    });
  }

  function paint(next) {
    view = next || view;
    if (!view || view.ok === false) {
      hostEl.textContent = 'Open a web page';
      return;
    }
    const host = view.host || 'This page';
    hostEl.textContent = host;
    const stats = view.stats || {};
    const items = [
      [stats.ads || 0, 'Ads'],
      [stats.text || 0, 'AI text'],
      [stats.image || 0, 'Images'],
      [stats.video || 0, 'Video'],
      [stats.audio || 0, 'Audio'],
    ];
    countsEl.replaceChildren();
    items.forEach((item) => {
      const cell = document.createElement('div');
      const strong = document.createElement('strong');
      strong.textContent = String(item[0]);
      const span = document.createElement('span');
      span.textContent = item[1];
      cell.append(strong, span);
      countsEl.append(cell);
    });
    const adsOn = view.adsOn !== false && view.adsGlobal !== false;
    const aiOn = view.aiOn !== false && view.aiGlobal !== false;
    adsToggle.setAttribute('aria-pressed', adsOn ? 'true' : 'false');
    aiToggle.setAttribute('aria-pressed', aiOn ? 'true' : 'false');
    adsNote.textContent = view.adsGlobal === false ? 'Ads are off everywhere' : (adsOn ? 'On for this site' : 'Off for this site');
    aiNote.textContent = view.aiGlobal === false ? 'AI is off everywhere' : (aiOn ? 'On for this site' : 'Off for this site');
    const paused = view.adsOn === false && view.aiOn === false;
    pause.textContent = paused ? 'Resume Blok on this site' : 'Pause Blok on this site';
    document.body.dataset.ready = '1';
  }

  async function refresh() {
    if (!api || !api.runtime) {
      hostEl.textContent = 'Blok needs Safari';
      return;
    }
    try {
      const tabs = await api.tabs.query({ active: true, currentWindow: true });
      href = (tabs[0] && tabs[0].url) || '';
    } catch (_) {
      href = '';
    }
    paint(await send({ type: 'get-popup', href: href }));
  }

  adsToggle.addEventListener('click', async () => {
    if (!view || !view.host) return;
    const ads = view.adsOn === false;
    await send({ type: 'set-site', host: view.host, ads: ads, ai: view.aiOn !== false, href: href });
    await refresh();
  });

  aiToggle.addEventListener('click', async () => {
    if (!view || !view.host) return;
    const ai = view.aiOn === false;
    await send({ type: 'set-site', host: view.host, ads: view.adsOn !== false, ai: ai, href: href });
    await refresh();
  });

  pause.addEventListener('click', async () => {
    if (!view || !view.host) return;
    const paused = view.adsOn === false && view.aiOn === false;
    await send({ type: 'pause-site', host: view.host, paused: !paused, href: href });
    await refresh();
  });

  refresh();
})();
