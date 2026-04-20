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
// regardless of the altar's Y rotation. Eyes sit right on the socle base
// at ground level, so the plume reads as smoke rising from the stone ring
// rather than hovering halfway up the altar.
const EYE_OFFSET_X = 0.28;
const EYE_Y = 0.18;
const CLOUD_Y_RAISE = 0.22; // lift cloud centre above the emitter anchor so the column grows upward

const BloodCircle = React.memo(function BloodCircle({
  position = [0, 0.05, 0], rotation = [0, 0, 0], scale = 3.5,
}) {
  const lightL = useRef();
  const lightR = useRef();
  const neonRingInner = useRef();
  const neonRingOuter = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Slow ritual pulse — two offset low-freq sines for a breathing feel.
    // Left/right offset by phase so they don't breathe in lock-step.
    const pulseL = 1 + Math.sin(t * 1.6) * 0.22 + Math.sin(t * 0.9) * 0.10;
    const pulseR = 1 + Math.sin(t * 1.6 + 1.1) * 0.22 + Math.sin(t * 0.9 + 0.6) * 0.10;
    if (lightL.current) lightL.current.intensity = 1.4 * pulseL;
    if (lightR.current) lightR.current.intensity = 1.4 * pulseR;
    // Neon halo breathes on a slower cycle so it reads as a steady glow
    // rather than a strobe — slight opacity wobble ties it to the ritual
    // rather than feeling like a static overlay.
    const ringPulse = 0.78 + Math.sin(t * 1.1) * 0.12 + Math.sin(t * 0.5) * 0.06;
    if (neonRingInner.current) neonRingInner.current.opacity = 0.6 * ringPulse;
    if (neonRingOuter.current) neonRingOuter.current.opacity = 0.28 * ringPulse;
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
        saturate={1.55}
        contrast={1.25}
      />

      {/* Two thin rubine-red columns rising out of the socle. Bounds are
          tall and thin (0.015 XZ, 0.35 Y) so the plume reads as a vertical
          smoke stream instead of a drifting puff. Volume bumped so the
          column stays visually continuous rather than flickering between
          sparse sprites. Speed pushed high so motion is obviously alive —
          previous 0.55/0.6 felt static in a paused-game screenshot. */}
      <Clouds material={THREE.MeshBasicMaterial} limit={32} texture="/cloud.png">
        <Cloud
          position={leftCloudPos}
          seed={17}
          segments={14}
          bounds={[0.015, 0.35, 0.015]}
          volume={0.07}
          smallestVolume={0.012}
          concentrate="inside"
          growth={0.45}
          color="#a82020"
          opacity={0.75}
          speed={1.8}
          fade={4}
        />
        <Cloud
          position={rightCloudPos}
          seed={31}
          segments={14}
          bounds={[0.015, 0.35, 0.015]}
          volume={0.07}
          smallestVolume={0.012}
          concentrate="inside"
          growth={0.45}
          color="#a82020"
          opacity={0.75}
          speed={1.95}
          fade={4}
        />
      </Clouds>

      {/* Neon halo around the altar's circular base — thin additive ring
          reads like a red-neon highlight tracing the stone perimeter. A
          wider soft ring behind it sells the bloom without needing a
          postprocess pass. Both ride just above the ground so z-fighting
          with the plaza floor stays invisible. Radii chosen to hug the
          model's stone rim (scale=3.5 → visible circle ~1.45–1.7 units). */}
      <mesh
        position={[position[0], position[1] + 0.03, position[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[1.48, 1.6, 96]} />
        <meshBasicMaterial
          ref={neonRingInner}
          color="#ff1a1a"
          transparent
          opacity={0.6}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh
        position={[position[0], position[1] + 0.02, position[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[1.38, 1.78, 96]} />
        <meshBasicMaterial
          ref={neonRingOuter}
          color="#ff3030"
          transparent
          opacity={0.28}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Lueur : short-range white pointLight at each socket so the mist
          column catches a soft glow and the altar stones around read as
          illuminated. Distance stays tight so it's a local ritual glow,
          not a plaza flood. */}
      <pointLight
        ref={lightL}
        position={leftPos}
        color="#ff4848"
        intensity={1.4}
        distance={2.2}
        decay={1.6}
        castShadow={false}
      />
      <pointLight
        ref={lightR}
        position={rightPos}
        color="#ff4848"
        intensity={1.4}
        distance={2.2}
        decay={1.6}
        castShadow={false}
      />
    </>
  );
});

export default BloodCircle;
