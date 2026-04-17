import React from 'react';

const LowPolyHayBale = React.memo(({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <mesh
    position={[position[0], position[1] + 0.25 * scale, position[2]]}
    rotation={rotation}
    scale={scale}
    castShadow
  >
    <cylinderGeometry args={[0.3, 0.3, 0.4, 8]} />
    <meshStandardMaterial color="#c4a44a" roughness={1} />
  </mesh>
));

export default LowPolyHayBale;
