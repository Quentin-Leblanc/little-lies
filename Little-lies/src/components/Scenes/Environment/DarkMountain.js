import React from 'react';

// Distant mountain silhouette — reads as a dark shadow on the horizon
// rather than a detailed peak. The earlier 3-cone stack (main + top
// tier + side shoulder, with a lighter top) looked like tiered fir
// trees from the low day-orbit cameras. Now a single broad cone +
// small secondary ridge, uniform dark tones, 7 sides for a softer
// silhouette edge. Variant rotation alone gives enough variety across
// the 16 mountains on the horizon.
const DarkMountain = React.memo(({ position, scale = 1, variant = 0 }) => {
  const rotY = variant * 0.37;
  // Tiny per-variant shape offset so mountains read as a ridgeline
  // instead of a ring of identical cones.
  const sideOffsetX = 1.5 + (variant % 3) * 0.35;
  const sideScale = 0.55 + (variant % 4) * 0.08;
  return (
    <group position={position} rotation={[0, rotY, 0]} scale={scale}>
      <mesh castShadow receiveShadow>
        <coneGeometry args={[3.2, 6.2, 7]} />
        <meshStandardMaterial color="#22202a" flatShading roughness={1} />
      </mesh>
      <mesh position={[sideOffsetX, -0.9, 0.6]} castShadow>
        <coneGeometry args={[2.0 * sideScale, 4.2, 7]} />
        <meshStandardMaterial color="#1c1a22" flatShading roughness={1} />
      </mesh>
    </group>
  );
});

export default DarkMountain;
