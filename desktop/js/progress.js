/* Habit loop: XP, streaks, daily quests, achievements, pity rares, ERDAI coach hooks */
const ACHIEVEMENTS = [
  { id: 'first_boot', name: 'First Boot', desc: 'Boot ErdOS for the first time', xp: 25 },
  { id: 'browser_voyager', name: 'Browser Voyager', desc: 'Open the Browser', xp: 20 },
  { id: 'erdai_chatter', name: 'ERDAI Chatter', desc: 'Send 5 messages to ERDAI', xp: 30 },
  { id: 'erdai_addict', name: 'Circuit Confidant', desc: 'Send 25 messages to ERDAI', xp: 60 },
  { id: 'arcade_rookie', name: 'Arcade Rookie', desc: 'Play any game', xp: 20 },
  { id: 'snake_50', name: 'Snake Charmer', desc: 'Score 50+ in Snake', xp: 40 },
  { id: 'breakout_100', name: 'Brick Breaker', desc: 'Score 100+ in Breakout', xp: 40 },
  { id: 'pong_ace', name: 'Pong Ace', desc: 'Score 10+ in Pong', xp: 35 },
  { id: 'note_taker', name: 'Note Taker', desc: 'Save a document in Notepad', xp: 20 },
  { id: 'theme_hopper', name: 'Theme Hopper', desc: 'Change the accent theme', xp: 15 },
  { id: 'quest_complete', name: 'Quest Complete', desc: 'Finish the First Boot Quest', xp: 100 },
  { id: 'daily_clear', name: 'Daily Clear', desc: 'Finish all daily quests once', xp: 50 },
  { id: 'streak_3', name: 'Warm Circuits', desc: 'Reach a 3-day streak', xp: 40 },
  { id: 'streak_7', name: 'Weekly Pulse', desc: 'Reach a 7-day streak', xp: 80 },
  { id: 'streak_14', name: 'Fortnight Flame', desc: 'Reach a 14-day streak', xp: 120 },
  { id: 'level_5', name: 'Phosphor Adept', desc: 'Reach level 5', xp: 50 },
  { id: 'level_10', name: 'Glass Master', desc: 'Reach level 10', xp: 100 },
  { id: 'night_owl', name: 'Night Owl', desc: 'Boot between midnight and 5am', xp: 25 },
  { id: 'terminal_hacker', name: 'Terminal Resident', desc: 'Open the Terminal', xp: 20 },
  { id: 'music_mood', name: 'Ambient Soul', desc: 'Open Music Box', xp: 15 },
  { id: 'trophy_hunter', name: 'Trophy Hunter', desc: 'Open the Trophy Case', xp: 15 },
  { id: 'rare_drop', name: 'Lucky Scan', desc: 'Receive a rare drop', xp: 30 },
  { id: 'pinned', name: 'Taskbar Curator', desc: 'Customize pinned apps', xp: 15 },
  { id: 'launches_50', name: 'Window Addict', desc: 'Open 50 app windows', xp: 70 },
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

const DAILY_POOL = [
  { id: 'chat3', label: 'Chat with ERDAI 3 times', target: 3, metric: 'messages' },
  { id: 'arcade1', label: 'Play one Arcade game', target: 1, metric: 'games' },
  { id: 'terminal1', label: 'Open the Terminal', target: 1, metric: 'terminal' },
  { id: 'browser1', label: 'Open the Browser', target: 1, metric: 'browser' },
  { id: 'note1', label: 'Save a note', target: 1, metric: 'notes' },
  { id: 'scorebeat', label: 'Beat any high score', target: 1, metric: 'highscore' },
  { id: 'music1', label: 'Open Music Box', target: 1, metric: 'music' },
  { id: 'launch5', label: 'Open 5 apps', target: 5, metric: 'launches' },
];

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

  function defaultProgress() {
    return {
      version: 2,
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
      daily: { date: null, quests: [], stats: {}, cleared: false },
      launchesSinceRare: 0,
      streakFreeze: 1,
      highScores: { snake: 0, breakout: 0, memory: 0, pong: 0 },
      erdaiMemory: { facts: [], lastFortuneDate: null, lastFortune: '', lastCoach: '' },
      stats: { launches: 0, messages: 0, boots: 0, games: 0 },
      recentAchievements: [],
    };
  }

  async function init() {
    if (ready) return ready;
    ready = (async () => {
      const loaded = await window.erdos.getProgress();
      state = { ...defaultProgress(), ...loaded };
      if (!state.daily) state.daily = defaultProgress().daily;
      if (state.launchesSinceRare == null) state.launchesSinceRare = 0;
      if (state.streakFreeze == null) state.streakFreeze = 1;
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

  function rollDailyQuests() {
    const pool = [...DAILY_POOL];
    const picked = [];
    while (picked.length < 3 && pool.length) {
      const i = Math.floor(Math.random() * pool.length);
      picked.push({ ...pool.splice(i, 1)[0], progress: 0, done: false });
    }
    state.daily = {
      date: todayKey(),
      quests: picked,
      stats: { messages: 0, games: 0, terminal: 0, browser: 0, notes: 0, highscore: 0, music: 0, launches: 0 },
      cleared: false,
    };
  }

  function handleDailyOpen() {
    const today = todayKey();
    const firstToday = state.lastOpenDate !== today;

    if (firstToday) {
      const yesterday = yesterdayKey();
      if (state.lastOpenDate === yesterday) {
        state.streak = (state.streak || 0) + 1;
      } else if (state.lastOpenDate) {
        if ((state.streakFreeze || 0) > 0 && (state.streak || 0) >= 3) {
          state.streakFreeze -= 1;
          queueMicrotask(() =>
            ErdOSUI.toast('Streak freeze!', `Day ${state.streak} held · freezes left: ${state.streakFreeze}`, 'rare')
          );
        } else {
          const old = state.streak || 0;
          state.streak = 1;
          if (old > 1) {
            addXp(25, false, 'Comeback');
            queueMicrotask(() => ErdOSUI.toast('Comeback surge', `+25 XP · streak restarts at 1`, 'info'));
          }
        }
      } else {
        state.streak = 1;
      }
      state.longestStreak = Math.max(state.longestStreak || 0, state.streak || 0);
      state.lastOpenDate = today;
      addXp(15 + Math.min(20, (state.streak || 1) * 2), false, 'Daily login');
      if ((state.streak || 0) > 0 && (state.streak || 0) % 7 === 0) {
        state.streakFreeze = Math.min(2, (state.streakFreeze || 0) + 1);
      }
      rollDailyQuests();
    }

    if (!state.daily?.date || state.daily.date !== today) {
      rollDailyQuests();
    }

    state.stats.boots = (state.stats.boots || 0) + 1;
    unlock('first_boot', true);
    if (state.streak >= 3) unlock('streak_3', true);
    if (state.streak >= 7) unlock('streak_7', true);
    if (state.streak >= 14) unlock('streak_14', true);
    const hour = new Date().getHours();
    if (hour < 5) unlock('night_owl', true);
  }

  function addXp(amount, silent, reason) {
    if (!state || !amount) return;
    const before = levelFromXp(state.xp || 0).level;
    state.xp = (state.xp || 0) + amount;
    const after = levelFromXp(state.xp).level;
    state.level = after;
    if (!silent && amount >= 5) {
      queueMicrotask(() =>
        ErdOSUI.toast(`+${amount} XP`, reason || 'Phosphor gained', after > before ? 'level' : 'info')
      );
    }
    if (after > before) {
      queueMicrotask(() => ErdOSUI.toast(`Level ${after}`, 'Circuits upgraded', 'level'));
    }
    if (after >= 5) unlock('level_5', true);
    if (after >= 10) unlock('level_10', true);
  }

  function unlock(id, deferToast) {
    if (!state) return false;
    if (state.achievements?.[id]) return false;
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (!def) return false;
    state.achievements = state.achievements || {};
    state.achievements[id] = { at: Date.now() };
    state.recentAchievements = [{ id, at: Date.now() }, ...(state.recentAchievements || [])].slice(0, 8);
    addXp(def.xp, true);
    const show = () => ErdOSUI.toast(def.name, def.desc, 'achieve');
    if (deferToast) queueMicrotask(show);
    else show();
    return true;
  }

  function completeQuest(key) {
    if (!state?.quest) return;
    if (state.quest[key]) return;
    state.quest[key] = true;
    const labels = {
      openBrowser: 'Browser opened',
      chatErdai: 'ERDAI chatted',
      playGame: 'Arcade played',
      saveNote: 'Note saved',
      changeTheme: 'Theme changed',
    };
    const keys = ['openBrowser', 'chatErdai', 'playGame', 'saveNote', 'changeTheme'];
    const done = keys.filter((k) => state.quest[k]).length;
    addXp(25, false, labels[key] || 'Quest step');
    ErdOSUI.toast('Quest step', `${labels[key] || key} · ${done}/5`, 'info');
    if (done === keys.length && !state.quest.completed) {
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

  function bumpDaily(metric, by = 1) {
    if (!state?.daily?.stats) return;
    state.daily.stats[metric] = (state.daily.stats[metric] || 0) + by;
    let any = false;
    for (const q of state.daily.quests || []) {
      if (q.done || q.metric !== metric) continue;
      q.progress = state.daily.stats[metric];
      if (q.progress >= q.target) {
        q.done = true;
        any = true;
        addXp(35, false, q.label);
        ErdOSUI.toast('Daily quest', q.label, 'achieve');
      }
    }
    const allDone = (state.daily.quests || []).length && (state.daily.quests || []).every((q) => q.done);
    if (allDone && !state.daily.cleared) {
      state.daily.cleared = true;
      addXp(75, false, 'Daily clear bonus');
      unlock('daily_clear');
      ErdOSUI.toast('Daily cleared!', 'Come back tomorrow for three fresh hooks', 'level');
    }
    if (any) save();
  }

  function grantRareDrop(force) {
    state.launchesSinceRare = 0;
    unlock('rare_drop', true);
    const roll = Math.random();
    if (roll < 0.45 || force === 'wallpaper') {
      const locked = RARE_WALLPAPERS.filter((w) => !state.unlockedWallpapers.includes(w));
      if (locked.length) {
        const pick = locked[Math.floor(Math.random() * locked.length)];
        state.unlockedWallpapers.push(pick);
        ErdOSUI.toast('Rare wallpaper!', WALLPAPERS[pick] || pick, 'rare');
        return 'wallpaper';
      }
    }
    if (roll < 0.75 || force === 'theme') {
      const locked = RARE_THEMES.filter((t) => !(state.unlockedThemes || []).includes(t));
      if (locked.length) {
        const pick = locked[Math.floor(Math.random() * locked.length)];
        state.unlockedThemes = state.unlockedThemes || [''];
        state.unlockedThemes.push(pick);
        ErdOSUI.toast('Rare theme!', pick.replace('theme-', ''), 'rare');
        return 'theme';
      }
    }
    addXp(55, false, 'Lucky phosphor surge');
    ErdOSUI.toast('Lucky bonus', '+55 XP phosphor surge', 'rare');
    return 'xp';
  }

  async function onAppLaunch(appId) {
    await init();
    state.stats.launches = (state.stats.launches || 0) + 1;
    state.launchesSinceRare = (state.launchesSinceRare || 0) + 1;
    addXp(4, true);
    bumpDaily('launches');

    if (appId === 'browser') {
      unlock('browser_voyager');
      completeQuest('openBrowser');
      bumpDaily('browser');
    }
    if (appId === 'games') unlock('arcade_rookie');
    if (appId === 'terminal') {
      unlock('terminal_hacker');
      bumpDaily('terminal');
    }
    if (appId === 'music') {
      unlock('music_mood');
      bumpDaily('music');
    }
    if (appId === 'trophies') unlock('trophy_hunter');
    if ((state.stats.launches || 0) >= 50) unlock('launches_50');

    const pity = state.launchesSinceRare >= 22;
    const chance = pity ? 1 : 0.07;
    if (Math.random() < chance) {
      grantRareDrop();
    } else if (state.launchesSinceRare >= 12 && Math.random() < 0.35) {
      ErdOSUI.toast('Signal flicker…', `Rare drop charging (${state.launchesSinceRare}/22)`, 'info');
      ErdOSSound.tick();
    }
    await save();
  }

  async function recordHighScore(game, score) {
    await init();
    const prev = state.highScores?.[game] || 0;
    if (score > prev) {
      state.highScores = state.highScores || {};
      state.highScores[game] = score;
      addXp(Math.min(60, 10 + Math.floor(score / 4)), false, `${game} high score`);
      bumpDaily('highscore');
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
    bumpDaily('messages');
    if (state.stats.messages >= 5) unlock('erdai_chatter');
    if (state.stats.messages >= 25) unlock('erdai_addict');
    addXp(5, true);
    await save();
  }

  async function onGamePlayed() {
    await init();
    state.stats.games = (state.stats.games || 0) + 1;
    completeQuest('playGame');
    unlock('arcade_rookie');
    bumpDaily('games');
    await save();
  }

  async function onNoteSaved() {
    await init();
    completeQuest('saveNote');
    unlock('note_taker');
    bumpDaily('notes');
    await save();
  }

  async function onThemeChanged() {
    await init();
    completeQuest('changeTheme');
    unlock('theme_hopper');
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

  function coachLine() {
    const p = state;
    if (!p) return 'Boot complete. I am listening.';
    const name = p.displayName || 'friend';
    const lv = levelFromXp(p.xp || 0);
    const hour = new Date().getHours();
    const dailies = (p.daily?.quests || []).filter((q) => !q.done);
    const q = questProgress();

    if (!q.completed) {
      return `${name}, First Boot Quest is ${q.done}/5. Finish it — CRT Dawn is waiting.`;
    }
    if (dailies.length) {
      return `${name}: daily hook — ${dailies[0].label}. ${dailies.length} left today.`;
    }
    if (p.daily?.cleared) {
      return `Daily board cleared. Streak Day ${p.streak}. Flex Arcade or bank XP till tomorrow.`;
    }
    if (hour >= 18 && (p.streak || 0) >= 2) {
      return `Evening check: Day ${p.streak} is still lit. Don't let midnight snuff it.`;
    }
    if ((p.launchesSinceRare || 0) >= 15) {
      return `Rare drop is humming (${p.launchesSinceRare}/22). Open something. Anything.`;
    }
    return `Level ${lv.level} · ${lv.need - lv.into} XP to next. Day ${p.streak} streak. I'm right here.`;
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
      'Rare drops favor the playful. Arcade is calling.',
      'Tell me something to remember. Investment locks the loop.',
      'Three daily quests. One dopamine stack. Go.',
      'High scores are just stories you tell the Arcade.',
      'Glass and phosphor: modern mind, retro soul.',
      'Pin what you love. The desktop becomes yours.',
    ];
    const f = fortunes[Math.floor(Math.random() * fortunes.length)];
    state.erdaiMemory = state.erdaiMemory || {};
    state.erdaiMemory.lastFortuneDate = today;
    state.erdaiMemory.lastFortune = f;
    state.erdaiMemory.lastCoach = coachLine();
    await save();
    return f;
  }

  function nextHook() {
    const dailies = (state?.daily?.quests || []).filter((q) => !q.done);
    if (dailies[0]) return { type: 'daily', label: dailies[0].label, app: metricToApp(dailies[0].metric) };
    const q = questProgress();
    if (!q.completed) {
      const map = [
        ['openBrowser', 'Open Browser', 'browser'],
        ['chatErdai', 'Chat with ERDAI', 'erdai'],
        ['playGame', 'Play Arcade', 'games'],
        ['saveNote', 'Save a note', 'notepad'],
        ['changeTheme', 'Change theme', 'settings'],
      ];
      const next = map.find(([k]) => !state.quest[k]);
      if (next) return { type: 'boot', label: next[1], app: next[2] };
    }
    return { type: 'play', label: 'Chase a high score', app: 'games' };
  }

  function metricToApp(metric) {
    const m = {
      messages: 'erdai',
      games: 'games',
      terminal: 'terminal',
      browser: 'browser',
      notes: 'notepad',
      highscore: 'games',
      music: 'music',
      launches: 'erdai',
    };
    return m[metric] || 'erdai';
  }

  async function resetProgress() {
    state = defaultProgress();
    await save();
    handleDailyOpen();
    await save();
  }

  return {
    ACHIEVEMENTS,
    WALLPAPERS,
    DAILY_POOL,
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
    coachLine,
    nextHook,
    resetProgress,
    levelFromXp,
    xpForLevel,
    bumpDaily,
  };
})();

window.ErdOSProgress = ErdOSProgress;
