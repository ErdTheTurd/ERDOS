/* global windowManager, ErdOSProgress, ErdOSSound, ErdOSUI */

const ICONS = {
  browser: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M3 12h18M12 3c2.5 3 4 6 4 9s-1.5 6-4 9c-2.5-3-4-6-4-9s1.5-6 4-9z" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  erdai: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" fill="currentColor"/><circle cx="18.5" cy="17.5" r="2.2" fill="currentColor" opacity=".85"/></svg>',
  games: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="18" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 12h4M10 10v4M16.5 11.5h.01M18.2 13.5h.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  files: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7a2 2 0 012-2h4l2 2h6a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V7z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  notepad: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h8l4 4v14H7V3z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M15 3v4h4M9 11h6M9 15h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  sticky: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h9l5 5v11H6V4z" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M15 4v5h5" stroke="currentColor" stroke-width="1.4"/></svg>',
  music: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18a3 3 0 100-6 3 3 0 000 6zM9 15V5l10-2v10" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="19" cy="13" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
  trophies: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v5a4 4 0 01-8 0V4zM6 5H4v2a3 3 0 003 3M18 5h2v2a3 3 0 01-3 3M10 17h4M9 21h6M12 13v4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  calc: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="3" width="14" height="18" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M8 7h8M8 12h2M12 12h2M16 12h0M8 16h2M12 16h2M16 16h0" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 3v2M12 19v2M4.9 6.5l1.4 1.4M17.7 16.1l1.4 1.4M3 12h2M19 12h2M4.9 17.5l1.4-1.4M17.7 7.9l1.4-1.4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>',
  about: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 10v6M12 7.5h.01" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
};

function appIcon(id, glyph) {
  if (id === 'terminal') return glyph || '>_';
  return ICONS[id] || glyph || '?';
}

const APPS = [
  { id: 'browser', name: 'Browser', description: 'Simple web browsing', icon: appIcon('browser'), desktop: true, width: 980, height: 660, mount: mountBrowser },
  { id: 'erdai', name: 'ERDAI', description: 'Desktop AI via Puter', icon: appIcon('erdai'), desktop: true, width: 560, height: 660, mount: mountErdai },
  { id: 'games', name: 'Arcade', description: 'Snake, Breakout, Pong…', icon: appIcon('games'), desktop: true, width: 740, height: 580, mount: mountGames },
  { id: 'terminal', name: 'Terminal', description: 'CRT command line', glyph: '>_', icon: '>_', desktop: true, width: 680, height: 480, mount: mountTerminal },
  { id: 'files', name: 'Files', description: 'Browse ErdOS home', icon: appIcon('files'), desktop: true, width: 720, height: 520, mount: mountFiles },
  { id: 'notepad', name: 'Notepad', description: 'Write documents', icon: appIcon('notepad'), desktop: true, width: 640, height: 480, mount: mountNotepad },
  { id: 'sticky', name: 'Sticky Notes', description: 'Quick thoughts', icon: appIcon('sticky'), desktop: false, width: 360, height: 320, mount: mountSticky },
  { id: 'music', name: 'Music Box', description: 'Ambient phosphor loops', icon: appIcon('music'), desktop: false, width: 420, height: 360, mount: mountMusic },
  { id: 'trophies', name: 'High Scores', description: 'Arcade bests', icon: appIcon('trophies'), desktop: false, width: 520, height: 420, mount: mountTrophies },
  { id: 'calc', name: 'Calculator', description: 'Quick math', icon: appIcon('calc'), desktop: false, width: 360, height: 460, mount: mountCalculator },
  { id: 'settings', name: 'Settings', description: 'Theme, sound, system', icon: appIcon('settings'), desktop: false, width: 580, height: 560, mount: mountSettings },
  { id: 'about', name: 'About ErdOS', description: 'Version and credits', icon: appIcon('about'), desktop: false, width: 480, height: 380, mount: mountAbout },
];

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'html') node.innerHTML = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value !== undefined && value !== null) node.setAttribute(key, value);
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

function mountBrowser(body) {
  const root = el('div', { className: 'app-root browser-app' });
  const urlInput = el('input', {
    type: 'text',
    className: 'browser-url',
    value: '',
    placeholder: 'Search or enter address',
    spellcheck: 'false',
  });
  const loading = el('div', { className: 'browser-loading' });
  const homeHtml = `data:text/html;charset=utf-8,${encodeURIComponent(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    :root{color-scheme:dark}
    body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Outfit,system-ui,sans-serif;
      background:radial-gradient(ellipse at 30% 20%,rgba(47,224,184,.14),transparent 45%),
      radial-gradient(ellipse at 80% 70%,rgba(58,180,216,.12),transparent 40%),#031018;color:#e6f7f4}
    main{text-align:center;padding:48px 24px;max-width:28rem}
    h1{margin:0;font-size:2.6rem;letter-spacing:-.04em;color:#7dffc8}
    p{margin:12px 0 0;color:#8aa8a2;line-height:1.5}
  </style></head><body><main><h1>ErdOS</h1><p>Type a URL or search above. Keep it simple.</p></main></body></html>`)}`;

  const frame = el('webview', { className: 'browser-frame', src: homeHtml, allowpopups: 'true' });

  const go = (raw) => {
    let url = (raw ?? urlInput.value).trim();
    if (!url) {
      urlInput.value = '';
      frame.setAttribute('src', homeHtml);
      return;
    }
    if (!/^https?:\/\//i.test(url) && !url.startsWith('about:') && !url.startsWith('data:')) {
      if (url.includes('.') && !url.includes(' ')) url = `https://${url}`;
      else url = `https://duckduckgo.com/?q=${encodeURIComponent(url)}`;
    }
    urlInput.value = url;
    loading.classList.add('is-on');
    frame.setAttribute('src', url);
  };

  const bar = el('div', { className: 'browser-bar' }, [
    el('button', { className: 'browser-icon-btn', type: 'button', title: 'Back', html: '←', onClick: () => { try { frame.goBack(); } catch (_) {} } }),
    el('button', { className: 'browser-icon-btn', type: 'button', title: 'Forward', html: '→', onClick: () => { try { frame.goForward(); } catch (_) {} } }),
    el('button', { className: 'browser-icon-btn', type: 'button', title: 'Reload', html: '↻', onClick: () => { try { frame.reload(); } catch (_) { frame.src = frame.src; } } }),
    urlInput,
    el('button', { className: 'app-btn', type: 'button', text: 'Go', onClick: () => go() }),
  ]);

  root.append(bar, loading, el('div', { className: 'app-content flush' }, [frame]));
  urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  frame.addEventListener('did-navigate', (e) => {
    if (e.url && !e.url.startsWith('data:')) urlInput.value = e.url;
    loading.classList.remove('is-on');
  });
  frame.addEventListener('did-finish-load', () => loading.classList.remove('is-on'));
  frame.addEventListener('page-title-updated', (e) => {
    if (e.title && body.__windowApi) body.__windowApi.setTitle(`Browser — ${e.title}`);
  });
  body.append(root);
  setTimeout(() => urlInput.focus(), 40);
}


function mountErdai(body) {
  const root = el('div', { className: 'app-root' });
  const chat = el('div', { className: 'erdai-chat' });
  const input = el('input', { type: 'text', placeholder: 'Message ERDAI…', autocomplete: 'off' });
  const sendBtn = el('button', { className: 'app-btn', type: 'button', text: 'Send' });
  const status = el('div', { className: 'erdai-status', text: ErdAI.available() ? 'Powered by Puter AI' : 'Loading Puter…' });
  const history = [];
  const name = ErdOSProgress.get()?.displayName || '';

  const push = (text, who) => {
    chat.append(el('div', { className: `erdai-msg ${who}`, text }));
    chat.scrollTop = chat.scrollHeight;
  };

  push(
    name
      ? `Hi ${name}. I'm ERDAI — a real AI assistant in ErdOS (via Puter). Ask me anything.`
      : "Hi. I'm ERDAI — a real AI assistant in ErdOS (via Puter). Ask me anything.",
    'bot'
  );

  const send = async () => {
    const text = input.value.trim();
    if (!text || sendBtn.disabled) return;
    push(text, 'user');
    input.value = '';
    sendBtn.disabled = true;
    sendBtn.textContent = '…';
    status.textContent = 'Thinking…';

    const remember = text.match(/^remember (?:that )?(.+)/i);
    if (remember) {
      await ErdOSProgress.rememberErdai(remember[1]);
      const reply = `Got it — I'll remember: "${remember[1]}".`;
      push(reply, 'bot');
      history.push({ role: 'user', content: text }, { role: 'assistant', content: reply });
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send';
      status.textContent = 'Powered by Puter AI';
      return;
    }
    const nameMatch = text.match(/^my name is (.+)/i);
    if (nameMatch) {
      const n = nameMatch[1].replace(/[.!?]+$/, '').trim();
      await ErdOSProgress.setDisplayName(n);
      await ErdOSProgress.rememberErdai(`User's name is ${n}`);
      const reply = `Nice to meet you, ${n}.`;
      push(reply, 'bot');
      history.push({ role: 'user', content: text }, { role: 'assistant', content: reply });
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send';
      status.textContent = 'Powered by Puter AI';
      return;
    }

    try {
      if (!ErdAI.available()) await new Promise((r) => setTimeout(r, 500));
      const reply = await ErdAI.chat(text, history);
      push(reply, 'bot');
      history.push({ role: 'user', content: text }, { role: 'assistant', content: reply });
      status.textContent = 'Powered by Puter AI';
    } catch (err) {
      const msg = err?.message || String(err);
      push(
        /sign|auth|login|popup/i.test(msg)
          ? 'Puter needs a quick sign-in the first time (a popup may appear). After that, chat works normally.'
          : `Couldn't reach Puter AI: ${msg}`,
        'bot'
      );
      status.textContent = 'Sign in via Puter if prompted';
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = 'Send';
    }
  };

  sendBtn.addEventListener('click', send);
  root.append(
    status,
    chat,
    el('div', { className: 'erdai-compose' }, [input, sendBtn])
  );
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') send(); });
  body.append(root);
  setTimeout(() => input.focus(), 50);
}


function mountGames(body) {
  const root = el('div', { className: 'app-root' });
  const content = el('div', { className: 'app-content' });
  const showMenu = () => {
    content.innerHTML = '';
    const scores = ErdOSProgress.get()?.highScores || {};
    content.append(
      el('div', { className: 'arcade-banner', text: '◆ ErdOS Arcade Cabinet ◆' }),
      el('div', { className: 'games-grid' }, [
        gameLaunch('Snake', `Best ${scores.snake || 0}`, () => runSnake(content, showMenu)),
        gameLaunch('Breakout', `Best ${scores.breakout || 0}`, () => runBreakout(content, showMenu)),
        gameLaunch('Memory', 'Match pairs', () => runMemory(content, showMenu)),
        gameLaunch('Pong', `Best ${scores.pong || 0}`, () => runPong(content, showMenu)),
      ])
    );
  };
  root.append(content);
  body.append(root);
  showMenu();
}

function gameLaunch(title, blurb, onClick) {
  return el('button', {
    className: 'game-card',
    type: 'button',
    onClick: () => {
      ErdOSProgress.onGamePlayed();
      onClick();
    },
  }, [el('strong', { text: title }), el('small', { text: blurb })]);
}

function runSnake(content, back) {
  content.innerHTML = '';
  const scoreEl = el('div', { className: 'game-score', text: 'Score: 0' });
  const canvas = el('canvas', { width: '400', height: '400' });
  const ctx = canvas.getContext('2d');
  const cell = 20;
  let snake = [{ x: 8, y: 8 }];
  let dir = { x: 1, y: 0 };
  let nextDir = { ...dir };
  let food = { x: 12, y: 10 };
  let score = 0;
  let alive = true;
  const onKey = (e) => {
    const map = { ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 }, ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 } };
    const d = map[e.key];
    if (!d || (d.x + dir.x === 0 && d.y + dir.y === 0)) return;
    nextDir = d;
    e.preventDefault();
  };
  window.addEventListener('keydown', onKey);
  const timer = setInterval(() => {
    if (!alive) return;
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (head.x < 0 || head.y < 0 || head.x >= 20 || head.y >= 20 || snake.some((s) => s.x === head.x && s.y === head.y)) {
      alive = false;
      scoreEl.textContent = `Game over — ${score}`;
      ErdOSProgress.recordHighScore('snake', score);
      return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      scoreEl.textContent = `Score: ${score}`;
      food = { x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20) };
    } else snake.pop();
    ctx.fillStyle = '#020a10';
    ctx.fillRect(0, 0, 400, 400);
    ctx.fillStyle = '#2fe0b8';
    snake.forEach((s, i) => {
      ctx.globalAlpha = i === 0 ? 1 : 0.75;
      ctx.fillRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2);
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#3ab4d8';
    ctx.fillRect(food.x * cell + 1, food.y * cell + 1, cell - 2, cell - 2);
  }, 110);
  content.append(el('div', { className: 'game-stage' }, [
    el('button', { className: 'app-btn ghost', type: 'button', text: '← Back', onClick: () => { clearInterval(timer); window.removeEventListener('keydown', onKey); back(); } }),
    scoreEl,
    canvas,
  ]));
}

function runBreakout(content, back) {
  content.innerHTML = '';
  const scoreEl = el('div', { className: 'game-score', text: 'Score: 0' });
  const canvas = el('canvas', { width: '480', height: '360' });
  const ctx = canvas.getContext('2d');
  let paddle = { x: 200, w: 80, h: 12 };
  let ball = { x: 240, y: 280, vx: 3.2, vy: -3.4, r: 7 };
  let score = 0;
  let bricks = [];
  for (let r = 0; r < 5; r++) for (let c = 0; c < 8; c++) bricks.push({ x: 20 + c * 55, y: 30 + r * 22, w: 48, h: 16, alive: true });
  const keys = { left: false, right: false };
  const onKeyDown = (e) => { if (e.key === 'ArrowLeft') keys.left = true; if (e.key === 'ArrowRight') keys.right = true; };
  const onKeyUp = (e) => { if (e.key === 'ArrowLeft') keys.left = false; if (e.key === 'ArrowRight') keys.right = false; };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  const timer = setInterval(() => {
    if (keys.left) paddle.x -= 6;
    if (keys.right) paddle.x += 6;
    paddle.x = Math.max(0, Math.min(480 - paddle.w, paddle.x));
    ball.x += ball.vx;
    ball.y += ball.vy;
    if (ball.x < ball.r || ball.x > 480 - ball.r) ball.vx *= -1;
    if (ball.y < ball.r) ball.vy *= -1;
    if (ball.y > 360) {
      ErdOSProgress.recordHighScore('breakout', score);
      ball = { x: 240, y: 280, vx: 3.2, vy: -3.4, r: 7 };
      scoreEl.textContent = `Missed! Score: ${score}`;
    }
    if (ball.y + ball.r >= 348 && ball.x > paddle.x && ball.x < paddle.x + paddle.w && ball.vy > 0) {
      ball.vy *= -1;
      ball.vx += (ball.x - (paddle.x + paddle.w / 2)) * 0.08;
    }
    for (const b of bricks) {
      if (!b.alive) continue;
      if (ball.x > b.x && ball.x < b.x + b.w && ball.y - ball.r < b.y + b.h && ball.y + ball.r > b.y) {
        b.alive = false;
        ball.vy *= -1;
        score += 5;
        scoreEl.textContent = `Score: ${score}`;
      }
    }
    ctx.fillStyle = '#020a10';
    ctx.fillRect(0, 0, 480, 360);
    ctx.fillStyle = '#2fe0b8';
    ctx.fillRect(paddle.x, 348, paddle.w, paddle.h);
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = '#e6f7f4';
    ctx.fill();
    bricks.forEach((b, i) => {
      if (!b.alive) return;
      ctx.fillStyle = i % 2 ? '#3ab4d8' : '#2fe0b8';
      ctx.fillRect(b.x, b.y, b.w, b.h);
    });
  }, 16);
  content.append(el('div', { className: 'game-stage' }, [
    el('button', { className: 'app-btn ghost', type: 'button', text: '← Back', onClick: () => { clearInterval(timer); window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); ErdOSProgress.recordHighScore('breakout', score); back(); } }),
    scoreEl,
    canvas,
  ]));
}

function runMemory(content, back) {
  content.innerHTML = '';
  const symbols = ['◆', '●', '▲', '■', '★', '✚', '◆', '●', '▲', '■', '★', '✚'];
  for (let i = symbols.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [symbols[i], symbols[j]] = [symbols[j], symbols[i]];
  }
  let first = null;
  let lock = false;
  let matched = 0;
  const status = el('div', { className: 'game-score', text: 'Find the pairs' });
  const grid = el('div', { className: 'games-grid', style: 'grid-template-columns: repeat(4, 1fr); max-width: 360px;' });
  symbols.forEach((sym) => {
    const card = el('button', { className: 'game-card', type: 'button', text: '?', style: 'min-height: 72px; font-size: 1.4rem; text-align: center;' });
    card.dataset.sym = sym;
    card.addEventListener('click', () => {
      if (lock || card.classList.contains('matched') || card === first) return;
      card.textContent = sym;
      if (!first) { first = card; return; }
      if (first.dataset.sym === sym) {
        card.classList.add('matched');
        first.classList.add('matched');
        first = null;
        matched += 2;
        if (matched === symbols.length) {
          status.textContent = 'Board cleared!';
          ErdOSProgress.recordHighScore('memory', Math.max(100, (ErdOSProgress.get()?.highScores?.memory || 0) + 1));
        }
      } else {
        lock = true;
        const a = first;
        setTimeout(() => { a.textContent = '?'; card.textContent = '?'; first = null; lock = false; }, 550);
      }
    });
    grid.append(card);
  });
  content.append(el('div', { className: 'game-stage' }, [
    el('button', { className: 'app-btn ghost', type: 'button', text: '← Back', onClick: back }),
    status,
    grid,
  ]));
}

function runPong(content, back) {
  content.innerHTML = '';
  const scoreEl = el('div', { className: 'game-score', text: 'You 0 · CPU 0' });
  const canvas = el('canvas', { width: '480', height: '320' });
  const ctx = canvas.getContext('2d');
  let player = { y: 120 };
  let cpu = { y: 120 };
  let ball = { x: 240, y: 160, vx: 3.5, vy: 2.2 };
  let you = 0;
  let them = 0;
  const keys = { up: false, down: false };
  const onKeyDown = (e) => { if (e.key === 'ArrowUp') keys.up = true; if (e.key === 'ArrowDown') keys.down = true; };
  const onKeyUp = (e) => { if (e.key === 'ArrowUp') keys.up = false; if (e.key === 'ArrowDown') keys.down = false; };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  const timer = setInterval(() => {
    if (keys.up) player.y -= 5;
    if (keys.down) player.y += 5;
    player.y = Math.max(0, Math.min(260, player.y));
    const target = ball.y - 30;
    cpu.y += Math.sign(target - cpu.y) * Math.min(3.2, Math.abs(target - cpu.y));
    cpu.y = Math.max(0, Math.min(260, cpu.y));
    ball.x += ball.vx;
    ball.y += ball.vy;
    if (ball.y < 6 || ball.y > 314) ball.vy *= -1;
    if (ball.x < 24 && ball.y > player.y && ball.y < player.y + 60) ball.vx = Math.abs(ball.vx) * 1.02;
    if (ball.x > 456 && ball.y > cpu.y && ball.y < cpu.y + 60) ball.vx = -Math.abs(ball.vx) * 1.02;
    if (ball.x < 0) {
      them += 1;
      ball = { x: 240, y: 160, vx: 3.5, vy: 2.2 };
      scoreEl.textContent = `You ${you} · CPU ${them}`;
    }
    if (ball.x > 480) {
      you += 1;
      scoreEl.textContent = `You ${you} · CPU ${them}`;
      ErdOSProgress.recordHighScore('pong', you);
      ball = { x: 240, y: 160, vx: -3.5, vy: 2.2 };
    }
    ctx.fillStyle = '#020a10';
    ctx.fillRect(0, 0, 480, 320);
    ctx.fillStyle = '#2fe0b8';
    ctx.fillRect(12, player.y, 10, 60);
    ctx.fillRect(458, cpu.y, 10, 60);
    ctx.fillRect(238, 0, 4, 320);
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#e6f7f4';
    ctx.fill();
  }, 16);
  content.append(el('div', { className: 'game-stage' }, [
    el('button', { className: 'app-btn ghost', type: 'button', text: '← Back', onClick: () => { clearInterval(timer); window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); ErdOSProgress.recordHighScore('pong', you); back(); } }),
    scoreEl,
    canvas,
  ]));
}

function mountTerminal(body) {
  const root = el('div', { className: 'term-root' });
  const out = el('div', { className: 'term-out' });
  const input = el('input', { spellcheck: 'false', autocomplete: 'off' });
  let amber = false;
  const print = (t) => { out.textContent += `${t}\n`; out.scrollTop = out.scrollHeight; };
  print('ErdOS Terminal v1.1 — type `help`');
  const run = async (cmd) => {
    const c = cmd.trim();
    const [name, ...args] = c.split(/\s+/);
    print(`> ${c}`);
    if (!name) return;
    if (name === 'help') print('Commands: help, clear, neofetch, date, whoami, hack, amber, snake, echo');
    else if (name === 'clear') out.textContent = '';
    else if (name === 'neofetch') {
      const s = await window.erdos.getSystemInfo();
      const p = ErdOSProgress.get();
      print(`        #####\n       #######     ${p?.displayName || 'user'}@ErdOS\n       ##O#O##     -----------\n       #######     OS: ErdOS ${s.version}\n     ###########   Host: ${s.hostname}\n    #############  Kernel: Phosphor Glass\n   ############### CPU: ${s.cpus} · RAM: ${s.memoryGB}G\n   ##  #######  ## Theme: Phosphor Glass\n  ###  ##   ##  ### Shell: erdai`);
    } else if (name === 'date') print(new Date().toString());
    else if (name === 'whoami') print(ErdOSProgress.get()?.displayName || 'erdos-user');
    else if (name === 'hack') {
      print('Initiating friendly hack...');
      for (let i = 0; i < 5; i++) print(`0x${(Math.random() * 0xfffff | 0).toString(16)}  OK`);
      print('Access granted. (Simulation complete.)');
    } else if (name === 'amber') {
      amber = !amber;
      out.classList.toggle('amber', amber);
      print(amber ? 'Amber phosphor engaged.' : 'Green phosphor restored.');
    } else if (name === 'snake') {
      print('Launching Arcade…');
      windowManager.open('games');
    } else if (name === 'echo') print(args.join(' '));
    else {
      print(`command not found: ${name}`);
      ErdOSSound.error();
    }
  };
  root.append(
    out,
    el('div', { className: 'term-line' }, [el('span', { text: '›' }), input])
  );
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const v = input.value;
      input.value = '';
      run(v);
    }
  });
  body.append(root);
  setTimeout(() => input.focus(), 40);
}

function mountFiles(body) {
  const root = el('div', { className: 'app-root' });
  const pathInput = el('input', { type: 'text', spellcheck: 'false' });
  const list = el('div', { className: 'file-list' });
  let current = '';
  const load = async (target) => {
    try {
      const data = await window.erdos.listDir(target || undefined);
      current = data.path;
      pathInput.value = current;
      list.innerHTML = '';
      const parent = current.replace(/[\\/][^\\/]+$/, '') || current;
      list.append(el('button', { className: 'file-row', type: 'button', onClick: () => load(parent) }, [
        el('span', { className: 'type', text: 'UP' }),
        el('span', { text: '..' }),
      ]));
      for (const entry of data.entries) {
        const full = `${current}${current.includes('\\') ? '\\' : '/'}${entry.name}`;
        list.append(el('button', {
          className: 'file-row',
          type: 'button',
          onClick: async () => {
            if (entry.isDirectory) load(full);
            else if (/\.(txt|md|json|js|css|html|log|csv)$/i.test(entry.name)) windowManager.open('notepad', { filePath: full });
          },
        }, [
          el('span', { className: 'type', text: entry.isDirectory ? 'DIR' : 'FILE' }),
          el('span', { text: entry.name }),
        ]));
      }
    } catch (err) {
      list.innerHTML = '';
      list.append(el('p', { text: String(err.message || err) }));
    }
  };
  root.append(
    el('div', { className: 'app-toolbar' }, [
      el('button', { className: 'app-btn ghost', type: 'button', text: 'Refresh', onClick: () => load(current) }),
      pathInput,
      el('button', { className: 'app-btn', type: 'button', text: 'Go', onClick: () => load(pathInput.value.trim()) }),
      el('button', {
        className: 'app-btn ghost',
        type: 'button',
        text: 'New Folder',
        onClick: async () => {
          const name = prompt('Folder name');
          if (!name) return;
          const sep = current.includes('\\') ? '\\' : '/';
          await window.erdos.createFolder(`${current}${sep}${name}`);
          load(current);
        },
      }),
    ]),
    el('div', { className: 'app-content' }, [list])
  );
  pathInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') load(pathInput.value.trim()); });
  body.append(root);
  load();
}

function mountNotepad(body, opts = {}) {
  const root = el('div', { className: 'app-root' });
  const area = el('textarea', { className: 'notepad-area', spellcheck: 'false' });
  let filePath = opts.filePath || null;
  const setTitle = () => {
    if (body.__windowApi) body.__windowApi.setTitle(filePath ? `Notepad — ${filePath.split(/[\\/]/).pop()}` : 'Notepad');
  };
  const openFile = async (path) => {
    area.value = await window.erdos.readFile(path);
    filePath = path;
    setTitle();
  };
  root.append(
    el('div', { className: 'app-toolbar' }, [
      el('button', {
        className: 'app-btn ghost',
        type: 'button',
        text: 'Open',
        onClick: async () => {
          const path = await window.erdos.pickOpenPath();
          if (path) openFile(path);
        },
      }),
      el('button', {
        className: 'app-btn',
        type: 'button',
        text: 'Save',
        onClick: async () => {
          let path = filePath;
          if (!path) path = await window.erdos.pickSavePath('untitled.txt');
          if (!path) return;
          await window.erdos.writeFile(path, area.value);
          filePath = path;
          setTitle();
          await ErdOSProgress.onNoteSaved();
          ErdOSUI.toast('Saved', path.split(/[\\/]/).pop(), 'info');
        },
      }),
    ]),
    el('div', { className: 'app-content flush' }, [area])
  );
  body.append(root);
  if (filePath) openFile(filePath).catch((e) => { area.value = String(e.message || e); });
  setTimeout(() => area.focus(), 40);
}

function mountSticky(body) {
  const area = el('textarea', { className: 'sticky-area', placeholder: 'Jot something…', spellcheck: 'false' });
  const key = 'erdos-sticky';
  area.value = localStorage.getItem(key) || '';
  area.addEventListener('input', () => localStorage.setItem(key, area.value));
  body.append(el('div', { className: 'app-root' }, [el('div', { className: 'app-content flush' }, [area])]));
}

function mountMusic(body) {
  const root = el('div', { className: 'app-root' });
  const viz = el('div', { className: 'music-viz' }, [1, 2, 3, 4, 5].map(() => el('span')));
  let playing = false;
  let nodes = [];
  let ctx = null;

  const stop = () => {
    nodes.forEach((n) => { try { n.stop(); } catch (_) {} });
    nodes = [];
    playing = false;
    viz.classList.remove('is-playing');
  };

  const play = () => {
    if (ErdOSSound.isMuted()) {
      ErdOSUI.toast('Sound muted', 'Unmute in Settings', 'info');
      return;
    }
    stop();
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const freqs = [110, 164.81, 196, 246.94];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i % 2 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      g.gain.value = 0.03;
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start();
      nodes.push(osc);
    });
    playing = true;
    viz.classList.add('is-playing');
  };

  root.append(el('div', { className: 'music-panel' }, [
    el('h3', { text: 'Music Box', style: 'margin:0' }),
    el('p', { text: 'Soft ambient phosphor drones.', style: 'margin:0;color:var(--text-dim)' }),
    viz,
    el('div', { style: 'display:flex;gap:8px' }, [
      el('button', { className: 'app-btn', type: 'button', text: 'Play', onClick: play }),
      el('button', { className: 'app-btn ghost', type: 'button', text: 'Stop', onClick: stop }),
    ]),
  ]));
  body.append(root);
  body.__windowApi && body.addEventListener('remove', stop);
}

function mountTrophies(body) {
  const root = el('div', { className: 'app-root' });
  const content = el('div', { className: 'app-content' });
  const render = () => {
    const scores = ErdOSProgress.get()?.highScores || {};
    content.innerHTML = '';
    content.append(
      el('div', { className: 'settings-card' }, [
        el('h3', { text: 'Arcade high scores' }),
        el('p', { text: 'Just for fun — no XP attached.' }),
        el('ul', { className: 'score-list' }, [
          el('li', { text: `Snake — ${scores.snake || 0}` }),
          el('li', { text: `Breakout — ${scores.breakout || 0}` }),
          el('li', { text: `Pong — ${scores.pong || 0}` }),
          el('li', { text: `Memory — play to match` }),
        ]),
      ])
    );
  };
  root.append(content);
  body.append(root);
  render();
  ErdOSProgress.onChange(render);
}


function mountCalculator(body) {
  const root = el('div', { className: 'app-root' });
  const display = el('div', { className: 'calc-display', text: '0' });
  let expr = '';
  const set = (v) => { expr = v; display.textContent = expr || '0'; };
  const press = (key) => {
    if (key === 'C') return set('');
    if (key === '=') {
      try {
        if (!/^[\d.\s+\-*/()]+$/.test(expr)) throw new Error('bad');
        const result = Function(`"use strict"; return (${expr})`)();
        set(String(result));
      } catch {
        set('Error');
        ErdOSSound.error();
        setTimeout(() => set(''), 800);
      }
      return;
    }
    if (expr === 'Error') expr = '';
    set(expr + key);
  };
  const keys = ['7', '8', '9', '/', '4', '5', '6', '*', '1', '2', '3', '-', '0', '.', '=', '+', 'C'];
  const grid = el('div', { className: 'calc-grid' }, [display]);
  keys.forEach((k) => {
    grid.append(el('button', {
      className: `calc-key${/[+\-*/=]/.test(k) ? ' op' : ''}`,
      type: 'button',
      text: k,
      onClick: () => press(k),
    }));
  });
  root.append(grid);
  body.append(root);
}

function mountSettings(body) {
  const root = el('div', { className: 'app-root' });
  const panel = el('div', { className: 'settings-panel' });
  const info = el('div', { className: 'settings-card' }, [el('h3', { text: 'System' }), el('p', { text: 'Loading…' })]);
  const p = ErdOSProgress.get() || {};

  const themes = [
    { id: '', label: 'Teal Depth', colors: ['#2fe0b8', '#030d14'] },
    { id: 'theme-ember', label: 'Ember', colors: ['#ff8a5c', '#1a0c08'] },
    { id: 'theme-violet-night', label: 'Violet Night', colors: ['#9b8cff', '#120c22'] },
    { id: 'theme-forest', label: 'Forest', colors: ['#7dcf8a', '#07140c'] },
  ];
  const swatches = el('div', { className: 'theme-swatches' });
  themes.forEach((t) => {
    const btn = el('button', {
      className: 'theme-swatch',
      type: 'button',
      title: t.label,
      style: `background: linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})`,
      onClick: async () => {
        document.body.classList.remove('theme-ember', 'theme-violet-night', 'theme-forest');
        if (t.id) document.body.classList.add(t.id);
        localStorage.setItem('erdos-theme', t.id);
        await ErdOSProgress.onThemeChanged(t.id);
        swatches.querySelectorAll('.theme-swatch').forEach((s) => s.classList.remove('is-active'));
        btn.classList.add('is-active');
        ErdOSSound.click();
      },
    });
    if ((localStorage.getItem('erdos-theme') || '') === t.id) btn.classList.add('is-active');
    swatches.append(btn);
  });

  const walls = el('div', { className: 'wall-swatches' });
  Object.entries(ErdOSProgress.WALLPAPERS).forEach(([id, label]) => {
    const btn = el('button', {
      className: `wall-swatch wallpaper-${id}`,
      type: 'button',
      title: label,
      onClick: async () => {
        await ErdOSProgress.setWallpaper(id);
        const wp = document.getElementById('wallpaper');
        wp.className = `wallpaper wallpaper-${id}`;
        walls.querySelectorAll('.wall-swatch').forEach((s) => s.classList.remove('is-active'));
        btn.classList.add('is-active');
      },
    });
    if (p.wallpaper === id) btn.classList.add('is-active');
    walls.append(btn);
  });

  const nameInput = el('input', { className: 'app-field', type: 'text', value: p.displayName || '', placeholder: 'Display name for ERDAI' });
  const muteBtn = el('button', {
    className: 'app-btn',
    type: 'button',
    text: p.muted ? 'Sound: Off' : 'Sound: On',
    onClick: async () => {
      await ErdOSProgress.setMuted(!ErdOSProgress.get().muted);
      muteBtn.textContent = ErdOSProgress.get().muted ? 'Sound: Off' : 'Sound: On';
    },
  });

  panel.append(
    el('div', { className: 'settings-card' }, [
      el('h3', { text: 'Accent theme' }),
      el('p', { text: 'Pick a glass accent. All themes are unlocked.' }),
      swatches,
    ]),
    el('div', { className: 'settings-card' }, [
      el('h3', { text: 'Wallpaper' }),
      el('p', { text: 'Phosphor atmospheres for the desktop.' }),
      walls,
    ]),
    el('div', { className: 'settings-card' }, [
      el('h3', { text: 'Profile & sound' }),
      nameInput,
      el('div', { style: 'display:flex;gap:8px;margin-top:10px;flex-wrap:wrap' }, [
        el('button', {
          className: 'app-btn',
          type: 'button',
          text: 'Save name',
          onClick: async () => {
            await ErdOSProgress.setDisplayName(nameInput.value.trim());
            ErdOSUI.toast('Saved', 'ERDAI will use your name', 'info');
          },
        }),
        muteBtn,
        el('button', {
          className: 'app-btn ghost',
          type: 'button',
          text: 'Check updates',
          onClick: async () => {
            const r = await window.erdos.checkUpdates();
            if (r.status === 'dev') ErdOSUI.toast('Dev mode', 'Updates apply to packaged builds', 'info');
            else ErdOSUI.toast('Update check', r.version ? `Latest seen: ${r.version}` : r.status, 'info');
          },
        }),
        el('button', {
          className: 'app-btn ghost',
          type: 'button',
          text: 'Reset preferences',
          onClick: async () => {
            if (confirm('Reset wallpapers, scores, and ERDAI memory?')) {
              await ErdOSProgress.resetProgress();
              ErdOSUI.toast('Reset', 'Preferences cleared', 'info');
            }
          },
        }),
      ]),
    ]),
    info
  );
  root.append(el('div', { className: 'app-content' }, [panel]));
  body.append(root);
  window.erdos.getSystemInfo().then((sys) => {
    info.innerHTML = '';
    info.append(
      el('h3', { text: 'System' }),
      el('p', {
        text: `ErdOS ${sys.version} · ${sys.platform}/${sys.arch}\nHost: ${sys.hostname}\nCPUs: ${sys.cpus} · RAM: ${sys.freememGB}/${sys.memoryGB} GB free\nHome: ${sys.home}`,
      })
    );
  });
}


function mountAbout(body) {
  body.append(el('div', { className: 'app-root' }, [
    el('div', { className: 'app-content' }, [
      el('div', { className: 'settings-card' }, [
        el('h3', { text: 'ErdOS' }),
        el('p', {
          text: 'Phosphor Glass desktop for Windows, macOS & Linux.\nRuns in a normal app window — never replaces your OS.\nModern glass chrome with ERDAI powered by Puter AI.\n\nBrowser · ERDAI · Arcade · Terminal · Files · Notes · Music\n\nDownload: github.com/ErdTheTurd/ERDOS/releases',
        }),
      ]),
    ]),
  ]));
}


window.ErdOSApps = { APPS, el };
