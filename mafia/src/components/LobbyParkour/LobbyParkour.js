import React, { useRef } from 'react';
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

/* ── Bouncy pad ── */
const Bouncer = ({ position, size = [5, 0.3, 5] }) => {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.scale.y = 1 + Math.sin(clock.getElapsedTime() * 5) * 0.08;
  });
  return (
    <RigidBody type="fixed" position={position} collisionGroups={G} restitution={4} friction={1}>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
      <mesh ref={ref} castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial color="#ff3366" emissive="#ff1144" emissiveIntensity={0.5} roughness={0.2} />
      </mesh>
      <pointLight position={[0, 0.6, 0]} color="#ff3366" intensity={1.5} distance={5} />
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
      <meshStandardMaterial color="#c0c0d0" roughness={0.95} />
    </mesh>
    <gridHelper args={[150, 60, '#a0a0b0', '#a0a0b0']} position={[0, 0.21, 0]} />
  </RigidBody>
);

/* ── Crown at the top ── */
const Crown = ({ position }) => {
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
      <mesh ref={ref} position={[0, 1.5, 0]}>
        <octahedronGeometry args={[0.8]} />
        <meshStandardMaterial color="#ffd700" emissive="#ffcc00" emissiveIntensity={0.8} roughness={0.1} />
      </mesh>
      <pointLight position={[0, 2, 0]} color="#ffd700" intensity={4} distance={15} />
      <Text position={[0, 2.8, 0]} fontSize={0.6} color="#ffd700" anchorX="center">
        CHAMPION
      </Text>
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
      color="#b0b0c8"
      anchorX="center"
      anchorY="middle"
      letterSpacing={0.3}
    >
      LOBBY
    </Text>

    {/* ── Spawn area ── */}
    <Plat position={[0, 0.2, 0]} size={[20, 0.5, 20]} color="#7ab8e6" label="SPAWN" />

    {/* ══ Path A (right): easy stairs + bouncer ══ */}
    <Plat position={[16, 1, 0]} size={[7, 0.5, 7]} color="#6878a0" />
    <Plat position={[26, 2, 0]} size={[7, 0.5, 7]} color="#6878a8" />
    <Plat position={[36, 3, 0]} size={[7, 0.5, 7]} color="#6878b0" />
    <Bouncer position={[36, 3.2, 10]} size={[6, 0.3, 6]} />
    <Plat position={[36, 8, 20]} size={[8, 0.5, 8]} color="#6888aa" label="NICE!" />

    {/* ══ Path B (left): ramp + slider ══ */}
    <Ramp position={[-14, 1.2, 0]} rotation={[0, 0, -0.12]} size={[10, 0.4, 7]} color="#6878a0" />
    <Plat position={[-24, 2.5, 0]} size={[7, 0.5, 7]} color="#6878a8" />
    <Slider from={[-24, 2.8, 8]} to={[-24, 2.8, 22]} speed={0.4} color="#4466bb" />
    <Plat position={[-24, 3, 32]} size={[7, 0.5, 7]} color="#6888aa" />
    <Bouncer position={[-24, 3.2, 32]} size={[6, 0.3, 6]} />
    <Plat position={[-16, 8, 32]} size={[8, 0.5, 8]} color="#6888aa" />

    {/* ══ Mid zone: converging paths ══ */}
    <Slider from={[36, 8.5, 24]} to={[16, 8.5, 28]} speed={0.35} size={[6, 0.5, 6]} color="#4466bb" />
    <Slider from={[-10, 8.5, 32]} to={[6, 8.5, 30]} speed={0.35} size={[6, 0.5, 6]} color="#4466bb" />
    <Plat position={[6, 9, 28]} size={[10, 0.5, 10]} color="#5566aa" label="CENTRE" />

    {/* ── Spinner challenge ── */}
    <Spinner position={[6, 9.4, 28]} speed={0.25} length={14} color="#cc6600" />

    {/* ══ Final climb ══ */}
    <Plat position={[6, 10.5, 40]} size={[7, 0.5, 7]} color="#5566b0" />
    <Plat position={[0, 12, 50]} size={[7, 0.5, 7]} color="#5566b8" />
    <Plat position={[6, 13.5, 60]} size={[7, 0.5, 7]} color="#5566c0" />
    <Bouncer position={[6, 13.7, 60]} size={[6, 0.3, 6]} />

    {/* ── Crown platform ── */}
    <Crown position={[6, 20, 72]} />

    {/* ── Ambient lights ── */}
    <pointLight position={[36, 6, 10]} color="#ff3366" intensity={2} distance={15} />
    <pointLight position={[-24, 6, 32]} color="#ff3366" intensity={2} distance={15} />
    <pointLight position={[6, 12, 28]} color="#ff8800" intensity={2} distance={15} />
  </group>
);

export default LobbyParkour;
