import { useAnimations, useGLTF } from '@react-three/drei';
import React, { useEffect, useMemo, useRef } from 'react';
import { Color, LoopOnce } from 'three';
import { SkeletonUtils } from 'three-stdlib';

export function Character({
  color,
  animation = 'Idle',
  animOffset = 0,
  ...props
}) {
  const group = useRef();
  const origMaterials = useRef(new Map());

  // Load all GLBs (mesh + 1 animation each)
  const idle = useGLTF('/models/Villager_Idle.glb');
  const dead = useGLTF('/models/Villager_Dead.glb');
  const walk = useGLTF('/models/Villager_Walk.glb');
  const run = useGLTF('/models/Villager_Run.glb');
  const jump = useGLTF('/models/Villager_Jump.glb');
  const sitCross = useGLTF('/models/Villager_SitCross.glb');
  const lieDown = useGLTF('/models/Villager_LieDown.glb');
  const deadPose = useGLTF('/models/Villager_DeadPose.glb');
  // Dance animations (victory)
  const dance1 = useGLTF('/models/Villager_Dance1.glb');
  const dance2 = useGLTF('/models/Villager_Dance2.glb');
  const dance3 = useGLTF('/models/Villager_Dance3.glb');
  // Extra idle variations
  const idle2 = useGLTF('/models/Villager_Idle2.glb');
  const idle3 = useGLTF('/models/Villager_Idle3.glb');
  const idle4 = useGLTF('/models/Villager_Idle4.glb');
  const idle5 = useGLTF('/models/Villager_Idle5.glb');
  const idle6 = useGLTF('/models/Villager_Idle6.glb');

  // Clone the base mesh from idle (all files share the same mesh/skeleton)
  const clone = useMemo(() => SkeletonUtils.clone(idle.scene), [idle.scene]);

  // Combine all animations under clean names
  const allAnimations = useMemo(() => {
    const anims = [];
    const addAnim = (source, name) => {
      source.animations.forEach((a) => {
        const clip = a.clone();
        clip.name = name;
        anims.push(clip);
      });
    };
    addAnim(idle, 'Idle');
    addAnim(dead, 'Death');
    addAnim(walk, 'Walk');
    addAnim(run, 'Run');
    addAnim(jump, 'Jump');
    addAnim(sitCross, 'SitCross');
    addAnim(lieDown, 'LieDown');
    addAnim(deadPose, 'DeadPose');
    addAnim(dance1, 'Dance1');
    addAnim(dance2, 'Dance2');
    addAnim(dance3, 'Dance3');
    addAnim(idle2, 'Idle2');
    addAnim(idle3, 'Idle3');
    addAnim(idle4, 'Idle4');
    addAnim(idle5, 'Idle5');
    addAnim(idle6, 'Idle6');
    return anims;
  }, [idle.animations, dead.animations, walk.animations, run.animations, jump.animations, sitCross.animations, lieDown.animations, deadPose.animations,
      dance1.animations, dance2.animations, dance3.animations,
      idle2.animations, idle3.animations, idle4.animations, idle5.animations, idle6.animations]);

  const { actions } = useAnimations(allAnimations, group);

  // Death plays once and holds
  if (actions['Death']) {
    actions['Death'].loop = LoopOnce;
    actions['Death'].clampWhenFinished = true;
  }
  // DeadPose: skip to last frame immediately (body already on ground)
  if (actions['DeadPose']) {
    actions['DeadPose'].loop = LoopOnce;
    actions['DeadPose'].clampWhenFinished = true;
  }

  useEffect(() => {
    // Fallback: if requested animation doesn't exist, use Idle
    const anim = actions[animation] ? animation : 'Idle';
    const action = actions[anim];
    if (action) {
      action.reset().fadeIn(0.2).play();
      // DeadPose: jump to last frame so the body is already on the ground
      if (anim === 'DeadPose') {
        action.time = action.getClip().duration;
      } else if (animOffset && action.time !== undefined) {
        // Offset animation time so characters aren't all in sync
        action.time = animOffset;
      }
      return () => action.fadeOut(0.2);
    }
  }, [animation, actions, animOffset]);

  // Store original materials once, then clone + tint for player color
  useEffect(() => {
    clone.traverse((child) => {
      if (child.isMesh) {
        // Save original material on first encounter
        if (!origMaterials.current.has(child.uuid)) {
          origMaterials.current.set(child.uuid, child.material);
        }
        // Clone from original to preserve textures
        const mat = origMaterials.current.get(child.uuid).clone();
        // Kill baked emissive (prevents white glow at night from the GLB's
        // default emissive). We'll inject a subtle colored rim light via
        // onBeforeCompile instead, which only affects the silhouette.
        if (mat.emissive) mat.emissive.set(0, 0, 0);
        mat.emissiveIntensity = 0;
        mat.emissiveMap = null;
        // Force non-metallic diffuse — the GLB ships with metallic PBR
        // materials which, without bright local colored lights, make all
        // villagers look like dull grey iron (metals take their color from
        // the environment, not their base color). Force metalness=0 so the
        // player color tint actually reads on screen.
        mat.metalness = 0;
        mat.metalnessMap = null;
        mat.roughness = 0.85;
        // Stronger base tint with player color (45% color / 55% white) —
        // keeps the original baseColorTexture readable but makes the color
        // identification much more visible than a faint wash.
        const rimColor = new Color(color || '#ffffff');
        if (color) {
          mat.color = new Color('#ffffff').lerp(rimColor, 0.45);
        }
        // Rim light injection — adds a subtle fresnel glow around the
        // silhouette in the player's color. Does NOT replace the texture,
        // just adds to the final fragment color. Highlights the character
        // at a glance without a decal on the ground.
        mat.onBeforeCompile = (shader) => {
          shader.uniforms.uRimColor = { value: rimColor };
          shader.uniforms.uRimIntensity = { value: 0.9 };
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `#include <common>
             uniform vec3 uRimColor;
             uniform float uRimIntensity;`,
          );
          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `// Fresnel rim — bright on the silhouette, 0 facing camera.
             float rimFresnel = 1.0 - clamp(dot(normalize(geometryNormal), normalize(vViewPosition)), 0.0, 1.0);
             rimFresnel = pow(rimFresnel, 2.2);
             gl_FragColor.rgb += uRimColor * rimFresnel * uRimIntensity;
             #include <dithering_fragment>`,
          );
        };
        // Force recompile so the new onBeforeCompile takes effect
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

useGLTF.preload('/models/Villager_Idle.glb');
useGLTF.preload('/models/Villager_Dead.glb');
useGLTF.preload('/models/Villager_Walk.glb');
useGLTF.preload('/models/Villager_Run.glb');
useGLTF.preload('/models/Villager_Jump.glb');
useGLTF.preload('/models/Villager_SitCross.glb');
useGLTF.preload('/models/Villager_LieDown.glb');
useGLTF.preload('/models/Villager_DeadPose.glb');
useGLTF.preload('/models/Villager_Dance1.glb');
useGLTF.preload('/models/Villager_Dance2.glb');
useGLTF.preload('/models/Villager_Dance3.glb');
useGLTF.preload('/models/Villager_Idle2.glb');
useGLTF.preload('/models/Villager_Idle3.glb');
useGLTF.preload('/models/Villager_Idle4.glb');
useGLTF.preload('/models/Villager_Idle5.glb');
useGLTF.preload('/models/Villager_Idle6.glb');
