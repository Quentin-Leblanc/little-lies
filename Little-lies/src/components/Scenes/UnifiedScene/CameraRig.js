import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────
// CameraRig — single source of truth for the UnifiedScene camera.
//
// Each named "view" defines an orbit pose (radius + height + speed +
// lookAt) or a static pose. On view change, the rig lerps its target
// pose toward the new view over ~1.5s so the transition reads as a
// fluid camera move instead of a hard cut between scenes.
//
// Implemented views:
//  - lobby   : intimate orbit close to the fire (matches the old
//              CustomLobby OrbitCamera baseline at r=6, h=3.5).
//  - setup   : camera pulls back + lifts a touch so the host's role
//              selection feels like "the assembly gathers around the
//              fire" instead of being eye-level with the flames.
//  - game    : placeholder static — MainScene still owns the in-game
//              camera until P3 absorbs it under this rig.
// ─────────────────────────────────────────────────────────────────────

const VIEWS = {
  lobby: {
    type: 'orbit',
    radius: 6,
    height: 3.5,
    speed: 0.03,
    lookAt: [0, 0.5, 0],
    fov: 50,
  },
  setup: {
    // Pulled back + lifted ~1.7m. Slower orbit so the recoil reads as
    // "stepping back to see the whole circle" rather than continuing
    // the same lobby drift at a larger radius.
    type: 'orbit',
    radius: 9.5,
    height: 5.2,
    speed: 0.018,
    lookAt: [0, 0.4, 0],
    fov: 52,
  },
  game: {
    type: 'static',
    position: [0, 9, 14],
    lookAt: [0, 0, 0],
    fov: 50,
  },
};

// Per-frame interpolation weight. ~0.04 over the 60Hz render loop
// produces a comfortable ~1.2s ease between views — fast enough that
// the user feels the camera responding, slow enough that no "snap"
// energy reads as a hard cut.
const VIEW_LERP = 0.04;

const lerp = (a, b, t) => a + (b - a) * t;

const CameraRig = ({ view = 'lobby' }) => {
  const { camera } = useThree();
  const target = useRef(new THREE.Vector3());
  const lookAtVec = useRef(new THREE.Vector3());

  // Pose state lerped each frame toward the active view's target.
  // Starting at the lobby defaults so the first frame doesn't slingshot
  // through space before the lerp catches up.
  const pose = useRef({
    radius: VIEWS.lobby.radius,
    height: VIEWS.lobby.height,
    speed: VIEWS.lobby.speed,
    lookX: VIEWS.lobby.lookAt[0],
    lookY: VIEWS.lobby.lookAt[1],
    lookZ: VIEWS.lobby.lookAt[2],
    fov: VIEWS.lobby.fov,
  });
  // Orbit phase accumulates independently of the view-change lerp so
  // the camera keeps gliding around the fire even mid-transition.
  const orbitPhase = useRef(0);

  useFrame((state, delta) => {
    const cfg = VIEWS[view] || VIEWS.lobby;

    const p = pose.current;
    p.radius = lerp(p.radius, cfg.radius ?? 6, VIEW_LERP);
    p.height = lerp(p.height, cfg.height ?? 3.5, VIEW_LERP);
    p.speed  = lerp(p.speed,  cfg.speed  ?? 0.03, VIEW_LERP);
    p.lookX  = lerp(p.lookX,  cfg.lookAt?.[0] ?? 0, VIEW_LERP);
    p.lookY  = lerp(p.lookY,  cfg.lookAt?.[1] ?? 0.5, VIEW_LERP);
    p.lookZ  = lerp(p.lookZ,  cfg.lookAt?.[2] ?? 0, VIEW_LERP);
    p.fov    = lerp(p.fov,    cfg.fov    ?? 50, VIEW_LERP);

    if (cfg.type === 'orbit') {
      orbitPhase.current += delta * p.speed;
      target.current.set(
        Math.cos(orbitPhase.current) * p.radius,
        p.height,
        Math.sin(orbitPhase.current) * p.radius,
      );
    } else {
      // Static pose — interpolate position toward the configured point
      // without orbiting around it. Future game.day/game.night will
      // likely re-use this branch.
      target.current.set(cfg.position[0], cfg.position[1], cfg.position[2]);
    }

    camera.position.copy(target.current);
    lookAtVec.current.set(p.lookX, p.lookY, p.lookZ);
    camera.lookAt(lookAtVec.current);

    if (Math.abs(camera.fov - p.fov) > 0.01) {
      camera.fov = p.fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
};

export default CameraRig;
