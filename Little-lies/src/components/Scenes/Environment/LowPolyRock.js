import React from 'react';

const LowPolyRock = React.memo(({ position, scale = 1, variant = 0 }) => (
  <mesh
    position={[position[0], position[1] + scale * 0.15, position[2]]}
    rotation={[variant * 0.3, variant * 1.1, variant * 0.2]}
    scale={[scale, scale * 0.6, scale * 0.9]}
    castShadow
  >
    <dodecahedronGeometry args={[0.35, 0]} />
    <meshStandardMaterial color={variant % 2 === 0 ? '#9a9585' : '#a8a090'} roughness={0.95} flatShading />
  </mesh>
));

export default LowPolyRock;
