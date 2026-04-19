import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Procedural silhouette windmill placed between the cottage ring and
// the mountain ring. Pure low-poly: cylinder tower + cone roof + a
// rotating four-blade cross. Meant to be read as depth cue ("there's
// civilization past the village edge") from the wider day-orbit cams
// — on intimate/topdown shots it sits off-frame.
//
// Blades rotate at ~0.3 rad/s ≈ 1 revolution / 21 s — slow enough not
// to catch the eye during tense phases, fast enough to feel alive.
const DistantWindmill = React.memo(({
  position = [-28, 0, -26],
  scale = 1.8,
  towerColor = '#3a302a',
  roofColor = '#2a201c',
  bladeColor = '#5a4a3a',
}) => {
  const bladesRef = useRef();

  // Shared geometries / materials — single instance per mount.
  const towerGeo = useMemo(() => new THREE.CylinderGeometry(0.9 * scale, 1.1 * scale, 5.5 * scale, 8), [scale]);
  const roofGeo  = useMemo(() => new THREE.ConeGeometry(1.1 * scale, 1.6 * scale, 8), [scale]);
  const bladeGeo = useMemo(() => new THREE.BoxGeometry(0.12 * scale, 4.0 * scale, 0.22 * scale), [scale]);
  const hubGeo   = useMemo(() => new THREE.SphereGeometry(0.28 * scale, 10, 10), [scale]);

  useFrame((_, delta) => {
    if (bladesRef.current) bladesRef.current.rotation.z += delta * 0.3;
  });

  return (
    <group position={position}>
      {/* Tower body */}
      <mesh geometry={towerGeo} position={[0, 2.75 * scale, 0]} castShadow>
        <meshStandardMaterial color={towerColor} flatShading roughness={0.92} />
      </mesh>
      {/* Conical roof */}
      <mesh geometry={roofGeo} position={[0, 5.5 * scale + 0.8 * scale, 0]} castShadow>
        <meshStandardMaterial color={roofColor} flatShading roughness={0.85} />
      </mesh>
      {/* Blade assembly — rotates as a group. Offset slightly forward
          (z-) so the cross sits in front of the tower silhouette. */}
      <group ref={bladesRef} position={[0, 4.5 * scale, 0.9 * scale]}>
        <mesh geometry={bladeGeo}>
          <meshStandardMaterial color={bladeColor} flatShading roughness={0.9} />
        </mesh>
        <mesh geometry={bladeGeo} rotation={[0, 0, Math.PI / 2]}>
          <meshStandardMaterial color={bladeColor} flatShading roughness={0.9} />
        </mesh>
        <mesh geometry={bladeGeo} rotation={[0, 0, Math.PI]}>
          <meshStandardMaterial color={bladeColor} flatShading roughness={0.9} />
        </mesh>
        <mesh geometry={bladeGeo} rotation={[0, 0, -Math.PI / 2]}>
          <meshStandardMaterial color={bladeColor} flatShading roughness={0.9} />
        </mesh>
        <mesh geometry={hubGeo}>
          <meshStandardMaterial color="#1a1612" flatShading roughness={0.95} />
        </mesh>
      </group>
    </group>
  );
});

export default DistantWindmill;
