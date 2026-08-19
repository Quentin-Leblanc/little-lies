import React, { useRef, useMemo, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { Character, resolvePlayerSkin } from '../../Character/Character';
import ChatBubble from './ChatBubble';
import PhaseEmote from './PhaseEmote';
import { IDLE_VARIANTS, DANCE_VARIANTS, WALK_OBSTACLES } from '../constants';
import { pickForPlayer } from '../utils';
import { toTextCss, buildPlayerNamePillStyle } from '../../../utils/playerColor';
import { setOutlineOpacity } from '../../Character/CharacterOutline';

// Apply radial "push" away from each obstacle so the walker curves around
// plaza props (bulletin board, podium, gallows…) instead of clipping
// through them. Returns {dx, dz} to add to the straight-line position.
const obstaclePush = (x, z) => {
  let dx = 0, dz = 0;
  for (const obs of WALK_OBSTACLES) {
    const ox = x - obs.x;
    const oz = z - obs.z;
    const dist = Math.sqrt(ox * ox + oz * oz);
    if (dist > 0 && dist < obs.radius) {
      const strength = (obs.radius - dist) / obs.radius;
      dx += (ox / dist) * strength * obs.radius;
      dz += (oz / dist) * strength * obs.radius;
    }
  }
  return { dx, dz };
};

// Character model + walk-transition + death/victory anim + name label
// + vote counter + accused ring + phase emote + chat bubble.
const PlayerFigure = ({
  player, position, rotation, color,
  isAccused, showVote, voteCount, totalAlive,
  startPosition, isTransitioning, transitionDuration = 3,
  characterScale = 1.0, pauseAnim = null,
  phase = null, CONSTANTS = null, fadeOnTransition = true,
  chatMessages = null, dayCount = 0,
  isGameOver = false, isWinningTeam = false, isMe = false,
}) => {
  const groupRef = useRef();
  const transitionStartTime = useRef(null);
  const walkStarted = useRef(false);

  const playerSkin = useMemo(() => resolvePlayerSkin(player), [player.id, player.profile?.skin]);

  // Stable random idle & dance per player (skin-aware variant lists)
  const playerIdle = useMemo(
    () => pickForPlayer(player.id, IDLE_VARIANTS[playerSkin] || IDLE_VARIANTS.villager),
    [player.id, playerSkin],
  );
  const playerDance = useMemo(
    () => pickForPlayer(player.id + '_dance', DANCE_VARIANTS[playerSkin] || DANCE_VARIANTS.villager),
    [player.id, playerSkin],
  );

  const [currentAnim, setCurrentAnim] = useState(playerIdle);

  useEffect(() => {
    if (isTransitioning && startPosition && !walkStarted.current) {
      walkStarted.current = true;
      transitionStartTime.current = null;
      setCurrentAnim('Walk');
    }
    if (!isTransitioning) {
      walkStarted.current = false;
      setCurrentAnim(playerIdle);
    }
  }, [isTransitioning, playerIdle]);

  // Death animation when accused is executed
  useEffect(() => {
    if (isAccused && phase === CONSTANTS?.PHASE?.EXECUTION) {
      const t = setTimeout(() => setCurrentAnim('Death'), 400);
      return () => clearTimeout(t);
    }
  }, [phase, isAccused, CONSTANTS]);

  // Victory dance when game ends for winning team
  useEffect(() => {
    if (isGameOver && isWinningTeam) {
      setCurrentAnim(playerDance);
    }
  }, [isGameOver, isWinningTeam, playerDance]);

  useFrame((state) => {
    if (!groupRef.current) return;

    if (isTransitioning && startPosition) {
      if (transitionStartTime.current === null) {
        transitionStartTime.current = state.clock.elapsedTime;
      }
      const elapsed = state.clock.elapsedTime - transitionStartTime.current;
      const t = Math.min(elapsed / transitionDuration, 1);
      const eased = t * t * (3 - 2 * t); // smoothstep

      const baseX = startPosition[0] + (position[0] - startPosition[0]) * eased;
      const baseZ = startPosition[2] + (position[2] - startPosition[2]) * eased;
      // Steer around plaza obstacles — players used to clip through the
      // bulletin board and podium during the walk-home transition.
      const push = obstaclePush(baseX, baseZ);
      groupRef.current.position.x = baseX + push.dx;
      groupRef.current.position.y = position[1];
      groupRef.current.position.z = baseZ + push.dz;

      // Face walk direction (fixed, computed from start→end — not from
      // current position, which would rotate mid-walk).
      const dx = position[0] - startPosition[0];
      const dz = position[2] - startPosition[2];
      groupRef.current.rotation.y = Math.atan2(dx, dz);

      if (t >= 1 && currentAnim === 'Walk') {
        setCurrentAnim(isGameOver && isWinningTeam ? playerDance : playerIdle);
      }
    } else {
      // Outside of a walk transition, keep the group pinned to the
      // target position every frame. Previously only `y` was synced,
      // which left the group stuck at a stale `x`/`z` if a transition
      // was interrupted (e.g. PlayroomKit re-syncs mid-walk on Day 1
      // first-gather), stranding the character far from the plaza
      // until the next walk fired.
      groupRef.current.position.x = position[0];
      groupRef.current.position.y = position[1];
      groupRef.current.position.z = position[2];
    }
  });

  // Fade-out: make character materials transparent during walk-away
  const charGroupRef = useRef();
  useFrame((state) => {
    if (!charGroupRef.current) return;
    if (isTransitioning && fadeOnTransition && transitionStartTime.current !== null) {
      const elapsed = state.clock.elapsedTime - transitionStartTime.current;
      // Fade to fully transparent ~1s before the walk ends so players
      // disappear before they can bump into walls.
      const fadeEnd = Math.max(transitionDuration - 2, 0.5);
      const opacity = Math.max(1 - elapsed / fadeEnd, 0);
      charGroupRef.current.traverse((child) => {
        if (child.isMesh && child.material && !child.material.uniforms) {
          child.material.transparent = true;
          child.material.opacity = opacity;
          child.castShadow = opacity > 0.1;
        }
      });
      // The outline is a ShaderMaterial, so it doesn't respond to the
      // material.opacity sweep above — without this the body dissolves
      // and leaves a dark hollow shell walking home.
      setOutlineOpacity(charGroupRef.current, opacity);
    } else if (charGroupRef.current) {
      charGroupRef.current.traverse((child) => {
        if (child.isMesh && child.material && !child.material.uniforms && child.material.opacity < 1) {
          child.material.opacity = 1;
          child.castShadow = true;
        }
      });
      setOutlineOpacity(charGroupRef.current, 1);
    }
  });

  // Player "profile.color" is either a hex string or a gradient object.
  // Character uses the resolved solid hex; the floating name pill uses
  // the shared buildPlayerNamePillStyle() helper so the lobby seat and
  // in-game figure share the exact same visual treatment:
  //   - solid color    → colored pill + white text
  //   - gradient color → BLACK pill + gradient text with a thin stroke
  const rawColor = player.profile?.color || color;
  const characterColor = toTextCss(rawColor, color || '#ffffff');
  const { pillStyle, textStyle } = buildPlayerNamePillStyle(rawColor, color || '#ffffff');

  // Colored halo disk under the player's feet — gives every player a
  // persistent visual identity on the plaza (and on the dead-pile in
  // the middle, where the floating name is hidden but the color cue
  // still tells you who it is). Gradient palettes collapse to their
  // first color so the SPECIAL-palette player's halo matches the
  // solid-color halos of everyone else (the gradient-on-a-disc read
  // as a noticeably different visual treatment).
  const haloMaterial = useMemo(() => {
    const isGrad = typeof rawColor === 'object' && rawColor?.type === 'gradient';
    const solid = isGrad ? (rawColor.color1 || '#ffffff') : (characterColor || '#ffffff');
    return new THREE.MeshBasicMaterial({
      color: solid,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
  }, [rawColor, characterColor]);

  useEffect(() => () => {
    haloMaterial.map?.dispose?.();
    haloMaterial.dispose?.();
  }, [haloMaterial]);

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <group ref={charGroupRef}>
        <Character
          color={characterColor}
          animation={pauseAnim || currentAnim}
          scale={characterScale || 1.0}
          skin={playerSkin}
          animOffset={player.id ? (player.id.charCodeAt(0) % 20) * 0.15 : 0}
        />
      </group>
      {/* Ground token under the feet. Three concentric parts, and each
          one answers a different question the player asks every round:

            fill  — who is this?      (their colour)
            rim   — where do they end? (a dark edge, so the fill reads as
                    a SHAPE on any ground value instead of a light patch)
            gold  — which one am I?   (local player only)

          The dark rim is the part that makes this work. A translucent
          coloured disc alone disappears the moment the ground behind it
          shares its value — which, on a plaza floor tuned for contrast,
          happens constantly. */}
      {!isTransitioning && (
        <group renderOrder={-1}>
          <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.65, 32]} />
            <primitive object={haloMaterial} attach="material" />
          </mesh>
          <mesh position={[0, 0.045, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.65, 0.76, 40]} />
            <meshBasicMaterial color="#14121c" transparent opacity={0.8} depthWrite={false} />
          </mesh>
          {isMe && (
            <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.8, 0.94, 40]} />
              <meshBasicMaterial color="#f0b840" transparent opacity={0.85} depthWrite={false} />
            </mesh>
          )}
        </group>
      )}
      {isAccused && (
        <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          {/* 16 segments read as a visible polygon at trial camera
              distance — the ring the whole table is looking at should
              not be the one thing in frame with flat sides. */}
          <ringGeometry args={[0.7, 0.9, 48]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.7} depthWrite={false} />
        </mesh>
      )}
      {!isTransitioning && (
        <Html position={[0, 2.0, 0]} center distanceFactor={8} zIndexRange={[5, 0]}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            whiteSpace: 'nowrap',
          }}>
            <div
              className="player-name-label"
              style={{
                ...pillStyle,
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '22px',
                fontWeight: 'bold',
                letterSpacing: '0.5px',
              }}>
              <span style={textStyle}>{player.profile.name}</span>
            </div>
            {showVote && voteCount > 0 && (
              <div style={{
                backgroundColor: 'rgba(255,68,68,0.85)',
                color: '#fff',
                padding: '3px 10px',
                borderRadius: '6px',
                fontSize: '15px',
                fontWeight: 'bold',
              }}>
                Vote {voteCount}/{totalAlive}
              </div>
            )}
          </div>
        </Html>
      )}
      {!isTransitioning && phase && CONSTANTS && (
        <PhaseEmote phase={phase} isAccused={isAccused} CONSTANTS={CONSTANTS} />
      )}
      {!isTransitioning && (
        <ChatBubble playerId={player.id} chatMessages={chatMessages} dayCount={dayCount} phase={phase} />
      )}
    </group>
  );
};

export default PlayerFigure;
