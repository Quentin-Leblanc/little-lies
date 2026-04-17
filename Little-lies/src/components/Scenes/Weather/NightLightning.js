import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

// Random bright light bursts — a directional light pulsing at the scene.
// Scheduling via refs (not state) so it never re-renders React; the
// setTimeout chain draws the double-flash.
const NightLightning = () => {
  const lightRef = useRef();
  const nextFlash = useRef(3 + Math.random() * 8);
  const flashTimer = useRef(0);

  useFrame((_, delta) => {
    if (!lightRef.current) return;
    flashTimer.current += delta;
    if (flashTimer.current >= nextFlash.current) {
      lightRef.current.intensity = 8 + Math.random() * 6;
      setTimeout(() => {
        if (lightRef.current) lightRef.current.intensity = 0;
      }, 80 + Math.random() * 60);
      if (Math.random() > 0.5) {
        setTimeout(() => {
          if (lightRef.current) lightRef.current.intensity = 5 + Math.random() * 4;
          setTimeout(() => {
            if (lightRef.current) lightRef.current.intensity = 0;
          }, 50);
        }, 200);
      }
      flashTimer.current = 0;
      nextFlash.current = 5 + Math.random() * 12;
    }
  });

  return (
    <directionalLight
      ref={lightRef}
      position={[10, 30, -10]}
      intensity={0}
      color="#ccddff"
    />
  );
};

export default NightLightning;
