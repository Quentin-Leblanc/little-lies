import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  NIGHT_CAMERA_WAYPOINTS,
  DEFENSE_CAMERA_LOOK,
  JUDGMENT_CAMERA_POS, JUDGMENT_CAMERA_LOOK,
  EXECUTION_CAMERA_POS, EXECUTION_CAMERA_LOOK,
  PODIUM_POSITION,
} from '../constants';
import { pushCameraOutOfObstacles } from '../utils';

// Smooth follow based on phase:
// - Night: 3-waypoint cinematic (overview → alley walk → rise to stars)
// - Trial (defense/judgment/last-words/execution): zoom on podium
// - Day / other: continuous slow orbit around the plaza (~13 min/turn)
// Pushes the target and interpolated position out of the church & gallows
// obstacle spheres so the camera never ends up inside a model.
const CameraController = ({ phase, CONSTANTS }) => {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 8, 12));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const nightTimeRef = useRef(0);
  const prevPhaseRef = useRef(phase);
  const defenseTimeRef = useRef(0);

  const isDefensePhase = phase === CONSTANTS.PHASE.DEFENSE;
  const isJudgmentPhase = phase === CONSTANTS.PHASE.JUDGMENT;
  const isLastWords = phase === CONSTANTS.PHASE.LAST_WORDS;
  const isExecution = phase === CONSTANTS.PHASE.EXECUTION;
  const isTrialCamera = isDefensePhase || isJudgmentPhase || isLastWords || isExecution;

  useFrame((_, delta) => {
    if (phase === CONSTANTS.PHASE.NIGHT) {
      if (prevPhaseRef.current !== CONSTANTS.PHASE.NIGHT) {
        nightTimeRef.current = 0;
      }
      nightTimeRef.current += delta;

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

      // Hold waypoint: snap position and freeze looking direction
      if (wp.hold) {
        camera.position.set(...wp.pos);
        camera.lookAt(...wp.lookAt);
        prevPhaseRef.current = phase;
        return;
      }
    } else if (isTrialCamera) {
      // Track time within trial for slow orbit during defense
      if (
        !prevPhaseRef.current ||
        ![CONSTANTS.PHASE.DEFENSE, CONSTANTS.PHASE.JUDGMENT, CONSTANTS.PHASE.LAST_WORDS, CONSTANTS.PHASE.EXECUTION]
          .includes(prevPhaseRef.current)
      ) {
        defenseTimeRef.current = 0;
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
        targetPos.current.copy(JUDGMENT_CAMERA_POS);
        targetLookAt.current.copy(JUDGMENT_CAMERA_LOOK);
      } else if (isLastWords) {
        // Close-up near the podium, more top-down for intimacy
        targetPos.current.set(5.8, 4.5, -4.8);
        targetLookAt.current.set(7, 0.8, -6);
      } else if (isExecution) {
        targetPos.current.copy(EXECUTION_CAMERA_POS);
        targetLookAt.current.copy(EXECUTION_CAMERA_LOOK);
      }
    } else {
      // Day phases: continuous very slow orbit (~13 min per full turn).
      const orbitAngle = Date.now() * 0.000008;
      const orbitRadius = 12;
      const orbitX = Math.sin(orbitAngle) * orbitRadius;
      const orbitZ = Math.cos(orbitAngle) * orbitRadius;
      targetPos.current.set(orbitX, 14, orbitZ);
      targetLookAt.current.set(0, 0, 0);
    }

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

    const lerpSpeed = isTrialCamera ? 0.04 : phase === CONSTANTS.PHASE.NIGHT ? 0.002 : 0.02;
    camera.position.lerp(targetPos.current, lerpSpeed);
    // Push interpolated camera position out too — lerp can cross the
    // obstacle while going from A to B.
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

export default CameraController;
