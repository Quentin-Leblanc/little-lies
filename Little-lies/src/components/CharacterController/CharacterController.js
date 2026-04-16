import { useRef, useEffect, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import { RigidBody, CapsuleCollider, interactionGroups, useRapier } from '@react-three/rapier';
import { Character, skinForPlayer } from '../Character/Character';
import { Text } from '@react-three/drei';
import { myPlayer } from 'playroomkit';

const SPAWN = { x: 0, y: 2, z: -4 };
const MOVE_SPEED = 8;
const ROTATION_SPEED = 0.03;
const JUMP_FORCE = 6;

// Capsule collider: center at Y=1, halfHeight=0.7, radius=0.3
// Bottom of capsule = 1 - 0.7 - 0.3 = 0.0 (feet at local Y=0)
const CAPSULE_OFFSET_Y = 1;
const CAPSULE_HALF_HEIGHT = 0.7;
const CAPSULE_RADIUS = 0.3;

// Ray starts from capsule center, goes down past bottom + margin
const RAY_ORIGIN_LOCAL_Y = CAPSULE_OFFSET_Y;
const RAY_MAX = CAPSULE_HALF_HEIGHT + CAPSULE_RADIUS + 0.25; // 1.25 units down from center

// Coyote time: stay "grounded" for a few frames after leaving ground
// Prevents animation flicker on slopes and small bumps
const COYOTE_FRAMES = 6;

// Jump cooldown in ms — prevents spamming jump
const JUMP_COOLDOWN = 400;

export const CharacterController = ({
                                      state,
                                      playerName,
                                      moveDirection,
                                      isLocalPlayer,
                                      bodyRef,
                                      rotationRef,
                                      ...props
                                    }) => {
  const internalRef = useRef();
  const characterRef = bodyRef || internalRef;
  const groupRef = useRef();
  const textRef = useRef();
  const { rapier, world } = useRapier();

  const [currentAnimation, setCurrentAnimation] = useState('Idle');
  const animRef = useRef('Idle');

  const groundedRef = useRef(true);
  const airFramesRef = useRef(0); // counts frames since last raycast hit
  const jumpRequestedRef = useRef(false);
  const spaceHeldRef = useRef(false);
  const hasJumpedRef = useRef(false); // true after jump impulse, cleared on land
  const lastJumpTime = useRef(0); // timestamp of last jump

  const currentPlayer = myPlayer();

  const setAnim = useCallback((anim) => {
    if (animRef.current !== anim) {
      animRef.current = anim;
      setCurrentAnimation(anim);
      currentPlayer?.setState('animation', anim);
    }
  }, [currentPlayer]);

  // Jump: only on initial keydown, not while held
  useEffect(() => {
    if (!isLocalPlayer) return;
    const onDown = (e) => {
      if (e.code === 'Space' && !spaceHeldRef.current) {
        spaceHeldRef.current = true;
        const now = performance.now();
        if (groundedRef.current && !hasJumpedRef.current && (now - lastJumpTime.current) > JUMP_COOLDOWN) {
          jumpRequestedRef.current = true;
        }
      }
    };
    const onUp = (e) => {
      if (e.code === 'Space') spaceHeldRef.current = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, [isLocalPlayer]);

  // Billboard name
  useFrame(({ camera }) => {
    if (textRef.current) textRef.current.lookAt(camera.position);
  });

  // Main loop
  useFrame(() => {
    if (characterRef.current && isLocalPlayer && moveDirection) {
      const body = characterRef.current;
      if (!body) return;

      const pos = body.translation();
      const linvel = body.linvel();
      const rot = groupRef.current.rotation.y;

      // Respawn
      if (pos.y < -8) {
        body.setTranslation(SPAWN, true);
        body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        return;
      }

      // ── Ground detection via raycast with coyote time ──
      const rayOrigin = { x: pos.x, y: pos.y + RAY_ORIGIN_LOCAL_Y, z: pos.z };
      const ray = new rapier.Ray(rayOrigin, { x: 0, y: -1, z: 0 });
      const hit = world.castRay(ray, RAY_MAX, true);
      const rayHit = hit !== null && hit.timeOfImpact <= RAY_MAX;

      if (rayHit) {
        airFramesRef.current = 0;
        groundedRef.current = true;
        if (hasJumpedRef.current) hasJumpedRef.current = false; // landed
      } else {
        airFramesRef.current++;
        // Only consider airborne after coyote time expires
        if (airFramesRef.current > COYOTE_FRAMES) {
          groundedRef.current = false;
        }
      }

      const grounded = groundedRef.current;

      // ── Rotation ──
      let newRotation = rot;
      if (moveDirection.x === -1) newRotation += ROTATION_SPEED;
      else if (moveDirection.x === 1) newRotation -= ROTATION_SPEED;
      groupRef.current.rotation.y = newRotation;
      if (rotationRef) rotationRef.current = newRotation;

      // ── Movement ──
      let dirX = 0, dirZ = 0;
      if (moveDirection.z === -1) {
        dirX = Math.sin(newRotation);
        dirZ = Math.cos(newRotation);
      } else if (moveDirection.z === 1) {
        dirX = -Math.sin(newRotation);
        dirZ = -Math.cos(newRotation);
      }
      const isMoving = dirX !== 0 || dirZ !== 0;

      if (isMoving) {
        body.setLinvel({ x: dirX * MOVE_SPEED, y: linvel.y, z: dirZ * MOVE_SPEED }, true);
      } else if (grounded) {
        body.setLinvel({ x: 0, y: linvel.y, z: 0 }, true);
      }

      // ── Jump ──
      if (jumpRequestedRef.current && grounded && !hasJumpedRef.current) {
        body.setLinvel({ x: linvel.x, y: 0, z: linvel.z }, true);
        body.applyImpulse({ x: 0, y: JUMP_FORCE, z: 0 }, true);
        hasJumpedRef.current = true;
        lastJumpTime.current = performance.now();
        groundedRef.current = false;
        airFramesRef.current = COYOTE_FRAMES + 1; // skip coyote immediately
      }
      jumpRequestedRef.current = false;

      // ── Sync ──
      const newPos = body.translation();
      currentPlayer.setState('position', { x: newPos.x, y: newPos.y, z: newPos.z });
      currentPlayer.setState('rotation', newRotation);

      // ── Animation ──
      // Only show Jump anim if we actually jumped (not just walking on slope)
      if (hasJumpedRef.current) {
        setAnim('Jump');
      } else if (isMoving) {
        setAnim('Run');
      } else {
        setAnim('Idle');
      }

    } else if (!isLocalPlayer && characterRef.current) {
      const playerPos = state.getState('position');
      const playerRot = state.getState('rotation');
      const playerAnim = state.getState('animation');

      if (playerPos) characterRef.current.setTranslation(playerPos, true);
      if (playerRot != null && groupRef.current) groupRef.current.rotation.y = playerRot;
      if (playerAnim && playerAnim !== animRef.current) {
        animRef.current = playerAnim;
        setCurrentAnimation(playerAnim);
      }
    }
  });

  return (
    <RigidBody
      ref={characterRef}
      type="dynamic"
      colliders={false}
      lockRotations={true}
      gravityScale={1.2}
      linearDamping={0}
      angularDamping={0}
      collisionGroups={interactionGroups([0], [1])}
      {...props}
    >
      <CapsuleCollider args={[CAPSULE_HALF_HEIGHT, CAPSULE_RADIUS]} position={[0, CAPSULE_OFFSET_Y, 0]} />

      <group>
        <group ref={groupRef}>
          <Character animation={currentAnimation} color={state.state?.profile?.color} skin={skinForPlayer(state.id)} />
        </group>

        {playerName && (
          <Text
            ref={textRef}
            position={[0, 2.5, 0]}
            fontSize={0.5}
            color="white"
            anchorX="center"
            anchorY="bottom"
          >
            {playerName.toString().trim() || 'Unnamed Player'}
          </Text>
        )}
      </group>
    </RigidBody>
  );
};
