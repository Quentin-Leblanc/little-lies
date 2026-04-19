import { useRef, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { getRoomCode } from 'playroomkit';
import * as THREE from 'three';
import {
  NIGHT_CAMERA_WAYPOINTS,
  DAY_ORBIT_CAMERAS,
  JUDGMENT_CAMERA_POS, JUDGMENT_CAMERA_LOOK,
  EXECUTION_CAMERA_POS, EXECUTION_CAMERA_LOOK,
} from '../constants';
import { pushCameraOutOfObstacles } from '../utils';

// Smooth follow based on phase:
// - Night: one of 6 cinematics rotated by dayCount with a coprime step,
//   so back-to-back nights never replay the same shot and the whole pool
//   is used before anything repeats.
// - Trial (defense/judgment/last-words/execution): zoom on podium
// - Day / other: continuous slow orbit around the plaza (~13 min/turn)
// Pushes the target and interpolated position out of the church & gallows
// obstacle spheres so the camera never ends up inside a model.
const CameraController = ({ phase, CONSTANTS, dayCount = 0, deathFocusPos = null }) => {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 8, 12));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const nightTimeRef = useRef(0);
  const prevPhaseRef = useRef(phase);
  const defenseTimeRef = useRef(0);
  const snapOnNextFrame = useRef(false);
  const dayOrbitTimeRef = useRef(0);
  const deathCamTimeRef = useRef(0);
  const prevDeathFocusRef = useRef(null);
  const introTimeRef = useRef(0);
  const prevShotRef = useRef(0);

  // Hash the room code into a stable integer so day 0 / night 0 start on
  // a different cinematic each game. Without this, every first night
  // showed the same shot (dayCount=0 always resolved to the same pool
  // index). All clients in the same room compute the same seed, so they
  // stay synchronized with no extra networking.
  const roomSeed = useMemo(() => {
    const code = getRoomCode() || '';
    let h = 0;
    for (let i = 0; i < code.length; i++) h = (h * 31 + code.charCodeAt(i)) >>> 0;
    return h;
  }, []);

  const isDefensePhase = phase === CONSTANTS.PHASE.DEFENSE;
  const isJudgmentPhase = phase === CONSTANTS.PHASE.JUDGMENT;
  const isLastWords = phase === CONSTANTS.PHASE.LAST_WORDS;
  const isExecution = phase === CONSTANTS.PHASE.EXECUTION;
  const isTrialCamera = isDefensePhase || isJudgmentPhase || isLastWords || isExecution;
  // Morning death cinematic — overrides the day orbit to a close-up
  // on the victim's body for ~4 seconds right after the day-rise text.
  const isDeathCinematic = phase === CONSTANTS.PHASE.DEATH_REPORT && Array.isArray(deathFocusPos);

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

  // One-shot 6s intro cinematic: two static-ish waypoints that frame the
  // village from above, then a low plaza-sweep. No UI (timer + actions
  // are hidden via INFO_PHASES). Two waypoints of 3s each so a new
  // player sees (1) "this is a village with a church" and (2) "this is
  // the ritual circle at the centre where debates will happen".
  const INTRO_WAYPOINTS = useMemo(() => [
    // 0-3s — high three-quarter over the whole village
    {
      pos: new THREE.Vector3(12, 10, 14),
      lookAt: new THREE.Vector3(0, 0.5, -4),
    },
    // 3-6s — close tilt-down on the blood circle + plaza props
    {
      pos: new THREE.Vector3(-4, 4.5, 7),
      lookAt: new THREE.Vector3(0, 0.4, 0),
    },
  ], []);

  useFrame((_, delta) => {
    if (phase === CONSTANTS.PHASE.INTRO_CINEMATIC) {
      // Reset timer when entering the phase so the 6s clock aligns with
      // the phase duration on the game engine (keeps camera in sync).
      if (prevPhaseRef.current !== CONSTANTS.PHASE.INTRO_CINEMATIC) {
        introTimeRef.current = 0;
        prevShotRef.current = 0;
        // Snap to the first waypoint — no long lerp from the lobby camera.
        camera.position.copy(INTRO_WAYPOINTS[0].pos);
        camera.lookAt(INTRO_WAYPOINTS[0].lookAt);
      }
      introTimeRef.current += delta;
      const t = introTimeRef.current;
      // Two discrete shots, 3s each, with a hard cut at t=3s. Inside
      // each shot, a very slow drift + orbit keeps the frame from
      // looking like a stuck screenshot. Snap-teleport the camera at
      // the cut (handled by the onEnter snap + raising targets) so the
      // smoothing lerp in the outer updater lands on the shot-2 pose
      // almost instantly.
      const shot = t < 3 ? 0 : 1;
      const localT = t < 3 ? t : t - 3; // 0..3 within each shot
      const wp = INTRO_WAYPOINTS[shot];
      // Gentle orbital drift on the horizontal plane — radius 0.4 units,
      // one full revolution over ~18s so 3s = ~60° of travel, just enough
      // to feel alive.
      const drift = new THREE.Vector3(
        Math.sin(localT * 0.35) * 0.35,
        Math.sin(localT * 0.22) * 0.10,
        Math.cos(localT * 0.35) * 0.35,
      );
      targetPos.current.copy(wp.pos).add(drift);
      targetLookAt.current.copy(wp.lookAt);
      // Hard cut between shot 0 and shot 1: on the frame we cross t=3s,
      // teleport the camera (and its smoothing anchor) straight to the
      // shot-2 anchor so the outer lerp doesn't glide between them.
      if (shot === 1 && prevShotRef.current === 0) {
        camera.position.copy(wp.pos).add(drift);
        camera.lookAt(wp.lookAt);
      }
      prevShotRef.current = shot;
    } else if (phase === CONSTANTS.PHASE.NIGHT) {
      const enteringNight = prevPhaseRef.current !== CONSTANTS.PHASE.NIGHT;
      if (enteringNight) {
        nightTimeRef.current = 0;
      }
      nightTimeRef.current += delta;

      // Deterministic rotation over the 6-cinematic pool. 5 is coprime
      // with 6, so (dayCount * 5) % 6 visits all 6 indices in a cycle of
      // 6 without consecutive repeats. +2 shifts the cycle so day 0 and
      // day 1 don't start on identical or symmetric picks. +roomSeed
      // rotates the whole sequence per game so the first night isn't
      // always the same cinematic. Every player in a room computes the
      // same pick → all clients stay synchronized without networking.
      const pool = NIGHT_CAMERA_WAYPOINTS;
      const idx = ((dayCount * 5 + 2 + roomSeed) % pool.length + pool.length) % pool.length;
      const waypoints = pool[idx].waypoints;

      // Snap on night entry when the first waypoint asks for it. Without
      // this, the sub-0.01 lerp speed below means ~10s of invisible
      // drift from the day-orbit position before the cinematic actually
      // begins — so every night looked identical for the first third.
      if (enteringNight && waypoints[0]?.snap) {
        camera.position.set(...waypoints[0].pos);
        camera.lookAt(...waypoints[0].lookAt);
        targetPos.current.set(...waypoints[0].pos);
        targetLookAt.current.set(...waypoints[0].lookAt);
      }

      let elapsed = nightTimeRef.current;
      let wpIdx = 0;
      let totalBefore = 0;
      for (let i = 0; i < waypoints.length; i++) {
        if (elapsed < totalBefore + waypoints[i].duration) {
          wpIdx = i;
          break;
        }
        totalBefore += waypoints[i].duration;
        if (i === waypoints.length - 1) wpIdx = i;
      }

      const wp = waypoints[wpIdx];
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
    } else if (isDeathCinematic) {
      // Morning death close-up — slow swirl around the victim's body.
      // Radius 2.2, height 1.5, looking at the body torso. MainScene
      // flips deathFocusPos null→[x,y,z] at the moment the cut starts,
      // so we snap the camera instead of lerping from the day orbit.
      deathCamTimeRef.current += delta;
      const [bx, , bz] = deathFocusPos;
      const swirl = deathCamTimeRef.current * 0.18;
      const radius = 2.2;
      targetPos.current.set(
        bx + Math.sin(swirl) * radius,
        1.5,
        bz + Math.cos(swirl) * radius
      );
      targetLookAt.current.set(bx, 0.35, bz);
    } else {
      // Day phases: continuous very slow orbit around the plaza.
      // Use accumulated delta (not Date.now) so the orbit pauses cleanly
      // when the tab is hidden rather than snapping forward when it comes
      // back — matches what everyone else is seeing if they're also active.
      //
      // Full 360° loop: orbitAngle is a strictly-increasing scalar, and
      // sin/cos wrap naturally through 2π — no clamp, no flip, no reset.
      //
      // Camera choice rotates per day through DAY_ORBIT_CAMERAS. 3 is
      // coprime with pool length (5), so (dayCount * 3 + 1) % 5 cycles
      // through all 5 indices without consecutive repeats. +roomSeed
      // rotates the sequence per game so day 1 isn't always the same
      // angle across different matches.
      dayOrbitTimeRef.current += delta;
      const pool = DAY_ORBIT_CAMERAS;
      const idx = ((dayCount * 3 + 1 + roomSeed) % pool.length + pool.length) % pool.length;
      const cam = pool[idx];
      const orbitAngle = dayOrbitTimeRef.current * cam.speed + cam.phaseOffset;
      const orbitX = Math.sin(orbitAngle) * cam.radius;
      const orbitZ = Math.cos(orbitAngle) * cam.radius;
      targetPos.current.set(orbitX, cam.height, orbitZ);
      targetLookAt.current.set(0, cam.lookY, 0);
    }

    if (!isTrialCamera && !isDeathCinematic) {
      pushCameraOutOfObstacles(targetPos.current);
    }

    // When leaving night: snap camera to current orbit position (no lerp from stars)
    const comingFromNight = prevPhaseRef.current === CONSTANTS.PHASE.NIGHT && phase !== CONSTANTS.PHASE.NIGHT;
    if (comingFromNight) {
      camera.position.copy(targetPos.current);
      camera.lookAt(0, 0, 0);
    }

    // Death cinematic entry/exit: snap on the cut so the shot feels like
    // an actual edit instead of a slow lerp through the plaza. Reset the
    // swirl timer on entry so every cinematic starts behind the body.
    const prevDeath = prevDeathFocusRef.current;
    const enteringDeath = isDeathCinematic && prevDeath === null;
    const leavingDeath = !isDeathCinematic && prevDeath !== null;
    if (enteringDeath) {
      deathCamTimeRef.current = 0;
      const [bx, , bz] = deathFocusPos;
      camera.position.set(bx + 2.2, 1.5, bz + 0.3);
      camera.lookAt(bx, 0.35, bz);
    }
    if (leavingDeath) {
      camera.position.copy(targetPos.current);
      camera.lookAt(targetLookAt.current);
    }
    prevDeathFocusRef.current = isDeathCinematic ? deathFocusPos : null;
    // When returning from a hidden tab, snap instead of lerping so the
    // view matches what everyone else has already been seeing.
    if (snapOnNextFrame.current) {
      snapOnNextFrame.current = false;
      camera.position.copy(targetPos.current);
      camera.lookAt(targetLookAt.current);
    }
    prevPhaseRef.current = phase;

    const lerpSpeed = isTrialCamera ? 0.04
      : isDeathCinematic ? 0.06
      : phase === CONSTANTS.PHASE.NIGHT ? 0.002
      : 0.02;
    camera.position.lerp(targetPos.current, lerpSpeed);
    // Push interpolated camera position out too — lerp can cross the
    // obstacle while going from A to B.
    if (!isTrialCamera && !isDeathCinematic) {
      pushCameraOutOfObstacles(camera.position);
    }
    const currentLookAt = new THREE.Vector3();
    camera.getWorldDirection(currentLookAt);
    const desiredDir = targetLookAt.current.clone().sub(camera.position).normalize();
    currentLookAt.lerp(desiredDir, (isTrialCamera || isDeathCinematic) ? 0.06 : lerpSpeed);
    camera.lookAt(
      camera.position.x + currentLookAt.x,
      camera.position.y + currentLookAt.y,
      camera.position.z + currentLookAt.z
    );
  });

  return null;
};

export default CameraController;
