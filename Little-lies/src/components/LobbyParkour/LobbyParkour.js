import React, { useRef, useMemo } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { RigidBody, CuboidCollider, BallCollider, interactionGroups } from '@react-three/rapier';
import { Text, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { TextureLoader } from 'three';

// KayKit model loader for lobby
const LobbyModel = React.memo(({ path, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) => {
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

const G = interactionGroups([1], [0, 1]);

/* ── Static platform ── */
const Plat = ({ position, size = [6, 0.5, 6], color = '#6a7a9a', label }) => (
  <RigidBody type="fixed" position={position} collisionGroups={G}>
    <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
    <mesh castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.6} flatShading />
    </mesh>
    {label && (
      <Text position={[0, size[1] / 2 + 0.5, 0]} fontSize={0.5} color="#fff" anchorX="center">
        {label}
      </Text>
    )}
  </RigidBody>
);

/* ── Trampoline ── */
const Bouncer = ({ position, size = [3, 0.15, 3], color = '#D4A574' }) => {
  const meshRef = useRef();
  useFrame(({ clock }) => {
    if (meshRef.current) meshRef.current.scale.y = 1 + Math.sin(clock.getElapsedTime() * 4) * 0.15;
  });
  return (
    <RigidBody type="fixed" position={position} collisionGroups={G} restitution={0} friction={1}
      onCollisionEnter={(e) => {
        const body = e.other.rigidBody;
        if (!body) return;
        const vel = body.linvel();
        body.setLinvel({ x: vel.x, y: 0, z: vel.z }, true);
        body.applyImpulse({ x: 0, y: 10, z: 0 }, true);
      }}
    >
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
      <mesh ref={meshRef} castShadow receiveShadow>
        <cylinderGeometry args={[size[0] / 2, size[0] / 2, size[1], 16]} />
        <meshStandardMaterial color={color} roughness={0.4} flatShading />
      </mesh>
    </RigidBody>
  );
};

/* ── Spinning bar ── */
const Spinner = ({ position, speed = 0.4, length = 10, color = '#8B6914' }) => {
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
    <RigidBody ref={ref} type="kinematicVelocityBased" position={position} collisionGroups={G}>
      <CuboidCollider args={[length / 2, 0.2, 0.5]} />
      <mesh castShadow receiveShadow>
        <boxGeometry args={[length, 0.4, 1]} />
        <meshStandardMaterial color={color} roughness={0.4} flatShading />
      </mesh>
    </RigidBody>
  );
};

/* ── Bell tower — final climb destination ── */
const BellTower = ({ position }) => {
  const bellRef = useRef();
  useFrame(({ clock }) => {
    if (bellRef.current) bellRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 0.8) * 0.1;
  });
  return (
    <group position={position}>
      {/* Base */}
      <RigidBody type="fixed" collisionGroups={G}>
        <CuboidCollider args={[2, 2, 2]} position={[0, 2, 0]} />
        <mesh position={[0, 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[4, 4, 4]} />
          <meshStandardMaterial color="#C4A882" flatShading />
        </mesh>
      </RigidBody>
      {/* Upper section */}
      <RigidBody type="fixed" collisionGroups={G}>
        <CuboidCollider args={[1.5, 2, 1.5]} position={[0, 6, 0]} />
        <mesh position={[0, 6, 0]} castShadow receiveShadow>
          <boxGeometry args={[3, 4, 3]} />
          <meshStandardMaterial color="#E8DCC8" flatShading />
        </mesh>
      </RigidBody>
      {/* Roof */}
      <RigidBody type="fixed" collisionGroups={G}>
        <CuboidCollider args={[1.8, 0.5, 1.8]} position={[0, 8.5, 0]} />
        <mesh position={[0, 9, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
          <coneGeometry args={[2.5, 2, 4]} />
          <meshStandardMaterial color="#6a6a7a" flatShading />
        </mesh>
      </RigidBody>
      {/* Bell */}
      <group ref={bellRef} position={[0, 7.5, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.5, 0.7, 0.8, 8]} />
          <meshStandardMaterial color="#c8a030" metalness={0.6} roughness={0.3} flatShading />
        </mesh>
      </group>
      {/* Glow */}
      <pointLight position={[0, 10, 0]} color="#FFD700" intensity={3} distance={20} />
    </group>
  );
};

/* ── Low-poly tree (reused from main scene style) ── */
const LobbyTree = ({ position, scale = 1 }) => (
  <group position={position} scale={scale}>
    <mesh position={[0, 0.6, 0]} castShadow>
      <cylinderGeometry args={[0.06, 0.1, 1.2, 5]} />
      <meshStandardMaterial color="#8B6914" flatShading />
    </mesh>
    <mesh position={[0, 1.5, 0]} castShadow>
      <coneGeometry args={[0.9, 1.6, 6]} />
      <meshStandardMaterial color="#4CAF50" flatShading />
    </mesh>
    <mesh position={[0, 2.1, 0]} castShadow>
      <coneGeometry args={[0.65, 1.2, 6]} />
      <meshStandardMaterial color="#5BBF5E" flatShading />
    </mesh>
  </group>
);

/* ── Giant pushable ball ── */
const GiantBall = ({ position, radius = 2.5, color = '#E8734A' }) => {
  const ballRef = useRef();

  // Apply push + torque when player collides — makes it roll
  const handleCollision = (e) => {
    if (!ballRef.current) return;
    const other = e.other.rigidBody;
    if (!other) return;
    const otherVel = other.linvel();
    const speed = Math.sqrt(otherVel.x ** 2 + otherVel.z ** 2);
    if (speed > 0.5) {
      const force = speed * 1.2;
      // Push in direction of player movement
      ballRef.current.applyImpulse(
        { x: otherVel.x * 0.6, y: force * 0.3, z: otherVel.z * 0.6 }, true
      );
      // Spin the ball (torque perpendicular to movement direction)
      ballRef.current.applyTorqueImpulse(
        { x: otherVel.z * 0.5, y: 0, z: -otherVel.x * 0.5 }, true
      );
    }
  };

  return (
    <RigidBody ref={ballRef} type="dynamic" position={position}
      collisionGroups={interactionGroups([0, 1], [0, 1])}
      restitution={0.8} friction={0.4}
      linearDamping={0.2} angularDamping={0.05}
      lockRotations={false}
      enabledRotations={[true, true, true]}
      ccd
      onCollisionEnter={handleCollision}
    >
      <BallCollider args={[radius]} density={0.03} restitution={0.8} friction={0.4} />
      <mesh castShadow receiveShadow>
        <sphereGeometry args={[radius, 14, 12]} />
        <meshStandardMaterial color={color} flatShading roughness={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius * 0.98, radius * 0.05, 6, 20]} />
        <meshStandardMaterial color="#fff" flatShading />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <torusGeometry args={[radius * 0.98, radius * 0.05, 6, 20]} />
        <meshStandardMaterial color="#fff" flatShading />
      </mesh>
    </RigidBody>
  );
};

/* ── Textured ground — same setup as MainScene GroundPlane ── */
const LobbyGround = () => {
  const albedo = useLoader(TextureLoader, '/models/textures/lobby_sand_albedo.jpg');

  useMemo(() => {
    if (!albedo) return;
    albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping;
    albedo.repeat.set(6, 6);
    albedo.anisotropy = 16;
    albedo.colorSpace = THREE.SRGBColorSpace;
    albedo.minFilter = THREE.LinearMipmapLinearFilter;
    albedo.magFilter = THREE.LinearFilter;
    albedo.generateMipmaps = true;
  }, [albedo]);

  return (
    <RigidBody type="fixed" position={[0, -0.2, 0]} collisionGroups={interactionGroups([1], [0, 1])}>
      <CuboidCollider args={[60, 0.2, 60]} />
      <mesh receiveShadow>
        <boxGeometry args={[120, 0.4, 120]} />
        <meshStandardMaterial map={albedo} color="#c8c0a8" roughness={1} metalness={0} />
      </mesh>
    </RigidBody>
  );
};

/* ══════════════════════════════
   VILLAGE LOBBY — thematic parkour
   ═══════════════════════════════ */
const LobbyParkour = () => (
  <group>
    {/* ── Ground — sand terrain with PBR texture ── */}
    <LobbyGround />

    {/* ── Title ── */}
    <Text
      position={[0, 0.05, -30]}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={10}
      color="#F5E6D0"
      anchorX="center"
      anchorY="middle"
      letterSpacing={0.4}
      font={undefined}
    >
      NOT ME
    </Text>

    {/* ══ VILLAGE PLAZA — spawn area ══ */}
    <Plat position={[0, 0.1, 0]} size={[16, 0.3, 16]} color="#C4A882" />

    {/* ── Village cottages (walkable roofs) ── */}
    {/* KayKit medieval buildings — well outside spawn plaza */}
    <LobbyModel path="/models/kaykit/building_home_A_red.gltf" position={[-14, 0, -12]} rotation={[0, 0.6, 0]} scale={4} />
    <LobbyModel path="/models/kaykit/building_home_B_red.gltf" position={[14, 0, -11]} rotation={[0, -0.5, 0]} scale={3.5} />
    <LobbyModel path="/models/kaykit/building_tavern_red.gltf" position={[-15, 0, 10]} rotation={[0, 1, 0]} scale={3.5} />
    <LobbyModel path="/models/kaykit/building_home_A_red.gltf" position={[15, 0, 11]} rotation={[0, -0.8, 0]} scale={3.8} />

    {/* ══ GIANT BALLS — light, pushable, bouncy ══ */}
    <GiantBall position={[-5, 3, 10]} radius={2} color="#E8734A" />
    <GiantBall position={[5, 3, 10]} radius={1.8} color="#4A9BD9" />

    {/* ══ ROOFTOP PARKOUR ══ */}
    {/* From ground to rooftops */}
    <Plat position={[0, 3.5, -7.5]} size={[3, 0.4, 3]} color="#D4A574" />
    <Plat position={[-4, 4.5, 0]} size={[3, 0.4, 3]} color="#D4A574" />
    <Plat position={[4, 5, 2]} size={[3, 0.4, 3]} color="#D4A574" />

    {/* Path to the bell tower */}
    <Plat position={[0, 6, 10]} size={[4, 0.4, 4]} color="#C4A882" />
    <Spinner position={[0, 6.5, 10]} speed={0.2} length={8} color="#8B6914" />
    <Plat position={[0, 7.5, 18]} size={[5, 0.4, 5]} color="#D4A574" />
    <Bouncer position={[0, 7.7, 18]} size={[4, 0.2, 4]} color="#8B6914" />

    {/* ── Bell tower — mid-point ── */}
    <BellTower position={[0, 0, 30]} />

    {/* ══ SKY CLIMB — above the bell tower ══ */}
    <Plat position={[3, 12, 32]} size={[3, 0.4, 3]} color="#D4A574" />
    <Plat position={[-3, 14, 35]} size={[3, 0.4, 3]} color="#C4A882" />
    <Plat position={[2, 16, 38]} size={[3, 0.4, 3]} color="#D4A574" />
    <Spinner position={[0, 17, 42]} speed={0.15} length={10} color="#8B6914" />
    <Plat position={[-2, 18.5, 46]} size={[3.5, 0.4, 3.5]} color="#C4A882" />
    <Bouncer position={[-2, 18.7, 46]} size={[3, 0.2, 3]} color="#c4a44a" />
    <Plat position={[2, 22, 50]} size={[4, 0.4, 4]} color="#D4A574" />
    <Plat position={[0, 25, 54]} size={[5, 0.5, 5]} color="#FFD700" />

    {/* ── Hay bale bouncers around the village ── */}
    <Bouncer position={[14, 0.1, 0]} size={[3, 0.2, 3]} color="#c4a44a" />
    <Bouncer position={[-14, 0.1, 0]} size={[3, 0.2, 3]} color="#c4a44a" />
    <Bouncer position={[0, 0.1, 14]} size={[3, 0.2, 3]} color="#c4a44a" />
    <Bouncer position={[0, 0.1, -14]} size={[3, 0.2, 3]} color="#c4a44a" />

    {/* ── Trees around the village ── */}
    {[
      [-14, 0, -10], [14, 0, -12], [-16, 0, 8], [16, 0, 10],
      [-6, 0, 14], [6, 0, -14], [-18, 0, -2], [18, 0, 3],
      [-10, 0, 15], [12, 0, 14], [-4, 0, -16], [15, 0, -4],
    ].map((pos, i) => (
      <LobbyTree key={i} position={pos} scale={0.8 + (i % 3) * 0.3} />
    ))}

    {/* ── Torches around the plaza ── */}
    {[[-6, 0, -6], [6, 0, -6], [-6, 0, 6], [6, 0, 6]].map((pos, i) => (
      <group key={`torch-${i}`} position={pos}>
        <mesh position={[0, 0.7, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.07, 1.4, 6]} />
          <meshStandardMaterial color="#5a3a1a" flatShading />
        </mesh>
        <mesh position={[0, 1.5, 0]}>
          <coneGeometry args={[0.08, 0.25, 5]} />
          <meshBasicMaterial color="#ff8800" transparent opacity={0.85} />
        </mesh>
        <pointLight position={[0, 1.6, 0]} color="#ff8833" intensity={1.5} distance={8} />
      </group>
    ))}

    {/* ── Warm ambient lights ── */}
    <pointLight position={[0, 8, 0]} color="#FFD700" intensity={1} distance={25} />
    <pointLight position={[0, 5, 30]} color="#FFD700" intensity={2} distance={15} />
  </group>
);

export default LobbyParkour;
