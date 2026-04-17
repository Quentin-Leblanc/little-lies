import React, { useMemo } from 'react';
import { Clouds, Cloud } from '@react-three/drei';
import * as THREE from 'three';
import MistSlab from '../Atmosphere/MistSlab';

// Stacked diffuse mist slabs at different heights & speeds create a
// layered drifting volume — softer and more organic than billboard quads.
// The far ring of drei clouds adds distance-mist at the horizon.
const GroundFog = React.memo(function GroundFog({ isDay = true }) {
  const color = isDay ? '#d8e4ee' : '#0e1424';
  const dense = isDay ? 0.38 : 0.55;

  const farClouds = useMemo(() => {
    const arr = [];
    let s = 4242;
    const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const count = isDay ? 10 : 14;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rand() * 0.3;
      const radius = 28 + rand() * 6;
      arr.push({
        position: [Math.cos(angle) * radius, 1 + rand() * 2, Math.sin(angle) * radius],
        seed: i * 7 + 100,
        bounds: [8 + rand() * 4, 1 + rand() * 0.5, 8 + rand() * 4],
        volume: 7 + rand() * 3,
        rotation: [0, angle, 0],
      });
    }
    return arr;
  }, [isDay]);

  const farOpacity = isDay ? 0.75 : 0.85;

  return (
    <>
      {/* In-village drifting mist slabs, hugging the ground */}
      <MistSlab y={0.15} scale={1.0} speed={0.025} density={dense * 0.9} color={color} seed={0.1} />
      <MistSlab y={0.45} scale={1.1} speed={0.018} density={dense * 0.7} color={color} seed={0.6} />
      <MistSlab y={0.85} scale={1.2} speed={0.012} density={dense * 0.45} color={color} seed={1.3} />

      {/* Far horizon mist ring (drei volumetric clouds) */}
      <Clouds material={THREE.MeshBasicMaterial} limit={40}>
        {farClouds.map((c, i) => (
          <Cloud
            key={`far-${i}`}
            position={c.position}
            rotation={c.rotation}
            seed={c.seed}
            segments={28}
            bounds={c.bounds}
            volume={c.volume}
            smallestVolume={0.4}
            concentrate="outside"
            growth={4}
            color={color}
            opacity={farOpacity}
            speed={0.05}
            fade={40}
          />
        ))}
      </Clouds>
    </>
  );
});

export default GroundFog;
