import React from 'react';

const LowPolyChapel = React.memo(({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
      <boxGeometry args={[2.2, 3, 3]} />
      <meshStandardMaterial color="#E8DCC8" flatShading />
    </mesh>
    <mesh position={[0, 3.4, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
      <coneGeometry args={[2.2, 1.2, 4]} />
      <meshStandardMaterial color="#6a6a7a" flatShading />
    </mesh>
    <mesh position={[0, 4.5, -1]} castShadow>
      <boxGeometry args={[0.6, 1.2, 0.6]} />
      <meshStandardMaterial color="#E8DCC8" flatShading />
    </mesh>
    <mesh position={[0, 5.5, -1]} castShadow>
      <coneGeometry args={[0.5, 1.2, 4]} />
      <meshStandardMaterial color="#6a6a7a" flatShading />
    </mesh>
    <mesh position={[0, 6.3, -1]}>
      <boxGeometry args={[0.3, 0.5, 0.05]} />
      <meshStandardMaterial color="#8B6914" flatShading />
    </mesh>
    <mesh position={[0, 6.4, -1]}>
      <boxGeometry args={[0.05, 0.3, 0.3]} />
      <meshStandardMaterial color="#8B6914" flatShading />
    </mesh>
    <mesh position={[0, 0.8, 1.51]}>
      <boxGeometry args={[0.6, 1.6, 0.05]} />
      <meshStandardMaterial color="#4a2a0a" flatShading />
    </mesh>
    <mesh position={[0, 2.4, 1.51]}>
      <circleGeometry args={[0.35, 8]} />
      <meshBasicMaterial color="#FFD700" transparent opacity={0.4} />
    </mesh>
  </group>
));

export default LowPolyChapel;
