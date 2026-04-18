import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  NIGHT_CAMERA_WAYPOINTS,
  JUDGMENT_CAMERA_POS, JUDGMENT_CAMERA_LOOK,
  EXECUTION_CAMERA_POS, EXECUTION_CAMERA_LOOK,
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
  const snapOnNextFrame = useRef(false);
  const dayOrbitTimeRef = useRef(0);

  const isDefensePhase = phase === CONSTANTS.PHASE.DEFENSE;
  const isJudgmentPhase = phase === CONSTANTS.PHASE.JUDGMENT;
  const isLastWords = phase === CONSTANTS.PHASE.LAST_WORDS;
  const isExecution = phase === CONSTANTS.PHASE.EXECUTION;
  const isTrialCamera = isDefensePhase || isJudgmentPhase || isLastWords || isExecution;

  // When the tab regains focus after being hidden, snap the camera to its
  // target on the next frame instead of lerping from a stale position —
  // otherwise users see the camera "catch up" to where the phase moved on.
  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) snapOnNextFrame.current = true;
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, []);

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

      if (isDefensePhase || isJudgmentPhase) {
        // Defense AND judgment: same fixed camera on the podium, no orbit.
        // Keeping them identical means the cut from defense → judgment is
        // invisible (no camera travel), which is what we want.
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
      // Use accumulated delta (not Date.now) so the orbit pauses cleanly
      // when the tab is hidden rather than snapping forward when it comes
      // back — matches what everyone else is seeing if they're also active.
      //
      // Full 360° loop: orbitAngle is a strictly-increasing scalar, and
      // sin/cos wrap naturally through 2π — no clamp, no flip, no reset.
      // Pulled the camera ~15% closer (12→10 radius, 14→11.8 height) and
      // raised the look target to torso height so players stay framed
      // instead of dissolving into a ground-level dot from above.
      dayOrbitTimeRef.current += delta;
      const orbitAngle = dayOrbitTimeRef.current * 0.008;
      const orbitRadius = 10;
      const orbitX = Math.sin(orbitAngle) * orbitRadius;
      const orbitZ = Math.cos(orbitAngle) * orbitRadius;
      targetPos.current.set(orbitX, 11.8, orbitZ);
      targetLookAt.current.set(0, 0.6, 0);
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
    // When returning from a hidden tab, snap instead of lerping so the
    // view matches what everyone else has already been seeing.
    if (snapOnNextFrame.current) {
      snapOnNextFrame.current = false;
      camera.position.copy(targetPos.current);
      camera.lookAt(targetLookAt.current);
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
