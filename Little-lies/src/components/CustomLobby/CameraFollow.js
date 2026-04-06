import { useFrame } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';

const camDistance = 10;
const camHeight = 5;
const lookHeight = 1.5;

// Horizontal follows fast, vertical follows slower to absorb physics jitter
const lerpSpeedXZ = 12;
const lerpSpeedY = 4;

const CameraFollow = ({ target, rotationRef }) => {
  const posRef = useRef(new THREE.Vector3());
  const smoothY = useRef(0);

  useFrame(({ camera }, delta) => {
    if (!target?.current) return;
    const pos = target.current.translation();
    if (!pos) return;

    const rot = rotationRef?.current ?? 0;

    // Smooth Y separately to absorb vertical physics jitter
    smoothY.current += (pos.y - smoothY.current) * (1 - Math.exp(-lerpSpeedY * delta));

    const offsetX = -Math.sin(rot) * camDistance;
    const offsetZ = -Math.cos(rot) * camDistance;

    const desired = new THREE.Vector3(
      pos.x + offsetX,
      smoothY.current + camHeight,
      pos.z + offsetZ
    );

    const factorXZ = 1 - Math.exp(-lerpSpeedXZ * delta);
    posRef.current.x += (desired.x - posRef.current.x) * factorXZ;
    posRef.current.z += (desired.z - posRef.current.z) * factorXZ;
    posRef.current.y += (desired.y - posRef.current.y) * (1 - Math.exp(-lerpSpeedY * delta));

    camera.position.copy(posRef.current);
    camera.lookAt(pos.x, smoothY.current + lookHeight, pos.z);
  });

  return null;
};

export default CameraFollow;
