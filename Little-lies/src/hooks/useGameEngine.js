import React, { useEffect } from 'react';
import { isHost, useMultiplayerState, usePlayersList, me } from 'playroomkit';
import { useEvents } from './useEvents';
import trad from '../trad/roles.json';

const GameEngineContext = React.createContext();

// Phase durations (ms)
const DURATIONS = {
  NIGHT: 30000,
  DEATH_REPORT: 5000,
  DISCUSSION: 15000,
  VOTING: 30000,
  DEFENSE: 20000,
  JUDGMENT: 15000,
  LAST_WORDS: 5000,
  EXECUTION: 3000,
  NO_LYNCH: 6000,
  SPARED: 5000,
};

// All game phases in order
const PHASE = {
  NIGHT: 'NIGHT',
  DEATH_REPORT: 'DEATH_REPORT',
  DISCUSSION: 'DISCUSSION',
  VOTING: 'VOTING',
  DEFENSE: 'DEFENSE',
  JUDGMENT: 'JUDGMENT',
  LAST_WORDS: 'LAST_WORDS',
  EXECUTION: 'EXECUTION',
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
  [PHASE.DEATH_REPORT]: 'Annonce des morts',
  [PHASE.DISCUSSION]: 'Discussion',
  [PHASE.VOTING]: 'Vote',
  [PHASE.DEFENSE]: 'Défense',
  [PHASE.JUDGMENT]: 'Jugement',
  [PHASE.LAST_WORDS]: 'Derniers mots',
  [PHASE.EXECUTION]: 'Exécution',
  [PHASE.NO_LYNCH]: 'Pas de lynchage',
  [PHASE.SPARED]: 'Épargné',
};

const DAY_PHASES = [PHASE.DEATH_REPORT, PHASE.DISCUSSION, PHASE.VOTING, PHASE.DEFENSE, PHASE.JUDGMENT, PHASE.LAST_WORDS, PHASE.EXECUTION, PHASE.NO_LYNCH, PHASE.SPARED];

// Exported constants
const CONSTANTS = {
  PHASE,
  STATUS,
  DURATIONS,
  PHASE_LABELS,
  DAY_PHASES,
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
  const [_rolesAvailable] = useMultiplayerState('rolesAvailable', trad.roles);
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
    setTrial,
  };

  // Sync playroom players into game state (only before game starts)
  // Assigns a unique color from PLAYER_COLORS to each player
  useEffect(() => {
    if (playroom_players.length > 0 && !game.isGameStarted) {
      setPlayers((prevPlayers) => {
        const usedColors = new Set();
        // First pass: collect colors already assigned to existing players that are still connected
        const connectedIds = new Set(playroom_players.map((p) => p.id));
        prevPlayers.forEach((p) => {
          if (connectedIds.has(p.id) && p.profile?.color) {
            usedColors.add(p.profile.color);
          }
        });

        return playroom_players.map((playroom_player) => {
          const existingPlayer = prevPlayers.find((p) => p.id === playroom_player.id);
          if (existingPlayer) return existingPlayer;

          // Assign next available color
          const color = PLAYER_COLORS.find((c) => !usedColors.has(c)) || '#888';
          usedColors.add(color);
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
    }
  }, [playroom_players]);

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

    // Game starts at Day 1 (Discussion) — players have no info yet, can /skip to night
    setGame({
      ...game,
      status: STATUS.STARTED,
      phase: PHASE.DISCUSSION,
      timer: getDuration(game, 'DISCUSSION'),
      isGameStarted: true,
      isGameSetup: false,
      isDay: true,
      dayCount: 1,
      trialsToday: 0,
      accusedId: null,
      winner: null,
      skipVotes: [],
    });

    // Day 1 opening messages
    setChatMessages([
      {
        player: 'system',
        color: 'white',
        content: '--- Jour 1 ---',
        type: 'system',
        dayCount: 1,
        chat: 'default',
      },
    ]);
  };

  // --- Disconnect handling ---
  const handleDisconnectPlayers = () => {
    const connectedIds = new Set(playroom_players.map((p) => p.id));
    const disconnectEvents = [];
    const updated = players.map((player) => {
      if (!connectedIds.has(player.id) && player.connected && player.isAlive) {
        disconnectEvents.push({
          type: 'disconnect',
          content: { chatMessage: `${player.profile.name} est mort de façon inconnue` },
          displayed: false,
        });
        return { ...player, connected: false, isAlive: false };
      }
      return player;
    });
    // Batch all disconnect events in a single state update
    if (disconnectEvents.length > 0) {
      Events.addBatch(disconnectEvents);
    }
    if (updated.some((p, i) => p !== players[i])) {
      setPlayers(updated);
    }
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

  const checkWinCondition = () => {
    const alive = players.filter((p) => p.isAlive);
    // Don't check win conditions if no players have characters assigned yet
    if (alive.length === 0 || !alive.some((p) => p.character)) return null;

    const townAlive = alive.filter((p) => p.character?.team === 'town').length;
    const mafiaAlive = alive.filter((p) => p.character?.team === 'mafia').length;
    const evilAlive = alive.filter((p) => p.character?.team === 'evil').length;
    const neutralKillingAlive = alive.filter(
      (p) => p.character?.winCondition === 'lastStanding'
    ).length;

    // SK wins: only neutral killers alive (or alone)
    if (neutralKillingAlive > 0 && townAlive === 0 && mafiaAlive === 0 && evilAlive === 0) {
      return 'neutral_killing';
    }

    // Town wins: no mafia, no evil, no neutral killers
    if (mafiaAlive === 0 && evilAlive === 0 && neutralKillingAlive === 0 && townAlive > 0) return 'town';

    // Mafia wins: majority over non-mafia (excluding neutral killers who are still threats)
    if (mafiaAlive >= townAlive + evilAlive + neutralKillingAlive && mafiaAlive > 0) return 'mafia';

    // Evil wins
    if (evilAlive >= townAlive + mafiaAlive + neutralKillingAlive && evilAlive > 0) return 'evil';

    return null;
  };

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

  // Check majority vote during VOTING phase
  // Majority = strict >50% (like Town of Salem): Math.floor(n/2) + 1
  // 4 players → need 3, 5 players → need 3, 6 players → need 4
  const checkVotingMajority = () => {
    if (!trial.suspects || Object.keys(trial.suspects).length === 0) return null;

    const totalPossibleVotes = players.filter((p) => p.isAlive).length;
    const majority = Math.floor(totalPossibleVotes / 2) + 1;

    let topSuspect = null;
    let topVotes = 0;

    Object.keys(trial.suspects).forEach((suspectedId) => {
      const votes = trial.suspects[suspectedId]?.suspectedBy?.length || 0;
      if (votes > topVotes) {
        topVotes = votes;
        topSuspect = suspectedId;
      }
    });

    if (topVotes >= majority) return topSuspect;
    return null;
  };

  // Resolve judgment votes (guilty vs innocent)
  const resolveJudgment = () => {
    const votes = trial.votes || {};
    let guiltyCount = 0;
    let innocentCount = 0;

    Object.values(votes).forEach((vote) => {
      if (vote === 'guilty') guiltyCount++;
      if (vote === 'innocent') innocentCount++;
    });

    return { guiltyCount, innocentCount, isGuilty: guiltyCount > innocentCount };
  };

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
      let elimMsg = `${accused.profile.name} a été éliminé par le village. Son rôle était : ${accused.character?.label}.`;
      if (accused.lastWill) {
        elimMsg += ` | Testament : "${accused.lastWill}"`;
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
  const transitionPhase = () => {
    const winner = checkWinCondition();
    if (winner) { endGame(winner); return; }

    const currentPhase = game.phase;
    let nextGame = { ...game };

    switch (currentPhase) {
      case PHASE.NIGHT:
        handleDisconnectPlayers();
        nextGame = { ...nextGame, phase: PHASE.DEATH_REPORT, timer: dur('DEATH_REPORT'), isDay: true, dayCount: game.dayCount + 1, trialsToday: 0, accusedId: null, skipVotes: [] };
        break;

      case PHASE.DEATH_REPORT:
        nextGame = { ...nextGame, phase: PHASE.DISCUSSION, timer: dur('DISCUSSION') };
        break;

      case PHASE.DISCUSSION:
        resetTrial();
        nextGame = { ...nextGame, phase: PHASE.VOTING, timer: dur('VOTING'), skipVotes: [] };
        break;

      case PHASE.VOTING: {
        const accusedId = checkVotingMajority();
        if (accusedId && game.trialsToday < MAX_TRIALS_PER_DAY) {
          nextGame = { ...nextGame, phase: PHASE.DEFENSE, timer: dur('DEFENSE'), accusedId, trialsToday: game.trialsToday + 1 };
        } else {
          // No majority → show NO_LYNCH announcement then go to night
          Events.add({ type: 'NO_LYNCH', content: { chatMessage: '' }, displayed: true });
          resetTrial();
          nextGame = { ...nextGame, phase: PHASE.NO_LYNCH, timer: dur('NO_LYNCH'), accusedId: null };
        }
        break;
      }

      case PHASE.NO_LYNCH:
        // After announcement, go to night
        // Night message removed from chat
        nextGame = { ...nextGame, phase: PHASE.NIGHT, timer: dur('NIGHT'), isDay: false, accusedId: null };
        break;

      case PHASE.DEFENSE:
        setTrial({ ...trial, votes: {} });
        nextGame = { ...nextGame, phase: PHASE.JUDGMENT, timer: dur('JUDGMENT') };
        break;

      case PHASE.JUDGMENT: {
        const { guiltyCount, innocentCount } = resolveJudgment();
        // Default: if no votes at all, player is acquitted (like SC2)
        const totalVotes = guiltyCount + innocentCount;
        const isGuilty = totalVotes === 0 ? false : guiltyCount > innocentCount;
        const resultMsg = isGuilty
          ? `Coupable ! (${guiltyCount} vs ${innocentCount})`
          : `Acquitté ! (${guiltyCount} vs ${innocentCount})`;
        addChatSystem(resultMsg, isGuilty ? '#ff4444' : '#78ff78');
        Events.add({ type: 'JUDGMENT_RESULT', content: { chatMessage: resultMsg }, displayed: true });

        if (isGuilty) {
          nextGame = { ...nextGame, phase: PHASE.LAST_WORDS, timer: dur('LAST_WORDS') };
        } else {
          // Spared → show announcement then go to night
          nextGame = { ...nextGame, phase: PHASE.SPARED, timer: dur('SPARED') };
        }
        break;
      }

      case PHASE.SPARED: {
        // After spared announcement, go to night
        // Night message removed from chat
        resetTrial();
        nextGame = { ...nextGame, phase: PHASE.NIGHT, timer: dur('NIGHT'), isDay: false, accusedId: null };
        break;
      }

      case PHASE.LAST_WORDS:
        nextGame = { ...nextGame, phase: PHASE.EXECUTION, timer: dur('EXECUTION') };
        break;

      case PHASE.EXECUTION:
        executeAccused();
        const winnerAfterExec = checkWinCondition();
        if (winnerAfterExec) { endGame(winnerAfterExec); return; }
        // After execution, go to night
        // Night message removed from chat
        resetTrial();
        nextGame = { ...nextGame, phase: PHASE.NIGHT, timer: dur('NIGHT'), isDay: false, accusedId: null };
        break;

      default: break;
    }

    setGame(nextGame);
  };

  // --- Main game loop (host only) ---
  useEffect(() => {
    if (!isHost() || !game.isGameStarted) return;
    if (game.status === STATUS.ENDED) return;
    // Admin free-roam pauses the game
    if (game.adminFreeRoam) return;

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
            accusedId,
            trialsToday: prev.trialsToday + 1,
          }));
          return;
        }
      }

      if (game.timer <= 0) {
        transitionPhase();
      } else {
        setGame(prev => ({ ...prev, timer: prev.timer - 1000 }));
      }
    }, 1000);

    return () => clearTimeout(tick);
  }, [game.timer, game.phase, game.status, game.adminFreeRoam, isHost(), trial]);

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
      // Skip vote message removed from chat
      resetTrial();
      setGame({
        ...game,
        phase: PHASE.NIGHT,
        timer: getDuration(game, 'NIGHT'),
        isDay: false,
        accusedId: null,
        skipVotes: [],
      });
    }
  }, [skipVoteCount]);

  return (
    <GameEngineContext.Provider
      value={{
        ...gameState,
        startGame,
        moveToRoleSelection,
        CONSTANTS,
        updatePlayerName,
        checkWinCondition,
        voteSkip,
        addChatSystem,
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
