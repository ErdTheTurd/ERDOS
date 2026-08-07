/* Toast + notification + juice bridge */
const ErdOSUI = (() => {
  let toastRoot = null;
  let notifPanel = null;

  function ensureToastRoot() {
    if (!toastRoot) toastRoot = document.getElementById('toast-stack');
    return toastRoot;
  }

  function toast(title, body = '', kind = 'info') {
    const root = ensureToastRoot();
    if (!root) return;
    const el = document.createElement('div');
    el.className = `toast toast-${kind}`;
    el.innerHTML = `<strong>${escapeHtml(title)}</strong>${body ? `<span>${escapeHtml(body)}</span>` : ''}`;
    root.append(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 320);
    }, kind === 'rare' || kind === 'level' ? 5200 : 4000);

    if (kind === 'achieve') {
      ErdOSSound.achieve();
      ErdOSJuice?.reward('achieve');
    } else if (kind === 'rare') {
      ErdOSSound.rare();
      ErdOSJuice?.reward('rare');
    } else if (kind === 'level') {
      ErdOSSound.levelUp();
      ErdOSJuice?.reward('level');
    } else {
      ErdOSSound.notify();
      if (/^\+\d+\s*XP/i.test(title)) {
        const n = parseInt(title.replace(/\D/g, ''), 10) || 0;
        ErdOSJuice?.reward('xp', { amount: n });
      } else {
        ErdOSJuice?.hitCombo();
      }
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function setNotifContent(html) {
    notifPanel = notifPanel || document.getElementById('notif-panel');
    if (!notifPanel) return;
    const body = notifPanel.querySelector('.notif-body');
    if (body) body.innerHTML = html;
  }

  function toggleNotif(force) {
    notifPanel = notifPanel || document.getElementById('notif-panel');
    if (!notifPanel) return;
    const show = force === undefined ? notifPanel.hidden : !force;
    notifPanel.hidden = show;
    if (!notifPanel.hidden) {
      ErdOSSound.click();
      ErdOSJuice?.hitCombo();
    }
  }

  return { toast, setNotifContent, toggleNotif, escapeHtml };
})();

window.ErdOSUI = ErdOSUI;
