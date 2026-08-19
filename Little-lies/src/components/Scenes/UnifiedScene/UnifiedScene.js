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

// ── Tone mapping ─────────────────────────────────────────────────────
// ACESFilmic is a PHOTOGRAPHIC curve: it desaturates highlights and
// rolls shadows off softly, which is the opposite of what a flat,
// graphic art direction wants. Swapping it for THREE.LinearToneMapping
// (or NoToneMapping) gives cleaner, more saturated colour blocks and
// harder value separation — the look this scene is heading toward.
//
// It is NOT flipped here because it can't be flipped alone. Every light
// intensity in SceneLighting is tuned against this curve: day scene
// radiance peaks near 4.8, which ACES compresses to ~0.93 but Linear
// would clip to solid white unless the exposure drops to ~0.2 — and at
// that exposure shadowed faces fall from ~0.72 to ~0.26, i.e. the whole
// scene goes dark and contrasty in one step. Doing that properly means
// retuning the lighting alongside it and LOOKING at the result.
//
// Left as a one-line A/B so that retune can start from a single edit.
const TONE_MAPPING = THREE.ACESFilmicToneMapping;
const TONE_MAPPING_EXPOSURE = 0.92;

const UnifiedScene = ({ view = 'lobby' }) => {
  const inGame = isGameView(view);
  return (
    <div className="unified-scene" aria-hidden="true">
      <Canvas
        shadows
        camera={{ position: [6, 3.5, 0], fov: 50 }}
        dpr={[1, 1.5]}
        gl={{
          toneMapping: TONE_MAPPING,
          toneMappingExposure: TONE_MAPPING_EXPOSURE,
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
