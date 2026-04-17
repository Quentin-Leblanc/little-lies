import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Sinuous water strip — 2-vert cross-sections along a hand-placed polyline.
// Animated with coherent position-based waves (no per-vert index offset,
// which would jitter adjacent verts out of phase).
const LowPolyRiver = React.memo(function LowPolyRiver({ isDay }) {
  const meshRef = useRef();
  const points = useMemo(() => [
    new THREE.Vector3(25, 0.02, 10),
    new THREE.Vector3(18, 0.02, 12),
    new THREE.Vector3(12, 0.02, 15),
    new THREE.Vector3(5, 0.02, 16),
    new THREE.Vector3(-3, 0.02, 15),
    new THREE.Vector3(-10, 0.02, 17),
    new THREE.Vector3(-18, 0.02, 19),
    new THREE.Vector3(-25, 0.02, 20),
  ], []);

  const { geometry, basePositions } = useMemo(() => {
    const verts = [];
    const indices = [];
    const width = 1.2;
    points.forEach((p, i) => {
      const next = points[Math.min(i + 1, points.length - 1)];
      const dir = new THREE.Vector3().subVectors(next, p).normalize();
      const perp = new THREE.Vector3(-dir.z, 0, dir.x);
      verts.push(p.x + perp.x * width, p.y, p.z + perp.z * width);
      verts.push(p.x - perp.x * width, p.y, p.z - perp.z * width);
    });
    for (let i = 0; i < points.length - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      indices.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return { geometry: geo, basePositions: [...verts] };
  }, [points]);

  useFrame((state) => {
    if (!meshRef.current) return;
    const positions = meshRef.current.geometry.attributes.position;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < positions.count; i++) {
      const x = basePositions[i * 3];
      const z = basePositions[i * 3 + 2];
      const baseY = basePositions[i * 3 + 1];
      const wave = Math.sin(t * 0.7 - x * 0.35) * 0.025
                 + Math.sin(t * 0.45 + z * 0.3) * 0.015;
      positions.array[i * 3 + 1] = baseY + wave;
    }
    positions.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color={isDay ? '#3A8BC9' : '#1a3a5a'}
        transparent
        opacity={0.7}
        roughness={0.05}
        metalness={0.4}
        envMapIntensity={0.8}
      />
    </mesh>
  );
});

export default LowPolyRiver;
