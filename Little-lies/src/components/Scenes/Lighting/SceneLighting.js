import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Warm sunlight (day) / cold moonlight (night) with smooth transitions
// and a dedicated sunset animation — sun drops to horizon, color shifts
// warm → orange → red, fill tinted, ambient dimmed. All interp happens
// on refs so React never re-renders during the cinematic.
const SceneLighting = ({ isDay, isSunset = false }) => {
  const sunRef = useRef();
  const sunGlowRef = useRef();
  const fillRef = useRef();
  const ambientRef = useRef();
  const sunsetProgress = useRef(0);
  const sunColorRef = useRef(new THREE.Color('#fff5e0'));

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    if (isSunset) {
      sunsetProgress.current = Math.min(sunsetProgress.current + delta * 0.35, 1);
    } else if (isDay) {
      sunsetProgress.current = 0;
    }

    const sp = sunsetProgress.current;
    const sunsetEased = sp * sp; // ease-in for dramatic end

    if (isDay && sunRef.current) {
      const sunAngle = -Math.PI * 0.8 + t * 0.02;
      const baseSunX = Math.cos(sunAngle) * 20;
      const baseSunY = 18 + Math.sin(sunAngle * 0.5) * 6;
      const baseSunZ = -Math.sin(sunAngle) * 20;

      const sunX = baseSunX + sunsetEased * 15;
      const sunY = baseSunY * (1 - sunsetEased * 0.85);
      const sunZ = baseSunZ;
      sunRef.current.position.set(sunX, Math.max(sunY, 1), sunZ);

      const dayColor = new THREE.Color('#fff5e0');
      const sunsetColor = new THREE.Color('#ff4400');
      sunColorRef.current.copy(dayColor).lerp(sunsetColor, sunsetEased);
      sunRef.current.color.copy(sunColorRef.current);

      const intensityTarget = 3.0 * (1 - sunsetEased * 0.7);
      sunRef.current.intensity += (intensityTarget - sunRef.current.intensity) * 0.08;

      if (sunGlowRef.current) {
        sunGlowRef.current.position.set(sunX * 2.5, Math.max(sunY, 1) * 2.5, sunZ * 2.5);
        sunGlowRef.current.children.forEach((child) => {
          if (child.material) {
            child.material.color.copy(sunColorRef.current);
          }
        });
      }
    }

    if (!isSunset) {
      if (sunRef.current) {
        const target = isDay ? 3.0 : 0.2;
        sunRef.current.intensity += (target - sunRef.current.intensity) * 0.03;
      }
    }
    if (fillRef.current) {
      const target = isDay ? (1.0 - sunsetEased * 0.6) : 0.05;
      fillRef.current.intensity += (target - fillRef.current.intensity) * 0.05;
      if (isSunset) fillRef.current.color.set(sunsetEased > 0.3 ? '#ff8855' : '#ffd4a0');
    }
    if (ambientRef.current) {
      const target = isDay ? (0.85 - sunsetEased * 0.35) : 0.12;
      ambientRef.current.intensity += (target - ambientRef.current.intensity) * 0.05;
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={isDay ? 0.7 : 0.12} />

      <directionalLight
        ref={sunRef}
        position={isDay ? [15, 20, 10] : [-5, 12, 8]}
        intensity={isDay ? 1.55 : 0.18}
        color={isDay ? '#ffe8c8' : '#6677aa'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={60}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-bias={-0.0005}
        shadow-radius={6}
        shadow-normalBias={0.02}
      />

      <directionalLight
        ref={fillRef}
        position={isDay ? [-10, 8, -5] : [5, 6, -8]}
        intensity={isDay ? 0.8 : 0.07}
        color={isDay ? '#ddc8a0' : '#334466'}
      />

      <hemisphereLight
        color={isDay ? '#8ab4cc' : '#1a1a3a'}
        groundColor={isDay ? '#8B7355' : '#0a0a15'}
        intensity={isDay ? 0.45 : 0.07}
      />

      {isDay && (
        <group ref={sunGlowRef} position={[40, 50, 25]}>
          <pointLight color="#fff0cc" intensity={0.5} distance={120} />
          <mesh>
            <sphereGeometry args={[3, 16, 16]} />
            <meshBasicMaterial color="#fffae0" />
          </mesh>
          <mesh>
            <sphereGeometry args={[5, 16, 16]} />
            <meshBasicMaterial color="#fff5cc" transparent opacity={0.15} />
          </mesh>
        </group>
      )}
    </>
  );
};

export default SceneLighting;
