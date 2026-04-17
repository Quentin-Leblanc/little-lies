import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { checkCollision } from '../utils';

// Admin free-roam (pause) controller — moves the local player with ZQSD /
// WASD / arrows, camera follows behind in third person. Handles jump +
// simple gravity, collides against buildings, well, mountains, and other
// players (via `checkCollision`).
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

    if (k['KeyA'] || k['KeyQ'] || k['ArrowLeft']) yaw.current += turnSpeed;
    if (k['KeyD'] || k['ArrowRight']) yaw.current -= turnSpeed;

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

    if (k['Space'] && isGrounded.current) {
      jumpVel.current = 8;
      isGrounded.current = false;
    }

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

    if (!isGrounded.current) {
      setPauseAnim('Jump');
    } else if (moved) {
      setPauseAnim('Walk');
    } else {
      setPauseAnim('Idle');
    }

    const camDist = 8;
    const camHeight = 5;
    const camX = newPos[0] + Math.sin(yaw.current) * camDist;
    const camZ = newPos[2] + Math.cos(yaw.current) * camDist;
    camera.position.lerp(new THREE.Vector3(camX, camHeight + (newPos[1] || 0), camZ), 0.05);
    camera.lookAt(newPos[0], 1 + (newPos[1] || 0), newPos[2]);
  });

  return null;
};

export default PausePlayerController;
