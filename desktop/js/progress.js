/* Habit loop: XP, streaks, achievements, quests, variable rewards */
const ACHIEVEMENTS = [
  { id: 'first_boot', name: 'First Boot', desc: 'Boot ErdOS for the first time', xp: 25 },
  { id: 'browser_voyager', name: 'Browser Voyager', desc: 'Open the Browser', xp: 20 },
  { id: 'erdai_chatter', name: 'ERDAI Chatter', desc: 'Send 5 messages to ERDAI', xp: 30 },
  { id: 'arcade_rookie', name: 'Arcade Rookie', desc: 'Play any game', xp: 20 },
  { id: 'snake_50', name: 'Snake Charmer', desc: 'Score 50+ in Snake', xp: 40 },
  { id: 'breakout_100', name: 'Brick Breaker', desc: 'Score 100+ in Breakout', xp: 40 },
  { id: 'pong_ace', name: 'Pong Ace', desc: 'Score 10+ in Pong', xp: 35 },
  { id: 'note_taker', name: 'Note Taker', desc: 'Save a document in Notepad', xp: 20 },
  { id: 'theme_hopper', name: 'Theme Hopper', desc: 'Change the accent theme', xp: 15 },
  { id: 'quest_complete', name: 'Quest Complete', desc: 'Finish the First Boot Quest', xp: 100 },
  { id: 'streak_3', name: 'Warm Circuits', desc: 'Reach a 3-day streak', xp: 40 },
  { id: 'streak_7', name: 'Weekly Pulse', desc: 'Reach a 7-day streak', xp: 80 },
  { id: 'level_5', name: 'Phosphor Adept', desc: 'Reach level 5', xp: 50 },
  { id: 'level_10', name: 'Glass Master', desc: 'Reach level 10', xp: 100 },
  { id: 'night_owl', name: 'Night Owl', desc: 'Boot between midnight and 5am', xp: 25 },
  { id: 'terminal_hacker', name: 'Terminal Resident', desc: 'Open the Terminal', xp: 20 },
  { id: 'music_mood', name: 'Ambient Soul', desc: 'Open Music Box', xp: 15 },
  { id: 'trophy_hunter', name: 'Trophy Hunter', desc: 'Open the Trophy Case', xp: 15 },
  { id: 'rare_drop', name: 'Lucky Scan', desc: 'Receive a rare drop', xp: 30 },
  { id: 'pinned', name: 'Taskbar Curator', desc: 'Customize pinned apps', xp: 15 },
];

const WALLPAPERS = {
  'phosphor-grid': 'Phosphor Grid',
  'deep-scan': 'Deep Scan',
  'crt-dawn': 'CRT Dawn',
  'signal-bloom': 'Signal Bloom',
  'midnight-beam': 'Midnight Beam',
};

const RARE_WALLPAPERS = ['crt-dawn', 'signal-bloom', 'midnight-beam'];
const RARE_THEMES = ['theme-ember', 'theme-violet-night', 'theme-forest'];

const ErdOSProgress = (() => {
  let state = null;
  let ready = null;
  const listeners = new Set();

  function xpForLevel(level) {
    return 80 + (level - 1) * 40;
  }

  function levelFromXp(xp) {
    let level = 1;
    let remaining = xp;
    while (remaining >= xpForLevel(level)) {
      remaining -= xpForLevel(level);
      level += 1;
      if (level > 99) break;
    }
    return { level, into: remaining, need: xpForLevel(level) };
  }

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function yesterdayKey() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  async function init() {
    if (ready) return ready;
    ready = (async () => {
      state = await window.erdos.getProgress();
      handleDailyOpen();
      ErdOSSound.setMuted(!!state.muted);
      await window.erdos.setProgress(state);
      emit();
      return state;
    })();
    return ready;
  }

  function get() {
    return state;
  }

  async function save() {
    state = await window.erdos.setProgress(state);
    emit();
    return state;
  }

  function emit() {
    for (const fn of listeners) fn(state);
  }

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function handleDailyOpen() {
    const today = todayKey();
    if (state.lastOpenDate === today) {
      state.stats.boots = (state.stats.boots || 0) + 1;
      return;
    }
    const yesterday = yesterdayKey();
    if (state.lastOpenDate === yesterday) {
      state.streak = (state.streak || 0) + 1;
    } else if (state.lastOpenDate) {
      const old = state.streak || 0;
      state.streak = 1;
      if (old > 1) {
        addXp(15, true);
        queueMicrotask(() => ErdOSUI.toast('Comeback bonus', '+15 XP for returning', 'info'));
      }
    } else {
      state.streak = 1;
    }
    state.longestStreak = Math.max(state.longestStreak || 0, state.streak || 0);
    state.lastOpenDate = today;
    state.stats.boots = (state.stats.boots || 0) + 1;
    addXp(10, true);
    unlock('first_boot', true);
    if (state.streak >= 3) unlock('streak_3', true);
    if (state.streak >= 7) unlock('streak_7', true);
    const hour = new Date().getHours();
    if (hour < 5) unlock('night_owl', true);
  }

  function addXp(amount, silent) {
    if (!state || !amount) return;
    const before = levelFromXp(state.xp || 0).level;
    state.xp = (state.xp || 0) + amount;
    const after = levelFromXp(state.xp).level;
    state.level = after;
    if (after > before && !silent) {
      ErdOSUI.toast(`Level ${after}`, 'Phosphor circuits upgraded', 'level');
    }
    if (after >= 5) unlock('level_5', true);
    if (after >= 10) unlock('level_10', true);
  }

  function unlock(id, silent) {
    if (!state) return false;
    if (state.achievements?.[id]) return false;
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (!def) return false;
    state.achievements = state.achievements || {};
    state.achievements[id] = { at: Date.now() };
    state.recentAchievements = [
      { id, at: Date.now() },
      ...(state.recentAchievements || []),
    ].slice(0, 8);
    addXp(def.xp, true);
    if (!silent) {
      ErdOSUI.toast(def.name, def.desc, 'achieve');
    } else {
      queueMicrotask(() => ErdOSUI.toast(def.name, def.desc, 'achieve'));
    }
    return true;
  }

  function completeQuest(key) {
    if (!state?.quest) return;
    if (state.quest[key]) return;
    state.quest[key] = true;
    addXp(20);
    const keys = ['openBrowser', 'chatErdai', 'playGame', 'saveNote', 'changeTheme'];
    const done = keys.every((k) => state.quest[k]);
    if (done && !state.quest.completed) {
      state.quest.completed = true;
      unlock('quest_complete');
      if (!state.unlockedWallpapers.includes('crt-dawn')) {
        state.unlockedWallpapers.push('crt-dawn');
        ErdOSUI.toast('Wallpaper unlocked', 'CRT Dawn', 'rare');
      }
    }
    save();
  }

  function questProgress() {
    const keys = ['openBrowser', 'chatErdai', 'playGame', 'saveNote', 'changeTheme'];
    const done = keys.filter((k) => state?.quest?.[k]).length;
    return { done, total: keys.length, completed: !!state?.quest?.completed };
  }

  async function onAppLaunch(appId) {
    await init();
    state.stats.launches = (state.stats.launches || 0) + 1;
    addXp(3);
    if (appId === 'browser') {
      unlock('browser_voyager');
      completeQuest('openBrowser');
    }
    if (appId === 'games') unlock('arcade_rookie');
    if (appId === 'terminal') unlock('terminal_hacker');
    if (appId === 'music') unlock('music_mood');
    if (appId === 'trophies') unlock('trophy_hunter');

    // Variable reward: ~5% rare drop
    if (Math.random() < 0.05) {
      grantRareDrop();
    }
    await save();
  }

  function grantRareDrop() {
    unlock('rare_drop', true);
    const roll = Math.random();
    if (roll < 0.45) {
      const locked = RARE_WALLPAPERS.filter((w) => !state.unlockedWallpapers.includes(w));
      if (locked.length) {
        const pick = locked[Math.floor(Math.random() * locked.length)];
        state.unlockedWallpapers.push(pick);
        ErdOSUI.toast('Rare wallpaper!', WALLPAPERS[pick] || pick, 'rare');
        return;
      }
    }
    if (roll < 0.75) {
      const locked = RARE_THEMES.filter((t) => !(state.unlockedThemes || []).includes(t));
      if (locked.length) {
        const pick = locked[Math.floor(Math.random() * locked.length)];
        state.unlockedThemes = state.unlockedThemes || [''];
        state.unlockedThemes.push(pick);
        ErdOSUI.toast('Rare theme!', pick.replace('theme-', ''), 'rare');
        return;
      }
    }
    addXp(40);
    ErdOSUI.toast('Lucky bonus', '+40 XP phosphor surge', 'rare');
  }

  async function recordHighScore(game, score) {
    await init();
    const prev = state.highScores?.[game] || 0;
    if (score > prev) {
      state.highScores = state.highScores || {};
      state.highScores[game] = score;
      addXp(Math.min(50, Math.floor(score / 5)));
      if (game === 'snake' && score >= 50) unlock('snake_50');
      if (game === 'breakout' && score >= 100) unlock('breakout_100');
      if (game === 'pong' && score >= 10) unlock('pong_ace');
      await save();
      return true;
    }
    await save();
    return false;
  }

  async function onErdaiMessage() {
    await init();
    state.stats.messages = (state.stats.messages || 0) + 1;
    completeQuest('chatErdai');
    if (state.stats.messages >= 5) unlock('erdai_chatter');
    addXp(2);
    await save();
  }

  async function onGamePlayed() {
    await init();
    completeQuest('playGame');
    unlock('arcade_rookie');
    await save();
  }

  async function onNoteSaved() {
    await init();
    completeQuest('saveNote');
    unlock('note_taker');
    await save();
  }

  async function onThemeChanged(themeId) {
    await init();
    completeQuest('changeTheme');
    unlock('theme_hopper');
    if (themeId && !(state.unlockedThemes || []).includes(themeId)) {
      // allow selecting locked only if unlocked — caller checks
    }
    await save();
  }

  async function setMuted(v) {
    await init();
    state.muted = !!v;
    ErdOSSound.setMuted(state.muted);
    await save();
  }

  async function setWallpaper(id) {
    await init();
    if (!(state.unlockedWallpapers || []).includes(id)) return false;
    state.wallpaper = id;
    await save();
    return true;
  }

  async function setDisplayName(name) {
    await init();
    state.displayName = String(name || '').slice(0, 32);
    await save();
  }

  async function setPinned(apps) {
    await init();
    state.pinnedApps = apps;
    unlock('pinned');
    await save();
  }

  async function setIconLayout(layout) {
    await init();
    state.iconLayout = layout;
    await save();
  }

  async function rememberErdai(fact) {
    await init();
    state.erdaiMemory = state.erdaiMemory || { facts: [] };
    state.erdaiMemory.facts = [...(state.erdaiMemory.facts || []).filter((f) => f !== fact), fact].slice(-12);
    await save();
  }

  async function dailyFortune() {
    await init();
    const today = todayKey();
    if (state.erdaiMemory?.lastFortuneDate === today && state.erdaiMemory.lastFortune) {
      return state.erdaiMemory.lastFortune;
    }
    const fortunes = [
      'A window you open today will surprise you.',
      'Your streak is a phosphor heartbeat — keep it lit.',
      'Try the Terminal. Curiosity pays XP.',
      'Rare drops favor the playful.',
      'Rename yourself in Settings — ERDAI is listening.',
      'High scores are just stories you tell the Arcade.',
      'Glass and phosphor: modern mind, retro soul.',
      'Pin what you love. Investment makes the desktop yours.',
    ];
    const f = fortunes[Math.floor(Math.random() * fortunes.length)];
    state.erdaiMemory = state.erdaiMemory || {};
    state.erdaiMemory.lastFortuneDate = today;
    state.erdaiMemory.lastFortune = f;
    await save();
    return f;
  }

  async function resetProgress() {
    state = {
      version: 1,
      xp: 0,
      level: 1,
      streak: 0,
      longestStreak: 0,
      lastOpenDate: null,
      displayName: '',
      muted: false,
      wallpaper: 'phosphor-grid',
      unlockedWallpapers: ['phosphor-grid', 'deep-scan'],
      unlockedThemes: [''],
      pinnedApps: ['browser', 'erdai', 'games', 'terminal'],
      iconLayout: {},
      achievements: {},
      quest: {
        openBrowser: false,
        chatErdai: false,
        playGame: false,
        saveNote: false,
        changeTheme: false,
        completed: false,
      },
      highScores: { snake: 0, breakout: 0, memory: 0, pong: 0 },
      erdaiMemory: { facts: [], lastFortuneDate: null, lastFortune: '' },
      stats: { launches: 0, messages: 0, boots: 0 },
      recentAchievements: [],
    };
    await save();
    handleDailyOpen();
    await save();
  }

  return {
    ACHIEVEMENTS,
    WALLPAPERS,
    init,
    get,
    save,
    onChange,
    addXp,
    unlock,
    completeQuest,
    questProgress,
    onAppLaunch,
    recordHighScore,
    onErdaiMessage,
    onGamePlayed,
    onNoteSaved,
    onThemeChanged,
    setMuted,
    setWallpaper,
    setDisplayName,
    setPinned,
    setIconLayout,
    rememberErdai,
    dailyFortune,
    resetProgress,
    levelFromXp,
    xpForLevel,
  };
})();

window.ErdOSProgress = ErdOSProgress;
