import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import MeshyModel from './MeshyModel';
import { MESHY_LANTERN } from '../constants';

// Meshy skull lantern + emissive dot + point light. Model ships with a lit
// lamp; we add the emissive sphere + pointLight at the top of the post
// where the lamp sits. Slow breathing pulse on intensity + scale.
const SkullLantern = React.memo(function SkullLantern({ position, rotation = [0, 0, 0], scale = 1.2 }) {
  const lightRef = useRef();
  const glowRef = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 1.2 + position[0] * 0.5) * 0.04
                    + Math.sin(t * 0.7 + position[2] * 0.3) * 0.02;
    if (lightRef.current) lightRef.current.intensity = 7 * pulse;
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + (pulse - 1) * 0.5);
    }
  });

  // Lamp head sits at the top of the post and hangs forward. MeshyModel
  // already adds (halfHeight * scale) to Y to place the base on the ground;
  // we only need the lamp offset from the post pivot.
  const lampPos = [0, 1.18 * scale, 0.25 * scale];

  return (
    <group position={position} rotation={rotation}>
      <MeshyModel path={MESHY_LANTERN} position={[0, 0, 0]} scale={scale} />
      <mesh ref={glowRef} position={lampPos}>
        <sphereGeometry args={[0.09 * scale, 8, 6]} />
        <meshBasicMaterial color="#ffd080" transparent opacity={0.95} />
      </mesh>
      <pointLight
        ref={lightRef}
        position={lampPos}
        color="#ffb060"
        intensity={7}
        distance={22}
        decay={0.8}
        castShadow={false}
      />
    </group>
  );
});

export default SkullLantern;
