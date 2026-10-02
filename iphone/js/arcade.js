/* Snake, Breakout, and Pong with on-screen touch controls. */
const ArcadeUI = (() => {
  const SCORE_KEY = 'erdos-iphone-scores';
  let panel;
  let timer = null;

  function scores() {
    try { return Object.assign({ snake: 0, breakout: 0, pong: 0 }, JSON.parse(localStorage.getItem(SCORE_KEY) || '{}')); }
    catch (_) { return { snake: 0, breakout: 0, pong: 0 }; }
  }
  function saveScore(game, value) {
    const all = scores();
    all[game] = Math.max(all[game] || 0, value);
    localStorage.setItem(SCORE_KEY, JSON.stringify(all));
  }
  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
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
  function holdButton(label, onDown, onUp) {
    const button = el('button', { type: 'button', className: 'hold', text: label });
    const down = (event) => { event.preventDefault(); onDown(); };
    const up = () => onUp();
    button.addEventListener('pointerdown', down);
    button.addEventListener('pointerup', up);
    button.addEventListener('pointerleave', up);
    button.addEventListener('pointercancel', up);
    return button;
  }

  function menu() {
    stop();
    const best = scores();
    panel.innerHTML = '';
    panel.append(el('div', { className: 'panel-pad' }, [
      el('h1', { text: 'Arcade' }),
      el('p', { className: 'fine', text: 'Touch controls. One tap starts a game.' }),
      el('div', { className: 'games' }, [
        el('button', { className: 'game-card', type: 'button', id: 'play-snake', onClick: snake }, [el('strong', { text: 'Snake' }), el('span', { text: 'Best ' + best.snake })]),
        el('button', { className: 'game-card', type: 'button', id: 'play-breakout', onClick: breakout }, [el('strong', { text: 'Breakout' }), el('span', { text: 'Best ' + best.breakout })]),
        el('button', { className: 'game-card', type: 'button', id: 'play-pong', onClick: pong }, [el('strong', { text: 'Pong' }), el('span', { text: 'Best ' + best.pong })]),
      ]),
    ]));
  }

  function snake() {
    stop();
    panel.innerHTML = '';
    const scoreEl = el('div', { className: 'fine', text: 'Score 0' });
    const canvas = el('canvas', { width: '320', height: '320', id: 'snake-board' });
    const ctx = canvas.getContext('2d');
    const cell = 16;
    let snakeBody = [{ x: 8, y: 8 }];
    let dir = { x: 1, y: 0 };
    let next = { x: 1, y: 0 };
    let food = { x: 12, y: 6 };
    let score = 0;
    let alive = true;
    const turn = (d) => {
      if (d.x + dir.x === 0 && d.y + dir.y === 0) return;
      next = d;
    };
    let swipe = null;
    canvas.addEventListener('pointerdown', (event) => { swipe = { x: event.clientX, y: event.clientY }; });
    canvas.addEventListener('pointerup', (event) => {
      if (!swipe) return;
      const dx = event.clientX - swipe.x;
      const dy = event.clientY - swipe.y;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 12) turn({ x: dx > 0 ? 1 : -1, y: 0 });
      else if (Math.abs(dy) > 12) turn({ x: 0, y: dy > 0 ? 1 : -1 });
    });
    timer = setInterval(() => {
      if (!alive) return;
      dir = next;
      const head = { x: snakeBody[0].x + dir.x, y: snakeBody[0].y + dir.y };
      if (head.x < 0 || head.y < 0 || head.x >= 20 || head.y >= 20 || snakeBody.some((part) => part.x === head.x && part.y === head.y)) {
        alive = false;
        saveScore('snake', score);
        scoreEl.textContent = 'Game over · ' + score;
        return;
      }
      snakeBody.unshift(head);
      if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreEl.textContent = 'Score ' + score;
        food = { x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20) };
      } else snakeBody.pop();
      ctx.fillStyle = '#071018';
      ctx.fillRect(0, 0, 320, 320);
      ctx.fillStyle = '#2fe0b8';
      snakeBody.forEach((part) => ctx.fillRect(part.x * cell + 1, part.y * cell + 1, cell - 2, cell - 2));
      ctx.fillStyle = '#8eb6ff';
      ctx.fillRect(food.x * cell + 1, food.y * cell + 1, cell - 2, cell - 2);
    }, 140);
    panel.append(el('div', { className: 'panel-pad stage' }, [
      el('button', { className: 'ghost', type: 'button', text: 'Back', onClick: menu }),
      scoreEl,
      canvas,
      el('div', { className: 'pad', id: 'snake-pad' }, [
        el('span'),
        holdButton('↑', () => turn({ x: 0, y: -1 }), () => {}),
        el('span'),
        holdButton('←', () => turn({ x: -1, y: 0 }), () => {}),
        el('span'),
        holdButton('→', () => turn({ x: 1, y: 0 }), () => {}),
        el('span'),
        holdButton('↓', () => turn({ x: 0, y: 1 }), () => {}),
        el('span'),
      ]),
    ]));
  }

  function breakout() {
    stop();
    panel.innerHTML = '';
    const scoreEl = el('div', { className: 'fine', text: 'Score 0' });
    const canvas = el('canvas', { width: '320', height: '240', id: 'breakout-board' });
    const ctx = canvas.getContext('2d');
    let paddle = 120;
    let ball = { x: 160, y: 180, vx: 2.4, vy: -2.6 };
    let score = 0;
    const bricks = [];
    for (let r = 0; r < 4; r += 1) for (let c = 0; c < 6; c += 1) bricks.push({ x: 12 + c * 50, y: 16 + r * 18, alive: true });
    let left = false;
    let right = false;
    canvas.addEventListener('pointerdown', (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 320;
      paddle = Math.max(0, Math.min(250, x - 35));
    });
    timer = setInterval(() => {
      if (left) paddle -= 6;
      if (right) paddle += 6;
      paddle = Math.max(0, Math.min(250, paddle));
      ball.x += ball.vx;
      ball.y += ball.vy;
      if (ball.x < 8 || ball.x > 312) ball.vx *= -1;
      if (ball.y < 8) ball.vy *= -1;
      if (ball.y > 240) {
        saveScore('breakout', score);
        ball = { x: 160, y: 180, vx: 2.4, vy: -2.6 };
        scoreEl.textContent = 'Missed · ' + score;
      }
      if (ball.y > 210 && ball.y < 226 && ball.x > paddle && ball.x < paddle + 70 && ball.vy > 0) ball.vy *= -1;
      bricks.forEach((brick) => {
        if (!brick.alive) return;
        if (ball.x > brick.x && ball.x < brick.x + 44 && ball.y > brick.y && ball.y < brick.y + 14) {
          brick.alive = false;
          ball.vy *= -1;
          score += 5;
          scoreEl.textContent = 'Score ' + score;
        }
      });
      ctx.fillStyle = '#071018';
      ctx.fillRect(0, 0, 320, 240);
      ctx.fillStyle = '#2fe0b8';
      ctx.fillRect(paddle, 214, 70, 10);
      ctx.beginPath();
      ctx.arc(ball.x, ball.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
      bricks.forEach((brick, index) => {
        if (!brick.alive) return;
        ctx.fillStyle = index % 2 ? '#8eb6ff' : '#2f6bff';
        ctx.fillRect(brick.x, brick.y, 44, 12);
      });
    }, 16);
    panel.append(el('div', { className: 'panel-pad stage' }, [
      el('button', { className: 'ghost', type: 'button', text: 'Back', onClick: () => { saveScore('breakout', score); menu(); } }),
      scoreEl,
      canvas,
      el('div', { className: 'hold-row' }, [
        holdButton('Left', () => { left = true; }, () => { left = false; }),
        holdButton('Right', () => { right = true; }, () => { right = false; }),
      ]),
    ]));
  }

  function pong() {
    stop();
    panel.innerHTML = '';
    const scoreEl = el('div', { className: 'fine', text: 'You 0 · CPU 0' });
    const canvas = el('canvas', { width: '320', height: '220', id: 'pong-board' });
    const ctx = canvas.getContext('2d');
    let player = 80;
    let cpu = 80;
    let ball = { x: 160, y: 110, vx: 2.8, vy: 1.8 };
    let you = 0;
    let them = 0;
    let up = false;
    let down = false;
    canvas.addEventListener('pointerdown', (event) => {
      const rect = canvas.getBoundingClientRect();
      const y = ((event.clientY - rect.top) / rect.height) * 220;
      player = Math.max(0, Math.min(170, y - 25));
    });
    timer = setInterval(() => {
      if (up) player -= 4;
      if (down) player += 4;
      player = Math.max(0, Math.min(170, player));
      cpu += Math.sign(ball.y - 25 - cpu) * Math.min(2.4, Math.abs(ball.y - 25 - cpu));
      ball.x += ball.vx;
      ball.y += ball.vy;
      if (ball.y < 6 || ball.y > 214) ball.vy *= -1;
      if (ball.x < 22 && ball.y > player && ball.y < player + 50) ball.vx = Math.abs(ball.vx);
      if (ball.x > 298 && ball.y > cpu && ball.y < cpu + 50) ball.vx = -Math.abs(ball.vx);
      if (ball.x < 0) { them += 1; ball = { x: 160, y: 110, vx: 2.8, vy: 1.8 }; }
      if (ball.x > 320) { you += 1; saveScore('pong', you); ball = { x: 160, y: 110, vx: -2.8, vy: 1.8 }; }
      scoreEl.textContent = 'You ' + you + ' · CPU ' + them;
      ctx.fillStyle = '#071018';
      ctx.fillRect(0, 0, 320, 220);
      ctx.fillStyle = '#2fe0b8';
      ctx.fillRect(8, player, 8, 50);
      ctx.fillRect(304, cpu, 8, 50);
      ctx.fillRect(ball.x, ball.y, 8, 8);
    }, 16);
    panel.append(el('div', { className: 'panel-pad stage' }, [
      el('button', { className: 'ghost', type: 'button', text: 'Back', onClick: () => { saveScore('pong', you); menu(); } }),
      scoreEl,
      canvas,
      el('div', { className: 'hold-row' }, [
        holdButton('Up', () => { up = true; }, () => { up = false; }),
        holdButton('Down', () => { down = true; }, () => { down = false; }),
      ]),
    ]));
  }

  function mount(target) {
    panel = target;
    menu();
  }
  return { mount, menu };
})();
window.ArcadeUI = ArcadeUI;
