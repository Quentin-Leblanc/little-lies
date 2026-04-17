import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Dense black fog patches on the plaza at night — instanced low-poly
// spheres that drift and rotate slowly for a creeping-dark feel.
const NightDarkFog = ({ count = 20 }) => {
  const meshRef = useRef();
  const clouds = useMemo(() => Array.from({ length: count }, (_, i) => ({
    x: (Math.sin(i * 1.8) * 14),
    z: (Math.cos(i * 1.4) * 14),
    y: 0.3 + (i % 4) * 0.4,
    scaleX: 3 + (i % 5) * 2,
    scaleZ: 2.5 + (i % 4) * 1.8,
    speed: 0.03 + (i % 5) * 0.008,
    offset: i * 1.1,
  })), [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    clouds.forEach((c, i) => {
      dummy.position.set(
        c.x + Math.sin(t * c.speed + c.offset) * 4,
        c.y,
        c.z + Math.cos(t * c.speed * 0.8 + c.offset) * 4
      );
      dummy.scale.set(c.scaleX, 0.1 + Math.sin(t * 0.3 + c.offset) * 0.05, c.scaleZ);
      dummy.rotation.set(0, t * c.speed * 0.2 + c.offset, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[1.5, 7, 5]} />
      <meshBasicMaterial color="#050010" transparent opacity={0.4} depthWrite={false} />
    </instancedMesh>
  );
};

export default NightDarkFog;
