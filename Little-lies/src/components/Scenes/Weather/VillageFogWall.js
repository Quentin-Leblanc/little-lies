import React, { useMemo } from 'react';
import { Clouds, Cloud } from '@react-three/drei';
import * as THREE from 'three';

// Thick fog wall encircling the village — hides empty sky/mountains from
// low camera angles (trial/defense). Dense ring at radius 18-28 with
// multiple layers so it reads as an impenetrable wall of mist.
const VillageFogWall = React.memo(function VillageFogWall({ isDay = true }) {
  const color = isDay ? '#c8d4e0' : '#0a0e1c';

  const clouds = useMemo(() => {
    const arr = [];
    let s = 7777;
    const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    // Dense inner ring (radius ~18-22) — main wall
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2 + rand() * 0.15;
      const radius = 18 + rand() * 4;
      arr.push({
        position: [Math.cos(angle) * radius, 1.5 + rand() * 3, Math.sin(angle) * radius],
        seed: i * 13,
        bounds: [10 + rand() * 4, 4 + rand() * 2, 10 + rand() * 4],
        volume: 10 + rand() * 5,
        rotation: [0, angle, 0],
      });
    }
    // Outer ring (radius ~24-30) — depth
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + rand() * 0.2;
      const radius = 24 + rand() * 6;
      arr.push({
        position: [Math.cos(angle) * radius, 2 + rand() * 4, Math.sin(angle) * radius],
        seed: i * 17 + 300,
        bounds: [12 + rand() * 5, 5 + rand() * 3, 12 + rand() * 5],
        volume: 12 + rand() * 6,
        rotation: [0, angle + 0.5, 0],
      });
    }
    return arr;
  }, []);

  return (
    <Clouds material={THREE.MeshBasicMaterial} limit={60}>
      {clouds.map((c, i) => (
        <Cloud
          key={`fogwall-${i}`}
          position={c.position}
          rotation={c.rotation}
          seed={c.seed}
          segments={32}
          bounds={c.bounds}
          volume={c.volume}
          smallestVolume={0.3}
          concentrate="inside"
          growth={6}
          color={color}
          opacity={isDay ? 0.85 : 0.92}
          speed={0.02}
          fade={50}
        />
      ))}
    </Clouds>
  );
});

export default VillageFogWall;
