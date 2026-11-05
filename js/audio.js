/* Tiny procedural SFX synth. No audio files; starts on the first user gesture. */
(function () {
  const V = window.Verdane = window.Verdane || {};
  let ctx = null, master = null, muted = false;
  let last = {};

  function init() {
    if (ctx) { if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} } return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);
    } catch (e) { ctx = null; }
  }

  function tone(freq, dur, type, vol, slideTo, delay) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + (delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.18, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(master);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol, freq) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq || 1200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.2, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter); filter.connect(g); g.connect(master);
    src.start(t0);
  }

  function play(name) {
    if (!ctx || muted) return;
    const now = ctx.currentTime;
    if (last[name] && now - last[name] < 0.045) return;
    last[name] = now;
    switch (name) {
      case 'click': tone(620, 0.04, 'square', 0.1); break;
      case 'plant': tone(240, 0.08, 'triangle', 0.2, 180); noise(0.05, 0.08, 900); break;
      case 'fuse': tone(330, 0.09, 'square', 0.16); tone(495, 0.16, 'triangle', 0.18, null, 0.06); tone(660, 0.2, 'triangle', 0.14, null, 0.12); break;
      case 'shoot': tone(560, 0.035, 'triangle', 0.1, 440); break;
      case 'hit': noise(0.035, 0.1, 1800); break;
      case 'sun': tone(880, 0.07, 'sine', 0.18); tone(1320, 0.12, 'sine', 0.14, null, 0.06); break;
      case 'boom': noise(0.28, 0.28, 500); tone(95, 0.24, 'sawtooth', 0.22, 45); break;
      case 'mower': tone(120, 0.4, 'sawtooth', 0.18, 70); noise(0.3, 0.12, 700); break;
      case 'wave': tone(330, 0.12, 'square', 0.14); tone(440, 0.16, 'square', 0.12, null, 0.1); break;
      case 'boss': tone(110, 0.5, 'sawtooth', 0.24, 55); noise(0.35, 0.18, 400); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.16, null, i * 0.11)); break;
      case 'lose': tone(220, 0.3, 'sawtooth', 0.16, 130); tone(150, 0.45, 'triangle', 0.14, 80, 0.18); break;
      case 'error': tone(150, 0.09, 'square', 0.12, 110); break;
      case 'vase': noise(0.09, 0.18, 2600); tone(1480, 0.06, 'triangle', 0.12, 900); tone(1960, 0.05, 'sine', 0.08, 1500, 0.02); break;
      case 'stun': tone(520, 0.08, 'square', 0.14, 380); tone(360, 0.1, 'square', 0.11, 240, 0.07); break;
      case 'split': noise(0.05, 0.12, 1800); tone(380, 0.06, 'square', 0.12, 300); tone(300, 0.07, 'square', 0.1, 230, 0.07); break;
      case 'summon': tone(90, 0.36, 'sawtooth', 0.2, 180); noise(0.2, 0.12, 500); tone(180, 0.2, 'triangle', 0.12, 280, 0.12); break;
      default: break;
    }
  }

  function setMuted(v) { muted = !!v; if (master) master.gain.value = muted ? 0 : 0.16; }
  function isMuted() { return muted; }

  V.Audio = { init, play, setMuted, isMuted };
})();
