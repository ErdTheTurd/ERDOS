/* Hyper juice — particles, floating XP, flashes, combo, ripples */
const ErdOSJuice = (() => {
  let layer = null;
  let combo = 0;
  let comboTimer = null;
  let lastXpFly = 0;

  function ensure() {
    if (!layer) layer = document.getElementById('juice-layer');
    return layer;
  }

  function burst(x, y, opts = {}) {
    const root = ensure();
    if (!root) return;
    const count = opts.count || 18;
    const color = opts.color || 'var(--accent)';
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      p.className = 'juice-particle';
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const dist = 40 + Math.random() * (opts.spread || 90);
      p.style.setProperty('--jx', `${Math.cos(angle) * dist}px`);
      p.style.setProperty('--jy', `${Math.sin(angle) * dist}px`);
      p.style.setProperty('--jc', color);
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      p.style.width = p.style.height = `${3 + Math.random() * 5}px`;
      root.append(p);
      setTimeout(() => p.remove(), 700);
    }
  }

  function flash(kind = 'accent') {
    const root = ensure();
    if (!root) return;
    const f = document.createElement('div');
    f.className = `juice-flash juice-flash-${kind}`;
    root.append(f);
    requestAnimationFrame(() => f.classList.add('on'));
    setTimeout(() => f.remove(), 450);
  }

  function floatXp(amount, fromEl) {
    const root = ensure();
    if (!root || !amount) return;
    const now = Date.now();
    if (now - lastXpFly < 40) return;
    lastXpFly = now;

    const chip = document.getElementById('xp-chip');
    const rect = (fromEl || chip)?.getBoundingClientRect?.();
    const startX = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const startY = rect ? rect.top : window.innerHeight * 0.4;
    const end = chip?.getBoundingClientRect?.();

    const el = document.createElement('div');
    el.className = 'juice-float-xp';
    el.textContent = `+${amount}`;
    el.style.left = `${startX}px`;
    el.style.top = `${startY}px`;
    root.append(el);

    const tx = end ? end.left + end.width / 2 - startX : 0;
    const ty = end ? end.top - startY : -80;
    requestAnimationFrame(() => {
      el.style.transform = `translate(${tx}px, ${ty}px) scale(0.6)`;
      el.style.opacity = '0';
    });
    setTimeout(() => {
      el.remove();
      chip?.classList.add('juice-pop');
      setTimeout(() => chip?.classList.remove('juice-pop'), 320);
    }, 650);
  }

  function hitCombo() {
    combo += 1;
    clearTimeout(comboTimer);
    comboTimer = setTimeout(() => {
      combo = 0;
      hideCombo();
    }, 2200);
    if (combo < 2) return;
    const root = ensure();
    if (!root) return;
    let badge = document.getElementById('juice-combo');
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'juice-combo';
      badge.className = 'juice-combo';
      root.append(badge);
    }
    badge.textContent = `${combo}× COMBO`;
    badge.classList.remove('pop');
    void badge.offsetWidth;
    badge.classList.add('pop', 'show');
    if (combo === 5 || combo === 10 || combo === 15) {
      flash('combo');
      ErdOSSound.rare();
      burst(window.innerWidth / 2, window.innerHeight * 0.35, {
        count: 28,
        color: '#ffc87a',
        spread: 140,
      });
    }
  }

  function hideCombo() {
    const badge = document.getElementById('juice-combo');
    if (badge) badge.classList.remove('show');
  }

  function ripple(el, event) {
    if (!el) return;
    const r = document.createElement('span');
    r.className = 'juice-ripple';
    const rect = el.getBoundingClientRect();
    const x = event ? event.clientX - rect.left : rect.width / 2;
    const y = event ? event.clientY - rect.top : rect.height / 2;
    r.style.left = `${x}px`;
    r.style.top = `${y}px`;
    el.classList.add('juice-ripple-host');
    el.append(r);
    setTimeout(() => r.remove(), 600);
  }

  function reward(kind, opts = {}) {
    hitCombo();
    const cx = opts.x ?? window.innerWidth / 2;
    const cy = opts.y ?? window.innerHeight * 0.4;
    if (kind === 'xp') {
      floatXp(opts.amount || 10, opts.from);
      burst(cx, cy, { count: 10, color: '#3ab4d8', spread: 60 });
    } else if (kind === 'achieve') {
      flash('achieve');
      burst(cx, cy, { count: 26, color: '#2fe0b8', spread: 120 });
      document.body.classList.add('juice-shake');
      setTimeout(() => document.body.classList.remove('juice-shake'), 400);
    } else if (kind === 'rare') {
      flash('rare');
      burst(cx, cy, { count: 36, color: '#ffc87a', spread: 160 });
      sparkleRain();
    } else if (kind === 'level') {
      flash('level');
      burst(cx, cy, { count: 40, color: '#7dffc8', spread: 180 });
      document.getElementById('xp-chip')?.classList.add('juice-level-ring');
      setTimeout(() => document.getElementById('xp-chip')?.classList.remove('juice-level-ring'), 1200);
    } else if (kind === 'quest') {
      flash('achieve');
      burst(cx, cy, { count: 20, color: '#2fe0b8' });
    }
  }

  function sparkleRain() {
    const root = ensure();
    if (!root) return;
    for (let i = 0; i < 24; i++) {
      const s = document.createElement('span');
      s.className = 'juice-sparkle';
      s.style.left = `${Math.random() * 100}%`;
      s.style.animationDelay = `${Math.random() * 0.4}s`;
      s.style.setProperty('--fall', `${60 + Math.random() * 40}vh`);
      root.append(s);
      setTimeout(() => s.remove(), 1400);
    }
  }

  function pulseStreak() {
    const chip = document.getElementById('streak-chip');
    chip?.classList.add('juice-streak-hot');
  }

  function launchPop(el) {
    el?.classList.add('juice-launch');
    setTimeout(() => el?.classList.remove('juice-launch'), 420);
  }

  return {
    burst,
    flash,
    floatXp,
    hitCombo,
    ripple,
    reward,
    pulseStreak,
    launchPop,
    getCombo: () => combo,
  };
})();

window.ErdOSJuice = ErdOSJuice;
