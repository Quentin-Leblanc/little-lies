import React from 'react';

const LowPolyForge = React.memo(({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
      <boxGeometry args={[2.8, 2.2, 2.4]} />
      <meshStandardMaterial color="#B8A898" flatShading />
    </mesh>
    <mesh position={[0, 2.6, 0]} rotation={[0, 0, 0]} castShadow>
      <coneGeometry args={[2.2, 1, 4]} />
      <meshStandardMaterial color="#8B4513" flatShading />
    </mesh>
    <mesh position={[0.8, 2.8, -0.6]} castShadow>
      <boxGeometry args={[0.6, 1.4, 0.6]} />
      <meshStandardMaterial color="#6a6a6a" flatShading />
    </mesh>
    <mesh position={[-1.2, 0.35, 1.3]} castShadow>
      <boxGeometry args={[0.5, 0.7, 0.3]} />
      <meshStandardMaterial color="#4a4a4a" metalness={0.4} flatShading />
    </mesh>
    <mesh position={[0, 0.65, 1.21]}>
      <boxGeometry args={[0.8, 1.3, 0.05]} />
      <meshStandardMaterial color="#4a2a0a" flatShading />
    </mesh>
    <pointLight position={[0.8, 2, -0.6]} color="#ff6b35" intensity={0.5} distance={6} />
  </group>
));

export default LowPolyForge;
