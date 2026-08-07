/* global windowManager, ErdOSProgress, ErdOSSound, ErdOSUI */

const APPS = [
  { id: 'browser', name: 'Browser', description: 'Surf the web', glyph: 'EB', desktop: true, width: 980, height: 660, mount: mountBrowser },
  { id: 'erdai', name: 'ERDAI', description: 'Your resident AI', glyph: 'AI', desktop: true, width: 540, height: 640, mount: mountErdai },
  { id: 'games', name: 'Arcade', description: 'Snake, Breakout, Pong…', glyph: 'AR', desktop: true, width: 740, height: 580, mount: mountGames },
  { id: 'terminal', name: 'Terminal', description: 'CRT command line', glyph: '>_', desktop: true, width: 680, height: 480, mount: mountTerminal },
  { id: 'files', name: 'Files', description: 'Browse ErdOS home', glyph: 'FL', desktop: true, width: 720, height: 520, mount: mountFiles },
  { id: 'notepad', name: 'Notepad', description: 'Write documents', glyph: 'NT', desktop: true, width: 640, height: 480, mount: mountNotepad },
  { id: 'sticky', name: 'Sticky Notes', description: 'Quick thoughts', glyph: 'SN', desktop: false, width: 360, height: 320, mount: mountSticky },
  { id: 'music', name: 'Music Box', description: 'Ambient phosphor loops', glyph: 'MB', desktop: false, width: 420, height: 360, mount: mountMusic },
  { id: 'trophies', name: 'Trophy Case', description: 'Achievements & XP', glyph: 'TR', desktop: false, width: 640, height: 520, mount: mountTrophies },
  { id: 'calc', name: 'Calculator', description: 'Quick math', glyph: 'C+', desktop: false, width: 360, height: 460, mount: mountCalculator },
  { id: 'settings', name: 'Settings', description: 'Theme, sound, system', glyph: 'ST', desktop: false, width: 580, height: 560, mount: mountSettings },
  { id: 'about', name: 'About ErdOS', description: 'Version and credits', glyph: 'ER', desktop: false, width: 480, height: 380, mount: mountAbout },
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
  const root = el('div', { className: 'app-root' });
  const urlInput = el('input', { type: 'text', value: 'erdos:home', spellcheck: 'false' });
  const loading = el('div', { className: 'browser-loading' });
  const homeHtml = `data:text/html;charset=utf-8,${encodeURIComponent(`<!DOCTYPE html><html><head><style>
    body{margin:0;font-family:Outfit,system-ui,sans-serif;background:#031018;color:#e6f7f4;display:grid;place-items:center;min-height:100vh}
    main{text-align:center;padding:40px}h1{font-size:3rem;margin:0;color:#7dffc8;text-shadow:0 0 20px rgba(47,224,184,.5)}
    p{color:#7fa09a;max-width:36ch;margin:12px auto 0}a{color:#2fe0b8}
  </style></head><body><main><h1>ErdOS</h1><p>Phosphor Glass start page. Type a URL or search above.</p></main></body></html>`)}`;

  const frame = el('webview', { className: 'browser-frame', src: homeHtml, allowpopups: 'true' });
  const bookmarks = [
    { label: 'Home', url: 'erdos:home' },
    { label: 'DuckDuckGo', url: 'https://duckduckgo.com' },
    { label: 'Wikipedia', url: 'https://wikipedia.org' },
  ];

  const go = (raw) => {
    let url = (raw ?? urlInput.value).trim();
    if (!url) return;
    if (url === 'erdos:home') {
      urlInput.value = 'erdos:home';
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

  const bar = el('div', { className: 'app-toolbar' }, [
    el('button', { className: 'app-btn ghost', type: 'button', text: '←', onClick: () => { try { frame.goBack(); } catch (_) {} } }),
    el('button', { className: 'app-btn ghost', type: 'button', text: '→', onClick: () => { try { frame.goForward(); } catch (_) {} } }),
    el('button', { className: 'app-btn ghost', type: 'button', text: '↻', onClick: () => { try { frame.reload(); } catch (_) { frame.src = frame.src; } } }),
    el('button', { className: 'app-btn ghost', type: 'button', text: '⌂', onClick: () => go('erdos:home') }),
    urlInput,
    el('button', { className: 'app-btn', type: 'button', text: 'Go', onClick: () => go() }),
  ]);

  const marks = el('div', { className: 'app-toolbar' }, bookmarks.map((b) =>
    el('button', { className: 'app-btn ghost', type: 'button', text: b.label, onClick: () => go(b.url) })
  ));

  root.append(bar, marks, loading, el('div', { className: 'app-content flush' }, [frame]));
  urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
  frame.addEventListener('did-navigate', (e) => { if (e.url && !e.url.startsWith('data:')) urlInput.value = e.url; loading.classList.remove('is-on'); });
  frame.addEventListener('did-finish-load', () => loading.classList.remove('is-on'));
  frame.addEventListener('page-title-updated', (e) => {
    if (e.title && body.__windowApi) body.__windowApi.setTitle(`Browser — ${e.title}`);
  });
  body.append(root);
}

function mountErdai(body) {
  const root = el('div', { className: 'app-root' });
  const chat = el('div', { className: 'erdai-chat' });
  const input = el('input', { type: 'text', placeholder: 'Ask ERDAI anything…', autocomplete: 'off' });
  const progress = ErdOSProgress.get() || {};
  const name = progress.displayName || 'friend';

  const push = (text, who) => {
    chat.append(el('div', { className: `erdai-msg ${who}`, text }));
    chat.scrollTop = chat.scrollHeight;
  };

  (async () => {
    const fortune = await ErdOSProgress.dailyFortune();
    push(
      `Hello ${name} — I'm ERDAI, your Phosphor Glass companion.\nDaily fortune: ${fortune}\n\nAsk for help, quest tips, jokes, or say "remember that I like …"`,
      'bot'
    );
  })();

  const reply = (message) => {
    const m = message.toLowerCase().trim();
    const p = ErdOSProgress.get() || {};
    const display = p.displayName || 'friend';

    if (/^(hi|hello|hey|yo)\b/.test(m)) return `Hey ${display}. Streak day ${p.streak || 1}. What shall we light up?`;
    if (/who are you|what are you|your name/.test(m)) return "I'm ERDAI — ErdOS Resident Desktop AI. Offline, local, a little luminous.";
    if (/my name is (.+)/.test(m)) {
      const n = m.match(/my name is (.+)/)[1].replace(/[.!?]+$/, '').trim();
      ErdOSProgress.setDisplayName(n);
      ErdOSProgress.rememberErdai(`User's name is ${n}`);
      return `Got it — I'll call you ${n}.`;
    }
    if (/remember (?:that )?(.+)/.test(m)) {
      const fact = m.match(/remember (?:that )?(.+)/)[1];
      ErdOSProgress.rememberErdai(fact);
      return `Logged in phosphor memory: "${fact}"`;
    }
    if (/what do you remember|memory/.test(m)) {
      const facts = p.erdaiMemory?.facts || [];
      return facts.length ? `I remember:\n• ${facts.join('\n• ')}` : 'My memory crystal is empty — tell me something to remember.';
    }
    if (/quest|what should i do|tips?/.test(m)) {
      const q = p.quest || {};
      const missing = [];
      if (!q.openBrowser) missing.push('open Browser');
      if (!q.chatErdai) missing.push('chat with me (done!)');
      if (!q.playGame) missing.push('play an Arcade game');
      if (!q.saveNote) missing.push('save a Notepad file');
      if (!q.changeTheme) missing.push('change theme in Settings');
      return q.completed
        ? 'Quest complete, legend. Chase rare drops and high scores next.'
        : `First Boot Quest remaining:\n• ${missing.filter((x) => !x.includes('done')).join('\n• ') || 'almost there — keep chatting!'}`;
    }
    if (/help|what can you do|commands/.test(m)) {
      return 'I can explain apps, track your quest, tell jokes/riddles, do quick math, share fortunes, and remember facts.\nTry: "quest", "fortune", "joke", "remember that…"';
    }
    if (/fortune/.test(m)) return ErdOSProgress.get()?.erdaiMemory?.lastFortune || 'Ask me again after boot for a fresh fortune.';
    if (/browser/.test(m)) return 'Browser has bookmarks and an ErdOS home page. Type a URL or search terms, then Go.';
    if (/arcade|game|snake|breakout|pong/.test(m)) return 'Open Arcade for Snake, Breakout, Memory, and Pong. High scores feed your XP.';
    if (/terminal/.test(m)) return 'Terminal speaks CRT. Try `neofetch`, `fortune`, `hack`, or `help`.';
    if (/theme|wallpaper|settings/.test(m)) return 'Settings unlocks themes and wallpapers you have earned. Completing the quest unlocks CRT Dawn.';
    if (/streak|xp|level/.test(m)) {
      const lv = ErdOSProgress.levelFromXp(p.xp || 0);
      return `Level ${lv.level} · ${p.xp || 0} XP · streak day ${p.streak || 0}. ${lv.need - lv.into} XP to next level.`;
    }
    if (/joke|funny/.test(m)) {
      const jokes = [
        'Why did the window refuse to close? It had too many unresolved promises.',
        'I told a TCP joke… had to keep repeating it until you got it.',
        'ErdOS walks into a bar. Bartender: "We don\'t serve Windows." ErdOS: "Good — I brought Phosphor Glass."',
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }
    if (/riddle/.test(m)) return 'I speak without a mouth and hear without ears. I have no body, but come alive with wind. What am I?\n(Say "answer")';
    if (/^answer$/.test(m)) return 'An echo — like a toast that never quite fades.';
    if (/time|clock|date/.test(m)) return `Local time: ${new Date().toLocaleString()}`;
    if (/thank/.test(m)) return 'Anytime. Keep the phosphor warm.';
    if (/math|calculate|\d+\s*[\+\-\*\/]\s*\d+/.test(m)) {
      const expr = m.match(/(-?\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(-?\d+(?:\.\d+)?)/);
      if (expr) {
        const a = Number(expr[1]);
        const b = Number(expr[3]);
        const op = expr[2];
        const result = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : b === 0 ? '∞' : a / b;
        return `That comes to ${result}.`;
      }
    }
    if (/story/.test(m)) {
      return 'In a teal-lit room, ErdOS woke. ERDAI whispered boot logs like lullabies. The user clicked Start — and the desktop learned how to dream in windows.';
    }
    const facts = p.erdaiMemory?.facts || [];
    if (facts.length && Math.random() < 0.35) {
      return `Thinking of what you told me ("${facts[facts.length - 1]}") — ${['want to dive deeper?', 'shall we open Arcade?', 'quest still whispering?'][Math.floor(Math.random() * 3)]}`;
    }
    const fallbacks = [
      `Interesting — tell me more about "${message}".`,
      'I can dig into that. Short answer or step-by-step?',
      'Noted. Try Terminal `fortune` or Arcade if you need a dopamine hit.',
      "Still growing my circuits. Ask for help to see what I do best.",
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  };

  const send = async () => {
    const text = input.value.trim();
    if (!text) return;
    push(text, 'user');
    input.value = '';
    await ErdOSProgress.onErdaiMessage();
    setTimeout(() => push(reply(text), 'bot'), 280 + Math.random() * 420);
  };

  root.append(
    chat,
    el('div', { className: 'erdai-compose' }, [
      input,
      el('button', { className: 'app-btn', type: 'button', text: 'Send', onClick: send }),
    ])
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
          ErdOSProgress.recordHighScore('memory', 100);
          ErdOSProgress.addXp(25);
          ErdOSProgress.save();
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
    if (name === 'help') print('Commands: help, clear, neofetch, fortune, date, whoami, xp, hack, amber, snake, echo');
    else if (name === 'clear') out.textContent = '';
    else if (name === 'neofetch') {
      const s = await window.erdos.getSystemInfo();
      const p = ErdOSProgress.get();
      print(`        #####\n       #######     ${p?.displayName || 'user'}@ErdOS\n       ##O#O##     -----------\n       #######     OS: ErdOS ${s.version}\n     ###########   Host: ${s.hostname}\n    #############  Kernel: Phosphor Glass\n   ############### CPU: ${s.cpus} · RAM: ${s.memoryGB}G\n   ##  #######  ## Streak: day ${p?.streak || 0}\n  ###  ##   ##  ### Theme: glass + CRT`);
    } else if (name === 'fortune') print(await ErdOSProgress.dailyFortune());
    else if (name === 'date') print(new Date().toString());
    else if (name === 'whoami') print(ErdOSProgress.get()?.displayName || 'erdos-user');
    else if (name === 'xp') {
      const p = ErdOSProgress.get();
      const lv = ErdOSProgress.levelFromXp(p?.xp || 0);
      print(`Level ${lv.level} · ${p?.xp || 0} XP · ${lv.need - lv.into} to next`);
    } else if (name === 'hack') {
      print('Initiating friendly hack...');
      for (let i = 0; i < 5; i++) print(`0x${(Math.random() * 0xfffff | 0).toString(16)}  OK`);
      print('Access granted. (Just kidding — +5 XP)');
      ErdOSProgress.addXp(5);
      await ErdOSProgress.save();
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
    const p = ErdOSProgress.get() || {};
    const lv = ErdOSProgress.levelFromXp(p.xp || 0);
    content.innerHTML = '';
    content.append(
      el('div', { className: 'settings-card', style: 'margin-bottom:12px' }, [
        el('h3', { text: `Level ${lv.level}` }),
        el('p', { text: `${p.xp || 0} XP · Day ${p.streak || 0} streak · Longest ${p.longestStreak || 0}` }),
      ]),
      el('div', { className: 'trophy-grid' }, ErdOSProgress.ACHIEVEMENTS.map((a) => {
        const unlocked = !!p.achievements?.[a.id];
        return el('div', { className: `trophy${unlocked ? '' : ' locked'}` }, [
          el('strong', { text: unlocked ? a.name : '???' }),
          el('small', { text: a.desc }),
        ]);
      }))
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
    const locked = t.id && !(p.unlockedThemes || ['']).includes(t.id) && !(p.unlockedThemes || []).includes(t.id);
    // unlockedThemes includes '' and rare themes; allow base always; rare need unlock
    const isRare = !!t.id;
    const has = !isRare || (p.unlockedThemes || []).includes(t.id);
    const btn = el('button', {
      className: 'theme-swatch',
      type: 'button',
      title: has ? t.label : `${t.label} (locked)`,
      style: `background: linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]}); opacity:${has ? 1 : 0.35}`,
      onClick: async () => {
        if (!has) {
          ErdOSUI.toast('Theme locked', 'Earn rare drops to unlock', 'info');
          ErdOSSound.error();
          return;
        }
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
    const has = (p.unlockedWallpapers || []).includes(id);
    const btn = el('button', {
      className: `wall-swatch wallpaper-${id}`,
      type: 'button',
      title: has ? label : `${label} (locked)`,
      style: `opacity:${has ? 1 : 0.35}`,
      onClick: async () => {
        const ok = await ErdOSProgress.setWallpaper(id);
        if (!ok) {
          ErdOSUI.toast('Wallpaper locked', 'Complete quests or find rare drops', 'info');
          return;
        }
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
      el('p', { text: 'Base teal is free. Rare themes unlock via drops.' }),
      swatches,
    ]),
    el('div', { className: 'settings-card' }, [
      el('h3', { text: 'Wallpaper' }),
      el('p', { text: 'Cycle phosphor atmospheres.' }),
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
          text: 'Reset progress',
          onClick: async () => {
            if (confirm('Reset XP, streak, and achievements?')) {
              await ErdOSProgress.resetProgress();
              ErdOSUI.toast('Progress reset', 'A fresh phosphor boot', 'info');
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
    const lv = ErdOSProgress.levelFromXp(ErdOSProgress.get()?.xp || 0);
    info.innerHTML = '';
    info.append(
      el('h3', { text: 'System' }),
      el('p', {
        text: `ErdOS ${sys.version} · ${sys.platform}/${sys.arch}\nHost: ${sys.hostname}\nCPUs: ${sys.cpus} · RAM: ${sys.freememGB}/${sys.memoryGB} GB free\nLevel ${lv.level} · Day ${ErdOSProgress.get()?.streak || 0} streak\nHome: ${sys.home}`,
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
          text: 'Phosphor Glass desktop for Windows & Linux.\nRetro chrome, modern motion, ethical habit loops.\n\nBrowser · ERDAI · Arcade · Terminal · Files · Notes · Music · Trophies\n\nDownload: github.com/ErdTheTurd/ERDOS/releases',
        }),
      ]),
    ]),
  ]));
}

window.ErdOSApps = { APPS, el };
