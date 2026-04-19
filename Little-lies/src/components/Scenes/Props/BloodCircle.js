import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Clouds, Cloud } from '@react-three/drei';
import * as THREE from 'three';
import MeshyModel from './MeshyModel';
import { MESHY_BLOOD } from '../constants';

// The blood-ritual altar that replaces the old gallows. The wolf crest on
// the altar has two ruby eye-sockets — this wrapper stages a soft volumetric
// mist at the centre of the socle so the altar reads as "smoking" instead
// of "lit up". Previous version used semitransparent sphere puffs which
// looked like literal white balls; this version uses the same drei Cloud
// volumetric setup as GroundFog / VillageFogWall (cloud.png sprite cards
// stacked via noise) so the plume blends in with the rest of the scene's
// mist language.
//
//  - 2 small mist columns centred on the socle (slight L/R offset so
//    they read as two eyes), animated by drei's built-in speed prop
//  - 2 short-range white pointLights pulsing on two offset sines so the
//    altar stones glow faintly around the mist
const HALF_HEIGHT = 0.48;

// Emitter world-offsets relative to the altar's position. Base is
// circularly symmetric so we don't rotate — X/Z separation stays centred
// regardless of the altar's Y rotation. Eye y is the socle centre, the
// Cloud position is a bit above (cloud bounds are half-extents centred).
const EYE_OFFSET_X = 0.28;
const EYE_Y = 0.6;
const CLOUD_Y_RAISE = 0.12; // lift cloud centre above the emitter anchor

const BloodCircle = React.memo(function BloodCircle({
  position = [0, 0.05, 0], rotation = [0, 0, 0], scale = 3.5,
}) {
  const lightL = useRef();
  const lightR = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Slow ritual pulse — two offset low-freq sines for a breathing feel.
    // Left/right offset by phase so they don't breathe in lock-step.
    const pulseL = 1 + Math.sin(t * 1.6) * 0.22 + Math.sin(t * 0.9) * 0.10;
    const pulseR = 1 + Math.sin(t * 1.6 + 1.1) * 0.22 + Math.sin(t * 0.9 + 0.6) * 0.10;
    if (lightL.current) lightL.current.intensity = 1.1 * pulseL;
    if (lightR.current) lightR.current.intensity = 1.1 * pulseR;
  });

  const leftPos = [position[0] - EYE_OFFSET_X, position[1] + EYE_Y, position[2]];
  const rightPos = [position[0] + EYE_OFFSET_X, position[1] + EYE_Y, position[2]];
  const leftCloudPos = [leftPos[0], leftPos[1] + CLOUD_Y_RAISE, leftPos[2]];
  const rightCloudPos = [rightPos[0], rightPos[1] + CLOUD_Y_RAISE, rightPos[2]];

  return (
    <>
      <MeshyModel
        path={MESHY_BLOOD}
        position={position}
        rotation={rotation}
        scale={scale}
        halfHeight={HALF_HEIGHT}
      />

      {/* Two slow smoke curls. Previous tuning read as hard "rings"
          because a small cloud with 4 segments shows each sprite as its
          own visible puff. Fix: up the segments (12) so sprites overlap
          into a continuous column, stretch bounds on Y (thin tall plume
          instead of a compact puff), drop speed (0.08/0.1) so motion
          feels breath-like, and keep opacity low (0.20) so the column
          reads as mist not a solid cloud. Two different seeds + slight
          speed asymmetry avoid a left/right mirror effect. */}
      <Clouds material={THREE.MeshBasicMaterial} limit={32} texture="/cloud.png">
        <Cloud
          position={leftCloudPos}
          seed={17}
          segments={12}
          bounds={[0.05, 0.28, 0.05]}
          volume={0.22}
          smallestVolume={0.04}
          concentrate="inside"
          growth={1.0}
          color="#f2ede2"
          opacity={0.2}
          speed={0.08}
          fade={6}
        />
        <Cloud
          position={rightCloudPos}
          seed={31}
          segments={12}
          bounds={[0.05, 0.28, 0.05]}
          volume={0.22}
          smallestVolume={0.04}
          concentrate="inside"
          growth={1.0}
          color="#f2ede2"
          opacity={0.2}
          speed={0.1}
          fade={6}
        />
      </Clouds>

      {/* Lueur : short-range white pointLight at each socket so the mist
          column catches a soft glow and the altar stones around read as
          illuminated. Distance stays tight so it's a local ritual glow,
          not a plaza flood. */}
      <pointLight
        ref={lightL}
        position={leftPos}
        color="#ffffff"
        intensity={1.1}
        distance={2.0}
        decay={1.6}
        castShadow={false}
      />
      <pointLight
        ref={lightR}
        position={rightPos}
        color="#ffffff"
        intensity={1.1}
        distance={2.0}
        decay={1.6}
        castShadow={false}
      />
    </>
  );
});

export default BloodCircle;
