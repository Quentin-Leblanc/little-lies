import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

// Procedural torch — pole + bracket + multi-layer flame + flickering point
// light. Currently unused (SkullLantern replaced it) but kept for reuse
// if we bring back procedural torches.
const Torch = React.memo(function Torch({ position }) {
  const lightRef = useRef();
  const flameRef = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (lightRef.current) {
      lightRef.current.intensity = 0.8 + Math.sin(t * 8 + position[0]) * 0.2 + Math.sin(t * 13) * 0.1;
    }
    if (flameRef.current) {
      flameRef.current.scale.y = 1 + Math.sin(t * 10 + position[2]) * 0.25;
      flameRef.current.scale.x = 1 + Math.sin(t * 8 + 1) * 0.15;
    }
  });

  return (
    <group position={position}>
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.06, 1.6, 6]} />
        <meshStandardMaterial color="#5a3a1a" />
      </mesh>
      <mesh position={[0, 1.55, 0]}>
        <cylinderGeometry args={[0.08, 0.05, 0.12, 6]} />
        <meshStandardMaterial color="#444" metalness={0.5} roughness={0.5} />
      </mesh>
      <group ref={flameRef} position={[0, 1.68, 0]}>
        <mesh>
          <coneGeometry args={[0.1, 0.35, 6]} />
          <meshBasicMaterial color="#ff4400" transparent opacity={0.85} />
        </mesh>
        <mesh position={[0, 0.05, 0]}>
          <coneGeometry args={[0.07, 0.25, 6]} />
          <meshBasicMaterial color="#ff8800" transparent opacity={0.8} />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <coneGeometry args={[0.04, 0.18, 4]} />
          <meshBasicMaterial color="#ffee44" transparent opacity={0.9} />
        </mesh>
        <mesh position={[0, 0.14, 0]}>
          <coneGeometry args={[0.02, 0.1, 4]} />
          <meshBasicMaterial color="#ffffcc" transparent opacity={0.7} />
        </mesh>
      </group>
      <pointLight ref={lightRef} position={[0, 1.85, 0]} intensity={0.8} color="#ff8833" distance={6} />
    </group>
  );
});

export default Torch;
