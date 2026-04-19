import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Crow scatter timed on EXECUTION entry: five birds burst upward + outward
// from above the gallows as the noose snaps. Meant to read as "the
// violence startles every living thing off the roof" — small but it makes
// the execution moment feel heavier than just a red flash.
//
// Lifecycle: component is mounted for the duration of the EXECUTION
// phase (3s). The useFrame runs for that whole time but the motion
// completes in ~1.2s, then the birds fade out naturally by flying past
// the camera's reach.
const CROW_COUNT = 5;

const ExecutionCrows = ({ origin = [7, 3.5, -6] }) => {
  const meshRef = useRef();
  const timeRef = useRef(0);

  const crows = useMemo(() => Array.from({ length: CROW_COUNT }, (_, i) => {
    // Spread exit directions around the upper hemisphere so they don't
    // all fly the same way. Azimuth evenly spaced, altitude slightly
    // upward biased.
    const az = (i / CROW_COUNT) * Math.PI * 2 + (i * 0.37);
    const alt = 0.35 + (i % 3) * 0.15;
    return {
      dirX: Math.cos(az) * Math.cos(alt),
      dirY: Math.sin(alt) + 0.4,
      dirZ: Math.sin(az) * Math.cos(alt),
      speed: 7 + (i % 3) * 1.8,
      wingPhase: i * 1.3,
      delay: i * 0.05, // tiny stagger so they don't all snap at once
    };
  }), []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (!meshRef.current) return;
    const t = timeRef.current;

    crows.forEach((c, i) => {
      const localT = Math.max(t - c.delay, 0);
      // Gravity-light arc: position = origin + dir * speed * t + tiny
      // gravity drop on Y so they feel less than perfectly straight.
      const dist = localT * c.speed;
      const gravDrop = 0.15 * localT * localT;
      dummy.position.set(
        origin[0] + c.dirX * dist,
        origin[1] + c.dirY * dist - gravDrop,
        origin[2] + c.dirZ * dist,
      );
      // Face flight direction
      const yaw = Math.atan2(c.dirX, c.dirZ);
      dummy.rotation.set(
        0,
        yaw,
        Math.sin(localT * 18 + c.wingPhase) * 0.3,
      );
      // Wing flap via scale.y pulse
      const flap = 0.3 + Math.abs(Math.sin(localT * 18 + c.wingPhase)) * 0.8;
      dummy.scale.set(1.0, flap, 1.0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, CROW_COUNT]} frustumCulled={false}>
      <boxGeometry args={[0.7, 0.09, 0.26]} />
      <meshBasicMaterial color="#0f0f18" />
    </instancedMesh>
  );
};

export default ExecutionCrows;
