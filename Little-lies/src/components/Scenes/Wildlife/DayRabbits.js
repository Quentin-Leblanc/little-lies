import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';

const Rabbit = ({ baseX, baseZ, speed, hopSpeed, offset, scale }) => {
  const groupRef = useRef();

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    const x = baseX + Math.sin(t * speed + offset) * 3;
    const z = baseZ + Math.cos(t * speed * 0.7 + offset) * 3;
    const hop = Math.abs(Math.sin(t * hopSpeed + offset)) * 0.3;
    groupRef.current.position.set(x, hop, z);
    // Face movement direction
    groupRef.current.rotation.y = Math.atan2(
      Math.cos(t * speed + offset) * speed * 3,
      -Math.sin(t * speed * 0.7 + offset) * speed * 0.7 * 3
    );
  });

  return (
    <group ref={groupRef} scale={scale}>
      <mesh position={[0, 0.35, 0]} castShadow>
        <sphereGeometry args={[0.4, 6, 5]} />
        <meshStandardMaterial color="#d4c0a0" flatShading />
      </mesh>
      <mesh position={[0, 0.65, 0.25]} castShadow>
        <sphereGeometry args={[0.25, 6, 5]} />
        <meshStandardMaterial color="#ddd0b8" flatShading />
      </mesh>
      <mesh position={[-0.08, 1, 0.2]} rotation={[0.3, 0, -0.15]} castShadow>
        <capsuleGeometry args={[0.04, 0.3, 3, 4]} />
        <meshStandardMaterial color="#c8b090" flatShading />
      </mesh>
      <mesh position={[0.08, 1, 0.2]} rotation={[0.3, 0, 0.15]} castShadow>
        <capsuleGeometry args={[0.04, 0.3, 3, 4]} />
        <meshStandardMaterial color="#c8b090" flatShading />
      </mesh>
      <mesh position={[0, 0.35, -0.35]}>
        <sphereGeometry args={[0.12, 4, 4]} />
        <meshStandardMaterial color="#f0e8d8" flatShading />
      </mesh>
      <mesh position={[-0.08, 0.72, 0.44]}>
        <sphereGeometry args={[0.03, 4, 4]} />
        <meshBasicMaterial color="#1a1008" />
      </mesh>
      <mesh position={[0.08, 0.72, 0.44]}>
        <sphereGeometry args={[0.03, 4, 4]} />
        <meshBasicMaterial color="#1a1008" />
      </mesh>
    </group>
  );
};

// Procedural bunnies hopping around on sunny days.
const DayRabbits = ({ count = 5 }) => {
  const rabbits = useMemo(() => Array.from({ length: count }, (_, i) => ({
    baseX: (Math.sin(i * 2.4) * 12) + (i % 2 ? 3 : -3),
    baseZ: (Math.cos(i * 3.1) * 10) + (i % 3 ? 5 : -5),
    speed: 0.3 + (i % 3) * 0.15,
    hopSpeed: 3 + i * 0.5,
    offset: i * 1.8,
    scale: 0.25 + (i % 3) * 0.08,
  })), [count]);

  return (
    <group>
      {rabbits.map((r, i) => (
        <Rabbit key={i} {...r} />
      ))}
    </group>
  );
};

export default DayRabbits;
