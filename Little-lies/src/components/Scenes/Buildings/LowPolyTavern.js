import React from 'react';

const LowPolyTavern = React.memo(({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
      <boxGeometry args={[3.2, 2.4, 2.6]} />
      <meshStandardMaterial color="#F0DEC0" flatShading />
    </mesh>
    <mesh position={[0, 2.9, 0]} castShadow>
      <coneGeometry args={[2.5, 1.2, 4]} />
      <meshStandardMaterial color="#C45530" flatShading />
    </mesh>
    <mesh position={[0, 1.6, 1.35]} castShadow>
      <boxGeometry args={[3.4, 0.1, 0.3]} />
      <meshStandardMaterial color="#8B6914" flatShading />
    </mesh>
    <mesh position={[0, 0.6, 1.31]}>
      <boxGeometry args={[0.7, 1.2, 0.05]} />
      <meshStandardMaterial color="#5a3a1a" flatShading />
    </mesh>
    <mesh position={[1.2, 1.8, 1.4]} castShadow>
      <boxGeometry args={[0.05, 0.05, 0.4]} />
      <meshStandardMaterial color="#3a3a3a" flatShading />
    </mesh>
    <mesh position={[1.2, 1.6, 1.6]} castShadow>
      <boxGeometry args={[0.6, 0.4, 0.05]} />
      <meshStandardMaterial color="#8B6914" flatShading />
    </mesh>
    {[[-0.8, 1.5, 1.31], [0.8, 1.5, 1.31]].map((p, i) => (
      <mesh key={i} position={p}>
        <boxGeometry args={[0.45, 0.45, 0.05]} />
        <meshBasicMaterial color="#FFD700" transparent opacity={0.6} />
      </mesh>
    ))}
  </group>
));

export default LowPolyTavern;
