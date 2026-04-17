import React, { useRef, useMemo, useState, useEffect, Suspense, useCallback } from 'react';
import { Canvas, useFrame, useThree, useLoader } from '@react-three/fiber';
import { Sky, Stars, Html, useGLTF, Clouds, Cloud } from '@react-three/drei';
import { TextureLoader } from 'three';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useMultiplayerState } from 'playroomkit';
import * as THREE from 'three';
import { useGameEngine } from '../../hooks/useGameEngine';
import { Character, skinForPlayer } from '../Character/Character';
import Audio from '../../utils/AudioManager';
import i18n from '../../trad/i18n';
import './MainScene.scss';

// Get night ambiance texts from i18n
const getNightAmbiance = () => {
  const texts = i18n.t('game:ambiance', { returnObjects: true });
  return Array.isArray(texts) ? texts : [];
};

// ============================================================
// Ground — PBR terrain texture (Poly Haven brown_mud_leaves) for the
// outer grass ring + stylized stone plaza at the center.
// ============================================================
const GROUND_TEX_PATHS = [
  '/models/textures/ground_albedo.jpg',
  '/models/textures/ground_normal.jpg',
  '/models/textures/ground_roughness.jpg',
];

const GroundPlane = ({ isDay }) => {
  // Load only the albedo — normal & roughness maps produced specular
  // aliasing ("sparkle pixels") at grazing angles under the directional
  // light, which clashed with the stylised look. The albedo alone,
  // pushed to fully rough / non-metallic, gives a clean matte ground.
  const albedo = useLoader(TextureLoader, GROUND_TEX_PATHS[0]);

  useMemo(() => {
    if (!albedo) return;
    albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping;
    // 4 full repeats across the 70-unit diameter ground circle → each
    // tile covers ~17 units, texture features stay readable from our
    // 10-ish unit camera height without looking busy.
    albedo.repeat.set(4, 4);
    albedo.anisotropy = 16;
    albedo.colorSpace = THREE.SRGBColorSpace;
    albedo.minFilter = THREE.LinearMipmapLinearFilter;
    albedo.magFilter = THREE.LinearFilter;
    albedo.generateMipmaps = true;
  }, [albedo]);

  // Night tone-down: darken the terrain at night.
  const groundTint = isDay ? '#c8c0a8' : '#30302a';

  return (
    <group>
      {/* Main terrain — Poly Haven albedo only, fully matte */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[35, 64]} />
        <meshStandardMaterial
          map={albedo}
          color={groundTint}
          roughness={1}
          metalness={0}
        />
      </mesh>
      {/* Central plaza is now the Runic Circle model (rendered in
          VillageCenter) — no more procedural stone disc. */}
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
    </group>
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
useGLTF.preload('/models/Meshy_AI_potence_0415121815_texture.glb');
useGLTF.preload('/models/road.glb');

const GALLOWS_PATH = '/models/Meshy_AI_potence_0415121815_texture.glb';

// Defense podium — off to the side of the village, between player circle and buildings
const PODIUM_POSITION = [7, 0, -6];
const PODIUM_SCALE = 1.0;

const VillageCenter = ({ isTrialPhase }) => (
  <group>
    {/* Ancient runic circle — flat on the plaza */}
    <RunicCircle position={[0, 0, 0]} scale={5.8} />
    {/* Potence Meshy — landmark central du village */}
    <MeshyModel
      path={GALLOWS_PATH}
      position={[0, 0.1, 0]}
      rotation={[0, Math.PI * 0.15, 0]}
      scale={2}
      halfHeight={0.92}
    />
    {/* Defense podium — off to the side, facing village center */}
    <MeshyModel
      path={MESHY_PODIUM}
      position={PODIUM_POSITION}
      rotation={[0, Math.atan2(-PODIUM_POSITION[0], -PODIUM_POSITION[2]), 0]}
      scale={PODIUM_SCALE}
      halfHeight={0.92}
    />
    {/* Dramatic spotlight on podium during trial phases */}
    {isTrialPhase && (
      <>
        <spotLight
          position={[PODIUM_POSITION[0], 8, PODIUM_POSITION[2]]}
          target-position={PODIUM_POSITION}
          angle={0.35}
          penumbra={0.6}
          intensity={3}
          color="#ffcc88"
          castShadow
          shadow-mapSize-width={512}
          shadow-mapSize-height={512}
        />
        {/* Ground glow under podium */}
        <pointLight position={[PODIUM_POSITION[0], 0.3, PODIUM_POSITION[2]]} intensity={1.2} color="#ff6633" distance={3} decay={2} />
      </>
    )}
  </group>
);

// ============================================================
// Defense Scene Camera — zooms in on the accused at the podium
// Orbits slowly around the accused during DEFENSE, static during
// JUDGMENT / LAST_WORDS / EXECUTION for dramatic tension.
// ============================================================
// Camera targets relative to podium at [7, 0, -6]
// Raised Y + pulled lookAt down → more top-down framing so the distant
// mountains / horizon stay out of frame during trial phases.
const DEFENSE_CAMERA_LOOK = new THREE.Vector3(7, 0.6, -6);      // low on podium, pulls view down
const JUDGMENT_CAMERA_POS = new THREE.Vector3(5.5, 5, -4.2);     // higher front-of-podium angle
const JUDGMENT_CAMERA_LOOK = new THREE.Vector3(7, 0.8, -6);     // looking down at podium
const EXECUTION_CAMERA_POS = new THREE.Vector3(7, 6, -10);      // overhead dramatic above podium
const EXECUTION_CAMERA_LOOK = new THREE.Vector3(7, 0.5, -6);    // looking down at podium

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

  // Animate water surface — position-based waves only (no index offset).
  // The `i * 0.5` phase offset in the old version made adjacent verts on
  // the same cross-section jitter out of phase, which looked wrong with
  // only 2 verts per segment.
  useFrame((state) => {
    if (!meshRef.current) return;
    const positions = meshRef.current.geometry.attributes.position;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < positions.count; i++) {
      const x = basePositions[i * 3];
      const z = basePositions[i * 3 + 2];
      const baseY = basePositions[i * 3 + 1];
      // Two low-frequency waves flowing coherently along the river
      const wave = Math.sin(t * 0.7 - x * 0.35) * 0.025
                 + Math.sin(t * 0.45 + z * 0.3) * 0.015;
      positions.array[i * 3 + 1] = baseY + wave;
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
const fixMaterial = (mat) => {
  if (!mat) return mat;
  const m = mat.clone();
  // Kill all emissive
  if (m.emissive) m.emissive.set(0, 0, 0);
  m.emissiveIntensity = 0;
  m.emissiveMap = null;
  // Kill specular extensions that cause white highlights
  if (m.specularIntensity !== undefined) m.specularIntensity = 0;
  if (m.specularColor) m.specularColor.set(0, 0, 0);
  // Ensure proper tone mapping response
  m.toneMapped = true;
  return m;
};

const KenneyModel = React.memo(({ path, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) => {
  const { scene } = useGLTF(path);
  const clone = useMemo(() => {
    const c = scene.clone();
    c.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        // Fix materials — handle arrays and single materials
        if (Array.isArray(child.material)) {
          child.material = child.material.map(fixMaterial);
        } else {
          child.material = fixMaterial(child.material);
        }
      }
    });
    return c;
  }, [scene]);
  return <primitive object={clone} position={position} rotation={rotation} scale={typeof scale === 'number' ? [scale, scale, scale] : scale} />;
});

// Preload all Kenney assets
// Cemetery Kenney assets were previously preloaded here. Removed (clash
// with new dark Meshy theme — the village no longer has ambient cemetery
// props, graveyard UI still works via its own component).

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
// Dark theme: forge & tavern removed (no matching Meshy models). Chapel
// (= Rootbound Manor) is enlarged to be THE landmark building.
const BUILDING_POSITIONS = [
  // Grande église (Rootbound Manor) — landmark imposant, agrandie pour
  // rester visible en permanence quand la caméra orbite. Positionnée
  // en retrait au nord pour ne pas déborder sur les lampadaires centraux.
  { type: 'chapel',  position: [0, 0, -15],   scale: 4.8, get rotation() { return [0, faceCenter(0, -15), 0]; } },
  // Inner ring cottages
  { type: 'cottage', position: [-10, 0, 1],   scale: 1.6, variant: 0, get rotation() { return [0, faceCenter(-10, 1), 0]; } },
  { type: 'cottage', position: [10, 0, 2],    scale: 1.6, variant: 1, get rotation() { return [0, faceCenter(10, 2), 0]; } },
  { type: 'cottage', position: [-7, 0, 8],    scale: 1.5, variant: 2, get rotation() { return [0, faceCenter(-7, 8), 0]; } },
  { type: 'cottage', position: [7, 0, 9],     scale: 1.5, variant: 0, get rotation() { return [0, faceCenter(7, 9), 0]; } },
  // (cottage à [-5, 0, -10] retiré — rentrait dans l'église agrandie)
  // Outer ring — more cottages
  { type: 'cottage', position: [-15, 0, -8],  scale: 1.4, variant: 2, get rotation() { return [0, faceCenter(-15, -8), 0]; } },
  { type: 'cottage', position: [15, 0, -8],   scale: 1.4, variant: 0, get rotation() { return [0, faceCenter(15, -8), 0]; } },
  { type: 'cottage', position: [-14, 0, 5],   scale: 1.4, variant: 1, get rotation() { return [0, faceCenter(-14, 5), 0]; } },
  { type: 'cottage', position: [14, 0, 6],    scale: 1.4, variant: 2, get rotation() { return [0, faceCenter(14, 6), 0]; } },
  // Cottages pulled south of the river — the river meanders at z=15-17,
  // so we keep any mesh centered at z ≤ 12 with scale 1.4.
  { type: 'cottage', position: [-3, 0, 11],   scale: 1.4, variant: 0, get rotation() { return [0, faceCenter(-3, 11), 0]; } },
  { type: 'cottage', position: [3, 0, 12],    scale: 1.4, variant: 1, get rotation() { return [0, faceCenter(3, 12), 0]; } },
  // (cottage à [0, 0, 16] retiré — était planté dans la rivière)
  // Extra cottages
  { type: 'cottage', position: [-17, 0, -2],  scale: 1.3, variant: 2, get rotation() { return [0, faceCenter(-17, -2), 0]; } },
  { type: 'cottage', position: [17, 0, -1],   scale: 1.3, variant: 0, get rotation() { return [0, faceCenter(17, -1), 0]; } },
];

// Background mountains — procedural cones
const MOUNTAINS = [
  // North
  { position: [0, 0, -50],   scale: 5, variant: 0 },
  { position: [-25, 0, -48], scale: 3.5, variant: 7 },
  { position: [25, 0, -48],  scale: 4, variant: 8 },
  // Northwest / Northeast
  { position: [-42, 0, -34], scale: 4, variant: 1 },
  { position: [42, 0, -34],  scale: 4.5, variant: 2 },
  // West / East
  { position: [-50, 0, 0],   scale: 3.5, variant: 3 },
  { position: [50, 0, 0],    scale: 3.5, variant: 4 },
  { position: [-54, 0, -17], scale: 3, variant: 9 },
  { position: [54, 0, -17],  scale: 3, variant: 10 },
  // Southwest / Southeast
  { position: [-42, 0, 30],  scale: 4, variant: 5 },
  { position: [42, 0, 30],   scale: 4, variant: 6 },
  { position: [-50, 0, 17],  scale: 3, variant: 11 },
  { position: [50, 0, 17],   scale: 3, variant: 12 },
  // South — fill the gap
  { position: [0, 0, 48],    scale: 4.5, variant: 13 },
  { position: [-25, 0, 42],  scale: 3.5, variant: 14 },
  { position: [25, 0, 42],   scale: 3.5, variant: 15 },
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

// Dark procedural mountain — two stacked cones, weathered dark tones
const DarkMountain = React.memo(({ position, scale = 1, variant = 0 }) => {
  const rotY = variant * 0.37;
  return (
    <group position={position} rotation={[0, rotY, 0]} scale={scale}>
      {/* Main peak — dark slate */}
      <mesh castShadow receiveShadow>
        <coneGeometry args={[3, 5.5, 5]} />
        <meshStandardMaterial color="#2a2630" flatShading roughness={1} />
      </mesh>
      {/* Snow/bone cap */}
      <mesh position={[0, 2.2, 0]} castShadow>
        <coneGeometry args={[1.4, 1.6, 5]} />
        <meshStandardMaterial color="#3d3a44" flatShading roughness={1} />
      </mesh>
      {/* Small shoulder — offset cone for a ridgeline feel */}
      <mesh position={[1.3, -0.5, 0.6]} castShadow>
        <coneGeometry args={[1.6, 3.5, 5]} />
        <meshStandardMaterial color="#23202a" flatShading roughness={1} />
      </mesh>
    </group>
  );
});

// Meshy "dark werewolf" models — scene is fully Meshy now for buildings/trees
const MESHY_COTTAGE = '/models/skullcrest_cottage.glb';
const MESHY_MANOR   = '/models/rootbound_manor.glb';
const MESHY_TREE    = '/models/gnarled_tree.glb';
const MESHY_BOARD   = '/models/bulletin_board.glb';
const MESHY_SKULL   = '/models/skull_sign.glb';
const MESHY_RING    = '/models/rope_ring.glb';
const MESHY_LANTERN = '/models/skull_lantern.glb';
const MESHY_RUNIC   = '/models/runic_circle.glb';
const MESHY_PODIUM  = '/models/defense_podium.glb';

// Only KayKit asset we still keep: neutral gray rocks (fit the dark theme)
useGLTF.preload('/models/kaykit/rock_single_A.gltf');

// Preload Meshy models
useGLTF.preload(MESHY_COTTAGE);
useGLTF.preload(MESHY_MANOR);
useGLTF.preload(MESHY_TREE);
useGLTF.preload(MESHY_BOARD);
useGLTF.preload(MESHY_SKULL);
useGLTF.preload(MESHY_RING);
useGLTF.preload(MESHY_LANTERN);
useGLTF.preload(MESHY_RUNIC);
useGLTF.preload(MESHY_PODIUM);

// Meshy models have their pivot at the CENTER of a unit cube (Y ∈ [-0.95, 0.95]).
// After scaling by S, we must raise position.y by `halfHeight * S` to put the base
// on the ground. halfHeight defaults to 0.95 (most props), pass a custom value for
// flatter props like rope_ring (0.38).
const MeshyModel = React.memo(({ path, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, halfHeight = 0.95 }) => {
  const pos = [position[0], position[1] + halfHeight * scale, position[2]];
  return <KenneyModel path={path} position={pos} rotation={rotation} scale={scale} />;
});

// ============================================================
// Runic Circle — flat disc at village center. Pivot is at the center
// of the mesh so we compute the bbox and shift the inner object up by
// -min.y so the bottom sits exactly at local y = 0. Then the outer group
// places it just above the ground plane to avoid z-fighting.
// ============================================================
const RunicCircle = ({ position = [0, 0, 0], scale = 5.8 }) => {
  const { scene } = useGLTF(MESHY_RUNIC);
  const { clone, discRadius } = useMemo(() => {
    const c = scene.clone();
    c.traverse((child) => {
      if (child.isMesh) {
        child.receiveShadow = true;
        child.castShadow = false;
        if (child.material) {
          const m = child.material.clone ? child.material.clone() : child.material;
          // The GLB ships with no metallic/roughness factors (defaults to metallic=1)
          // plus a metallicRoughnessTexture — in a dark scene, a pure metal surface
          // with nothing to reflect just renders black. Force it fully diffuse so
          // the baseColorTexture (the runic pattern) actually shows up.
          if (m.metalness !== undefined) m.metalness = 0;
          if (m.roughness !== undefined) m.roughness = 1;
          m.metalnessMap = null;
          m.roughnessMap = null;
          if (m.envMapIntensity !== undefined) m.envMapIntensity = 0;
          if (m.emissive) m.emissive.set(0, 0, 0);
          m.emissiveIntensity = 0;
          m.emissiveMap = null;
          if (m.specularIntensity !== undefined) m.specularIntensity = 0;
          if (m.specularColor) m.specularColor.set(0, 0, 0);
          m.toneMapped = true;
          m.needsUpdate = true;
          child.material = m;
        }
      }
    });
    // Shift inner geometry up so its bottom sits at local y = 0
    const bbox = new THREE.Box3().setFromObject(c);
    c.position.y = -bbox.min.y;
    // Compute the largest horizontal extent from origin — used to size the
    // white backdrop disc so it matches the runic circle footprint exactly.
    const r = Math.max(
      Math.abs(bbox.min.x), Math.abs(bbox.max.x),
      Math.abs(bbox.min.z), Math.abs(bbox.max.z),
    );
    return { clone: c, discRadius: r };
  }, [scene]);

  return (
    <group position={[position[0], position[1] - 0.16, position[2]]} scale={scale}>
      {/* White backdrop disc — hides the grass material underneath the runic
          circle. Sits just above the ground plane (local y ≈ 0.002) to avoid
          z-fighting, and scales with the parent group so it matches the model's
          footprint regardless of the scale prop. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]} receiveShadow>
        <circleGeometry args={[discRadius, 64]} />
        <meshStandardMaterial color="#ffffff" roughness={1} metalness={0} />
      </mesh>
      <primitive object={clone} />
    </group>
  );
};

// ============================================================
// Skull Lantern — Meshy model + glowing lamp (model was exported
// with a lit lamp, so we add an emissive sphere + pointLight at
// the top of the lantern post where the lamp sits).
// ============================================================
const SkullLantern = ({ position, rotation = [0, 0, 0], scale = 1.2 }) => {
  const lightRef = useRef();
  const glowRef = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Slow breathing pulse — subtle, like a calm candle behind glass
    const pulse = 1 + Math.sin(t * 1.2 + position[0] * 0.5) * 0.04
                    + Math.sin(t * 0.7 + position[2] * 0.3) * 0.02;
    if (lightRef.current) lightRef.current.intensity = 7 * pulse;
    if (glowRef.current) {
      // Much smaller scale variation — barely visible, just alive
      glowRef.current.scale.setScalar(1 + (pulse - 1) * 0.5);
    }
  });

  // The lamp head is at the top of the post and hangs forward. Model is
  // normalized to [-0.95, 0.95]; MeshyModel already adds (halfHeight * scale)
  // to Y to place the base on the ground. We only need the lamp offset from
  // the post pivot.
  const lampPos = [0, 1.18 * scale, 0.25 * scale];

  return (
    <group position={position} rotation={rotation}>
      <MeshyModel path={MESHY_LANTERN} position={[0, 0, 0]} scale={scale} />
      {/* Small emissive dot inside the lamp — the light does the real work */}
      <mesh ref={glowRef} position={lampPos}>
        <sphereGeometry args={[0.09 * scale, 8, 6]} />
        <meshBasicMaterial color="#ffd080" transparent opacity={0.95} />
      </mesh>
      {/* Point light cast from the lamp — strong and far reach so it
          actually illuminates the plaza and nearby buildings */}
      <pointLight
        ref={lightRef}
        position={lampPos}
        color="#ffb060"
        intensity={7}
        distance={22}
        decay={0.8}
        castShadow={false}
      />
    </group>
  );
};

const BuildingRenderer = ({ type, position, rotation, scale }) => {
  const path = type === 'chapel' ? MESHY_MANOR : MESHY_COTTAGE;
  return <MeshyModel path={path} position={position} rotation={rotation} scale={scale * 1.6} />;
};

const Village = React.memo(({ isDay, isTrialPhase }) => (
  <group>
    {/* ——— CENTRE : Potence + Pupitre ——— */}
    <VillageCenter isTrialPhase={isTrialPhase} />

    {/* ——— BATIMENTS : procéduraux low-poly ——— */}
    {BUILDING_POSITIONS.map((b, i) => (
      <BuildingRenderer key={`bld-${i}`} {...b} />
    ))}

    {/* ——— LAMPADAIRES : Skull Lantern Meshy autour du centre ——— */}
    {TORCH_POS.map((pos, i) => (
      <SkullLantern key={`lantern-${i}`} position={pos} rotation={[0, i * Math.PI / 2, 0]} scale={1.2} />
    ))}

    {/* ——— MONTAGNES procédurales (thème dark) ——— */}
    {MOUNTAINS.map((m, i) => (
      <DarkMountain key={`mountain-${i}`}
        position={m.position} scale={m.scale * 1.2} variant={i} />
    ))}

    {/* ——— ARBRES Meshy "Gnarled Sentinel" (dark theme) ——— */}
    {TREE_POSITIONS.map((pos, i) => (
      <MeshyModel key={`tree-${i}`}
        path={MESHY_TREE}
        position={pos} scale={1.4 + (i % 4) * 0.3} rotation={[0, i * 1.3, 0]} />
    ))}

    {/* ——— ROCHERS (gris neutre, OK avec dark theme) ——— */}
    {ROCK_POSITIONS.map((r, i) => (
      <KenneyModel key={`rock-${i}`} path="/models/kaykit/rock_single_A.gltf"
        position={r.position} scale={r.scale * 3} rotation={[0, i * 2.1, 0]} />
    ))}

    {/* ——— ARBRES Meshy supplémentaires DERRIÈRE les maisons (radius 20+) ——— */}
    <MeshyModel path={MESHY_TREE} position={[-21, 0, -6]} scale={1.7} rotation={[0, 0.4, 0]} />
    <MeshyModel path={MESHY_TREE} position={[21, 0, -5]} scale={1.6} rotation={[0, 1.1, 0]} />
    <MeshyModel path={MESHY_TREE} position={[-22, 0, 4]} scale={1.8} rotation={[0, 2.3, 0]} />
    <MeshyModel path={MESHY_TREE} position={[22, 0, 5]} scale={1.5} rotation={[0, 0.8, 0]} />
    <MeshyModel path={MESHY_TREE} position={[-9, 0, 21]} scale={1.6} rotation={[0, 1.7, 0]} />
    <MeshyModel path={MESHY_TREE} position={[9, 0, 22]} scale={1.7} rotation={[0, 2.9, 0]} />

    {/* ——— PROPS Meshy dark theme : avis de recherche, poteau au crâne, cercle rituel ——— */}
    <MeshyModel path={MESHY_BOARD}
      position={[5.5, 0, 3]} scale={1.3}
      rotation={[0, faceCenter(5.5, 3), 0]} />
    <MeshyModel path={MESHY_SKULL}
      position={[-5.5, 0, -4]} scale={1.3}
      rotation={[0, faceCenter(-5.5, -4), 0]} />
    <MeshyModel path={MESHY_RING}
      position={[-7, 0, 5]} scale={1.6}
      rotation={[0, 0.5, 0]}
      halfHeight={0.38} />

    {/* ——— CLOTURES ——— */}
    {FENCE_SEGMENTS.map((f, i) => (
      <LowPolyFence key={`fence-${i}`} start={f.start} end={f.end} />
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

    {/* Ambient props Kenney Graveyard Kit removed — clashed with Meshy dark
        theme. The Graveyard UI component (list of dead players) is unaffected. */}
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
// Wind Leaves — autumn leaves drifting across the scene (day). Directional
// flow (wind) + per-particle turbulence + wrap-around at the bounds so the
// field looks continuous. Small instanced planes with tumbling rotation.
// ============================================================
const FIELD_W = 60;
const FIELD_H = 60;
const WIND_DIR_X = 1.0;   // primary wind direction (east)
const WIND_DIR_Z = 0.35;  // slight southward drift
const WIND_DIR_LEN = Math.hypot(WIND_DIR_X, WIND_DIR_Z);
const WIND_NX = WIND_DIR_X / WIND_DIR_LEN;
const WIND_NZ = WIND_DIR_Z / WIND_DIR_LEN;
// Procedural leaf silhouette — teardrop/almond shape drawn with two bezier
// curves (tip → right side → stem → left side → tip). Triangulated once via
// ShapeGeometry and shared by every instance in the InstancedMesh.
const LEAF_SHAPE_GEOMETRY = (() => {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.55);                         // tip
  shape.bezierCurveTo(
    0.38, 0.32,                                  // upper-right control
    0.38, -0.18,                                 // lower-right control
    0, -0.5,                                     // stem base
  );
  shape.bezierCurveTo(
    -0.38, -0.18,                                // lower-left control
    -0.38, 0.32,                                 // upper-left control
    0, 0.55,                                     // back to tip
  );
  const geo = new THREE.ShapeGeometry(shape, 16);
  // Center the shape on its bounding box so rotation feels natural
  geo.computeBoundingBox();
  const cx = (geo.boundingBox.min.x + geo.boundingBox.max.x) / 2;
  const cy = (geo.boundingBox.min.y + geo.boundingBox.max.y) / 2;
  geo.translate(-cx, -cy, 0);
  return geo;
})();

const WindLeaves = ({ count = 90 }) => {
  const meshRef = useRef();
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * FIELD_W,
        y: Math.random() * 6 + 0.3,
        z: (Math.random() - 0.5) * FIELD_H,
        // Individual wind speed — variation is what sells the wind feel
        speed: 1.2 + Math.random() * 1.8,
        // Vertical bob amplitude + frequency
        bobAmp: 0.25 + Math.random() * 0.55,
        bobFreq: 0.8 + Math.random() * 1.4,
        // Lateral turbulence (perpendicular to wind) — tiny side-to-side
        sideAmp: 0.3 + Math.random() * 0.6,
        sideFreq: 0.5 + Math.random() * 1.2,
        // Tumble rotation speed (leaves spin as they drift)
        spin: (Math.random() - 0.5) * 3,
        tilt: (Math.random() - 0.5) * 2,
        phase: Math.random() * Math.PI * 2,
        // Capped smaller so no leaf feels oversized — range ~0.16 to 0.26
        scale: 0.16 + Math.random() * 0.10,
      });
    }
    return arr;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const halfW = FIELD_W / 2;
  const halfH = FIELD_H / 2;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    particles.forEach((p, i) => {
      // Base position drifts along wind direction; wrap at bounds
      const distance = t * p.speed;
      const rawX = p.x + WIND_NX * distance;
      const rawZ = p.z + WIND_NZ * distance;
      // Wrap into [-half, +half] so the field is toroidal
      const px = ((rawX + halfW) % FIELD_W + FIELD_W) % FIELD_W - halfW
               // Turbulence perpendicular to wind (rotate wind 90°: (-Nz, Nx))
               + (-WIND_NZ) * Math.sin(t * p.sideFreq + p.phase) * p.sideAmp;
      const pz = ((rawZ + halfH) % FIELD_H + FIELD_H) % FIELD_H - halfH
               + WIND_NX * Math.sin(t * p.sideFreq + p.phase) * p.sideAmp;
      const py = p.y + Math.sin(t * p.bobFreq + p.phase) * p.bobAmp;
      dummy.position.set(px, py, pz);
      dummy.rotation.set(
        t * p.tilt + p.phase,
        t * p.spin,
        Math.sin(t * p.bobFreq + p.phase) * 0.8,
      );
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[LEAF_SHAPE_GEOMETRY, null, count]}>
      <meshBasicMaterial
        color="#b4611e"
        transparent
        opacity={0.75}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </instancedMesh>
  );
};

// ============================================================
// Night Embers — tiny hot specks drifting in the wind (night). Warm glow,
// same directional flow as WindLeaves so the two effects feel consistent.
// Embers also rise slightly over time before being swept along.
// ============================================================
const NightEmbers = ({ count = 70 }) => {
  const meshRef = useRef();
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * FIELD_W,
        y: Math.random() * 5 + 0.4,
        z: (Math.random() - 0.5) * FIELD_H,
        speed: 0.9 + Math.random() * 1.4,
        rise: 0.15 + Math.random() * 0.35,
        bobAmp: 0.15 + Math.random() * 0.35,
        bobFreq: 0.6 + Math.random() * 1.0,
        sideAmp: 0.25 + Math.random() * 0.45,
        sideFreq: 0.4 + Math.random() * 0.9,
        phase: Math.random() * Math.PI * 2,
        size: 0.04 + Math.random() * 0.05,
        flickerFreq: 2 + Math.random() * 3,
      });
    }
    return arr;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const halfW = FIELD_W / 2;
  const halfH = FIELD_H / 2;

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    particles.forEach((p, i) => {
      const distance = t * p.speed;
      const rawX = p.x + WIND_NX * distance;
      const rawZ = p.z + WIND_NZ * distance;
      const px = ((rawX + halfW) % FIELD_W + FIELD_W) % FIELD_W - halfW
               + (-WIND_NZ) * Math.sin(t * p.sideFreq + p.phase) * p.sideAmp;
      const pz = ((rawZ + halfH) % FIELD_H + FIELD_H) % FIELD_H - halfH
               + WIND_NX * Math.sin(t * p.sideFreq + p.phase) * p.sideAmp;
      // Vertical: gentle rise + bob. Wrap Y so embers don't climb forever.
      const rawY = p.y + t * p.rise;
      const py = ((rawY - 0.2) % 6) + 0.2 + Math.sin(t * p.bobFreq + p.phase) * p.bobAmp;
      dummy.position.set(px, py, pz);
      // Flicker via scale so the GPU material stays shared
      const flicker = 0.7 + Math.sin(t * p.flickerFreq + p.phase) * 0.3;
      dummy.scale.setScalar(p.size * flicker);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[1, 5, 4]} />
      <meshBasicMaterial color="#ffb056" transparent opacity={0.85} toneMapped={false} depthWrite={false} />
    </instancedMesh>
  );
};

// ============================================================
// Ground fog — soft diffuse mist via noise shader + horizon ring clouds
// ============================================================

// GLSL simplex noise + fBm — used by the ground mist shader
const MIST_NOISE_GLSL = `
vec2 hash22(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float snoise(vec2 p) {
  const float K1 = 0.366025404;
  const float K2 = 0.211324865;
  vec2 i = floor(p + (p.x + p.y) * K1);
  vec2 a = p - i + (i.x + i.y) * K2;
  float m = step(a.y, a.x);
  vec2 o = vec2(m, 1.0 - m);
  vec2 b = a - o + K2;
  vec2 c = a - 1.0 + 2.0 * K2;
  vec3 h = max(0.5 - vec3(dot(a,a), dot(b,b), dot(c,c)), 0.0);
  vec3 n = h*h*h*h * vec3(dot(a, hash22(i)), dot(b, hash22(i + o)), dot(c, hash22(i + 1.0)));
  return dot(n, vec3(70.0));
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.55;
  for (int i = 0; i < 5; i++) {
    v += a * snoise(p);
    p *= 2.02;
    a *= 0.5;
  }
  return v;
}
`;

// One flat mist slab — large plane hovering above ground with a scrolling
// fBm noise as alpha. Multiple slabs are stacked at different heights /
// speeds / scales to build a full volume of drifting mist.
const MistSlab = ({ y, scale = 1, speed = 0.02, density = 0.55, color, seed = 0 }) => {
  const matRef = useRef();

  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(color) },
      uDensity: { value: density },
      uSpeed: { value: speed },
      uSeed: { value: seed },
      fogColor: { value: new THREE.Color() },
      fogNear: { value: 1 },
      fogFar: { value: 100 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying float vFogDepth;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vFogDepth = -mvPos.z;
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColor;
      uniform float uDensity;
      uniform float uSpeed;
      uniform float uSeed;
      uniform vec3 fogColor;
      uniform float fogNear;
      uniform float fogFar;
      varying vec2 vUv;
      varying float vFogDepth;
      varying vec3 vWorldPos;
      ${MIST_NOISE_GLSL}
      void main() {
        // World-space bubble around the camera — any fragment inside this
        // sphere is discarded entirely. Fixes "half the screen is fog"
        // when the camera orbits right above/through a slab.
        float camDist = distance(vWorldPos, cameraPosition);
        if (camDist < 7.0) discard;
        float bubbleFade = smoothstep(7.0, 13.0, camDist);

        // Two scrolling noise octaves at different speeds/scales
        float t = uTime * uSpeed;
        vec2 uv = vUv * 3.0 + vec2(uSeed * 13.0, uSeed * 7.0);
        float n1 = fbm(uv + vec2(t, t * 0.6));
        float n2 = fbm(uv * 1.8 - vec2(t * 0.7, -t * 0.4));
        float mist = n1 * 0.65 + n2 * 0.35;
        // Remap noise (~[-0.5, 0.5]) to [0, 1] with soft contrast
        mist = smoothstep(-0.15, 0.75, mist);
        // Radial edge fade so the slab disappears smoothly at the border
        vec2 centered = vUv - 0.5;
        float r = length(centered) * 2.0;
        float edgeFade = 1.0 - smoothstep(0.5, 1.0, r);
        // Far fade so the mist doesn't fight with the distance fog
        float farFade = 1.0 - smoothstep(45.0, 80.0, vFogDepth);
        float alpha = mist * edgeFade * bubbleFade * farFade * uDensity;
        vec3 col = uColor;
        // Apply scene fog so the mist fades into the distance fog
        float fogFactor = smoothstep(fogNear, fogFar, vFogDepth);
        col = mix(col, fogColor, fogFactor);
        gl_FragColor = vec4(col, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: true,
  }), [color, density, speed, seed]);

  matRef.current = material;

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} renderOrder={1}>
      <planeGeometry args={[42 * scale, 42 * scale, 1, 1]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
};

// Thick fog wall encircling the village — hides empty sky/mountains
// from low camera angles (trial/defense). Dense ring at radius 18-28
// with multiple layers so it reads as an impenetrable wall of mist.
const VillageFogWall = ({ isDay = true }) => {
  const color = isDay ? '#c8d4e0' : '#0a0e1c';

  const clouds = useMemo(() => {
    const arr = [];
    let s = 7777;
    const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    // Dense inner ring (radius ~18-22) — main wall
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2 + rand() * 0.15;
      const radius = 18 + rand() * 4;
      arr.push({
        position: [Math.cos(angle) * radius, 1.5 + rand() * 3, Math.sin(angle) * radius],
        seed: i * 13,
        bounds: [10 + rand() * 4, 4 + rand() * 2, 10 + rand() * 4],
        volume: 10 + rand() * 5,
        rotation: [0, angle, 0],
      });
    }
    // Outer ring (radius ~24-30) — depth
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2 + rand() * 0.2;
      const radius = 24 + rand() * 6;
      arr.push({
        position: [Math.cos(angle) * radius, 2 + rand() * 4, Math.sin(angle) * radius],
        seed: i * 17 + 300,
        bounds: [12 + rand() * 5, 5 + rand() * 3, 12 + rand() * 5],
        volume: 12 + rand() * 6,
        rotation: [0, angle + 0.5, 0],
      });
    }
    return arr;
  }, []);

  return (
    <Clouds material={THREE.MeshBasicMaterial} limit={60}>
      {clouds.map((c, i) => (
        <Cloud
          key={`fogwall-${i}`}
          position={c.position}
          rotation={c.rotation}
          seed={c.seed}
          segments={32}
          bounds={c.bounds}
          volume={c.volume}
          smallestVolume={0.3}
          concentrate="inside"
          growth={6}
          color={color}
          opacity={isDay ? 0.85 : 0.92}
          speed={0.02}
          fade={50}
        />
      ))}
    </Clouds>
  );
};

const GroundFog = ({ isDay = true }) => {
  // Stacked diffuse mist slabs at different heights & speeds
  // create a layered drifting volume — much softer and more organic
  // than billboard quads.
  const color = isDay ? '#d8e4ee' : '#0e1424';
  const dense = isDay ? 0.38 : 0.55;

  // Far ring of bigger, fainter clouds hugging the mountains for
  // distance-mist feel (kept — they look good at distance)
  const farClouds = useMemo(() => {
    const arr = [];
    let s = 4242;
    const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const count = isDay ? 10 : 14;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + rand() * 0.3;
      const radius = 28 + rand() * 6;
      arr.push({
        position: [Math.cos(angle) * radius, 1 + rand() * 2, Math.sin(angle) * radius],
        seed: i * 7 + 100,
        bounds: [8 + rand() * 4, 1 + rand() * 0.5, 8 + rand() * 4],
        volume: 7 + rand() * 3,
        rotation: [0, angle, 0],
      });
    }
    return arr;
  }, [isDay]);

  const farOpacity = isDay ? 0.75 : 0.85;

  return (
    <>
      {/* Diffuse drifting mist slabs — in-village, hugging the ground */}
      <MistSlab y={0.15} scale={1.0} speed={0.025} density={dense * 0.9} color={color} seed={0.1} />
      <MistSlab y={0.45} scale={1.1} speed={0.018} density={dense * 0.7} color={color} seed={0.6} />
      <MistSlab y={0.85} scale={1.2} speed={0.012} density={dense * 0.45} color={color} seed={1.3} />

      {/* Far horizon mist ring (drei volumetric clouds — this part stays) */}
      <Clouds material={THREE.MeshBasicMaterial} limit={40}>
        {farClouds.map((c, i) => (
          <Cloud
            key={`far-${i}`}
            position={c.position}
            rotation={c.rotation}
            seed={c.seed}
            segments={28}
            bounds={c.bounds}
            volume={c.volume}
            smallestVolume={0.4}
            concentrate="outside"
            growth={4}
            color={color}
            opacity={farOpacity}
            speed={0.05}
            fade={40}
          />
        ))}
      </Clouds>
    </>
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
  if (phase === CONSTANTS?.PHASE?.JUDGMENT && !isAccused) { iconClass = 'fa-scale-balanced'; color = '#cc88ff'; }
  // Discussion icon removed — handled by ChatBubble on message

  if (!iconClass) return null;

  return (
    <Html position={[0, 2.8, 0]} center distanceFactor={8} zIndexRange={[15, 1]} style={{ pointerEvents: 'none' }}>
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
    <Html position={[0, 2.8, 0]} center distanceFactor={8} zIndexRange={[15, 1]} style={{ pointerEvents: 'none' }}>
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
const IDLE_VARIANTS = {
  villager: ['Idle', 'Idle2', 'Idle3', 'Idle4', 'Idle5', 'Idle6'],
  wanderer: ['Idle', 'Idle2', 'Idle3'],
};
const DANCE_VARIANTS = {
  villager: ['Dance1', 'Dance2', 'Dance3'],
  wanderer: ['Dance1', 'Dance2'],
};

// Deterministic pick from an array based on player ID string
const pickForPlayer = (playerId, variants) => {
  let hash = 0;
  for (let i = 0; i < (playerId || '').length; i++) hash = (hash * 31 + playerId.charCodeAt(i)) | 0;
  return variants[Math.abs(hash) % variants.length];
};

const PlayerFigure = ({ player, position, rotation, color, isAccused, showVote, isVoteTarget, onVote, voteCount, totalAlive, showJudgment, onJudge, startPosition, isTransitioning, transitionDuration = 3, characterScale = 1.0, pauseAnim = null, isDay = true, phase = null, CONSTANTS = null, fadeOnTransition = true, chatMessages = null, dayCount = 0, isGameOver = false, isWinningTeam = false }) => {
  const groupRef = useRef();
  const transitionStartTime = useRef(null);
  const walkStarted = useRef(false);

  // Deterministic skin per player
  const playerSkin = useMemo(() => skinForPlayer(player.id), [player.id]);

  // Stable random idle & dance per player (skin-aware variant lists)
  const playerIdle = useMemo(() => pickForPlayer(player.id, IDLE_VARIANTS[playerSkin] || IDLE_VARIANTS.villager), [player.id, playerSkin]);
  const playerDance = useMemo(() => pickForPlayer(player.id + '_dance', DANCE_VARIANTS[playerSkin] || DANCE_VARIANTS.villager), [player.id, playerSkin]);

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
        setCurrentAnim(isGameOver && isWinningTeam ? playerDance : playerIdle);
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
      // Fade from the very start of the walk animation — gone ~1s before the
      // walk ends so players disappear before they can bump into walls.
      const fadeEnd = Math.max(transitionDuration - 2, 0.5);
      const opacity = Math.max(1 - elapsed / fadeEnd, 0);
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
          scale={characterScale || 1.0}
          skin={playerSkin}
          animOffset={player.id ? (player.id.charCodeAt(0) % 20) * 0.15 : 0}
        />
      </group>
      {/* Ground halo removed — player color identification now lives on
          the character's own material (rim light + stronger tint) so the
          feet stay on visible ground instead of floating over a decal. */}
      {/* Accused ring */}
      {isAccused && (
        <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.9, 16]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.7} />
        </mesh>
      )}
      {/* Name label + vote counter — hidden during walk-away */}
      {!isTransitioning && <Html position={[0, 2.0, 0]} center distanceFactor={8} zIndexRange={[15, 1]}>
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
// Dead Player — Character with DeadPose (last frame = on ground) + ghost orb
// Fades out when discussion starts
// ============================================================
const DeadPlayerFigure = ({ player, position, fading = false }) => {
  const groupRef = useRef();
  const fadeStart = useRef(null);
  const playerSkin = useMemo(() => skinForPlayer(player.id), [player.id]);

  useFrame((state) => {
    if (!groupRef.current) return;
    if (fading) {
      if (fadeStart.current === null) fadeStart.current = state.clock.elapsedTime;
      const elapsed = state.clock.elapsedTime - fadeStart.current;
      const opacity = Math.max(1 - elapsed / 2, 0); // 2s fade
      groupRef.current.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.transparent = true;
          child.material.opacity = opacity;
        }
      });
    } else {
      fadeStart.current = null;
    }
  });

  return (
    <group position={position}>
      <group ref={groupRef}>
        <Character
          color="#555555"
          animation="DeadPose"
          skin={playerSkin}
          scale={0.8}
        />
      </group>
      {!fading && <GhostOrb position={[0, 2, 0]} />}
      {!fading && (
        <Html position={[0, 2.4, 0]} center distanceFactor={8} zIndexRange={[15, 1]}>
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
      )}
    </group>
  );
};

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

// Spherical obstacles the camera must stay outside of. If the target
// position lands inside one, it is pushed out along the radial direction.
// Church (rootbound_manor) sits at [0,0,-15] scale 4.8 → spans ±7.3 units;
// we wrap its body in a snug sphere. Gallows (VillageCenter) sits at
// origin with scale 2 and is much smaller.
const CAMERA_OBSTACLES = [
  { center: new THREE.Vector3(0, 6, -15), radius: 7.8 }, // church body
  { center: new THREE.Vector3(0, 2, 0), radius: 2.8 },   // gallows
];

const pushCameraOutOfObstacles = (pos) => {
  for (let i = 0; i < CAMERA_OBSTACLES.length; i++) {
    const obs = CAMERA_OBSTACLES[i];
    const dx = pos.x - obs.center.x;
    const dy = pos.y - obs.center.y;
    const dz = pos.z - obs.center.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const r = obs.radius;
    if (distSq < r * r) {
      const dist = Math.sqrt(distSq) || 0.001;
      const k = r / dist;
      pos.x = obs.center.x + dx * k;
      pos.y = obs.center.y + dy * k;
      pos.z = obs.center.z + dz * k;
    }
  }
  return pos;
};

const CameraController = ({ phase, CONSTANTS }) => {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 8, 12));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const nightTimeRef = useRef(0);
  const prevPhaseRef = useRef(phase);
  const defenseTimeRef = useRef(0);

  // Trial phases that use the defense camera
  const isDefensePhase = phase === CONSTANTS.PHASE.DEFENSE;
  const isJudgmentPhase = phase === CONSTANTS.PHASE.JUDGMENT;
  const isLastWords = phase === CONSTANTS.PHASE.LAST_WORDS;
  const isExecution = phase === CONSTANTS.PHASE.EXECUTION;
  const isTrialCamera = isDefensePhase || isJudgmentPhase || isLastWords || isExecution;

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
    } else if (isTrialCamera) {
      // ——— TRIAL CAMERA: dramatic zoom on podium / accused ———
      // Track time within defense for slow orbit
      if (!prevPhaseRef.current || ![CONSTANTS.PHASE.DEFENSE, CONSTANTS.PHASE.JUDGMENT, CONSTANTS.PHASE.LAST_WORDS, CONSTANTS.PHASE.EXECUTION].includes(prevPhaseRef.current)) {
        defenseTimeRef.current = 0; // reset on entering trial
      }
      defenseTimeRef.current += delta;

      if (isDefensePhase) {
        // Slow orbit around the accused at the podium — dramatic reveal.
        // Higher Y + tighter radius = more top-down framing, less horizon.
        const orbitT = defenseTimeRef.current * 0.15;
        const radius = 3.2;
        const px = PODIUM_POSITION[0];
        const pz = PODIUM_POSITION[2];
        const cx = px + Math.sin(orbitT) * radius;
        const cz = pz + Math.cos(orbitT) * radius * 0.6;
        targetPos.current.set(cx, 5.2, cz);
        targetLookAt.current.copy(DEFENSE_CAMERA_LOOK);
      } else if (isJudgmentPhase) {
        // Front of podium — see only the accused (elevated angle)
        targetPos.current.copy(JUDGMENT_CAMERA_POS);
        targetLookAt.current.copy(JUDGMENT_CAMERA_LOOK);
      } else if (isLastWords) {
        // Close-up, intimate angle for last words — near the podium, more top-down
        targetPos.current.set(5.8, 4.5, -4.8);
        targetLookAt.current.set(7, 0.8, -6);
      } else if (isExecution) {
        // Overhead dramatic shot
        targetPos.current.copy(EXECUTION_CAMERA_POS);
        targetLookAt.current.copy(EXECUTION_CAMERA_LOOK);
      }
    } else {
      // Day phases: continuous very slow orbit. Pulled back slightly from
      // the original (10 → 12 horizontal, 13 → 14 vertical) to frame the
      // tighter player circle with a bit more breathing room on the sides.
      const orbitAngle = Date.now() * 0.000008; // ~13 min per full orbit
      const orbitRadius = 12;
      const orbitX = Math.sin(orbitAngle) * orbitRadius;
      const orbitZ = Math.cos(orbitAngle) * orbitRadius;
      targetPos.current.set(orbitX, 14, orbitZ);
      targetLookAt.current.set(0, 0, 0);
    }

    // Push target out of building obstacles (church / gallows) so the
    // orbit never ends up inside a model.
    if (!isTrialCamera) {
      pushCameraOutOfObstacles(targetPos.current);
    }

    // When leaving night: snap camera to current orbit position (no lerp from stars)
    const comingFromNight = prevPhaseRef.current === CONSTANTS.PHASE.NIGHT && phase !== CONSTANTS.PHASE.NIGHT;
    if (comingFromNight) {
      camera.position.copy(targetPos.current);
      camera.lookAt(0, 0, 0);
    }
    prevPhaseRef.current = phase;

    // Trial phases use faster lerp for snappy zoom-in, night uses slow cinematic lerp
    const lerpSpeed = isTrialCamera ? 0.04 : phase === CONSTANTS.PHASE.NIGHT ? 0.002 : 0.02;
    camera.position.lerp(targetPos.current, lerpSpeed);
    // Also push the interpolated camera position out — the lerp can cross
    // the obstacle while going from A to B.
    if (!isTrialCamera) {
      pushCameraOutOfObstacles(camera.position);
    }
    const currentLookAt = new THREE.Vector3();
    camera.getWorldDirection(currentLookAt);
    const desiredDir = targetLookAt.current.clone().sub(camera.position).normalize();
    currentLookAt.lerp(desiredDir, isTrialCamera ? 0.04 : lerpSpeed);
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

    // Sunset animation — sun drops to horizon over ~2.5 seconds
    if (isSunset) {
      sunsetProgress.current = Math.min(sunsetProgress.current + delta * 0.35, 1);
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
      // Slightly brighter ambient fills the shadow areas so they aren't pitch-dark
      const target = isDay ? (0.85 - sunsetEased * 0.35) : 0.12;
      ambientRef.current.intensity += (target - ambientRef.current.intensity) * 0.05;
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={isDay ? 0.7 : 0.12} />

      <directionalLight
        ref={sunRef}
        position={isDay ? [15, 20, 10] : [-5, 12, 8]}
        intensity={isDay ? 1.55 : 0.18}
        color={isDay ? '#ffe8c8' : '#6677aa'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={60}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
        shadow-bias={-0.0005}
        shadow-radius={6}
        shadow-normalBias={0.02}
      />

      <directionalLight
        ref={fillRef}
        position={isDay ? [-10, 8, -5] : [5, 6, -8]}
        intensity={isDay ? 0.8 : 0.07}
        color={isDay ? '#ddc8a0' : '#334466'}
      />

      <hemisphereLight
        color={isDay ? '#8ab4cc' : '#1a1a3a'}
        groundColor={isDay ? '#8B7355' : '#0a0a15'}
        intensity={isDay ? 0.45 : 0.07}
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
  const [adminCharScale] = useMultiplayerState('adminCharScale', 1.0);
  const characterScale = adminCharScale || 1.0;
  const isPaused = !!game.adminFreeRoam;
  const isGameOver = game.status === CONSTANTS.GAME_ENDED;
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
  const [showExecutionFlash, setShowExecutionFlash] = useState(false);
  const [fadingDead, setFadingDead] = useState(false);
  const [hideDead, setHideDead] = useState(false);
  const prevPhaseForDead = useRef(null);

  // Dead bodies: show during DEATH_REPORT, fade out when it ends, hide after fade
  useEffect(() => {
    const prev = prevPhaseForDead.current;
    prevPhaseForDead.current = phase;
    if (phase === CONSTANTS.PHASE.DEATH_REPORT) {
      setFadingDead(false);
      setHideDead(false);
    } else if (prev === CONSTANTS.PHASE.DEATH_REPORT) {
      // Leaving death report → start fade
      setFadingDead(true);
      const t = setTimeout(() => { setFadingDead(false); setHideDead(true); }, 2500);
      return () => clearTimeout(t);
    }
  }, [phase]);
  const fadeTimerRef = useRef(null);
  const lastPhaseForFade = useRef(phase);

  // Phases that lead directly to night (last phases before night falls)
  const PRE_NIGHT_PHASES = [CONSTANTS.PHASE.NO_LYNCH, CONSTANTS.PHASE.SPARED, CONSTANTS.PHASE.EXECUTION, CONSTANTS.PHASE.EXECUTION_REVEAL, CONSTANTS.PHASE.NIGHT_TRANSITION];
  const fadeTimers = useRef([]);
  const walkTimer = useRef(null);

  useEffect(() => {
    // Clear all pending fade timers on phase change
    fadeTimers.current.forEach(clearTimeout);
    fadeTimers.current = [];

    // Pre-night phases: show players, start walk-away, then fade to black
    // Start sunset early during last words too
    if (phase === CONSTANTS.PHASE.LAST_WORDS) {
      setIsSunset(true);
    }

    if (PRE_NIGHT_PHASES.includes(phase)) {
      // Continue/start sunset animation
      setIsSunset(true);
      // Delay fade so sunset animation is fully visible (~5s)
      fadeTimers.current.push(setTimeout(() => {
        setNightFade('to-black');
      }, 4000));
      // Show "La nuit tombe..." a few seconds into the sunset — late enough that
      // the SPARED / NO_LYNCH / EXECUTION announcement has finished fading out,
      // so the two screen texts don't visually collide.
      fadeTimers.current.push(setTimeout(() => {
        setShowNightText(true);
      }, 3500));
      // Trigger walk-away animation (separate timer, not cleared on phase change)
      // IMPORTANT: only reveal players when we *start* the walk. Re-entering a
      // PRE_NIGHT phase (e.g. EXECUTION → NIGHT_TRANSITION) must NOT re-show
      // players if the walk already finished — otherwise their name tags pop
      // back on screen just before night begins.
      if (nightStartedForDay.current !== game.dayCount) {
        nightStartedForDay.current = game.dayCount;
        setNightPlayersHidden(false);
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
      // NOTE: day text ("Le village se lève...") is shown in the DEATH_REPORT
      // effect below — after the day fade-in has begun, so it doesn't land on
      // a full black screen.

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
    // (showDayText is now controlled by the DEATH_REPORT effect below)
    if (lastPhaseForFade.current === CONSTANTS.PHASE.NIGHT && phase !== CONSTANTS.PHASE.NIGHT) {
      setIsSunset(false);
      setNightFade('from-black');
      fadeTimers.current.push(setTimeout(() => {
        setNightFade('none');
      }, 2000));
    }

    lastPhaseForFade.current = phase;
    return () => fadeTimers.current.forEach(clearTimeout);
  }, [phase]);

  // Execution flash: red vignette during EXECUTION phase, before the text
  useEffect(() => {
    if (phase === CONSTANTS.PHASE.EXECUTION) {
      setShowExecutionFlash(true);
      return () => setShowExecutionFlash(false);
    }
    setShowExecutionFlash(false);
  }, [phase]);

  // Death report sequence: show "Le village se lève..." during day fade-in,
  // then show deaths once the text has played out
  useEffect(() => {
    if (phase === CONSTANTS.PHASE.DEATH_REPORT) {
      // Show "Le village se lève..." a bit after the fade-from-black starts
      // (~0.8s) so it appears while the day scene is already becoming visible
      const t0 = setTimeout(() => setShowDayText(true), 800);
      // Hide the day text after ~2.2s of visibility
      const t1 = setTimeout(() => setShowDayText(false), 3000);
      // Blood effect + death names take over
      const t2 = setTimeout(() => setShowBloodEffect(true), 3000);
      const t3 = setTimeout(() => {
        setShowDeathReport(true);
        // Church bell — only if someone actually died this day
        const killEvents = (events || []).filter(
          (e) => (e.type === 'KILL_RESULT' || e.type === 'disconnect') &&
                 e.dayCount === game.dayCount &&
                 e.content?.chatMessage
        );
        if (killEvents.length > 0) Audio.playDeathBell();
      }, 3300);
      return () => { clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
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
  const PLAYER_Y = 0.1; // slightly above ground so feet align with the sunken runic circle
  const dayPositions = useMemo(() => {
    const positions = {};
    // Tightened circle — players stand closer to the plaza center
    const circleRadius = 4.0;
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
    // Tightened circle — matches dayPositions so discussion/voting phases
    // keep the same layout as the walk-away start position.
    const circleRadius = 4.0;

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
      // Podium is at PODIUM_POSITION [7, 0, -6] — accused goes behind it,
      // crowd stays in the center circle facing the podium
      const podiumFaceAngle = Math.atan2(-PODIUM_POSITION[0], -PODIUM_POSITION[2]);
      alivePlayers.forEach((p, i) => {
        if (p.id === game.accusedId) {
          // Accused stands behind the podium, facing toward village center
          const behindOffset = 1.4; // behind the podium, visible gap
          const ax = PODIUM_POSITION[0] + Math.sin(podiumFaceAngle + Math.PI) * behindOffset;
          const az = PODIUM_POSITION[2] + Math.cos(podiumFaceAngle + Math.PI) * behindOffset;
          positions[p.id] = { position: [ax, PLAYER_Y, az], rotation: [0, podiumFaceAngle, 0] };
        } else {
          // Crowd stays in the normal circle but faces the podium
          const idx = i - (players.findIndex(pl => pl.id === game.accusedId) < i ? 1 : 0);
          const count = alivePlayers.length - 1;
          const angle = (idx / Math.max(count, 1)) * Math.PI * 2 - Math.PI / 2;
          const pos = [Math.cos(angle) * circleRadius, PLAYER_Y, Math.sin(angle) * circleRadius];
          const dx = PODIUM_POSITION[0] - pos[0];
          const dz = PODIUM_POSITION[2] - pos[2];
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
        shadows="soft"
        camera={{ position: [0, 9, 14], fov: 50 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.65 }}
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
                  <fog attach="fog" args={[skyColor, isDark ? 10 : isMisty ? 10 : isCloudy ? 14 : 18, isDark ? 30 : isMisty ? 30 : isCloudy ? 38 : 42]} />
                  <Sky sunPosition={[100, isDark ? 10 : isCloudy ? 20 : isMisty ? 25 : 50, 100]} turbidity={isDark ? 25 : isCloudy ? 20 : isMisty ? 12 : 8} rayleigh={isDark ? 6 : isCloudy ? 5 : 2} />
                  <DayFireflies count={isDark ? 10 : isCloudy ? 20 : 50} />
                  <FloatingDust count={isMisty ? 120 : 80} isDay />
                  {/* Wind-blown leaves — more on windy/rainy/cloudy days */}
                  <WindLeaves count={isRainyDay ? 130 : isCloudy || isGrey ? 110 : 90} />
                  <GroundFog isDay />
                  <VillageFogWall isDay />
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
                  <fog attach="fog" args={['#060818', isRainy ? 8 : isFoggy ? 8 : 12, isRainy ? 26 : isFoggy ? 28 : 34]} />
                  <Stars radius={80} depth={50} count={isRainy ? 500 : 3000} factor={4} saturation={0} fade speed={1} />
                  <Moon />
                  <Fireflies count={isRainy ? 15 : 60} />
                  <FloatingDust count={60} isDay={false} />
                  {/* Hot embers drifting in the wind — fewer on rainy nights */}
                  <NightEmbers count={isRainy ? 30 : isFoggy ? 50 : 70} />
                  <GroundFog isDay={false} />
                  <VillageFogWall isDay={false} />
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
          <Village isDay={game.isDay} isTrialPhase={isTrialPhase} />

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
                isGameOver={isGameOver}
                isWinningTeam={isGameOver && (player.character?.team === game.winner)}
              />
            );
          })}

          {/* Dead Players — visible during DEATH_REPORT, fade out after */}
          {!hideDead && deadPlayers.map((player) => {
            const pData = playerPositions[player.id] || { position: [0, 0, 0], rotation: [0, 0, 0] };
            return (
              <DeadPlayerFigure
                key={player.id}
                player={player}
                position={pData.position}
                fading={fadingDead}
              />
            );
          })}

          {/* Post-processing — minimal to avoid white artifacts */}
          <EffectComposer>
            <Bloom
              intensity={game.isDay ? 0.08 : 0.1}
              luminanceThreshold={0.95}
              luminanceSmoothing={0.2}
              mipmapBlur
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

      {/* Lynch role reveal overlay — post-execution suspense moment */}
      {phase === CONSTANTS.PHASE.EXECUTION_REVEAL && (() => {
        const executed = players.find((p) => p.id === game.accusedId);
        if (!executed?.character) return null;
        const role = executed.character;
        const teamLabel = i18n.t(`game:teams.${role.team}.short`, { defaultValue: role.team });
        const roleLabel = i18n.t(`roles:${role.key}.label`, { defaultValue: role.label });
        return (
          <div className="lynch-reveal-overlay">
            <div
              className="lynch-reveal-halo"
              style={{
                background: `radial-gradient(ellipse at center, ${role.couleur}88 0%, ${role.couleur}44 25%, ${role.couleur}1c 50%, transparent 75%)`,
              }}
            />
            <div
              className="lynch-reveal-card"
              style={{
                borderColor: role.couleur,
                boxShadow: `0 0 40px ${role.couleur}55, 0 0 100px ${role.couleur}2a`,
              }}
            >
              <div className="lynch-reveal-name">{executed.profile?.name || 'Player'}</div>
              <div className="lynch-reveal-team" style={{ color: role.couleur }}>{teamLabel}</div>
              <div className="lynch-reveal-icon" style={{ color: role.couleur }}>
                <i className={`fas ${role.icon}`}></i>
              </div>
              <div className="lynch-reveal-role" style={{ color: role.couleur }}>{roleLabel}</div>
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
                  {killEvents.map((entry, i) => {
                    // Split message: before role reveal vs role reveal
                    const msg = entry.content.chatMessage || '';
                    // Try to split at role marker (works in both FR and EN)
                    const roleMatch = msg.match(/(.*?)((?:Son rôle était|Their role was)\s*:\s*.+)/s);
                    const beforeRole = roleMatch ? roleMatch[1] : msg;
                    const roleText = roleMatch ? roleMatch[2] : null;
                    return (
                      <div key={i} className="death-report-name">
                        <span className="death-desc">{beforeRole}</span>
                        {roleText && <span className="death-role-reveal">{roleText}</span>}
                      </div>
                    );
                  })}
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
        <div className="scene-announcement" style={{ animation: 'announcement-auto-fade 3s ease-out forwards' }}>
          <div className="announcement-text announcement-spared">
            {i18n.t('game:scene.spared', { name: players.find(p => p.id === game.accusedId)?.profile.name || '?' })}
          </div>
        </div>
      )}
      {phase === CONSTANTS.PHASE.EXECUTION && (
        <>
          {/* Red vignette flash — immediate */}
          {showExecutionFlash && (
            <div className="blood-overlay" style={{ animation: 'blood-flash 2.5s ease-out forwards' }}>
              <div className="blood-overlay-inner">
                <div className="blood-vignette" />
              </div>
            </div>
          )}
          {/* Executed text — delayed 1s so flash + death anim play first */}
          <div className="scene-announcement" style={{ animation: 'announcement-auto-fade 2.5s ease-out 0.8s both' }}>
            <div className="announcement-text announcement-execution">
              {i18n.t('game:scene.executed', { name: players.find(p => p.id === game.accusedId)?.profile.name || '?' })}
            </div>
          </div>
        </>
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
        <div className="night-text-overlay is-day-text">
          <div className="night-text-content">{i18n.t('game:phases.DAY_RISING')}</div>
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
