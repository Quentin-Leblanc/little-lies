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

  // Load the 5 GLBs (mesh + 1 animation each)
  const idle = useGLTF('/models/Villager_Idle.glb');
  const dead = useGLTF('/models/Villager_Dead.glb');
  const walk = useGLTF('/models/Villager_Walk.glb');
  const run = useGLTF('/models/Villager_Run.glb');
  const jump = useGLTF('/models/Villager_Jump.glb');
  const sitCross = useGLTF('/models/Villager_SitCross.glb');
  const lieDown = useGLTF('/models/Villager_LieDown.glb');

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
    return anims;
  }, [idle.animations, dead.animations, walk.animations, run.animations, jump.animations, sitCross.animations, lieDown.animations]);

  const { actions } = useAnimations(allAnimations, group);

  // Death plays once and holds
  if (actions['Death']) {
    actions['Death'].loop = LoopOnce;
    actions['Death'].clampWhenFinished = true;
  }

  useEffect(() => {
    // Fallback: if requested animation doesn't exist, use Idle
    const anim = actions[animation] ? animation : 'Idle';
    const action = actions[anim];
    if (action) {
      action.reset().fadeIn(0.2).play();
      // Offset animation time so characters aren't all in sync
      if (animOffset && action.time !== undefined) {
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
        // Tint with player color if provided (multiplied with texture)
        if (color) {
          mat.color = new Color(color);
        }
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
