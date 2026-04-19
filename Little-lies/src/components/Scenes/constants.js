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
export const MESHY_BLOOD   = '/models/blood_circle.glb';
export const MESHY_OBELISK = '/models/obelisk.glb';
export const MESHY_FIRE    = '/models/fire_circle.glb';

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

// Night cinematic pool — 6 shots with deliberately distinct opening
// positions, motion patterns, and final hold views. CameraController
// rotates through them via (dayCount * 5 + 2) % 6 — 5 is coprime with 6
// so consecutive nights land on different shots and every night within
// a 6-night cycle is unique. `snap: true` on the first waypoint tells
// the controller to teleport there on NIGHT entry instead of a 10s lerp
// from the day-orbit position (otherwise every night feels the same
// because the recognizable part of the cinematic only starts after the
// slow ease-in).
export const NIGHT_CAMERA_WAYPOINTS = [
  // 0 — STARGAZE: start low in the plaza, rise gradually, end looking
  // straight up at stars. Vertical motion is the signature move.
  { name: 'stargaze', waypoints: [
    { pos: [0, 2, 6],       lookAt: [0, 1, 0],         duration: 5, snap: true },
    { pos: [1, 5, 4],       lookAt: [0, 3, -3],        duration: 18 },
    { pos: [-1, 9, 2],      lookAt: [0, 8, -5],        duration: 20 },
    { pos: [0, 11, 0],      lookAt: [0, 20, -3],       duration: 30, hold: true },
  ]},
  // 1 — STORMSWEEP: low ground-hugging lateral tracking shot, east →
  // west across the plaza. Traces a U-shape from the SE corner through
  // the plaza and out to the SW — stays in the clear corridor south of
  // the cottage ring so the camera never crosses a building. Earlier
  // pass had a snap at [12, 2, 4] that lerped straight through the
  // cottage at [10, 0, 2].
  { name: 'stormsweep', waypoints: [
    { pos: [22, 3, 8],      lookAt: [-5, 3, -6],       duration: 5, snap: true },
    { pos: [8, 2.5, -5],    lookAt: [-4, 3, -10],      duration: 18 },
    { pos: [-8, 2.5, -5],   lookAt: [-8, 3.5, -12],    duration: 18 },
    { pos: [-22, 3, 8],     lookAt: [-5, 4, -6],       duration: 30, hold: true },
  ]},
  // 2 — FOGDRIFT: slow forward push from the SE plaza edge toward the
  // church, offset from x=0 so the camera never crosses the gallows
  // sphere. Earlier pass started at z=14 behind the south cottages and
  // threaded between [-3, 11] and [3, 12] at y=1.3 — which reads as the
  // camera walking *through* a house before reaching the plaza.
  { name: 'fogdrift', waypoints: [
    { pos: [4, 2.2, 8],     lookAt: [0, 2, -6],        duration: 5, snap: true },
    { pos: [3, 2.0, 0],     lookAt: [-1, 2, -10],      duration: 18 },
    { pos: [2, 2.2, -5],    lookAt: [-1, 2, -14],      duration: 20 },
    { pos: [1, 2.5, -7],    lookAt: [0, 2.5, -15],     duration: 28, hold: true },
  ]},
  // 3 — PLAZASPIN: full 360° orbit around the gallows at mid height.
  // Four cardinal directions so you clearly see rotation happening.
  { name: 'plazaspin', waypoints: [
    { pos: [0, 4, 9],       lookAt: [0, 1, 0],         duration: 5, snap: true },
    { pos: [9, 4, 0],       lookAt: [0, 1, 0],         duration: 20 },
    { pos: [0, 4, -9],      lookAt: [0, 1, 0],         duration: 20 },
    { pos: [-9, 4, 0],      lookAt: [0, 1, 0],         duration: 28, hold: true },
  ]},
  // 4 — HIGHDRONE: very high near-topdown view. Camera barely moves,
  // just a slow drift. Gives a map-like perspective on the village.
  { name: 'highdrone', waypoints: [
    { pos: [0, 16, 2],      lookAt: [0, 0, -5],        duration: 5, snap: true },
    { pos: [5, 15, 0],      lookAt: [0, 0, -5],        duration: 20 },
    { pos: [0, 14, -3],     lookAt: [0, 0, -7],        duration: 20 },
    { pos: [-5, 15, 0],     lookAt: [0, 0, -5],        duration: 28, hold: true },
  ]},
  // 5 — CHURCHAPPROACH: straight-line push on the church from far south.
  // Rides above cottage roofs (y ≥ 5) so the shot never dips into the
  // z=11 corridor where south cottages at [-3, 11] and [3, 12] almost
  // touch. Lands near the doorway angled up at the roof.
  { name: 'churchapproach', waypoints: [
    { pos: [0, 6, 16],      lookAt: [0, 5, -10],       duration: 5, snap: true },
    { pos: [0, 5, 6],       lookAt: [0, 6, -12],       duration: 18 },
    { pos: [0, 4, -2],      lookAt: [0, 7, -14],       duration: 20 },
    { pos: [0, 3, -8],      lookAt: [0, 9, -15],       duration: 30, hold: true },
  ]},
];

// Day-orbit camera pool — during daylight phases the camera rotates
// slowly around the plaza. Index 0 is the original wide overview; the
// others are closer with different heights so each day shifts the focus
// and what's visible around the village. Pick is deterministic per
// dayCount so all clients see the same shot. Angular speeds differ so
// linear motion reads similarly across different radii. `phaseOffset`
// is an angle (radians) that shifts the starting position of the orbit
// — otherwise all cameras would start looking due south on day 1.
// Every shot here is framed DOWNWARD on the plaza — vertical tilt ≥ ~45°
// in all configs. Earlier iterations had "shoulder" at ~31° and "intimate"
// at ~15° (effectively parallel to the ground) so the frame was filled by
// the far mountain ridge / sparse background instead of the plaza props.
// The goal now: every day-orbit pick lands closer to a top-down view of
// the blood circle, with the skyline clipped above frame.
export const DAY_ORBIT_CAMERAS = [
  // 0 — FAR WIDE: overview, whole village visible, steep enough that
  // only a thin slice of skyline shows above the cottage ring.
  //   tilt = atan2(12.5 - 0.2, 10) ≈ 51°
  { name: 'far-wide',  radius: 10,   height: 12.5, lookY: 0.2, speed: 0.008, phaseOffset: 0 },
  // 1 — LOW SWEEP: closer look at plaza life, still angled steeply down
  // so mountains don't creep back into frame. Pulled back from r=6/h=7
  // (still felt on top of the players during debate) to r=8/h=8.5 — the
  // shot still reads as "low and close" but gives breathing room around
  // the character sprites.
  //   tilt = atan2(8.5 - 0.4, 8.0) ≈ 45°
  { name: 'low-sweep', radius: 8,    height: 8.5,  lookY: 0.4, speed: 0.010, phaseOffset: 1.8 },
  // 2 — SHOULDER: mid-distance high-shoulder tilt onto the plaza — used
  // to be a near-horizontal three-quarter view at h=5.2 / lookY=1.0.
  //   tilt = atan2(8.5 - 0.4, 7.0) ≈ 49°
  { name: 'shoulder',  radius: 7,    height: 8.5,  lookY: 0.4, speed: 0.010, phaseOffset: 3.4 },
  // 3 — TOPDOWN: near top-down, map-like perspective.
  //   tilt = atan2(13.5 - 0, 4.5) ≈ 72°
  { name: 'topdown',   radius: 4.5,  height: 13.5, lookY: 0,   speed: 0.013, phaseOffset: 4.5 },
  // 4 — INTIMATE: close orbit around the blood circle. Pulled back from
  // r=5 / h=7.5 (too tight on players' heads) to r=7 / h=9 so the shot
  // still reads as "close to the action" but the plaza breathes and
  // player faces aren't cropped. Tilt stays ~55°.
  //   tilt = atan2(9 - 0.4, 7) ≈ 51°
  { name: 'intimate',  radius: 7,    height: 9,    lookY: 0.4, speed: 0.011, phaseOffset: 2.2 },
  // 5 — PERIMETER: wide slow circle that skims the perimeter of the
  // cottage ring. Radius bumped up to 12 so the frame shows a layer of
  // cottages between the camera and the plaza center — depth cue the
  // other angles don't give. Height matches radius + 1 to keep the
  // tilt above 45°. Slow speed because 12m of perimeter adds up fast.
  //   tilt = atan2(13 - 0.3, 12) ≈ 47°
  { name: 'perimeter', radius: 12,   height: 13,   lookY: 0.3, speed: 0.0065, phaseOffset: 5.4 },
  // 6 — TIGHT TOWER: mid-height very close orbit, almost a turntable on
  // the blood circle. Faster rotation so the 12s cycle window actually
  // shows ~70° of travel.
  //   tilt = atan2(11 - 0.3, 5) ≈ 65°
  { name: 'tight-tower', radius: 5,  height: 11,   lookY: 0.3, speed: 0.013,  phaseOffset: 0.8 },
];

// Cycle through DAY_ORBIT_CAMERAS mid-phase during DISCUSSION. 30s
// phase / 12s per pick = ~2.5 camera cuts per discussion, which breaks
// up the "locked orbit" feel without cutting so often it's distracting.
// Non-DISCUSSION day phases (DEATH_REPORT, NO_LYNCH, SPARED) stay on a
// single pick for their whole duration.
export const DISCUSSION_CAMERA_CYCLE_MS = 12000;

// Intro cinematic pool — 5 variants, each a 6s opening shot sequence.
// Pick is deterministic per (roomSeed + playerCount) so a given lobby
// replaying sees the same intro, but changing the roster or room
// rotates it. Each entry exposes a `run(t, out, THREE)` that mutates
// out.pos (Vector3), out.lookAt (Vector3), and out.shot (int — the
// controller hard-cuts when this changes). The startPos/startLookAt
// are the frame-0 pose used for the initial snap into the cinematic.
export const INTRO_CINEMATICS = [
  // 0 — WALKING TOUR (original): west-side dolly (0-2s) then east-side
  // slow orbit around the plaza center (2-6s). Parallel-to-ground Y so
  // distant mountains never creep into frame.
  {
    name: 'walking-tour',
    duration: 6,
    startPos: [-7.2, 1.8, 6.2],
    startLookAt: [3, 1.8, -1],
    run: (t, out) => {
      if (t < 2) {
        const p = t / 2;
        out.pos.set(-7.2 + p * 2.4, 1.8, 6.2 - p * 1.2);
        out.lookAt.set(3, 1.8, -1);
        out.shot = 0;
      } else {
        const localT = t - 2;
        const angle = Math.PI * 0.61 + localT * 0.2;
        out.pos.set(Math.sin(angle) * 5.8, 1.9, Math.cos(angle) * 5.8 - 1.2);
        out.lookAt.set(0, 1.5, -1.2);
        out.shot = 1;
      }
    },
  },
  // 1 — CHURCH PUSH: straight-line push from far south toward the church,
  // slight climb so the belfry dominates the frame as we approach.
  // Single shot — no cut, steady forward momentum = "the story is going
  // somewhere dark".
  {
    name: 'church-push',
    duration: 6,
    startPos: [0, 2.5, 14],
    startLookAt: [0, 4.2, -14],
    run: (t, out) => {
      const p = t / 6;
      out.pos.set(0, 2.5 + p * 1.4, 14 - p * 13.2);
      out.lookAt.set(0, 4.2 + p * 0.9, -14);
      out.shot = 0;
    },
  },
  // 2 — ALTAR CREEP: low crawl (y=0.7) that closes toward the ritual
  // blood circle, then a dramatic 2s rise at the end revealing the
  // altar symbol from above. Tension builds then releases on the rise.
  {
    name: 'altar-creep',
    duration: 6,
    startPos: [4.5, 0.7, 5.5],
    startLookAt: [0, 0.4, 0],
    run: (t, out) => {
      if (t < 4) {
        const p = t / 4;
        out.pos.set(4.5 - p * 3.0, 0.7 + p * 0.25, 5.5 - p * 3.6);
        out.lookAt.set(0, 0.4, 0);
        out.shot = 0;
      } else {
        const localT = t - 4;
        const p = localT / 2;
        out.pos.set(1.5, 0.95 + p * 1.5, 1.9 - p * 0.3);
        out.lookAt.set(0, 0.5 + p * 0.3, 0);
        out.shot = 1;
      }
    },
  },
  // 3 — AERIAL DROP: spiral descent from 22m → 5m. Starts with a
  // map-like view, progressively closes in on the plaza as it spirals
  // down. "You're descending into this story."
  {
    name: 'aerial-drop',
    duration: 6,
    startPos: [9.9, 22, 9.9],
    startLookAt: [0, 0, -2],
    run: (t, out) => {
      const p = t / 6;
      const angle = Math.PI * 0.25 + p * Math.PI * 0.6;
      const radius = 14 - p * 6;
      const y = 22 - p * 17;
      out.pos.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
      out.lookAt.set(0, p * 0.9, -2 + p * 0.7);
      out.shot = 0;
    },
  },
  // 4 — LIGHTNING REVEAL: three static shots in rapid cuts (2s + 2s +
  // 2s) from very different angles. The hard cuts + distinct poses
  // read as lightning strikes illuminating the village for brief
  // instants. The overall screen flash stays subtle (no full-white
  // overlay) so we don't step on NightLightning's thunder audio path.
  {
    name: 'lightning-reveal',
    duration: 6,
    startPos: [-12, 4, 12],
    startLookAt: [0, 2, -10],
    run: (t, out) => {
      if (t < 2) {
        out.pos.set(-12, 4, 12);
        out.lookAt.set(0, 2, -10);
        out.shot = 0;
      } else if (t < 4) {
        out.pos.set(12, 4, -12);
        out.lookAt.set(0, 2, 0);
        out.shot = 1;
      } else {
        const p = (t - 4) / 2;
        out.pos.set(0, 3.5, 8 - p * 2);
        out.lookAt.set(0, 2.2, -8);
        out.shot = 2;
      }
    },
  },
];

// Spherical obstacles the camera must stay outside of.
// Church (rootbound_manor) at [0,0,-15] scale 4.8 → snug sphere.
// Blood circle at origin with scale 3.5 (flat ritual altar, replaces potence).
// Obelisk is a tall slim landmark at the back-left, past the cottages.
export const CAMERA_OBSTACLES = [
  { center: new THREE.Vector3(0, 6, -15), radius: 7.8 },   // church body
  { center: new THREE.Vector3(0, 0.8, 0), radius: 2.2 },   // blood circle
  { center: new THREE.Vector3(-16, 2.5, -14), radius: 3.2 }, // obelisk (scale 2.5)
];

// 2D obstacles that player walks (day→house, morning→circle) should steer
// around. Radius is generous — characters are ~0.6m wide and we want a
// small buffer so the model doesn't clip into the prop. These correspond
// to the dark-theme plaza props declared in Village.js.
export const WALK_OBSTACLES = [
  { x: 5.5, z: 3,    radius: 1.6 }, // bulletin board (MESHY_BOARD, scale 1.9)
  { x: -5.5, z: -4,  radius: 1.1 }, // skull sign (MESHY_SKULL)
  { x: 5, z: -10,    radius: 1.4 }, // rope ring (MESHY_RING)
  { x: 7, z: -6,     radius: 1.3 }, // podium (MESHY_PODIUM)
  { x: 0, z: 0,      radius: 2.0 }, // blood circle (MESHY_BLOOD, replaces gallows, scale 3.5)
  { x: -3, z: -9,    radius: 1.2 }, // fire circle / campfire (MESHY_FIRE)
  // Obelisk moved out of the plaza (-16, -14) — past the cottage ring so
  // players won't bump into it during walk sequences. No walk obstacle
  // needed at that distance.
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
  // Fills the gap on the left of the church — the rear corner used to
  // read as empty ground because the nearest cottage was all the way out
  // at (-15, -8). Positioned clear of the (-11, -13) tree and of the
  // church body (sphere radius ~4m at scale 4.8).
  { type: 'cottage', position: [-8, 0, -12],  scale: 1.5, variant: 1, get rotation() { return [0, faceCenter(-8, -12), 0]; } },
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

// The two SW/SE plaza-front segments used to sit at (±5..7, z≈6), which
// clipped the bulletin board / obelisk / fire circle when those props
// were placed on the plaza perimeter. Dropped them — the west/east side
// fences and the south one still frame the village.
export const FENCE_SEGMENTS = [
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
