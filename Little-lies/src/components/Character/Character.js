import { useAnimations, useGLTF } from '@react-three/drei';
import React, { useEffect, useMemo, useRef } from 'react';
import { Color, LoopOnce } from 'three';
import { SkeletonUtils } from 'three-stdlib';

// ============================================================
// Skin keys
// ============================================================
export const SKIN_KEYS = ['villager', 'wanderer'];

// Deterministic skin pick from player ID — stable across renders & sessions.
// Used as the fallback when a player hasn't explicitly picked a model
// from the lobby selector.
export function skinForPlayer(playerId) {
  if (!playerId) return SKIN_KEYS[0];
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = ((hash << 5) - hash + playerId.charCodeAt(i)) | 0;
  }
  return SKIN_KEYS[Math.abs(hash) % SKIN_KEYS.length];
}

// Resolve the actual skin for a given player object. Honors the lobby
// selector's `profile.skin` pick first, then falls back to the stable
// deterministic hash so players who never touch the selector keep the
// look they've always had. Accepts both playroom players
// (`player.getState().profile`) and game-state player objects
// (`player.profile`) — the shape is inspected lazily.
export function resolvePlayerSkin(player) {
  if (!player) return SKIN_KEYS[0];
  const profile = typeof player.getState === 'function'
    ? player.getState?.()?.profile
    : player.profile;
  const picked = profile?.skin;
  if (picked && SKIN_KEYS.includes(picked)) return picked;
  return skinForPlayer(player.id);
}

// Preload all GLBs
const VILLAGER_PATHS = [
  '/models/Villager_Idle.glb', '/models/Villager_Idle2.glb', '/models/Villager_Idle3.glb',
  '/models/Villager_Idle4.glb', '/models/Villager_Idle5.glb', '/models/Villager_Idle6.glb',
  '/models/Villager_Dead.glb', '/models/Villager_DeadPose.glb',
  '/models/Villager_Walk.glb', '/models/Villager_Run.glb', '/models/Villager_Jump.glb',
  '/models/Villager_SitCross.glb', '/models/Villager_LieDown.glb',
  '/models/Villager_Dance1.glb', '/models/Villager_Dance2.glb', '/models/Villager_Dance3.glb',
];
const WANDERER_PATHS = [
  '/models/Wanderer_Idle.glb', '/models/Wanderer_Idle2.glb', '/models/Wanderer_Idle3.glb',
  '/models/Wanderer_Dead.glb',
  '/models/Wanderer_Walk.glb', '/models/Wanderer_Run.glb',
  '/models/Wanderer_SitCross.glb', '/models/Wanderer_LieDown.glb',
  '/models/Wanderer_Dance1.glb', '/models/Wanderer_Dance2.glb',
];
VILLAGER_PATHS.forEach((p) => useGLTF.preload(p));
WANDERER_PATHS.forEach((p) => useGLTF.preload(p));

// ============================================================
// Villager Character — original skin
// ============================================================
function VillagerCharacter({ color, animation, animOffset, ...props }) {
  const group = useRef();
  const origMaterials = useRef(new Map());

  const idle = useGLTF('/models/Villager_Idle.glb');
  const idle2 = useGLTF('/models/Villager_Idle2.glb');
  const idle3 = useGLTF('/models/Villager_Idle3.glb');
  const idle4 = useGLTF('/models/Villager_Idle4.glb');
  const idle5 = useGLTF('/models/Villager_Idle5.glb');
  const idle6 = useGLTF('/models/Villager_Idle6.glb');
  const dead = useGLTF('/models/Villager_Dead.glb');
  const deadPose = useGLTF('/models/Villager_DeadPose.glb');
  const walk = useGLTF('/models/Villager_Walk.glb');
  const run = useGLTF('/models/Villager_Run.glb');
  const jump = useGLTF('/models/Villager_Jump.glb');
  const sitCross = useGLTF('/models/Villager_SitCross.glb');
  const lieDown = useGLTF('/models/Villager_LieDown.glb');
  const dance1 = useGLTF('/models/Villager_Dance1.glb');
  const dance2 = useGLTF('/models/Villager_Dance2.glb');
  const dance3 = useGLTF('/models/Villager_Dance3.glb');

  const clone = useMemo(() => SkeletonUtils.clone(idle.scene), [idle.scene]);

  const allAnimations = useMemo(() => {
    const anims = [];
    const add = (src, name) => src.animations.forEach((a) => { const c = a.clone(); c.name = name; anims.push(c); });
    add(idle, 'Idle'); add(idle2, 'Idle2'); add(idle3, 'Idle3');
    add(idle4, 'Idle4'); add(idle5, 'Idle5'); add(idle6, 'Idle6');
    add(dead, 'Death'); add(deadPose, 'DeadPose');
    add(walk, 'Walk'); add(run, 'Run'); add(jump, 'Jump');
    add(sitCross, 'SitCross'); add(lieDown, 'LieDown');
    add(dance1, 'Dance1'); add(dance2, 'Dance2'); add(dance3, 'Dance3');
    return anims;
  }, [idle, idle2, idle3, idle4, idle5, idle6, dead, deadPose, walk, run, jump, sitCross, lieDown, dance1, dance2, dance3]);

  return (
    <CharacterRenderer
      group={group}
      clone={clone}
      allAnimations={allAnimations}
      origMaterials={origMaterials}
      color={color}
      animation={animation}
      animOffset={animOffset}
      {...props}
    />
  );
}

// ============================================================
// Wanderer Character — new dark hooded skin
// ============================================================
function WandererCharacter({ color, animation, animOffset, ...props }) {
  const group = useRef();
  const origMaterials = useRef(new Map());

  const idle = useGLTF('/models/Wanderer_Idle.glb');
  const idle2 = useGLTF('/models/Wanderer_Idle2.glb');
  const idle3 = useGLTF('/models/Wanderer_Idle3.glb');
  const dead = useGLTF('/models/Wanderer_Dead.glb');
  const walk = useGLTF('/models/Wanderer_Walk.glb');
  const run = useGLTF('/models/Wanderer_Run.glb');
  const sitCross = useGLTF('/models/Wanderer_SitCross.glb');
  const lieDown = useGLTF('/models/Wanderer_LieDown.glb');
  const dance1 = useGLTF('/models/Wanderer_Dance1.glb');
  const dance2 = useGLTF('/models/Wanderer_Dance2.glb');

  const clone = useMemo(() => SkeletonUtils.clone(idle.scene), [idle.scene]);

  const allAnimations = useMemo(() => {
    const anims = [];
    const add = (src, name) => src.animations.forEach((a) => { const c = a.clone(); c.name = name; anims.push(c); });
    add(idle, 'Idle'); add(idle2, 'Idle2'); add(idle3, 'Idle3');
    add(dead, 'Death');
    // Synthetic DeadPose — clone Death, code will jump to last frame
    dead.animations.forEach((a) => { const c = a.clone(); c.name = 'DeadPose'; anims.push(c); });
    add(walk, 'Walk'); add(run, 'Run');
    add(sitCross, 'SitCross'); add(lieDown, 'LieDown');
    add(dance1, 'Dance1'); add(dance2, 'Dance2');
    return anims;
  }, [idle, idle2, idle3, dead, walk, run, sitCross, lieDown, dance1, dance2]);

  return (
    <CharacterRenderer
      group={group}
      clone={clone}
      allAnimations={allAnimations}
      origMaterials={origMaterials}
      color={color}
      animation={animation}
      animOffset={animOffset}
      {...props}
    />
  );
}

// ============================================================
// Shared renderer — animation logic + material tinting
// ============================================================
function CharacterRenderer({ group, clone, allAnimations, origMaterials, color, animation = 'Idle', animOffset = 0, ...props }) {
  const { actions } = useAnimations(allAnimations, group);

  // Death plays once and holds
  if (actions['Death']) {
    actions['Death'].loop = LoopOnce;
    actions['Death'].clampWhenFinished = true;
  }
  if (actions['DeadPose']) {
    actions['DeadPose'].loop = LoopOnce;
    actions['DeadPose'].clampWhenFinished = true;
  }

  useEffect(() => {
    const anim = actions[animation] ? animation : 'Idle';
    const action = actions[anim];
    if (action) {
      action.reset().fadeIn(0.2).play();
      if (anim === 'DeadPose') {
        action.time = action.getClip().duration;
      } else if (animOffset && action.time !== undefined) {
        action.time = animOffset;
      }
      return () => action.fadeOut(0.2);
    }
  }, [animation, actions, animOffset]);

  useEffect(() => {
    clone.traverse((child) => {
      if (child.isMesh) {
        if (!origMaterials.current.has(child.uuid)) {
          origMaterials.current.set(child.uuid, child.material);
        }
        const mat = origMaterials.current.get(child.uuid).clone();
        if (mat.emissive) mat.emissive.set(0, 0, 0);
        mat.emissiveIntensity = 0;
        mat.emissiveMap = null;
        mat.metalness = 0;
        mat.metalnessMap = null;
        // Slightly less roughness so highlights / shadows separate
        // more — the previous 0.85 flattened the figure into a single
        // tone under the scene's soft lighting and made everyone read
        // as milky pastels.
        mat.roughness = 0.65;
        const rimColor = new Color(color || '#ffffff');
        if (color) {
          // Stronger base tint (0.2 → 0.32): the rim fresnel was the
          // only thing carrying player identity before, and once it
          // was dialled down the figure skewed washed-out. A warmer
          // mid-lerp keeps the silhouette identifiable without the
          // old "team sweater" look.
          mat.color = new Color('#ffffff').lerp(rimColor, 0.32);
        }
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uRimColor = { value: rimColor };
          // Rim fresnel trimmed (0.4 → 0.22) — the bright edge light
          // was the "fade / halo around the texture" the scene read
          // as low-contrast. Keeping a thin hint of colour on the
          // silhouette while letting the base material do the work.
          shader.uniforms.uRimIntensity = { value: 0.22 };
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>
             uniform vec3 uRimColor;
             uniform float uRimIntensity;`,
          );
          // Sharper fresnel falloff (pow 2.2 → 3.2) keeps the rim a
          // thin line on the outline instead of bleeding onto the
          // body, and a gentle contrast curve on the final colour
          // pushes shadows down and highlights up so the figures
          // stop looking like flat paper cut-outs.
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `float rimFresnel = 1.0 - clamp(dot(normalize(geometryNormal), normalize(vViewPosition)), 0.0, 1.0);
             rimFresnel = pow(rimFresnel, 3.2);
             gl_FragColor.rgb += uRimColor * rimFresnel * uRimIntensity;
             gl_FragColor.rgb = (gl_FragColor.rgb - 0.5) * 1.18 + 0.5;
             gl_FragColor.rgb = clamp(gl_FragColor.rgb, 0.0, 1.0);
             #include <dithering_fragment>`,
          );
        };
        mat.needsUpdate = true;
        child.material = mat;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [clone, color]);

  return (
    <group {...props} dispose={null} ref={group}>
      <primitive object={clone} />
    </group>
  );
}

// ============================================================
// Public Character — dispatches to the right skin component
// ============================================================
export function Character({ skin = 'villager', ...props }) {
  if (skin === 'wanderer') return <WandererCharacter {...props} />;
  return <VillagerCharacter {...props} />;
}
