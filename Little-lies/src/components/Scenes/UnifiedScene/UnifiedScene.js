import React from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import CameraRig from './CameraRig';
import LobbyView from './LobbyView';
import VillageView from './VillageView';
import './UnifiedScene.scss';

// ─────────────────────────────────────────────────────────────────────
// UnifiedScene — single persistent R3F Canvas for the whole app.
//
// Mounted at the App root behind every HTML overlay (lobby panel,
// setup list, in-game HUD, TopBar). Survives every screen swap so the
// 3D layer never has to remount.
//
// Two content branches:
//   - lobby / setup → <LobbyView /> + <CameraRig />
//     (campfire + seated players, intimate orbit that pulls back when
//      view='setup'. Camera fully owned by CameraRig.)
//   - game / game.*  → <VillageView />
//     (full village + atmospherics + per-phase CameraController. Brings
//      its own camera because the in-game phase-driven logic — intro
//      cinematic / night waypoints / trial / death focus / day orbits —
//      is complex enough that we keep it next to the village content.)
//
// The Canvas itself, postprocessing tone mapping and default camera
// shell stay constant across both branches. R3F internals (renderer,
// gl context, scene root) are reused — only the scene graph swaps.
// ─────────────────────────────────────────────────────────────────────

// Anything starting with 'game' (e.g. game.day, game.night) renders
// the village. lobby/setup render the campfire scene.
const isGameView = (view) => typeof view === 'string' && view.startsWith('game');

const UnifiedScene = ({ view = 'lobby' }) => {
  const inGame = isGameView(view);
  return (
    <div className="unified-scene" aria-hidden="true">
      <Canvas
        shadows
        camera={{ position: [6, 3.5, 0], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.92,
        }}
      >
        {/* CameraRig only drives the lobby/setup orbit. VillageView
            mounts its own CameraController for the in-game phase logic
            — we can't have both writing to camera.position each frame,
            so they're mutually exclusive. */}
        {!inGame && <CameraRig view={view} />}
        {!inGame && <LobbyView />}
        {inGame && <VillageView />}
      </Canvas>
    </div>
  );
};

export default UnifiedScene;
