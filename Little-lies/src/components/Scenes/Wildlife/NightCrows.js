import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Birds circling overhead at night — fake wing flap via y-scale pulse.
// Rotation follows orbit angle so they face the flight direction.
const NightCrows = ({ count = 4 }) => {
  const meshRef = useRef();
  const birds = useMemo(() => Array.from({ length: count }, (_, i) => ({
    offset: (i / count) * Math.PI * 2,
    radius: 18 + (i % 3) * 4,
    height: 12 + (i % 2) * 5,
    speed: 0.12 + i * 0.02,
    wingPhase: i * 1.7,
  })), [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    birds.forEach((b, i) => {
      const angle = t * b.speed + b.offset;
      dummy.position.set(
        Math.cos(angle) * b.radius,
        b.height + Math.sin(t * 0.8 + b.wingPhase) * 1.5,
        Math.sin(angle) * b.radius
      );
      dummy.rotation.set(0, -angle + Math.PI / 2, Math.sin(t * 4 + b.wingPhase) * 0.3);
      dummy.scale.set(1.2, 0.3 + Math.abs(Math.sin(t * 4 + b.wingPhase)) * 0.7, 1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <boxGeometry args={[0.8, 0.1, 0.3]} />
      <meshBasicMaterial color="#111122" />
    </instancedMesh>
  );
};

export default NightCrows;
