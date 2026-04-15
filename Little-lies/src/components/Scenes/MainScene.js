import React, { useRef, useMemo, useState, useEffect, Suspense, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars, Html, useGLTF } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, BrightnessContrast, HueSaturation } from '@react-three/postprocessing';
import { useMultiplayerState } from 'playroomkit';
import * as THREE from 'three';
import { useGameEngine } from '../../hooks/useGameEngine';
import { Character } from '../Character/Character';
import i18n from '../../trad/i18n';
import './MainScene.scss';

// Get night ambiance texts from i18n
const getNightAmbiance = () => {
  const texts = i18n.t('game:ambiance', { returnObjects: true });
  return Array.isArray(texts) ? texts : [];
};

// ============================================================
// Ground with dirt path
// ============================================================
const GroundPlane = ({ isDay }) => {
  const dirtColor = isDay ? '#D4A574' : '#5a4030';
  const grassColor = isDay ? '#7EC850' : '#2D4A3E';
  const stoneColor = isDay ? '#C4A882' : '#5a5040';
  return (
    <group>
      {/* Main grass */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[35, 64]} />
        <meshStandardMaterial color={grassColor} flatShading />
      </mesh>
      {/* Central stone plaza */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
        <circleGeometry args={[5.5, 8]} />
        <meshStandardMaterial color={stoneColor} roughness={0.95} flatShading />
      </mesh>
      {/* Dirt paths radiating from center — wider, organic look */}
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2, Math.PI / 4, -Math.PI / 4, 3 * Math.PI / 4, -3 * Math.PI / 4].map((angle, i) => (
        <group key={`path-${i}`}>
          {/* Main path strip */}
          <mesh rotation={[-Math.PI / 2, 0, angle]} position={[Math.sin(angle) * 9, 0.005, Math.cos(angle) * 9]} receiveShadow>
            <planeGeometry args={[2.5, 14]} />
            <meshStandardMaterial color={dirtColor} roughness={1} flatShading />
          </mesh>
          {/* Left edge — rough border */}
          <mesh rotation={[-Math.PI / 2, 0, angle + 0.04]} position={[Math.sin(angle + 0.08) * 9, 0.004, Math.cos(angle + 0.08) * 9]} receiveShadow>
            <planeGeometry args={[1.2, 12]} />
            <meshStandardMaterial color={dirtColor} transparent opacity={0.5} roughness={1} flatShading />
          </mesh>
          {/* Right edge — rough border */}
          <mesh rotation={[-Math.PI / 2, 0, angle - 0.04]} position={[Math.sin(angle - 0.08) * 9, 0.004, Math.cos(angle - 0.08) * 9]} receiveShadow>
            <planeGeometry args={[1.2, 12]} />
            <meshStandardMaterial color={dirtColor} transparent opacity={0.5} roughness={1} flatShading />
          </mesh>
        </group>
      ))}
      {/* Night ground fog layer */}
      {!isDay && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
          <circleGeometry args={[25, 32]} />
          <meshBasicMaterial color="#1B1464" transparent opacity={0.12} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
};

// ============================================================
// Improved Torch with multi-layer flame
// ============================================================
const Torch = ({ position }) => {
  const lightRef = useRef();
  const flameRef = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (lightRef.current) {
      lightRef.current.intensity = 0.8 + Math.sin(t * 8 + position[0]) * 0.2 + Math.sin(t * 13) * 0.1;
    }
    if (flameRef.current) {
      flameRef.current.scale.y = 1 + Math.sin(t * 10 + position[2]) * 0.25;
      flameRef.current.scale.x = 1 + Math.sin(t * 8 + 1) * 0.15;
    }
  });

  return (
    <group position={position}>
      {/* Pole */}
      <mesh position={[0, 0.8, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.06, 1.6, 6]} />
        <meshStandardMaterial color="#5a3a1a" />
      </mesh>
      {/* Bracket */}
      <mesh position={[0, 1.55, 0]}>
        <cylinderGeometry args={[0.08, 0.05, 0.12, 6]} />
        <meshStandardMaterial color="#444" metalness={0.5} roughness={0.5} />
      </mesh>
      {/* Multi-layer flame */}
      <group ref={flameRef} position={[0, 1.68, 0]}>
        {/* Outer flame - red/orange */}
        <mesh>
          <coneGeometry args={[0.1, 0.35, 6]} />
          <meshBasicMaterial color="#ff4400" transparent opacity={0.85} />
        </mesh>
        {/* Mid flame - orange */}
        <mesh position={[0, 0.05, 0]}>
          <coneGeometry args={[0.07, 0.25, 6]} />
          <meshBasicMaterial color="#ff8800" transparent opacity={0.8} />
        </mesh>
        {/* Inner flame - yellow */}
        <mesh position={[0, 0.1, 0]}>
          <coneGeometry args={[0.04, 0.18, 4]} />
          <meshBasicMaterial color="#ffee44" transparent opacity={0.9} />
        </mesh>
        {/* Flame tip - white hot */}
        <mesh position={[0, 0.14, 0]}>
          <coneGeometry args={[0.02, 0.1, 4]} />
          <meshBasicMaterial color="#ffffcc" transparent opacity={0.7} />
        </mesh>
      </group>
      {/* Point light */}
      <pointLight ref={lightRef} position={[0, 1.85, 0]} intensity={0.8} color="#ff8833" distance={6} />
      {/* Smoke particles rising */}
      <TorchSmoke position={[0, 1.9, 0]} />
    </group>
  );
};

// Torch smoke — small rising particles
const TorchSmoke = ({ position }) => {
  const meshRef = useRef();
  const count = 6;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const offsets = useMemo(() =>
    Array.from({ length: count }, () => ({
      speed: 0.3 + Math.random() * 0.4,
      drift: (Math.random() - 0.5) * 0.3,
      phase: Math.random() * Math.PI * 2,
      size: 0.03 + Math.random() * 0.03,
    })), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const o = offsets[i];
      const life = ((t * o.speed + o.phase) % 1);
      dummy.position.set(
        position[0] + Math.sin(t + o.phase) * o.drift,
        position[1] + life * 1.5,
        position[2] + Math.cos(t * 0.7 + o.phase) * o.drift
      );
      const s = o.size * (1 - life * 0.5);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial color="#888888" transparent opacity={0.15} />
    </instancedMesh>
  );
};

// ============================================================
// Low-Poly Procedural Buildings — flat-shaded, bright colors
// ============================================================
const LowPolyCottage = ({ position, rotation = [0, 0, 0], scale = 1, variant = 0 }) => {
  const wallColor = variant % 3 === 0 ? '#F5E6D0' : variant % 3 === 1 ? '#E8DCC8' : '#F0DEC0';
  const roofColor = variant % 2 === 0 ? '#E8734A' : '#D4613A';
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Walls */}
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[2, 2, 2.2]} />
        <meshStandardMaterial color={wallColor} flatShading />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 2.5, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
        <coneGeometry args={[1.9, 1.2, 4]} />
        <meshStandardMaterial color={roofColor} flatShading />
      </mesh>
      {/* Door */}
      <mesh position={[0, 0.55, 1.11]}>
        <boxGeometry args={[0.5, 1.1, 0.05]} />
        <meshStandardMaterial color="#5a3a1a" flatShading />
      </mesh>
      {/* Window */}
      <mesh position={[0.6, 1.3, 1.11]}>
        <boxGeometry args={[0.4, 0.4, 0.05]} />
        <meshBasicMaterial color="#FFD700" transparent opacity={0.5} />
      </mesh>
      {/* Chimney */}
      <mesh position={[-0.6, 2.8, -0.5]} castShadow>
        <boxGeometry args={[0.35, 0.8, 0.35]} />
        <meshStandardMaterial color="#8a7a6a" flatShading />
      </mesh>
    </group>
  );
};

const LowPolyForge = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    {/* Walls — darker stone */}
    <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
      <boxGeometry args={[2.8, 2.2, 2.4]} />
      <meshStandardMaterial color="#B8A898" flatShading />
    </mesh>
    {/* Roof — slanted */}
    <mesh position={[0, 2.6, 0]} rotation={[0, 0, 0]} castShadow>
      <coneGeometry args={[2.2, 1, 4]} />
      <meshStandardMaterial color="#8B4513" flatShading />
    </mesh>
    {/* Big chimney */}
    <mesh position={[0.8, 2.8, -0.6]} castShadow>
      <boxGeometry args={[0.6, 1.4, 0.6]} />
      <meshStandardMaterial color="#6a6a6a" flatShading />
    </mesh>
    {/* Anvil */}
    <mesh position={[-1.2, 0.35, 1.3]} castShadow>
      <boxGeometry args={[0.5, 0.7, 0.3]} />
      <meshStandardMaterial color="#4a4a4a" metalness={0.4} flatShading />
    </mesh>
    {/* Door */}
    <mesh position={[0, 0.65, 1.21]}>
      <boxGeometry args={[0.8, 1.3, 0.05]} />
      <meshStandardMaterial color="#4a2a0a" flatShading />
    </mesh>
    {/* Forge glow */}
    <pointLight position={[0.8, 2, -0.6]} color="#ff6b35" intensity={0.5} distance={6} />
  </group>
);

const LowPolyTavern = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    {/* Main body — wider */}
    <mesh position={[0, 1.2, 0]} castShadow receiveShadow>
      <boxGeometry args={[3.2, 2.4, 2.6]} />
      <meshStandardMaterial color="#F0DEC0" flatShading />
    </mesh>
    {/* Roof */}
    <mesh position={[0, 2.9, 0]} castShadow>
      <coneGeometry args={[2.5, 1.2, 4]} />
      <meshStandardMaterial color="#C45530" flatShading />
    </mesh>
    {/* Second floor overhang */}
    <mesh position={[0, 1.6, 1.35]} castShadow>
      <boxGeometry args={[3.4, 0.1, 0.3]} />
      <meshStandardMaterial color="#8B6914" flatShading />
    </mesh>
    {/* Door */}
    <mesh position={[0, 0.6, 1.31]}>
      <boxGeometry args={[0.7, 1.2, 0.05]} />
      <meshStandardMaterial color="#5a3a1a" flatShading />
    </mesh>
    {/* Sign bracket */}
    <mesh position={[1.2, 1.8, 1.4]} castShadow>
      <boxGeometry args={[0.05, 0.05, 0.4]} />
      <meshStandardMaterial color="#3a3a3a" flatShading />
    </mesh>
    {/* Sign */}
    <mesh position={[1.2, 1.6, 1.6]} castShadow>
      <boxGeometry args={[0.6, 0.4, 0.05]} />
      <meshStandardMaterial color="#8B6914" flatShading />
    </mesh>
    {/* Windows (warm light) */}
    {[[-0.8, 1.5, 1.31], [0.8, 1.5, 1.31]].map((p, i) => (
      <mesh key={i} position={p}>
        <boxGeometry args={[0.45, 0.45, 0.05]} />
        <meshBasicMaterial color="#FFD700" transparent opacity={0.6} />
      </mesh>
    ))}
  </group>
);

const LowPolyChapel = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    {/* Main body — taller */}
    <mesh position={[0, 1.5, 0]} castShadow receiveShadow>
      <boxGeometry args={[2.2, 3, 3]} />
      <meshStandardMaterial color="#E8DCC8" flatShading />
    </mesh>
    {/* Main roof */}
    <mesh position={[0, 3.4, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
      <coneGeometry args={[2.2, 1.2, 4]} />
      <meshStandardMaterial color="#6a6a7a" flatShading />
    </mesh>
    {/* Steeple */}
    <mesh position={[0, 4.5, -1]} castShadow>
      <boxGeometry args={[0.6, 1.2, 0.6]} />
      <meshStandardMaterial color="#E8DCC8" flatShading />
    </mesh>
    <mesh position={[0, 5.5, -1]} castShadow>
      <coneGeometry args={[0.5, 1.2, 4]} />
      <meshStandardMaterial color="#6a6a7a" flatShading />
    </mesh>
    {/* Cross */}
    <mesh position={[0, 6.3, -1]}>
      <boxGeometry args={[0.3, 0.5, 0.05]} />
      <meshStandardMaterial color="#8B6914" flatShading />
    </mesh>
    <mesh position={[0, 6.4, -1]}>
      <boxGeometry args={[0.05, 0.3, 0.3]} />
      <meshStandardMaterial color="#8B6914" flatShading />
    </mesh>
    {/* Arched door */}
    <mesh position={[0, 0.8, 1.51]}>
      <boxGeometry args={[0.6, 1.6, 0.05]} />
      <meshStandardMaterial color="#4a2a0a" flatShading />
    </mesh>
    {/* Round window */}
    <mesh position={[0, 2.4, 1.51]}>
      <circleGeometry args={[0.35, 8]} />
      <meshBasicMaterial color="#FFD700" transparent opacity={0.4} />
    </mesh>
  </group>
);

// Village well — central piece
const LowPolyWell = ({ position = [0, 0, 0], scale = 1 }) => (
  <group position={position} scale={scale}>
    {/* Stone base (cylinder) */}
    <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[1, 1.1, 1, 8]} />
      <meshStandardMaterial color="#9a8a72" flatShading />
    </mesh>
    {/* Inner dark (water) */}
    <mesh position={[0, 0.95, 0]}>
      <cylinderGeometry args={[0.75, 0.75, 0.15, 8]} />
      <meshStandardMaterial color="#1a2a3a" flatShading />
    </mesh>
    {/* Stone rim */}
    <mesh position={[0, 1.05, 0]} castShadow>
      <torusGeometry args={[0.95, 0.12, 6, 8]} />
      <meshStandardMaterial color="#b0a080" flatShading />
    </mesh>
    {/* Left pillar */}
    <mesh position={[-0.7, 1.8, 0]} castShadow>
      <boxGeometry args={[0.12, 1.6, 0.12]} />
      <meshStandardMaterial color="#6b4226" flatShading />
    </mesh>
    {/* Right pillar */}
    <mesh position={[0.7, 1.8, 0]} castShadow>
      <boxGeometry args={[0.12, 1.6, 0.12]} />
      <meshStandardMaterial color="#6b4226" flatShading />
    </mesh>
    {/* Roof beam */}
    <mesh position={[0, 2.6, 0]} castShadow>
      <boxGeometry args={[1.6, 0.1, 0.14]} />
      <meshStandardMaterial color="#5a3a1a" flatShading />
    </mesh>
    {/* Roof (small triangle) */}
    <mesh position={[0, 2.85, 0]} castShadow>
      <coneGeometry args={[0.9, 0.5, 4]} />
      <meshStandardMaterial color="#8B4513" flatShading />
    </mesh>
    {/* Rope winch */}
    <mesh position={[0, 2.3, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.06, 0.06, 1.2, 6]} />
      <meshStandardMaterial color="#6b4226" flatShading />
    </mesh>
    {/* Bucket rope */}
    <mesh position={[0, 1.6, 0]}>
      <cylinderGeometry args={[0.015, 0.015, 1.3, 4]} />
      <meshStandardMaterial color="#8a7a5a" flatShading />
    </mesh>
    {/* Bucket */}
    <mesh position={[0, 0.9, 0]} castShadow>
      <cylinderGeometry args={[0.12, 0.15, 0.25, 6]} />
      <meshStandardMaterial color="#5a3a1a" flatShading />
    </mesh>
  </group>
);

const LowPolyMountain = ({ position, scale = 1, variant = 0 }) => (
  <group position={position}>
    {/* Main peak */}
    <mesh position={[0, scale * 2, 0]} castShadow>
      <coneGeometry args={[scale * 3, scale * 4, 5 + variant % 3]} />
      <meshStandardMaterial color={variant % 2 === 0 ? '#7a8a6a' : '#6a7a5a'} flatShading />
    </mesh>
    {/* Snow cap */}
    <mesh position={[0, scale * 3.5, 0]}>
      <coneGeometry args={[scale * 1.2, scale * 1.2, 5 + variant % 3]} />
      <meshStandardMaterial color="#f0f0f0" flatShading />
    </mesh>
    {/* Secondary smaller peak */}
    <mesh position={[scale * 1.5, scale * 1.2, scale * 0.5]} castShadow>
      <coneGeometry args={[scale * 1.8, scale * 2.5, 4]} />
      <meshStandardMaterial color={variant % 2 === 0 ? '#6a7a5a' : '#7a8a6a'} flatShading />
    </mesh>
  </group>
);

// Preload village center models
useGLTF.preload('/models/fountain-round-detail.glb');
useGLTF.preload('/models/road.glb');

const VillageCenter = () => (
  <group>
    {/* Fontaine au centre de la place */}
    <KenneyModel path="/models/fountain-round-detail.glb" position={[0, 0, 0]} scale={1.8} />
    {/* Puits KayKit à côté */}
    <KenneyModel path="/models/kaykit/building_well_red.gltf" position={[-5, 0, 3]} scale={2.5} />
  </group>
);

// ============================================================
// Low-poly Tree
// ============================================================
const LowPolyTree = ({ position, scale = 1, variant = 0 }) => (
  <group position={position} scale={scale} rotation={[0, variant * 1.3, 0]}>
    {/* Trunk */}
    <mesh position={[0, 0.6, 0]} castShadow>
      <cylinderGeometry args={[0.06, 0.1, 1.2, 5]} />
      <meshStandardMaterial color="#8B6914" flatShading />
    </mesh>
    {/* Foliage layers */}
    <mesh position={[0, 1.5, 0]} castShadow>
      <coneGeometry args={[0.9, 1.6, 6]} />
      <meshStandardMaterial color={variant % 2 === 0 ? '#4CAF50' : '#3d9142'} flatShading />
    </mesh>
    <mesh position={[0, 2.1, 0]} castShadow>
      <coneGeometry args={[0.65, 1.2, 6]} />
      <meshStandardMaterial color={variant % 2 === 0 ? '#5BBF5E' : '#4CAF50'} flatShading />
    </mesh>
    <mesh position={[0, 2.5, 0]} castShadow>
      <coneGeometry args={[0.4, 0.9, 5]} />
      <meshStandardMaterial color="#66CC66" flatShading />
    </mesh>
  </group>
);

// ============================================================
// Low-poly Cart — wooden cart with wheels
// ============================================================
const LowPolyCart = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    {/* Cart bed */}
    <mesh position={[0, 0.45, 0]} castShadow>
      <boxGeometry args={[1.6, 0.1, 0.9]} />
      <meshStandardMaterial color="#6b4226" />
    </mesh>
    {/* Side walls */}
    <mesh position={[0, 0.65, 0.4]} castShadow>
      <boxGeometry args={[1.6, 0.3, 0.05]} />
      <meshStandardMaterial color="#5a3a1a" />
    </mesh>
    <mesh position={[0, 0.65, -0.4]} castShadow>
      <boxGeometry args={[1.6, 0.3, 0.05]} />
      <meshStandardMaterial color="#5a3a1a" />
    </mesh>
    <mesh position={[-0.77, 0.65, 0]} castShadow>
      <boxGeometry args={[0.05, 0.3, 0.9]} />
      <meshStandardMaterial color="#5a3a1a" />
    </mesh>
    {/* Wheels */}
    {[[-0.5, 0.25, 0.5], [-0.5, 0.25, -0.5], [0.5, 0.25, 0.5], [0.5, 0.25, -0.5]].map((p, i) => (
      <mesh key={i} position={p} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[0.2, 0.04, 6, 8]} />
        <meshStandardMaterial color="#4a3a2a" />
      </mesh>
    ))}
    {/* Axles */}
    <mesh position={[-0.5, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.03, 0.03, 1.1, 4]} />
      <meshStandardMaterial color="#3a2a1a" />
    </mesh>
    <mesh position={[0.5, 0.25, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.03, 0.03, 1.1, 4]} />
      <meshStandardMaterial color="#3a2a1a" />
    </mesh>
    {/* Handle */}
    <mesh position={[1.1, 0.5, 0]} rotation={[0, 0, -0.2]} castShadow>
      <boxGeometry args={[0.8, 0.05, 0.05]} />
      <meshStandardMaterial color="#5a3a1a" />
    </mesh>
    {/* Hay in cart */}
    <mesh position={[-0.1, 0.6, 0]}>
      <sphereGeometry args={[0.35, 5, 4]} />
      <meshStandardMaterial color="#c4a44a" roughness={1} />
    </mesh>
  </group>
);

// ============================================================
// Low-poly Crates & Barrels stack
// ============================================================
const LowPolyCrates = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    {/* Large crate */}
    <mesh position={[0, 0.3, 0]} rotation={[0, 0.3, 0]} castShadow>
      <boxGeometry args={[0.6, 0.6, 0.6]} />
      <meshStandardMaterial color="#7a5a2a" roughness={0.9} />
    </mesh>
    {/* Small crate on top */}
    <mesh position={[0.05, 0.75, 0.05]} rotation={[0, 0.8, 0]} castShadow>
      <boxGeometry args={[0.4, 0.3, 0.4]} />
      <meshStandardMaterial color="#8a6a3a" roughness={0.9} />
    </mesh>
    {/* Barrel */}
    <mesh position={[0.5, 0.35, 0.2]} castShadow>
      <cylinderGeometry args={[0.22, 0.2, 0.7, 8]} />
      <meshStandardMaterial color="#5a3a1a" roughness={0.85} />
    </mesh>
    {/* Barrel bands */}
    <mesh position={[0.5, 0.2, 0.2]}>
      <torusGeometry args={[0.21, 0.015, 4, 8]} />
      <meshStandardMaterial color="#3a3a3a" metalness={0.4} />
    </mesh>
    <mesh position={[0.5, 0.5, 0.2]}>
      <torusGeometry args={[0.21, 0.015, 4, 8]} />
      <meshStandardMaterial color="#3a3a3a" metalness={0.4} />
    </mesh>
  </group>
);

// ============================================================
// Low-poly Rock
// ============================================================
const LowPolyRock = ({ position, scale = 1, variant = 0 }) => (
  <mesh position={[position[0], position[1] + scale * 0.15, position[2]]} rotation={[variant * 0.3, variant * 1.1, variant * 0.2]} scale={[scale, scale * 0.6, scale * 0.9]} castShadow>
    <dodecahedronGeometry args={[0.35, 0]} />
    <meshStandardMaterial color={variant % 2 === 0 ? '#9a9585' : '#a8a090'} roughness={0.95} flatShading />
  </mesh>
);

// ============================================================
// Low-poly Bush
// ============================================================
const LowPolyBush = ({ position, scale = 1, variant = 0 }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 0.2, 0]} castShadow>
      <dodecahedronGeometry args={[0.35, 1]} />
      <meshStandardMaterial color={variant % 2 === 0 ? '#4CAF50' : '#3d9142'} roughness={0.9} flatShading />
    </mesh>
    <mesh position={[0.25, 0.15, 0.15]} castShadow>
      <dodecahedronGeometry args={[0.25, 1]} />
      <meshStandardMaterial color="#5BBF5E" roughness={0.9} flatShading />
    </mesh>
  </group>
);

// ============================================================
// Low-poly Fence segment
// ============================================================
const LowPolyFence = ({ start, end }) => {
  const dx = end[0] - start[0], dz = end[2] - start[2];
  const len = Math.sqrt(dx * dx + dz * dz);
  const angle = Math.atan2(dx, dz);
  const cx = (start[0] + end[0]) / 2, cz = (start[2] + end[2]) / 2;
  const postCount = Math.max(2, Math.round(len / 1.2));
  return (
    <group>
      {/* Horizontal rails */}
      <mesh position={[cx, 0.35, cz]} rotation={[0, angle, 0]} castShadow>
        <boxGeometry args={[0.04, 0.04, len]} />
        <meshStandardMaterial color="#5a3a1a" />
      </mesh>
      <mesh position={[cx, 0.6, cz]} rotation={[0, angle, 0]} castShadow>
        <boxGeometry args={[0.04, 0.04, len]} />
        <meshStandardMaterial color="#5a3a1a" />
      </mesh>
      {/* Posts */}
      {Array.from({ length: postCount }, (_, i) => {
        const t = i / (postCount - 1);
        return (
          <mesh key={i} position={[start[0] + dx * t, 0.4, start[2] + dz * t]} castShadow>
            <boxGeometry args={[0.06, 0.8, 0.06]} />
            <meshStandardMaterial color="#4a3020" />
          </mesh>
        );
      })}
    </group>
  );
};

// ============================================================
// Low-poly River — sinuous water strip
// ============================================================
const LowPolyRiver = ({ isDay }) => {
  const meshRef = useRef();
  const points = useMemo(() => [
    new THREE.Vector3(25, 0.02, 10),
    new THREE.Vector3(18, 0.02, 12),
    new THREE.Vector3(12, 0.02, 15),
    new THREE.Vector3(5, 0.02, 16),
    new THREE.Vector3(-3, 0.02, 15),
    new THREE.Vector3(-10, 0.02, 17),
    new THREE.Vector3(-18, 0.02, 19),
    new THREE.Vector3(-25, 0.02, 20),
  ], []);

  const { geometry, basePositions } = useMemo(() => {
    const verts = [];
    const indices = [];
    const width = 1.2;
    points.forEach((p, i) => {
      const next = points[Math.min(i + 1, points.length - 1)];
      const dir = new THREE.Vector3().subVectors(next, p).normalize();
      const perp = new THREE.Vector3(-dir.z, 0, dir.x);
      verts.push(p.x + perp.x * width, p.y, p.z + perp.z * width);
      verts.push(p.x - perp.x * width, p.y, p.z - perp.z * width);
    });
    for (let i = 0; i < points.length - 1; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      indices.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return { geometry: geo, basePositions: [...verts] };
  }, [points]);

  // Animate water surface
  useFrame((state) => {
    if (!meshRef.current) return;
    const positions = meshRef.current.geometry.attributes.position;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < positions.count; i++) {
      const baseY = basePositions[i * 3 + 1];
      const x = basePositions[i * 3];
      positions.array[i * 3 + 1] = baseY + Math.sin(t * 1.5 + x * 0.3 + i * 0.5) * 0.04;
    }
    positions.needsUpdate = true;
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color={isDay ? '#3A8BC9' : '#1a3a5a'}
        transparent
        opacity={0.7}
        roughness={0.05}
        metalness={0.4}
        envMapIntensity={0.8}
      />
    </mesh>
  );
};

// ============================================================
// Low-poly Bridge over river
// ============================================================
const LowPolyBridge = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    {/* Deck */}
    <mesh position={[0, 0.15, 0]} castShadow>
      <boxGeometry args={[2.0, 0.1, 1.2]} />
      <meshStandardMaterial color="#6b4226" />
    </mesh>
    {/* Planks (visual) */}
    {Array.from({ length: 6 }, (_, i) => (
      <mesh key={i} position={[-0.75 + i * 0.3, 0.21, 0]} castShadow>
        <boxGeometry args={[0.25, 0.02, 1.15]} />
        <meshStandardMaterial color={i % 2 === 0 ? '#7a5a3a' : '#6b4a2a'} />
      </mesh>
    ))}
    {/* Railings */}
    {[-0.55, 0.55].map((z, i) => (
      <group key={i}>
        <mesh position={[-0.8, 0.45, z]} castShadow>
          <boxGeometry args={[0.06, 0.6, 0.06]} />
          <meshStandardMaterial color="#4a3020" />
        </mesh>
        <mesh position={[0.8, 0.45, z]} castShadow>
          <boxGeometry args={[0.06, 0.6, 0.06]} />
          <meshStandardMaterial color="#4a3020" />
        </mesh>
        <mesh position={[0, 0.7, z]} castShadow>
          <boxGeometry args={[1.8, 0.04, 0.04]} />
          <meshStandardMaterial color="#5a3a1a" />
        </mesh>
      </group>
    ))}
  </group>
);

// ============================================================
// Low-poly Hay Bale
// ============================================================
const LowPolyHayBale = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <mesh position={[position[0], position[1] + 0.25 * scale, position[2]]} rotation={rotation} scale={scale} castShadow>
    <cylinderGeometry args={[0.3, 0.3, 0.4, 8]} />
    <meshStandardMaterial color="#c4a44a" roughness={1} />
  </mesh>
);

// ============================================================
// Dark ambiance — blood, claw marks, skulls, warning signs
// ============================================================

// ============================================================
// Kenney Graveyard Kit assets — CC0 low-poly props
// ============================================================
const KenneyModel = React.memo(({ path, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) => {
  const { scene } = useGLTF(path);
  const clone = useMemo(() => {
    const c = scene.clone();
    c.traverse((child) => {
      if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
    });
    return c;
  }, [scene]);
  return <primitive object={clone} position={position} rotation={rotation} scale={typeof scale === 'number' ? [scale, scale, scale] : scale} />;
});

// Preload all Kenney assets
useGLTF.preload('/models/gravestone-cross.glb');
useGLTF.preload('/models/gravestone-round.glb');
useGLTF.preload('/models/gravestone-broken.glb');
useGLTF.preload('/models/cross-wood.glb');
useGLTF.preload('/models/lantern-candle.glb');
useGLTF.preload('/models/coffin-old.glb');
useGLTF.preload('/models/shovel-dirt.glb');
useGLTF.preload('/models/candle-multiple.glb');
useGLTF.preload('/models/iron-fence-damaged.glb');
useGLTF.preload('/models/pumpkin-carved.glb');

// ============================================================
// Decoration positions
// ============================================================
const ROCK_POSITIONS = [
  { position: [-6, 0, 5], scale: 0.8, variant: 0 },
  { position: [7, 0, 6], scale: 0.6, variant: 1 },
  { position: [-3, 0, -7], scale: 0.5, variant: 2 },
  { position: [12, 0, -5], scale: 0.7, variant: 3 },
  { position: [-14, 0, 3], scale: 0.9, variant: 4 },
  { position: [5, 0, 11], scale: 0.5, variant: 5 },
  { position: [-18, 0, -8], scale: 1.0, variant: 6 },
  { position: [18, 0, 9], scale: 0.6, variant: 7 },
  { position: [-8, 0, -14], scale: 0.7, variant: 8 },
  { position: [3, 0, -14], scale: 0.8, variant: 9 },
];

const BUSH_POSITIONS = [
  { position: [-5, 0, 7], scale: 0.9, variant: 0 },
  { position: [6, 0, 8], scale: 0.7, variant: 1 },
  { position: [-12, 0, 5], scale: 1.0, variant: 2 },
  { position: [12, 0, 4], scale: 0.8, variant: 3 },
  { position: [-9, 0, 11], scale: 0.6, variant: 4 },
  { position: [8, 0, 12], scale: 0.7, variant: 5 },
  { position: [-16, 0, -7], scale: 0.8, variant: 6 },
  { position: [16, 0, -8], scale: 0.9, variant: 7 },
  { position: [0, 0, -17], scale: 0.7, variant: 8 },
  { position: [-2, 0, 14], scale: 0.8, variant: 9 },
  { position: [14, 0, 14], scale: 0.6, variant: 10 },
  { position: [-15, 0, 13], scale: 0.7, variant: 11 },
];

const FENCE_SEGMENTS = [
  { start: [-7, 0, 5.5], end: [-4, 0, 6.5] },
  { start: [4, 0, 6.5], end: [7, 0, 5.5] },
  { start: [-12, 0, -3], end: [-12, 0, 0] },
  { start: [12, 0, -3], end: [12, 0, 0] },
  { start: [-5, 0, 14], end: [5, 0, 14] },
];

const HAY_POSITIONS = [
  { position: [-8, 0, 3], rotation: [0, 0.5, 0] },
  { position: [8.5, 0, 4], rotation: [0, -0.3, 0] },
  { position: [-8.2, 0, 3.5], rotation: [Math.PI / 2, 0, 0.4] },
  { position: [11, 0, 10], rotation: [0, 1.2, 0] },
  { position: [-13, 0, -8], rotation: [0, 0.7, 0] },
];

// ============================================================
// Village Layout — Low-Poly Procedural
// ============================================================
const faceCenter = (bx, bz) => Math.atan2(-bx, -bz);

// Building positions — all rotated to face center
const BUILDING_POSITIONS = [
  // Unique buildings — bigger scale
  { type: 'forge',   position: [-9, 0, -7],   scale: 1.8, get rotation() { return [0, faceCenter(-9, -7), 0]; } },
  { type: 'tavern',  position: [9, 0, -7],    scale: 1.8, get rotation() { return [0, faceCenter(9, -7), 0]; } },
  { type: 'chapel',  position: [0, 0, -12],   scale: 2.0, get rotation() { return [0, faceCenter(0, -12), 0]; } },
  // Inner ring cottages
  { type: 'cottage', position: [-10, 0, 1],   scale: 1.6, variant: 0, get rotation() { return [0, faceCenter(-10, 1), 0]; } },
  { type: 'cottage', position: [10, 0, 2],    scale: 1.6, variant: 1, get rotation() { return [0, faceCenter(10, 2), 0]; } },
  { type: 'cottage', position: [-7, 0, 8],    scale: 1.5, variant: 2, get rotation() { return [0, faceCenter(-7, 8), 0]; } },
  { type: 'cottage', position: [7, 0, 9],     scale: 1.5, variant: 0, get rotation() { return [0, faceCenter(7, 9), 0]; } },
  { type: 'cottage', position: [-5, 0, -10],  scale: 1.5, variant: 1, get rotation() { return [0, faceCenter(-5, -10), 0]; } },
  // Outer ring — more cottages
  { type: 'cottage', position: [-15, 0, -8],  scale: 1.4, variant: 2, get rotation() { return [0, faceCenter(-15, -8), 0]; } },
  { type: 'cottage', position: [15, 0, -8],   scale: 1.4, variant: 0, get rotation() { return [0, faceCenter(15, -8), 0]; } },
  { type: 'cottage', position: [-14, 0, 5],   scale: 1.4, variant: 1, get rotation() { return [0, faceCenter(-14, 5), 0]; } },
  { type: 'cottage', position: [14, 0, 6],    scale: 1.4, variant: 2, get rotation() { return [0, faceCenter(14, 6), 0]; } },
  { type: 'cottage', position: [-3, 0, 13],   scale: 1.4, variant: 0, get rotation() { return [0, faceCenter(-3, 13), 0]; } },
  { type: 'cottage', position: [3, 0, 14],    scale: 1.4, variant: 1, get rotation() { return [0, faceCenter(3, 14), 0]; } },
  // Extra cottages
  { type: 'cottage', position: [-17, 0, -2],  scale: 1.3, variant: 2, get rotation() { return [0, faceCenter(-17, -2), 0]; } },
  { type: 'cottage', position: [17, 0, -1],   scale: 1.3, variant: 0, get rotation() { return [0, faceCenter(17, -1), 0]; } },
  { type: 'cottage', position: [0, 0, 16],    scale: 1.3, variant: 1, get rotation() { return [0, faceCenter(0, 16), 0]; } },
];

// Background mountains — procedural cones
const MOUNTAINS = [
  // North
  { position: [0, 0, -30],   scale: 5, variant: 0 },
  { position: [-15, 0, -28], scale: 3.5, variant: 7 },
  { position: [15, 0, -28],  scale: 4, variant: 8 },
  // Northwest / Northeast
  { position: [-25, 0, -20], scale: 4, variant: 1 },
  { position: [25, 0, -20],  scale: 4.5, variant: 2 },
  // West / East
  { position: [-30, 0, 0],   scale: 3.5, variant: 3 },
  { position: [30, 0, 0],    scale: 3.5, variant: 4 },
  { position: [-32, 0, -10], scale: 3, variant: 9 },
  { position: [32, 0, -10],  scale: 3, variant: 10 },
  // Southwest / Southeast
  { position: [-25, 0, 18],  scale: 4, variant: 5 },
  { position: [25, 0, 18],   scale: 4, variant: 6 },
  { position: [-30, 0, 10],  scale: 3, variant: 11 },
  { position: [30, 0, 10],   scale: 3, variant: 12 },
  // South — fill the gap
  { position: [0, 0, 28],    scale: 4.5, variant: 13 },
  { position: [-15, 0, 25],  scale: 3.5, variant: 14 },
  { position: [15, 0, 25],   scale: 3.5, variant: 15 },
];

const TORCH_POS = [
  [-4, 0, -4], [4, 0, -4], [-4, 0, 4], [4, 0, 4],
];

const TREE_POSITIONS = [
  [-13, 0, -10], [-15, 0, 0], [-13, 0, 8], [-8, 0, 12],
  [13, 0, -8], [15, 0, 2], [11, 0, 11], [0, 0, 14],
  [-16, 0, -5], [16, 0, -3], [-11, 0, -13], [9, 0, -13],
  [-17, 0, 6], [17, 0, 7], [0, 0, -15], [5, 0, 15],
  [-14, 0, 12], [14, 0, -11],
];

// KayKit model paths mapped by building type
const KAYKIT_PATHS = {
  forge:   '/models/kaykit/building_blacksmith_red.gltf',
  tavern:  '/models/kaykit/building_tavern_red.gltf',
  chapel:  '/models/kaykit/building_church_red.gltf',
  cottage: '/models/kaykit/building_home_A_red.gltf',
  cottageB:'/models/kaykit/building_home_B_red.gltf',
};

// Preload KayKit buildings
Object.values(KAYKIT_PATHS).forEach((p) => useGLTF.preload(p));
useGLTF.preload('/models/kaykit/building_well_red.gltf');
useGLTF.preload('/models/kaykit/tree_single_A.gltf');
useGLTF.preload('/models/kaykit/tree_single_B.gltf');
useGLTF.preload('/models/kaykit/barrel.gltf');
useGLTF.preload('/models/kaykit/crate_A_big.gltf');
useGLTF.preload('/models/kaykit/flag_red.gltf');
useGLTF.preload('/models/kaykit/resource_lumber.gltf');
useGLTF.preload('/models/kaykit/rock_single_A.gltf');

const BuildingRenderer = ({ type, position, rotation, scale, variant = 0 }) => {
  const path = type === 'cottage' && variant % 2 === 1
    ? KAYKIT_PATHS.cottageB
    : KAYKIT_PATHS[type] || KAYKIT_PATHS.cottage;
  return <KenneyModel path={path} position={position} rotation={rotation} scale={scale * 3} />;
};

const Village = React.memo(({ isDay }) => (
  <group>
    {/* ——— CENTRE : Potence ——— */}
    <VillageCenter />

    {/* ——— BATIMENTS : procéduraux low-poly ——— */}
    {BUILDING_POSITIONS.map((b, i) => (
      <BuildingRenderer key={`bld-${i}`} {...b} />
    ))}

    {/* ——— TORCHES ——— */}
    {TORCH_POS.map((pos, i) => (
      <Torch key={`torch-${i}`} position={pos} />
    ))}

    {/* ——— MONTAGNES KayKit en arriere-plan ——— */}
    {MOUNTAINS.map((m, i) => (
      <KenneyModel key={`mountain-${i}`} path="/models/kaykit/mountain_A_grass_trees.gltf"
        position={m.position} scale={m.scale * 2.5} rotation={[0, i * 1.5, 0]} />
    ))}

    {/* ——— ARBRES KayKit (remplace les cones proceduraux) ——— */}
    {TREE_POSITIONS.map((pos, i) => (
      <KenneyModel key={`tree-${i}`}
        path={i % 2 === 0 ? '/models/kaykit/tree_single_A.gltf' : '/models/kaykit/tree_single_B.gltf'}
        position={pos} scale={2 + (i % 4) * 0.5} rotation={[0, i * 1.3, 0]} />
    ))}

    {/* ——— DECORATIONS : charrette ——— */}
    <LowPolyCart position={[7, 0, -3]} rotation={[0, -0.8, 0]} scale={1.1} />

    {/* ——— ROCHERS KayKit ——— */}
    {ROCK_POSITIONS.map((r, i) => (
      <KenneyModel key={`rock-${i}`} path="/models/kaykit/rock_single_A.gltf"
        position={r.position} scale={r.scale * 3} rotation={[0, i * 2.1, 0]} />
    ))}

    {/* ——— BUISSONS (ameliores) ——— */}
    {BUSH_POSITIONS.map((b, i) => (
      <KenneyModel key={`bush-${i}`}
        path={i % 2 === 0 ? '/models/kaykit/tree_single_A.gltf' : '/models/kaykit/tree_single_B.gltf'}
        position={b.position} scale={b.scale * 1.2} rotation={[0, i * 0.8, 0]} />
    ))}

    {/* ——— DECORS KAYKIT entre les maisons ——— */}
    {/* Arbres KayKit entre les bâtiments */}
    <KenneyModel path="/models/kaykit/tree_single_A.gltf" position={[-6, 0, -1]} scale={3} />
    <KenneyModel path="/models/kaykit/tree_single_B.gltf" position={[6, 0, -1]} scale={2.8} />
    <KenneyModel path="/models/kaykit/tree_single_A.gltf" position={[-12, 0, 3]} scale={3.2} />
    <KenneyModel path="/models/kaykit/tree_single_B.gltf" position={[12, 0, 4]} scale={2.5} />
    <KenneyModel path="/models/kaykit/tree_single_A.gltf" position={[-3, 0, 11]} scale={2.8} />
    <KenneyModel path="/models/kaykit/tree_single_B.gltf" position={[3, 0, 11]} scale={3} />

    {/* Tonneaux et caisses à côté des maisons */}
    <KenneyModel path="/models/kaykit/barrel.gltf" position={[-8, 0, -5.5]} rotation={[0, 0.5, 0]} scale={2.5} />
    <KenneyModel path="/models/kaykit/barrel.gltf" position={[8, 0, -5]} rotation={[0, -0.8, 0]} scale={2.5} />
    <KenneyModel path="/models/kaykit/barrel.gltf" position={[-11, 0, 3]} rotation={[0, 1.2, 0]} scale={2.2} />
    <KenneyModel path="/models/kaykit/crate_A_big.gltf" position={[11, 0, 3.5]} rotation={[0, 0.3, 0]} scale={2.5} />
    <KenneyModel path="/models/kaykit/crate_A_big.gltf" position={[-6, 0, 6.5]} rotation={[0, -0.5, 0]} scale={2.2} />
    <KenneyModel path="/models/kaykit/resource_lumber.gltf" position={[-8.5, 0, -8.5]} rotation={[0, 0.7, 0]} scale={2.5} />
    <KenneyModel path="/models/kaykit/resource_lumber.gltf" position={[7, 0, 7]} rotation={[0, -0.4, 0]} scale={2.2} />

    {/* Drapeaux */}
    <KenneyModel path="/models/kaykit/flag_red.gltf" position={[-4, 0, -4.5]} rotation={[0, 0.3, 0]} scale={3} />
    <KenneyModel path="/models/kaykit/flag_red.gltf" position={[4, 0, -4.5]} rotation={[0, -0.3, 0]} scale={3} />

    {/* Rochers KayKit */}
    <KenneyModel path="/models/kaykit/rock_single_A.gltf" position={[-14, 0, -5]} scale={3} />
    <KenneyModel path="/models/kaykit/rock_single_A.gltf" position={[15, 0, 3]} scale={2.5} />

    {/* Lumières chaleureuses entre les maisons — reduced to avoid white textures */}
    <pointLight position={[-9, 2, -6]} color="#ff9944" intensity={0.6} distance={6} />
    <pointLight position={[9, 2, -6]} color="#ff9944" intensity={0.6} distance={6} />
    <pointLight position={[-10, 2, 2]} color="#ff8833" intensity={0.5} distance={5} />
    <pointLight position={[10, 2, 3]} color="#ff8833" intensity={0.5} distance={5} />
    <pointLight position={[-7, 2, 8]} color="#ff9944" intensity={0.4} distance={5} />
    <pointLight position={[7, 2, 9]} color="#ff9944" intensity={0.4} distance={5} />
    <pointLight position={[0, 2, -11]} color="#ffaa55" intensity={0.6} distance={6} />

    {/* ——— CLOTURES ——— */}
    {FENCE_SEGMENTS.map((f, i) => (
      <LowPolyFence key={`fence-${i}`} start={f.start} end={f.end} />
    ))}

    {/* ——— BOTTES DE FOIN ——— */}
    {HAY_POSITIONS.map((h, i) => (
      <LowPolyHayBale key={`hay-${i}`} position={h.position} rotation={h.rotation} />
    ))}

    {/* ——— RIVIERE + PONT ——— */}
    <LowPolyRiver isDay={isDay} />
    <LowPolyBridge position={[5, 0, 16]} rotation={[0, 0.15, 0]} scale={1.3} />

    {/* ——— TACHES DE SANG — nuit uniquement, groupes de petites taches ——— */}
    {!isDay && <>
      {/* Cluster spots — each is a group of 4-6 small splatters */}
      {[
        [2, -3], [-3.5, 2], [5, -8], [-8, -5], [0, 5],
        [-1, -1.5], [3, 6], [-6, -9], [8, -6],
      ].map(([cx, cz], ci) => (
        <group key={`blood-cluster-${ci}`}>
          {[
            [0, 0], [0.2, 0.15], [-0.15, 0.2], [0.1, -0.2], [-0.25, -0.1], [0.3, 0.05],
          ].map(([ox, oz], si) => (
            <mesh key={`b-${ci}-${si}`}
              position={[cx + ox, 0.03, cz + oz]}
              rotation={[-Math.PI / 2, 0, (ci * 1.7 + si * 2.3)]}
            >
              <circleGeometry args={[0.06 + (si % 3) * 0.04, 4 + si % 2]} />
              <meshBasicMaterial color={si % 2 === 0 ? '#7a1515' : '#5a0e0e'} transparent opacity={0.55} depthWrite={false} />
            </mesh>
          ))}
        </group>
      ))}
    </>}

    {/* ——— AMBIANCE SOMBRE : Kenney Graveyard Kit (CC0) ——— */}
    {/* Tombes dispersées autour du village */}
    <KenneyModel path="/models/gravestone-cross.glb" position={[-11, 0, -12]} rotation={[0, 0.3, 0]} scale={2.5} />
    <KenneyModel path="/models/gravestone-round.glb" position={[-12.5, 0, -11]} rotation={[0, -0.2, 0]} scale={2.2} />
    <KenneyModel path="/models/gravestone-broken.glb" position={[-10.5, 0, -13]} rotation={[0, 0.8, 0]} scale={2.3} />
    <KenneyModel path="/models/gravestone-cross.glb" position={[13, 0, -12]} rotation={[0, -0.5, 0]} scale={2.2} />
    <KenneyModel path="/models/gravestone-round.glb" position={[14.5, 0, -11.5]} rotation={[0, 0.4, 0]} scale={2} />

    {/* Croix en bois */}
    <KenneyModel path="/models/cross-wood.glb" position={[-16, 0, -4]} rotation={[0, 0.6, 0.05]} scale={2.8} />
    <KenneyModel path="/models/cross-wood.glb" position={[16, 0, -5]} rotation={[0, -0.4, -0.08]} scale={2.5} />

    {/* Lanternes au sol */}
    <KenneyModel path="/models/lantern-candle.glb" position={[-3, 0, -5]} rotation={[0, 1.2, 0]} scale={2.5} />
    <KenneyModel path="/models/lantern-candle.glb" position={[4, 0, 3]} rotation={[0, -0.8, 0]} scale={2.2} />
    <KenneyModel path="/models/lantern-candle.glb" position={[-6, 0, 9]} rotation={[0, 2.1, 0]} scale={2.3} />

    {/* Bougies */}
    <KenneyModel path="/models/candle-multiple.glb" position={[1, 0, -2]} rotation={[0, 0.5, 0]} scale={2.5} />
    <KenneyModel path="/models/candle-multiple.glb" position={[-2, 0, 3.5]} rotation={[0, -1.2, 0]} scale={2.2} />

    {/* Cercueil */}
    <KenneyModel path="/models/coffin-old.glb" position={[-13, 0, -12.5]} rotation={[0, 0.4, 0]} scale={2.5} />

    {/* Pelle */}
    <KenneyModel path="/models/shovel-dirt.glb" position={[-11.5, 0, -10.5]} rotation={[0, -0.3, 0]} scale={2.5} />

    {/* Clôtures en fer */}
    <KenneyModel path="/models/iron-fence-damaged.glb" position={[-9, 0, -13]} rotation={[0, 0.1, 0]} scale={2.5} />
    <KenneyModel path="/models/iron-fence-damaged.glb" position={[11, 0, -13]} rotation={[0, -0.1, 0]} scale={2.5} />

    {/* Citrouilles */}
    <KenneyModel path="/models/pumpkin-carved.glb" position={[8, 0, 3]} rotation={[0, 1.5, 0]} scale={2.5} />
    <KenneyModel path="/models/pumpkin-carved.glb" position={[-5, 0, -9.5]} rotation={[0, -0.7, 0]} scale={2.2} />
  </group>
));

// ============================================================
// Moon (night only)
// ============================================================
const Moon = () => (
  <group position={[-20, 22, -18]}>
    <mesh>
      <sphereGeometry args={[2.5, 16, 16]} />
      <meshBasicMaterial color="#ffffee" />
    </mesh>
    {/* Subtle glow halo */}
    <mesh>
      <sphereGeometry args={[3.2, 16, 16]} />
      <meshBasicMaterial color="#aabbdd" transparent opacity={0.08} />
    </mesh>
    <pointLight color="#8899cc" intensity={0.4} distance={80} />
  </group>
);

// ============================================================
// Fireflies (night) — bright green lucioles
// ============================================================
const Fireflies = ({ count = 60 }) => {
  const meshRef = useRef();
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 40,
        y: Math.random() * 5 + 0.3,
        z: (Math.random() - 0.5) * 40,
        speed: Math.random() * 0.5 + 0.1,
        offset: Math.random() * Math.PI * 2,
        size: Math.random() * 0.5 + 0.6,
      });
    }
    return arr;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    particles.forEach((p, i) => {
      const px = p.x + Math.sin(t * p.speed + p.offset) * 2;
      const py = p.y + Math.sin(t * p.speed * 1.3 + p.offset) * 0.6;
      const pz = p.z + Math.cos(t * p.speed * 0.8 + p.offset) * 2;
      dummy.position.set(px, py, pz);
      const pulse = p.size * (0.3 + Math.sin(t * 3.5 + p.offset) * 0.5 + Math.sin(t * 7 + p.offset * 2) * 0.2);
      dummy.scale.setScalar(Math.max(0.05, pulse));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[0.06, 6, 6]} />
      <meshBasicMaterial color="#aaffaa" transparent opacity={0.85} />
    </instancedMesh>
  );
};

// ============================================================
// Day particles — golden pollen + dust motes floating in sunlight
// ============================================================
const DayFireflies = ({ count = 50 }) => {
  const meshRef = useRef();
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 40,
        y: Math.random() * 6 + 0.5,
        z: (Math.random() - 0.5) * 40,
        speed: Math.random() * 0.25 + 0.05,
        offset: Math.random() * Math.PI * 2,
        size: Math.random() * 0.4 + 0.4,
      });
    }
    return arr;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    particles.forEach((p, i) => {
      const px = p.x + Math.sin(t * p.speed + p.offset) * 3;
      const py = p.y + Math.sin(t * p.speed * 1.2 + p.offset) * 0.8;
      const pz = p.z + Math.cos(t * p.speed * 0.7 + p.offset) * 3;
      dummy.position.set(px, py, pz);
      const pulse = p.size * (0.5 + Math.sin(t * 2 + p.offset) * 0.3);
      dummy.scale.setScalar(Math.max(0.05, pulse));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[0.05, 5, 5]} />
      <meshBasicMaterial color="#ffdd66" transparent opacity={0.55} />
    </instancedMesh>
  );
};

// ============================================================
// Floating dust — tiny white specs that drift slowly (both day & night)
// ============================================================
const FloatingDust = ({ count = 80, isDay = true }) => {
  const meshRef = useRef();
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 50,
        y: Math.random() * 8 + 0.2,
        z: (Math.random() - 0.5) * 50,
        speed: Math.random() * 0.15 + 0.03,
        drift: Math.random() * 0.3 + 0.05,
        offset: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    particles.forEach((p, i) => {
      const px = p.x + Math.sin(t * p.drift + p.offset) * 4;
      const py = p.y + Math.sin(t * p.speed * 2 + p.offset) * 1.2;
      const pz = p.z + Math.cos(t * p.drift * 0.6 + p.offset) * 4;
      dummy.position.set(px, py, pz);
      dummy.scale.setScalar(0.3 + Math.sin(t * 1.5 + p.offset) * 0.15);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[0.025, 4, 4]} />
      <meshBasicMaterial color={isDay ? '#ffffff' : '#8899bb'} transparent opacity={isDay ? 0.3 : 0.2} />
    </instancedMesh>
  );
};

// ============================================================
// Ground fog — drifting cloud layers near the ground
// ============================================================
const GroundFog = ({ isDay = true }) => {
  const count = 18;
  const meshRef = useRef();
  const clouds = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      // Day: spawn around buildings (radius 12-25), NOT center plaza
      // Night: spawn everywhere including center
      let x, z;
      if (isDay) {
        const angle = Math.random() * Math.PI * 2;
        const r = 12 + Math.random() * 13; // radius 12 to 25
        x = Math.cos(angle) * r;
        z = Math.sin(angle) * r;
      } else {
        x = (Math.random() - 0.5) * 45;
        z = (Math.random() - 0.5) * 45;
      }
      arr.push({
        x,
        y: Math.random() * 1.2 + 0.3,
        z,
        scaleX: 3 + Math.random() * 5,
        scaleZ: 2 + Math.random() * 4,
        speed: Math.random() * 0.08 + 0.02,
        offset: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    clouds.forEach((c, i) => {
      const px = c.x + Math.sin(t * c.speed + c.offset) * 6;
      const pz = c.z + Math.cos(t * c.speed * 0.7 + c.offset) * 6;
      dummy.position.set(px, c.y, pz);
      dummy.scale.set(c.scaleX, 0.15 + Math.sin(t * 0.5 + c.offset) * 0.05, c.scaleZ);
      dummy.rotation.set(0, t * c.speed * 0.3 + c.offset, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshBasicMaterial
        color={isDay ? '#dde8f0' : '#1a2244'}
        transparent
        opacity={isDay ? 0.12 : 0.25}
        depthWrite={false}
      />
    </instancedMesh>
  );
};

// ============================================================
// Night prowler — dark shadow that roams behind buildings
// ============================================================
// Night rain — falling streaks
const NightRain = ({ count = 300 }) => {
  const meshRef = useRef();
  const drops = useMemo(() => Array.from({ length: count }, () => ({
    x: (Math.random() - 0.5) * 50,
    y: Math.random() * 20,
    z: (Math.random() - 0.5) * 50,
    speed: 15 + Math.random() * 10,
    offset: Math.random() * 20,
  })), [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    drops.forEach((d, i) => {
      d.y -= d.speed * delta;
      if (d.y < 0) d.y = 18 + Math.random() * 4;
      dummy.position.set(d.x, d.y, d.z);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <boxGeometry args={[0.02, 0.5, 0.02]} />
      <meshBasicMaterial color="#8899bb" transparent opacity={0.25} depthWrite={false} />
    </instancedMesh>
  );
};

// Lightning flashes — random bright light bursts
const NightLightning = () => {
  const lightRef = useRef();
  const nextFlash = useRef(3 + Math.random() * 8);
  const flashTimer = useRef(0);

  useFrame((_, delta) => {
    if (!lightRef.current) return;
    flashTimer.current += delta;
    if (flashTimer.current >= nextFlash.current) {
      // Flash!
      lightRef.current.intensity = 8 + Math.random() * 6;
      setTimeout(() => {
        if (lightRef.current) lightRef.current.intensity = 0;
      }, 80 + Math.random() * 60);
      // Double flash sometimes
      if (Math.random() > 0.5) {
        setTimeout(() => {
          if (lightRef.current) lightRef.current.intensity = 5 + Math.random() * 4;
          setTimeout(() => {
            if (lightRef.current) lightRef.current.intensity = 0;
          }, 50);
        }, 200);
      }
      flashTimer.current = 0;
      nextFlash.current = 5 + Math.random() * 12;
    }
  });

  return (
    <directionalLight
      ref={lightRef}
      position={[10, 30, -10]}
      intensity={0}
      color="#ccddff"
    />
  );
};

// Dense black fog patches on the plaza at night
const NightDarkFog = ({ count = 20 }) => {
  const meshRef = useRef();
  const clouds = useMemo(() => Array.from({ length: count }, (_, i) => ({
    x: (Math.sin(i * 1.8) * 14),
    z: (Math.cos(i * 1.4) * 14),
    y: 0.3 + (i % 4) * 0.4,
    scaleX: 3 + (i % 5) * 2,
    scaleZ: 2.5 + (i % 4) * 1.8,
    speed: 0.03 + (i % 5) * 0.008,
    offset: i * 1.1,
  })), [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    clouds.forEach((c, i) => {
      dummy.position.set(
        c.x + Math.sin(t * c.speed + c.offset) * 4,
        c.y,
        c.z + Math.cos(t * c.speed * 0.8 + c.offset) * 4
      );
      dummy.scale.set(c.scaleX, 0.1 + Math.sin(t * 0.3 + c.offset) * 0.05, c.scaleZ);
      dummy.rotation.set(0, t * c.speed * 0.2 + c.offset, 0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[1.5, 7, 5]} />
      <meshBasicMaterial color="#050010" transparent opacity={0.4} depthWrite={false} />
    </instancedMesh>
  );
};

// Crows — circle overhead at night
const NightCrows = ({ count = 4 }) => {
  const meshRef = useRef();
  const birds = useMemo(() => Array.from({ length: count }, (_, i) => ({
    offset: (i / count) * Math.PI * 2,
    radius: 18 + (i % 3) * 4,
    height: 12 + (i % 2) * 5,
    speed: 0.12 + i * 0.02,
    wingPhase: i * 1.7,
  })), [count]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    birds.forEach((b, i) => {
      const angle = t * b.speed + b.offset;
      dummy.position.set(
        Math.cos(angle) * b.radius,
        b.height + Math.sin(t * 0.8 + b.wingPhase) * 1.5,
        Math.sin(angle) * b.radius
      );
      dummy.rotation.set(0, -angle + Math.PI / 2, Math.sin(t * 4 + b.wingPhase) * 0.3);
      dummy.scale.set(1.2, 0.3 + Math.abs(Math.sin(t * 4 + b.wingPhase)) * 0.7, 1);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <boxGeometry args={[0.8, 0.1, 0.3]} />
      <meshBasicMaterial color="#111122" />
    </instancedMesh>
  );
};

// ============================================================
// Day rabbits — procedural bunnies hopping around
// ============================================================
const DayRabbits = ({ count = 5 }) => {
  const rabbits = useMemo(() => Array.from({ length: count }, (_, i) => ({
    baseX: (Math.sin(i * 2.4) * 12) + (i % 2 ? 3 : -3),
    baseZ: (Math.cos(i * 3.1) * 10) + (i % 3 ? 5 : -5),
    speed: 0.3 + (i % 3) * 0.15,
    hopSpeed: 3 + i * 0.5,
    offset: i * 1.8,
    scale: 0.25 + (i % 3) * 0.08,
  })), [count]);

  return (
    <group>
      {rabbits.map((r, i) => (
        <Rabbit key={i} {...r} />
      ))}
    </group>
  );
};

const Rabbit = ({ baseX, baseZ, speed, hopSpeed, offset, scale }) => {
  const groupRef = useRef();

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    // Wander in small circles
    const x = baseX + Math.sin(t * speed + offset) * 3;
    const z = baseZ + Math.cos(t * speed * 0.7 + offset) * 3;
    // Hop
    const hop = Math.abs(Math.sin(t * hopSpeed + offset)) * 0.3;
    groupRef.current.position.set(x, hop, z);
    // Face movement direction
    groupRef.current.rotation.y = Math.atan2(
      Math.cos(t * speed + offset) * speed * 3,
      -Math.sin(t * speed * 0.7 + offset) * speed * 0.7 * 3
    );
  });

  return (
    <group ref={groupRef} scale={scale}>
      {/* Body */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <sphereGeometry args={[0.4, 6, 5]} />
        <meshStandardMaterial color="#d4c0a0" flatShading />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.65, 0.25]} castShadow>
        <sphereGeometry args={[0.25, 6, 5]} />
        <meshStandardMaterial color="#ddd0b8" flatShading />
      </mesh>
      {/* Ears */}
      <mesh position={[-0.08, 1, 0.2]} rotation={[0.3, 0, -0.15]} castShadow>
        <capsuleGeometry args={[0.04, 0.3, 3, 4]} />
        <meshStandardMaterial color="#c8b090" flatShading />
      </mesh>
      <mesh position={[0.08, 1, 0.2]} rotation={[0.3, 0, 0.15]} castShadow>
        <capsuleGeometry args={[0.04, 0.3, 3, 4]} />
        <meshStandardMaterial color="#c8b090" flatShading />
      </mesh>
      {/* Tail */}
      <mesh position={[0, 0.35, -0.35]}>
        <sphereGeometry args={[0.12, 4, 4]} />
        <meshStandardMaterial color="#f0e8d8" flatShading />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.08, 0.72, 0.44]}>
        <sphereGeometry args={[0.03, 4, 4]} />
        <meshBasicMaterial color="#1a1008" />
      </mesh>
      <mesh position={[0.08, 0.72, 0.44]}>
        <sphereGeometry args={[0.03, 4, 4]} />
        <meshBasicMaterial color="#1a1008" />
      </mesh>
    </group>
  );
};

// ============================================================
// Ghost Orb (floats above dead players)
// ============================================================
const GhostOrb = ({ position }) => {
  const ref = useRef();
  useFrame((state) => {
    if (ref.current) {
      const t = state.clock.elapsedTime;
      ref.current.position.y = position[1] + Math.sin(t * 1.2) * 0.25;
      ref.current.material.opacity = 0.25 + Math.sin(t * 2) * 0.15;
    }
  });
  return (
    <mesh ref={ref} position={position}>
      <sphereGeometry args={[0.15, 8, 8]} />
      <meshBasicMaterial color="#aaccff" transparent opacity={0.35} />
    </mesh>
  );
};

// ============================================================
// Phase Emote — contextual floating icon above player
// ============================================================
const PhaseEmote = ({ phase, isAccused, CONSTANTS }) => {
  let iconClass = null;
  let color = '#fff';
  if (isAccused) { iconClass = 'fa-exclamation-triangle'; color = '#ff4444'; }
  else if (phase === CONSTANTS?.PHASE?.JUDGMENT) { iconClass = 'fa-scale-balanced'; color = '#cc88ff'; }
  // Discussion icon removed — handled by ChatBubble on message

  if (!iconClass) return null;

  return (
    <Html position={[0, 2.8, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
      <div style={{
        fontSize: '16px',
        color,
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.7))',
        userSelect: 'none',
      }}>
        <i className={`fas ${iconClass}`}></i>
      </div>
    </Html>
  );
};

// Chat bubble — appears for 2s when player sends a message
const ChatBubble = ({ playerId, chatMessages, dayCount }) => {
  const [visible, setVisible] = useState(false);
  const lastMsgCount = useRef(0);

  useEffect(() => {
    if (!chatMessages || !playerId) return;
    const playerMsgs = chatMessages.filter(
      (m) => m.playerId === playerId && m.type === 'player' && m.dayCount === dayCount
    );
    if (playerMsgs.length > lastMsgCount.current) {
      lastMsgCount.current = playerMsgs.length;
      setVisible(true);
      const timer = setTimeout(() => setVisible(false), 2500);
      return () => clearTimeout(timer);
    }
  }, [chatMessages?.length, playerId, dayCount]);

  if (!visible) return null;

  return (
    <Html position={[0, 2.8, 0]} center distanceFactor={8} style={{ pointerEvents: 'none' }}>
      <div className="chat-bubble-3d">
        <span className="chat-bubble-dot" />
        <span className="chat-bubble-dot" />
        <span className="chat-bubble-dot" />
        <div className="chat-bubble-tail" />
      </div>
    </Html>
  );
};

// ============================================================
// Player Figure — uses Character model with rotation + walk
// ============================================================
const PlayerFigure = ({ player, position, rotation, color, isAccused, showVote, isVoteTarget, onVote, voteCount, totalAlive, showJudgment, onJudge, startPosition, isTransitioning, transitionDuration = 3, characterScale = 0.8, pauseAnim = null, isDay = true, phase = null, CONSTANTS = null, fadeOnTransition = true, chatMessages = null, dayCount = 0 }) => {
  const groupRef = useRef();
  const transitionStartTime = useRef(null);
  const walkStarted = useRef(false);
  const [currentAnim, setCurrentAnim] = useState('Idle');

  useEffect(() => {
    if (isTransitioning && startPosition && !walkStarted.current) {
      // Only start walk ONCE per transition cycle
      walkStarted.current = true;
      transitionStartTime.current = null;
      setCurrentAnim('Walk');
    }
    if (!isTransitioning) {
      walkStarted.current = false;
      setCurrentAnim('Idle');
    }
  }, [isTransitioning]);

  useFrame((state) => {
    if (!groupRef.current) return;

    if (isTransitioning && startPosition) {
      // Initialize transition start time on first frame
      if (transitionStartTime.current === null) {
        transitionStartTime.current = state.clock.elapsedTime;
      }
      const elapsed = state.clock.elapsedTime - transitionStartTime.current;
      const t = Math.min(elapsed / transitionDuration, 1);
      const eased = t * t * (3 - 2 * t); // smoothstep

      // Interpolate position in a straight line
      groupRef.current.position.x = startPosition[0] + (position[0] - startPosition[0]) * eased;
      groupRef.current.position.y = position[1];
      groupRef.current.position.z = startPosition[2] + (position[2] - startPosition[2]) * eased;

      // Face walk direction (fixed, computed from start→end, not from current position)
      const dx = position[0] - startPosition[0];
      const dz = position[2] - startPosition[2];
      groupRef.current.rotation.y = Math.atan2(dx, dz);

      // End walk animation when done
      if (t >= 1 && currentAnim === 'Walk') {
        setCurrentAnim('Idle');
      }
    } else {
      // Stay grounded (no floating)
      groupRef.current.position.y = position[1];
    }
  });

  // Fade-out: make character materials transparent during walk-away (only if fadeOnTransition)
  const charGroupRef = useRef();
  useFrame((state) => {
    if (!charGroupRef.current) return;
    if (isTransitioning && fadeOnTransition && transitionStartTime.current !== null) {
      const elapsed = state.clock.elapsedTime - transitionStartTime.current;
      // Start fading after 2s of walking, fully gone by 4s
      const opacity = Math.max(1 - Math.max(elapsed - 2, 0) / 2, 0);
      charGroupRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.transparent = true;
          child.material.opacity = opacity;
          child.castShadow = opacity > 0.1;
        }
      });
    } else if (charGroupRef.current) {
      // Reset opacity when not transitioning
      charGroupRef.current.traverse((child) => {
        if (child.isMesh && child.material && child.material.opacity < 1) {
          child.material.opacity = 1;
          child.castShadow = true;
        }
      });
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <group ref={charGroupRef}>
        <Character
          color={color}
          animation={pauseAnim || currentAnim}
          scale={characterScale || 0.8}
          animOffset={player.id ? (player.id.charCodeAt(0) % 20) * 0.15 : 0}
        />
      </group>
      {/* Player color glow — only during day, not during walk-away */}
      {isDay && !isTransitioning && <>
        <pointLight position={[0, 0.8, 0]} color={color} intensity={3} distance={5} />
        <pointLight position={[0, 1.5, 0]} color={color} intensity={1.5} distance={3} />
        <pointLight position={[0, 0.2, 0.5]} color={color} intensity={1} distance={2.5} />
        <pointLight position={[0, 0.2, -0.5]} color={color} intensity={1} distance={2.5} />
        <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.3, 0.7, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0.6} />
        </mesh>
        <mesh position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.5, 0.5, 1.8, 16, 1, true]} />
          <meshBasicMaterial color={color} transparent opacity={0.08} side={THREE.DoubleSide} />
        </mesh>
      </>}
      {/* Accused ring */}
      {isAccused && (
        <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.9, 16]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.7} />
        </mesh>
      )}
      {/* Name label + vote counter — hidden during walk-away */}
      {!isTransitioning && <Html position={[0, 2.0, 0]} center distanceFactor={8}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          whiteSpace: 'nowrap',
        }}>
          <div style={{
            color: player.profile?.color || color,
            backgroundColor: 'rgba(0,0,0,0.65)',
            padding: '4px 12px',
            borderRadius: '6px',
            fontSize: '22px',
            fontWeight: 'bold',
            textShadow: '0 2px 6px rgba(0,0,0,0.8)',
            border: `2px solid ${player.profile?.color || color}`,
            letterSpacing: '0.5px',
          }}>
            {player.profile.name}
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
      </Html>}
      {/* Phase emote */}
      {!isTransitioning && phase && CONSTANTS && (
        <PhaseEmote phase={phase} isAccused={isAccused} CONSTANTS={CONSTANTS} />
      )}
      {/* Chat bubble — on message */}
      {!isTransitioning && (
        <ChatBubble playerId={player.id} chatMessages={chatMessages} dayCount={dayCount} />
      )}
      {/* Vote/Judgment buttons removed — handled in action panel */}
    </group>
  );
};

// ============================================================
// Dead Player — Character with Death animation + ghost orb
// ============================================================
const DeadPlayerFigure = ({ player, position }) => (
  <group position={position}>
    <Character
      color="#555555"
      animation="Death"
      weapon="Knife_1"
      scale={0.65}
    />
    <GhostOrb position={[0, 2, 0]} />
    <Html position={[0, 2.4, 0]} center distanceFactor={8}>
      <div style={{
        color: '#888899',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: '3px 10px',
        borderRadius: '5px',
        fontSize: '17px',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        textShadow: '0 2px 4px rgba(0,0,0,0.8)',
        opacity: 0.7,
      }}>
        {player.profile.name}
      </div>
    </Html>
  </group>
);

// ============================================================
// Admin Free-Roam Camera — ZQSD + mouse look
// ============================================================
// Pause player controller — moves the local player's character with ZQSD,
// camera follows behind in third person
// Simple collision check against building positions (circle-based)
const checkCollision = (x, z, y, otherPlayers) => {
  // Buildings
  for (const b of BUILDING_POSITIONS) {
    const bx = b.position[0], bz = b.position[2];
    const s = typeof b.scale === 'number' ? b.scale : 1;
    const dx = x - bx, dz = z - bz;
    const r = 1.8 * s;
    const h = 3.5 * s;
    if (dx * dx + dz * dz < r * r && y < h) return true;
  }
  // Well at center (radius 1.2, height ~2.8)
  if (x * x + z * z < 1.5 && y < 2.8) return true;
  // Mountains (large radius, tall)
  for (const m of MOUNTAINS) {
    const mx = m.position[0], mz = m.position[2];
    const dx = x - mx, dz = z - mz;
    const r = 0.4 * m.scale;
    if (dx * dx + dz * dz < r * r) return true;
  }
  // Other players (small radius, can jump over)
  if (otherPlayers) {
    for (const p of otherPlayers) {
      const dx = x - p[0], dz = z - p[2];
      if (dx * dx + dz * dz < 0.4 && y < 1.5) return true;
    }
  }
  return false;
};

const PausePlayerController = ({ pausePos, setPausePos, setPauseAnim, setPauseYaw, playerRotation, otherPlayerPositions }) => {
  const { camera } = useThree();
  const keys = useRef({});
  const yaw = useRef(0);
  const jumpVel = useRef(0);
  const isGrounded = useRef(true);

  useEffect(() => {
    yaw.current = playerRotation || 0;
  }, []);

  useEffect(() => {
    const onKeyDown = (e) => { keys.current[e.code] = true; };
    const onKeyUp = (e) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useFrame((_, delta) => {
    const speed = 6 * delta;
    const turnSpeed = 2 * delta;
    const k = keys.current;

    // Turn left/right
    if (k['KeyA'] || k['KeyQ'] || k['ArrowLeft']) yaw.current += turnSpeed;
    if (k['KeyD'] || k['ArrowRight']) yaw.current -= turnSpeed;

    // Forward/backward
    const forward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    let moved = false;
    const newPos = [...pausePos];

    if (k['KeyW'] || k['KeyZ'] || k['ArrowUp']) {
      const nx = newPos[0] + forward.x * speed;
      const nz = newPos[2] + forward.z * speed;
      if (!checkCollision(nx, nz, newPos[1] || 0, otherPlayerPositions)) { newPos[0] = nx; newPos[2] = nz; }
      moved = true;
    }
    if (k['KeyS'] || k['ArrowDown']) {
      const nx = newPos[0] - forward.x * speed;
      const nz = newPos[2] - forward.z * speed;
      if (!checkCollision(nx, nz, newPos[1] || 0, otherPlayerPositions)) { newPos[0] = nx; newPos[2] = nz; }
      moved = true;
    }

    // Jump
    if (k['Space'] && isGrounded.current) {
      jumpVel.current = 8;
      isGrounded.current = false;
    }

    // Gravity
    if (!isGrounded.current) {
      jumpVel.current -= 20 * delta;
      newPos[1] = (newPos[1] || 0) + jumpVel.current * delta;
      if (newPos[1] <= 0) {
        newPos[1] = 0;
        isGrounded.current = true;
        jumpVel.current = 0;
      }
    }

    setPausePos(newPos);
    setPauseYaw(yaw.current);

    // Animation state
    if (!isGrounded.current) {
      setPauseAnim('Jump');
    } else if (moved) {
      setPauseAnim('Walk');
    } else {
      setPauseAnim('Idle');
    }

    // Camera follows behind player
    const camDist = 8;
    const camHeight = 5;
    const camX = newPos[0] + Math.sin(yaw.current) * camDist;
    const camZ = newPos[2] + Math.cos(yaw.current) * camDist;
    camera.position.lerp(new THREE.Vector3(camX, camHeight + (newPos[1] || 0), camZ), 0.05);
    camera.lookAt(newPos[0], 1 + (newPos[1] || 0), newPos[2]);
  });

  return null;
};

// ============================================================
// Camera Controller (smooth follow based on phase)
// ============================================================
// Night cinematic camera — slow alley walk then gentle rise to stars
const NIGHT_CAMERA_WAYPOINTS = [
  { pos: [0, 8, 8],       lookAt: [0, 0, 0],        duration: 5 },    // Overview while players walk away
  { pos: [-2, 1.8, 2],    lookAt: [-2, 1.6, -8],    duration: 18 },   // Long slow alley walk
  { pos: [-1, 3.5, -1],   lookAt: [0, 12, -3],       duration: 20 },   // Gentle rise, looking slightly up
  { pos: [0, 4, 0],       lookAt: [0, 15, -2],       duration: 30, hold: true },  // Settled, sky visible but not straight up
];

const CameraController = ({ phase, CONSTANTS }) => {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 8, 12));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const nightTimeRef = useRef(0);
  const prevPhaseRef = useRef(phase);

  useFrame((_, delta) => {
    // Track night elapsed time
    if (phase === CONSTANTS.PHASE.NIGHT) {
      if (prevPhaseRef.current !== CONSTANTS.PHASE.NIGHT) {
        nightTimeRef.current = 0; // reset on entering night
      }
      nightTimeRef.current += delta;

      // Cinematic night waypoints
      let elapsed = nightTimeRef.current;
      let wpIdx = 0;
      let totalBefore = 0;
      for (let i = 0; i < NIGHT_CAMERA_WAYPOINTS.length; i++) {
        if (elapsed < totalBefore + NIGHT_CAMERA_WAYPOINTS[i].duration) {
          wpIdx = i;
          break;
        }
        totalBefore += NIGHT_CAMERA_WAYPOINTS[i].duration;
        if (i === NIGHT_CAMERA_WAYPOINTS.length - 1) wpIdx = i;
      }

      const wp = NIGHT_CAMERA_WAYPOINTS[wpIdx];
      targetPos.current.set(...wp.pos);
      targetLookAt.current.set(...wp.lookAt);

      // If hold waypoint: snap position and freeze looking direction
      if (wp.hold) {
        camera.position.set(...wp.pos);
        camera.lookAt(...wp.lookAt);
        prevPhaseRef.current = phase;
        return;
      }
    } else {
      // Day phases: continuous very slow orbit — same movement for all phases
      const orbitAngle = Date.now() * 0.000008; // ~13 min per full orbit
      const orbitRadius = 12;
      const orbitX = Math.sin(orbitAngle) * orbitRadius;
      const orbitZ = Math.cos(orbitAngle) * orbitRadius;
      targetPos.current.set(orbitX, 9, orbitZ);
      targetLookAt.current.set(0, 0, 0);
    }

    // When leaving night: snap camera to current orbit position (no lerp from stars)
    const comingFromNight = prevPhaseRef.current === CONSTANTS.PHASE.NIGHT && phase !== CONSTANTS.PHASE.NIGHT;
    if (comingFromNight) {
      camera.position.copy(targetPos.current);
      camera.lookAt(0, 0, 0);
    }
    prevPhaseRef.current = phase;

    const lerpSpeed = phase === CONSTANTS.PHASE.NIGHT ? 0.002 : 0.02;
    camera.position.lerp(targetPos.current, lerpSpeed);
    const currentLookAt = new THREE.Vector3();
    camera.getWorldDirection(currentLookAt);
    const desiredDir = targetLookAt.current.clone().sub(camera.position).normalize();
    currentLookAt.lerp(desiredDir, lerpSpeed);
    camera.lookAt(
      camera.position.x + currentLookAt.x,
      camera.position.y + currentLookAt.y,
      camera.position.z + currentLookAt.z
    );
  });

  return null;
};

// ============================================================
// Scene Lighting — warm sunlight (day) / cold moonlight (night)
// ============================================================
const SceneLighting = ({ isDay, isSunset = false }) => {
  const sunRef = useRef();
  const sunGlowRef = useRef();
  const fillRef = useRef();
  const ambientRef = useRef();
  const sunsetProgress = useRef(0); // 0 = full day, 1 = sun on horizon
  const sunColorRef = useRef(new THREE.Color('#fff5e0'));

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // Sunset animation — sun drops to horizon over ~3 seconds
    if (isSunset) {
      sunsetProgress.current = Math.min(sunsetProgress.current + delta * 0.2, 1);
    } else if (isDay) {
      sunsetProgress.current = 0;
    }

    const sp = sunsetProgress.current;
    const sunsetEased = sp * sp; // ease-in for dramatic end

    if (isDay && sunRef.current) {
      const sunAngle = -Math.PI * 0.8 + t * 0.02;
      const baseSunX = Math.cos(sunAngle) * 20;
      const baseSunY = 18 + Math.sin(sunAngle * 0.5) * 6;
      const baseSunZ = -Math.sin(sunAngle) * 20;

      // During sunset, sun drops toward horizon
      const sunX = baseSunX + sunsetEased * 15;
      const sunY = baseSunY * (1 - sunsetEased * 0.85); // drops to ~3
      const sunZ = baseSunZ;
      sunRef.current.position.set(sunX, Math.max(sunY, 1), sunZ);

      // Sun color shifts warm → orange → red
      const dayColor = new THREE.Color('#fff5e0');
      const sunsetColor = new THREE.Color('#ff4400');
      sunColorRef.current.copy(dayColor).lerp(sunsetColor, sunsetEased);
      sunRef.current.color.copy(sunColorRef.current);

      // Intensity dims during sunset
      const intensityTarget = 3.0 * (1 - sunsetEased * 0.7);
      sunRef.current.intensity += (intensityTarget - sunRef.current.intensity) * 0.08;

      if (sunGlowRef.current) {
        sunGlowRef.current.position.set(sunX * 2.5, Math.max(sunY, 1) * 2.5, sunZ * 2.5);
        // Glow goes orange
        sunGlowRef.current.children.forEach((child) => {
          if (child.material) {
            child.material.color.copy(sunColorRef.current);
          }
        });
      }
    }

    // Smooth intensity transitions (day/night)
    if (!isSunset) {
      if (sunRef.current) {
        const target = isDay ? 3.0 : 0.2;
        sunRef.current.intensity += (target - sunRef.current.intensity) * 0.03;
      }
    }
    if (fillRef.current) {
      const target = isDay ? (1.0 - sunsetEased * 0.6) : 0.05;
      fillRef.current.intensity += (target - fillRef.current.intensity) * 0.05;
      if (isSunset) fillRef.current.color.set(sunsetEased > 0.3 ? '#ff8855' : '#ffd4a0');
    }
    if (ambientRef.current) {
      const target = isDay ? (0.6 - sunsetEased * 0.3) : 0.08;
      ambientRef.current.intensity += (target - ambientRef.current.intensity) * 0.05;
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={isDay ? 0.45 : 0.08} />

      <directionalLight
        ref={sunRef}
        position={isDay ? [15, 20, 10] : [-5, 12, 8]}
        intensity={isDay ? 2.0 : 0.2}
        color={isDay ? '#ffe8c8' : '#6677aa'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={60}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-bias={-0.001}
      />

      <directionalLight
        ref={fillRef}
        position={isDay ? [-10, 8, -5] : [5, 6, -8]}
        intensity={isDay ? 0.6 : 0.05}
        color={isDay ? '#ddc8a0' : '#334466'}
      />

      <hemisphereLight
        color={isDay ? '#8ab4cc' : '#1a1a3a'}
        groundColor={isDay ? '#8B7355' : '#0a0a15'}
        intensity={isDay ? 0.3 : 0.05}
      />

      {isDay && (
        <group ref={sunGlowRef} position={[40, 50, 25]}>
          <pointLight color="#fff0cc" intensity={0.5} distance={120} />
          <mesh>
            <sphereGeometry args={[3, 16, 16]} />
            <meshBasicMaterial color="#fffae0" />
          </mesh>
          <mesh>
            <sphereGeometry args={[5, 16, 16]} />
            <meshBasicMaterial color="#fff5cc" transparent opacity={0.15} />
          </mesh>
        </group>
      )}
    </>
  );
};

// ============================================================
// Main Scene Component
// ============================================================
const MainScene = () => {
  const { game, getPlayers, getMe, CONSTANTS, trial, setTrial } = useGameEngine();
  const [chatMessages] = useMultiplayerState('chatMessages', []);
  const [events] = useMultiplayerState('events', []);
  const players = getPlayers();
  const me = getMe();
  const phase = game.phase;
  const [adminCharScale] = useMultiplayerState('adminCharScale', 0.8);
  const characterScale = adminCharScale || 0.8;
  const isPaused = !!game.adminFreeRoam;
  const alivePlayers = players.filter((p) => p.isAlive);
  const deadPlayers = players.filter((p) => !p.isAlive);

  // Pause mode — local player position, animation, rotation
  const [pausePos, setPausePos] = useState(null);
  const [pauseAnim, setPauseAnim] = useState('Idle');
  const [pauseYaw, setPauseYaw] = useState(0);

  const isTrialPhase = [
    CONSTANTS.PHASE.DEFENSE, CONSTANTS.PHASE.JUDGMENT,
    CONSTANTS.PHASE.LAST_WORDS, CONSTANTS.PHASE.EXECUTION,
  ].includes(phase);

  const isVotingPhase = phase === CONSTANTS.PHASE.VOTING;
  const isJudgmentPhase = phase === CONSTANTS.PHASE.JUDGMENT;

  // Black fade: starts fading to black a few seconds before night ends,
  // holds black during transition, then fades in when day starts
  const [nightFade, setNightFade] = useState('none'); // 'none' | 'to-black' | 'from-black'
  const [isSunset, setIsSunset] = useState(false);
  const [showNightText, setShowNightText] = useState(false);
  const [showDayText, setShowDayText] = useState(false);
  const [nightAmbianceMsg, setNightAmbianceMsg] = useState(null);
  const [showDeathReport, setShowDeathReport] = useState(false);
  const [showBloodEffect, setShowBloodEffect] = useState(false);
  const fadeTimerRef = useRef(null);
  const lastPhaseForFade = useRef(phase);

  // Phases that lead directly to night (last phases before night falls)
  const PRE_NIGHT_PHASES = [CONSTANTS.PHASE.NO_LYNCH, CONSTANTS.PHASE.SPARED, CONSTANTS.PHASE.EXECUTION];
  const fadeTimers = useRef([]);
  const walkTimer = useRef(null);

  useEffect(() => {
    // Clear all pending fade timers on phase change
    fadeTimers.current.forEach(clearTimeout);
    fadeTimers.current = [];

    // Pre-night phases: show players, start walk-away, then fade to black
    if (PRE_NIGHT_PHASES.includes(phase)) {
      // Start sunset animation immediately
      setIsSunset(true);
      // Ensure players are visible for walk-away
      setNightPlayersHidden(false);
      // Delay fade so sunset animation is fully visible (~5s)
      fadeTimers.current.push(setTimeout(() => {
        setNightFade('to-black');
      }, 4000));
      // Show "La nuit tombe..." AFTER the screen is black (fade takes 1.5s)
      fadeTimers.current.push(setTimeout(() => {
        setShowNightText(true);
      }, 5800));
      // Trigger walk-away animation (separate timer, not cleared on phase change)
      if (nightStartedForDay.current !== game.dayCount) {
        nightStartedForDay.current = game.dayCount;
        setNightTransition(true);
        if (walkTimer.current) clearTimeout(walkTimer.current);
        walkTimer.current = setTimeout(() => {
          setNightTransition(false);
          setNightPlayersHidden(true);
        }, 4000);
      }
    }

    // Night starts: already black from pre-night, reveal night scene quickly
    if (phase === CONSTANTS.PHASE.NIGHT && lastPhaseForFade.current !== CONSTANTS.PHASE.NIGHT) {
      // Ensure players are hidden during night (safety net)
      setNightPlayersHidden(true);
      setNightTransition(false);
      // Hide text after it finishes its animation
      fadeTimers.current.push(setTimeout(() => setShowNightText(false), 3000));
      setNightFade('from-black');
      fadeTimers.current.push(setTimeout(() => setNightFade('none'), 1500));

      // Schedule fade-to-black before night ends (for night→day)
      const nightDuration = CONSTANTS.DURATIONS?.NIGHT || 30000;
      fadeTimers.current.push(setTimeout(() => {
        setNightFade('to-black');
      }, nightDuration - 3000));
      // Show "Le village se lève..." AFTER screen is black
      fadeTimers.current.push(setTimeout(() => {
        setShowDayText(true);
      }, nightDuration - 1000));

      // Night ambiance messages — 3 messages during the night
      const shuffled = [...getNightAmbiance()].sort(() => Math.random() - 0.5);
      fadeTimers.current.push(setTimeout(() => {
        setNightAmbianceMsg(shuffled[0]);
        setTimeout(() => setNightAmbianceMsg(null), 6000);
      }, 6000));
      fadeTimers.current.push(setTimeout(() => {
        setNightAmbianceMsg(shuffled[1]);
        setTimeout(() => setNightAmbianceMsg(null), 6000);
      }, 13000));
      fadeTimers.current.push(setTimeout(() => {
        setNightAmbianceMsg(shuffled[2]);
        setTimeout(() => setNightAmbianceMsg(null), 6000);
      }, 20000));
    }

    // Leaving night: reveal day scene + reset sunset
    if (lastPhaseForFade.current === CONSTANTS.PHASE.NIGHT && phase !== CONSTANTS.PHASE.NIGHT) {
      setIsSunset(false);
      setNightFade('from-black');
      fadeTimers.current.push(setTimeout(() => {
        setNightFade('none');
        setShowDayText(false);
      }, 2000));
    }

    lastPhaseForFade.current = phase;
    return () => fadeTimers.current.forEach(clearTimeout);
  }, [phase]);

  // Death report sequence: blood effect + text together, quickly
  useEffect(() => {
    if (phase === CONSTANTS.PHASE.DEATH_REPORT) {
      const t1 = setTimeout(() => setShowBloodEffect(true), 300);
      const t2 = setTimeout(() => setShowDeathReport(true), 600);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    } else {
      setShowDeathReport(false);
      setShowBloodEffect(false);
    }
  }, [phase]);

  // Night walk-away / morning walk-in
  const nightStartedForDay = useRef(null);
  const morningStartedForDay = useRef(null);
  const [nightTransition, setNightTransition] = useState(false);
  const [morningTransition, setMorningTransition] = useState(false);
  const [nightPlayersHidden, setNightPlayersHidden] = useState(false);
  const morningTimer = useRef(null);

  useEffect(() => {
    // Reset when leaving night (show players again for day)
    if (phase !== CONSTANTS.PHASE.NIGHT && !PRE_NIGHT_PHASES.includes(phase)) {
      setNightPlayersHidden(false);
    }
    // Morning walk-in: when going from NIGHT to DEATH_REPORT, animate players back
    if (phase === CONSTANTS.PHASE.DEATH_REPORT && morningStartedForDay.current !== game.dayCount) {
      morningStartedForDay.current = game.dayCount;
      setNightPlayersHidden(false);
      setMorningTransition(true);
      if (morningTimer.current) clearTimeout(morningTimer.current);
      morningTimer.current = setTimeout(() => setMorningTransition(false), 4000);
    }
  }, [phase]);

  // Day circle positions (walk-away start) + house positions (walk-away end)
  const PLAYER_Y = 0; // players on ground level
  const dayPositions = useMemo(() => {
    const positions = {};
    const circleRadius = 4;
    alivePlayers.forEach((p, i) => {
      const angle = (i / Math.max(alivePlayers.length, 1)) * Math.PI * 2 - Math.PI / 2;
      positions[p.id] = [Math.cos(angle) * circleRadius, PLAYER_Y, Math.sin(angle) * circleRadius];
    });
    return positions;
  }, [alivePlayers.length]);

  // House positions — where players walk to at end of day (radius 12, toward buildings)
  const housePositions = useMemo(() => {
    const positions = {};
    alivePlayers.forEach((p, i) => {
      const angle = (i / Math.max(alivePlayers.length, 1)) * Math.PI * 2 - Math.PI / 2;
      positions[p.id] = [Math.cos(angle) * 12, PLAYER_Y, Math.sin(angle) * 12];
    });
    return positions;
  }, [alivePlayers.length]);

  const myVoteTarget = trial.suspects && Object.keys(trial.suspects).find((sid) =>
    trial.suspects[sid]?.suspectedBy?.some((vid) => vid === me?.id)
  );
  const hasJudged = trial.votes?.[me?.id];

  const handleVote = useCallback((targetId) => {
    if (!me?.isAlive || !isVotingPhase) return;

    // If clicking the same target, unvote
    if (myVoteTarget === targetId) {
      const newSuspects = {};
      Object.keys(trial.suspects || {}).forEach((sid) => {
        const filtered = (trial.suspects[sid]?.suspectedBy || []).filter((vid) => vid !== me.id);
        if (filtered.length > 0) {
          newSuspects[sid] = { id: sid, suspectedBy: filtered };
        }
      });
      setTrial({ ...trial, suspects: newSuspects });
      return;
    }

    const voteWeight = me.voteWeight || 1;

    const newSuspects = {};
    Object.keys(trial.suspects || {}).forEach((sid) => {
      const filtered = (trial.suspects[sid]?.suspectedBy || []).filter((vid) => vid !== me.id);
      if (filtered.length > 0 || sid === targetId) {
        newSuspects[sid] = { id: sid, suspectedBy: filtered };
      }
    });

    if (!newSuspects[targetId]) {
      newSuspects[targetId] = { id: targetId, suspectedBy: [] };
    }
    for (let i = 0; i < voteWeight; i++) {
      newSuspects[targetId].suspectedBy.push(me.id);
    }

    setTrial({ ...trial, suspects: newSuspects });
  }, [me, isVotingPhase, myVoteTarget, trial, setTrial]);

  const handleJudge = useCallback((vote) => {
    if (!me?.isAlive || !isJudgmentPhase || hasJudged || me.id === game.accusedId) return;
    setTrial({ ...trial, votes: { ...trial.votes, [me.id]: vote } });
  }, [me, isJudgmentPhase, hasJudged, game.accusedId, trial, setTrial]);

  // Calculate player positions + rotations based on phase
  const playerPositions = useMemo(() => {
    const positions = {};
    const circleRadius = 4;

    if (phase === CONSTANTS.PHASE.NIGHT) {
      alivePlayers.forEach((p, i) => {
        const angle = (i / Math.max(alivePlayers.length, 1)) * Math.PI * 2;
        const pos = [Math.cos(angle) * 8, PLAYER_Y, Math.sin(angle) * 8];
        positions[p.id] = {
          position: pos,
          rotation: [0, Math.atan2(pos[0], pos[2]), 0], // face outward
        };
      });
    } else if (isTrialPhase) {
      alivePlayers.forEach((p, i) => {
        if (p.id === game.accusedId) {
          positions[p.id] = { position: [0, PLAYER_Y + 0.3, -1.5], rotation: [0, Math.PI, 0] }; // face crowd
        } else {
          const idx = i - (players.findIndex(pl => pl.id === game.accusedId) < i ? 1 : 0);
          const count = alivePlayers.length - 1;
          const angle = (idx / Math.max(count, 1)) * Math.PI - Math.PI / 2;
          const pos = [Math.cos(angle) * 4, PLAYER_Y, Math.sin(angle) * 4 + 2];
          const dx = -pos[0];
          const dz = -1.5 - pos[2];
          positions[p.id] = {
            position: pos,
            rotation: [0, Math.atan2(dx, dz), 0],
          };
        }
      });
    } else {
      alivePlayers.forEach((p, i) => {
        const angle = (i / Math.max(alivePlayers.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const pos = [Math.cos(angle) * circleRadius, PLAYER_Y, Math.sin(angle) * circleRadius];
        positions[p.id] = {
          position: pos,
          rotation: [0, Math.atan2(pos[0], pos[2]) + Math.PI, 0], // face center
        };
      });
    }

    deadPlayers.forEach((p, i) => {
      positions[p.id] = { position: [-12 + i * 2, PLAYER_Y, -12], rotation: [0, 0, 0] };
    });

    return positions;
  }, [phase, alivePlayers.length, deadPlayers.length, game.accusedId]);

  // Init/reset pause position when entering/leaving pause
  useEffect(() => {
    if (isPaused && me) {
      const myPos = playerPositions[me.id];
      setPausePos(myPos ? [...myPos.position] : [0, 0, 0]);
    } else {
      setPausePos(null);
    }
  }, [isPaused]);

  return (
    <div className="main-scene-3d">
      <Canvas
        shadows
        camera={{ position: [0, 8, 12], fov: 50 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.75 }}
      >
        <Suspense fallback={null}>
          {/* Camera — pause: follows player, normal: cinematic */}
          {isPaused && pausePos ? (
            <PausePlayerController
              pausePos={pausePos}
              setPausePos={setPausePos}
              setPauseAnim={setPauseAnim}
              setPauseYaw={setPauseYaw}
              playerRotation={playerPositions[me?.id]?.rotation?.[1] || 0}
              otherPlayerPositions={alivePlayers.filter(p => p.id !== me?.id).map(p => playerPositions[p.id]?.position || [0,0,0])}
            />
          ) : (
            <CameraController phase={phase} CONSTANTS={CONSTANTS} />
          )}

          {/* Lighting */}
          <SceneLighting isDay={game.isDay} isSunset={isSunset} />

          {/* Sky & atmosphere — weather varies by dayCount */}
          {(() => {
            // Deterministic weather based on dayCount (same for all players)
            const seed = game.dayCount * 7 + 3;
            // Day weather: 0=clear, 1=cloudy, 2=misty, 3=rainy, 4=grey/overcast
            const dayWeather = seed % 5;
            // Night weather: 0=clear, 1=rainy+thunder, 2=foggy
            const nightWeather = (seed * 13 + 5) % 3;

            if (game.isDay) {
              const isCloudy = dayWeather === 1;
              const isMisty = dayWeather === 2;
              const isRainyDay = dayWeather === 3;
              const isGrey = dayWeather === 4;
              const isDark = isRainyDay || isGrey;
              const skyColor = isRainyDay ? '#6a7a8a' : isGrey ? '#8090a0' : isCloudy ? '#8a9fb8' : isMisty ? '#909aa8' : '#7ab8d8';
              return (
                <>
                  <color attach="background" args={[skyColor]} />
                  <fog attach="fog" args={[skyColor, isDark ? 18 : isMisty ? 22 : isCloudy ? 30 : 40, isDark ? 50 : isMisty ? 50 : isCloudy ? 65 : 80]} />
                  <Sky sunPosition={[100, isDark ? 10 : isCloudy ? 20 : isMisty ? 25 : 50, 100]} turbidity={isDark ? 25 : isCloudy ? 20 : isMisty ? 12 : 8} rayleigh={isDark ? 6 : isCloudy ? 5 : 2} />
                  <DayFireflies count={isDark ? 10 : isCloudy ? 20 : 50} />
                  <FloatingDust count={isMisty ? 120 : 80} isDay />
                  <GroundFog isDay />
                  {!isDark && !isCloudy && <DayRabbits count={5} />}
                  {(isMisty || isDark) && <GroundFog isDay />}
                  {isRainyDay && <NightRain count={200} />}
                  {isRainyDay && <NightLightning />}
                </>
              );
            } else {
              const isRainy = nightWeather === 1;
              const isFoggy = nightWeather === 2;
              return (
                <>
                  <color attach="background" args={['#060818']} />
                  <fog attach="fog" args={['#060818', isRainy ? 15 : isFoggy ? 18 : 25, isRainy ? 40 : isFoggy ? 42 : 55]} />
                  <Stars radius={80} depth={50} count={isRainy ? 500 : 3000} factor={4} saturation={0} fade speed={1} />
                  <Moon />
                  <Fireflies count={isRainy ? 15 : 60} />
                  <FloatingDust count={60} isDay={false} />
                  <GroundFog isDay={false} />
                  <NightCrows count={4} />
                  <NightDarkFog count={isFoggy ? 30 : 20} />
                  {/* Rain + lightning only on rainy nights (1 in 3) */}
                  {isRainy && <NightRain count={300} />}
                  {isRainy && <NightLightning />}
                  {/* Extra fog on foggy nights */}
                  {isFoggy && <GroundFog isDay={false} />}
                  {isFoggy && <NightDarkFog count={15} />}
                </>
              );
            }
          })()}

          <GroundPlane isDay={game.isDay} />
          <Village isDay={game.isDay} />

          {/* Alive Players — hidden during night and after walk finishes */}
          {!nightPlayersHidden && phase !== CONSTANTS.PHASE.NIGHT && alivePlayers.map((player) => {
            const isMe = player.id === me?.id;
            const isAccused = player.id === game.accusedId;
            const showVoteBtn = isVotingPhase;
            const isVoteTarget = myVoteTarget === player.id;
            const showJudgmentBtn = isJudgmentPhase && isAccused && me?.isAlive && me.id !== game.accusedId && !hasJudged;
            const pData = playerPositions[player.id] || { position: [0, 0, 0], rotation: [0, 0, 0] };
            const isAnimating = nightTransition || morningTransition;
            // Night: walk from circle → house. Morning: walk from house → circle.
            let usePos, startPos;
            if (isPaused && isMe && pausePos) {
              usePos = pausePos;
              startPos = null;
            } else if (nightTransition) {
              usePos = housePositions[player.id] || pData.position;
              startPos = dayPositions[player.id];
            } else if (morningTransition) {
              usePos = pData.position; // circle position = destination
              startPos = housePositions[player.id]; // house = start
            } else {
              usePos = pData.position;
              startPos = null;
            }
            const useRot = (isPaused && isMe) ? [0, pauseYaw + Math.PI, 0] : pData.rotation;
            return (
              <PlayerFigure
                key={player.id}
                player={player}
                position={usePos}
                rotation={useRot}
                pauseAnim={(isPaused && isMe) ? pauseAnim : null}
                startPosition={startPos}
                isTransitioning={isAnimating}
                fadeOnTransition={nightTransition}
                transitionDuration={morningTransition ? 3.5 : 5}
                color={player.profile?.color || '#ffffff'}
                isAccused={isAccused}
                showVote={showVoteBtn}
                isVoteTarget={isVoteTarget}
                voteCount={trial?.suspects?.[player.id]?.suspectedBy?.length || 0}
                totalAlive={alivePlayers.length}
                onVote={handleVote}
                showJudgment={showJudgmentBtn}
                onJudge={handleJudge}
                characterScale={characterScale}
                isDay={game.isDay}
                phase={phase}
                CONSTANTS={CONSTANTS}
                chatMessages={chatMessages}
                dayCount={game.dayCount}
              />
            );
          })}

          {/* Dead Players */}
          {deadPlayers.map((player) => {
            const pData = playerPositions[player.id] || { position: [0, 0, 0], rotation: [0, 0, 0] };
            return (
              <DeadPlayerFigure
                key={player.id}
                player={player}
                position={pData.position}
              />
            );
          })}

          {/* Post-processing */}
          <EffectComposer>
            <Bloom
              intensity={game.isDay ? 0.12 : 0.3}
              luminanceThreshold={game.isDay ? 0.92 : 0.85}
              luminanceSmoothing={0.4}
              mipmapBlur
            />
            <BrightnessContrast
              brightness={game.isDay ? -0.02 : -0.02}
              contrast={game.isDay ? 0.06 : 0.08}
            />
            <HueSaturation
              saturation={game.isDay ? -0.05 : -0.15}
            />
            <Vignette
              offset={game.isDay ? 0.3 : 0.1}
              darkness={game.isDay ? 0.35 : 0.85}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* Night ambiance messages */}
      {/* Night ambiance now handled via nightAmbianceMsg overlay */}

      {/* Blood effect — plays before death report text */}
      {phase === CONSTANTS.PHASE.DEATH_REPORT && showBloodEffect && (() => {
        // Language-agnostic: check events for kills, not chat text
        const killEvents = (events || []).filter(
          e => (e.type === 'KILL_RESULT' || e.type === 'disconnect') && e.dayCount === game.dayCount
        );
        if (killEvents.length === 0) return null;
        return (
          <div className="blood-overlay">
            <div className="blood-overlay-inner">
              <div className="blood-vignette" />
              <div className="blood-drip" />
              <div className="blood-drip" />
              <div className="blood-drip" />
              <div className="blood-drip" />
              <div className="blood-drip" />
            </div>
          </div>
        );
      })()}

      {/* Death report overlay */}
      {phase === CONSTANTS.PHASE.DEATH_REPORT && showDeathReport && (() => {
        // Language-agnostic: use events with chat messages as display text
        const killEvents = (events || []).filter(
          e => (e.type === 'KILL_RESULT' || e.type === 'disconnect') && e.dayCount === game.dayCount && e.content?.chatMessage
        );
        const hasDead = killEvents.length > 0;

        return (
          <div className={`death-report-overlay ${hasDead ? 'has-dead' : 'no-dead'}`}>
            <div className="death-report-card">
              {hasDead ? (
                <>
                  {killEvents.map((entry, i) => (
                    <div key={i} className="death-report-name">
                      <span className="death-desc">{entry.content.chatMessage}</span>
                    </div>
                  ))}
                </>
              ) : (
                <div className="death-report-safe">{i18n.t('game:system.peaceful_night')}</div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Discussion start message removed */}

      {/* Phase announcements */}
      {phase === CONSTANTS.PHASE.NO_LYNCH && (
        <div className="scene-announcement" style={{ animation: 'announcement-auto-fade 2.5s ease-out forwards' }}>
          <div className="announcement-text">{i18n.t('game:scene.no_lynch')}</div>
        </div>
      )}
      {phase === CONSTANTS.PHASE.SPARED && (
        <div className="scene-announcement">
          <div className="announcement-text announcement-spared">
            {i18n.t('game:scene.spared', { name: players.find(p => p.id === game.accusedId)?.profile.name || '?' })}
          </div>
        </div>
      )}
      {phase === CONSTANTS.PHASE.EXECUTION && (
        <div className="scene-announcement">
          <div className="announcement-text announcement-execution">
            {i18n.t('game:scene.executed', { name: players.find(p => p.id === game.accusedId)?.profile.name || '?' })}
          </div>
        </div>
      )}

      {/* Admin pause overlay — shows for 5s then fades */}
      {game.adminFreeRoam && (
        <div className="scene-announcement" style={{ animation: 'announcement-auto-fade 5s ease-out forwards' }}>
          <div className="announcement-text" style={{ fontSize: '42px', letterSpacing: '8px', border: '2px solid rgba(255,68,68,0.4)' }}>
            <i className="fas fa-pause" style={{ marginRight: 12 }}></i> PAUSE
          </div>
        </div>
      )}

      {/* Admin custom announcement */}
      {game.adminAnnouncement && !game.adminFreeRoam && (
        <div className="scene-announcement">
          <div className="announcement-text" style={{ borderLeft: '3px solid #ff4444' }}>
            {game.adminAnnouncement}
          </div>
        </div>
      )}

      {/* Night→Day black fade transition */}
      {nightFade === 'to-black' && <div className="night-fade-to-black" />}
      {nightFade === 'from-black' && <div className="night-fade-from-black" />}
      {showNightText && (
        <div className="night-text-overlay">
          <div className="night-text-content text-night">{i18n.t('game:phases.NIGHT_TRANSITION')}</div>
        </div>
      )}
      {showDayText && (
        <div className="night-text-overlay">
          <div className="night-text-content">{i18n.t('game:phases.DEATH_REPORT')}</div>
        </div>
      )}
      {nightAmbianceMsg && (
        <div className="night-text-overlay" key={nightAmbianceMsg}>
          <div className="night-text-content text-night night-text-ambiance">{nightAmbianceMsg}</div>
        </div>
      )}
    </div>
  );
};

export default MainScene;

// Models are preloaded by RoleReveal loader — no preload here to avoid racing
