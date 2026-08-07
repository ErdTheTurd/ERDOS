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
  const btnQuest = document.getElementById('btn-quest');
  const streakChip = document.getElementById('streak-chip');
  const xpChip = document.getElementById('xp-chip');
  const btnClock = document.getElementById('btn-clock');
  const questOverlay = document.getElementById('quest-overlay');
  const questClose = document.getElementById('quest-close');
  const contextMenu = document.getElementById('context-menu');
  const wallpaper = document.getElementById('wallpaper');

  const stages = ['Warming CRT…', 'Loading phosphor…', 'Calibrating glass…', 'Starting desktop…'];
  let stageIdx = 0;
  const stageTimer = setInterval(() => {
    stageIdx = Math.min(stageIdx + 1, stages.length - 1);
    bootStatus.textContent = stages[stageIdx];
    ErdOSSound.tick();
  }, 550);

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

  function refreshHud() {
    const p = ErdOSProgress.get() || {};
    const lv = ErdOSProgress.levelFromXp(p.xp || 0);
    streakChip.textContent = `Day ${p.streak || 0}`;
    const xpLevel = document.getElementById('xp-level');
    const xpFill = document.getElementById('xp-fill');
    if (xpLevel) xpLevel.textContent = `Lv ${lv.level}`;
    else xpChip.textContent = `Lv ${lv.level}`;
    if (xpFill) xpFill.style.width = `${Math.min(100, (lv.into / lv.need) * 100)}%`;
    refreshQuestUI();
    refreshNotif();
  }

  function refreshQuestUI() {
    const q = ErdOSProgress.questProgress();
    const fill = document.getElementById('quest-fill');
    const count = document.getElementById('quest-count');
    const list = document.getElementById('quest-list');
    const dailyList = document.getElementById('daily-list');
    const coach = document.getElementById('erdai-coach');
    if (!fill) return;
    fill.style.width = `${(q.done / q.total) * 100}%`;
    count.textContent = q.completed ? 'First Boot complete' : `First Boot · ${q.done} / ${q.total}`;
    if (coach) coach.textContent = ErdOSProgress.coachLine();
    const items = [
      ['openBrowser', 'Open the Browser'],
      ['chatErdai', 'Chat with ERDAI'],
      ['playGame', 'Play an Arcade game'],
      ['saveNote', 'Save a Notepad file'],
      ['changeTheme', 'Change accent theme'],
    ];
    const quest = ErdOSProgress.get()?.quest || {};
    list.innerHTML = items
      .map(
        ([k, label]) =>
          `<li class="${quest[k] ? 'done' : ''}"><span class="quest-check">${quest[k] ? '✓' : ''}</span>${label}</li>`
      )
      .join('');
    const dailies = ErdOSProgress.get()?.daily?.quests || [];
    if (dailyList) {
      dailyList.innerHTML = dailies.length
        ? dailies
            .map(
              (d) =>
                `<li class="${d.done ? 'done' : ''}"><span class="quest-check">${d.done ? '✓' : `${d.progress || 0}/${d.target}`}</span>${d.label}</li>`
            )
            .join('')
        : '<li><span class="quest-check"></span>No dailies yet — reboot tomorrow</li>';
    }
  }

  function refreshNotif() {
    const p = ErdOSProgress.get() || {};
    const lv = ErdOSProgress.levelFromXp(p.xp || 0);
    const recent = (p.recentAchievements || [])
      .slice(0, 4)
      .map((r) => {
        const a = ErdOSProgress.ACHIEVEMENTS.find((x) => x.id === r.id);
        return a ? `<div>• ${a.name}</div>` : '';
      })
      .join('');
    const q = ErdOSProgress.questProgress();
    const dailies = (p.daily?.quests || []).filter((d) => !d.done);
    ErdOSUI.setNotifContent(`
      <div><strong>ERDAI</strong><div class="muted">${ErdOSUI.escapeHtml(ErdOSProgress.coachLine())}</div></div>
      <div><strong>Streak</strong><div class="muted">Day ${p.streak || 0} · best ${p.longestStreak || 0} · freezes ${p.streakFreeze || 0}</div></div>
      <div><strong>Level ${lv.level}</strong><div class="muted">${p.xp || 0} XP · ${lv.need - lv.into} to next · rare ${p.launchesSinceRare || 0}/22</div></div>
      <div><strong>Daily</strong><div class="muted">${p.daily?.cleared ? 'Cleared ✓' : `${dailies.length} left`}</div></div>
      <div><strong>Quest</strong><div class="muted">${q.completed ? 'Complete' : `${q.done}/${q.total} steps`}</div></div>
      <div><strong>Recent trophies</strong>${recent || '<div class="muted">None yet</div>'}</div>
    `);
  }

  function showCoachBubble() {
    const bubble = document.getElementById('coach-bubble');
    if (!bubble) return;
    const hook = ErdOSProgress.nextHook();
    bubble.hidden = false;
    bubble.innerHTML = `
      <strong>ERDAI</strong>
      <div>${ErdOSUI.escapeHtml(ErdOSProgress.coachLine())}</div>
      <button type="button" id="coach-go">${ErdOSUI.escapeHtml(hook.label)} →</button>
    `;
    document.getElementById('coach-go')?.addEventListener('click', () => {
      bubble.hidden = true;
      launch(hook.app);
    });
    setTimeout(() => {
      if (!bubble.hidden) bubble.hidden = true;
    }, 14000);
  }

  function launch(appId) {
    startMenu.hidden = true;
    contextMenu.hidden = true;
    windowManager.open(appId);
    refreshHud();
  }

  function renderAppButton(app, container) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'start-app';
    item.dataset.appId = app.id;
    item.innerHTML = `
      <span class="start-app-glyph">${app.glyph}</span>
      <span class="start-app-meta">
        <strong>${app.name}</strong>
        <small>${app.description}</small>
      </span>
    `;
    item.addEventListener('click', () => launch(app.id));
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
      btn.textContent = app.glyph;
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
    ErdOSApps.APPS.filter((a) => a.desktop).forEach((app, index) => {
      const icon = document.createElement('button');
      icon.type = 'button';
      icon.className = 'desk-icon';
      icon.dataset.appId = app.id;
      icon.innerHTML = `
        <span class="desk-icon-glyph">${app.glyph}</span>
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

  renderStart();
  renderPins();
  renderIcons();
  refreshHud();
  ErdOSProgress.onChange(() => refreshHud());

  startSearch.addEventListener('input', () => {
    const q = startSearch.value.trim().toLowerCase();
    startApps.querySelectorAll('.start-app').forEach((btn) => {
      const app = ErdOSApps.APPS.find((a) => a.id === btn.dataset.appId);
      const match = !q || app.name.toLowerCase().includes(q) || app.description.toLowerCase().includes(q);
      btn.style.display = match ? '' : 'none';
    });
  });

  btnStart.addEventListener('click', (e) => {
    e.stopPropagation();
    startMenu.hidden = !startMenu.hidden;
    if (!startMenu.hidden) {
      ErdOSSound.click();
      startSearch.value = '';
      startSearch.dispatchEvent(new Event('input'));
      setTimeout(() => startSearch.focus(), 30);
    }
  });

  document.addEventListener('click', (e) => {
    if (!startMenu.hidden && !startMenu.contains(e.target) && e.target !== btnStart && !btnStart.contains(e.target)) {
      startMenu.hidden = true;
    }
    if (!contextMenu.hidden && !contextMenu.contains(e.target)) contextMenu.hidden = true;
    const notif = document.getElementById('notif-panel');
    if (notif && !notif.hidden && !notif.contains(e.target) && e.target !== btnClock && !btnClock.contains(e.target)) {
      notif.hidden = true;
    }
  });

  btnShutdown.addEventListener('click', () => {
    startMenu.hidden = true;
    if (confirm('Shut down ErdOS?')) window.close();
  });

  function showQuest(force) {
    if (force === false) questOverlay.hidden = true;
    else {
      refreshQuestUI();
      questOverlay.hidden = false;
      ErdOSSound.click();
    }
  }

  btnQuest.addEventListener('click', () => {
    startMenu.hidden = true;
    showQuest(true);
  });
  questClose.addEventListener('click', () => showQuest(false));
  questOverlay.addEventListener('click', (e) => {
    if (e.target === questOverlay) showQuest(false);
  });

  streakChip.addEventListener('click', () => showQuest(true));
  xpChip.addEventListener('click', () => launch('trophies'));
  document.getElementById('quest-do-next')?.addEventListener('click', () => {
    const hook = ErdOSProgress.nextHook();
    showQuest(false);
    launch(hook.app);
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
      const unlocked = p.unlockedWallpapers || ['phosphor-grid'];
      const idx = unlocked.indexOf(p.wallpaper);
      const next = unlocked[(idx + 1) % unlocked.length];
      await ErdOSProgress.setWallpaper(next);
      wallpaper.className = `wallpaper wallpaper-${next}`;
      ErdOSUI.toast('Wallpaper', ErdOSProgress.WALLPAPERS[next] || next, 'info');
    } else if (action === 'quest') showQuest(true);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Meta' || (e.ctrlKey && e.key.toLowerCase() === 'escape')) {
      startMenu.hidden = !startMenu.hidden;
    }
  });

  window.erdos.onUpdateStatus?.((payload) => {
    if (payload.status === 'available') {
      ErdOSUI.toast('Update available', `ErdOS ${payload.version}`, 'info');
    } else if (payload.status === 'ready') {
      ErdOSUI.toast('Update ready', 'Restart from Settings to install', 'info');
    }
  });

  setTimeout(async () => {
    clearInterval(stageTimer);
    bootStatus.textContent = 'Welcome.';
    ErdOSSound.boot();
    boot.classList.add('is-done');
    desktop.hidden = false;
    setTimeout(async () => {
      boot.remove();
      refreshHud();
      const fortune = await ErdOSProgress.dailyFortune();
      ErdOSUI.toast('ERDAI fortune', fortune, 'info');
      setTimeout(() => showCoachBubble(), 700);
      const p = ErdOSProgress.get();
      if (!p?.quest?.completed || !(p.daily?.cleared)) {
        setTimeout(() => showQuest(true), 1600);
      }
      windowManager.open('erdai');
    }, 520);
  }, 2600);
})();
