import React, { useEffect, useRef } from 'react';
import { isHost, useMultiplayerState, me } from 'playroomkit';

const EventsContext = React.createContext();

/*
  Night action resolution order:
  Priority 1: Self-defense (Vest)
  Priority 2: Protections (Doctor heal)
  Priority 3: Manipulation (Frame, Blackmail)
  Priority 4: Kills (Mafia, Vigilante, SK) - resolved with attack/defense
  Priority 5: (reserved for roleblock/redirect - future)
  Priority 6: Investigation (Sheriff, Consigliere)
  Priority 7: Observation (Lookout)

  Attack vs Defense:
  - Attack succeeds only if attackLevel > defenseLevel
  - None (0) < Basic (1) < Powerful (2) < Unstoppable (3)
  - Doctor heal grants +1 defense (Basic)
  - Vest grants +1 defense (Basic)
*/

export const EventsProvider = ({ children }) => {
  const [game] = useMultiplayerState('game');

  const [_events, setEvents] = useMultiplayerState('events', []);
  const events = _events || [];
  const [_messages, setMessages] = useMultiplayerState('chatMessages');
  const messages = _messages || [];
  const [_players, setPlayers] = useMultiplayerState('players');
  const players = _players || [];
  const [_notifications, setNotifications] = useMultiplayerState('notifications', []);
  const notifications = _notifications || [];
  const morningProcessedRef = useRef(0);

  const add = (event) => {
    const eventProperties = ['type', 'content', 'displayed'];
    if (eventProperties.every((property) => event.hasOwnProperty(property)))
      return setEvents([
        ...events,
        { dayCount: game.dayCount, createdAt: Date.now(), ...event },
      ]);
    else throw new Error('Event must have a type and content properties');
  };

  const get = () => events;

  const hasDoneThisActionTonight = (actionType) =>
    get()
      .filter((event) => event.dayCount === game.dayCount)
      .some((event) => event.content.by === me().id && event.type === actionType);

  // Replace a night action (remove old event of same type by same player, add new one)
  const replaceAction = (newEvent) => {
    const myId = me().id;
    const filtered = events.filter(
      (e) => !(e.dayCount === game.dayCount && e.content?.by === myId && e.type === newEvent.type)
    );
    setEvents([
      ...filtered,
      { dayCount: game.dayCount, createdAt: Date.now(), ...newEvent },
    ]);
  };

  // Get my current target for a given action type tonight
  const getMyActionTarget = (actionType) => {
    const event = events.find(
      (e) => e.dayCount === game.dayCount && e.content?.by === me()?.id && e.type === actionType
    );
    return event?.content?.target || null;
  };

  const getMyNotifications = () =>
    notifications.filter(
      (n) => n.playerId === me().id && n.dayCount === game.dayCount
    );

  const addNotification = (playerId, message) => {
    setNotifications([
      ...(notifications || []),
      { playerId, message, dayCount: game.dayCount, read: false },
    ]);
  };

  const eventsState = { add, get, hasDoneThisActionTonight, replaceAction, getMyActionTarget, getMyNotifications, addNotification };

  const killPlayer = (playerIdToKill) =>
    setPlayers(
      players.map((player) =>
        player.id === playerIdToKill ? { ...player, isAlive: false } : player
      )
    );

  const resolveNightActions = () => {
    // Night events were created with dayCount = N, but dayCount is now N+1
    // (incremented during NIGHT→DEATH_REPORT transition). Filter by N-1.
    const nightDayCount = game.dayCount - 1;
    const currentEvents = get().filter(
      (event) => event.dayCount === nightDayCount && !event.displayed
    );

    // --- Batch notifications AND events to avoid stale state overwrites ---
    const pendingNotifs = [...(notifications || [])];
    const addNotif = (playerId, message) => {
      pendingNotifs.push({ playerId, message, dayCount: game.dayCount, read: false });
    };
    const pendingEvents = [...(events || [])];
    const addEvent = (event) => {
      pendingEvents.push({ dayCount: game.dayCount, createdAt: Date.now(), ...event });
    };

    // Data structures for resolution
    const defenseBonus = {};   // playerId -> extra defense from doctor/vest
    const framedPlayers = {};  // playerId -> true
    const blackmailedPlayers = {};
    const roleblockedPlayers = {}; // playerId -> true
    const bodyguardTargets = {}; // targetId -> bodyguardId
    const jailedPlayers = {};  // playerId -> jailorId
    const killAttempts = [];   // { targetId, attackerId, attackLevel, type }
    const visitorsMap = {};    // targetId -> [visitorId]
    const vigilanteKills = {}; // targetId -> vigilanteId

    // === Priority 0: Jail (blocks target's actions) ===
    currentEvents
      .filter((e) => e.type === 'JAIL')
      .forEach((e) => {
        jailedPlayers[e.content.target] = e.content.by;
        roleblockedPlayers[e.content.target] = true;
        addNotif(e.content.target, 'Vous avez été emprisonné par le Jailor !');
      });

    // === Priority 0.5: Roleblock (Escort) ===
    currentEvents
      .filter((e) => e.type === 'ROLEBLOCK')
      .forEach((e) => {
        // If escort visits a Serial Killer, SK kills the escort
        const target = players.find((p) => p.id === e.content.target);
        if (target?.character?.key === 'serial_killer') {
          killAttempts.push({
            targetId: e.content.by,
            attackerId: e.content.target,
            attackLevel: target.character.attackLevel || 1,
            type: 'sk_retaliation',
          });
        } else {
          roleblockedPlayers[e.content.target] = true;
          addNotif(e.content.target, 'Quelqu\'un vous a empêché d\'agir cette nuit.');
        }
        trackVisitor(visitorsMap, e.content.target, e.content.by);
      });

    // Filter out roleblocked actions for kill resolution
    const activeEvents = currentEvents.filter(
      (e) => !roleblockedPlayers[e.content?.by] || e.type === 'ROLEBLOCK' || e.type === 'JAIL'
    );

    // Mafia kill dedup: only one mafia kill goes through
    const mafiaKillEvents = activeEvents.filter(
      (e) => e.type === 'KILL' && players.find((p) => p.id === e.content.by)?.character?.team === 'mafia'
    );
    const mafiaKillTarget = mafiaKillEvents.length > 0
      ? mafiaKillEvents[mafiaKillEvents.length - 1] // Last mafia kill order wins (Godfather overrides)
      : null;

    // === Priority 1: Self-defense (Vest) ===
    currentEvents
      .filter((e) => e.type === 'VEST')
      .forEach((e) => {
        defenseBonus[e.content.by] = (defenseBonus[e.content.by] || 0) + 1;
      });

    // === Priority 2: Protections (Doctor) ===
    currentEvents
      .filter((e) => e.type === 'PROTECT')
      .forEach((e) => {
        const target = players.find((p) => p.id === e.content.target);
        // Mayor who revealed can't be healed
        if (target?.canBeHealed === false) {
          addNotif(e.content.by, `Vous n'avez pas pu soigner ${target.profile.name}.`);
        } else {
          defenseBonus[e.content.target] = (defenseBonus[e.content.target] || 0) + 1;
        }
        trackVisitor(visitorsMap, e.content.target, e.content.by);
      });

    // === Priority 2b: Bodyguard ===
    currentEvents
      .filter((e) => e.type === 'BODYGUARD' && !roleblockedPlayers[e.content.by])
      .forEach((e) => {
        bodyguardTargets[e.content.target] = e.content.by;
        trackVisitor(visitorsMap, e.content.target, e.content.by);
      });

    // === Priority 3: Manipulation (Frame, Blackmail) ===
    currentEvents
      .filter((e) => e.type === 'FRAME')
      .forEach((e) => {
        framedPlayers[e.content.target] = true;
        trackVisitor(visitorsMap, e.content.target, e.content.by);
      });

    currentEvents
      .filter((e) => e.type === 'BLACKMAIL')
      .forEach((e) => {
        blackmailedPlayers[e.content.target] = true;
        trackVisitor(visitorsMap, e.content.target, e.content.by);
      });

    // === Priority 4: Kills ===
    // Mafia kill (deduplicated - one kill per mafia team)
    if (mafiaKillTarget) {
      const attacker = players.find((p) => p.id === mafiaKillTarget.content.by);
      killAttempts.push({
        targetId: mafiaKillTarget.content.target,
        attackerId: mafiaKillTarget.content.by,
        attackLevel: attacker?.character?.attackLevel || 1,
        type: 'mafia',
      });
      trackVisitor(visitorsMap, mafiaKillTarget.content.target, mafiaKillTarget.content.by);
    }

    // Non-mafia kills (Vigilante, SK, etc.)
    activeEvents
      .filter((e) => {
        if (e.type === 'VIGILANTE_KILL') return true;
        if (e.type === 'KILL') {
          const killer = players.find((p) => p.id === e.content.by);
          return killer?.character?.team !== 'mafia';
        }
        return false;
      })
      .forEach((e) => {
        const attacker = players.find((p) => p.id === e.content.by);
        killAttempts.push({
          targetId: e.content.target,
          attackerId: e.content.by,
          attackLevel: attacker?.character?.attackLevel || 1,
          type: e.type === 'VIGILANTE_KILL' ? 'vigilante' : 'neutral',
        });
        trackVisitor(visitorsMap, e.content.target, e.content.by);
        if (e.type === 'VIGILANTE_KILL') {
          vigilanteKills[e.content.target] = e.content.by;
        }
      });

    // Track investigation visitors
    activeEvents
      .filter((e) => e.type === 'INVESTIGATE' || e.type === 'INVESTIGATE_ROLE')
      .forEach((e) => {
        trackVisitor(visitorsMap, e.content.target, e.content.by);
      });

    // === Resolve kills against defenses ===
    const killed = {};
    const survived = {};

    killAttempts.forEach(({ targetId, attackerId, attackLevel, type }) => {
      const target = players.find((p) => p.id === targetId);
      if (!target?.isAlive) return;

      // Bodyguard intercept: if target is bodyguarded, bodyguard kills attacker and dies
      if (bodyguardTargets[targetId]) {
        const bgId = bodyguardTargets[targetId];
        const bg = players.find((p) => p.id === bgId);
        if (bg?.isAlive) {
          // Bodyguard dies
          killed[bgId] = { attackerId: attackerId, type: 'bodyguard_sacrifice' };
          // Attacker dies (bodyguard has powerful attack)
          killed[attackerId] = { attackerId: bgId, type: 'bodyguard_kill' };
          // Target survives
          survived[targetId] = true;
          addNotif(targetId, 'Un bodyguard s\'est sacrifié pour vous protéger !');
          addNotif(bgId, 'Vous vous êtes sacrifié pour protéger votre cible.');
          return;
        }
      }

      const baseDefense = target.character?.defenseLevel || 0;
      const bonus = defenseBonus[targetId] || 0;
      const totalDefense = baseDefense + bonus;

      if (attackLevel > totalDefense) {
        // Kill succeeds
        killed[targetId] = { attackerId, type };
      } else {
        // Kill blocked
        survived[targetId] = true;
        if (bonus > 0 && baseDefense < attackLevel) {
          // Saved by doctor/vest specifically
          const wasProtectedByDoctor = currentEvents.some(
            (e) => e.type === 'PROTECT' && e.content.target === targetId
          );
          if (wasProtectedByDoctor) {
            addEvent({
              type: 'PROTECTION_SUCCESS',
              content: {
                target: targetId,
                chatMessage: `${target.profile.name} a été attaqué, mais a été sauvé par le docteur.`,
              },
              displayed: false,
            });
          }
          addNotif(targetId, 'Vous avez été attaqué mais votre protection vous a sauvé !');
        } else {
          // Night immunity
          addNotif(targetId, 'Quelqu\'un a tenté de vous tuer, mais vous avez survécu !');
        }
      }
    });

    // === Collect ALL player modifications, apply in ONE setPlayers at the end ===
    const killedIds = Object.keys(killed);
    const allKilledIds = new Set(killedIds);

    // Death flavor messages by kill type
    const MAFIA_DEATH_MSGS = [
      'a été retrouvé(e) criblé(e) de balles à l\'aube.',
      'a été retrouvé(e) sans vie dans une ruelle sombre... une exécution propre.',
      'a été retrouvé(e) mort(e) chez lui. Un travail de professionnel.',
      'a été retrouvé(e) abattu(e) froidement devant sa porte.',
      'n\'a pas survécu à la nuit... la Mafia ne pardonne pas.',
    ];
    const SK_DEATH_MSGS = [
      'a été retrouvé(e) poignardé(e) sauvagement.',
      'a été retrouvé(e) dans un bain de sang... l\'œuvre d\'un psychopathe.',
      'a été retrouvé(e) lacéré(e) derrière la taverne.',
      'a été retrouvé(e) mutilé(e)... un acte de pure folie.',
    ];
    const VIGILANTE_DEATH_MSGS = [
      'a été retrouvé(e) abattu(e)... justice expéditive ?',
      'a été retrouvé(e) avec une balle dans le cœur... un justicier a frappé.',
    ];
    const BODYGUARD_DEATH_MSGS = [
      'est mort(e) en protégeant quelqu\'un.',
    ];

    const getDeathFlavor = (killType) => {
      if (killType === 'MAFIA_KILL' || killType === 'KILL') return MAFIA_DEATH_MSGS[Math.floor(Math.random() * MAFIA_DEATH_MSGS.length)];
      if (killType === 'SK_KILL') return SK_DEATH_MSGS[Math.floor(Math.random() * SK_DEATH_MSGS.length)];
      if (killType === 'VIGILANTE_KILL') return VIGILANTE_DEATH_MSGS[Math.floor(Math.random() * VIGILANTE_DEATH_MSGS.length)];
      if (killType === 'bodyguard_sacrifice' || killType === 'bodyguard_kill') return BODYGUARD_DEATH_MSGS[0];
      return 'a été retrouvé(e) mort(e) dans des circonstances mystérieuses.';
    };

    // Build chat messages for kills
    killedIds.forEach((targetId) => {
      const target = players.find((p) => p.id === targetId);
      const killInfo = killed[targetId];
      const flavor = getDeathFlavor(killInfo.type);
      let deathMsg = `${target?.profile?.name} ${flavor} Son rôle était : ${target?.character?.label}.`;
      if (target?.lastWill) {
        deathMsg += `\n📜 Testament : "${target.lastWill}"`;
      }
      addEvent({
        type: 'KILL_RESULT',
        content: { target: targetId, chatMessage: deathMsg },
        displayed: false,
      });
    });

    // === Vigilante guilt events ===
    Object.entries(vigilanteKills).forEach(([targetId, vigilanteId]) => {
      const target = players.find((p) => p.id === targetId);
      if (target?.character?.team === 'town' && killed[targetId]) {
        addEvent({
          type: 'VIGILANTE_GUILT',
          content: { target: vigilanteId, chatMessage: '' },
          displayed: true,
        });
        addNotif(vigilanteId, 'Vous avez tué un innocent... La culpabilité vous ronge.');
      }
    });

    // === Vigilante guilt from previous night (suicide) ===
    const guiltEvents = get().filter(
      (e) => e.type === 'VIGILANTE_GUILT' && e.dayCount === game.dayCount - 1
    );
    guiltEvents.forEach((e) => {
      const vigilante = players.find((p) => p.id === e.content.target);
      if (vigilante?.isAlive && !allKilledIds.has(e.content.target)) {
        allKilledIds.add(e.content.target);
        addEvent({
          type: 'KILL_RESULT',
          content: {
            target: e.content.target,
            chatMessage: `${vigilante.profile.name} s'est suicidé de culpabilité. Son rôle était : Vigilante.`,
          },
          displayed: false,
        });
      }
    });

    // === Priority 6: Investigations (skip if roleblocked) ===
    activeEvents
      .filter((e) => e.type === 'INVESTIGATE')
      .forEach((e) => {
        const target = players.find((p) => p.id === e.content.target);
        if (target) {
          const isFramed = framedPlayers[target.id];
          const detectResult = isFramed ? 'suspect' : (target.character?.detectResult || 'non-suspect');
          addNotif(
            e.content.by,
            detectResult === 'suspect'
              ? `Votre cible (${target.profile.name}) est suspecte !`
              : `Votre cible (${target.profile.name}) semble innocente.`
          );
        }
      });

    activeEvents
      .filter((e) => e.type === 'INVESTIGATE_ROLE')
      .forEach((e) => {
        const target = players.find((p) => p.id === e.content.target);
        if (target) {
          addNotif(
            e.content.by,
            `Votre cible (${target.profile.name}) est : ${target.character?.label}.`
          );
        }
      });

    // === Priority 7: Spy (sees mafia targets) ===
    activeEvents
      .filter((e) => e.type === 'SPY')
      .forEach((e) => {
        if (mafiaKillTarget) {
          const mafiaTarget = players.find((p) => p.id === mafiaKillTarget.content.target);
          addNotif(e.content.by, `La mafia a visité ${mafiaTarget?.profile?.name} cette nuit.`);
        } else {
          addNotif(e.content.by, 'La mafia n\'a visité personne cette nuit.');
        }
      });

    // === Priority 7: Lookout ===
    activeEvents
      .filter((e) => e.type === 'LOOKOUT')
      .forEach((e) => {
        const targetId = e.content.target;
        const target = players.find((p) => p.id === targetId);
        const visitors = (visitorsMap[targetId] || [])
          .map((vid) => players.find((p) => p.id === vid)?.profile?.name)
          .filter(Boolean);

        addNotif(
          e.content.by,
          visitors.length > 0
            ? `Vous avez vu ${visitors.join(', ')} rendre visite à ${target?.profile?.name}.`
            : `Personne n'a rendu visite à ${target?.profile?.name} cette nuit.`
        );
      });

    // === SINGLE ATOMIC setPlayers: kills + blackmail + Executioner→Jester ===
    const jesterRole = {
      label: 'Jester', key: 'jester', team: 'neutral', category: 'neutral_benign',
      description: 'Votre cible est morte. Vous êtes maintenant un Jester.',
      couleur: '#ff69b4', icon: 'fa-face-grin-tears', actions: [],
      objectif: 'Se faire lyncher par le village.',
      nightImmune: false, detectResult: 'non-suspect',
      attackLevel: 0, defenseLevel: 0, winCondition: 'getLynched',
    };

    setPlayers(
      players.map((p) => {
        let updated = { ...p };
        // Kill dead players
        if (allKilledIds.has(p.id)) {
          updated.isAlive = false;
        }
        // Apply blackmail
        updated.isBlackmailed = !!blackmailedPlayers[p.id];
        // Convert Executioner → Jester if their target died
        if (killedIds.length > 0 && p.character?.winCondition === 'getTargetLynched' && killedIds.includes(p.executionerTarget) && p.isAlive) {
          addNotif(p.id, 'Votre cible est morte... Vous êtes maintenant un Jester. Faites-vous lyncher !');
          updated.character = jesterRole;
          updated.executionerTarget = null;
        }
        return updated;
      })
    );

    // --- Flush all accumulated events and notifications at once ---
    setEvents(pendingEvents);
    setNotifications(pendingNotifs);
    return pendingEvents; // return so addMorningMessages can read them
  };

  const addMorningMessages = () => {
    const newMessages = [...(messages || [])];

    newMessages.push({
      player: 'system',
      color: 'white',
      content: `--- Jour ${game.dayCount} ---`,
      type: 'system',
      dayCount: game.dayCount,
      chat: 'default',
    });

    const resolvedEvents = resolveNightActions();

    // Check if no one died (using the freshly resolved events)
    const deathEvents = resolvedEvents.filter(
      (e) => e.type === 'KILL_RESULT' && e.dayCount === game.dayCount && !e.displayed
    );

    if (deathEvents.length === 0) {
      newMessages.push({
        player: 'system',
        color: '#78ff78',
        content: 'La nuit a été calme. Personne n\'est mort.',
        type: 'system',
        dayCount: game.dayCount,
        chat: 'default',
      });
    }

    const currEvents = resolvedEvents.map((event) => {
      if (!event.displayed && event.content.chatMessage) {
        newMessages.push({
          player: 'system',
          color: 'white',
          content: event.content.chatMessage,
          type: 'system',
          dayCount: game.dayCount,
          chat: 'default',
        });
        return { ...event, displayed: true };
      }
      return event;
    });

    setMessages(newMessages);
    setEvents(currEvents);
  };

  useEffect(() => {
    if (isHost()) {
      if (game?.isGameStarted && game?.phase === 'DEATH_REPORT' && morningProcessedRef.current !== game?.dayCount) {
        morningProcessedRef.current = game.dayCount;
        addMorningMessages();
      }
    }
  }, [game?.isGameStarted, game?.phase, game?.dayCount, isHost()]);

  return (
    <EventsContext.Provider value={{ ...eventsState }}>
      {children}
    </EventsContext.Provider>
  );
};

function trackVisitor(visitorsMap, targetId, visitorId) {
  if (!visitorsMap[targetId]) visitorsMap[targetId] = [];
  visitorsMap[targetId].push(visitorId);
}

export const useEvents = () => {
  const context = React.useContext(EventsContext);
  if (context === undefined)
    throw new Error('useEvents must be used within EventsProvider');
  return context;
};
