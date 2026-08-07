/* ErdOS sound kit — Web Audio oscillators, no asset pack */
const ErdOSSound = (() => {
  let ctx = null;
  let muted = false;

  function ensure() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, dur, type = 'sine', gain = 0.08, delay = 0) {
    if (muted) return;
    const c = ensure();
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  return {
    setMuted(v) {
      muted = !!v;
    },
    isMuted: () => muted,
    click() {
      tone(920, 0.045, 'triangle', 0.05);
      tone(1400, 0.03, 'sine', 0.025, 0.02);
    },
    open() {
      tone(320, 0.1, 'sine', 0.06);
      tone(480, 0.12, 'sine', 0.05, 0.05);
    },
    close() {
      tone(420, 0.08, 'sine', 0.05);
      tone(260, 0.1, 'sine', 0.04, 0.04);
    },
    boot() {
      tone(196, 0.2, 'sine', 0.07);
      tone(247, 0.2, 'sine', 0.06, 0.12);
      tone(294, 0.25, 'sine', 0.07, 0.24);
      tone(392, 0.35, 'triangle', 0.05, 0.4);
    },
    tick() {
      tone(1200, 0.03, 'square', 0.02);
    },
    achieve() {
      tone(523, 0.1, 'triangle', 0.07);
      tone(659, 0.1, 'triangle', 0.06, 0.08);
      tone(784, 0.18, 'triangle', 0.07, 0.16);
    },
    levelUp() {
      tone(392, 0.1, 'sine', 0.06);
      tone(523, 0.1, 'sine', 0.06, 0.08);
      tone(659, 0.1, 'sine', 0.06, 0.16);
      tone(784, 0.25, 'triangle', 0.08, 0.26);
    },
    error() {
      tone(180, 0.15, 'sawtooth', 0.04);
      tone(140, 0.18, 'sawtooth', 0.03, 0.08);
    },
    rare() {
      tone(880, 0.08, 'sine', 0.05);
      tone(1320, 0.1, 'sine', 0.05, 0.07);
      tone(1760, 0.2, 'triangle', 0.04, 0.14);
    },
    notify() {
      tone(660, 0.08, 'sine', 0.05);
      tone(880, 0.1, 'sine', 0.04, 0.06);
    },
  };
})();

window.ErdOSSound = ErdOSSound;
