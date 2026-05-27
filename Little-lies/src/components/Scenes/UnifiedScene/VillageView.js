import React, { useMemo, useState, useEffect, useRef, Suspense } from 'react';
import { Sky, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, HueSaturation } from '@react-three/postprocessing';
import { useMultiplayerState, getRoomCode } from 'playroomkit';
import { useGameEngine } from '../../../hooks/useGameEngine';
import { PLAYER_Y, PODIUM_POSITION } from '../constants';
import { getGameSeed, LOBBY_MOODS, MOOD_DAY_ROLLS, MOOD_NIGHT_ROLLS } from '../utils';
import CameraController from '../Camera/CameraController';
import SceneLighting from '../Lighting/SceneLighting';
import GroundPlane from '../Environment/GroundPlane';
import Village from '../Buildings/Village';
import PlayerFigure from '../Players/PlayerFigure';
import DeadPlayerFigure from '../Players/DeadPlayerFigure';
import PausePlayerController from '../Players/PausePlayerController';
import Moon from '../Atmosphere/Moon';
import { DayFireflies } from '../Atmosphere/Fireflies';
import FloatingDust from '../Atmosphere/FloatingDust';
import WindLeaves from '../Atmosphere/WindLeaves';
import NightEmbers from '../Atmosphere/NightEmbers';
import GroundFog from '../Weather/GroundFog';
import VillageFogWall from '../Weather/VillageFogWall';
import HorizonMist from '../Weather/HorizonMist';
import NightRain from '../Weather/NightRain';
import NightLightning from '../Weather/NightLightning';
import TrialStormLighting from '../Weather/TrialStormLighting';
import NightDarkFog from '../Weather/NightDarkFog';
import NightCrows from '../Wildlife/NightCrows';
import DayRabbits from '../Wildlife/DayRabbits';
import ExecutionCrows from '../Wildlife/ExecutionCrows';
import DistantWindmill from '../Environment/DistantWindmill';
import CirclingBirds from '../Atmosphere/CirclingBirds';
import CandleRack from '../Props/CandleRack';

// ─────────────────────────────────────────────────────────────────────
// VillageView — R3F payload of the in-game scene.
//
// Mounted inside UnifiedScene's <Canvas> when view === 'game'. Replaces
// the now-defunct private Canvas that MainScene used to host. Brings
// its own CameraController (the camera per-phase logic — intro / night
// waypoints / trial / death cinematic / day orbits — is complex enough
// that we keep it next to the village content rather than folding it
// into CameraRig).
//
// Owns: sky / fog / lighting / atmosphere / weather / wildlife / ground
// / village / players / death focus camera. Doesn't own: HTML overlays
// (those still live in MainScene, which now renders no Canvas).
// ─────────────────────────────────────────────────────────────────────

// Lerp a hex color toward a target by amount 0..1. Used to blood-tint
// the sky + fog as deaths accumulate during a game.
const lerpHex = (hex, targetHex, amount) => {
  const parse = (h) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(hex);
  const [r2, g2, b2] = parse(targetHex);
  const r = Math.round(r1 + (r2 - r1) * amount);
  const g = Math.round(g1 + (g2 - g1) * amount);
  const b = Math.round(b1 + (b2 - b1) * amount);
  const pad = (n) => n.toString(16).padStart(2, '0');
  return `#${pad(r)}${pad(g)}${pad(b)}`;
};

const VillageView = () => {
  const { game, getPlayers, getMe, CONSTANTS, trial } = useGameEngine();
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
  const deathsCount = deadPlayers.length;
  const totalPlayers = Math.max(players.length, 1);
  const deathsRatio = Math.min(deathsCount / totalPlayers, 1) * 0.6;

  const gameSeed = useMemo(
    () => getGameSeed(getRoomCode() || '', game?.gameStartedAt || 0),
    [game?.gameStartedAt],
  );
  const lobbyMood = LOBBY_MOODS[gameSeed % LOBBY_MOODS.length];
  const moonPhase = (gameSeed >> 3) % 4;

  // Pause mode local state
  const [pausePos, setPausePos] = useState(null);
  const [pauseAnim, setPauseAnim] = useState('Idle');
  const [pauseYaw, setPauseYaw] = useState(0);

  const isTrialPhase = [
    CONSTANTS.PHASE.DEFENSE, CONSTANTS.PHASE.JUDGMENT,
    CONSTANTS.PHASE.LAST_WORDS, CONSTANTS.PHASE.EXECUTION,
  ].includes(phase);

  const isVotingPhase = phase === CONSTANTS.PHASE.VOTING;

  // Sunset window — lit by the same effect that drives the night-fade
  // overlay in MainScene. Kept local here because SceneLighting reads
  // it; MainScene's copy is for the HTML fade-to-black.
  const [isSunset, setIsSunset] = useState(false);

  const PRE_NIGHT_PHASES = [
    CONSTANTS.PHASE.NO_LYNCH, CONSTANTS.PHASE.SPARED,
    CONSTANTS.PHASE.EXECUTION,
    CONSTANTS.PHASE.NIGHT_TRANSITION,
  ];

  useEffect(() => {
    if (phase === CONSTANTS.PHASE.LAST_WORDS) setIsSunset(true);
    else if (PRE_NIGHT_PHASES.includes(phase)) setIsSunset(true);
    else if (phase !== CONSTANTS.PHASE.NIGHT) setIsSunset(false);
  }, [phase]);

  // Death-reveal camera focus + the night/morning walk transitions are
  // duplicated here from MainScene because they drive R3F render output
  // (camera target + player visibility). MainScene keeps its own copy
  // for the HTML overlays it owns; both compute from the same shared
  // state so they stay in sync.
  const [deathFocusPos, setDeathFocusPos] = useState(null);
  const deathCinematicForDay = useRef(null);
  const nightStartedForDay = useRef(null);
  const morningStartedForDay = useRef(null);
  const [nightTransition, setNightTransition] = useState(false);
  const [morningTransition, setMorningTransition] = useState(false);
  const [nightPlayersHidden, setNightPlayersHidden] = useState(false);
  const walkTimer = useRef(null);
  const morningTimer = useRef(null);

  useEffect(() => {
    if (PRE_NIGHT_PHASES.includes(phase)) {
      const isFirstPreNightThisDay = nightStartedForDay.current !== game.dayCount;
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
    if (phase !== CONSTANTS.PHASE.NIGHT && !PRE_NIGHT_PHASES.includes(phase)) {
      setNightPlayersHidden(false);
    }
    if (phase === CONSTANTS.PHASE.NIGHT) {
      setNightPlayersHidden(true);
      setNightTransition(false);
    }
    if (phase === CONSTANTS.PHASE.DEATH_REPORT && morningStartedForDay.current !== game.dayCount) {
      morningStartedForDay.current = game.dayCount;
      setNightPlayersHidden(false);
      setMorningTransition(true);
      if (morningTimer.current) clearTimeout(morningTimer.current);
      morningTimer.current = setTimeout(() => setMorningTransition(false), 4000);
    }
  }, [phase]);

  // Morning death cinematic — flips deathFocusPos for ~4s on the freshly
  // killed victim's body. Read by CameraController to swirl around the
  // corpse. Gated on dayCount so re-entering DEATH_REPORT in the same
  // morning doesn't retrigger.
  useEffect(() => {
    if (phase !== CONSTANTS.PHASE.DEATH_REPORT) {
      setDeathFocusPos(null);
      deathCinematicForDay.current = null;
      return;
    }
    if ((game?.dayCount || 0) <= 1) return;
    const killEvents = (events || []).filter(
      (e) => (e.type === 'KILL_RESULT' || e.type === 'disconnect') &&
        e.dayCount === game.dayCount &&
        e.content?.chatMessage,
    );
    const firstVictimId = killEvents[0]?.content?.target;
    if (!firstVictimId || deathCinematicForDay.current === game.dayCount) return;
    deathCinematicForDay.current = game.dayCount;
    const t4 = setTimeout(() => {
      const pos = playerPositions[firstVictimId]?.position;
      if (pos) setDeathFocusPos(pos);
    }, 3300);
    const t5 = setTimeout(() => setDeathFocusPos(null), 7200);
    return () => { clearTimeout(t4); clearTimeout(t5); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Day circle positions + house positions for night walk
  const dayPositions = useMemo(() => {
    const positions = {};
    const circleRadius = 4.0;
    alivePlayers.forEach((p, i) => {
      const angle = (i / Math.max(alivePlayers.length, 1)) * Math.PI * 2 - Math.PI / 2;
      positions[p.id] = [Math.cos(angle) * circleRadius, PLAYER_Y, Math.sin(angle) * circleRadius];
    });
    return positions;
  }, [alivePlayers.length]);

  const housePositions = useMemo(() => {
    const positions = {};
    alivePlayers.forEach((p, i) => {
      const angle = (i / Math.max(alivePlayers.length, 1)) * Math.PI * 2 - Math.PI / 2;
      positions[p.id] = [Math.cos(angle) * 12, PLAYER_Y, Math.sin(angle) * 12];
    });
    return positions;
  }, [alivePlayers.length]);

  const playerPositions = useMemo(() => {
    const positions = {};
    const circleRadius = 4.0;

    if (phase === CONSTANTS.PHASE.NIGHT) {
      alivePlayers.forEach((p, i) => {
        const angle = (i / Math.max(alivePlayers.length, 1)) * Math.PI * 2;
        const pos = [Math.cos(angle) * 8, PLAYER_Y, Math.sin(angle) * 8];
        positions[p.id] = {
          position: pos,
          rotation: [0, Math.atan2(pos[0], pos[2]), 0],
        };
      });
    } else {
      alivePlayers.forEach((p, i) => {
        const angle = (i / Math.max(alivePlayers.length, 1)) * Math.PI * 2 - Math.PI / 2;
        const pos = [Math.cos(angle) * circleRadius, PLAYER_Y, Math.sin(angle) * circleRadius];
        positions[p.id] = {
          position: pos,
          rotation: [0, Math.atan2(pos[0], pos[2]) + Math.PI, 0],
        };
      });
    }

    deadPlayers.forEach((p, i) => {
      const seed = (p.id?.charCodeAt(0) || 0) + i * 37;
      const angle = ((i * 2.399) + (seed % 17) * 0.1) % (Math.PI * 2);
      const r = 1.2 + ((seed % 7) * 0.12);
      const px = Math.cos(angle) * r;
      const pz = Math.sin(angle) * r;
      const yaw = (seed * 0.37) % (Math.PI * 2);
      positions[p.id] = { position: [px, PLAYER_Y, pz], rotation: [0, yaw, 0] };
    });

    return positions;
  }, [phase, alivePlayers.length, deadPlayers.length, game.accusedId]);

  useEffect(() => {
    if (isPaused && me) {
      const myPos = playerPositions[me.id];
      setPausePos(myPos ? [...myPos.position] : [0, 0, 0]);
    } else {
      setPausePos(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPaused]);

  return (
    <Suspense fallback={null}>
      {isPaused && pausePos ? (
        <PausePlayerController
          pausePos={pausePos}
          setPausePos={setPausePos}
          setPauseAnim={setPauseAnim}
          setPauseYaw={setPauseYaw}
          playerRotation={playerPositions[me?.id]?.rotation?.[1] || 0}
          otherPlayerPositions={alivePlayers.filter((p) => p.id !== me?.id).map((p) => playerPositions[p.id]?.position || [0, 0, 0])}
        />
      ) : (
        <CameraController
          phase={phase}
          CONSTANTS={CONSTANTS}
          dayCount={game.dayCount || 0}
          deathFocusPos={deathFocusPos}
          playerCount={players.length}
          gameSeed={gameSeed}
        />
      )}

      <SceneLighting isDay={game.isDay} isSunset={isSunset} />

      <TrialStormLighting
        mode={
          phase === CONSTANTS.PHASE.EXECUTION ? 'strike'
            : phase === CONSTANTS.PHASE.LAST_WORDS ? 'climax'
              : (phase === CONSTANTS.PHASE.DEFENSE || phase === CONSTANTS.PHASE.JUDGMENT) ? 'build'
                : 'idle'
        }
      />

      {(() => {
        const day = game.dayCount || 0;
        const dayIdx = ((day % 4) + 4) % 4;
        const isIntro = phase === CONSTANTS.PHASE.INTRO_CINEMATIC;
        const rawDayRoll = isIntro ? 0 : MOOD_DAY_ROLLS[lobbyMood][dayIdx];
        const rawNightWeather = MOOD_NIGHT_ROLLS[lobbyMood][dayIdx];
        const aw = game.adminWeather;
        const dayRoll = aw === 'sunny' ? 0 : aw === 'misty' ? 1 : aw === 'rainy' ? 3 : rawDayRoll;
        const nightWeather = aw === 'clear' ? 0 : aw === 'rainy' ? 1 : aw === 'foggy' ? 2 : rawNightWeather;
        const isSunny = dayRoll === 0;
        const isRainyDay = dayRoll === 3;
        const isMisty = !isSunny && !isRainyDay;
        const isDusk = !isIntro && lobbyMood === 'DUSK';

        if (game.isDay) {
          let baseSky = isSunny ? '#8fcff0' : isRainyDay ? '#5a6878' : '#909aa8';
          if (isDusk) baseSky = lerpHex(baseSky, '#e59c5f', 0.55);
          const skyColor = lerpHex(baseSky, '#4a1e1e', deathsRatio);
          const fogShrink = 1 - deathsRatio * 0.35;
          const fogNear = (isSunny ? 50 : isRainyDay ? 8 : 12) * fogShrink;
          const fogFar = (isSunny ? 120 : isRainyDay ? 26 : 32) * fogShrink;
          return (
            <>
              <color attach="background" args={[skyColor]} />
              <fog attach="fog" args={[skyColor, fogNear, fogFar]} />
              <Sky
                sunPosition={[100, isRainyDay ? 8 : isSunny ? 60 : 22, 100]}
                turbidity={isRainyDay ? 26 : isSunny ? 4 : 12}
                rayleigh={isRainyDay ? 6 : isSunny ? 1.2 : 3}
              />
              <DayFireflies count={isRainyDay ? 8 : isSunny ? 70 : 40} />
              <FloatingDust count={isMisty ? 140 : isSunny ? 40 : 90} isDay />
              <WindLeaves count={isRainyDay ? 140 : isSunny ? 70 : 95} />
              {(isMisty || isRainyDay) && <GroundFog isDay />}
              {(isMisty || isRainyDay) && <VillageFogWall isDay />}
              <HorizonMist isDay />
              {isSunny && <DayRabbits count={8} />}
              {isRainyDay && <NightRain count={220} />}
              {isRainyDay && <NightLightning />}
              <CirclingBirds baseCount={3} deathsCount={deathsCount} />
            </>
          );
        } else {
          const isRainy = nightWeather === 1;
          const isFoggy = nightWeather === 2;
          const nightSky = lerpHex('#060818', '#140408', deathsRatio);
          const nightFogShrink = 1 - deathsRatio * 0.25;
          return (
            <>
              <color attach="background" args={[nightSky]} />
              <fog
                attach="fog"
                args={[
                  nightSky,
                  (isRainy ? 14 : isFoggy ? 12 : 22) * nightFogShrink,
                  (isRainy ? 36 : isFoggy ? 38 : 60) * nightFogShrink,
                ]}
              />
              <Stars radius={80} depth={50} count={isRainy ? 500 : 3000} factor={4} saturation={0} fade speed={1} />
              <Moon phase={moonPhase} />
              <FloatingDust count={60} isDay={false} />
              <NightEmbers count={isRainy ? 30 : isFoggy ? 50 : 70} />
              {(isFoggy || isRainy) && <GroundFog isDay={false} />}
              <VillageFogWall isDay={false} />
              <HorizonMist isDay={false} />
              <NightCrows count={Math.min(4 + deathsCount, 10)} />
              <NightDarkFog count={isFoggy ? 24 : isRainy ? 14 : 8} />
              {isRainy && <NightRain count={300} />}
              {isRainy && <NightLightning />}
            </>
          );
        }
      })()}

      <GroundPlane isDay={game.isDay} />
      <Village isDay={game.isDay} isTrialPhase={isTrialPhase} gameSeed={gameSeed} />

      <DistantWindmill position={[-28, 0, -26]} scale={1.8} />
      <DistantWindmill position={[26, 0, -30]} scale={1.5} towerColor="#342a24" />

      <CandleRack position={[5.5, 0, -11]} rotation={[0, -0.35, 0]} deathsCount={deathsCount} />

      {!nightPlayersHidden && phase !== CONSTANTS.PHASE.NIGHT && alivePlayers.map((player) => {
        const isMe = player.id === me?.id;
        const isAccused = player.id === game.accusedId;
        const showVoteBtn = isVotingPhase;
        const pData = playerPositions[player.id] || { position: [0, 0, 0], rotation: [0, 0, 0] };
        const isAnimating = nightTransition || morningTransition;
        let usePos;
        let startPos;
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

      {phase === CONSTANTS.PHASE.EXECUTION && (
        <ExecutionCrows origin={[PODIUM_POSITION[0], 3.5, PODIUM_POSITION[2]]} />
      )}

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
  );
};

export default VillageView;
