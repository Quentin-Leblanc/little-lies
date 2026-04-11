/**
 * AudioManager — Game sounds using Kenney CC0 audio files + Web Audio API
 */

let audioCtx = null;
let masterGain = null;
let _volume = 0.3;
let _muted = false;
const audioCache = {};

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

// --- File-based audio playback ---
const playFile = async (url, volume = 1) => {
  try {
    const ctx = getCtx();
    let buffer = audioCache[url];
    if (!buffer) {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      buffer = await ctx.decodeAudioData(arrayBuffer);
      audioCache[url] = buffer;
    }
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(getGain());
    source.start(0);
  } catch (e) {
    // Silently fail — don't block gameplay
  }
};

// --- Synth fallback for quick tones ---
const playTone = (freq, duration, type = 'sine') => {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = 0.15;
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(getGain());
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
};

// --- Game sounds ---

/** Day starts — door creak (morning) */
export const playDayStart = () => {
  playFile('/sounds/creak1.ogg', 0.5);
};

/** Night starts — knife draw (ominous) */
export const playNightStart = () => {
  playFile('/sounds/drawKnife1.ogg', 0.6);
};

/** Vote cast */
export const playVote = () => {
  playFile('/sounds/metalClick.ogg', 0.7);
};

/** Death / execution — chop */
export const playDeath = () => {
  playFile('/sounds/chop.ogg', 0.8);
};

export const playExecution = () => {
  playFile('/sounds/chop.ogg', 0.9);
};

/** Player spared — coins */
export const playSpared = () => {
  playFile('/sounds/handleCoins.ogg', 0.5);
};

/** Night action selected */
export const playActionSelect = () => {
  playFile('/sounds/click3.ogg', 0.5);
};

/** Chat message */
export const playChatMessage = () => {
  playFile('/sounds/click3.ogg', 0.3);
};

/** Door close — night transition */
export const playDoorClose = () => {
  playFile('/sounds/doorClose_1.ogg', 0.5);
};

/** Victory */
export const playVictory = () => {
  playFile('/sounds/handleCoins.ogg', 0.7);
};

/** Defeat */
export const playDefeat = () => {
  playFile('/sounds/drawKnife1.ogg', 0.6);
};

/** Tick */
export const playTick = () => {
  playTone(600, 0.05, 'square');
};

export default {
  setVolume, getVolume, toggleMute, isMuted,
  playNightStart, playDayStart, playVote, playDeath,
  playExecution, playSpared, playActionSelect,
  playVictory, playDefeat, playTick, playChatMessage, playDoorClose,
};
