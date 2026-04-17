import React from 'react';

const LowPolyTree = React.memo(({ position, scale = 1, variant = 0 }) => (
  <group position={position} scale={scale} rotation={[0, variant * 1.3, 0]}>
    <mesh position={[0, 0.6, 0]} castShadow>
      <cylinderGeometry args={[0.06, 0.1, 1.2, 5]} />
      <meshStandardMaterial color="#8B6914" flatShading />
    </mesh>
    <mesh position={[0, 1.5, 0]} castShadow>
      <coneGeometry args={[0.9, 1.6, 6]} />
      <meshStandardMaterial color={variant % 2 === 0 ? '#4CAF50' : '#3d9142'} flatShading />
    </mesh>
    <mesh position={[0, 2.1, 0]} castShadow>
      <coneGeometry args={[0.65, 1.2, 6]} />
      <meshStandardMaterial color={variant % 2 === 0 ? '#5BBF5E' : '#4CAF50'} flatShading />
    </mesh>
    <mesh position={[0, 2.5, 0]} castShadow>
      <coneGeometry args={[0.4, 0.9, 5]} />
      <meshStandardMaterial color="#66CC66" flatShading />
    </mesh>
  </group>
));

export default LowPolyTree;
