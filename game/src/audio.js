// audio.js — every sound is synthesised with WebAudio: no audio files.
// A low sawtooth hum follows the throttle, filtered noise is the wind, and
// short blips mark a ring, a landing and a crash. Starts on the first
// keypress or click, never before, so browsers allow it.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let windGain = null;
  let started = false;

  function ensure() {
    if (started) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      ctx = new AudioContext();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      const engineFilter = ctx.createBiquadFilter();
      engineFilter.type = 'lowpass';
      engineFilter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineFilter);
      engineFilter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();

      const noiseLen = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < noiseLen; i += 1) data[i] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      const windFilter = ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 900;
      windGain = ctx.createGain();
      windGain.gain.value = 0;
      noise.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(ctx.destination);
      noise.start();
      started = true;
      return true;
    } catch {
      return false;
    }
  }

  function blip(freq, dur, type = 'sine', vol = 0.18) {
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + dur);
    } catch {
      // Sound is garnish: a failure here must never stop the game.
    }
  }

  return {
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    update(throttle, speed, flying) {
      if (!ctx) return;
      const t = ctx.currentTime;
      engineGain.gain.setTargetAtTime(flying ? 0.02 + throttle * 0.05 : 0, t, 0.1);
      engineOsc.frequency.setTargetAtTime(48 + throttle * 55 + speed * 0.35, t, 0.1);
      windGain.gain.setTargetAtTime(flying ? Math.min(0.09, speed * 0.0011) : 0, t, 0.2);
    },
    ring() {
      blip(880, 0.16);
      setTimeout(() => blip(1318, 0.22), 90);
    },
    land() {
      blip(392, 0.2, 'triangle', 0.22);
      setTimeout(() => blip(523, 0.3, 'triangle', 0.22), 120);
    },
    crash() {
      blip(110, 0.5, 'sawtooth', 0.25);
      setTimeout(() => blip(65, 0.7, 'sawtooth', 0.22), 140);
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.3, 'triangle', 0.2), i * 130));
    },
  };
}
