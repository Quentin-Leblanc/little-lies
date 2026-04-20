import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import MeshyModel from './MeshyModel';
import { MESHY_BLOOD } from '../constants';

// The blood-ritual altar that replaces the old gallows. Surfaces the
// socle with a neon halo (inner + outer additive rings) and two small
// point lights at the wolf-crest eye sockets so the altar reads as a
// lit ritual focal point. A previous pass also stacked two drei Cloud
// volumetric columns above the sockets to mimic smoking eyes — it read
// as a literal pair of red puffs floating in mid-air and was cut.
//
//  - 2 breathing red pointLights pulsing on two offset sines so the
//    altar stones glow faintly around the eye sockets
//  - inner + outer additive ring tracing the socle rim with a slow
//    opacity wobble on top of the pulse so it feels alive
const HALF_HEIGHT = 0.48;

// Socket world-offsets relative to the altar's position. Base is
// circularly symmetric so we don't rotate — X/Z separation stays centred
// regardless of the altar's Y rotation. Eyes sit right on the socle
// base at ground level so the point lights warm the stone they're
// anchored in instead of floating above it.
const EYE_OFFSET_X = 0.28;
const EYE_Y = 0.18;

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

      {/* Lueur : short-range red pointLight at each socket so the altar
          stones around the wolf-crest eyes read as embered from within.
          Distance stays tight so it's a local ritual glow, not a plaza
          flood. */}
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
