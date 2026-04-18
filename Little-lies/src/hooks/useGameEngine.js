import React, { useEffect } from 'react';
import { isHost, useMultiplayerState, usePlayersList, me } from 'playroomkit';
import { useEvents } from './useEvents';
import { getRoles } from '../data/roles.js';
import {
  checkWinCondition as pureCheckWinCondition,
  checkVotingMajority as pureCheckVotingMajority,
  resolveJudgment as pureResolveJudgment,
  sanitizeTrial as pureSanitizeTrial,
  trialsEqual,
  sanitizeGameState,
  gameStateDirty,
} from './gameRules';
import { computeNextPhase } from './phaseTransitions';
import { resolveDisconnects, resolveAFK } from './playerLifecycle';
import i18n from '../trad/i18n';

const GameEngineContext = React.createContext();

// Phase durations (ms) — tuned for real multiplayer gameplay
const DURATIONS = {
  NIGHT: 30000,
  NIGHT_TRANSITION: 3000,   // visual fade between day/night (covers 1.5s black fade + breather)
  DEATH_REPORT: 7000,       // 7s to read deaths (was 5s)
  DISCUSSION: 30000,        // 30s to discuss (was 15s)
  VOTING: 30000,
  DEFENSE: 20000,
  JUDGMENT: 15000,
  LAST_WORDS: 5000,
  EXECUTION: 3000,
  EXECUTION_REVEAL: 8000,   // suspense reveal of the lynched player's role
  NO_LYNCH: 6000,
  SPARED: 5000,
};

// All game phases in order
const PHASE = {
  NIGHT: 'NIGHT',
  NIGHT_TRANSITION: 'NIGHT_TRANSITION',
  DEATH_REPORT: 'DEATH_REPORT',
  DISCUSSION: 'DISCUSSION',
  VOTING: 'VOTING',
  DEFENSE: 'DEFENSE',
  JUDGMENT: 'JUDGMENT',
  LAST_WORDS: 'LAST_WORDS',
  EXECUTION: 'EXECUTION',
  EXECUTION_REVEAL: 'EXECUTION_REVEAL',
  NO_LYNCH: 'NO_LYNCH',
  SPARED: 'SPARED',
};

// Game statuses
const STATUS = {
  SETUP: 'setup',
  ROLE_SELECTION: 'role_selection',
  STARTED: 'started',
  ENDED: 'ended',
};

// Phase labels for UI display
const PHASE_LABELS = {
  [PHASE.NIGHT]: 'Nuit',
  [PHASE.NIGHT_TRANSITION]: 'La nuit tombe...',
  [PHASE.DEATH_REPORT]: 'Annonce des morts',
  [PHASE.DISCUSSION]: 'Discussion',
  [PHASE.VOTING]: 'Vote',
  [PHASE.DEFENSE]: 'D\u00e9fense',
  [PHASE.JUDGMENT]: 'Jugement',
  [PHASE.LAST_WORDS]: 'Derniers mots',
  [PHASE.EXECUTION]: 'Ex\u00e9cution',
  [PHASE.EXECUTION_REVEAL]: 'R\u00e9v\u00e9lation',
  [PHASE.NO_LYNCH]: 'Pas de lynchage',
  [PHASE.SPARED]: '\u00c9pargn\u00e9',
};

// Phase icons for HUD
const PHASE_ICONS = {
  [PHASE.NIGHT]: 'fa-moon',
  [PHASE.NIGHT_TRANSITION]: 'fa-moon',
  [PHASE.DEATH_REPORT]: 'fa-skull',
  [PHASE.DISCUSSION]: 'fa-comments',
  [PHASE.VOTING]: 'fa-gavel',
  [PHASE.DEFENSE]: 'fa-shield',
  [PHASE.JUDGMENT]: 'fa-scale-balanced',
  [PHASE.LAST_WORDS]: 'fa-scroll',
  [PHASE.EXECUTION]: 'fa-skull-crossbones',
  [PHASE.EXECUTION_REVEAL]: 'fa-eye',
  [PHASE.NO_LYNCH]: 'fa-ban',
  [PHASE.SPARED]: 'fa-dove',
};

const DAY_PHASES = [PHASE.DEATH_REPORT, PHASE.DISCUSSION, PHASE.VOTING, PHASE.DEFENSE, PHASE.JUDGMENT, PHASE.LAST_WORDS, PHASE.EXECUTION, PHASE.EXECUTION_REVEAL, PHASE.NO_LYNCH, PHASE.SPARED];
const INFO_PHASES = [PHASE.DEATH_REPORT, PHASE.LAST_WORDS, PHASE.EXECUTION, PHASE.EXECUTION_REVEAL, PHASE.NO_LYNCH, PHASE.SPARED, PHASE.NIGHT_TRANSITION];

// Exported constants
const CONSTANTS = {
  PHASE,
  STATUS,
  DURATIONS,
  PHASE_LABELS,
  PHASE_ICONS,
  DAY_PHASES,
  INFO_PHASES,
  // Legacy compat for components not yet updated
  DURATION_DAY: DURATIONS.DISCUSSION,
  DURATION_NIGHT: DURATIONS.NIGHT,
  GAME_STARTED: STATUS.STARTED,
  GAME_SETUP: STATUS.SETUP,
  GAME_ROLE_SELECTION: STATUS.ROLE_SELECTION,
  GAME_ENDED: STATUS.ENDED,
};

const avatars = [
  'https://images.vexels.com/media/users/3/145908/raw/52eabf633ca6414e60a7677b0b917d92-male-avatar-maker.jpg',
  'https://www.clipartkey.com/mpngs/m/118-1188761_avatar-cartoon-profile-picture-png.png',
  'https://i.pinimg.com/736x/df/5f/5b/df5f5b1b174a2b4b6026cc6c8f9395c1.jpg',
  'https://cdn2.f-cdn.com/contestentries/1440473/30778261/5bdd02db9ff4c_thumb900.jpg',
];

const MAX_TRIALS_PER_DAY = 1;

// 15 distinct player colors — no duplicates possible
const PLAYER_COLORS = [
  '#e74c3c', // red
  '#3498db', // blue
  '#2ecc71', // green
  '#f39c12', // orange
  '#9b59b6', // purple
  '#1abc9c', // teal
  '#e91e63', // pink
  '#00bcd4', // cyan
  '#ff9800', // amber
  '#8bc34a', // lime
  '#ff5722', // deep orange
  '#607d8b', // blue grey
  '#cddc39', // yellow-green
  '#795548', // brown
  '#03a9f4', // light blue
];

// Get duration for a phase, using custom config if available
const getDuration = (game, phase) => {
  const configDurations = game.config?.durations;
  if (configDurations && configDurations[phase]) {
    return configDurations[phase] * 1000; // config is in seconds
  }
  return DURATIONS[phase] || 10000;
};

export const GameEngineProvider = ({ children }) => {
  const Events = useEvents();
  const [_game, _setGame] = useMultiplayerState('game', {
    status: STATUS.SETUP,
    phase: PHASE.NIGHT,
    timer: DURATIONS.NIGHT,
    phaseStartedAt: null,
    isGameStarted: false,
    isGameSetup: true,
    isDay: false,
    dayCount: 0,
    trialsToday: 0,
    accusedId: null,
    winner: null,
  });
  const game = _game || {};
  // Wrap setGame: PlayroomKit setter doesn't support callbacks
  const setGame = (valueOrFn) => {
    if (typeof valueOrFn === 'function') {
      _setGame(valueOrFn(_game || {}));
    } else {
      _setGame(valueOrFn);
    }
  };
  const [_players, _setPlayers] = useMultiplayerState('players', []);
  const players = _players || [];
  // Wrap setPlayers so callback form always gets a safe array
  // NOTE: PlayroomKit's setter does NOT support React-style callbacks,
  // so we must evaluate the callback ourselves before passing the result.
  const setPlayers = (valueOrFn) => {
    if (typeof valueOrFn === 'function') {
      const current = _players || [];
      _setPlayers(valueOrFn(current));
    } else {
      _setPlayers(valueOrFn);
    }
  };
  const [_rolesAvailable] = useMultiplayerState('rolesAvailable', getRoles());
  const rolesAvailable = _rolesAvailable || [];
  const [_rolesSelected, setRolesSelected] = useMultiplayerState('rolesSelected', []);
  const rolesSelected = _rolesSelected || [];
  const [_chatMessages, setChatMessages] = useMultiplayerState('chatMessages', []);
  const chatMessages = _chatMessages || [];
  const [_trial, setTrial] = useMultiplayerState('trial', {
    suspects: {},
    votes: {},
  });
  const trial = _trial || { suspects: {}, votes: {} };
  // Ref for latest trial value (avoids stale state in vote handlers)
  const trialRef = React.useRef(trial);
  trialRef.current = trial;
  const [_readyPlayers, setReadyPlayers] = useMultiplayerState('readyPlayers', []);
  const readyPlayers = _readyPlayers || [];

  const playroom_players = usePlayersList(true);

  const getMe = () => {
    try {
      const myId = me()?.id;
      return myId ? players.find((player) => player.id === myId) : null;
    } catch {
      return null;
    }
  };
  const getPlayers = () => players;

  const gameState = {
    game,
    rolesAvailable,
    rolesSelected,
    setRolesSelected,
    getMe,
    getPlayers,
    setPlayers,
    setGame,
    trial,
    trialRef,
    setTrial,
  };

  // Sync playroom players into shared game state (only before the game
  // has actually started — mid-game joiners go through the spectator
  // effect below). Host-authoritative: only one client runs this, which
  // eliminates the last-writer-wins race that used to let two clients
  // assign the same color to different players when writes landed out
  // of order. Additionally detects duplicate solid colors that may have
  // slipped through from the lobby and reassigns the higher-id player
  // to the next free slot so the in-game roster is always distinct.
  useEffect(() => {
    if (!isHost()) return;
    if (playroom_players.length === 0 || game.isGameStarted) return;
    setPlayers((prevPlayers) => {
      const connectedIds = new Set(playroom_players.map((p) => p.id));
      const existingById = new Map(prevPlayers.map((p) => [p.id, p]));

      // Iterate in sorted-id order so the dedup pass is deterministic
      // (earlier id keeps, later id yields) across host re-runs.
      const sortedIds = [...connectedIds].sort((a, b) => (a < b ? -1 : 1));
      const usedSolids = new Set();
      const assigned = new Map(); // id → resolved color

      for (const id of sortedIds) {
        const fromExisting = existingById.get(id)?.profile?.color;
        const fromPlayroom = playroom_players.find((p) => p.id === id)
          ?.getState?.()?.profile?.color;
        const candidate = fromExisting ?? fromPlayroom;

        // Gradients are cosmetic and allowed to repeat (two cultists can
        // both rock the same palette). Skip the dedup pass for them.
        if (candidate && typeof candidate === 'object') {
          assigned.set(id, candidate);
          continue;
        }

        const isValidSolid =
          typeof candidate === 'string' && PLAYER_COLORS.includes(candidate);
        if (isValidSolid && !usedSolids.has(candidate)) {
          usedSolids.add(candidate);
          assigned.set(id, candidate);
        } else {
          // Invalid, missing, or duplicate → pick first free slot.
          const free = PLAYER_COLORS.find((c) => !usedSolids.has(c)) || '#888';
          usedSolids.add(free);
          assigned.set(id, free);
        }
      }

      return playroom_players.map((playroom_player) => {
        const existing = existingById.get(playroom_player.id);
        const color = assigned.get(playroom_player.id);
        if (existing) {
          // No color change → keep the reference so React bails on the
          // row. Color drift (dedup kicked in) → patched profile only.
          if (existing.profile?.color === color) return existing;
          return { ...existing, profile: { ...existing.profile, color } };
        }
        return {
          id: playroom_player.id,
          profile: {
            ...playroom_player.getState().profile,
            name: playroom_player.getState().profile.name || 'Unnamed Player',
            color,
          },
        };
      });
    });
  }, [playroom_players]);

  // Mid-game joiners: add them as spectators (isSpectator=true, isAlive=false).
  // Host-authoritative so we don't race: only the host writes new spectators.
  useEffect(() => {
    if (!isHost() || !game.isGameStarted) return;
    const knownIds = new Set(players.map((p) => p.id));
    const newcomers = playroom_players.filter((pp) => !knownIds.has(pp.id));
    if (newcomers.length === 0) return;
    const usedColors = new Set(players.map((p) => p.profile?.color).filter(Boolean));
    const additions = newcomers.map((pp) => {
      const color = PLAYER_COLORS.find((c) => !usedColors.has(c)) || '#888';
      usedColors.add(color);
      return {
        id: pp.id,
        profile: {
          ...pp.getState().profile,
          name: pp.getState().profile.name || 'Spectator',
          color,
        },
        character: null,
        connected: true,
        isAlive: false,
        isSpectator: true,
      };
    });
    setPlayers([...players, ...additions]);
  }, [playroom_players.length, game.isGameStarted]);

  const moveToRoleSelection = () => {
    setGame({
      ...game,
      status: STATUS.ROLE_SELECTION,
      isGameSetup: false,
      isGameStarted: false,
    });
  };

  const updatePlayerName = (playerId, newName) => {
    setPlayers((prevPlayers) =>
      prevPlayers.map((player) =>
        player.id === playerId
          ? { ...player, profile: { ...player.profile, name: newName } }
          : player
      )
    );
  };

  const markReady = (playerId) => {
    if (!readyPlayers.includes(playerId)) {
      setReadyPlayers([...readyPlayers, playerId]);
    }
  };

  const startGame = () => {
    const shuffledRoles = [...rolesSelected].sort(() => Math.random() - 0.5);
    const newPlayers = playroom_players
      .sort((a, b) => a.myId.localeCompare(b.myId))
      .map((player, index) => {
        // Preserve the unique color assigned in the lobby
        const existingPlayer = players.find((p) => p.id === player.id);
        return {
          id: player.id,
          profile: {
            ...player.getState().profile,
            color: existingPlayer?.profile?.color || PLAYER_COLORS[index] || '#888',
            avatar: avatars[index % avatars.length],
          },
          character: shuffledRoles[index],
          connected: true,
          isAlive: true,
        };
      });

    // Assign Executioner targets (unique random town member per Executioner)
    const townPlayers = newPlayers.filter((p) => p.character?.team === 'town');
    const usedTargets = new Set();
    newPlayers.forEach((p) => {
      if (p.character?.winCondition === 'getTargetLynched' && townPlayers.length > 0) {
        const available = townPlayers.filter((t) => !usedTargets.has(t.id));
        if (available.length > 0) {
          const target = available[Math.floor(Math.random() * available.length)];
          p.executionerTarget = target.id;
          usedTargets.add(target.id);
        } else {
          // Not enough town players — fallback to random
          const target = townPlayers[Math.floor(Math.random() * townPlayers.length)];
          p.executionerTarget = target.id;
        }
      }
    });

    setPlayers(newPlayers);
    setReadyPlayers([]);

    // Game starts at Day 1 (Discussion) — players have no info yet, can /skip to night
    // First day discussion is shorter (15s) since there's no info to discuss
    setGame({
      ...game,
      status: STATUS.STARTED,
      phase: PHASE.DISCUSSION,
      timer: 15000,
      phaseStartedAt: Date.now(),
      gameStartedAt: Date.now(),
      isGameStarted: true,
      isGameSetup: false,
      isDay: true,
      dayCount: 1,
      trialsToday: 0,
      accusedId: null,
      winner: null,
      skipVotes: [],
      waitingForPlayers: true,
    });

    // Day 1 opening messages
    setChatMessages([
      {
        player: 'system',
        color: '#78ff78',
        content: i18n.t('game:system.game_start'),
        type: 'system',
        dayCount: 1,
        chat: 'default',
      },
      {
        player: 'system',
        color: 'white',
        content: i18n.t('game:system.day_separator', { day: 1 }),
        type: 'system',
        dayCount: 1,
        chat: 'default',
      },
    ]);
  };

  // --- Disconnect handling with grace period ---
  const DISCONNECT_GRACE_MS = 30000; // 30s to reconnect

  // Continuous disconnect monitoring (runs every game tick via useEffect below)
  const handleDisconnectPlayers = () => {
    if (!game.isGameStarted || game.status === STATUS.ENDED) return;
    const { updated, newMessages, killedNotifs, changed } = resolveDisconnects({
      players,
      connectedIds: new Set(playroom_players.map((p) => p.id)),
      now: Date.now(),
      dayCount: game.dayCount,
      graceMs: DISCONNECT_GRACE_MS,
    });
    killedNotifs.forEach((n) => Events.add(n));
    if (newMessages.length > 0) setChatMessages([...(chatMessages || []), ...newMessages]);
    if (changed) setPlayers(updated);
  };

  // --- AFK detection ---
  // 6 min before marking AFK — long enough that players silently
  // following a phase (no chat, no clicks) don't get flagged. Pointer /
  // key activity also resets this globally (see GameEngineProvider effect
  // below), so any interaction on the page counts.
  const AFK_TIMEOUT_MS = 360000;
  const AFK_WRITE_THROTTLE_MS = 15000; // don't spam network

  const updateActivity = (playerId) => {
    if (!playerId) return;
    const now = Date.now();
    const target = players.find((p) => p.id === playerId);
    if (!target) return;
    // Throttle: skip if we already wrote recently AND player is not AFK
    if (!target.isAFK && target.lastActivityAt && now - target.lastActivityAt < AFK_WRITE_THROTTLE_MS) {
      return;
    }
    const wasAFK = !!target.isAFK;
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === playerId ? { ...p, lastActivityAt: now, isAFK: false } : p
      )
    );
    if (wasAFK) {
      setChatMessages([
        ...(chatMessages || []),
        {
          player: 'system',
          color: '#78ff78',
          content: i18n.t('game:system.player_back', { name: target.profile?.name || '?' }),
          type: 'system',
          dayCount: game.dayCount,
          chat: 'default',
        },
      ]);
    }
  };

  const handleAFKPlayers = () => {
    if (!game.isGameStarted || game.status === STATUS.ENDED) return;
    const { updated, newMessages, changed } = resolveAFK({
      players,
      now: Date.now(),
      dayCount: game.dayCount,
      timeoutMs: AFK_TIMEOUT_MS,
    });
    if (newMessages.length > 0) setChatMessages([...(chatMessages || []), ...newMessages]);
    if (changed) setPlayers(updated);
  };

  // --- Chat helper ---
  const addChatSystem = (content, color = 'white', dayOverride = null) => {
    setChatMessages([
      ...chatMessages,
      {
        player: 'system',
        color,
        content,
        type: 'system',
        dayCount: dayOverride || game.dayCount,
        chat: 'default',
      },
    ]);
  };

  // --- Trial / Voting ---
  const resetTrial = () => setTrial({ suspects: {}, votes: {} });

  const checkWinCondition = () => pureCheckWinCondition(players);

  const endGame = (winner) => {
    // Survivors who are alive also win
    const survivorWinners = players
      .filter((p) => p.isAlive && p.character?.winCondition === 'survive')
      .map((p) => ({ id: p.id, role: 'Survivor' }));

    setGame({
      ...game,
      status: STATUS.ENDED,
      isGameStarted: false,
      winner,
      neutralWinners: [...(game.neutralWinners || []), ...survivorWinners],
    });
  };

  // Sanitized trial — strips invalid votes (dead voters, dead targets,
  // self-votes, accused-voting-themselves, invalid verdicts). Any host
  // decision reads through this, so a malicious client can't sway the vote
  // by writing garbage to the shared state.
  const sanitizedTrial = () => pureSanitizeTrial(players, trial, game.accusedId);
  // Majority = strict >50% (like Town of Salem): Math.floor(n/2) + 1
  const checkVotingMajority = () => pureCheckVotingMajority(players, sanitizedTrial());
  // Judgment: guilty by default — need >= 50% of voters to save (innocent)
  const resolveJudgment = () => pureResolveJudgment(players, sanitizedTrial(), game.accusedId);

  // Kill accused player and check for neutral wins
  const executeAccused = () => {
    const accusedId = game.accusedId;
    if (!accusedId) return;
    const accused = players.find((p) => p.id === accusedId);
    if (accused && accused.isAlive) {
      setPlayers(
        players.map((p) =>
          p.id === accusedId ? { ...p, isAlive: false } : p
        )
      );
      let elimMsg;
      if (accused.lastWill) {
        elimMsg = i18n.t('game:system.player_eliminated_will', { name: accused.profile.name, role: accused.character?.label, will: accused.lastWill });
      } else {
        elimMsg = i18n.t('game:system.player_eliminated', { name: accused.profile.name, role: accused.character?.label });
      }

      // Write to chat immediately (not deferred to morning)
      addChatSystem(elimMsg, '#ff4444');

      Events.add({
        type: 'ELIMINATION',
        content: {
          target: accusedId,
          chatMessage: elimMsg,
        },
        displayed: true, // already displayed in chat
      });

      // Jester wins if they get lynched
      if (accused.character?.winCondition === 'getLynched') {
        setGame((prev) => ({
          ...prev,
          neutralWinners: [...(prev.neutralWinners || []), { id: accused.id, role: 'Jester' }],
        }));
      }

      // Executioner wins if their target gets lynched
      players.forEach((p) => {
        if (p.executionerTarget === accusedId && p.isAlive && p.character?.winCondition === 'getTargetLynched') {
          setGame((prev) => ({
            ...prev,
            neutralWinners: [...(prev.neutralWinners || []), { id: p.id, role: 'Executioner' }],
          }));
        }
      });
    }
  };

  // --- Reset for new game (same lobby, no page reload) ---
  const [, setEvents] = useMultiplayerState('events', []);
  const [, setNotifications] = useMultiplayerState('notifications', []);
  const resetForNewGame = () => {
    setChatMessages([]);
    resetTrial();
    setReadyPlayers([]);
    setEvents([]);
    setNotifications([]);
    // Re-sync connected players (stripped of game data)
    const connectedPlayers = playroom_players.map((pp) => {
      const existing = players.find((p) => p.id === pp.id);
      return {
        id: pp.id,
        profile: existing?.profile || {
          ...pp.getState().profile,
          name: pp.getState().profile?.name || 'Unnamed Player',
        },
      };
    });
    _setPlayers(connectedPlayers);
    setRolesSelected([]);
    setGame({
      status: STATUS.ROLE_SELECTION,
      phase: PHASE.NIGHT,
      timer: DURATIONS.NIGHT,
      isGameStarted: false,
      isGameSetup: false,
      isDay: false,
      dayCount: 0,
      trialsToday: 0,
      accusedId: null,
      winner: null,
      skipVotes: [],
      neutralWinners: [],
      waitingForPlayers: false,
      adminFreeRoam: false,
    });
  };

  // --- Skip day vote ---
  const voteSkip = (playerId) => {
    const currentSkips = game.skipVotes || [];
    if (currentSkips.includes(playerId)) return { success: false };
    const newSkips = [...currentSkips, playerId];
    const aliveCount = players.filter((p) => p.isAlive).length;
    setGame({ ...game, skipVotes: newSkips });
    return { success: true, count: newSkips.length, total: aliveCount };
  };

  // --- Helper to get phase timer ---
  const dur = (phase) => getDuration(game, phase);

  // --- Phase transitions ---
  // The transition table lives in phaseTransitions.js as a pure function
  // so the rules can be tested exhaustively. This wrapper resolves the
  // pre-transition checks (win, majority, judgment) and applies the
  // side-effect list returned by the pure function.
  const transitionPhase = () => {
    const winner = checkWinCondition();
    if (winner) { endGame(winner); return; }

    const currentPhase = game.phase;

    // Build a DURATIONS object that respects host config overrides, so the
    // pure function doesn't need to know about game.config.
    const resolvedDurations = Object.keys(DURATIONS).reduce((acc, k) => {
      acc[k] = getDuration(game, k);
      return acc;
    }, {});

    const context = {
      game,
      trial,
      accusedIfMajority: currentPhase === PHASE.VOTING ? checkVotingMajority() : null,
      judgmentResult: currentPhase === PHASE.JUDGMENT ? resolveJudgment() : null,
      PHASE,
      DURATIONS: resolvedDurations,
      MAX_TRIALS_PER_DAY,
      t: i18n.t.bind(i18n),
    };

    const { gameDelta, sideEffects } = computeNextPhase(currentPhase, context);

    // Apply side effects in order. Kinds are documented in phaseTransitions.js.
    for (const effect of sideEffects) {
      switch (effect.kind) {
        case 'resetTrial':
          resetTrial();
          break;
        case 'clearVotesKeepSuspects':
          setTrial({ ...trial, votes: {} });
          break;
        case 'addEvent':
          Events.add(effect.event);
          break;
        case 'addChat':
          addChatSystem(effect.content, effect.color);
          break;
        case 'executeAccused':
          executeAccused();
          break;
        case 'endGameIfWinner': {
          const w = checkWinCondition();
          if (w) { endGame(w); return; }
          break;
        }
        default:
          break;
      }
    }

    // Clear the tally delay marker on every transition — it was set by the
    // main loop when timer hit 0 in VOTING/JUDGMENT, and a new phase resets
    // the buffer state for the next vote.
    setGame({ ...game, ...gameDelta, phaseStartedAt: Date.now(), tallyDelayedFor: null });
  };

  // --- Main game loop (host only) ---
  useEffect(() => {
    if (!isHost() || !game.isGameStarted) return;
    if (game.status === STATUS.ENDED) return;
    // Admin free-roam pauses the game
    if (game.adminFreeRoam) return;
    // Wait for all players to load assets before ticking
    if (game.waitingForPlayers) return;

    const tick = setTimeout(() => {
      // Re-check pause inside timeout (flag may have changed since setTimeout was set)
      if (game.adminFreeRoam) return;

      // During VOTING, check for majority each tick
      if (game.phase === PHASE.VOTING && game.timer > 0) {
        const accusedId = checkVotingMajority();
        if (accusedId && game.trialsToday < MAX_TRIALS_PER_DAY) {
          setGame(prev => ({
            ...prev,
            phase: PHASE.DEFENSE,
            timer: dur('DEFENSE'),
            phaseStartedAt: Date.now(),
            accusedId,
            trialsToday: prev.trialsToday + 1,
          }));
          return;
        }
      }

      if (game.timer <= 0) {
        // Replication buffer: on VOTING/JUDGMENT the first tick at timer=0
        // is a grace window so late votes from high-latency clients can
        // land before we tally. The next tick sees tallyDelayedFor === phase
        // and actually transitions. The host sanitizer runs in parallel,
        // so by the time we read the trial here, any newly-arrived valid
        // votes are included.
        const isTallyPhase = game.phase === PHASE.VOTING || game.phase === PHASE.JUDGMENT;
        if (isTallyPhase && game.tallyDelayedFor !== game.phase) {
          setGame(prev => ({ ...prev, tallyDelayedFor: prev.phase }));
          return;
        }
        transitionPhase();
      } else {
        setGame(prev => ({ ...prev, timer: prev.timer - 1000 }));
      }
    }, 1000);

    return () => clearTimeout(tick);
  }, [game.timer, game.phase, game.status, game.adminFreeRoam, game.waitingForPlayers, game.tallyDelayedFor, isHost(), trial]);

  // --- Continuous disconnect monitoring (host only, every 3s) ---
  useEffect(() => {
    if (!isHost() || !game.isGameStarted || game.status === STATUS.ENDED) return;
    const interval = setInterval(() => {
      handleDisconnectPlayers();
    }, 3000);
    return () => clearInterval(interval);
  }, [game.isGameStarted, game.status, playroom_players.length, players]);

  // --- AFK monitoring (host only, every 10s) ---
  useEffect(() => {
    if (!isHost() || !game.isGameStarted || game.status === STATUS.ENDED) return;
    const interval = setInterval(() => {
      handleAFKPlayers();
    }, 10000);
    return () => clearInterval(interval);
  }, [game.isGameStarted, game.status, players]);

  // --- Global activity listener (all clients) ---
  // Any pointer / key / focus event resets the local player's AFK timer.
  // Previously only votes and chat did, which flagged quiet-but-present
  // players after one phase. The write throttle upstream keeps the network
  // traffic minimal.
  useEffect(() => {
    if (!game.isGameStarted || game.status === STATUS.ENDED) return;
    const ping = () => {
      try {
        const myId = me()?.id;
        if (myId) updateActivity(myId);
      } catch { /* no-op */ }
    };
    window.addEventListener('pointerdown', ping);
    window.addEventListener('keydown', ping);
    window.addEventListener('focus', ping);
    return () => {
      window.removeEventListener('pointerdown', ping);
      window.removeEventListener('keydown', ping);
      window.removeEventListener('focus', ping);
    };
  }, [game.isGameStarted, game.status, players]);

  // --- Trial sanitization (host only) ---
  // Whenever a client writes a vote or a death invalidates a prior vote,
  // re-broadcast a cleaned trial. This is the authoritative anti-cheat:
  // clients can only see data the host has validated. Runs on trial OR
  // players change, but writes back only when the sanitized version
  // actually differs (avoids a write loop).
  useEffect(() => {
    if (!isHost() || !game.isGameStarted || game.status === STATUS.ENDED) return;
    const clean = pureSanitizeTrial(players, trial, game.accusedId);
    if (!trialsEqual(trial, clean)) {
      setTrial(clean);
    }
  }, [trial, players, game.accusedId, game.isGameStarted, game.status]);

  // --- Host watchdog: sanitize top-level game state (host only) ---
  // First line of defense against a client tampering with `game` from
  // the browser console (e.g. pushing an invalid phase, a fake winner,
  // or an accusedId that points to a ghost). See sanitizeGameState docs
  // in gameRules.js for what is / isn't caught.
  useEffect(() => {
    if (!isHost()) return;
    if (!_game) return;
    const clean = sanitizeGameState(_game, players);
    if (gameStateDirty(_game, clean)) {
      _setGame(clean);
    }
  }, [_game, players]);

  // --- Wait for all players to load assets (host only) ---
  useEffect(() => {
    if (!isHost() || !game.isGameStarted || !game.waitingForPlayers) return;

    const allReady = players.length > 0 && players.every(p => readyPlayers.includes(p.id));
    if (allReady) {
      setGame(prev => ({ ...prev, waitingForPlayers: false }));
      return;
    }

    // Timeout: start anyway after 15s
    const timeout = setTimeout(() => {
      setGame(prev => ({ ...prev, waitingForPlayers: false }));
    }, 15000);

    return () => clearTimeout(timeout);
  }, [readyPlayers.length, game.waitingForPlayers, game.isGameStarted]);

  // --- Skip day majority check (host only) ---
  const skipVoteCount = (game.skipVotes || []).length;
  useEffect(() => {
    if (!isHost() || !game.isGameStarted || game.status === STATUS.ENDED) return;
    if (!game.isDay || (game.phase !== PHASE.DISCUSSION && game.phase !== PHASE.VOTING)) return;
    if (skipVoteCount === 0) return;

    const aliveCount = players.filter((p) => p.isAlive).length;
    if (aliveCount === 0) return;
    const majority = Math.floor(aliveCount / 2) + 1;

    if (skipVoteCount >= majority) {
      // Skip vote — go through night transition
      resetTrial();
      setGame({
        ...game,
        phase: PHASE.NIGHT_TRANSITION,
        timer: getDuration(game, 'NIGHT_TRANSITION'),
        accusedId: null,
        skipVotes: [],
        phaseStartedAt: Date.now(),
      });
    }
  }, [skipVoteCount]);

  return (
    <GameEngineContext.Provider
      value={{
        ...gameState,
        startGame,
        moveToRoleSelection,
        resetForNewGame,
        CONSTANTS,
        updatePlayerName,
        checkWinCondition,
        voteSkip,
        addChatSystem,
        readyPlayers,
        markReady,
        updateActivity,
      }}
    >
      {children}
    </GameEngineContext.Provider>
  );
};

export const useGameEngine = () => {
  const context = React.useContext(GameEngineContext);
  if (context === undefined)
    throw new Error('useGameEngine must be used within a GameEngineProvider');
  return context;
};
