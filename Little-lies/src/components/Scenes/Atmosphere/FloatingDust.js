import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Tiny specs that drift slowly — day (white) or night (blueish). Used in
// both themes; the isDay prop controls color + opacity.
const FloatingDust = ({ count = 80, isDay = true }) => {
  const meshRef = useRef();
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 50,
        y: Math.random() * 8 + 0.2,
        z: (Math.random() - 0.5) * 50,
        speed: Math.random() * 0.15 + 0.03,
        drift: Math.random() * 0.3 + 0.05,
        offset: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    particles.forEach((p, i) => {
      const px = p.x + Math.sin(t * p.drift + p.offset) * 4;
      const py = p.y + Math.sin(t * p.speed * 2 + p.offset) * 1.2;
      const pz = p.z + Math.cos(t * p.drift * 0.6 + p.offset) * 4;
      dummy.position.set(px, py, pz);
      dummy.scale.setScalar(0.3 + Math.sin(t * 1.5 + p.offset) * 0.15);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[0.025, 4, 4]} />
      <meshBasicMaterial color={isDay ? '#ffffff' : '#8899bb'} transparent opacity={isDay ? 0.3 : 0.2} />
    </instancedMesh>
  );
};

export default FloatingDust;
