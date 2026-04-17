/**
 * AudioManager — Game sounds using Kenney CC0 audio files + Web Audio API
 */

let audioCtx = null;
let masterGain = null;
let _volume = 0.18;
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
// trim: auto-detect silence start/end. maxDur: max seconds to play.
const playFile = async (url, volume = 1, { trim = false, maxDur = 0 } = {}) => {
  try {
    const ctx = getCtx();
    let buffer = audioCache[url];
    if (!buffer) {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      buffer = await ctx.decodeAudioData(arrayBuffer);
      audioCache[url] = buffer;
    }

    let startOffset = 0;
    let duration = buffer.duration;

    if (trim) {
      // Find first and last non-silent sample (threshold 0.01)
      const data = buffer.getChannelData(0);
      const threshold = 0.01;
      let first = 0, last = data.length - 1;
      for (let i = 0; i < data.length; i++) {
        if (Math.abs(data[i]) > threshold) { first = i; break; }
      }
      for (let i = data.length - 1; i >= 0; i--) {
        if (Math.abs(data[i]) > threshold) { last = i; break; }
      }
      startOffset = Math.max(0, first / buffer.sampleRate - 0.01);
      duration = (last - first) / buffer.sampleRate + 0.02;
    }

    if (maxDur > 0) duration = Math.min(duration, maxDur);

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(gain);
    gain.connect(getGain());
    source.start(0, startOffset, duration);
  } catch (e) {
    // Silently fail
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

/** Vote cast — Jofae Sci Fi Interface style (CC0 WAV) */
export const playVote = () => {
  playFile('/sounds/vote.wav', 0.7);
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

/** Chat message — trimmed, short */
export const playChatMessage = () => {
  playFile('/sounds/chat.mp3', 0.4, { trim: true, maxDur: 0.5 });
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

// --- Looping music (lobby) ---
// Token-based guard: protects against double-play from React StrictMode double-mounts,
// rapid repeated calls (initial attempt + autoplay-unlock listener firing), and
// stop()-during-inflight-start races. Each stop() invalidates any pending start.
let _lobbySource = null;
let _lobbyGain = null;
let _lobbyToken = 0;

export const playLobbyMusic = async (url = '/sounds/deuslower-medieval-ambient-236809.mp3', volume = 0.5) => {
  if (_lobbySource) return;
  const myToken = ++_lobbyToken;
  try {
    const ctx = getCtx();
    let buffer = audioCache[url];
    if (!buffer) {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      buffer = await ctx.decodeAudioData(arrayBuffer);
      audioCache[url] = buffer;
    }
    // Bail if a newer call superseded us or if another start already landed
    if (myToken !== _lobbyToken || _lobbySource) return;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    gain.connect(getGain());
    source.start(0);
    _lobbySource = source;
    _lobbyGain = gain;
  } catch (e) {
    // Silently fail
  }
};

export const stopLobbyMusic = () => {
  _lobbyToken++; // invalidate any in-flight start
  if (_lobbySource) {
    try { _lobbySource.stop(); } catch {}
    try { _lobbySource.disconnect(); } catch {}
    try { _lobbyGain?.disconnect(); } catch {}
    _lobbySource = null;
    _lobbyGain = null;
  }
};

export default {
  setVolume, getVolume, toggleMute, isMuted,
  playNightStart, playDayStart, playVote, playDeath,
  playExecution, playSpared, playActionSelect,
  playVictory, playDefeat, playTick, playChatMessage, playDoorClose,
  playLobbyMusic, stopLobbyMusic,
};
