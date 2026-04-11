/**
 * AudioManager — Lightweight synthesized game sounds using Web Audio API
 * No external audio files needed. All sounds are generated procedurally.
 */

let audioCtx = null;
let masterGain = null;
let _volume = 0.3;
let _muted = false;

const getCtx = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = _volume;
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
};

const getGain = () => {
  getCtx();
  return masterGain;
};

// --- Volume control ---
export const setVolume = (v) => {
  _volume = Math.max(0, Math.min(1, v));
  if (masterGain) masterGain.gain.value = _muted ? 0 : _volume;
};

export const getVolume = () => _volume;

export const toggleMute = () => {
  _muted = !_muted;
  if (masterGain) masterGain.gain.value = _muted ? 0 : _volume;
  return _muted;
};

export const isMuted = () => _muted;

// --- Synth helpers ---
const playTone = (freq, duration, type = 'sine', fadeOut = true) => {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = 0.4;
  if (fadeOut) gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(getGain());
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
};

const playChord = (freqs, duration, type = 'sine') => {
  freqs.forEach((f) => playTone(f, duration, type));
};

const playNoise = (duration, filter = 2000) => {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'lowpass';
  bandpass.frequency.value = filter;
  const gain = ctx.createGain();
  gain.gain.value = 0.15;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(getGain());
  source.start();
};

// --- Game sounds ---

/** Played when night phase starts */
export const playNightStart = () => {
  playTone(220, 1.5, 'sine');
  setTimeout(() => playTone(165, 1.5, 'sine'), 200);
  setTimeout(() => playTone(130, 2, 'sine'), 400);
};

/** Rooster crow — short, subtle, when day starts */
export const playDayStart = () => {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  // Quick pitch sweep up then down — like a tiny "cocorico"
  osc.frequency.setValueAtTime(400, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.08);
  osc.frequency.linearRampToValueAtTime(600, ctx.currentTime + 0.15);
  osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.25);
  osc.frequency.linearRampToValueAtTime(500, ctx.currentTime + 0.45);
  gain.gain.setValueAtTime(0.15, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.1);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
  osc.connect(gain);
  gain.connect(getGain());
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.5);
};

/** Vote cast sound */
export const playVote = () => {
  playTone(600, 0.15, 'square');
  setTimeout(() => playTone(800, 0.1, 'square'), 80);
};

/** Death / kill announcement */
export const playDeath = () => {
  playTone(200, 0.8, 'sawtooth');
  setTimeout(() => playTone(150, 1, 'sawtooth'), 200);
  setTimeout(() => playNoise(0.5, 800), 100);
};

/** Execution sound */
export const playExecution = () => {
  playTone(180, 0.5, 'sawtooth');
  setTimeout(() => playTone(120, 0.8, 'sawtooth'), 300);
  setTimeout(() => playTone(80, 1.2, 'sawtooth'), 600);
};

/** Player spared */
export const playSpared = () => {
  playChord([330, 415, 520], 0.6, 'triangle');
};

/** Night action selected */
export const playActionSelect = () => {
  playTone(500, 0.08, 'square');
};

/** Discussion phase */
export const playDiscussion = () => {
  playTone(440, 0.2, 'triangle');
  setTimeout(() => playTone(550, 0.3, 'triangle'), 120);
};

/** Game over — victory */
export const playVictory = () => {
  const notes = [330, 440, 550, 660, 880];
  notes.forEach((n, i) => setTimeout(() => playTone(n, 0.4, 'triangle'), i * 120));
};

/** Game over — defeat */
export const playDefeat = () => {
  const notes = [440, 330, 260, 200, 150];
  notes.forEach((n, i) => setTimeout(() => playTone(n, 0.5, 'sawtooth'), i * 200));
};

/** Tick — timer running low */
export const playTick = () => {
  playTone(800, 0.05, 'square');
};

/** Chat message received */
export const playChatMessage = () => {
  playTone(700, 0.06, 'sine');
};

export default {
  setVolume, getVolume, toggleMute, isMuted,
  playNightStart, playDayStart, playVote, playDeath,
  playExecution, playSpared, playActionSelect, playDiscussion,
  playVictory, playDefeat, playTick, playChatMessage,
};
