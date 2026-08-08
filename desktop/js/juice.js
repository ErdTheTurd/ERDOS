/* Quiet feedback — polish over spectacle */
const ErdOSJuice = (() => {
  let layer = null;

  function ensure() {
    if (!layer) layer = document.getElementById('juice-layer');
    return layer;
  }

  function floatXp() { /* XP system removed */ }

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
    setTimeout(() => r.remove(), 500);
  }

  // no-ops kept for call sites
  function burst() {}
  function flash() {}
  function hitCombo() {}
  function reward(kind, opts = {}) {
    if (kind === 'xp' && opts.amount) floatXp(opts.amount);
  }
  function pulseStreak() {}
  function launchPop() {}

  return { burst, flash, floatXp, hitCombo, ripple, reward, pulseStreak, launchPop, getCombo: () => 0 };
})();

window.ErdOSJuice = ErdOSJuice;
