/* Preferences + light desktop state — no XP / streaks / quests */
const WALLPAPERS = {
  'phosphor-grid': 'Phosphor Grid',
  'deep-scan': 'Deep Scan',
  'crt-dawn': 'CRT Dawn',
  'signal-bloom': 'Signal Bloom',
  'midnight-beam': 'Midnight Beam',
};

const ALL_THEMES = ['', 'theme-ember', 'theme-violet-night', 'theme-forest'];

const ErdOSProgress = (() => {
  let state = null;
  const listeners = new Set();

  function defaultProgress() {
    return {
      version: 2,
      displayName: '',
      muted: false,
      wallpaper: 'phosphor-grid',
      unlockedWallpapers: Object.keys(WALLPAPERS),
      unlockedThemes: [...ALL_THEMES],
      pinnedApps: ['browser', 'erdai', 'games', 'terminal'],
      iconLayout: {},
      highScores: { snake: 0, breakout: 0, memory: 0, pong: 0 },
      erdaiMemory: { facts: [] },
    };
  }

  function emit() {
    for (const fn of listeners) {
      try { fn(state); } catch (_) { /* ignore */ }
    }
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function isUntouchedDefault(raw) {
    if (!raw || typeof raw !== 'object') return true;
    const base = defaultProgress();
    if (raw.displayName) return false;
    if (raw.muted) return false;
    if (raw.wallpaper && raw.wallpaper !== base.wallpaper) return false;
    if (raw.iconLayout && Object.keys(raw.iconLayout).length) return false;
    const scores = raw.highScores || {};
    if (Object.keys(base.highScores).some((key) => Number(scores[key]) > 0)) return false;
    if (raw.erdaiMemory?.facts?.length) return false;
    if (Array.isArray(raw.pinnedApps) && raw.pinnedApps.join('\0') !== base.pinnedApps.join('\0')) {
      return false;
    }
    return true;
  }

  async function load() {
    let fromDisk = null;
    try {
      const raw = await window.erdos?.getProgress?.();
      if (raw && typeof raw === 'object') fromDisk = raw;
    } catch (_) { /* fall through */ }
    let fromLocal = null;
    try {
      const local = localStorage.getItem('erdos-progress');
      if (local) fromLocal = JSON.parse(local);
    } catch (_) { /* fall through */ }

    // Preload exposes getProgress/setProgress. Older builds called
    // readProgress/writeProgress, so the file stayed at the first-launch
    // default while real state lived in localStorage. Keep that local copy
    // once; save() then writes it through setProgress.
    if (fromDisk && fromLocal && isUntouchedDefault(fromDisk) && !isUntouchedDefault(fromLocal)) {
      return migrate(fromLocal);
    }
    if (fromDisk) return migrate(fromDisk);
    if (fromLocal) return migrate(fromLocal);
    return defaultProgress();
  }

  function migrate(raw) {
    const base = defaultProgress();
    const next = { ...base, ...raw, version: 2 };
    next.unlockedWallpapers = Object.keys(WALLPAPERS);
    next.unlockedThemes = [...ALL_THEMES];
    next.highScores = { ...base.highScores, ...(raw.highScores || {}) };
    next.erdaiMemory = { facts: raw.erdaiMemory?.facts || [] };
    next.pinnedApps = Array.isArray(raw.pinnedApps) && raw.pinnedApps.length
      ? raw.pinnedApps
      : base.pinnedApps;
    // Drop gamification fields if present
    delete next.xp;
    delete next.level;
    delete next.streak;
    delete next.longestStreak;
    delete next.quest;
    delete next.daily;
    delete next.achievements;
    delete next.recentAchievements;
    delete next.streakFreeze;
    delete next.launchesSinceRare;
    return next;
  }

  async function save() {
    if (!state) return;
    try {
      localStorage.setItem('erdos-progress', JSON.stringify(state));
    } catch (_) { /* ignore */ }
    try {
      await window.erdos?.setProgress?.(state);
    } catch (_) { /* ignore */ }
    emit();
  }

  async function init() {
    state = await load();
    await save();
    return state;
  }

  function get() {
    return state;
  }

  async function setDisplayName(name) {
    if (!state) return;
    state.displayName = String(name || '').slice(0, 40);
    await save();
  }

  async function setMuted(muted) {
    if (!state) return;
    state.muted = !!muted;
    await save();
  }

  async function setWallpaper(id) {
    if (!state || !WALLPAPERS[id]) return false;
    state.wallpaper = id;
    await save();
    return true;
  }

  async function setIconLayout(layout) {
    if (!state) return;
    state.iconLayout = layout || {};
    await save();
  }

  async function rememberErdai(fact) {
    if (!state || !fact) return;
    state.erdaiMemory = state.erdaiMemory || { facts: [] };
    state.erdaiMemory.facts = [
      ...(state.erdaiMemory.facts || []).filter((f) => f !== fact),
      String(fact).slice(0, 200),
    ].slice(-12);
    await save();
  }

  async function onAppLaunch() {
    /* no gamification */
  }

  async function recordHighScore(game, score) {
    if (!state) return;
    const key = String(game || '').toLowerCase();
    if (!(key in (state.highScores || {}))) return;
    const prev = state.highScores[key] || 0;
    if (Number(score) > prev) {
      state.highScores[key] = Number(score) || 0;
      await save();
      ErdOSUI?.toast('New best', `${game}: ${score}`, 'info');
    }
  }

  async function onGamePlayed() { /* no XP — scores saved via recordHighScore */ }
  async function onErdaiMessage() { /* no-op */ }
  async function onNoteSaved() { /* no-op */ }
  async function onThemeChanged() { /* no-op */ }

  async function resetProgress() {
    const keep = {
      muted: state?.muted,
      displayName: state?.displayName,
      pinnedApps: state?.pinnedApps,
    };
    state = { ...defaultProgress(), ...keep };
    await save();
  }

  return {
    WALLPAPERS,
    init,
    get,
    save,
    onChange,
    setDisplayName,
    setMuted,
    setWallpaper,
    setIconLayout,
    rememberErdai,
    onAppLaunch,
    onGamePlayed,
    recordHighScore,
    onErdaiMessage,
    onNoteSaved,
    onThemeChanged,
    resetProgress,
  };
})();

window.ErdOSProgress = ErdOSProgress;
