/* global ErdOSApps, windowManager */

(function bootErdOS() {
  const boot = document.getElementById('boot-screen');
  const desktop = document.getElementById('desktop');
  const startMenu = document.getElementById('start-menu');
  const startApps = document.getElementById('start-apps');
  const desktopIcons = document.getElementById('desktop-icons');
  const clock = document.getElementById('clock');
  const btnStart = document.getElementById('btn-start');
  const btnShutdown = document.getElementById('btn-shutdown');

  const savedTheme = localStorage.getItem('erdos-theme');
  if (savedTheme) document.body.classList.add(savedTheme);

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
  setInterval(updateClock, 1000 * 20);

  function launch(appId) {
    startMenu.hidden = true;
    windowManager.open(appId);
  }

  for (const app of ErdOSApps.APPS) {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'start-app';
    item.innerHTML = `
      <span class="start-app-glyph">${app.glyph}</span>
      <span class="start-app-meta">
        <strong>${app.name}</strong>
        <small>${app.description}</small>
      </span>
    `;
    item.addEventListener('click', () => launch(app.id));
    startApps.append(item);

    if (app.desktop) {
      const icon = document.createElement('button');
      icon.type = 'button';
      icon.className = 'desk-icon';
      icon.innerHTML = `
        <span class="desk-icon-glyph">${app.glyph}</span>
        <span>${app.name}</span>
      `;
      icon.addEventListener('dblclick', () => launch(app.id));
      icon.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') launch(app.id);
      });
      desktopIcons.append(icon);
    }
  }

  btnStart.addEventListener('click', (e) => {
    e.stopPropagation();
    startMenu.hidden = !startMenu.hidden;
  });

  document.addEventListener('click', (e) => {
    if (!startMenu.hidden && !startMenu.contains(e.target) && e.target !== btnStart && !btnStart.contains(e.target)) {
      startMenu.hidden = true;
    }
  });

  btnShutdown.addEventListener('click', () => {
    startMenu.hidden = true;
    if (confirm('Shut down ErdOS?')) {
      window.close();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Meta' || (e.ctrlKey && e.key.toLowerCase() === 'escape')) {
      startMenu.hidden = !startMenu.hidden;
    }
  });

  setTimeout(() => {
    boot.classList.add('is-done');
    desktop.hidden = false;
    setTimeout(() => {
      boot.remove();
      windowManager.open('erdai');
    }, 520);
  }, 1900);
})();
