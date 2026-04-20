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
  // Earth base that sits a hair below the textured plane — at night it
  // stays dark (barely visible), during the day it's a warm dirt brown
  // that bleeds through the semi-transparent albedo to break up the
  // texture repeat and give the plaza a trodden-earth feel.
  const earthColor = isDay ? '#6a4e2e' : '#2a231b';
  // Daytime: drop the textured plane's opacity so the brown earth
  // underneath shows through at ~35%. Night keeps the texture opaque
  // since the dark tint already buries the repeat pattern.
  const dayTextureOpacity = isDay ? 0.65 : 1;

  return (
    <group>
      {/* Earth base — no texture, solid color. Slightly lower Y so the
          textured plane above masks most of it but it bleeds through
          the alpha gaps / low-opacity portions during the day. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[35, 64]} />
        <meshStandardMaterial color={earthColor} roughness={1} metalness={0} />
      </mesh>
      {/* Textured albedo plane — full opacity at night (grid reads as
          stone/snow-ish), semi-transparent during the day so the brown
          earth below reads as "trodden dirt under scattered grass". */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[35, 64]} />
        <meshStandardMaterial
          map={albedo}
          color={groundTint}
          roughness={1}
          metalness={0}
          transparent={isDay}
          opacity={dayTextureOpacity}
        />
      </mesh>
    </group>
  );
});

export default GroundPlane;
