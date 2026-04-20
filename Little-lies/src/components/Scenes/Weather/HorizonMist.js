import React, { useMemo } from 'react';
import { Clouds, Cloud } from '@react-three/drei';
import * as THREE from 'three';

// Permanent horizon haze — a wide, elevated ring of soft cloud puffs
// sitting BETWEEN the near and far mountain rings. Its job is to wash
// out the far-ring silhouettes so the backdrop reads as "mountains fading
// into fog" instead of "a visible edge to the scene".
//
// Distinct from VillageFogWall (which is close + thick, gated on weather).
// This one is always on, further out, thinner, and color-matched to the
// sky tint of the current phase so it blends with the horizon rather than
// looking like a wall.
const HorizonMist = React.memo(function HorizonMist({ isDay = true }) {
  const color = isDay ? '#c4ccd8' : '#1a1e2c';
  const opacity = isDay ? 0.72 : 0.85;

  const clouds = useMemo(() => {
    const arr = [];
    let s = 3131;
    const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    // Inner mist layer — sits BEHIND MOUNTAINS_NEAR (which ring the
    // village at ~48m). Radius 68 + tight bounds so the puff body never
    // reaches the village (~17m out). Previous config had radius 55 with
    // bounds up to 28 and fade 80 → the nearest puff edge could creep to
    // ~19m, which landed as visible fog over the plaza from high orbit
    // cameras. Bumped out and shrunk.
    for (let i = 0; i < 22; i++) {
      const angle = (i / 22) * Math.PI * 2 + rand() * 0.12;
      const radius = 68 + rand() * 6;
      arr.push({
        position: [Math.cos(angle) * radius, 7 + rand() * 3, Math.sin(angle) * radius],
        seed: i * 11 + 500,
        bounds: [14 + rand() * 4, 6 + rand() * 2, 14 + rand() * 4],
        volume: 12 + rand() * 4,
        rotation: [0, angle, 0],
      });
    }
    // Outer mist layer — radius ~100, taller puffs, swallows most of
    // MOUNTAINS_FAR so the horizon looks like it recedes into haze.
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2 + rand() * 0.18;
      const radius = 100 + rand() * 8;
      arr.push({
        position: [Math.cos(angle) * radius, 11 + rand() * 5, Math.sin(angle) * radius],
        seed: i * 19 + 900,
        bounds: [22 + rand() * 6, 10 + rand() * 3, 22 + rand() * 6],
        volume: 18 + rand() * 5,
        rotation: [0, angle + 0.5, 0],
      });
    }
    return arr;
  }, []);

  return (
    <Clouds material={THREE.MeshBasicMaterial} limit={60} texture="/cloud.png">
      {clouds.map((c, i) => (
        <Cloud
          key={`horizon-mist-${i}`}
          position={c.position}
          rotation={c.rotation}
          seed={c.seed}
          segments={28}
          bounds={c.bounds}
          volume={c.volume}
          smallestVolume={0.4}
          concentrate="inside"
          growth={4}
          color={color}
          opacity={opacity}
          speed={0.015}
          fade={30}
        />
      ))}
    </Clouds>
  );
});

export default HorizonMist;
