const GameAudio = (() => {
  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  function resume() {
    if (ctx?.state === 'suspended') ctx.resume();
  }

  function tone(freq, duration, type = 'sine', volume = 0.12) {
    if (!enabled) return;
    try {
      const ac = getCtx();
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(volume, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + duration);
    } catch (_) {}
  }

  return {
    resume,
    isEnabled: () => enabled,
    setEnabled(v) { enabled = !!v; },
    tap: () => tone(520, 0.06, 'sine', 0.08),
    shoot: () => tone(680, 0.08, 'triangle', 0.1),
    pop(count = 3) {
      tone(400 + Math.min(count, 8) * 40, 0.12, 'sine', 0.14);
      setTimeout(() => tone(600 + count * 20, 0.1, 'sine', 0.1), 40);
    },
    drop: () => tone(220, 0.15, 'sawtooth', 0.08),
    swap: () => tone(480, 0.05, 'sine', 0.07),
    invalid: () => tone(180, 0.12, 'square', 0.06),
    levelComplete: () => {
      [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'sine', 0.12), i * 120));
    },
    gameOver: () => tone(160, 0.35, 'sawtooth', 0.1)
  };
})();
