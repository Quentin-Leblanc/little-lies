import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Falling streaks — instanced so 300 drops stay cheap. Wraps vertically
// when a drop hits ground.
const NightRain = ({ count = 300 }) => {
  const meshRef = useRef();
  const drops = useMemo(() => Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 50,
    y: Math.random() * 20,
    z: (Math.random() - 0.5) * 50,
    speed: 15 + Math.random() * 10,
    offset: Math.random() * 20,
  })), [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    drops.forEach((d, i) => {
      d.y -= d.speed * delta;
      if (d.y < 0) d.y = 18 + Math.random() * 4;
      dummy.position.set(d.x, d.y, d.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <boxGeometry args={[0.02, 0.5, 0.02]} />
      <meshBasicMaterial color="#8899bb" transparent opacity={0.25} depthWrite={false} />
    </instancedMesh>
  );
};

export default NightRain;
