import React, { useRef, useMemo, Suspense } from 'react';
import { usePlayersList, myPlayer } from 'playroomkit';
import { useFrame, useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import { Stars, Html, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, HueSaturation } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Character, resolvePlayerSkin } from '../../Character/Character';
import { buildPlayerNamePillStyle } from '../../../utils/playerColor';

// ─────────────────────────────────────────────────────────────────────
// LobbyView — R3F content for the "lobby" camera view of UnifiedScene.
//
// Extracted verbatim from the old <CustomLobby> Canvas so the visual
// output stays pixel-identical to before P0. Owns the campfire, the
// ground circle, the seated player avatars and the postprocessing
// stack. Mounted inside the UnifiedScene's persistent <Canvas>, so it
// survives the lobby→setup screen swap without remount.
// ─────────────────────────────────────────────────────────────────────

const PLAYER_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e91e63', '#00bcd4', '#ff9800', '#8bc34a',
  '#ff5722', '#607d8b', '#cddc39', '#795548', '#03a9f4',
];

const getColor3D = (color) => {
  if (!color) return '#888';
  if (typeof color === 'object' && color.type === 'gradient') return color.color1;
  return color;
};

const CampfireFlame = () => {
  const flameRef = useRef();
  useFrame((state) => {
    if (!flameRef.current) return;
    const t = state.clock.elapsedTime;
    flameRef.current.scale.y = 1 + Math.sin(t * 8) * 0.2 + Math.sin(t * 13) * 0.1;
    flameRef.current.scale.x = 1 + Math.sin(t * 6 + 1) * 0.15;
    flameRef.current.rotation.y = t * 0.3;
  });

  return (
    <group>
      {[0, 1.2, 2.4, 3.6, 4.8].map((angle, i) => (
        <mesh key={i} position={[Math.cos(angle) * 0.4, 0.1, Math.sin(angle) * 0.4]}
          rotation={[0, angle + 0.5, Math.PI / 12]}>
          <cylinderGeometry args={[0.06, 0.08, 0.8, 5]} />
          <meshStandardMaterial color="#4a2a0a" />
        </mesh>
      ))}
      <group ref={flameRef} position={[0, 0.35, 0]}>
        <mesh><coneGeometry args={[0.3, 0.8, 6]} /><meshBasicMaterial color={[5, 1, 0]} transparent opacity={0.85} toneMapped={false} /></mesh>
        <mesh position={[0, 0.1, 0]}><coneGeometry args={[0.2, 0.6, 5]} /><meshBasicMaterial color={[7, 3, 0.4]} transparent opacity={0.8} toneMapped={false} /></mesh>
        <mesh position={[0, 0.15, 0]}><coneGeometry args={[0.12, 0.4, 4]} /><meshBasicMaterial color={[10, 7, 1.5]} transparent opacity={0.9} toneMapped={false} /></mesh>
        <mesh position={[0, 0.2, 0]}><coneGeometry args={[0.05, 0.2, 4]} /><meshBasicMaterial color={[14, 13, 7]} transparent opacity={0.7} toneMapped={false} /></mesh>
      </group>
      <pointLight position={[0, 1, 0]} intensity={7} color="#ff8833" distance={28} decay={0.9} />
      <pointLight position={[0, 0.5, 0]} intensity={3.5} color="#ff4400" distance={16} decay={1} />
    </group>
  );
};

const Embers = () => {
  const meshRef = useRef();
  const count = 20;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const offsets = useMemo(() =>
    Array.from({ length: count }, () => ({
      speed: 0.15 + Math.random() * 0.2,
      drift: (Math.random() - 0.5) * 1.5,
      driftZ: (Math.random() - 0.5) * 1.5,
      phase: Math.random() * Math.PI * 2,
      size: 0.008 + Math.random() * 0.014,
    })), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const o = offsets[i];
      const life = ((t * o.speed + o.phase) % 1);
      dummy.position.set(
        Math.sin(t * 0.5 + o.phase) * o.drift,
        life * 4,
        Math.cos(t * 0.3 + o.phase) * o.driftZ
      );
      const s = o.size * (1 - life);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial color={[4, 1.2, 0.1]} transparent opacity={0.8} toneMapped={false} />
    </instancedMesh>
  );
};

const CampGround = () => {
  const albedo = useLoader(TextureLoader, '/models/textures/lobby_rocky_albedo.jpg');

  useMemo(() => {
    if (!albedo) return;
    albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping;
    albedo.repeat.set(4, 4);
    albedo.anisotropy = 16;
    albedo.colorSpace = THREE.SRGBColorSpace;
    albedo.minFilter = THREE.LinearMipmapLinearFilter;
    albedo.magFilter = THREE.LinearFilter;
    albedo.generateMipmaps = true;
  }, [albedo]);

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[20, 32]} />
        <meshStandardMaterial map={albedo} color="#6e655f" roughness={1} metalness={0} />
      </mesh>
      {Array.from({ length: 10 }).map((_, i) => {
        const angle = (i / 10) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(angle) * 0.9, 0.05, Math.sin(angle) * 0.9]}>
            <dodecahedronGeometry args={[0.12, 0]} />
            <meshStandardMaterial color="#555" />
          </mesh>
        );
      })}
    </group>
  );
};

const BackgroundTrees = () => {
  const trees = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => {
      const angle = (i / 20) * Math.PI * 2 + (Math.random() - 0.5) * 0.15;
      const r = 8 + Math.random() * 7;
      return {
        x: Math.cos(angle) * r,
        z: Math.sin(angle) * r,
        h: 2.2 + Math.random() * 2.2,
        rot: Math.random() * Math.PI * 2,
        foliage: 0.78 + Math.random() * 0.3,
        trunkCol: Math.random() < 0.5 ? '#2a1a0a' : '#32200c',
        greenShift: Math.random() * 0.15,
      };
    }), []);

  return (
    <group>
      {trees.map((tree, i) => {
        const trunkH = tree.h * 0.28;
        const c1H = tree.h * 0.55; const c1R = tree.foliage;
        const c2H = tree.h * 0.42; const c2R = tree.foliage * 0.78;
        const c3H = tree.h * 0.30; const c3R = tree.foliage * 0.48;
        const c1Y = trunkH + c1H * 0.5 - 0.05;
        const c2Y = trunkH + c1H * 0.85;
        const c3Y = trunkH + c1H * 0.85 + c2H * 0.75;
        const foliageBase = tree.greenShift > 0.08 ? '#0f2010' : '#0b1a0a';
        const foliageMid  = tree.greenShift > 0.08 ? '#0d1c0e' : '#091708';
        const foliageTop  = tree.greenShift > 0.08 ? '#0a1a0c' : '#071306';
        return (
          <group key={i} position={[tree.x, 0, tree.z]} rotation={[0, tree.rot, 0]}>
            <mesh position={[0, trunkH * 0.5, 0]} castShadow>
              <cylinderGeometry args={[0.14, 0.22, trunkH, 6]} />
              <meshStandardMaterial color={tree.trunkCol} roughness={0.95} />
            </mesh>
            <mesh position={[0, c1Y, 0]} castShadow>
              <coneGeometry args={[c1R, c1H, 7]} />
              <meshStandardMaterial color={foliageBase} roughness={0.9} />
            </mesh>
            <mesh position={[0, c2Y, 0]} castShadow>
              <coneGeometry args={[c2R, c2H, 7]} />
              <meshStandardMaterial color={foliageMid} roughness={0.9} />
            </mesh>
            <mesh position={[0, c3Y, 0]} castShadow>
              <coneGeometry args={[c3R, c3H, 6]} />
              <meshStandardMaterial color={foliageTop} roughness={0.9} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

const Moon = () => {
  const groupRef = useRef();
  const _fwd = useMemo(() => new THREE.Vector3(), []);
  const _up = useMemo(() => new THREE.Vector3(), []);
  useFrame((state) => {
    if (!groupRef.current) return;
    const cam = state.camera;
    _fwd.set(0, 0, -1).applyQuaternion(cam.quaternion);
    _up.set(0, 1, 0).applyQuaternion(cam.quaternion);
    groupRef.current.position
      .copy(cam.position)
      .addScaledVector(_fwd, 28)
      .addScaledVector(_up, 9);
    groupRef.current.quaternion.copy(cam.quaternion);
  });
  return (
    <group ref={groupRef}>
      <mesh>
        <circleGeometry args={[2.4, 64]} />
        <meshBasicMaterial color={[2.2, 2.6, 3.4]} toneMapped={false} fog={false} />
      </mesh>
    </group>
  );
};

const LOBBY_ANIMS = ['SitCross', 'LieDown'];
const LIEDOWN_Y_OFFSET = { villager: -0.35, wanderer: -0.47 };

const PlayerSeat = ({ index, total, player, color, isMe }) => {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  const r = 2.2;
  const x = Math.cos(angle) * r;
  const z = Math.sin(angle) * r;
  const lookAtAngle = Math.atan2(-x, -z);

  const anim = LOBBY_ANIMS[index % LOBBY_ANIMS.length];
  const skin = resolvePlayerSkin(player);
  const yOffset = anim === 'LieDown' ? (LIEDOWN_Y_OFFSET[skin] ?? -0.35) : 0;
  const nameY = anim === 'LieDown' ? 1.1 : 1.15;

  const groupRef = useRef();
  const labelRef = useRef();
  const opacityRef = useRef(0);
  const fadingOut = useRef(false);
  const prevTotal = useRef(total);
  const targetX = useRef(x);
  const targetZ = useRef(z);
  const targetAngle = useRef(lookAtAngle);
  const initialized = useRef(false);

  React.useEffect(() => {
    targetX.current = x;
    targetZ.current = z;
    targetAngle.current = lookAtAngle;
    if (prevTotal.current !== total) {
      fadingOut.current = true;
      prevTotal.current = total;
    }
  }, [total, x, z, lookAtAngle]);

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    if (!initialized.current) {
      g.position.set(targetX.current, yOffset, targetZ.current);
      g.rotation.y = targetAngle.current;
      initialized.current = true;
    }
    if (fadingOut.current) {
      opacityRef.current = Math.max(0, opacityRef.current - 0.12);
      if (opacityRef.current === 0) {
        g.position.set(targetX.current, yOffset, targetZ.current);
        g.rotation.y = targetAngle.current;
        fadingOut.current = false;
      }
    } else {
      opacityRef.current = Math.min(1, opacityRef.current + 0.07);
    }
    g.traverse((child) => {
      if (child.isMesh && child.material) {
        if (!child.userData._opacityInit) {
          child.material = child.material.clone();
          child.userData._baseOpacity = child.material.opacity;
          child.userData._opacityInit = true;
        }
        child.material.transparent = true;
        child.material.opacity = child.userData._baseOpacity * opacityRef.current;
      }
    });
    if (labelRef.current) {
      labelRef.current.style.opacity = String(opacityRef.current);
    }
  });

  return (
    <group ref={groupRef}>
      <Character color={color} animation={anim} scale={0.55} skin={skin} animOffset={index * 0.5} />
      {isMe && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03 - yOffset, 0]}>
          <circleGeometry args={[0.55, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.12} />
        </mesh>
      )}
      {isMe && (
        <pointLight position={[0, 0.3 - yOffset, 0]} color={color} intensity={1.5} distance={4} />
      )}
      <Html position={[0, nameY, 0]} center distanceFactor={6} zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
        {(() => {
          const rawColor = player.getState?.()?.profile?.color;
          const { pillStyle, textStyle } = buildPlayerNamePillStyle(rawColor, color || '#888');
          return (
            <div ref={labelRef} style={{
              ...pillStyle,
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              opacity: 0,
            }}>
              {isMe && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block', marginRight: 6, flexShrink: 0 }} />}
              <span style={textStyle}>{player.getState?.()?.profile?.name || 'Player'}</span>
            </div>
          );
        })()}
      </Html>
    </group>
  );
};

const LobbyView = () => {
  const playroom_players = usePlayersList(true);
  const currentPlayer = myPlayer();

  return (
    <>
      <color attach="background" args={['#050810']} />
      <fog attach="fog" args={['#050810', 10, 25]} />
      <ambientLight intensity={0.18} color="#5a6a90" />
      <directionalLight position={[8, 14, -6]} intensity={1.1} color="#7a9bd5" />
      <hemisphereLight args={["#6a7ba8", "#1a1420", 0.6]} />

      <Suspense fallback={null}>
        <Moon />
        <CampGround />
        <CampfireFlame />
        <Embers />
        <BackgroundTrees />
        <Stars radius={50} depth={40} count={2000} factor={3} fade speed={0.5} />

        <ContactShadows
          position={[0, 0.005, 0]}
          opacity={0.45}
          scale={14}
          blur={2.8}
          far={3}
          resolution={512}
          color="#000000"
        />

        {playroom_players.map((player, idx) => (
          <PlayerSeat
            key={player.id}
            index={idx}
            total={playroom_players.length}
            player={player}
            isMe={player.id === currentPlayer?.id}
            color={getColor3D(player.getState?.()?.profile?.color) || PLAYER_COLORS[idx % PLAYER_COLORS.length]}
          />
        ))}

        <EffectComposer>
          <Bloom intensity={0.8} luminanceThreshold={0.4} luminanceSmoothing={0.5} mipmapBlur />
          <HueSaturation saturation={0.18} />
          <Vignette offset={0.15} darkness={0.8} />
        </EffectComposer>
      </Suspense>
    </>
  );
};

export default LobbyView;
