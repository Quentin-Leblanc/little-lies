import React from 'react';

const LowPolyCrates = React.memo(({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 0.3, 0]} rotation={[0, 0.3, 0]} castShadow>
      <boxGeometry args={[0.6, 0.6, 0.6]} />
      <meshStandardMaterial color="#7a5a2a" roughness={0.9} />
    </mesh>
    <mesh position={[0.05, 0.75, 0.05]} rotation={[0, 0.8, 0]} castShadow>
      <boxGeometry args={[0.4, 0.3, 0.4]} />
      <meshStandardMaterial color="#8a6a3a" roughness={0.9} />
    </mesh>
    <mesh position={[0.5, 0.35, 0.2]} castShadow>
      <cylinderGeometry args={[0.22, 0.2, 0.7, 8]} />
      <meshStandardMaterial color="#5a3a1a" roughness={0.85} />
    </mesh>
    <mesh position={[0.5, 0.2, 0.2]}>
      <torusGeometry args={[0.21, 0.015, 4, 8]} />
      <meshStandardMaterial color="#3a3a3a" metalness={0.4} />
    </mesh>
    <mesh position={[0.5, 0.5, 0.2]}>
      <torusGeometry args={[0.21, 0.015, 4, 8]} />
      <meshStandardMaterial color="#3a3a3a" metalness={0.4} />
    </mesh>
  </group>
));

export default LowPolyCrates;
