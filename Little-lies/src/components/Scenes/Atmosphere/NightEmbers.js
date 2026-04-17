import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { FIELD_W, FIELD_H, WIND_NX, WIND_NZ } from '../constants';

// Tiny hot specks drifting in the wind (night). Same directional flow as
// WindLeaves so the two effects feel consistent. Embers also rise slightly
// over time before being swept along, and flicker on scale.
const NightEmbers = ({ count = 70 }) => {
  const meshRef = useRef();
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * FIELD_W,
        y: Math.random() * 5 + 0.4,
        z: (Math.random() - 0.5) * FIELD_H,
        speed: 0.9 + Math.random() * 1.4,
        rise: 0.15 + Math.random() * 0.35,
        bobAmp: 0.15 + Math.random() * 0.35,
        bobFreq: 0.6 + Math.random() * 1.0,
        sideAmp: 0.25 + Math.random() * 0.45,
        sideFreq: 0.4 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2,
        size: 0.04 + Math.random() * 0.05,
        flickerFreq: 2 + Math.random() * 3,
      });
    }
    return arr;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const halfW = FIELD_W / 2;
  const halfH = FIELD_H / 2;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    particles.forEach((p, i) => {
      const distance = t * p.speed;
      const rawX = p.x + WIND_NX * distance;
      const rawZ = p.z + WIND_NZ * distance;
      const px = ((rawX + halfW) % FIELD_W + FIELD_W) % FIELD_W - halfW
               + (-WIND_NZ) * Math.sin(t * p.sideFreq + p.phase) * p.sideAmp;
      const pz = ((rawZ + halfH) % FIELD_H + FIELD_H) % FIELD_H - halfH
               + WIND_NX * Math.sin(t * p.sideFreq + p.phase) * p.sideAmp;
      const rawY = p.y + t * p.rise;
      const py = ((rawY - 0.2) % 6) + 0.2 + Math.sin(t * p.bobFreq + p.phase) * p.bobAmp;
      dummy.position.set(px, py, pz);
      const flicker = 0.7 + Math.sin(t * p.flickerFreq + p.phase) * 0.3;
      dummy.scale.setScalar(p.size * flicker);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[1, 5, 4]} />
      <meshBasicMaterial color="#ffb056" transparent opacity={0.85} toneMapped={false} depthWrite={false} />
    </instancedMesh>
  );
};

export default NightEmbers;
