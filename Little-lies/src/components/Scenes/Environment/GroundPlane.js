import React, { useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';
import { GROUND_TEX_PATHS } from '../constants';

// Main terrain — a flat tone first, a texture second.
//
// The albedo used to run at repeat(4,4) across a 70-unit circle, which
// put high-frequency photo detail under every camera angle. On a
// stylised scene that detail doesn't add richness, it adds noise: the
// ground competed for attention with the props and the characters
// standing on it, and nothing in frame held a clean silhouette.
//
// Now the texture is a MOTTLE, not a surface: stretched wide (repeat 1.5)
// and dropped to ~20% so it only breaks up the flat colour at large
// scale. The base tone below carries the actual look. Normal & roughness
// maps stay dropped — they produced specular aliasing at grazing angles.
const GroundPlane = React.memo(function GroundPlane({ isDay }) {
  const albedo = useLoader(TextureLoader, GROUND_TEX_PATHS[0]);

  useMemo(() => {
    if (!albedo) return;
    albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping;
    // 1.5 repeats across the 70-unit circle → each tile spans ~47 units.
    // Features are far too large to read as texture; they read as terrain
    // variation, which is the whole point.
    albedo.repeat.set(1.5, 1.5);
    albedo.anisotropy = 16;
    albedo.colorSpace = THREE.SRGBColorSpace;
    albedo.minFilter = THREE.LinearMipmapLinearFilter;
    albedo.magFilter = THREE.LinearFilter;
    albedo.generateMipmaps = true;
  }, [albedo]);

  // The base tone is now the ground. Day sits a clear step BELOW the
  // plaza floor (#c9c3b0) so the play area reads as lifted out of the
  // surrounding terrain; night sits a step below its plaza counterpart
  // for the same reason. Both are desaturated on purpose — the colour
  // in frame belongs to the characters and the ritual altar.
  const baseColor = isDay ? '#a8a698' : '#23242c';
  const textureOpacity = isDay ? 0.22 : 0.16;

  return (
    <group>
      {/* Flat base — this is what the player actually sees. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[35, 64]} />
        <meshStandardMaterial color={baseColor} roughness={1} metalness={0} />
      </mesh>
      {/* Large-scale mottling on top, barely there. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[35, 64]} />
        <meshStandardMaterial
          map={albedo}
          color={isDay ? '#b9b5ad' : '#30302a'}
          roughness={1}
          metalness={0}
          transparent
          opacity={textureOpacity}
        />
      </mesh>
    </group>
  );
});

export default GroundPlane;
