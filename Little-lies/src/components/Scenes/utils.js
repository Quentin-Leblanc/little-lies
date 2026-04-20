import i18n from '../../trad/i18n';
import { BUILDING_POSITIONS, MOUNTAINS, CAMERA_OBSTACLES } from './constants';

// Night ambiance texts from i18n
export const getNightAmbiance = () => {
  const texts = i18n.t('game:ambiance', { returnObjects: true });
  return Array.isArray(texts) ? texts : [];
};

// ============================================================
// Material sanitation — Kenney/Meshy GLBs ship with metallic=1 + emissive
// maps that blow out the scene. We strip both so materials render flat and
// tonemapped consistently with the rest of the scene.
// ============================================================
export const fixMaterial = (mat) => {
  if (!mat) return mat;
  const m = mat.clone();
  if (m.emissive) m.emissive.set(0, 0, 0);
  m.emissiveIntensity = 0;
  m.emissiveMap = null;
  if (m.specularIntensity !== undefined) m.specularIntensity = 0;
  if (m.specularColor) m.specularColor.set(0, 0, 0);
  m.toneMapped = true;
  return m;
};

// Building rotation helper — aim the front face toward the plaza center
export const faceCenter = (bx, bz) => Math.atan2(-bx, -bz);

// Deterministic pick from an array based on player ID string
export const pickForPlayer = (playerId, variants) => {
  let hash = 0;
  for (let i = 0; i < (playerId || '').length; i++) hash = (hash * 31 + playerId.charCodeAt(i)) | 0;
  return variants[Math.abs(hash) % variants.length];
};

// Mulberry32 PRNG — small stable seeded RNG. Seed it with an integer and
// each subsequent call returns a float in [0, 1). We use this instead of
// Math.random() for anything that needs to stay identical across clients
// (cottage rotation variance, moon phase pick, etc.) — all clients call
// it with the same seed and get the same sequence.
export const mulberry32 = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

// FNV-1a hash of a string to a 32-bit integer. Used to turn a room code
// (or any identifier) into a seed integer for mulberry32.
export const hashString = (str) => {
  let h = 0x811c9dc5;
  const s = str || '';
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
};

// Combine roomCode + gameStartedAt into a stable per-game seed. roomCode
// alone stays constant across replays in the same lobby, which locked
// every match in that room to the same cosmetic variant. Mixing in
// gameStartedAt (set at the start of every match) rotates the seed every
// time startGame() fires, so two consecutive matches in the same lobby
// get different intros, weather moods, cottage rotations, moon phases.
export const getGameSeed = (roomCode, gameStartedAt) => {
  const a = hashString(roomCode || '');
  const b = (gameStartedAt >>> 0) || 0;
  // xor-shift mix so a==b doesn't zero out
  let s = (a ^ (b + 0x9E3779B9 + ((a << 6) >>> 0) + (a >>> 2))) >>> 0;
  return s || 1;
};

// Lobby-wide "weather mood" picked once per game. Biases the daily
// weather roll across the whole match so a single game feels consistent
// (a STORM game is rainy most days, a FOG game is misty most days…)
// without locking every day to the exact same pick — one "break" day
// per mood keeps the sequence from feeling monotonic.
//   day/night index → dayRoll (0=sunny, 1/2=misty, 3=rainy) / nightRoll
//   (0=clear, 1=rainy, 2=foggy).
// FOG is duplicated so foggy games land more often than 25% — clear-sun
// stretches were dominating playtests; werewolf nights deserve mist.
export const LOBBY_MOODS = ['CLEAR', 'STORM', 'FOG', 'DUSK', 'FOG', 'FOG'];

export const MOOD_DAY_ROLLS = {
  // CLEAR is no longer "almost always sunny" — half the days now roll
  // misty so even a fair-weather match feels weighty.
  CLEAR: [0, 1, 0, 1],   // 2 sunny, 2 misty
  STORM: [3, 2, 3, 1],   // 2 rainy, 1 misty, 1 sunny break
  FOG:   [1, 1, 2, 1],   // 3 misty + 1 rainy break
  DUSK:  [2, 1, 0, 3],   // mixed — sky warm-tinted separately
};

export const MOOD_NIGHT_ROLLS = {
  CLEAR: [0, 0, 2, 0],   // mostly clear starry
  STORM: [1, 2, 1, 1],   // rainy-dominant
  FOG:   [2, 2, 1, 2],   // foggy-dominant
  DUSK:  [0, 2, 1, 0],   // mixed
};

// ============================================================
// Collision — circle-based check against buildings, well, mountains, and
// other players. Used by the admin free-roam (pause) controller.
// ============================================================
export const checkCollision = (x, z, y, otherPlayers) => {
  // Buildings
  for (const b of BUILDING_POSITIONS) {
    const bx = b.position[0], bz = b.position[2];
    const s = typeof b.scale === 'number' ? b.scale : 1;
    const dx = x - bx, dz = z - bz;
    const r = 1.8 * s;
    const h = 3.5 * s;
    if (dx * dx + dz * dz < r * r && y < h) return true;
  }
  // Well at center (radius 1.2, height ~2.8)
  if (x * x + z * z < 1.5 && y < 2.8) return true;
  // Mountains
  for (const m of MOUNTAINS) {
    const mx = m.position[0], mz = m.position[2];
    const dx = x - mx, dz = z - mz;
    const r = 0.4 * m.scale;
    if (dx * dx + dz * dz < r * r) return true;
  }
  // Other players
  if (otherPlayers) {
    for (const p of otherPlayers) {
      const dx = x - p[0], dz = z - p[2];
      if (dx * dx + dz * dz < 0.4 && y < 1.5) return true;
    }
  }
  return false;
};

// Push a point out of camera obstacle spheres (church / gallows) along the
// radial direction. Called both for the interpolation target and the
// interpolated camera position itself each frame.
export const pushCameraOutOfObstacles = (pos) => {
  for (let i = 0; i < CAMERA_OBSTACLES.length; i++) {
    const obs = CAMERA_OBSTACLES[i];
    const dx = pos.x - obs.center.x;
    const dy = pos.y - obs.center.y;
    const dz = pos.z - obs.center.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const r = obs.radius;
    if (distSq < r * r) {
      const dist = Math.sqrt(distSq) || 0.001;
      const k = r / dist;
      pos.x = obs.center.x + dx * k;
      pos.y = obs.center.y + dy * k;
      pos.z = obs.center.z + dz * k;
    }
  }
  return pos;
};
