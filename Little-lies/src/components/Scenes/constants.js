import * as THREE from 'three';

// ============================================================
// Ground textures
// ============================================================
export const GROUND_TEX_PATHS = [
  '/models/textures/ground_albedo.jpg',
  '/models/textures/ground_normal.jpg',
  '/models/textures/ground_roughness.jpg',
];

// ============================================================
// Meshy model paths — buildings / props for the dark theme
// ============================================================
export const MESHY_COTTAGE = '/models/skullcrest_cottage.glb';
export const MESHY_MANOR   = '/models/rootbound_manor.glb';
export const MESHY_TREE    = '/models/gnarled_tree.glb';
export const MESHY_BOARD   = '/models/bulletin_board.glb';
export const MESHY_SKULL   = '/models/skull_sign.glb';
export const MESHY_RING    = '/models/rope_ring.glb';
export const MESHY_LANTERN = '/models/skull_lantern.glb';
export const MESHY_RUNIC   = '/models/runic_circle.glb';
export const MESHY_PODIUM  = '/models/defense_podium.glb';

export const GALLOWS_PATH = '/models/Meshy_AI_potence_0415121815_texture.glb';

// ============================================================
// Trial / podium positioning
// ============================================================
export const PODIUM_POSITION = [7, 0, -6];
export const PODIUM_SCALE = 1.0;

// ============================================================
// Trial camera targets (relative to podium at [7, 0, -6])
// ============================================================
export const DEFENSE_CAMERA_LOOK = new THREE.Vector3(7, 0.6, -6);
// Defense + judgment share this target. Pulled back and lowered to ~20°
// above horizontal: the defender at the podium stays the focal point but
// the plaza behind them is now visible, which matters because that's
// where the jury (the other players) is standing during the trial. Going
// lower than this starts clipping the distant mountain skyline.
export const JUDGMENT_CAMERA_POS = new THREE.Vector3(3, 3.2, -0.5);
export const JUDGMENT_CAMERA_LOOK = new THREE.Vector3(7, 1.1, -6);
export const EXECUTION_CAMERA_POS = new THREE.Vector3(7, 6, -10);
export const EXECUTION_CAMERA_LOOK = new THREE.Vector3(7, 0.5, -6);

// Night cinematic camera — slow alley walk then gentle rise to stars
export const NIGHT_CAMERA_WAYPOINTS = [
  { pos: [0, 8, 8],       lookAt: [0, 0, 0],        duration: 5 },
  { pos: [-2, 1.8, 2],    lookAt: [-2, 1.6, -8],    duration: 18 },
  { pos: [-1, 3.5, -1],   lookAt: [0, 12, -3],      duration: 20 },
  { pos: [0, 4, 0],       lookAt: [0, 15, -2],      duration: 30, hold: true },
];

// Spherical obstacles the camera must stay outside of.
// Church (rootbound_manor) at [0,0,-15] scale 4.8 → snug sphere.
// Gallows at origin with scale 2.
export const CAMERA_OBSTACLES = [
  { center: new THREE.Vector3(0, 6, -15), radius: 7.8 }, // church body
  { center: new THREE.Vector3(0, 2, 0), radius: 2.8 },   // gallows
];

// 2D obstacles that player walks (day→house, morning→circle) should steer
// around. Radius is generous — characters are ~0.6m wide and we want a
// small buffer so the model doesn't clip into the prop. These correspond
// to the dark-theme plaza props declared in Village.js.
export const WALK_OBSTACLES = [
  { x: 5.5, z: 3,    radius: 1.2 }, // bulletin board (MESHY_BOARD)
  { x: -5.5, z: -4,  radius: 1.1 }, // skull sign (MESHY_SKULL)
  { x: 5, z: -10,    radius: 1.4 }, // rope ring (MESHY_RING)
  { x: 7, z: -6,     radius: 1.3 }, // podium (MESHY_PODIUM)
  { x: 0, z: 0,      radius: 1.6 }, // gallows
];

// ============================================================
// Village layout — positions, variants, building types
// ============================================================

// faceCenter is duplicated in utils.js for module-free use in getters
const faceCenter = (bx, bz) => Math.atan2(-bx, -bz);

// Dark theme: chapel (= Rootbound Manor) is enlarged to be THE landmark.
export const BUILDING_POSITIONS = [
  { type: 'chapel',  position: [0, 0, -15],   scale: 4.8, get rotation() { return [0, faceCenter(0, -15), 0]; } },
  { type: 'cottage', position: [-10, 0, 1],   scale: 1.6, variant: 0, get rotation() { return [0, faceCenter(-10, 1), 0]; } },
  { type: 'cottage', position: [10, 0, 2],    scale: 1.6, variant: 1, get rotation() { return [0, faceCenter(10, 2), 0]; } },
  { type: 'cottage', position: [-7, 0, 8],    scale: 1.5, variant: 2, get rotation() { return [0, faceCenter(-7, 8), 0]; } },
  { type: 'cottage', position: [7, 0, 9],     scale: 1.5, variant: 0, get rotation() { return [0, faceCenter(7, 9), 0]; } },
  { type: 'cottage', position: [-15, 0, -8],  scale: 1.4, variant: 2, get rotation() { return [0, faceCenter(-15, -8), 0]; } },
  { type: 'cottage', position: [15, 0, -8],   scale: 1.4, variant: 0, get rotation() { return [0, faceCenter(15, -8), 0]; } },
  { type: 'cottage', position: [-14, 0, 5],   scale: 1.4, variant: 1, get rotation() { return [0, faceCenter(-14, 5), 0]; } },
  { type: 'cottage', position: [14, 0, 6],    scale: 1.4, variant: 2, get rotation() { return [0, faceCenter(14, 6), 0]; } },
  { type: 'cottage', position: [-3, 0, 11],   scale: 1.4, variant: 0, get rotation() { return [0, faceCenter(-3, 11), 0]; } },
  { type: 'cottage', position: [3, 0, 12],    scale: 1.4, variant: 1, get rotation() { return [0, faceCenter(3, 12), 0]; } },
  { type: 'cottage', position: [-17, 0, -2],  scale: 1.3, variant: 2, get rotation() { return [0, faceCenter(-17, -2), 0]; } },
  { type: 'cottage', position: [17, 0, -1],   scale: 1.3, variant: 0, get rotation() { return [0, faceCenter(17, -1), 0]; } },
];

// Background mountains — procedural cones
export const MOUNTAINS = [
  { position: [0, 0, -50],   scale: 5, variant: 0 },
  { position: [-25, 0, -48], scale: 3.5, variant: 7 },
  { position: [25, 0, -48],  scale: 4, variant: 8 },
  { position: [-42, 0, -34], scale: 4, variant: 1 },
  { position: [42, 0, -34],  scale: 4.5, variant: 2 },
  { position: [-50, 0, 0],   scale: 3.5, variant: 3 },
  { position: [50, 0, 0],    scale: 3.5, variant: 4 },
  { position: [-54, 0, -17], scale: 3, variant: 9 },
  { position: [54, 0, -17],  scale: 3, variant: 10 },
  { position: [-42, 0, 30],  scale: 4, variant: 5 },
  { position: [42, 0, 30],   scale: 4, variant: 6 },
  { position: [-50, 0, 17],  scale: 3, variant: 11 },
  { position: [50, 0, 17],   scale: 3, variant: 12 },
  { position: [0, 0, 48],    scale: 4.5, variant: 13 },
  { position: [-25, 0, 42],  scale: 3.5, variant: 14 },
  { position: [25, 0, 42],   scale: 3.5, variant: 15 },
];

// Skull-lantern anchor positions (4 corners of central plaza)
export const TORCH_POS = [
  [-4, 0, -4], [4, 0, -4], [-4, 0, 4], [4, 0, 4],
];

// Meshy "Gnarled Sentinel" tree positions
export const TREE_POSITIONS = [
  [-13, 0, -10], [-15, 0, 0], [-13, 0, 8], [-8, 0, 12],
  [13, 0, -8], [15, 0, 2], [11, 0, 11], [0, 0, 14],
  [-16, 0, -5], [16, 0, -3], [-11, 0, -13], [9, 0, -13],
  [-17, 0, 6], [17, 0, 7], [0, 0, -15], [5, 0, 15],
  [-14, 0, 12], [14, 0, -11],
];

// Ground props: rocks, bushes, fences, hay
export const ROCK_POSITIONS = [
  { position: [-6, 0, 5], scale: 0.8, variant: 0 },
  { position: [7, 0, 6], scale: 0.6, variant: 1 },
  { position: [-3, 0, -7], scale: 0.5, variant: 2 },
  { position: [12, 0, -5], scale: 0.7, variant: 3 },
  { position: [-14, 0, 3], scale: 0.9, variant: 4 },
  { position: [5, 0, 11], scale: 0.5, variant: 5 },
  { position: [-18, 0, -8], scale: 1.0, variant: 6 },
  { position: [18, 0, 9], scale: 0.6, variant: 7 },
  { position: [-8, 0, -14], scale: 0.7, variant: 8 },
  { position: [3, 0, -14], scale: 0.8, variant: 9 },
];

export const BUSH_POSITIONS = [
  { position: [-5, 0, 7], scale: 0.9, variant: 0 },
  { position: [6, 0, 8], scale: 0.7, variant: 1 },
  { position: [-12, 0, 5], scale: 1.0, variant: 2 },
  { position: [12, 0, 4], scale: 0.8, variant: 3 },
  { position: [-9, 0, 11], scale: 0.6, variant: 4 },
  { position: [8, 0, 12], scale: 0.7, variant: 5 },
  { position: [-16, 0, -7], scale: 0.8, variant: 6 },
  { position: [16, 0, -8], scale: 0.9, variant: 7 },
  { position: [0, 0, -17], scale: 0.7, variant: 8 },
  { position: [-2, 0, 14], scale: 0.8, variant: 9 },
  { position: [14, 0, 14], scale: 0.6, variant: 10 },
  { position: [-15, 0, 13], scale: 0.7, variant: 11 },
];

export const FENCE_SEGMENTS = [
  { start: [-7, 0, 5.5], end: [-4, 0, 6.5] },
  { start: [4, 0, 6.5], end: [7, 0, 5.5] },
  { start: [-12, 0, -3], end: [-12, 0, 0] },
  { start: [12, 0, -3], end: [12, 0, 0] },
  { start: [-5, 0, 14], end: [5, 0, 14] },
];

export const HAY_POSITIONS = [
  { position: [-8, 0, 3], rotation: [0, 0.5, 0] },
  { position: [8.5, 0, 4], rotation: [0, -0.3, 0] },
  { position: [-8.2, 0, 3.5], rotation: [Math.PI / 2, 0, 0.4] },
  { position: [11, 0, 10], rotation: [0, 1.2, 0] },
  { position: [-13, 0, -8], rotation: [0, 0.7, 0] },
];

// ============================================================
// Wind — shared by WindLeaves + NightEmbers so both flow the same direction
// ============================================================
export const FIELD_W = 60;
export const FIELD_H = 60;
export const WIND_DIR_X = 1.0;
export const WIND_DIR_Z = 0.35;
const WIND_DIR_LEN = Math.hypot(WIND_DIR_X, WIND_DIR_Z);
export const WIND_NX = WIND_DIR_X / WIND_DIR_LEN;
export const WIND_NZ = WIND_DIR_Z / WIND_DIR_LEN;

// ============================================================
// Player animation variants — deterministic pick per player
// ============================================================
export const IDLE_VARIANTS = {
  villager: ['Idle', 'Idle2', 'Idle3', 'Idle4', 'Idle5', 'Idle6'],
  wanderer: ['Idle', 'Idle2', 'Idle3'],
};

export const DANCE_VARIANTS = {
  villager: ['Dance1', 'Dance2', 'Dance3'],
  wanderer: ['Dance1', 'Dance2'],
};

// Ground-level Y for all players (slightly above so feet align with sunken runic circle)
export const PLAYER_Y = 0.1;
