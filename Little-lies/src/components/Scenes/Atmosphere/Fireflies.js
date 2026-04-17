import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Night fireflies — bright green specks that drift and pulse in place,
// cached as an InstancedMesh so the GPU only handles 60 matrices.
export const Fireflies = ({ count = 60 }) => {
  const meshRef = useRef();
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 40,
        y: Math.random() * 5 + 0.3,
        z: (Math.random() - 0.5) * 40,
        speed: Math.random() * 0.5 + 0.1,
        offset: Math.random() * Math.PI * 2,
        size: Math.random() * 0.5 + 0.6,
      });
    }
    return arr;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    particles.forEach((p, i) => {
      const px = p.x + Math.sin(t * p.speed + p.offset) * 2;
      const py = p.y + Math.sin(t * p.speed * 1.3 + p.offset) * 0.6;
      const pz = p.z + Math.cos(t * p.speed * 0.8 + p.offset) * 2;
      dummy.position.set(px, py, pz);
      const pulse = p.size * (0.3 + Math.sin(t * 3.5 + p.offset) * 0.5 + Math.sin(t * 7 + p.offset * 2) * 0.2);
      dummy.scale.setScalar(Math.max(0.05, pulse));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[0.06, 6, 6]} />
      <meshBasicMaterial color="#aaffaa" transparent opacity={0.85} />
    </instancedMesh>
  );
};

// Day variant — golden pollen instead of green, slower & fewer pulses.
export const DayFireflies = ({ count = 50 }) => {
  const meshRef = useRef();
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 40,
        y: Math.random() * 6 + 0.5,
        z: (Math.random() - 0.5) * 40,
        speed: Math.random() * 0.25 + 0.05,
        offset: Math.random() * Math.PI * 2,
        size: Math.random() * 0.4 + 0.4,
      });
    }
    return arr;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    particles.forEach((p, i) => {
      const px = p.x + Math.sin(t * p.speed + p.offset) * 3;
      const py = p.y + Math.sin(t * p.speed * 1.2 + p.offset) * 0.8;
      const pz = p.z + Math.cos(t * p.speed * 0.7 + p.offset) * 3;
      dummy.position.set(px, py, pz);
      const pulse = p.size * (0.5 + Math.sin(t * 2 + p.offset) * 0.3);
      dummy.scale.setScalar(Math.max(0.05, pulse));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[0.05, 5, 5]} />
      <meshBasicMaterial color="#ffdd66" transparent opacity={0.55} />
    </instancedMesh>
  );
};
