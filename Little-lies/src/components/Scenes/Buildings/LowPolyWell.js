import React from 'react';

const LowPolyWell = React.memo(({ position = [0, 0, 0], scale = 1 }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[1, 1.1, 1, 8]} />
      <meshStandardMaterial color="#9a8a72" flatShading />
    </mesh>
    <mesh position={[0, 0.95, 0]}>
      <cylinderGeometry args={[0.75, 0.75, 0.15, 8]} />
      <meshStandardMaterial color="#1a2a3a" flatShading />
    </mesh>
    <mesh position={[0, 1.05, 0]} castShadow>
      <torusGeometry args={[0.95, 0.12, 6, 8]} />
      <meshStandardMaterial color="#b0a080" flatShading />
    </mesh>
    <mesh position={[-0.7, 1.8, 0]} castShadow>
      <boxGeometry args={[0.12, 1.6, 0.12]} />
      <meshStandardMaterial color="#6b4226" flatShading />
    </mesh>
    <mesh position={[0.7, 1.8, 0]} castShadow>
      <boxGeometry args={[0.12, 1.6, 0.12]} />
      <meshStandardMaterial color="#6b4226" flatShading />
    </mesh>
    <mesh position={[0, 2.6, 0]} castShadow>
      <boxGeometry args={[1.6, 0.1, 0.14]} />
      <meshStandardMaterial color="#5a3a1a" flatShading />
    </mesh>
    <mesh position={[0, 2.85, 0]} castShadow>
      <coneGeometry args={[0.9, 0.5, 4]} />
      <meshStandardMaterial color="#8B4513" flatShading />
    </mesh>
    <mesh position={[0, 2.3, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.06, 0.06, 1.2, 6]} />
      <meshStandardMaterial color="#6b4226" flatShading />
    </mesh>
    <mesh position={[0, 1.6, 0]}>
      <cylinderGeometry args={[0.015, 0.015, 1.3, 4]} />
      <meshStandardMaterial color="#8a7a5a" flatShading />
    </mesh>
    <mesh position={[0, 0.9, 0]} castShadow>
      <cylinderGeometry args={[0.12, 0.15, 0.25, 6]} />
      <meshStandardMaterial color="#5a3a1a" flatShading />
    </mesh>
  </group>
));

export default LowPolyWell;
