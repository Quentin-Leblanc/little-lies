import React, { useRef, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CuboidCollider, BallCollider, interactionGroups } from '@react-three/rapier';
import { Text } from '@react-three/drei';
import * as THREE from 'three';

const G = interactionGroups([1], [0, 1]);

/* ── Static platform ── */
const Plat = ({ position, size = [6, 0.5, 6], color = '#6a7a9a', label }) => (
  <RigidBody type="fixed" position={position} collisionGroups={G}>
    <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
    <mesh castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
    {label && (
      <Text position={[0, size[1] / 2 + 0.5, 0]} fontSize={0.5} color="#fff" anchorX="center">
        {label}
      </Text>
    )}
  </RigidBody>
);

/* ── Trampoline — strong consistent bounce via impulse ── */
const Bouncer = ({ position, size = [5, 0.15, 5], color = '#ff3366' }) => {
  const meshRef = useRef();

  useFrame(({ clock }) => {
    if (meshRef.current) {
      meshRef.current.scale.y = 1 + Math.sin(clock.getElapsedTime() * 4) * 0.15;
    }
  });

  const handleCollision = useCallback((e) => {
    const body = e.other.rigidBody;
    if (!body) return;
    // Reset Y velocity first so the bounce is always the same height
    const vel = body.linvel();
    body.setLinvel({ x: vel.x, y: 0, z: vel.z }, true);
    body.applyImpulse({ x: 0, y: 10, z: 0 }, true);
  }, []);

  return (
    <RigidBody type="fixed" position={position} collisionGroups={G} restitution={0} friction={1}
      onCollisionEnter={handleCollision}
    >
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
      {/* Flat circular trampoline */}
      <mesh ref={meshRef} castShadow receiveShadow>
        <cylinderGeometry args={[size[0] / 2, size[0] / 2, size[1], 24]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Outer ring */}
      <mesh position={[0, size[1] / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[size[0] / 2, 0.08, 8, 24]} />
        <meshStandardMaterial color="#ffffff" metalness={0.4} roughness={0.3} />
      </mesh>
    </RigidBody>
  );
};

/* ── Moving platform (slow, predictable) ── */
const Slider = ({ from, to, speed = 0.6, size = [6, 0.5, 6], color = '#3366cc' }) => {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      const t = (Math.sin(clock.getElapsedTime() * speed) + 1) / 2;
      ref.current.setNextKinematicTranslation({
        x: from[0] + (to[0] - from[0]) * t,
        y: from[1] + (to[1] - from[1]) * t,
        z: from[2] + (to[2] - from[2]) * t,
      });
    }
  });
  return (
    <RigidBody ref={ref} type="kinematicPosition" position={from} collisionGroups={G}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.15} roughness={0.5} />
      </mesh>
    </RigidBody>
  );
};

/* ── Spinning bar ── */
const Spinner = ({ position, speed = 0.4, length = 12, color = '#ff8800' }) => {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) {
      const a = clock.getElapsedTime() * speed;
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), a);
      ref.current.setNextKinematicRotation({ x: q.x, y: q.y, z: q.z, w: q.w });
      ref.current.setNextKinematicTranslation({ x: position[0], y: position[1], z: position[2] });
    }
  });
  return (
    <RigidBody ref={ref} type="kinematicPosition" position={position} collisionGroups={G}>
      <CuboidCollider args={[length / 2, 0.2, 0.6]} />
      <mesh castShadow receiveShadow>
        <boxGeometry args={[length, 0.4, 1.2]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.2} roughness={0.4} />
      </mesh>
    </RigidBody>
  );
};

/* ── Ramp ── */
const Ramp = ({ position, rotation = [0, 0, 0], size = [8, 0.4, 6], color = '#556677' }) => (
  <RigidBody type="fixed" position={position} rotation={rotation} collisionGroups={G}>
    <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
    <mesh castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.5} />
    </mesh>
  </RigidBody>
);

/* ── Ground ── */
const Ground = () => (
  <RigidBody type="fixed" position={[0, -0.2, 0]} collisionGroups={G}>
    <CuboidCollider args={[75, 0.2, 75]} />
    <mesh receiveShadow>
      <boxGeometry args={[150, 0.4, 150]} />
      <meshStandardMaterial color="#111111" roughness={0.95} />
    </mesh>
    <gridHelper args={[150, 60, '#222233', '#222233']} position={[0, 0.21, 0]} />
  </RigidBody>
);

/* ── Trophy cup at the top ── */
const Trophy = ({ position }) => {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * 0.5;
  });
  return (
    <group position={position}>
      <RigidBody type="fixed" collisionGroups={G}>
        <CuboidCollider args={[3, 0.2, 3]} />
        <mesh castShadow receiveShadow>
          <boxGeometry args={[6, 0.4, 6]} />
          <meshStandardMaterial color="#ffd700" emissive="#ffaa00" emissiveIntensity={0.6} roughness={0.2} />
        </mesh>
      </RigidBody>
      {/* Trophy cup shape */}
      <group ref={ref} position={[0, 1, 0]}>
        {/* Cup bowl */}
        <mesh position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.5, 0.3, 0.8, 12]} />
          <meshStandardMaterial color="#ffd700" emissive="#ffcc00" emissiveIntensity={0.8} metalness={0.8} roughness={0.1} />
        </mesh>
        {/* Cup stem */}
        <mesh position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.3, 8]} />
          <meshStandardMaterial color="#ffd700" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Cup base */}
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.3, 0.35, 0.1, 12]} />
          <meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.1} />
        </mesh>
        {/* Handles */}
        <mesh position={[0.55, 0.55, 0]} rotation={[0, 0, Math.PI / 6]}>
          <torusGeometry args={[0.15, 0.04, 6, 12]} />
          <meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.1} />
        </mesh>
        <mesh position={[-0.55, 0.55, 0]} rotation={[0, 0, -Math.PI / 6]}>
          <torusGeometry args={[0.15, 0.04, 6, 12]} />
          <meshStandardMaterial color="#ffd700" metalness={0.8} roughness={0.1} />
        </mesh>
      </group>
      <pointLight position={[0, 2, 0]} color="#ffd700" intensity={4} distance={15} />
    </group>
  );
};

/* ══════════════════════════════
   PARKOUR COURSE — spacious & fun
   ═══════════════════════════════ */
const LobbyParkour = () => (
  <group>
    <Ground />

    {/* ── Giant LOBBY text on the ground ── */}
    <Text
      position={[0, 0.05, -20]}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={16}
      color="#ffffff"
      anchorX="center"
      anchorY="middle"
      letterSpacing={0.3}
    >
      LOBBY
    </Text>

    {/* ── Spawn area ── */}
    <Plat position={[0, 0.2, 0]} size={[20, 0.5, 20]} color="#00cc66" />

    {/* ══ Path A (right): easy stairs + bouncer ══ */}
    <Plat position={[16, 1, 0]} size={[7, 0.5, 7]} color="#ff6633" />
    <Plat position={[26, 2, 0]} size={[7, 0.5, 7]} color="#ffcc00" />
    <Plat position={[36, 3, 0]} size={[7, 0.5, 7]} color="#33ccff" />
    <Bouncer position={[36, 3.2, 10]} size={[6, 0.3, 6]} />
    <Plat position={[36, 8, 20]} size={[8, 0.5, 8]} color="#ff44aa" />

    {/* ══ Path B (left): ramp + slider ══ */}
    <Ramp position={[-14, 1.2, 0]} rotation={[0, 0, -0.12]} size={[10, 0.4, 7]} color="#cc44ff" />
    <Plat position={[-24, 2.5, 0]} size={[7, 0.5, 7]} color="#44ddaa" />
    <Slider from={[-24, 2.8, 8]} to={[-24, 2.8, 22]} speed={0.4} color="#ff8844" />
    <Plat position={[-24, 3, 32]} size={[7, 0.5, 7]} color="#66ff66" />
    <Bouncer position={[-24, 3.2, 32]} size={[6, 0.3, 6]} />
    <Plat position={[-16, 8, 32]} size={[8, 0.5, 8]} color="#ffdd44" />

    {/* ══ Mid zone: converging paths ══ */}
    <Slider from={[36, 8.5, 24]} to={[16, 8.5, 28]} speed={0.35} size={[6, 0.5, 6]} color="#ff55cc" />
    <Slider from={[-10, 8.5, 32]} to={[6, 8.5, 30]} speed={0.35} size={[6, 0.5, 6]} color="#55ccff" />
    <Plat position={[6, 9, 28]} size={[10, 0.5, 10]} color="#ff4444" />

    {/* ── Spinner challenge ── */}
    <Spinner position={[6, 9.4, 28]} speed={0.25} length={14} color="#ff8800" />

    {/* ══ Final climb ══ */}
    <Plat position={[6, 10.5, 40]} size={[7, 0.5, 7]} color="#44ff88" />
    <Plat position={[0, 12, 50]} size={[7, 0.5, 7]} color="#8844ff" />
    <Plat position={[6, 13.5, 60]} size={[7, 0.5, 7]} color="#ff4488" />
    <Bouncer position={[6, 13.7, 60]} size={[6, 0.3, 6]} />

    {/* ── Trophy platform ── */}
    <Trophy position={[6, 20, 72]} />

    {/* ── Trampolines spread across the map (away from spawn 0,0 r=10) ── */}
    <Bouncer position={[25, 0.1, -20]} size={[5, 0.15, 5]} color="#ff3366" />
    <Bouncer position={[-25, 0.1, 15]} size={[5, 0.15, 5]} color="#33ff66" />
    <Bouncer position={[35, 0.1, 15]} size={[5, 0.15, 5]} color="#6633ff" />
    <Bouncer position={[-30, 0.1, -20]} size={[5, 0.15, 5]} color="#ffcc00" />
    <Bouncer position={[15, 0.1, 25]} size={[5, 0.15, 5]} color="#ff6600" />
    <Bouncer position={[-15, 0.1, -30]} size={[5, 0.15, 5]} color="#00ccff" />
    <Bouncer position={[40, 0.1, -5]} size={[5, 0.15, 5]} color="#ff44cc" />
    <Bouncer position={[-35, 0.1, 30]} size={[5, 0.15, 5]} color="#44ffaa" />

    {/* ── Ambient lights ── */}
    <pointLight position={[36, 6, 10]} color="#ff3366" intensity={2} distance={15} />
    <pointLight position={[-24, 6, 32]} color="#ff3366" intensity={2} distance={15} />
    <pointLight position={[6, 12, 28]} color="#ff8800" intensity={2} distance={15} />
  </group>
);

export default LobbyParkour;
