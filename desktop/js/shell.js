/* global ErdOSApps, windowManager, ErdOSProgress, ErdOSSound, ErdOSUI */

(async function bootErdOS() {
  const boot = document.getElementById('boot-screen');
  const bootStatus = document.getElementById('boot-status');
  const desktop = document.getElementById('desktop');
  const startMenu = document.getElementById('start-menu');
  const startApps = document.getElementById('start-apps');
  const startPinned = document.getElementById('start-pinned');
  const startSearch = document.getElementById('start-search');
  const desktopIcons = document.getElementById('desktop-icons');
  const taskbarPins = document.getElementById('taskbar-pins');
  const clock = document.getElementById('clock');
  const btnStart = document.getElementById('btn-start');
  const btnShutdown = document.getElementById('btn-shutdown');
  const btnClock = document.getElementById('btn-clock');
  const contextMenu = document.getElementById('context-menu');
  const wallpaper = document.getElementById('wallpaper');

  const stages = ['Warming glass…', 'Starting services…', 'Loading desktop…', 'Almost ready…'];
  let stageIdx = 0;
  const stageTimer = setInterval(() => {
    stageIdx = Math.min(stageIdx + 1, stages.length - 1);
    bootStatus.textContent = stages[stageIdx];
    ErdOSSound.tick();
  }, 500);

  await ErdOSProgress.init();
  const state = ErdOSProgress.get();

  const savedTheme = localStorage.getItem('erdos-theme');
  if (savedTheme) document.body.classList.add(savedTheme);
  wallpaper.className = `wallpaper wallpaper-${state.wallpaper || 'phosphor-grid'}`;

  function updateClock() {
    const now = new Date();
    clock.textContent = now.toLocaleString(undefined, {
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    clock.dateTime = now.toISOString();
  }
  updateClock();
  setInterval(updateClock, 20000);

  function refreshNotif() {
    const p = ErdOSProgress.get() || {};
    const scores = p.highScores || {};
    ErdOSUI.setNotifContent(`
      <div><strong>ERDAI</strong><div class="muted">Real AI via Puter — open ERDAI to chat.</div></div>
      <div><strong>Profile</strong><div class="muted">${ErdOSUI.escapeHtml(p.displayName || 'Guest')}</div></div>
      <div><strong>Arcade bests</strong><div class="muted">Snake ${scores.snake || 0} · Breakout ${scores.breakout || 0} · Pong ${scores.pong || 0}</div></div>
    `);
  }

  function launch(appId) {
    startMenu.hidden = true;
    contextMenu.hidden = true;
    windowManager.open(appId);
    refreshNotif();
  }

  function iconMarkup(app) {
    const mark = app.icon || app.glyph || '?';
    const isSvg = String(mark).includes('<svg');
    return isSvg ? mark : `<span class="icon-text">${mark}</span>`;
  }

  function renderAppButton(app, container) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'start-app';
    item.dataset.appId = app.id;
    item.innerHTML = `
      <span class="start-app-glyph">${iconMarkup(app)}</span>
      <span class="start-app-meta">
        <strong>${app.name}</strong>
        <small>${app.description}</small>
      </span>
    `;
    item.addEventListener('click', (e) => {
      ErdOSJuice?.ripple(item, e);
      launch(app.id);
    });
    container.append(item);
  }

  function renderStart() {
    startApps.innerHTML = '';
    startPinned.innerHTML = '';
    const pinned = state.pinnedApps || ['browser', 'erdai', 'games', 'terminal'];
    for (const app of ErdOSApps.APPS) {
      renderAppButton(app, startApps);
      if (pinned.includes(app.id)) renderAppButton(app, startPinned);
    }
  }

  function renderPins() {
    taskbarPins.innerHTML = '';
    const pinned = ErdOSProgress.get()?.pinnedApps || ['browser', 'erdai', 'games', 'terminal'];
    for (const id of pinned) {
      const app = ErdOSApps.APPS.find((a) => a.id === id);
      if (!app) continue;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pin-btn';
      btn.innerHTML = iconMarkup(app);
      btn.title = app.name;
      btn.addEventListener('click', () => launch(app.id));
      taskbarPins.append(btn);
    }
  }

  function renderIcons() {
    desktopIcons.innerHTML = '';
    const layout = ErdOSProgress.get()?.iconLayout || {};
    let col = 0;
    let row = 0;
    ErdOSApps.APPS.filter((a) => a.desktop).forEach((app) => {
      const icon = document.createElement('button');
      icon.type = 'button';
      icon.className = 'desk-icon';
      icon.dataset.appId = app.id;
      icon.innerHTML = `
        <span class="desk-icon-glyph">${iconMarkup(app)}</span>
        <span>${app.name}</span>
      `;
      const saved = layout[app.id];
      const x = saved?.x ?? 8 + col * 100;
      const y = saved?.y ?? 8 + row * 100;
      icon.style.left = `${x}px`;
      icon.style.top = `${y}px`;
      row += 1;
      if (row > 5) {
        row = 0;
        col += 1;
      }

      icon.addEventListener('dblclick', () => launch(app.id));
      icon.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') launch(app.id);
      });

      let dragging = false;
      let ox = 0;
      let oy = 0;
      let sx = 0;
      let sy = 0;
      icon.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        dragging = true;
        sx = e.clientX;
        sy = e.clientY;
        ox = icon.offsetLeft;
        oy = icon.offsetTop;
        icon.setPointerCapture(e.pointerId);
      });
      icon.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        icon.style.left = `${Math.max(0, ox + e.clientX - sx)}px`;
        icon.style.top = `${Math.max(0, oy + e.clientY - sy)}px`;
      });
      icon.addEventListener('pointerup', async () => {
        if (!dragging) return;
        dragging = false;
        const grid = 20;
        const lx = Math.round(icon.offsetLeft / grid) * grid;
        const ly = Math.round(icon.offsetTop / grid) * grid;
        icon.style.left = `${lx}px`;
        icon.style.top = `${ly}px`;
        const next = { ...(ErdOSProgress.get()?.iconLayout || {}) };
        next[app.id] = { x: lx, y: ly };
        await ErdOSProgress.setIconLayout(next);
      });

      desktopIcons.append(icon);
    });
  }

  startSearch.addEventListener('input', () => {
    const q = startSearch.value.trim().toLowerCase();
    startApps.querySelectorAll('.start-app').forEach((btn) => {
      const app = ErdOSApps.APPS.find((a) => a.id === btn.dataset.appId);
      const match = !q || app.name.toLowerCase().includes(q) || app.description.toLowerCase().includes(q);
      btn.style.display = match ? '' : 'none';
    });
  });

  function closeStartMenu() {
    startMenu.hidden = true;
  }

  function openStartMenu() {
    startMenu.hidden = false;
    ErdOSSound.click();
    startSearch.value = '';
    startSearch.dispatchEvent(new Event('input'));
    setTimeout(() => startSearch.focus(), 30);
  }

  btnStart.addEventListener('click', (e) => {
    e.stopPropagation();
    ErdOSJuice?.ripple(btnStart, e);
    if (startMenu.hidden) openStartMenu();
    else closeStartMenu();
  });

  document.getElementById('start-close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeStartMenu();
  });

  document.addEventListener('click', (e) => {
    if (!startMenu.hidden && !startMenu.contains(e.target) && e.target !== btnStart && !btnStart.contains(e.target)) {
      closeStartMenu();
    }
    if (!contextMenu.hidden && !contextMenu.contains(e.target)) contextMenu.hidden = true;
    const notif = document.getElementById('notif-panel');
    if (notif && !notif.hidden && !notif.contains(e.target) && e.target !== btnClock && !btnClock.contains(e.target)) {
      notif.hidden = true;
    }
  });

  document.getElementById('btn-erdai')?.addEventListener('click', () => {
    closeStartMenu();
    launch('erdai');
  });

  btnShutdown.addEventListener('click', () => {
    closeStartMenu();
    if (confirm('Shut down ErdOS?')) window.close();
  });

  btnClock.addEventListener('click', (e) => {
    e.stopPropagation();
    refreshNotif();
    ErdOSUI.toggleNotif();
  });

  desktop.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.window') || e.target.closest('.start-menu') || e.target.closest('.taskbar')) return;
    e.preventDefault();
    contextMenu.hidden = false;
    contextMenu.style.left = `${e.clientX}px`;
    contextMenu.style.top = `${Math.min(e.clientY, window.innerHeight - 200)}px`;
  });

  contextMenu.addEventListener('click', async (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const action = btn.dataset.action;
    contextMenu.hidden = true;
    if (action === 'refresh') {
      renderIcons();
      ErdOSSound.click();
    } else if (action === 'new-note') launch('sticky');
    else if (action === 'wallpaper') {
      const p = ErdOSProgress.get();
      const unlocked = p.unlockedWallpapers || Object.keys(ErdOSProgress.WALLPAPERS);
      const idx = unlocked.indexOf(p.wallpaper);
      const next = unlocked[(idx + 1) % unlocked.length];
      await ErdOSProgress.setWallpaper(next);
      wallpaper.className = `wallpaper wallpaper-${next}`;
      ErdOSUI.toast('Wallpaper', ErdOSProgress.WALLPAPERS[next] || next, 'info');
    } else if (action === 'erdai') launch('erdai');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (!startMenu.hidden) {
        closeStartMenu();
        return;
      }
      const notif = document.getElementById('notif-panel');
      if (notif && !notif.hidden) {
        notif.hidden = true;
        return;
      }
      if (!contextMenu.hidden) contextMenu.hidden = true;
      return;
    }
    if (e.key === 'Meta' || (e.ctrlKey && e.key.toLowerCase() === 'escape')) {
      if (startMenu.hidden) openStartMenu();
      else closeStartMenu();
    }
  });

  window.erdos.onUpdateStatus?.((payload) => {
    if (payload.status === 'available') {
      ErdOSUI.toast('Update available', `ErdOS ${payload.version}`, 'info');
    }
  });

  ErdOSProgress.onChange(() => refreshNotif());

  renderStart();
  renderPins();
  renderIcons();
  refreshNotif();

  setTimeout(async () => {
    clearInterval(stageTimer);
    bootStatus.textContent = 'Ready';
    ErdOSSound.boot();
    boot.classList.add('is-done');
    desktop.hidden = false;
    setTimeout(() => {
      boot.remove();
    }, 480);
  }, 2000);
})();
