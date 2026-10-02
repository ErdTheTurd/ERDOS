/* First-launch intro. Shown once, skippable, and replayed from Settings.
   The last screen is the opt-in for shared retraining. Sharing stays off
   unless that button is pressed. */
const Onboarding = (() => {
  const SEEN = 'erdos-onboarding-seen';
  const slides = [
    {
      id: 'onboard-browser',
      kicker: 'Browser',
      title: 'A private browser.',
      body: 'ERDOS opens the web in its own view on this phone. Pages, history, and Blok stay here. There is no account.',
      mock: 'browser',
    },
    {
      id: 'onboard-blok',
      kicker: 'Blok',
      title: 'Ads and AI, hidden.',
      body: 'Blok blocks ads and known trackers, and hides AI Overviews and chat widgets. Tap the blue chip when you want one back.',
      mock: 'chips',
    },
    {
      id: 'onboard-text',
      kicker: 'Text · Beta',
      title: 'Blok thinks, and you can disagree.',
      body: 'Text detection is Beta. A long passage is covered only at 80% or more: “Blok thinks this is AI-written.” Under it: No, that\'s human and Yep, that\'s AI.',
      mock: 'text',
    },
    {
      id: 'onboard-tripletap',
      kicker: 'Triple tap',
      title: 'Mark it yourself.',
      body: 'Triple-tap selected text, or triple-tap an image, video, or audio clip, to mark it as AI. It hides behind the Blok overlay. Undo is on the toast.',
      mock: 'tap',
    },
    {
      id: 'onboard-erdai',
      kicker: 'ERDAI',
      title: 'AI help is optional.',
      body: 'ERDAI is off until you turn it on. A consent screen says what is sent and that it goes to Puter. Blok does not use ERDAI.',
      mock: 'erdai',
    },
    {
      id: 'onboard-notes',
      kicker: 'Notes and Arcade',
      title: 'Notes, files, and games.',
      body: 'Notes and Files stay on this phone. You can also open a text file from the Files app. Arcade has touch controls for Snake, Breakout, and Pong.',
      mock: 'extras',
    },
    {
      id: 'onboard-share',
      kicker: 'Learning',
      title: 'Sharing is off unless you opt in.',
      body: 'Corrections always train Blok on this phone. Sending them to improve the models is separate, optional, and off by default. This build does not upload anything.',
      mock: 'share',
    },
  ];

  let root = null;
  let index = 0;
  let replaying = false;
  let drag = null;

  function seen() {
    try { return localStorage.getItem(SEEN) === '1'; }
    catch (_) { return false; }
  }

  function markSeen() {
    try { localStorage.setItem(SEEN, '1'); }
    catch (_) { /* private mode */ }
  }

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([key, value]) => {
      if (key === 'className') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
      else if (value != null) node.setAttribute(key, value);
    });
    [].concat(children || []).forEach((child) => {
      if (child != null) node.append(child.nodeType ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  function mock(kind) {
    if (kind === 'browser') {
      return el('div', { className: 'mock-card' }, [
        el('div', { className: 'mock-url', text: 'Search or type a URL' }),
        el('strong', { text: 'One page at a time' }),
      ]);
    }
    if (kind === 'chips') {
      return el('div', { className: 'mock-card' }, [
        el('button', { className: 'mock-chip', type: 'button', text: 'Blok hid an ad' }),
        el('button', { className: 'mock-chip', type: 'button', text: 'Blok hid an AI Overview' }),
      ]);
    }
    if (kind === 'text') {
      return el('div', { className: 'mock-card mock-blue' }, [
        el('p', { text: 'Blok thinks this is AI-written (86% sure)' }),
        el('p', { className: 'mock-note', text: 'Text detection is Beta' }),
        el('div', { className: 'mock-pair' }, [
          el('span', { text: "No, that's human" }),
          el('span', { text: "Yep, that's AI" }),
        ]),
      ]);
    }
    if (kind === 'tap') {
      return el('div', { className: 'mock-card' }, [
        el('strong', { text: 'Text · image · video · audio' }),
        el('p', { className: 'mock-note', text: 'Triple tap · then Undo' }),
      ]);
    }
    if (kind === 'erdai') {
      return el('div', { className: 'mock-card' }, [
        el('strong', { text: 'ERDAI is off' }),
        el('div', { className: 'mock-pair' }, [
          el('span', { text: 'Turn on ERDAI' }),
          el('span', { text: 'Not now' }),
        ]),
      ]);
    }
    if (kind === 'extras') {
      return el('div', { className: 'mock-card' }, [
        el('strong', { text: 'Notes' }),
        el('p', { className: 'mock-note', text: 'Files on this phone' }),
        el('strong', { text: 'Arcade' }),
        el('p', { className: 'mock-note', text: 'Snake, Breakout, Pong' }),
      ]);
    }
    return el('div', { className: 'mock-card' }, [
      el('strong', { text: 'On this phone first' }),
      el('p', { className: 'mock-note', text: 'Sharing starts off' }),
    ]);
  }

  function go(next) {
    index = Math.max(0, Math.min(slides.length - 1, next));
    const track = root.querySelector('.onboard-track');
    track.style.transform = 'translateX(' + (-index * 100) + '%)';
    root.querySelectorAll('.onboard-slide').forEach((slide, i) => {
      slide.setAttribute('aria-hidden', i === index ? 'false' : 'true');
    });
    root.querySelectorAll('.onboard-dots button').forEach((dot, i) => {
      dot.setAttribute('aria-current', i === index ? 'true' : 'false');
    });
    const nextBtn = root.querySelector('#onboard-next');
    const last = index === slides.length - 1;
    nextBtn.hidden = last;
    nextBtn.textContent = 'Next';
  }

  function close() {
    if (root) root.remove();
    root = null;
    const theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.content = '#f5f7fb';
  }

  async function finish(choice) {
    markSeen();
    if (choice === 'share' || choice === 'local') {
      await window.erdos.blok.setShareChoice(choice);
    } else if (!replaying) {
      await window.erdos.blok.setShareChoice('local');
    }
    close();
  }

  function open(opts) {
    replaying = !!(opts && opts.replay);
    if (root) root.remove();
    index = 0;
    root = el('div', { id: 'onboarding', className: 'onboard', role: 'dialog', 'aria-label': 'Welcome to ERDOS' });
    const viewport = el('div', { className: 'onboard-viewport' });
    const track = el('div', { className: 'onboard-track' });
    slides.forEach((slide) => {
      const section = el('section', { className: 'onboard-slide', id: slide.id });
      section.append(
        el('p', { className: 'onboard-kicker', text: slide.kicker }),
        el('h1', { text: slide.title }),
        el('p', { className: 'onboard-body', text: slide.body }),
        mock(slide.mock)
      );
      if (slide.mock === 'share') {
        section.append(el('div', { className: 'pair onboard-choice' }, [
          el('button', { className: 'primary', type: 'button', id: 'onboard-share-yes', text: 'Share to improve Blok', onClick: () => finish('share') }),
          el('button', { className: 'ghost onboard-keep', type: 'button', id: 'onboard-keep', text: 'Keep it on my phone', onClick: () => finish('local') }),
        ]));
      }
      track.append(section);
    });
    viewport.append(track);
    const dots = el('div', { className: 'onboard-dots' });
    slides.forEach((slide, i) => {
      dots.append(el('button', {
        type: 'button',
        'aria-label': 'Page ' + (i + 1),
        onClick: () => go(i),
      }));
    });
    root.append(
      el('button', { className: 'onboard-skip', type: 'button', id: 'onboard-skip', text: 'Skip', onClick: () => finish(replaying ? null : 'local') }),
      viewport,
      el('div', { className: 'onboard-footer' }, [
        dots,
        el('button', { className: 'primary', type: 'button', id: 'onboard-next', text: 'Next', onClick: () => go(index + 1) }),
      ])
    );
    document.body.append(root);
    const theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.content = '#2F6BFF';
    bindSwipe(viewport, track);
    go(0);
  }

  function bindSwipe(viewport, track) {
    viewport.addEventListener('pointerdown', (event) => {
      if (event.target.closest('button')) return;
      drag = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
      track.style.transition = 'none';
      viewport.setPointerCapture(event.pointerId);
    });
    viewport.addEventListener('pointermove', (event) => {
      if (!drag || event.pointerId !== drag.pointer) return;
      const dx = event.clientX - drag.x;
      const base = -index * viewport.clientWidth;
      track.style.transform = 'translateX(' + (base + dx) + 'px)';
    });
    const end = (event) => {
      if (!drag || event.pointerId !== drag.pointer) return;
      const dx = event.clientX - drag.x;
      drag = null;
      track.style.transition = '';
      if (dx < -48) go(index + 1);
      else if (dx > 48) go(index - 1);
      else go(index);
    };
    viewport.addEventListener('pointerup', end);
    viewport.addEventListener('pointercancel', end);
  }

  async function openSettings() {
    const host = document.getElementById('settings-host');
    const settings = await window.erdos.blok.settings();
    host.innerHTML = '';
    const screen = el('div', { id: 'settings-screen', className: 'settings-screen', role: 'dialog', 'aria-label': 'Settings' });
    const shareOn = settings.shareFeedback === true;
    const shareRow = el('button', { className: 'switch-row', type: 'button', id: 'settings-share' });
    const paintShare = (on) => {
      shareRow.innerHTML = '';
      shareRow.append(
        el('span', { className: 'switch' + (on ? ' on' : '') }),
        el('span', {}, [
          el('strong', { text: 'Share feedback' }),
          document.createElement('br'),
          el('small', { text: on ? 'On. Items can be queued on this phone.' : 'Off. Corrections stay on this phone.' }),
        ])
      );
    };
    paintShare(shareOn);
    shareRow.addEventListener('click', async () => {
      const current = await window.erdos.blok.settings();
      const next = await window.erdos.blok.setShareChoice(current.shareFeedback ? 'local' : 'share');
      paintShare(next.shareFeedback === true);
    });
    screen.append(
      el('div', { className: 'panel-head' }, [
        el('h1', { text: 'Settings' }),
        el('button', { className: 'ghost', type: 'button', text: 'Done', onClick: () => { host.innerHTML = ''; } }),
      ]),
      el('p', { className: 'fine', text: 'The intro is shown once. You can play it again any time.' }),
      el('button', {
        className: 'primary',
        type: 'button',
        id: 'replay-intro',
        text: 'Replay intro',
        onClick: () => open({ replay: true }),
      }),
      shareRow,
      el('p', { className: 'fine', text: 'Text detection, Visual mode, and the review queue are on the Blok tab. Sharing stays off until you opt in.' })
    );
    host.append(screen);
    if (window.erdos.browser) window.erdos.browser.setVisible(false);
  }

  return { seen, open, openSettings };
})();
window.Onboarding = Onboarding;
