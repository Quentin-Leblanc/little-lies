import React, { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { GROUND_TEX_PATHS } from '../constants';

// Main terrain — Poly Haven albedo only, fully matte. Normal & roughness
// maps were dropped because they produced specular aliasing ("sparkle
// pixels") at grazing angles under the directional light, clashing with
// the stylised look.
const GroundPlane = React.memo(function GroundPlane({ isDay }) {
  const albedo = useLoader(TextureLoader, GROUND_TEX_PATHS[0]);

  useMemo(() => {
    if (!albedo) return;
    albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping;
    // 4 full repeats across the 70-unit ground circle → each tile covers
    // ~17 units, texture features stay readable from camera height without
    // looking busy.
    albedo.repeat.set(4, 4);
    albedo.anisotropy = 16;
    albedo.colorSpace = THREE.SRGBColorSpace;
    albedo.minFilter = THREE.LinearMipmapLinearFilter;
    albedo.magFilter = THREE.LinearFilter;
    albedo.generateMipmaps = true;
  }, [albedo]);

  // Day tint desaturated from #c8c0a8 → #b9b5ad so the ground reads as
  // a cool neutral instead of a warm tan — this lets the newly contrast-
  // punched cottages and the blood altar carry the colour in frame.
  // Night tint unchanged (already near-neutral).
  const groundTint = isDay ? '#b9b5ad' : '#30302a';

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[35, 64]} />
        <meshStandardMaterial
          map={albedo}
          color={groundTint}
          roughness={1}
          metalness={0}
        />
      </mesh>
    </group>
  );
});

export default GroundPlane;
