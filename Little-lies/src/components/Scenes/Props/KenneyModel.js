import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { fixMaterial } from '../utils';

// Generic GLB renderer — clones the scene (so multiple instances don't
// share mutable three.js state) and strips emissive/specular on every mesh
// material so the GLB integrates with the scene tonemap.
const KenneyModel = React.memo(({ path, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) => {
  const { scene } = useGLTF(path);
  const clone = useMemo(() => {
    const c = scene.clone();
    c.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (Array.isArray(child.material)) {
          child.material = child.material.map(fixMaterial);
        } else {
          child.material = fixMaterial(child.material);
        }
      }
    });
    return c;
  }, [scene]);
  return (
    <primitive
      object={clone}
      position={position}
      rotation={rotation}
      scale={typeof scale === 'number' ? [scale, scale, scale] : scale}
    />
  );
});

export default KenneyModel;
