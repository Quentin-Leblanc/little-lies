import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import MeshyModel from './MeshyModel';
import { MESHY_FIRE } from '../constants';

// Meshy runic fire-circle prop + rising ember instances. The GLB ships with
// lit-flame textures baked in so the fire already reads as lit — we only
// add a sparse, slow ember drift on top (HDR color + toneMapped:false so
// the post bloom catches them as sparks). No extra point lights or glow
// sphere: user asked for sparks-only, the baked fire carries the glow.
const EMBER_COUNT = 9;

const FireCircle = React.memo(function FireCircle({ position, rotation = [0, 0, 0], scale = 1.3 }) {
  const emberRef = useRef();
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Per-ember randomised lifecycle + drift. Seeded once so embers don't all
  // share identical arcs — each has its own speed, phase, and XZ sway.
  // Speeds trimmed (~50%) so embers drift up instead of racing; sizes
  // halved again so they read as fine cinders rather than bright orbs.
  const offsets = useMemo(() => Array.from({ length: EMBER_COUNT }, () => ({
    speed: 0.18 + Math.random() * 0.22,
    drift: (Math.random() - 0.5) * 0.8,
    driftZ: (Math.random() - 0.5) * 0.8,
    phase: Math.random() * Math.PI * 2,
    size: 0.012 + Math.random() * 0.014,
  })), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Embers rise from the center, fade as they climb, loop on their phase
    const mesh = emberRef.current;
    if (!mesh) return;
    for (let i = 0; i < EMBER_COUNT; i++) {
      const o = offsets[i];
      const life = ((t * o.speed + o.phase) % 1);
      dummy.position.set(
        Math.sin(t * 0.6 + o.phase) * o.drift * scale,
        life * 2.6 * scale,
        Math.cos(t * 0.4 + o.phase) * o.driftZ * scale,
      );
      const s = o.size * scale * (1 - life);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  // Embers spawn at flame core height — fire-circle halfHeight is 0.55 so
  // the pit on the top face sits at roughly y ≈ 0.5 * scale.
  const flamePos = [0, 0.5 * scale, 0];

  return (
    <group position={position} rotation={rotation}>
      <MeshyModel path={MESHY_FIRE} position={[0, 0, 0]} scale={scale} halfHeight={0.55} />
      <group position={flamePos}>
        <instancedMesh ref={emberRef} args={[null, null, EMBER_COUNT]}>
          <sphereGeometry args={[1, 4, 3]} />
          <meshBasicMaterial color={[4.5, 1.4, 0.15]} transparent opacity={0.85} toneMapped={false} />
        </instancedMesh>
      </group>
    </group>
  );
});

export default FireCircle;
