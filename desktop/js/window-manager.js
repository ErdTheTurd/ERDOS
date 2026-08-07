/* global ErdOSApps, ErdOSSound, ErdOSProgress */

const windowManager = (() => {
  const layer = () => document.getElementById('windows-layer');
  const taskbar = () => document.getElementById('taskbar-apps');
  const windows = new Map();
  let zCounter = 10;
  let idCounter = 1;

  function focus(id) {
    for (const win of windows.values()) {
      win.el.classList.toggle('is-focused', win.id === id);
      win.taskBtn.classList.toggle('is-active', win.id === id);
      if (win.id === id) {
        win.el.style.zIndex = String(++zCounter);
        win.el.classList.remove('is-minimized');
        win.minimized = false;
      }
    }
  }

  function close(id) {
    const win = windows.get(id);
    if (!win) return;
    ErdOSSound.close();
    win.el.remove();
    win.taskBtn.remove();
    windows.delete(id);
  }

  function minimize(id) {
    const win = windows.get(id);
    if (!win) return;
    win.minimized = true;
    win.el.classList.add('is-minimized');
    win.el.classList.remove('is-focused');
    win.taskBtn.classList.remove('is-active');
    ErdOSSound.click();
  }

  function toggleMaximize(id) {
    const win = windows.get(id);
    if (!win) return;
    win.maximized = !win.maximized;
    win.el.classList.toggle('is-maximized', win.maximized);
    if (!win.maximized) {
      win.el.style.left = win.restore.left;
      win.el.style.top = win.restore.top;
      win.el.style.width = win.restore.width;
      win.el.style.height = win.restore.height;
    } else {
      win.restore = {
        left: win.el.style.left,
        top: win.el.style.top,
        width: win.el.style.width,
        height: win.el.style.height,
      };
    }
    ErdOSSound.click();
  }

  function open(appId, opts = {}) {
    const app = ErdOSApps.APPS.find((a) => a.id === appId);
    if (!app) return null;

    const id = `win-${idCounter++}`;
    const offset = (windows.size % 8) * 28;
    const winEl = document.createElement('div');
    winEl.className = 'window is-focused';
    winEl.style.left = `${80 + offset}px`;
    winEl.style.top = `${48 + offset}px`;
    winEl.style.width = `${app.width}px`;
    winEl.style.height = `${app.height}px`;
    winEl.dataset.windowId = id;

    const title = document.createElement('div');
    title.className = 'window-title';
    title.textContent = app.name;

    const controls = document.createElement('div');
    controls.className = 'window-controls';
    const mkBtn = (label, cls, fn) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = `win-btn ${cls}`;
      b.textContent = label;
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        fn();
      });
      return b;
    };
    controls.append(
      mkBtn('─', 'min', () => minimize(id)),
      mkBtn('□', 'max', () => toggleMaximize(id)),
      mkBtn('×', 'close', () => close(id))
    );

    const titlebar = document.createElement('div');
    titlebar.className = 'window-titlebar';
    titlebar.append(title, controls);

    const body = document.createElement('div');
    body.className = 'window-body';

    const taskBtn = document.createElement('button');
    taskBtn.type = 'button';
    taskBtn.className = 'task-btn is-active';
    taskBtn.textContent = app.name;

    body.__windowApi = {
      setTitle: (t) => {
        title.textContent = t;
        taskBtn.textContent = t;
      },
      close: () => close(id),
      shake: () => {
        winEl.classList.remove('is-shaking');
        void winEl.offsetWidth;
        winEl.classList.add('is-shaking');
      },
    };

    const resize = document.createElement('div');
    resize.className = 'resize-handle';
    winEl.append(titlebar, body, resize);
    layer().append(winEl);
    taskbar().append(taskBtn);

    taskBtn.addEventListener('click', () => {
      const win = windows.get(id);
      if (!win) return;
      if (win.minimized) {
        win.minimized = false;
        win.el.classList.remove('is-minimized');
        focus(id);
      } else if (win.el.classList.contains('is-focused')) {
        minimize(id);
      } else {
        focus(id);
      }
    });

    windows.set(id, {
      id,
      appId,
      el: winEl,
      taskBtn,
      minimized: false,
      maximized: false,
      restore: {},
    });

    enableDrag(winEl, titlebar, id);
    enableResize(winEl, resize, id);
    winEl.addEventListener('mousedown', () => focus(id));

    ErdOSSound.open();
    app.mount(body, opts);
    focus(id);
    ErdOSProgress.onAppLaunch(appId);
    const chip = document.getElementById('xp-chip');
    const rect = chip?.getBoundingClientRect();
    ErdOSJuice?.burst(
      rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
      rect ? rect.top : 40,
      { count: 8, color: '#2fe0b8', spread: 40 }
    );
    ErdOSJuice?.hitCombo();
    return id;
  }

  function enableDrag(winEl, titlebar, id) {
    let startX = 0;
    let startY = 0;
    let origX = 0;
    let origY = 0;
    let dragging = false;

    titlebar.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.win-btn')) return;
      const win = windows.get(id);
      if (!win || win.maximized) return;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origX = winEl.offsetLeft;
      origY = winEl.offsetTop;
      titlebar.setPointerCapture(e.pointerId);
      focus(id);
    });

    titlebar.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      winEl.style.left = `${origX + (e.clientX - startX)}px`;
      winEl.style.top = `${Math.max(0, origY + (e.clientY - startY))}px`;
    });

    titlebar.addEventListener('pointerup', () => {
      dragging = false;
    });
  }

  function enableResize(winEl, handle, id) {
    let resizing = false;
    let startX = 0;
    let startY = 0;
    let startW = 0;
    let startH = 0;

    handle.addEventListener('pointerdown', (e) => {
      const win = windows.get(id);
      if (!win || win.maximized) return;
      resizing = true;
      startX = e.clientX;
      startY = e.clientY;
      startW = winEl.offsetWidth;
      startH = winEl.offsetHeight;
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    handle.addEventListener('pointermove', (e) => {
      if (!resizing) return;
      winEl.style.width = `${Math.max(360, startW + (e.clientX - startX))}px`;
      winEl.style.height = `${Math.max(240, startH + (e.clientY - startY))}px`;
    });

    handle.addEventListener('pointerup', () => {
      resizing = false;
    });
  }

  return { open, close, focus, minimize };
})();

window.windowManager = windowManager;
