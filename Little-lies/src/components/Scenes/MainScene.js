import React, { useRef, useMemo, useState, useEffect, Suspense, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars, Text, Billboard, Html, useGLTF } from '@react-three/drei';
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
// Meshy AI GLB Model Loader (auto-grounds model on Y=0)
// ============================================================
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

  // Auto-compute Y offset so the model bottom sits at ground level
  const groundedPosition = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedScene);
    const s = typeof scale === 'number' ? scale : scale[1];
    if (embedY) {
      // For flat surfaces (cobblestone): embed so top is flush with ground
      const topOffset = box.max.y * s;
      return [position[0], position[1] - topOffset + 0.05, position[2]];
    }
    // For buildings/objects: lift so bottom sits on ground
    const bottomOffset = box.min.y * s;
    return [position[0], position[1] - bottomOffset, position[2]];
  }, [clonedScene, position, scale, embedY]);

  return (
    <primitive
      object={clonedScene}
      position={groundedPosition}
      rotation={rotation}
      scale={typeof scale === 'number' ? [scale, scale, scale] : scale}
    />
  );
};

// ============================================================
// Village Center — Cobblestone circle + Gallows (Meshy AI)
// ============================================================
const VillageCenter = () => (
  <group>
    {/* Cobblestone circle path — embedded flush with ground */}
    <MeshyModel
      path="/models/cobblestone_circle.glb"
      position={[0, 0, 0]}
      scale={5}
      embedY
    />
    {/* Gallows — auto-grounded on Y=0, bigger for visibility */}
    <MeshyModel
      path="/models/gallows.glb"
      position={[0, 0, 0]}
      scale={5}
    />
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

// ============================================================
// Barrel prop
// ============================================================
const Barrel = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    <mesh position={[0, 0.35, 0]} castShadow>
      <cylinderGeometry args={[0.22, 0.26, 0.7, 8]} />
      <meshStandardMaterial color="#6b3a1a" />
    </mesh>
    {/* Metal bands */}
    <mesh position={[0, 0.18, 0]}>
      <cylinderGeometry args={[0.27, 0.27, 0.04, 8]} />
      <meshStandardMaterial color="#555" metalness={0.6} roughness={0.4} />
    </mesh>
    <mesh position={[0, 0.52, 0]}>
      <cylinderGeometry args={[0.23, 0.23, 0.04, 8]} />
      <meshStandardMaterial color="#555" metalness={0.6} roughness={0.4} />
    </mesh>
  </group>
);

// ============================================================
// Village Layout
// ============================================================
// Rotation Y so a building faces center [0,0] from position [bx, bz]
const faceCenter = (bx, bz) => Math.atan2(-bx, -bz);

// Meshy AI building positions & config — all rotated to face center
const MESHY_BUILDINGS = [
  // Unique buildings
  { path: '/models/forge.glb',   position: [-8, 0, -6],  scale: 3,   get rotation() { return [0, faceCenter(-8, -6), 0]; } },
  { path: '/models/tavern.glb',  position: [8, 0, -5],   scale: 3,   get rotation() { return [0, faceCenter(8, -5), 0]; } },
  { path: '/models/chapel.glb',  position: [0, 0, -10],  scale: 3.5, get rotation() { return [0, faceCenter(0, -10), 0]; } },
  // Cottages spread around the village
  { path: '/models/cottage.glb', position: [-10, 0, 2],  scale: 2.8, get rotation() { return [0, faceCenter(-10, 2), 0]; } },
  { path: '/models/cottage.glb', position: [9, 0, 3],    scale: 2.8, get rotation() { return [0, faceCenter(9, 3), 0]; } },
  { path: '/models/cottage.glb', position: [-6, 0, 7],   scale: 2.5, get rotation() { return [0, faceCenter(-6, 7), 0]; } },
  { path: '/models/cottage.glb', position: [6, 0, 8],    scale: 2.5, get rotation() { return [0, faceCenter(6, 8), 0]; } },
  { path: '/models/cottage.glb', position: [-4, 0, -9],  scale: 2.5, get rotation() { return [0, faceCenter(-4, -9), 0]; } },
];

// Auto-generate cobblestone street from center [0,0] toward a building
// cobblestone native: 1.912 along X → rotate X-axis to point at building
const makeStreet = (bx, bz, width = 5) => ({
  position: [bx / 2, 0, bz / 2],
  rotation: [0, Math.atan2(-bz, bx), 0],
  scale: [Math.sqrt(bx * bx + bz * bz) / 1.9, 3, width],
});

const STREETS = [
  makeStreet(-8, -6, 6),     // → forge
  makeStreet(8, -5, 6),      // → tavern
  makeStreet(0, -10, 6),     // → chapel
  makeStreet(-10, 2, 5),     // → cottage west
  makeStreet(9, 3, 5),       // → cottage east
  makeStreet(-6, 7, 5),      // → cottage SW
  makeStreet(6, 8, 5),       // → cottage SE
  makeStreet(-4, -9, 5),     // → cottage near chapel
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

const BARREL_POSITIONS = [
  [-7, 0, -3.5], [7.5, 0, 5.5], [-5.5, 0, 6.5],
  [8.5, 0, -2.5], [-9, 0, -3],
];

const Village = ({ isDay }) => (
  <group>
    {/* Center piece — cobblestone path + gallows (Meshy AI) */}
    <VillageCenter />

    {/* Meshy AI buildings — forge, tavern, chapel */}
    {MESHY_BUILDINGS.map((b, i) => (
      <MeshyModel key={`meshy-${i}`} path={b.path} position={b.position} rotation={b.rotation} scale={b.scale} />
    ))}

    {/* Cobblestone streets connecting buildings to center */}
    {STREETS.map((s, i) => (
      <MeshyModel key={`street-${i}`} path="/models/cobblestone_circle.glb" position={s.position} rotation={s.rotation} scale={s.scale} embedY />
    ))}

    {/* Torches (night only) */}
    {!isDay && TORCH_POS.map((pos, i) => <Torch key={`torch-${i}`} position={pos} />)}

    {/* Trees */}
    {TREE_POSITIONS.map((pos, i) => (
      <LowPolyTree key={`tree-${i}`} position={pos} scale={0.7 + (i % 4) * 0.2} variant={i} />
    ))}

    {/* Barrels */}
    {BARREL_POSITIONS.map((pos, i) => (
      <Barrel key={`barrel-${i}`} position={pos} rotation={[0, i * 1.1, 0]} />
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
const PlayerFigure = ({ player, position, rotation, color, isAccused, showVote, isVoteTarget, onVote, voteCount, totalAlive, showJudgment, onJudge, startPosition, isTransitioning, transitionDuration = 3 }) => {
  const groupRef = useRef();
  const transitionStartTime = useRef(null);
  const [currentAnim, setCurrentAnim] = useState('Idle');

  useEffect(() => {
    if (isTransitioning && startPosition) {
      transitionStartTime.current = null;
      setCurrentAnim('Walk');
    } else {
      setCurrentAnim('Idle');
    }
  }, [isTransitioning, startPosition]);

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

      // Interpolate position
      groupRef.current.position.x = startPosition[0] + (position[0] - startPosition[0]) * eased;
      groupRef.current.position.y = position[1];
      groupRef.current.position.z = startPosition[2] + (position[2] - startPosition[2]) * eased;

      // Face outward (away from center) during walk
      const cx = groupRef.current.position.x;
      const cz = groupRef.current.position.z;
      groupRef.current.rotation.y = Math.atan2(cx, cz);

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
        animation={currentAnim}
        scale={0.8}
      />
      {/* Accused ring */}
      {isAccused && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.6, 0.8, 16]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.7} />
        </mesh>
      )}
      {/* Name label */}
      <Billboard position={[0, 2.6, 0]}>
        <Text fontSize={0.22} color="white" anchorX="center" anchorY="bottom" outlineWidth={0.025} outlineColor="black">
          {player.profile.name}
        </Text>
      </Billboard>
      {/* Vote button with count */}
      {showVote && (
        <Html position={[0, 1.3, 0]} center>
          <button
            className={`vote-3d-btn ${isVoteTarget ? 'vote-3d-btn-active' : ''}`}
            onClick={() => onVote(player.id)}
          >Vote <span className="vote-3d-count">{voteCount}/{totalAlive}</span></button>
        </Html>
      )}
      {/* Judgment buttons */}
      {showJudgment && (
        <Html position={[0, 1.3, 0]} center>
          <div className="judgment-3d-btns">
            <button className="judge-btn judge-save" onClick={() => onJudge('innocent')}>Sauver</button>
            <button className="judge-btn judge-lynch" onClick={() => onJudge('guilty')}>Lyncher</button>
          </div>
        </Html>
      )}
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
    <Billboard position={[0, 2.6, 0]}>
      <Text fontSize={0.16} color="rgba(180,180,200,0.7)" anchorX="center" anchorY="bottom" outlineWidth={0.015} outlineColor="black">
        {player.profile.name}
      </Text>
    </Billboard>
  </group>
);

// ============================================================
// Camera Controller (smooth follow based on phase)
// ============================================================
// Night cinematic camera waypoints — alley crawl then starry sky reveal
const NIGHT_CAMERA_WAYPOINTS = [
  { pos: [0, 10, 8], lookAt: [0, 0, 0], duration: 5 },             // Overview during walk-away
  { pos: [-2.3, 1.6, -6], lookAt: [-2.3, 1.5, -12], duration: 10 }, // Enter dark alley between buildings [0,-10] & [-4,-9]
  { pos: [-2.3, 5, -8.5], lookAt: [-2.3, 18, -9], duration: 8 },   // Rise between rooftops, tilt up to reveal stars
  { pos: [0, 14, 3], lookAt: [0, 30, 0], duration: 7 },            // Wide starry sky view
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

    prevPhaseRef.current = phase;

    // Smooth lerp — slightly faster for night transitions
    const lerpSpeed = phase === CONSTANTS.PHASE.NIGHT ? 0.015 : 0.02;
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
// Scene Lighting (day/night with enhanced atmosphere)
// ============================================================
const SceneLighting = ({ isDay }) => {
  const lightRef = useRef();
  const ambientRef = useRef();

  useFrame(() => {
    if (lightRef.current) {
      const t = isDay ? 2.5 : 0.6;
      lightRef.current.intensity += (t - lightRef.current.intensity) * 0.03;
    }
    if (ambientRef.current) {
      const t = isDay ? 0.5 : 0.25;
      ambientRef.current.intensity += (t - ambientRef.current.intensity) * 0.03;
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={isDay ? 0.5 : 0.25} />
      <directionalLight
        ref={lightRef}
        position={isDay ? [10, 15, 10] : [-5, 12, 8]}
        intensity={isDay ? 2.5 : 0.6}
        color={isDay ? '#ffffff' : '#6677aa'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      {/* Warm hemisphere fill */}
      <hemisphereLight
        color={isDay ? '#87CEEB' : '#1a1a3a'}
        groundColor={isDay ? '#3a6e2c' : '#0a0a15'}
        intensity={isDay ? 0.3 : 0.15}
      />
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
  const alivePlayers = players.filter((p) => p.isAlive);
  const deadPlayers = players.filter((p) => !p.isAlive);

  const isTrialPhase = [
    CONSTANTS.PHASE.DEFENSE, CONSTANTS.PHASE.JUDGMENT,
    CONSTANTS.PHASE.LAST_WORDS, CONSTANTS.PHASE.EXECUTION,
  ].includes(phase);

  const isVotingPhase = phase === CONSTANTS.PHASE.VOTING;
  const isJudgmentPhase = phase === CONSTANTS.PHASE.JUDGMENT;

  // Night walk-away transition + hide after walk
  const prevPhaseRef = useRef(phase);
  const [nightTransition, setNightTransition] = useState(false);
  const [nightPlayersHidden, setNightPlayersHidden] = useState(false);

  useEffect(() => {
    if (phase === CONSTANTS.PHASE.NIGHT && prevPhaseRef.current !== CONSTANTS.PHASE.NIGHT) {
      setNightPlayersHidden(false);
      setNightTransition(true);
      const walkTimer = setTimeout(() => {
        setNightTransition(false);
        setNightPlayersHidden(true); // hide characters after walk finishes
      }, 3000);
      return () => clearTimeout(walkTimer);
    }
    // Reset when leaving night
    if (phase !== CONSTANTS.PHASE.NIGHT) {
      setNightPlayersHidden(false);
    }
    prevPhaseRef.current = phase;
  }, [phase, CONSTANTS.PHASE.NIGHT]);

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

  return (
    <div className="main-scene-3d">
      <Canvas
        shadows
        camera={{ position: [0, 8, 12], fov: 50 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          {/* Camera */}
          <CameraController phase={phase} CONSTANTS={CONSTANTS} />

          {/* Lighting */}
          <SceneLighting isDay={game.isDay} />

          {/* Sky & atmosphere */}
          {game.isDay ? (
            <Sky sunPosition={[100, 60, 100]} turbidity={8} rayleigh={2} />
          ) : (
            <>
              <color attach="background" args={['#060818']} />
              <fog attach="fog" args={['#060818', 25, 55]} />
              <Stars radius={80} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />
              <Moon />
              <Fireflies count={40} />
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
            return (
              <PlayerFigure
                key={player.id}
                player={player}
                position={pData.position}
                rotation={pData.rotation}
                startPosition={nightTransition ? dayPositions[player.id] : null}
                isTransitioning={nightTransition}
                transitionDuration={3}
                color={player.character?.couleur || '#ffffff'}
                isAccused={isAccused}
                showVote={showVoteBtn}
                isVoteTarget={isVoteTarget}
                voteCount={trial?.suspects?.[player.id]?.suspectedBy?.length || 0}
                totalAlive={alivePlayers.length}
                onVote={handleVote}
                showJudgment={showJudgmentBtn}
                onJudge={handleJudge}
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
useGLTF.preload('/models/cobblestone_circle.glb');
useGLTF.preload('/models/gallows.glb');
useGLTF.preload('/models/forge.glb');
useGLTF.preload('/models/tavern.glb');
useGLTF.preload('/models/chapel.glb');
useGLTF.preload('/models/cottage.glb');
