import React, { useRef, useMemo, useState, useEffect, Suspense, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars, Html, useGLTF } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { useMultiplayerState } from 'playroomkit';
import * as THREE from 'three';
import { useGameEngine } from '../../hooks/useGameEngine';
import { Character } from '../Character/Character';
import './MainScene.scss';

// Ambient night messages
const NIGHT_AMBIANCE = [
  'Un bruit sourd résonne du côté de l\'église...',
  'La lune brille d\'un éclat inquiétant ce soir.',
  'Des pas furtifs se font entendre dans la ruelle...',
  'Une ombre se glisse entre les maisons.',
  'Le vent souffle et emporte des murmures lointains...',
  'Les preuves sont les seules traces qui restent d\'une mort...',
  'Quelqu\'un frappe à une porte... puis le silence.',
  'Un cri étouffé perce la nuit.',
  'Les torches vacillent dans l\'obscurité...',
  'Le village retient son souffle.',
  'Une lumière s\'éteint dans une maison au loin...',
  'Les étoiles semblent observer le village cette nuit.',
  'Un chat noir traverse la place du village...',
  'Le bois de la potence grince sous le vent...',
];

// ============================================================
// Ground with dirt path
// ============================================================
const GroundPlane = ({ isDay }) => (
  <group>
    {/* Main grass */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <circleGeometry args={[30, 64]} />
      <meshStandardMaterial color={isDay ? '#3a6e2c' : '#1a2e1c'} />
    </mesh>
    {/* Dirt path ring around village */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, 0]} receiveShadow>
      <ringGeometry args={[7, 9, 32]} />
      <meshStandardMaterial color={isDay ? '#8B7355' : '#3d3325'} />
    </mesh>
    {/* Inner dirt area */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, 0]} receiveShadow>
      <circleGeometry args={[6.5, 32]} />
      <meshStandardMaterial color={isDay ? '#7a6a50' : '#352d20'} />
    </mesh>
    {/* Night ground fog layer */}
    {!isDay && (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]}>
        <circleGeometry args={[25, 32]} />
        <meshBasicMaterial color="#1a2244" transparent opacity={0.1} depthWrite={false} />
      </mesh>
    )}
  </group>
);

// (Old procedural Building component removed — replaced by Meshy AI models)

// ============================================================
// Improved Torch with multi-layer flame
// ============================================================
const Torch = ({ position }) => {
  const lightRef = useRef();
  const flameRef = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (lightRef.current) {
      lightRef.current.intensity = 2 + Math.sin(t * 8 + position[0]) * 0.5 + Math.sin(t * 13) * 0.2;
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
      <pointLight ref={lightRef} position={[0, 1.85, 0]} intensity={2} color="#ff8833" distance={10} castShadow />
    </group>
  );
};

// ============================================================
// Meshy AI GLB Model Loader — known Y bounds (no Box3 needed)
// ============================================================
const MODEL_BOUNDS = {
  '/models/rue.glb':                  { min: -0.226, max: 0.224 },
  '/models/cobblestone_platform.glb': { min: -0.052, max: 0.039 },
  '/models/terrain.glb':              { min: -0.028, max: 0.028 },
  '/models/forge.glb':                { min: -0.957, max: 0.954 },
  '/models/tavern.glb':               { min: -0.957, max: 0.955 },
  '/models/chapel.glb':               { min: -0.957, max: 0.957 },
  '/models/cottage.glb':              { min: -0.957, max: 0.954 },
  '/models/mountain.glb':             { min: -0.407, max: 0.405 },
  '/models/gallows.glb':  { min: -0.616, max: 0.615 },
};

const MeshyModel = ({ path, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, embedY = false }) => {
  const { scene } = useGLTF(path);
  const clonedScene = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  // Use known model bounds for reliable Y positioning
  const bounds = MODEL_BOUNDS[path] || { min: 0, max: 0 };
  const sy = typeof scale === 'number' ? scale : scale[1];
  const yOffset = embedY
    ? -bounds.max * sy + 0.05   // flat surface: top flush with ground
    : -bounds.min * sy;          // object: bottom sits on ground

  return (
    <primitive
      object={clonedScene}
      position={[position[0], position[1] + yOffset, position[2]]}
      rotation={rotation}
      scale={typeof scale === 'number' ? [scale, scale, scale] : scale}
    />
  );
};

// ============================================================
// Village Center — Cobblestone circle + Gallows (Meshy AI)
// ============================================================
// Dedicated gallows component — bypasses auto-grounding with known dimensions
const GallowsModel = () => {
  const { scene } = useGLTF('/models/gallows.glb');
  const clone = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
    return c;
  }, [scene]);

  // Known: minY = -0.616 → Y offset = 0.616 * scale to sit on ground
  const s = 2;
  return <primitive object={clone} position={[0, 0.616 * s, 0]} scale={[s, s, s]} />;
};

const VillageCenter = () => (
  <group>
    {/* Gallows only — no roads at center */}
    <GallowsModel />
  </group>
);

// (Old procedural Gallows removed — now using Meshy AI model in VillageCenter)

// ============================================================
// Low-poly Tree
// ============================================================
const LowPolyTree = ({ position, scale = 1, variant = 0 }) => (
  <group position={position} scale={scale} rotation={[0, variant * 1.3, 0]}>
    {/* Trunk */}
    <mesh position={[0, 0.6, 0]} castShadow>
      <cylinderGeometry args={[0.06, 0.1, 1.2, 5]} />
      <meshStandardMaterial color="#4a3520" />
    </mesh>
    {/* Foliage layers */}
    <mesh position={[0, 1.5, 0]} castShadow>
      <coneGeometry args={[0.9, 1.6, 6]} />
      <meshStandardMaterial color={variant % 2 === 0 ? '#1a5a1a' : '#1d4a1d'} />
    </mesh>
    <mesh position={[0, 2.1, 0]} castShadow>
      <coneGeometry args={[0.65, 1.2, 6]} />
      <meshStandardMaterial color={variant % 2 === 0 ? '#1d6a1d' : '#1a5a1a'} />
    </mesh>
    <mesh position={[0, 2.5, 0]} castShadow>
      <coneGeometry args={[0.4, 0.9, 5]} />
      <meshStandardMaterial color="#206a20" />
    </mesh>
  </group>
);

// (Barrels removed)

// ============================================================
// Village Layout
// ============================================================
// Rotation Y so a building faces center [0,0] from position [bx, bz]
const faceCenter = (bx, bz) => Math.atan2(-bx, -bz);

// Meshy AI building positions — all rotated to face center, spaced to avoid overlap
// Buildings are ~3-4 units wide at their scale, so min ~5 units between each
const MESHY_BUILDINGS = [
  // Unique buildings (inner ring — well spaced)
  { path: '/models/forge.glb',   position: [-9, 0, -7],   scale: 3,   get rotation() { return [0, faceCenter(-9, -7), 0]; } },
  { path: '/models/tavern.glb',  position: [9, 0, -7],    scale: 3,   get rotation() { return [0, faceCenter(9, -7), 0]; } },
  { path: '/models/chapel.glb',  position: [0, 0, -12],   scale: 3.5, get rotation() { return [0, faceCenter(0, -12), 0]; } },
  // Inner ring cottages
  { path: '/models/cottage.glb', position: [-10, 0, 1],   scale: 2.8, get rotation() { return [0, faceCenter(-10, 1), 0]; } },
  { path: '/models/cottage.glb', position: [10, 0, 2],    scale: 2.8, get rotation() { return [0, faceCenter(10, 2), 0]; } },
  { path: '/models/cottage.glb', position: [-7, 0, 8],    scale: 2.5, get rotation() { return [0, faceCenter(-7, 8), 0]; } },
  { path: '/models/cottage.glb', position: [7, 0, 9],     scale: 2.5, get rotation() { return [0, faceCenter(7, 9), 0]; } },
  { path: '/models/cottage.glb', position: [-5, 0, -10],  scale: 2.5, get rotation() { return [0, faceCenter(-5, -10), 0]; } },
  // Outer ring — well spaced from inner
  { path: '/models/cottage.glb', position: [-15, 0, -10], scale: 2.5, get rotation() { return [0, faceCenter(-15, -10), 0]; } },
  { path: '/models/cottage.glb', position: [15, 0, -10],  scale: 2.5, get rotation() { return [0, faceCenter(15, -10), 0]; } },
  { path: '/models/cottage.glb', position: [-16, 0, -3],  scale: 2.3, get rotation() { return [0, faceCenter(-16, -3), 0]; } },
  { path: '/models/cottage.glb', position: [16, 0, -2],   scale: 2.3, get rotation() { return [0, faceCenter(16, -2), 0]; } },
  { path: '/models/cottage.glb', position: [-15, 0, 5],   scale: 2.3, get rotation() { return [0, faceCenter(-15, 5), 0]; } },
  { path: '/models/cottage.glb', position: [15, 0, 6],    scale: 2.3, get rotation() { return [0, faceCenter(15, 6), 0]; } },
  { path: '/models/cottage.glb', position: [-11, 0, 13],  scale: 2.5, get rotation() { return [0, faceCenter(-11, 13), 0]; } },
  { path: '/models/cottage.glb', position: [11, 0, 14],   scale: 2.5, get rotation() { return [0, faceCenter(11, 14), 0]; } },
  { path: '/models/cottage.glb', position: [6, 0, -16],   scale: 2.3, get rotation() { return [0, faceCenter(6, -16), 0]; } },
  { path: '/models/cottage.glb', position: [-8, 0, -15],  scale: 2.3, get rotation() { return [0, faceCenter(-8, -15), 0]; } },
  // Fill — south and mid-ring
  { path: '/models/cottage.glb', position: [-3, 0, 12],   scale: 2.3, get rotation() { return [0, faceCenter(-3, 12), 0]; } },
  { path: '/models/cottage.glb', position: [3, 0, 13],    scale: 2.3, get rotation() { return [0, faceCenter(3, 13), 0]; } },
  { path: '/models/cottage.glb', position: [0, 0, 17],    scale: 2.2, get rotation() { return [0, faceCenter(0, 17), 0]; } },
  { path: '/models/cottage.glb', position: [-13, 0, -6],  scale: 2.4, get rotation() { return [0, faceCenter(-13, -6), 0]; } },
  { path: '/models/cottage.glb', position: [13, 0, -4],   scale: 2.4, get rotation() { return [0, faceCenter(13, -4), 0]; } },
  { path: '/models/cottage.glb', position: [-17, 0, 10],  scale: 2.2, get rotation() { return [0, faceCenter(-17, 10), 0]; } },
  { path: '/models/cottage.glb', position: [17, 0, 11],   scale: 2.2, get rotation() { return [0, faceCenter(17, 11), 0]; } },
  { path: '/models/cottage.glb', position: [9, 0, -13],   scale: 2.3, get rotation() { return [0, faceCenter(9, -13), 0]; } },
  { path: '/models/cottage.glb', position: [-14, 0, 15],  scale: 2.2, get rotation() { return [0, faceCenter(-14, 15), 0]; } },
  { path: '/models/cottage.glb', position: [14, 0, 16],   scale: 2.2, get rotation() { return [0, faceCenter(14, 16), 0]; } },
];

// Cobblestone ground tiles — cover village area with paved ground
// cobblestone_platform.glb: 1.90 x 0.09 x 1.90 (flat square)
// Desert terrain tiles — cover entire village + surroundings
// terrain.glb: 1.9 x 1.9 flat tile → scale 12 = ~23u per tile
const GROUND_TILES = [
  { position: [0, 0, 0],     scale: 12 },
  { position: [22, 0, 0],    scale: 12 },
  { position: [-22, 0, 0],   scale: 12 },
  { position: [0, 0, 22],    scale: 12 },
  { position: [0, 0, -22],   scale: 12 },
  { position: [-22, 0, -22], scale: 12 },
  { position: [22, 0, -22],  scale: 12 },
  { position: [-22, 0, 22],  scale: 12 },
  { position: [22, 0, 22],   scale: 12 },
];

// A few short alleys between close buildings (decorative, using rue.glb)
const makeAlley = (ax, az, bx, bz) => {
  const dx = bx - ax, dz = bz - az;
  const dist = Math.sqrt(dx * dx + dz * dz);
  return {
    position: [(ax + bx) / 2, 0, (az + bz) / 2],
    rotation: [0, Math.atan2(-dz, dx), 0],
    scale: [dist / 1.9, 1, 5],
  };
};

const ALLEYS = [
  makeAlley(-7, -8.5, -3, -10.5),   // between forge & cottage near chapel
  makeAlley(3, -10, 6, -9),          // between chapel & tavern area
  makeAlley(-9.5, -3, -9.5, 0),     // narrow alley W of forge
  makeAlley(9.5, -2, 9.5, 1),       // narrow alley E of tavern
  makeAlley(-8.5, 4, -7.5, 7),      // between W cottages
  makeAlley(8.5, 5, 7.5, 8),        // between E cottages
];

// Background mountains — ring around the village, closer and shorter
const MOUNTAINS = [
  { position: [0, 0, -28],   rotation: [0, 0, 0],            scale: 15 },   // north (behind chapel)
  { position: [-22, 0, -20], rotation: [0, 0.5, 0],          scale: 12 },   // northwest
  { position: [22, 0, -20],  rotation: [0, -0.4, 0],         scale: 13 },   // northeast
  { position: [-28, 0, 0],   rotation: [0, 0.8, 0],          scale: 11 },   // west
  { position: [28, 0, 0],    rotation: [0, -0.7, 0],         scale: 11 },   // east
  { position: [-24, 0, 18],  rotation: [0, 1.2, 0],          scale: 12 },   // southwest
  { position: [24, 0, 18],   rotation: [0, -1.1, 0],         scale: 12 },   // southeast
  { position: [0, 0, 24],    rotation: [0, Math.PI, 0],      scale: 13 },   // south
  { position: [-12, 0, -26], rotation: [0, 0.3, 0],          scale: 9 },    // NNW (fill gap)
  { position: [12, 0, -26],  rotation: [0, -0.2, 0],         scale: 9 },    // NNE (fill gap)
];

const TORCH_POS = [
  [-4, 0, -4], [4, 0, -4], [-4, 0, 4], [4, 0, 4],
  [0, 0, -5.5], [-5.5, 0, 0], [5.5, 0, 0], [0, 0, 5.5],
];

const TREE_POSITIONS = [
  [-13, 0, -10], [-15, 0, 0], [-13, 0, 8], [-8, 0, 12],
  [13, 0, -8], [15, 0, 2], [11, 0, 11], [0, 0, 14],
  [-16, 0, -5], [16, 0, -3], [-11, 0, -13], [9, 0, -13],
  [-17, 0, 6], [17, 0, 7], [0, 0, -15], [5, 0, 15],
  [-14, 0, 12], [14, 0, -11],
];

const Village = ({ isDay }) => (
  <group>
    {/* Ground tiles removed */}

    {/* Gallows at center */}
    <VillageCenter />

    {/* Buildings */}
    {MESHY_BUILDINGS.map((b, i) => (
      <MeshyModel key={`meshy-${i}`} path={b.path} position={b.position} rotation={b.rotation} scale={b.scale} />
    ))}

    {/* A few decorative alleys between buildings */}
    {ALLEYS.map((a, i) => (
      <MeshyModel key={`alley-${i}`} path="/models/rue.glb" position={a.position} rotation={a.rotation} scale={a.scale} />
    ))}

    {/* Torches (night only) */}
    {!isDay && TORCH_POS.map((pos, i) => <Torch key={`torch-${i}`} position={pos} />)}

    {/* Trees */}
    {TREE_POSITIONS.map((pos, i) => (
      <LowPolyTree key={`tree-${i}`} position={pos} scale={0.7 + (i % 4) * 0.2} variant={i} />
    ))}

    {/* Background mountains */}
    {MOUNTAINS.map((m, i) => (
      <MeshyModel key={`mountain-${i}`} path="/models/mountain.glb" position={m.position} rotation={m.rotation} scale={m.scale} />
    ))}
  </group>
);

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
// Fireflies (night particle effect)
// ============================================================
const Fireflies = ({ count = 40 }) => {
  const meshRef = useRef();
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 35,
        y: Math.random() * 3.5 + 0.5,
        z: (Math.random() - 0.5) * 35,
        speed: Math.random() * 0.4 + 0.15,
        offset: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    particles.forEach((p, i) => {
      const px = p.x + Math.sin(t * p.speed + p.offset) * 1.5;
      const py = p.y + Math.sin(t * p.speed * 1.5 + p.offset) * 0.4;
      const pz = p.z + Math.cos(t * p.speed + p.offset) * 1.5;
      dummy.position.set(px, py, pz);
      const pulse = 0.4 + Math.sin(t * 3 + p.offset) * 0.35;
      dummy.scale.setScalar(pulse);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[0.04, 4, 4]} />
      <meshBasicMaterial color="#bbffaa" transparent opacity={0.75} />
    </instancedMesh>
  );
};

// ============================================================
// Day Fireflies (golden, gentle floating)
// ============================================================
const DayFireflies = ({ count = 40 }) => {
  const meshRef = useRef();
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 35,
        y: Math.random() * 4 + 0.5,
        z: (Math.random() - 0.5) * 35,
        speed: Math.random() * 0.3 + 0.1,
        offset: Math.random() * Math.PI * 2,
      });
    }
    return arr;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    particles.forEach((p, i) => {
      const px = p.x + Math.sin(t * p.speed + p.offset) * 2;
      const py = p.y + Math.sin(t * p.speed * 1.5 + p.offset) * 0.5;
      const pz = p.z + Math.cos(t * p.speed + p.offset) * 2;
      dummy.position.set(px, py, pz);
      const pulse = 0.4 + Math.sin(t * 2.5 + p.offset) * 0.3;
      dummy.scale.setScalar(pulse);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[0.04, 4, 4]} />
      <meshBasicMaterial color="#ffdd66" transparent opacity={0.6} />
    </instancedMesh>
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
// Player Figure — uses Character model with rotation + walk
// ============================================================
const PlayerFigure = ({ player, position, rotation, color, isAccused, showVote, isVoteTarget, onVote, voteCount, totalAlive, showJudgment, onJudge, startPosition, isTransitioning, transitionDuration = 3, characterScale = 0.8, pauseAnim = null }) => {
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

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <Character
        color={color}
        animation={pauseAnim || currentAnim}
        scale={characterScale || 0.8}
        animOffset={player.id ? (player.id.charCodeAt(0) % 20) * 0.15 : 0}
      />
      {/* Player color glow — colored light under the character */}
      <pointLight position={[0, 0.5, 0]} color={color} intensity={1.5} distance={4} />
      {/* Colored ground ring */}
      <mesh position={[0, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.6, 24]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>
      {/* Accused ring */}
      {isAccused && (
        <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.7, 0.9, 16]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.7} />
        </mesh>
      )}
      {/* Name label — Html for consistent screen-space size */}
      <Html position={[0, 2.4, 0]} center distanceFactor={8}>
        <div style={{
          color: player.profile?.color || color,
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '13px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          textShadow: '1px 1px 2px black',
          border: `1px solid ${player.profile?.color || color}`,
        }}>
          {player.profile.name}
        </div>
      </Html>
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
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '13px',
        fontWeight: 'bold',
        whiteSpace: 'nowrap',
        textShadow: '1px 1px 2px black',
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
// Collision check — y-aware: skip if player is above the obstacle
const checkCollision = (x, z, y, otherPlayers) => {
  // Buildings (height ~4u at scale 3)
  for (const b of MESHY_BUILDINGS) {
    const bx = b.position[0], bz = b.position[2];
    const s = typeof b.scale === 'number' ? b.scale : 3;
    const dx = x - bx, dz = z - bz;
    const r = 0.7 * s;
    const h = 1.5 * s; // building height
    if (dx * dx + dz * dz < r * r && y < h) return true;
  }
  // Gallows at center (radius 1.2, height ~2.5)
  if (x * x + z * z < 1.4 && y < 2.5) return true;
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
      switch (phase) {
        case CONSTANTS.PHASE.DEFENSE:
        case CONSTANTS.PHASE.JUDGMENT:
        case CONSTANTS.PHASE.LAST_WORDS:
        case CONSTANTS.PHASE.EXECUTION:
          targetPos.current.set(3, 4, 5);
          targetLookAt.current.set(0, 1, 0);
          break;
        case CONSTANTS.PHASE.DISCUSSION:
        case CONSTANTS.PHASE.VOTING:
          targetPos.current.set(0, 10, 10);
          targetLookAt.current.set(0, 0, 0);
          break;
        default:
          targetPos.current.set(0, 8, 12);
          targetLookAt.current.set(0, 0, 0);
      }
    }

    // When leaving night: snap camera instantly to day position (no lerp from stars)
    const comingFromNight = prevPhaseRef.current === CONSTANTS.PHASE.NIGHT && phase !== CONSTANTS.PHASE.NIGHT;
    if (comingFromNight) {
      camera.position.set(0, 8, 12);
      camera.lookAt(0, 0, 0);
      targetPos.current.set(0, 8, 12);
      targetLookAt.current.set(0, 0, 0);
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
const SceneLighting = ({ isDay }) => {
  const sunRef = useRef();
  const sunGlowRef = useRef();
  const fillRef = useRef();
  const ambientRef = useRef();

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    // Sun moves in a slow arc across the sky (day)
    // Full arc in ~120s, from east [20,15,-15] to west [-20,20,15]
    if (isDay && sunRef.current) {
      const sunAngle = -Math.PI * 0.8 + t * 0.02; // start behind+right of camera, slow arc
      const sunX = Math.cos(sunAngle) * 20;
      const sunY = 18 + Math.sin(sunAngle * 0.5) * 6;
      const sunZ = -Math.sin(sunAngle) * 20;
      sunRef.current.position.set(sunX, sunY, sunZ);

      // Move sun glow to match
      if (sunGlowRef.current) {
        sunGlowRef.current.position.set(sunX * 2.5, sunY * 2.5, sunZ * 2.5);
      }
    }

    // Smooth intensity transitions
    if (sunRef.current) {
      const target = isDay ? 3.0 : 0.5;
      sunRef.current.intensity += (target - sunRef.current.intensity) * 0.03;
    }
    if (fillRef.current) {
      const target = isDay ? 1.0 : 0.2;
      fillRef.current.intensity += (target - fillRef.current.intensity) * 0.03;
    }
    if (ambientRef.current) {
      const target = isDay ? 0.6 : 0.2;
      ambientRef.current.intensity += (target - ambientRef.current.intensity) * 0.03;
    }
  });

  return (
    <>
      {/* Base ambient */}
      <ambientLight ref={ambientRef} intensity={isDay ? 0.6 : 0.2} />

      {/* Main sun / moon — casts shadows, position animated in useFrame */}
      <directionalLight
        ref={sunRef}
        position={isDay ? [15, 20, 10] : [-5, 12, 8]}
        intensity={isDay ? 3.0 : 0.5}
        color={isDay ? '#fff5e0' : '#6677aa'}
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

      {/* Warm fill light from opposite side */}
      <directionalLight
        ref={fillRef}
        position={isDay ? [-10, 8, -5] : [5, 6, -8]}
        intensity={isDay ? 1.0 : 0.2}
        color={isDay ? '#ffd4a0' : '#334466'}
      />

      {/* Hemisphere — sky/ground color bleed */}
      <hemisphereLight
        color={isDay ? '#87CEEB' : '#1a1a3a'}
        groundColor={isDay ? '#8B7355' : '#0a0a15'}
        intensity={isDay ? 0.4 : 0.15}
      />

      {/* Sun glow — visible sphere that moves with the light */}
      {isDay && (
        <group ref={sunGlowRef} position={[40, 50, 25]}>
          <pointLight color="#fff0cc" intensity={0.8} distance={120} />
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

  // Black fade overlay for night→day transition
  const [nightFade, setNightFade] = useState(false);
  const lastPhaseForFade = useRef(phase);
  useEffect(() => {
    // Trigger black fade when leaving NIGHT
    if (lastPhaseForFade.current === CONSTANTS.PHASE.NIGHT && phase !== CONSTANTS.PHASE.NIGHT) {
      setNightFade(true);
      setTimeout(() => setNightFade(false), 2500);
    }
    lastPhaseForFade.current = phase;
  }, [phase]);

  // Night walk-away transition + hide after walk
  const nightStartedForDay = useRef(null);
  const [nightTransition, setNightTransition] = useState(false);
  const [nightPlayersHidden, setNightPlayersHidden] = useState(false);

  useEffect(() => {
    if (phase === CONSTANTS.PHASE.NIGHT) {
      if (nightStartedForDay.current !== game.dayCount) {
        // First time entering this night — trigger walk-away once
        nightStartedForDay.current = game.dayCount;
        setNightPlayersHidden(false);
        setNightTransition(true);
        const walkTimer = setTimeout(() => {
          setNightTransition(false);
          setNightPlayersHidden(true);
        }, 3000);
        return () => clearTimeout(walkTimer);
      }
    } else {
      setNightPlayersHidden(false);
    }
  }, [phase, game.dayCount]);

  // Day circle positions (for night walk-away start)
  const dayPositions = useMemo(() => {
    const positions = {};
    const circleRadius = 4;
    alivePlayers.forEach((p, i) => {
      const angle = (i / Math.max(alivePlayers.length, 1)) * Math.PI * 2 - Math.PI / 2;
      positions[p.id] = [Math.cos(angle) * circleRadius, 0, Math.sin(angle) * circleRadius];
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
        const pos = [Math.cos(angle) * 8, 0, Math.sin(angle) * 8];
        positions[p.id] = {
          position: pos,
          rotation: [0, Math.atan2(pos[0], pos[2]), 0], // face outward
        };
      });
    } else if (isTrialPhase) {
      alivePlayers.forEach((p, i) => {
        if (p.id === game.accusedId) {
          positions[p.id] = { position: [0, 0.3, -1.5], rotation: [0, Math.PI, 0] }; // face crowd
        } else {
          const idx = i - (players.findIndex(pl => pl.id === game.accusedId) < i ? 1 : 0);
          const count = alivePlayers.length - 1;
          const angle = (idx / Math.max(count, 1)) * Math.PI - Math.PI / 2;
          const pos = [Math.cos(angle) * 4, 0, Math.sin(angle) * 4 + 2];
          // Face towards accused (center area)
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
        const pos = [Math.cos(angle) * circleRadius, 0, Math.sin(angle) * circleRadius];
        positions[p.id] = {
          position: pos,
          rotation: [0, Math.atan2(pos[0], pos[2]) + Math.PI, 0], // face center
        };
      });
    }

    deadPlayers.forEach((p, i) => {
      positions[p.id] = { position: [-12 + i * 2, 0, -12], rotation: [0, 0, 0] };
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
        gl={{ antialias: true }}
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
          <SceneLighting isDay={game.isDay} />

          {/* Sky & atmosphere */}
          {game.isDay ? (
            <>
              <color attach="background" args={['#87CEEB']} />
              <Sky sunPosition={[100, 60, 100]} turbidity={8} rayleigh={2} />
              <DayFireflies count={40} />
            </>
          ) : (
            <>
              <color attach="background" args={['#060818']} />
              <fog attach="fog" args={['#060818', 25, 55]} />
              <Stars radius={80} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
              <Moon />
              <Fireflies count={50} />
            </>
          )}

          <GroundPlane isDay={game.isDay} />
          <Village isDay={game.isDay} />

          {/* Alive Players — hidden after night walk finishes */}
          {!nightPlayersHidden && alivePlayers.map((player) => {
            const isMe = player.id === me?.id;
            const isAccused = player.id === game.accusedId;
            const showVoteBtn = isVotingPhase && me?.isAlive && !isMe;
            const isVoteTarget = myVoteTarget === player.id;
            const showJudgmentBtn = isJudgmentPhase && isAccused && me?.isAlive && me.id !== game.accusedId && !hasJudged;
            const pData = playerPositions[player.id] || { position: [0, 0, 0], rotation: [0, 0, 0] };
            // During pause, override local player's position, rotation and animation
            const usePos = (isPaused && isMe && pausePos) ? pausePos : pData.position;
            const useRot = (isPaused && isMe) ? [0, pauseYaw + Math.PI, 0] : pData.rotation;
            return (
              <PlayerFigure
                key={player.id}
                player={player}
                position={usePos}
                rotation={useRot}
                pauseAnim={(isPaused && isMe) ? pauseAnim : null}
                startPosition={nightTransition ? dayPositions[player.id] : null}
                isTransitioning={nightTransition}
                transitionDuration={3}
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
              intensity={game.isDay ? 0.2 : 0.7}
              luminanceThreshold={game.isDay ? 0.9 : 0.5}
              luminanceSmoothing={0.4}
              mipmapBlur
            />
            <Vignette
              offset={game.isDay ? 0.3 : 0.15}
              darkness={game.isDay ? 0.3 : 0.65}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* Night ambiance messages */}
      {phase === CONSTANTS.PHASE.NIGHT && <NightAmbiance />}

      {/* Death report overlay */}
      {phase === CONSTANTS.PHASE.DEATH_REPORT && (() => {
        const dayMessages = (chatMessages || []).filter(
          m => m.type === 'system' && m.dayCount === game.dayCount && m.content !== `--- Jour ${game.dayCount} ---`
        );
        return dayMessages.length > 0 ? (
          <div className="scene-announcement">
            <div className="announcement-text announcement-report">
              {dayMessages.map((m, i) => (
                <div key={i}>{m.content}</div>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* Discussion start */}
      {phase === CONSTANTS.PHASE.DISCUSSION && (
        <div className="scene-announcement scene-announcement-fade">
          <div className="announcement-text">Le village se réveille...</div>
        </div>
      )}

      {/* Phase announcements */}
      {phase === CONSTANTS.PHASE.NO_LYNCH && (
        <div className="scene-announcement">
          <div className="announcement-text">Personne ne sera lynché aujourd'hui.</div>
        </div>
      )}
      {phase === CONSTANTS.PHASE.SPARED && (
        <div className="scene-announcement">
          <div className="announcement-text announcement-spared">
            {players.find(p => p.id === game.accusedId)?.profile.name || 'Le joueur'} a été épargné !
          </div>
        </div>
      )}
      {phase === CONSTANTS.PHASE.EXECUTION && (
        <div className="scene-announcement">
          <div className="announcement-text announcement-execution">
            {players.find(p => p.id === game.accusedId)?.profile.name || 'Le joueur'} a été exécuté !
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
      {nightFade && <div className="night-day-fade" />}
    </div>
  );
};

// Night ambiance — 3 unique messages per night
const NightAmbiance = () => {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timeout;
    const shuffled = [...NIGHT_AMBIANCE].sort(() => Math.random() - 0.5);
    const picks = shuffled.slice(0, 3);
    let index = 0;

    const showNext = () => {
      if (index >= picks.length) return;
      setMessage(picks[index]);
      setVisible(true);
      index++;
      timeout = setTimeout(() => {
        setVisible(false);
        if (index < picks.length) {
          timeout = setTimeout(showNext, 2500);
        }
      }, 7000);
    };

    timeout = setTimeout(showNext, 2000);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className={`night-ambiance ${visible ? 'visible' : ''}`}>
      <div className="night-ambiance-text">{message}</div>
    </div>
  );
};

export default MainScene;

// Preload Meshy AI models for faster loading
useGLTF.preload('/models/rue.glb');
useGLTF.preload('/models/gallows.glb');
useGLTF.preload('/models/forge.glb');
useGLTF.preload('/models/tavern.glb');
useGLTF.preload('/models/chapel.glb');
useGLTF.preload('/models/cottage.glb');
useGLTF.preload('/models/mountain.glb');
useGLTF.preload('/models/cobblestone_platform.glb');
useGLTF.preload('/models/terrain.glb');
