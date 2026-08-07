/* Toast + notification stack */
const ErdOSUI = (() => {
  let toastRoot = null;
  let notifPanel = null;

  function ensureToastRoot() {
    if (!toastRoot) {
      toastRoot = document.getElementById('toast-stack');
    }
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
      setTimeout(() => el.remove(), 280);
    }, 4200);
    if (kind === 'achieve') ErdOSSound.achieve();
    else if (kind === 'rare') ErdOSSound.rare();
    else if (kind === 'level') ErdOSSound.levelUp();
    else ErdOSSound.notify();
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
    if (!notifPanel.hidden) ErdOSSound.click();
  }

  return { toast, setNotifContent, toggleNotif, escapeHtml };
})();

window.ErdOSUI = ErdOSUI;
