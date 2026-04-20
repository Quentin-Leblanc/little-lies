import React, { useMemo } from 'react';

// Distant horizon mountain — richer silhouette than the old single-cone:
// a main peak + 2 side shoulders + a faint forested fringe at the base
// and an occasional snow cap on the highest peaks. Still dark + flat-shaded
// so it reads as a horizon layer, not a detailed prop.
//
// Props:
//   position — world origin of the mountain cluster
//   scale    — uniform scale; larger ≈ further away / more imposing
//   variant  — integer used as a deterministic seed for shape jitter,
//              snow cap presence, and tree fringe count
//   tone     — 'near' | 'mid' | 'far', controls base color (darker = nearer).
//              Fog/atmosphere makes far mountains read as lighter/bluer so
//              the palette deliberately washes out toward the horizon.
const TONE_PALETTE = {
  near: ['#22202a', '#1c1a22'],
  mid:  ['#2e2c3a', '#262432'],
  far:  ['#3a3846', '#322f3e'],
};
const SNOW_COLOR = '#e8ecf2';
const FRINGE_COLOR = '#1b2a1e'; // dark forest green

const DarkMountain = React.memo(({ position, scale = 1, variant = 0, tone = 'near' }) => {
  // Cheap deterministic jitter off the variant integer
  const j = useMemo(() => {
    const s = (variant * 9301 + 49297) % 233280;
    const r1 = (s) / 233280;
    const r2 = ((s * 1103) % 233280) / 233280;
    const r3 = ((s * 2731) % 233280) / 233280;
    const r4 = ((s * 4091) % 233280) / 233280;
    return { r1, r2, r3, r4 };
  }, [variant]);

  const rotY = variant * 0.37;
  const [baseColor, shoulderColor] = TONE_PALETTE[tone] || TONE_PALETTE.near;
  const hasSnow = j.r1 > 0.55 && tone !== 'far'; // far mountains skip the snow detail
  const leftShoulderX  = -1.8 - j.r2 * 0.6;
  const rightShoulderX =  1.6 + j.r3 * 0.6;
  const sideScale = 0.55 + j.r4 * 0.2;

  // Forest fringe at the base — 6 tiny dark-green cones arranged across
  // the front so the mountain reads as "sits behind a forest" instead of
  // rising out of bare ground.
  const fringe = useMemo(() => {
    const arr = [];
    const count = 6;
    for (let i = 0; i < count; i++) {
      const t = (i / (count - 1)) - 0.5; // -0.5 .. 0.5
      arr.push({
        x: t * 5.2,
        z: 1.6 + (i % 2) * 0.4 - j.r1 * 0.3,
        h: 0.9 + ((i * 13) % 5) / 10, // 0.9 .. 1.4
        r: 0.35 + ((i * 7) % 3) / 10, // 0.35 .. 0.55
      });
    }
    return arr;
  }, [j.r1]);

  return (
    <group position={position} rotation={[0, rotY, 0]} scale={scale}>
      {/* Main peak */}
      <mesh castShadow receiveShadow>
        <coneGeometry args={[3.2, 6.2, 7]} />
        <meshStandardMaterial color={baseColor} flatShading roughness={1} />
      </mesh>
      {/* Snow cap on the main peak — only on some mountains */}
      {hasSnow && (
        <mesh position={[0, 2.2, 0]}>
          <coneGeometry args={[1.1, 1.4, 7]} />
          <meshStandardMaterial color={SNOW_COLOR} flatShading roughness={1} />
        </mesh>
      )}
      {/* Right shoulder */}
      <mesh position={[rightShoulderX, -0.9, 0.6]} castShadow>
        <coneGeometry args={[2.0 * sideScale, 4.2, 7]} />
        <meshStandardMaterial color={shoulderColor} flatShading roughness={1} />
      </mesh>
      {/* Left shoulder — lower & slightly darker so the ridgeline isn't symmetric */}
      <mesh position={[leftShoulderX, -1.4, 0.3]} castShadow>
        <coneGeometry args={[1.7 * sideScale, 3.4, 6]} />
        <meshStandardMaterial color={baseColor} flatShading roughness={1} />
      </mesh>
      {/* Forest fringe — tiny dark-green cones at the base */}
      {fringe.map((f, i) => (
        <mesh key={`fringe-${i}`} position={[f.x, -2.6, f.z]}>
          <coneGeometry args={[f.r, f.h, 5]} />
          <meshStandardMaterial color={FRINGE_COLOR} flatShading roughness={1} />
        </mesh>
      ))}
    </group>
  );
});

export default DarkMountain;
