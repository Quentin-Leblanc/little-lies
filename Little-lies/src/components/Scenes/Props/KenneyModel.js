import React, { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import { fixMaterial } from '../utils';

// Optional per-model color punch-up. Some GLBs (blood altar, gallows
// podium) ship intentionally muted; after `fixMaterial` strips the
// emissive/specular baked into the source they read as flat grey
// under the tonemap. Callers can opt into a saturation/contrast bump
// so the prop reads as a focal landmark instead of melting into the
// plaza ground.
const applyColorBoost = (mat, saturate, contrast) => {
  if (!mat || !mat.color) return;
  if (saturate === 1 && contrast === 1) return;
  const hsl = { h: 0, s: 0, l: 0 };
  mat.color.getHSL(hsl);
  if (saturate !== 1) hsl.s = Math.max(0, Math.min(1, hsl.s * saturate));
  if (contrast !== 1) {
    hsl.l = Math.max(0, Math.min(1, (hsl.l - 0.5) * contrast + 0.5));
  }
  mat.color.setHSL(hsl.h, hsl.s, hsl.l);
};

// Generic GLB renderer — clones the scene (so multiple instances don't
// share mutable three.js state) and strips emissive/specular on every mesh
// material so the GLB integrates with the scene tonemap. Optional
// `saturate` / `contrast` multipliers nudge material colours in HSL
// space after sanitation, for landmark props that need extra punch.
const KenneyModel = React.memo(({ path, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, saturate = 1, contrast = 1 }) => {
  const { scene } = useGLTF(path);
  const clone = useMemo(() => {
    const c = scene.clone();
    c.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (Array.isArray(child.material)) {
          child.material = child.material.map((m) => {
            const fm = fixMaterial(m);
            applyColorBoost(fm, saturate, contrast);
            return fm;
          });
        } else {
          const fm = fixMaterial(child.material);
          applyColorBoost(fm, saturate, contrast);
          child.material = fm;
        }
      }
    });
    return c;
  }, [scene, saturate, contrast]);
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
