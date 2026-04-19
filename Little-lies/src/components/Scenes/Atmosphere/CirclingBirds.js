import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Birds circling very high above the village during the day — depth
// cue and life signal between phases when nothing else is moving.
// Different from NightCrows (which already fly overhead at night and
// use a different, wider radius); these are higher, fewer, slower,
// and scale with fear: more deaths = more birds (carrion watchers).
//
// Rendering: instanced flat boxes with a subtle wing-flap via y-scale
// pulse. Material is unlit near-black so they read as silhouettes
// against the sky regardless of time-of-day lighting.
const CirclingBirds = ({ baseCount = 3, deathsCount = 0 }) => {
  // Scale count with deaths: base + 1 per 2 deaths, capped at 8.
  const count = Math.min(baseCount + Math.floor(deathsCount / 2), 8);
  const meshRef = useRef();

  const birds = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    offset: (i / 8) * Math.PI * 2,
    radius: 32 + (i % 3) * 4,       // far out, between village and mountains
    height: 22 + (i % 2) * 3,        // well above rooftops
    speed: 0.04 + i * 0.006,         // slow majestic orbit
    wingPhase: i * 1.3,
  })), []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < 8; i++) {
      const b = birds[i];
      if (i >= count) {
        // Hide excess instances by parking them below ground + zero scale.
        dummy.position.set(0, -100, 0);
        dummy.scale.set(0, 0, 0);
        dummy.rotation.set(0, 0, 0);
      } else {
        const angle = t * b.speed + b.offset;
        dummy.position.set(
          Math.cos(angle) * b.radius,
          b.height + Math.sin(t * 0.5 + b.wingPhase) * 1.8,
          Math.sin(angle) * b.radius
        );
        dummy.rotation.set(0, -angle + Math.PI / 2, Math.sin(t * 3 + b.wingPhase) * 0.25);
        const flap = 0.4 + Math.abs(Math.sin(t * 3 + b.wingPhase)) * 0.9;
        dummy.scale.set(1.6, flap, 1);
      }
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, 8]} frustumCulled={false}>
      <boxGeometry args={[1.0, 0.12, 0.36]} />
      <meshBasicMaterial color="#222233" />
    </instancedMesh>
  );
};

export default CirclingBirds;
