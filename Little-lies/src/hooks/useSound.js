import { useCallback, useRef } from 'react';

/*
  Procedural sound system using Web Audio API.
  No external files needed — all sounds are synthesized.
*/

let audioCtx = null;
const getCtx = () => {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
};

// Resume context on first user interaction (browser autoplay policy)
const ensureResumed = () => {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

// --- Synth primitives ---

const playTone = (freq, duration, type = 'sine', volume = 0.15, fadeOut = true) => {
  const ctx = ensureResumed();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  if (fadeOut) {
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  }
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
};

const playNoise = (duration, volume = 0.05) => {
  const ctx = ensureResumed();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(gain).connect(ctx.destination);
  source.start();
};

// --- Sound definitions ---

const SOUNDS = {
  // Phase transitions
  nightFall: () => {
    playTone(180, 1.2, 'sine', 0.12);
    setTimeout(() => playTone(120, 1.5, 'sine', 0.08), 200);
    setTimeout(() => playTone(90, 1.8, 'triangle', 0.06), 500);
  },

  morning: () => {
    playTone(523, 0.2, 'sine', 0.12);
    setTimeout(() => playTone(659, 0.2, 'sine', 0.12), 150);
    setTimeout(() => playTone(784, 0.4, 'sine', 0.10), 300);
  },

  discussion: () => {
    playTone(440, 0.15, 'triangle', 0.10);
    setTimeout(() => playTone(554, 0.15, 'triangle', 0.10), 120);
    setTimeout(() => playTone(659, 0.3, 'triangle', 0.08), 240);
  },

  voteOpen: () => {
    playTone(392, 0.12, 'square', 0.08);
    setTimeout(() => playTone(494, 0.12, 'square', 0.08), 100);
    setTimeout(() => playTone(587, 0.25, 'square', 0.06), 200);
  },

  // Actions
  voteClick: () => {
    playTone(800, 0.08, 'sine', 0.10);
  },

  judgment: () => {
    // Gavel-like
    playNoise(0.08, 0.15);
    playTone(200, 0.15, 'square', 0.10);
    setTimeout(() => {
      playNoise(0.06, 0.12);
      playTone(180, 0.12, 'square', 0.08);
    }, 200);
  },

  guilty: () => {
    playTone(300, 0.3, 'sawtooth', 0.08);
    setTimeout(() => playTone(200, 0.5, 'sawtooth', 0.06), 200);
  },

  innocent: () => {
    playTone(523, 0.2, 'sine', 0.10);
    setTimeout(() => playTone(659, 0.3, 'sine', 0.10), 150);
  },

  // Death
  death: () => {
    playTone(300, 0.3, 'sine', 0.12);
    setTimeout(() => playTone(250, 0.3, 'sine', 0.10), 200);
    setTimeout(() => playTone(180, 0.6, 'sine', 0.08), 400);
  },

  // Execution
  execution: () => {
    playNoise(0.1, 0.12);
    playTone(150, 0.4, 'sawtooth', 0.10);
    setTimeout(() => playTone(100, 0.8, 'sine', 0.06), 300);
  },

  // Game over
  victory: () => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.3, 'sine', 0.12), i * 150);
    });
  },

  defeat: () => {
    const notes = [400, 350, 300, 200];
    notes.forEach((freq, i) => {
      setTimeout(() => playTone(freq, 0.4, 'sine', 0.10), i * 200);
    });
  },

  // Notifications
  notification: () => {
    playTone(880, 0.1, 'sine', 0.08);
    setTimeout(() => playTone(1100, 0.15, 'sine', 0.06), 80);
  },

  // Skip
  skip: () => {
    playTone(600, 0.1, 'triangle', 0.08);
    setTimeout(() => playTone(800, 0.15, 'triangle', 0.06), 80);
  },

  // Timer warning (last 5 seconds)
  tick: () => {
    playTone(1000, 0.05, 'sine', 0.06);
  },

  // Role reveal
  reveal: () => {
    playTone(350, 0.2, 'sine', 0.10);
    setTimeout(() => playTone(440, 0.2, 'sine', 0.10), 200);
    setTimeout(() => playTone(523, 0.2, 'sine', 0.10), 400);
    setTimeout(() => playTone(659, 0.5, 'sine', 0.12), 600);
  },
};

export const useSound = () => {
  const enabledRef = useRef(true);

  const play = useCallback((name) => {
    if (!enabledRef.current) return;
    const fn = SOUNDS[name];
    if (fn) {
      try { fn(); } catch { /* ignore audio errors */ }
    }
  }, []);

  const setEnabled = useCallback((enabled) => {
    enabledRef.current = enabled;
  }, []);

  return { play, setEnabled };
};

export default useSound;
