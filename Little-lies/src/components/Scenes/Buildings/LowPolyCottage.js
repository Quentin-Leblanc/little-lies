import React from 'react';

const LowPolyCottage = React.memo(function LowPolyCottage({ position, rotation = [0, 0, 0], scale = 1, variant = 0 }) {
  const wallColor = variant % 3 === 0 ? '#F5E6D0' : variant % 3 === 1 ? '#E8DCC8' : '#F0DEC0';
  const roofColor = variant % 2 === 0 ? '#E8734A' : '#D4613A';
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 2, 2.2]} />
        <meshStandardMaterial color={wallColor} flatShading />
      </mesh>
      <mesh position={[0, 2.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.9, 1.2, 4]} />
        <meshStandardMaterial color={roofColor} flatShading />
      </mesh>
      <mesh position={[0, 0.55, 1.11]}>
        <boxGeometry args={[0.5, 1.1, 0.05]} />
        <meshStandardMaterial color="#5a3a1a" flatShading />
      </mesh>
      <mesh position={[0.6, 1.3, 1.11]}>
        <boxGeometry args={[0.4, 0.4, 0.05]} />
        <meshBasicMaterial color="#FFD700" transparent opacity={0.5} />
      </mesh>
      <mesh position={[-0.6, 2.8, -0.5]} castShadow>
        <boxGeometry args={[0.35, 0.8, 0.35]} />
        <meshStandardMaterial color="#8a7a6a" flatShading />
      </mesh>
    </group>
  );
});

export default LowPolyCottage;
