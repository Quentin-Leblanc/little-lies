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
