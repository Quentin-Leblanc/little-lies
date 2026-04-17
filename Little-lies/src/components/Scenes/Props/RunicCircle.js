import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { MESHY_RUNIC } from '../constants';

// Flat disc at village center. Pivot of the GLB is at the mesh centroid,
// so we compute the bbox and shift the inner object up by -min.y so the
// bottom sits exactly at local y = 0. The outer group places it just
// above the ground plane to avoid z-fighting, and a white backdrop disc
// hides the grass underneath (the runic pattern itself is transparent).
const RunicCircle = ({ position = [0, 0, 0], scale = 5.8 }) => {
  const { scene } = useGLTF(MESHY_RUNIC);
  const { clone, discRadius } = useMemo(() => {
    const c = scene.clone();
    c.traverse((child) => {
      if (child.isMesh) {
        child.receiveShadow = true;
        child.castShadow = false;
        if (child.material) {
          const m = child.material.clone ? child.material.clone() : child.material;
          // The GLB ships with metallic=1 + a metallicRoughnessTexture — in a
          // dark scene, a pure metal surface with nothing to reflect renders
          // black. Force fully diffuse so the baseColorTexture shows up.
          if (m.metalness !== undefined) m.metalness = 0;
          if (m.roughness !== undefined) m.roughness = 1;
          m.metalnessMap = null;
          m.roughnessMap = null;
          if (m.envMapIntensity !== undefined) m.envMapIntensity = 0;
          if (m.emissive) m.emissive.set(0, 0, 0);
          m.emissiveIntensity = 0;
          m.emissiveMap = null;
          if (m.specularIntensity !== undefined) m.specularIntensity = 0;
          if (m.specularColor) m.specularColor.set(0, 0, 0);
          m.toneMapped = true;
          m.needsUpdate = true;
          child.material = m;
        }
      }
    });
    const bbox = new THREE.Box3().setFromObject(c);
    c.position.y = -bbox.min.y;
    const r = Math.max(
      Math.abs(bbox.min.x), Math.abs(bbox.max.x),
      Math.abs(bbox.min.z), Math.abs(bbox.max.z),
    );
    return { clone: c, discRadius: r };
  }, [scene]);

  return (
    <group position={[position[0], position[1] - 0.16, position[2]]} scale={scale}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
        <circleGeometry args={[discRadius, 64]} />
        <meshStandardMaterial color="#ffffff" roughness={1} metalness={0} />
      </mesh>
      <primitive object={clone} />
    </group>
  );
};

export default RunicCircle;
