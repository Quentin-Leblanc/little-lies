import React, { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, HueSaturation } from '@react-three/postprocessing';
import { useMultiplayerState } from 'playroomkit';
import * as THREE from 'three';
import { useGameEngine } from '../../hooks/useGameEngine';
import Audio from '../../utils/AudioManager';
import i18n from '../../trad/i18n';

// Scene sub-modules (extracted from the old 3400-line file).
import './preloads';
import { PLAYER_Y, PODIUM_POSITION } from './constants';
import { getNightAmbiance } from './utils';
import CameraController from './Camera/CameraController';
import SceneLighting from './Lighting/SceneLighting';
import GroundPlane from './Environment/GroundPlane';
import Village from './Buildings/Village';
import PlayerFigure from './Players/PlayerFigure';
import DeadPlayerFigure from './Players/DeadPlayerFigure';
import PausePlayerController from './Players/PausePlayerController';
import Moon from './Atmosphere/Moon';
import { DayFireflies } from './Atmosphere/Fireflies';
import FloatingDust from './Atmosphere/FloatingDust';
import WindLeaves from './Atmosphere/WindLeaves';
import NightEmbers from './Atmosphere/NightEmbers';
import GroundFog from './Weather/GroundFog';
import VillageFogWall from './Weather/VillageFogWall';
import NightRain from './Weather/NightRain';
import NightLightning from './Weather/NightLightning';
import TrialStormLighting from './Weather/TrialStormLighting';
import NightDarkFog from './Weather/NightDarkFog';
import NightCrows from './Wildlife/NightCrows';
import DayRabbits from './Wildlife/DayRabbits';

import './MainScene.scss';

// ============================================================
// MainScene — orchestrator. Owns phase-driven UI overlays, player
// positions, walk-away/walk-in transitions, and wires every sub-scene
// component together. All procedural geometry / particles / weather
// / cameras live in sibling folders.
// ============================================================
const MainScene = () => {
  const { game, getPlayers, getMe, CONSTANTS, trial, setTrial } = useGameEngine();
  const [chatMessages] = useMultiplayerState('chatMessages', []);
  const [events] = useMultiplayerState('events', []);
  const players = getPlayers();
  const me = getMe();
  const phase = game.phase;
  const [adminCharScale] = useMultiplayerState('adminCharScale', 1.0);
  const characterScale = adminCharScale || 1.0;
  const isPaused = !!game.adminFreeRoam;
  const isGameOver = game.status === CONSTANTS.GAME_ENDED;
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

  // Black fade + sunset + overlay states — drive the night/day transition
  // cinematic. All timers are tracked in a ref so a rapid phase change
  // clears the pending fade chain.
  const [nightFade, setNightFade] = useState('none'); // 'none' | 'to-black' | 'from-black'
  const [isSunset, setIsSunset] = useState(false);
  const [showNightText, setShowNightText] = useState(false);
  const [showDayText, setShowDayText] = useState(false);
  const [nightAmbianceMsg, setNightAmbianceMsg] = useState(null);
  const [showDeathReport, setShowDeathReport] = useState(false);
  const [showBloodEffect, setShowBloodEffect] = useState(false);
  const [showExecutionFlash, setShowExecutionFlash] = useState(false);
  // Random variants for DAY_RISING and peaceful_night — picked per DEATH
  // REPORT entry so the phrase rotates instead of being the same every
  // morning. Reset to null on leaving the phase so the next one re-rolls.
  const [dayRisingText, setDayRisingText] = useState(null);
  const [peacefulNightText, setPeacefulNightText] = useState(null);
  // Night transition phrase — rotates between "La nuit tombe..." variants
  // so the end-of-day fade doesn't always read the same line.
  const [nightTransitionText, setNightTransitionText] = useState(null);
  // Death-reveal cinematic camera focus — when set, CameraController cuts
  // to a close-up shot of this body (world-space [x, y, z]). Non-null for
  // ~4s at the start of DEATH_REPORT when there's a fresh corpse to show.
  const [deathFocusPos, setDeathFocusPos] = useState(null);
  const deathCinematicForDay = useRef(null);
  // Dead bodies used to fade out after DEATH_REPORT. They now persist as
  // set dressing in the plaza center — makes the losses feel real and
  // gives the scene more life between phases. These state vars are kept
  // only to preserve the existing render branch until we simplify further.

  const lastPhaseForFade = useRef(phase);

  // Phases that lead directly to night (last phases before night falls).
  // EXECUTION_REVEAL is intentionally excluded so the 5s role-reveal
  // card isn't drowned out by a fade-to-black — the fade happens during
  // the subsequent NIGHT_TRANSITION phase instead.
  const PRE_NIGHT_PHASES = [
    CONSTANTS.PHASE.NO_LYNCH, CONSTANTS.PHASE.SPARED,
    CONSTANTS.PHASE.EXECUTION,
    CONSTANTS.PHASE.NIGHT_TRANSITION,
  ];
  const fadeTimers = useRef([]);
  const walkTimer = useRef(null);

  useEffect(() => {
    fadeTimers.current.forEach(clearTimeout);
    fadeTimers.current = [];

    // Pre-night: show players, start walk-away, then fade to black
    if (phase === CONSTANTS.PHASE.LAST_WORDS) {
      setIsSunset(true);
    }

    if (PRE_NIGHT_PHASES.includes(phase)) {
      setIsSunset(true);
      // Gate first-pre-night-per-day logic. Without this, chains like
      // NO_LYNCH → NIGHT_TRANSITION or EXECUTION → EXECUTION_REVEAL →
      // NIGHT_TRANSITION re-fire this effect and pick a NEW random variant,
      // which overwrites the one already on screen — the player saw two
      // different transition lines flash back-to-back. Pick the text and
      // schedule its reveal only on the first pre-night entry.
      const isFirstPreNightThisDay = nightStartedForDay.current !== game.dayCount;

      if (isFirstPreNightThisDay) {
        const nightVariants = i18n.t('game:night_transition_variants', { returnObjects: true });
        if (Array.isArray(nightVariants) && nightVariants.length > 0) {
          setNightTransitionText(nightVariants[Math.floor(Math.random() * nightVariants.length)]);
        } else {
          setNightTransitionText(i18n.t('game:phases.NIGHT_TRANSITION'));
        }
      }
      // Delay fade so sunset animation is fully visible (~5s), except for
      // NIGHT_TRANSITION which follows an already-completed reveal —
      // start the black fade immediately there so the short 2s phase
      // actually has time to go dark before NIGHT kicks in.
      const fadeDelay = phase === CONSTANTS.PHASE.NIGHT_TRANSITION ? 0 : 4000;
      const textDelay = phase === CONSTANTS.PHASE.NIGHT_TRANSITION ? 0 : 3500;
      fadeTimers.current.push(setTimeout(() => {
        setNightFade('to-black');
      }, fadeDelay));
      // Only schedule the text reveal on the first pre-night phase. On
      // subsequent chained entries the text is already on screen (or the
      // timer to show it is already queued) and re-scheduling would either
      // re-trigger it or race with hide logic.
      if (isFirstPreNightThisDay) {
        fadeTimers.current.push(setTimeout(() => {
          setShowNightText(true);
        }, textDelay));
      }
      // Trigger walk-away (separate timer, not cleared on phase change).
      // IMPORTANT: only reveal players when we *start* the walk.
      // Re-entering a PRE_NIGHT phase (e.g. EXECUTION → NIGHT_TRANSITION)
      // must NOT re-show players if the walk already finished.
      if (isFirstPreNightThisDay) {
        nightStartedForDay.current = game.dayCount;
        setNightPlayersHidden(false);
        setNightTransition(true);
        if (walkTimer.current) clearTimeout(walkTimer.current);
        walkTimer.current = setTimeout(() => {
          setNightTransition(false);
          setNightPlayersHidden(true);
        }, 4000);
      }
    }

    // Night starts: already black from pre-night, reveal night scene
    if (phase === CONSTANTS.PHASE.NIGHT && lastPhaseForFade.current !== CONSTANTS.PHASE.NIGHT) {
      setNightPlayersHidden(true);
      setNightTransition(false);
      fadeTimers.current.push(setTimeout(() => setShowNightText(false), 3000));
      setNightFade('from-black');
      fadeTimers.current.push(setTimeout(() => setNightFade('none'), 1500));

      // Schedule fade-to-black before night ends (for night→day)
      const nightDuration = CONSTANTS.DURATIONS?.NIGHT || 30000;
      fadeTimers.current.push(setTimeout(() => {
        setNightFade('to-black');
      }, nightDuration - 3000));

      // Night ambiance messages — 3 staggered messages during the night
      const shuffled = [...getNightAmbiance()].sort(() => Math.random() - 0.5);
      fadeTimers.current.push(setTimeout(() => {
        setNightAmbianceMsg(shuffled[0]);
        setTimeout(() => setNightAmbianceMsg(null), 6000);
      }, 6000));
      fadeTimers.current.push(setTimeout(() => {
        setNightAmbianceMsg(shuffled[1]);
        setTimeout(() => setNightAmbianceMsg(null), 6000);
      }, 13000));
      fadeTimers.current.push(setTimeout(() => {
        setNightAmbianceMsg(shuffled[2]);
        setTimeout(() => setNightAmbianceMsg(null), 6000);
      }, 20000));
    }

    // Leaving night: reveal day scene + reset sunset
    if (lastPhaseForFade.current === CONSTANTS.PHASE.NIGHT && phase !== CONSTANTS.PHASE.NIGHT) {
      setIsSunset(false);
      setNightFade('from-black');
      fadeTimers.current.push(setTimeout(() => {
        setNightFade('none');
      }, 2000));
    }

    lastPhaseForFade.current = phase;
    return () => fadeTimers.current.forEach(clearTimeout);
  }, [phase]);

  // Execution flash: red vignette during EXECUTION phase, before the text
  useEffect(() => {
    if (phase === CONSTANTS.PHASE.EXECUTION) {
      setShowExecutionFlash(true);
      return () => setShowExecutionFlash(false);
    }
    setShowExecutionFlash(false);
  }, [phase]);

  // Day-1 opening: the intro cinematic feeds straight into DISCUSSION
  // (no DEATH_REPORT on day 1 — nobody died yet). When that transition
  // fires, show a single "Le village se lève..." line so the first day
  // actually has a moment before the chat + HUD fade in, without ever
  // printing a misleading "peaceful night" or "Nuit 1" label. Gated on
  // a ref that is re-armed every time a new INTRO_CINEMATIC starts so
  // "Rejouer" replays the opener.
  const introToDayFired = useRef(false);
  useEffect(() => {
    if (phase === CONSTANTS.PHASE.INTRO_CINEMATIC) {
      introToDayFired.current = false;
      return;
    }
    if (phase !== CONSTANTS.PHASE.DISCUSSION) return;
    if ((game?.dayCount || 0) !== 1) return;
    if (introToDayFired.current) return;
    introToDayFired.current = true;
    const variants = i18n.t('game:day_rising_variants', { returnObjects: true });
    const picked = Array.isArray(variants) && variants.length > 0
      ? variants[Math.floor(Math.random() * variants.length)]
      : i18n.t('game:phases.DAY_RISING');
    setDayRisingText(picked);
    const t0 = setTimeout(() => setShowDayText(true), 50);
    const t1 = setTimeout(() => setShowDayText(false), 2600);
    return () => { clearTimeout(t0); clearTimeout(t1); };
  }, [phase, game.dayCount]);

  // Death report sequence: "Le village se lève..." during day fade-in,
  // then reveal deaths once the text has played out. Re-rolls a random
  // variant for both the day-rise line and the peaceful-night fallback
  // on each DEATH_REPORT entry so mornings don't feel copy-pasted.
  // Gated on dayCount > 1: day 1 has no prior night (INTRO_CINEMATIC
  // feeds straight into DISCUSSION), so if we ever land on DEATH_REPORT
  // with dayCount=1 it's a stale/transient state — don't play the "pas
  // une goutte de sang cette nuit" fallback or ring the death bell.
  useEffect(() => {
    if (phase === CONSTANTS.PHASE.DEATH_REPORT && (game?.dayCount || 0) > 1) {
      const pickRandom = (key, fallback) => {
        const arr = i18n.t(key, { returnObjects: true });
        if (Array.isArray(arr) && arr.length > 0) {
          return arr[Math.floor(Math.random() * arr.length)];
        }
        return fallback;
      };
      setDayRisingText(pickRandom('game:day_rising_variants', i18n.t('game:phases.DAY_RISING')));
      setPeacefulNightText(pickRandom('game:peaceful_night_variants', i18n.t('game:system.peaceful_night')));

      // Pick the freshly-killed victim(s) for the morning cinematic cut.
      // Used both to decide whether to ring the death bell and to focus
      // the camera close-up on the body.
      const killEvents = (events || []).filter(
        (e) => (e.type === 'KILL_RESULT' || e.type === 'disconnect') &&
               e.dayCount === game.dayCount &&
               e.content?.chatMessage
      );
      const firstVictimId = killEvents[0]?.content?.target;

      const t0 = setTimeout(() => setShowDayText(true), 800);
      const t1 = setTimeout(() => setShowDayText(false), 3000);
      const t2 = setTimeout(() => setShowBloodEffect(true), 3000);
      const t3 = setTimeout(() => {
        setShowDeathReport(true);
        if (killEvents.length > 0) Audio.playDeathBell();
      }, 3300);

      // Morning death cinematic — cut the camera to a close-up of the
      // first victim once the "village awakens" text clears. Position
      // is looked up at fire time (t4) because playerPositions is only
      // refreshed once the new corpse lands in deadPlayers. Gated on
      // dayCount so re-entering the effect in the same morning doesn't
      // retrigger the cut.
      let t4; let t5;
      if (firstVictimId && deathCinematicForDay.current !== game.dayCount) {
        deathCinematicForDay.current = game.dayCount;
        t4 = setTimeout(() => {
          const pos = playerPositions[firstVictimId]?.position;
          if (pos) setDeathFocusPos(pos);
        }, 3300);
        t5 = setTimeout(() => setDeathFocusPos(null), 7200);
      }

      return () => {
        clearTimeout(t0); clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
        if (t4) clearTimeout(t4); if (t5) clearTimeout(t5);
      };
    } else {
      setShowDeathReport(false);
      setShowBloodEffect(false);
      setDeathFocusPos(null);
      deathCinematicForDay.current = null;
    }
  }, [phase]);

  // Night walk-away / morning walk-in
  const nightStartedForDay = useRef(null);
  const morningStartedForDay = useRef(null);
  const [nightTransition, setNightTransition] = useState(false);
  const [morningTransition, setMorningTransition] = useState(false);
  const [nightPlayersHidden, setNightPlayersHidden] = useState(false);
  const morningTimer = useRef(null);

  useEffect(() => {
    // Reset when leaving night (show players again for day)
    if (phase !== CONSTANTS.PHASE.NIGHT && !PRE_NIGHT_PHASES.includes(phase)) {
      setNightPlayersHidden(false);
    }
    // Morning walk-in: NIGHT → DEATH_REPORT animates players back in
    if (phase === CONSTANTS.PHASE.DEATH_REPORT && morningStartedForDay.current !== game.dayCount) {
      morningStartedForDay.current = game.dayCount;
      setNightPlayersHidden(false);
      setMorningTransition(true);
      if (morningTimer.current) clearTimeout(morningTimer.current);
      morningTimer.current = setTimeout(() => setMorningTransition(false), 4000);
    }
  }, [phase]);

  // Day circle positions (walk-away start) + house positions (walk-away end)
  const dayPositions = useMemo(() => {
    const positions = {};
    // Tightened circle — players stand closer to the plaza center
    const circleRadius = 4.0;
    alivePlayers.forEach((p, i) => {
      const angle = (i / Math.max(alivePlayers.length, 1)) * Math.PI * 2 - Math.PI / 2;
      positions[p.id] = [Math.cos(angle) * circleRadius, PLAYER_Y, Math.sin(angle) * circleRadius];
    });
    return positions;
  }, [alivePlayers.length]);

  // House positions — where players walk to at end of day (radius 12)
  const housePositions = useMemo(() => {
    const positions = {};
    alivePlayers.forEach((p, i) => {
      const angle = (i / Math.max(alivePlayers.length, 1)) * Math.PI * 2 - Math.PI / 2;
      positions[p.id] = [Math.cos(angle) * 12, PLAYER_Y, Math.sin(angle) * 12];
    });
    return positions;
  }, [alivePlayers.length]);

  // Vote / judgment handlers live in the action panel (PlayerActions) —
  // the 3D figures show state but don't own click handlers anymore.

  // Calculate player positions + rotations based on phase
  const playerPositions = useMemo(() => {
    const positions = {};
    // Tightened circle — matches dayPositions so discussion/voting phases
    // keep the same layout as the walk-away start position.
    const circleRadius = 4.0;

    if (phase === CONSTANTS.PHASE.NIGHT) {
      alivePlayers.forEach((p, i) => {
        const angle = (i / Math.max(alivePlayers.length, 1)) * Math.PI * 2;
        const pos = [Math.cos(angle) * 8, PLAYER_Y, Math.sin(angle) * 8];
        positions[p.id] = {
          position: pos,
          rotation: [0, Math.atan2(pos[0], pos[2]), 0], // face outward
        };
      });
    } else if (isTrialPhase) {
      // Podium at PODIUM_POSITION — accused behind it, crowd in the center
      // circle facing the podium.
      const podiumFaceAngle = Math.atan2(-PODIUM_POSITION[0], -PODIUM_POSITION[2]);
      alivePlayers.forEach((p, i) => {
        if (p.id === game.accusedId) {
          const behindOffset = 1.4;
          const ax = PODIUM_POSITION[0] + Math.sin(podiumFaceAngle + Math.PI) * behindOffset;
          const az = PODIUM_POSITION[2] + Math.cos(podiumFaceAngle + Math.PI) * behindOffset;
          positions[p.id] = { position: [ax, PLAYER_Y, az], rotation: [0, podiumFaceAngle, 0] };
        } else {
          const idx = i - (players.findIndex(pl => pl.id === game.accusedId) < i ? 1 : 0);
          const count = alivePlayers.length - 1;
          const angle = (idx / Math.max(count, 1)) * Math.PI * 2 - Math.PI / 2;
          const pos = [Math.cos(angle) * circleRadius, PLAYER_Y, Math.sin(angle) * circleRadius];
          const dx = PODIUM_POSITION[0] - pos[0];
          const dz = PODIUM_POSITION[2] - pos[2];
          positions[p.id] = {
            position: pos,
            rotation: [0, Math.atan2(dx, dz), 0],
          };
        }
      });
    } else {
      alivePlayers.forEach((p, i) => {
        const angle = (i / Math.max(alivePlayers.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const pos = [Math.cos(angle) * circleRadius, PLAYER_Y, Math.sin(angle) * circleRadius];
        positions[p.id] = {
          position: pos,
          rotation: [0, Math.atan2(pos[0], pos[2]) + Math.PI, 0], // face center
        };
      });
    }

    // Dead players: scatter around the plaza center in a tight ring, with
    // a deterministic rotation per body so corpses don't all lie the same
    // way. Using the player id to seed both position and yaw keeps the
    // placement stable across re-renders and across clients.
    deadPlayers.forEach((p, i) => {
      const seed = (p.id?.charCodeAt(0) || 0) + i * 37;
      const angle = ((i * 2.399) + (seed % 17) * 0.1) % (Math.PI * 2); // golden-angle spread
      const r = 1.2 + ((seed % 7) * 0.12);
      const px = Math.cos(angle) * r;
      const pz = Math.sin(angle) * r;
      const yaw = (seed * 0.37) % (Math.PI * 2);
      positions[p.id] = { position: [px, PLAYER_Y, pz], rotation: [0, yaw, 0] };
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
        shadows="soft"
        camera={{ position: [0, 9, 14], fov: 50 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.78 }}
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
            <CameraController
              phase={phase}
              CONSTANTS={CONSTANTS}
              dayCount={game.dayCount || 0}
              deathFocusPos={deathFocusPos}
            />
          )}

          <SceneLighting isDay={game.isDay} isSunset={isSunset} />

          {/* Trial storm — clouds gather and thunder builds during the
              trial phases, climaxing in a single bright strike on
              EXECUTION. Silent lighting-only; no thunder audio yet.
              Build-up: DEFENSE + JUDGMENT. Climax pacing: LAST_WORDS.
              Strike trigger: EXECUTION. Any other phase: disabled. */}
          <TrialStormLighting
            mode={
              phase === CONSTANTS.PHASE.EXECUTION ? 'strike'
              : phase === CONSTANTS.PHASE.LAST_WORDS ? 'climax'
              : (phase === CONSTANTS.PHASE.DEFENSE || phase === CONSTANTS.PHASE.JUDGMENT) ? 'build'
              : 'idle'
            }
          />

          {/* Sky & atmosphere — deterministic weather based on dayCount so
              all players see the same conditions each day. */}
          {(() => {
            const seed = game.dayCount * 7 + 3;
            // Day weather — 3 states only (no more in-between cloudy/grey
            // that just looked like "always slightly foggy"):
            //   roll 0        → sunny  (25%)
            //   roll 1, 2     → misty  (50%)
            //   roll 3        → rainy+thunder (25%)
            // Modulo 4 with two mist slots hits the spec distribution while
            // staying deterministic (same seed → same weather everywhere).
            const dayRoll = seed % 4;
            const isSunny = dayRoll === 0;
            const isRainyDay = dayRoll === 3;
            const isMisty = !isSunny && !isRainyDay;
            // Night weather: 0=clear, 1=rainy+thunder, 2=foggy
            const nightWeather = (seed * 13 + 5) % 3;

            if (game.isDay) {
              // Sky color: warm blue sun, cold slate storm, mid grey mist.
              const skyColor = isSunny ? '#8fcff0' : isRainyDay ? '#5a6878' : '#909aa8';
              return (
                <>
                  <color attach="background" args={[skyColor]} />
                  {/* Fog only thickens when visibility is actually limited.
                      Sunny days push the near-plane far out (50) and the
                      far-plane to 120, so the mountain silhouettes stay
                      visible instead of dissolving into a grey wall — that
                      was the main reason every day felt identical. */}
                  <fog
                    attach="fog"
                    args={[
                      skyColor,
                      isSunny ? 50 : isRainyDay ? 8 : 12,
                      isSunny ? 120 : isRainyDay ? 26 : 32,
                    ]}
                  />
                  <Sky
                    sunPosition={[100, isRainyDay ? 8 : isSunny ? 60 : 22, 100]}
                    turbidity={isRainyDay ? 26 : isSunny ? 4 : 12}
                    rayleigh={isRainyDay ? 6 : isSunny ? 1.2 : 3}
                  />
                  <DayFireflies count={isRainyDay ? 8 : isSunny ? 70 : 40} />
                  <FloatingDust count={isMisty ? 140 : isSunny ? 40 : 90} isDay />
                  <WindLeaves count={isRainyDay ? 140 : isSunny ? 70 : 95} />
                  {/* Ground + village fog: gated on actually-foggy weather
                      so sunny afternoons don't carry the same oppressive
                      low-visibility wall the old build always drew. */}
                  {(isMisty || isRainyDay) && <GroundFog isDay />}
                  {(isMisty || isRainyDay) && <VillageFogWall isDay />}
                  {isSunny && <DayRabbits count={8} />}
                  {isRainyDay && <NightRain count={220} />}
                  {isRainyDay && <NightLightning />}
                </>
              );
            } else {
              const isRainy = nightWeather === 1;
              const isFoggy = nightWeather === 2;
              // Night fog pass. The previous config stacked <fog> + always-
              // on GroundFog + always-on NightDarkFog, and then doubled
              // GroundFog + NightDarkFog again on foggy nights — result
              // was that the plaza floor disappeared on ~every night.
              // Now: only clear nights show a very light atmospheric fog;
              // foggy/rainy nights still get the thick layer but without
              // the double render. Near/far pushed out so the ground stays
              // visible from the orbit camera (which sits ~14m up).
              return (
                <>
                  <color attach="background" args={['#060818']} />
                  <fog
                    attach="fog"
                    args={[
                      '#060818',
                      isRainy ? 14 : isFoggy ? 12 : 22,
                      isRainy ? 36 : isFoggy ? 38 : 60,
                    ]}
                  />
                  <Stars radius={80} depth={50} count={isRainy ? 500 : 3000} factor={4} saturation={0} fade speed={1} />
                  <Moon />
                  <FloatingDust count={60} isDay={false} />
                  <NightEmbers count={isRainy ? 30 : isFoggy ? 50 : 70} />
                  {/* Ground-level fog reserved for weather that actually
                      justifies it — clear nights get starlight + a clean
                      ground. */}
                  {(isFoggy || isRainy) && <GroundFog isDay={false} />}
                  <VillageFogWall isDay={false} />
                  <NightCrows count={4} />
                  <NightDarkFog count={isFoggy ? 24 : isRainy ? 14 : 8} />
                  {isRainy && <NightRain count={300} />}
                  {isRainy && <NightLightning />}
                </>
              );
            }
          })()}

          <GroundPlane isDay={game.isDay} />
          <Village isDay={game.isDay} isTrialPhase={isTrialPhase} />

          {/* Alive players — hidden during night and after walk finishes */}
          {!nightPlayersHidden && phase !== CONSTANTS.PHASE.NIGHT && alivePlayers.map((player) => {
            const isMe = player.id === me?.id;
            const isAccused = player.id === game.accusedId;
            const showVoteBtn = isVotingPhase;
            const pData = playerPositions[player.id] || { position: [0, 0, 0], rotation: [0, 0, 0] };
            const isAnimating = nightTransition || morningTransition;
            // Night: walk circle → house. Morning: house → circle.
            let usePos, startPos;
            if (isPaused && isMe && pausePos) {
              usePos = pausePos;
              startPos = null;
            } else if (nightTransition) {
              usePos = housePositions[player.id] || pData.position;
              startPos = dayPositions[player.id];
            } else if (morningTransition) {
              usePos = pData.position;
              startPos = housePositions[player.id];
            } else {
              usePos = pData.position;
              startPos = null;
            }
            const useRot = (isPaused && isMe) ? [0, pauseYaw + Math.PI, 0] : pData.rotation;
            return (
              <PlayerFigure
                key={player.id}
                player={player}
                position={usePos}
                rotation={useRot}
                pauseAnim={(isPaused && isMe) ? pauseAnim : null}
                startPosition={startPos}
                isTransitioning={isAnimating}
                fadeOnTransition={nightTransition}
                transitionDuration={morningTransition ? 3.5 : 5}
                color={player.profile?.color || '#ffffff'}
                isAccused={isAccused}
                showVote={showVoteBtn}
                voteCount={trial?.suspects?.[player.id]?.suspectedBy?.length || 0}
                totalAlive={alivePlayers.length}
                characterScale={characterScale}
                phase={phase}
                CONSTANTS={CONSTANTS}
                chatMessages={chatMessages}
                dayCount={game.dayCount}
                isGameOver={isGameOver}
                isWinningTeam={isGameOver && (player.character?.team === game.winner)}
              />
            );
          })}

          {/* Dead players — persist as corpses in the plaza center (no label,
              no highlight, no fade). Hidden at night so the villagers are
              alone in the streets during the action phase. */}
          {phase !== CONSTANTS.PHASE.NIGHT && deadPlayers.map((player) => {
            const pData = playerPositions[player.id] || { position: [0, 0, 0], rotation: [0, 0, 0] };
            return (
              <DeadPlayerFigure
                key={player.id}
                player={player}
                position={pData.position}
                rotation={pData.rotation}
              />
            );
          })}

          {/* Post-processing — minimal to avoid white artifacts.
              HueSaturation pushes color punch without touching hue; kept
              at +0.18 so greens/reds feel vivid but skin tones don't
              cartoon out. Bumping exposure from 0.65 to 0.78 matches the
              new saturation so the image doesn't feel flat. */}
          <EffectComposer>
            <Bloom
              intensity={game.isDay ? 0.08 : 0.1}
              luminanceThreshold={0.95}
              luminanceSmoothing={0.2}
              mipmapBlur
            />
            <HueSaturation saturation={0.18} />
            <Vignette
              offset={game.isDay ? 0.3 : 0.1}
              darkness={game.isDay ? 0.35 : 0.85}
            />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* Blood effect — only shown to the player who actually died.
          Before, every living villager got the bloody teeth vignette
          each morning someone was killed, which flattened the "it's
          YOU" punch of the effect. Now it fires exclusively for the
          victim (and ignores disconnect-as-kill events that don't
          have the same narrative weight). */}
      {phase === CONSTANTS.PHASE.DEATH_REPORT && showBloodEffect && (() => {
        if (!me?.id) return null;
        const wasKilled = (events || []).some(
          (e) => e.type === 'KILL_RESULT'
            && e.dayCount === game.dayCount
            && e.content?.target === me.id,
        );
        if (!wasKilled) return null;
        return (
          <div className="blood-overlay">
            <div className="blood-overlay-inner">
              <div className="blood-vignette" />
              <div className="blood-drip" />
              <div className="blood-drip" />
              <div className="blood-drip" />
              <div className="blood-drip" />
              <div className="blood-drip" />
            </div>
          </div>
        );
      })()}

      {/* Lynch role reveal overlay — post-execution suspense moment.
          5s dedicated phase so the room has time to read the verdict
          ("X was judged guilty") and the role reveal ("Their role was…")
          before the screen fades to night. */}
      {phase === CONSTANTS.PHASE.EXECUTION_REVEAL && (() => {
        const executed = players.find((p) => p.id === game.accusedId);
        if (!executed?.character) return null;
        const role = executed.character;
        const teamLabel = i18n.t(`game:teams.${role.team}.short`, { defaultValue: role.team });
        const roleLabel = i18n.t(`roles:${role.key}.label`, { defaultValue: role.label });
        return (
          <div className="lynch-reveal-overlay">
            <div
              className="lynch-reveal-halo"
              style={{
                background: `radial-gradient(ellipse at center, ${role.couleur}88 0%, ${role.couleur}44 25%, ${role.couleur}1c 50%, transparent 75%)`,
              }}
            />
            <div
              className="lynch-reveal-card"
              style={{
                borderColor: role.couleur,
                boxShadow: `0 0 40px ${role.couleur}55, 0 0 100px ${role.couleur}2a`,
              }}
            >
              <div className="lynch-reveal-verdict">
                {i18n.t('game:lynch_reveal.verdict', { name: executed.profile?.name || '?', defaultValue: '{{name}} has been found guilty' })}
              </div>
              <div className="lynch-reveal-role-label">
                {i18n.t('game:lynch_reveal.role_was', { defaultValue: 'Their role was:' })}
              </div>
              <div className="lynch-reveal-icon" style={{ color: role.couleur }}>
                <i className={`fas ${role.icon}`}></i>
              </div>
              <div className="lynch-reveal-role" style={{ color: role.couleur }}>{roleLabel}</div>
              <div className="lynch-reveal-team" style={{ color: role.couleur }}>{teamLabel}</div>
            </div>
          </div>
        );
      })()}

      {/* Death report overlay — structured layout:
          1) narrative line: "<victim> n'a pas survécu… <flavor>"
          2) role card: icon + role label, highlighted in the role color
          3) testament block (if the victim wrote a last will)
          The old single-string regex approach concatenated everything
          on one line, making the role reveal easy to miss. Disconnect
          events still fall back to the plain chatMessage since they
          don't carry structured role fields. */}
      {phase === CONSTANTS.PHASE.DEATH_REPORT && showDeathReport && (game?.dayCount || 0) > 1 && (() => {
        const killEvents = (events || []).filter(
          e => (e.type === 'KILL_RESULT' || e.type === 'disconnect') && e.dayCount === game.dayCount && e.content?.chatMessage
        );
        const hasDead = killEvents.length > 0;

        return (
          <div className={`death-report-overlay ${hasDead ? 'has-dead' : 'no-dead'}`}>
            <div className="death-report-card">
              {hasDead ? (
                killEvents.map((entry, i) => {
                  const c = entry.content;
                  const roleLabelI18n = c.roleKey
                    ? i18n.t(`roles:${c.roleKey}.label`, { defaultValue: c.roleLabel })
                    : c.roleLabel;
                  // Build the narrative line without the role reveal so
                  // the role is isolated in its own card below.
                  const narrative = c.victimName && c.flavor
                    ? i18n.t('game:death_messages.death_announce', {
                        name: c.victimName,
                        flavor: c.flavor,
                        defaultValue: `${c.victimName} n'a pas survécu à la nuit... ${c.flavor}`,
                      })
                    : (c.chatMessage || '').split(/\n|📜/)[0];
                  // Normalise the kill type into a readable label. Keeps
                  // the attacker FACTION visible without spoiling identity
                  // (we don't tell "Bob was the killer", just the side).
                  const killLabel = c.killType
                    ? i18n.t(`game:kill_source.${c.killType}`, { defaultValue: c.killType })
                    : null;
                  const teamLabel = c.roleTeam
                    ? i18n.t(`game:team_name.${c.roleTeam}`, { defaultValue: c.roleTeam })
                    : null;
                  const teamBadgeColor = {
                    town: '#78ff78', mafia: '#ff4444',
                    cult: '#a96edd', neutral: '#9370db',
                  }[c.roleTeam] || '#aaa';
                  return (
                    <div key={i} className="death-report-entry">
                      <div className="death-desc">{narrative}</div>
                      {killLabel && (
                        <div className="death-meta-row">
                          <span className="death-meta-pill death-meta-attack">
                            <i className="fas fa-skull-crossbones" aria-hidden="true"></i>
                            <span className="death-meta-label">{i18n.t('game:kill_source.label')} :</span>
                            <strong>{killLabel}</strong>
                          </span>
                          {teamLabel && (
                            <span
                              className="death-meta-pill death-meta-team"
                              style={{ color: teamBadgeColor, borderColor: `${teamBadgeColor}66`, background: `${teamBadgeColor}15` }}
                            >
                              <i className="fas fa-users" aria-hidden="true"></i>
                              <strong>{teamLabel}</strong>
                            </span>
                          )}
                        </div>
                      )}
                      {c.roleKey && (
                        <div
                          className="death-role-card"
                          style={{
                            borderColor: c.roleColor || '#aaa',
                            boxShadow: `0 0 22px ${(c.roleColor || '#aaa')}44`,
                          }}
                        >
                          <div className="death-role-label">
                            {i18n.t('game:lynch_reveal.role_was', { defaultValue: 'Son rôle était :' })}
                          </div>
                          <div className="death-role-body" style={{ color: c.roleColor || '#fff' }}>
                            {c.roleIcon && <i className={`fas ${c.roleIcon}`}></i>}
                            <span>{roleLabelI18n}</span>
                          </div>
                          {c.roleDescription && (
                            <div className="death-role-desc">{c.roleDescription}</div>
                          )}
                        </div>
                      )}
                      {c.lastWill && (
                        <div className="death-will">
                          <i className="fas fa-scroll" aria-hidden="true"></i>
                          <span className="death-will-label">{i18n.t('game:death_messages.will_label', { defaultValue: 'Testament' })}</span>
                          <span className="death-will-text">«&nbsp;{c.lastWill}&nbsp;»</span>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="death-report-safe">{peacefulNightText || i18n.t('game:system.peaceful_night')}</div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Phase announcements */}
      {phase === CONSTANTS.PHASE.NO_LYNCH && (
        <div className="scene-announcement" style={{ animation: 'announcement-auto-fade 2.5s ease-out forwards' }}>
          <div className="announcement-text">{i18n.t('game:scene.no_lynch')}</div>
        </div>
      )}
      {phase === CONSTANTS.PHASE.SPARED && (
        <div className="scene-announcement" style={{ animation: 'announcement-auto-fade 3s ease-out forwards' }}>
          <div className="announcement-text announcement-spared">
            {i18n.t('game:scene.spared', { name: players.find(p => p.id === game.accusedId)?.profile.name || '?' })}
          </div>
        </div>
      )}
      {phase === CONSTANTS.PHASE.EXECUTION && (
        <>
          {showExecutionFlash && (
            <div className="blood-overlay" style={{ animation: 'blood-flash 2.5s ease-out forwards' }}>
              <div className="blood-overlay-inner">
                <div className="blood-vignette" />
              </div>
            </div>
          )}
          {/* Delayed 1s so flash + death anim play first */}
          <div className="scene-announcement" style={{ animation: 'announcement-auto-fade 2.5s ease-out 0.8s both' }}>
            <div className="announcement-text announcement-execution">
              {i18n.t('game:scene.executed', { name: players.find(p => p.id === game.accusedId)?.profile.name || '?' })}
            </div>
          </div>
        </>
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

      {/* Night↔Day black fade transition */}
      {nightFade === 'to-black' && <div className="night-fade-to-black" />}
      {nightFade === 'from-black' && <div className="night-fade-from-black" />}
      {showNightText && (
        <div className="night-text-overlay">
          <div className="night-text-content text-night">{nightTransitionText || i18n.t('game:phases.NIGHT_TRANSITION')}</div>
        </div>
      )}
      {showDayText && (
        <div className="night-text-overlay is-day-text">
          <div className="night-text-content">{dayRisingText || i18n.t('game:phases.DAY_RISING')}</div>
        </div>
      )}
      {nightAmbianceMsg && (
        <div className="night-text-overlay" key={nightAmbianceMsg}>
          <div className="night-text-content text-night night-text-ambiance">{nightAmbianceMsg}</div>
        </div>
      )}
    </div>
  );
};

export default MainScene;
