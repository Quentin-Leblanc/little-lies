import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

// Floats above dead players — soft blue sphere that bobs and pulses.
const GhostOrb = ({ position }) => {
  const ref = useRef();
  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime;
      ref.current.position.y = position[1] + Math.sin(t * 1.2) * 0.25;
      ref.current.material.opacity = 0.25 + Math.sin(t * 2) * 0.15;
    }
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshBasicMaterial color="#aaccff" transparent opacity={0.35} />
    </mesh>
  );
};

export default GhostOrb;
