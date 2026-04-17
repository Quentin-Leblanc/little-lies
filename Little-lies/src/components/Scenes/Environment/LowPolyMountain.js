import React from 'react';

const LowPolyMountain = React.memo(({ position, scale = 1, variant = 0 }) => (
  <group position={position}>
    <mesh position={[0, scale * 2, 0]} castShadow>
      <coneGeometry args={[scale * 3, scale * 4, 5 + variant % 3]} />
      <meshStandardMaterial color={variant % 2 === 0 ? '#7a8a6a' : '#6a7a5a'} flatShading />
    </mesh>
    <mesh position={[0, scale * 3.5, 0]}>
      <coneGeometry args={[scale * 1.2, scale * 1.2, 5 + variant % 3]} />
      <meshStandardMaterial color="#f0f0f0" flatShading />
    </mesh>
    <mesh position={[scale * 1.5, scale * 1.2, scale * 0.5]} castShadow>
      <coneGeometry args={[scale * 1.8, scale * 2.5, 4]} />
      <meshStandardMaterial color={variant % 2 === 0 ? '#6a7a5a' : '#7a8a6a'} flatShading />
    </mesh>
  </group>
));

export default LowPolyMountain;
