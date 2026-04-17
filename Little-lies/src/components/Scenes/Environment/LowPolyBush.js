import React from 'react';

const LowPolyBush = React.memo(({ position, scale = 1, variant = 0 }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 0.2, 0]} castShadow>
      <dodecahedronGeometry args={[0.35, 1]} />
      <meshStandardMaterial color={variant % 2 === 0 ? '#4CAF50' : '#3d9142'} roughness={0.9} flatShading />
    </mesh>
    <mesh position={[0.25, 0.15, 0.15]} castShadow>
      <dodecahedronGeometry args={[0.25, 1]} />
      <meshStandardMaterial color="#5BBF5E" roughness={0.9} flatShading />
    </mesh>
  </group>
));

export default LowPolyBush;
