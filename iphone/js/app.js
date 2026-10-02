/* Phone shell. One full-screen section at a time, plus a bottom tab bar. */
const ErdosPhone = (() => {
  const tabs = ['browser', 'blok', 'erdai', 'notes', 'arcade'];
  let toastTimer = null;
  let shareOpen = false;

  function show(tab) {
    if (!tabs.includes(tab)) return;
    document.querySelectorAll('.panel').forEach((panel) => {
      panel.hidden = panel.dataset.panel !== tab;
    });
    document.querySelectorAll('.tabbar button').forEach((button) => {
      if (button.dataset.tab === tab) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    const theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.content = tab === 'blok' ? '#2F6BFF' : '#f5f7fb';
    document.body.dataset.tab = tab;
    if (window.erdos && window.erdos.setStatusBar) {
      window.erdos.setStatusBar(tab === 'blok' ? 'light-text' : 'dark-text');
    }
    if (tab !== 'browser' && window.erdos && window.erdos.browser) {
      window.erdos.browser.setVisible(false);
    } else if (window.BrowserUI) {
      window.BrowserUI.syncNativeFrame();
    }
    if (tab === 'blok' && window.BlokUI) window.BlokUI.refresh();
    if (tab === 'notes' && window.NotesUI) window.NotesUI.render();
    if (tab === 'erdai' && window.ErdAIPhone) window.ErdAIPhone.render();
    if (tab === 'arcade' && window.ArcadeUI && document.getElementById('play-snake') == null && document.getElementById('snake-board') == null) {
      window.ArcadeUI.menu();
    }
  }

  function toast(text, undo) {
    const host = document.getElementById('toast-host');
    host.innerHTML = '';
    const node = document.createElement('div');
    node.className = 'toast';
    node.setAttribute('role', 'status');
    const label = document.createElement('span');
    label.textContent = text;
    node.append(label);
    if (undo) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Undo';
      button.addEventListener('click', () => {
        undo();
        host.innerHTML = '';
      });
      node.append(button);
    }
    host.append(node);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { if (node.isConnected) node.remove(); }, 4200);
  }

  function shareSheet() {
    if (shareOpen) return;
    window.erdos.blok.settings().then((settings) => {
      if (settings.shareChoice && settings.shareChoice !== 'unset') return;
      shareOpen = true;
      if (window.erdos.browser.native) window.erdos.browser.setVisible(false);
      const host = document.getElementById('sheet-host');
      const scrim = document.createElement('div');
      scrim.className = 'sheet-scrim';
      scrim.id = 'share-sheet';
      const sheet = document.createElement('div');
      sheet.className = 'sheet';
      sheet.setAttribute('role', 'dialog');
      sheet.innerHTML = '<div class="sheet-handle"></div><span class="pill-tag">Learning</span><h2>Keep corrections on this phone?</h2><p>Blok’s detectors are trained from use. Your answer is always saved on this phone so a future on-device model can learn it. Sharing is separate and optional.</p><p><strong>If you share:</strong> the text (with emails and phone numbers removed), or a content hash for pictures and sound, the site’s domain, the score, your answer, and the app version can be queued for ERDOS to retrain Blok. History, cookies, and logins are not included. Password pages are skipped.</p><p>This build does not upload anything. Approved items wait on this phone.</p>';
      const pair = document.createElement('div');
      pair.className = 'pair';
      const share = document.createElement('button');
      share.className = 'primary';
      share.type = 'button';
      share.textContent = 'Share to improve Blok';
      const local = document.createElement('button');
      local.className = 'ghost';
      local.type = 'button';
      local.textContent = 'Keep it on my phone';
      const close = (choice) => {
        window.erdos.blok.setShareChoice(choice).then(() => {
          scrim.remove();
          shareOpen = false;
          if (window.BlokUI) window.BlokUI.refresh();
          if (window.BrowserUI) window.BrowserUI.syncNativeFrame();
        });
      };
      share.addEventListener('click', () => close('share'));
      local.addEventListener('click', () => close('local'));
      pair.append(share, local);
      sheet.append(pair);
      scrim.append(sheet);
      host.append(scrim);
    });
  }

  function bindKeyboard() {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () => {
      const keyboard = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      document.documentElement.style.setProperty('--keyboard', keyboard + 'px');
      document.body.classList.toggle('keyboard-open', keyboard > 80);
    };
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
  }

  function boot() {
    window.BrowserUI.mount(document.getElementById('panel-browser'));
    window.BlokUI.mount(document.getElementById('panel-blok'));
    window.ErdAIPhone.mount(document.getElementById('panel-erdai'));
    window.NotesUI.mount(document.getElementById('panel-notes'));
    window.ArcadeUI.mount(document.getElementById('panel-arcade'));
    document.querySelectorAll('.tabbar button').forEach((button) => {
      button.addEventListener('click', () => show(button.dataset.tab));
    });
    window.erdos.on((event) => {
      if (event === 'share-prompt') shareSheet();
    });
    bindKeyboard();
    show('browser');
    if (window.Onboarding && !window.Onboarding.seen()) window.Onboarding.open({ replay: false });
  }

  document.addEventListener('DOMContentLoaded', boot);
  return { show, toast, shareSheet };
})();
window.ErdosPhone = ErdosPhone;
