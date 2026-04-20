import React, { useMemo } from 'react';

// Procedural dark-green fir — single cone + thin trunk. Cheap enough to
// scatter 40+ around the mid-ground without any GLB load. Variant seeds
// per-tree shape jitter so the ring doesn't look stamped.
const TRUNK_COLOR = '#3a2a1e';
const TOP_DAY = '#223a28';
const TOP_NIGHT = '#101a13';

const DistantTree = React.memo(({ position, scale = 1, variant = 0, isDay = true }) => {
  const j = useMemo(() => {
    const s = (variant * 9301 + 49297) % 233280;
    const r1 = s / 233280;
    const r2 = ((s * 1103) % 233280) / 233280;
    return { r1, r2 };
  }, [variant]);

  const rotY = variant * 1.13;
  const h = 2.4 + j.r1 * 1.2;   // 2.4 .. 3.6
  const r = 0.7 + j.r2 * 0.3;   // 0.7 .. 1.0
  const topColor = isDay ? TOP_DAY : TOP_NIGHT;

  return (
    <group position={position} rotation={[0, rotY, 0]} scale={scale}>
      {/* Trunk — short visible stub at the base */}
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.12, 0.16, 0.8, 5]} />
        <meshStandardMaterial color={TRUNK_COLOR} flatShading roughness={1} />
      </mesh>
      {/* Canopy — single tapered cone */}
      <mesh position={[0, 0.8 + h / 2, 0]}>
        <coneGeometry args={[r, h, 6]} />
        <meshStandardMaterial color={topColor} flatShading roughness={1} />
      </mesh>
      {/* Thicker lower tier — gives the silhouette a fir-tree stepped shape */}
      <mesh position={[0, 0.6, 0]}>
        <coneGeometry args={[r * 1.25, h * 0.55, 6]} />
        <meshStandardMaterial color={topColor} flatShading roughness={1} />
      </mesh>
    </group>
  );
});

export default DistantTree;
