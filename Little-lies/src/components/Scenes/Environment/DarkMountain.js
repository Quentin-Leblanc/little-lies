import React from 'react';

// Two stacked cones, weathered dark tones — paired with the dark theme.
const DarkMountain = React.memo(({ position, scale = 1, variant = 0 }) => {
  const rotY = variant * 0.37;
  return (
    <group position={position} rotation={[0, rotY, 0]} scale={scale}>
      <mesh castShadow receiveShadow>
        <coneGeometry args={[3, 5.5, 5]} />
        <meshStandardMaterial color="#2a2630" flatShading roughness={1} />
      </mesh>
      <mesh position={[0, 2.2, 0]} castShadow>
        <coneGeometry args={[1.4, 1.6, 5]} />
        <meshStandardMaterial color="#3d3a44" flatShading roughness={1} />
      </mesh>
      <mesh position={[1.3, -0.5, 0.6]} castShadow>
        <coneGeometry args={[1.6, 3.5, 5]} />
        <meshStandardMaterial color="#23202a" flatShading roughness={1} />
      </mesh>
    </group>
  );
});

export default DarkMountain;
