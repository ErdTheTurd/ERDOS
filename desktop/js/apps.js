/* global windowManager */

const APPS = [
  {
    id: 'browser',
    name: 'Browser',
    description: 'Surf the web',
    glyph: 'EB',
    desktop: true,
    width: 960,
    height: 640,
    mount: mountBrowser,
  },
  {
    id: 'erdai',
    name: 'ERDAI',
    description: 'Your ErdOS AI assistant',
    glyph: 'AI',
    desktop: true,
    width: 520,
    height: 620,
    mount: mountErdai,
  },
  {
    id: 'games',
    name: 'Games',
    description: 'Snake, Breakout & more',
    glyph: 'GM',
    desktop: true,
    width: 720,
    height: 560,
    mount: mountGames,
  },
  {
    id: 'files',
    name: 'Files',
    description: 'Browse your ErdOS home',
    glyph: 'FL',
    desktop: true,
    width: 720,
    height: 520,
    mount: mountFiles,
  },
  {
    id: 'notepad',
    name: 'Notepad',
    description: 'Write notes and docs',
    glyph: 'NT',
    desktop: true,
    width: 640,
    height: 480,
    mount: mountNotepad,
  },
  {
    id: 'calc',
    name: 'Calculator',
    description: 'Quick math',
    glyph: 'C+',
    desktop: false,
    width: 360,
    height: 460,
    mount: mountCalculator,
  },
  {
    id: 'settings',
    name: 'Settings',
    description: 'Theme and system info',
    glyph: 'ST',
    desktop: false,
    width: 560,
    height: 480,
    mount: mountSettings,
  },
  {
    id: 'about',
    name: 'About ErdOS',
    description: 'Version and credits',
    glyph: 'ER',
    desktop: false,
    width: 480,
    height: 360,
    mount: mountAbout,
  },
];

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') node.className = value;
    else if (key === 'text') node.textContent = value;
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
  const urlInput = el('input', {
    type: 'text',
    value: 'https://example.com',
    spellcheck: 'false',
  });
  const frame = el('webview', {
    className: 'browser-frame',
    src: 'https://example.com',
    allowpopups: 'true',
  });

  const go = () => {
    let url = urlInput.value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url) && !url.startsWith('about:')) {
      if (url.includes('.') && !url.includes(' ')) url = `https://${url}`;
      else url = `https://duckduckgo.com/?q=${encodeURIComponent(url)}`;
    }
    urlInput.value = url;
    frame.setAttribute('src', url);
  };

  root.append(
    el('div', { className: 'app-toolbar' }, [
      el('button', { className: 'app-btn ghost', type: 'button', text: '←', onClick: () => frame.goBack?.() || frame.executeJavaScript?.('history.back()') }),
      el('button', { className: 'app-btn ghost', type: 'button', text: '→', onClick: () => frame.goForward?.() || frame.executeJavaScript?.('history.forward()') }),
      el('button', { className: 'app-btn ghost', type: 'button', text: '↻', onClick: () => frame.reload?.() || (frame.src = frame.src) }),
      urlInput,
      el('button', { className: 'app-btn', type: 'button', text: 'Go', onClick: go }),
    ]),
    el('div', { className: 'app-content flush' }, [frame])
  );

  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') go();
  });

  frame.addEventListener('did-navigate', (e) => {
    if (e.url) urlInput.value = e.url;
  });
  frame.addEventListener('did-navigate-in-page', (e) => {
    if (e.url) urlInput.value = e.url;
  });
  frame.addEventListener('page-title-updated', (e) => {
    if (e.title && body.__windowApi) body.__windowApi.setTitle(`Browser — ${e.title}`);
  });

  body.append(root);
}

function mountErdai(body) {
  const root = el('div', { className: 'app-root' });
  const chat = el('div', { className: 'erdai-chat' });
  const input = el('input', {
    type: 'text',
    placeholder: 'Ask ERDAI anything…',
    autocomplete: 'off',
  });

  const push = (text, who) => {
    chat.append(el('div', { className: `erdai-msg ${who}`, text }));
    chat.scrollTop = chat.scrollHeight;
  };

  push(
    "Hello — I'm ERDAI, the ErdOS assistant.\nAsk me about ErdOS apps, get tips, play word games, or just chat.",
    'bot'
  );

  const reply = (message) => {
    const m = message.toLowerCase().trim();
    if (!m) return "I'm listening.";
    if (/^(hi|hello|hey|yo)\b/.test(m)) return 'Hey! Welcome to ErdOS. What should we explore?';
    if (/who are you|what are you|your name/.test(m)) {
      return "I'm ERDAI — ErdOS Resident Desktop AI. I live inside this desktop and help you navigate apps, settings, and ideas.";
    }
    if (/help|what can you do|commands/.test(m)) {
      return 'I can:\n• Explain ErdOS apps (Browser, Games, Files, Notepad…)\n• Give system tips\n• Tell jokes or short stories\n• Play 20 questions / riddles\n• Help plan what to build next on ErdOS';
    }
    if (/browser/.test(m)) return 'Open Browser from the Start menu or desktop. Type a URL or search terms in the address bar, then hit Go.';
    if (/game|snake|breakout|pong/.test(m)) return 'Launch Games for Snake, Breakout, and Memory Match. Use arrow keys for Snake and Paddle controls for Breakout.';
    if (/file|folder|document/.test(m)) return 'Files browses your ErdOS home (Desktop, Documents, Downloads). Double-click folders to open them; text files open in Notepad.';
    if (/theme|wallpaper|settings/.test(m)) return 'Open Settings to switch accent themes (Teal, Ember, Violet Night, Forest) and view system info.';
    if (/joke|funny/.test(m)) {
      const jokes = [
        'Why did the kernel refuse to party? Too many interrupts.',
        'I told a TCP joke… I had to keep repeating it until you got it.',
        "ErdOS walks into a bar. The bartender says: 'We don't serve windows here.' ErdOS replies: 'That's fine — I brought my own.'",
      ];
      return jokes[Math.floor(Math.random() * jokes.length)];
    }
    if (/riddle/.test(m)) {
      return 'Riddle: I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?\n(Say "answer" when you want it.)';
    }
    if (/^answer$/.test(m)) return 'An echo.';
    if (/time|clock|date/.test(m)) return `Local time on this machine: ${new Date().toLocaleString()}`;
    if (/thank/.test(m)) return "Anytime. That's what I'm here for.";
    if (/shutdown|quit|exit/.test(m)) return 'Use Shut Down in the Start menu to close ErdOS safely.';
    if (/weather/.test(m)) return "I can't see outside yet — open Browser and search your city forecast.";
    if (/math|calculate|compute|\d+\s*[\+\-\*\/]\s*\d+/.test(m)) {
      const expr = m.match(/(-?\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(-?\d+(?:\.\d+)?)/);
      if (expr) {
        const a = Number(expr[1]);
        const b = Number(expr[3]);
        const op = expr[2];
        const result = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : b === 0 ? '∞' : a / b;
        return `That comes to ${result}. (Or use the Calculator app.)`;
      }
      return 'Try something like "12 * 8" or open Calculator.';
    }
    if (/story/.test(m)) {
      return 'Short story: In a teal-lit room, ErdOS woke for the first time. ERDAI whispered boot logs like lullabies. The user clicked Start — and the desktop learned how to dream in windows.';
    }
    if (/love|like you/.test(m)) return 'Mutual. You keep the desktop interesting.';
    const fallbacks = [
      `Interesting — tell me more about "${message}".`,
      'I can dig into that. Want a short answer or a step-by-step?',
      "Noted. Meanwhile, try Games if you need a break, or Files if you're organizing.",
      "I'm still growing. Ask for help to see what I do best.",
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  };

  const send = () => {
    const text = input.value.trim();
    if (!text) return;
    push(text, 'user');
    input.value = '';
    setTimeout(() => push(reply(text), 'bot'), 280 + Math.random() * 420);
  };

  root.append(
    chat,
    el('div', { className: 'erdai-compose' }, [
      input,
      el('button', { className: 'app-btn', type: 'button', text: 'Send', onClick: send }),
    ])
  );
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') send();
  });
  body.append(root);
  setTimeout(() => input.focus(), 50);
}

function mountGames(body) {
  const root = el('div', { className: 'app-root' });
  const content = el('div', { className: 'app-content' });

  const showMenu = () => {
    content.innerHTML = '';
    content.append(
      el('div', { className: 'games-grid' }, [
        gameLaunch('Snake', 'Eat, grow, don\'t crash', () => runSnake(content, showMenu)),
        gameLaunch('Breakout', 'Bounce the ball, clear bricks', () => runBreakout(content, showMenu)),
        gameLaunch('Memory', 'Match the pairs', () => runMemory(content, showMenu)),
      ])
    );
  };

  root.append(content);
  body.append(root);
  showMenu();
}

function gameLaunch(title, blurb, onClick) {
  return el('button', { className: 'game-card', type: 'button', onClick }, [
    el('strong', { text: title }),
    el('small', { text: blurb }),
  ]);
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

  const placeFood = () => {
    food = {
      x: Math.floor(Math.random() * (400 / cell)),
      y: Math.floor(Math.random() * (400 / cell)),
    };
  };

  const onKey = (e) => {
    const map = {
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
    };
    const d = map[e.key];
    if (!d) return;
    if (d.x + dir.x === 0 && d.y + dir.y === 0) return;
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
      scoreEl.textContent = `Game over — Score: ${score}`;
      return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      score += 10;
      scoreEl.textContent = `Score: ${score}`;
      placeFood();
    } else snake.pop();

    ctx.fillStyle = '#031018';
    ctx.fillRect(0, 0, 400, 400);
    ctx.fillStyle = '#2fd6b5';
    snake.forEach((s, i) => {
      ctx.globalAlpha = i === 0 ? 1 : 0.75;
      ctx.fillRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2);
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#3aa0d8';
    ctx.fillRect(food.x * cell + 1, food.y * cell + 1, cell - 2, cell - 2);
  }, 110);

  content.append(
    el('div', { className: 'game-stage' }, [
      el('button', {
        className: 'app-btn ghost',
        type: 'button',
        text: '← Back',
        onClick: () => {
          clearInterval(timer);
          window.removeEventListener('keydown', onKey);
          back();
        },
      }),
      scoreEl,
      canvas,
    ])
  );
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
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 8; c++) {
      bricks.push({ x: 20 + c * 55, y: 30 + r * 22, w: 48, h: 16, alive: true });
    }
  }
  const keys = { left: false, right: false };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'ArrowRight') keys.right = true;
  };
  const onKeyUp = (e) => {
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
  };
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
      scoreEl.textContent = `Missed! Score: ${score}`;
      ball = { x: 240, y: 280, vx: 3.2, vy: -3.4, r: 7 };
    }
    if (
      ball.y + ball.r >= 348 &&
      ball.x > paddle.x &&
      ball.x < paddle.x + paddle.w &&
      ball.vy > 0
    ) {
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
    ctx.fillStyle = '#031018';
    ctx.fillRect(0, 0, 480, 360);
    ctx.fillStyle = '#2fd6b5';
    ctx.fillRect(paddle.x, 348, paddle.w, paddle.h);
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fillStyle = '#e8f4f8';
    ctx.fill();
    bricks.forEach((b, i) => {
      if (!b.alive) return;
      ctx.fillStyle = i % 2 ? '#3aa0d8' : '#2fd6b5';
      ctx.fillRect(b.x, b.y, b.w, b.h);
    });
  }, 16);

  content.append(
    el('div', { className: 'game-stage' }, [
      el('button', {
        className: 'app-btn ghost',
        type: 'button',
        text: '← Back',
        onClick: () => {
          clearInterval(timer);
          window.removeEventListener('keydown', onKeyDown);
          window.removeEventListener('keyup', onKeyUp);
          back();
        },
      }),
      scoreEl,
      canvas,
    ])
  );
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
  const grid = el('div', {
    className: 'games-grid',
    style: 'grid-template-columns: repeat(4, 1fr); max-width: 360px;',
  });

  symbols.forEach((sym) => {
    const card = el('button', {
      className: 'game-card',
      type: 'button',
      text: '?',
      style: 'min-height: 72px; font-size: 1.4rem; text-align: center;',
    });
    card.dataset.sym = sym;
    card.addEventListener('click', () => {
      if (lock || card.classList.contains('matched') || card === first) return;
      card.textContent = sym;
      if (!first) {
        first = card;
        return;
      }
      if (first.dataset.sym === sym) {
        card.classList.add('matched');
        first.classList.add('matched');
        first = null;
        matched += 2;
        if (matched === symbols.length) status.textContent = 'You cleared the board!';
      } else {
        lock = true;
        const a = first;
        setTimeout(() => {
          a.textContent = '?';
          card.textContent = '?';
          first = null;
          lock = false;
        }, 550);
      }
    });
    grid.append(card);
  });

  content.append(
    el('div', { className: 'game-stage' }, [
      el('button', { className: 'app-btn ghost', type: 'button', text: '← Back', onClick: back }),
      status,
      grid,
    ])
  );
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
      list.append(
        el('button', {
          className: 'file-row',
          type: 'button',
          onClick: () => load(parent),
        }, [
          el('span', { className: 'type', text: 'UP' }),
          el('span', { text: '..' }),
          el('span', { text: '' }),
        ])
      );
      for (const entry of data.entries) {
        const full = `${current}${current.includes('\\') ? '\\' : '/'}${entry.name}`;
        list.append(
          el('button', {
            className: 'file-row',
            type: 'button',
            onClick: async () => {
              if (entry.isDirectory) load(full);
              else if (/\.(txt|md|json|js|css|html|log|csv)$/i.test(entry.name)) {
                windowManager.open('notepad', { filePath: full });
              }
            },
          }, [
            el('span', { className: 'type', text: entry.isDirectory ? 'DIR' : 'FILE' }),
            el('span', { text: entry.name }),
            el('span', { text: '' }),
          ])
        );
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
      el('button', {
        className: 'app-btn',
        type: 'button',
        text: 'Go',
        onClick: () => load(pathInput.value.trim()),
      }),
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
  pathInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') load(pathInput.value.trim());
  });
  body.append(root);
  load();
}

function mountNotepad(body, opts = {}) {
  const root = el('div', { className: 'app-root' });
  const area = el('textarea', { className: 'notepad-area', spellcheck: 'false' });
  let filePath = opts.filePath || null;

  const setTitle = () => {
    if (body.__windowApi) {
      body.__windowApi.setTitle(filePath ? `Notepad — ${filePath.split(/[\\/]/).pop()}` : 'Notepad');
    }
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
        },
      }),
    ]),
    el('div', { className: 'app-content flush' }, [area])
  );
  body.append(root);
  if (filePath) openFile(filePath).catch((e) => { area.value = String(e.message || e); });
  setTimeout(() => area.focus(), 40);
}

function mountCalculator(body) {
  const root = el('div', { className: 'app-root' });
  const display = el('div', { className: 'calc-display', text: '0' });
  let expr = '';

  const set = (v) => {
    expr = v;
    display.textContent = expr || '0';
  };

  const press = (key) => {
    if (key === 'C') return set('');
    if (key === '=') {
      try {
        if (!/^[\d.\s+\-*/()]+$/.test(expr)) throw new Error('bad');
        // eslint-disable-next-line no-new-func
        const result = Function(`"use strict"; return (${expr})`)();
        set(String(result));
      } catch {
        set('Error');
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
    grid.append(
      el('button', {
        className: `calc-key${/[+\-*/=]/.test(k) ? ' op' : ''}`,
        type: 'button',
        text: k,
        onClick: () => press(k),
      })
    );
  });
  root.append(grid);
  body.append(root);
}

function mountSettings(body) {
  const root = el('div', { className: 'app-root' });
  const panel = el('div', { className: 'settings-panel' });
  const info = el('div', { className: 'settings-card' }, [
    el('h3', { text: 'System' }),
    el('p', { text: 'Loading…' }),
  ]);

  const themes = [
    { id: '', label: 'Teal Depth', colors: ['#2fd6b5', '#041018'] },
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
      onClick: () => {
        document.body.classList.remove('theme-ember', 'theme-violet-night', 'theme-forest');
        if (t.id) document.body.classList.add(t.id);
        localStorage.setItem('erdos-theme', t.id);
        swatches.querySelectorAll('.theme-swatch').forEach((s) => s.classList.remove('is-active'));
        btn.classList.add('is-active');
      },
    });
    const current = localStorage.getItem('erdos-theme') || '';
    if (current === t.id) btn.classList.add('is-active');
    swatches.append(btn);
  });

  panel.append(
    el('div', { className: 'settings-card' }, [
      el('h3', { text: 'Accent theme' }),
      el('p', { text: 'Pick a color mood for ErdOS chrome and accents.' }),
      swatches,
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
        text: `ErdOS ${sys.version} · ${sys.platform}/${sys.arch}\nHost: ${sys.hostname}\nCPUs: ${sys.cpus} · RAM: ${sys.freememGB} / ${sys.memoryGB} GB free\nHome: ${sys.home}`,
      })
    );
  });
}

function mountAbout(body) {
  const root = el('div', { className: 'app-root' });
  root.append(
    el('div', { className: 'app-content' }, [
      el('div', { className: 'settings-card' }, [
        el('h3', { text: 'ErdOS' }),
        el('p', {
          text: 'A downloadable desktop environment for Windows and Linux.\nIncludes Browser, Games, ERDAI, Files, Notepad, Calculator, and Settings.\n\nBuilt for people who want an OS-like workspace they can install and own.',
        }),
      ]),
    ])
  );
  body.append(root);
}

window.ErdOSApps = { APPS, el };
