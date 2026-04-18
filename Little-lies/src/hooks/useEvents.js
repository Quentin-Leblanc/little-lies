import React, { useEffect, useRef } from 'react';
import { isHost, useMultiplayerState, me } from 'playroomkit';
import i18n from '../trad/i18n';
import { getRole } from '../data/roles.js';
import {
  resolveKillAttempts,
  filterResolvableEvents,
  computeExecutionerConversions,
  resolveCultVoteConversion,
} from './nightResolution';

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

  // Add multiple events at once (avoids stale state overwrites)
  const addBatch = (newEvents) => {
    const formatted = newEvents.map((e) => ({
      dayCount: game.dayCount, createdAt: Date.now(), ...e,
    }));
    setEvents([...events, ...formatted]);
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

  const eventsState = { add, addBatch, get, hasDoneThisActionTonight, replaceAction, getMyActionTarget, getMyNotifications, addNotification };

  const resolveNightActions = () => {
    // Night events were created with dayCount = N, but dayCount is now N+1
    // (incremented during NIGHT→DEATH_REPORT transition). Filter by N-1.
    const nightDayCount = game.dayCount - 1;
    // AFK players' actions are ignored during night resolution. The
    // filter + AFK logic lives in nightResolution.js so it can be tested
    // without mocking PlayroomKit.
    const afkIds = new Set(players.filter((p) => p.isAFK).map((p) => p.id));
    const currentEvents = filterResolvableEvents(get(), { dayCount: nightDayCount, afkIds });

    // --- Batch notifications AND events to avoid stale state overwrites ---
    const pendingNotifs = [...(notifications || [])];
    const addNotif = (playerId, message, type = null) => {
      pendingNotifs.push({ playerId, message, type, dayCount: game.dayCount, read: false });
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
        addNotif(e.content.target, i18n.t('game:notifications.jailed'), 'jailed');
      });

    // === Jailor Execute (unstoppable attack on jailed target) ===
    currentEvents
      .filter((e) => e.type === 'JAILOR_EXECUTE')
      .forEach((e) => {
        const targetId = e.content.target;
        // Only execute if the target is actually jailed by this Jailor
        if (jailedPlayers[targetId] === e.content.by) {
          killAttempts.push({
            targetId,
            attackerId: e.content.by,
            attackLevel: 2, // Powerful — bypasses basic defense
            type: 'jailor_execute',
          });
        }
      });

    // === Priority 0.5: Roleblock (Escort) ===
    currentEvents
      .filter((e) => e.type === 'ROLEBLOCK')
      .forEach((e) => {
        const target = players.find((p) => p.id === e.content.target);
        // Skip dead targets
        if (!target?.isAlive) return;
        // If escort visits a Serial Killer, SK kills the escort
        if (target?.character?.key === 'serial_killer') {
          killAttempts.push({
            targetId: e.content.by,
            attackerId: e.content.target,
            attackLevel: target.character.attackLevel || 1,
            type: 'sk_retaliation',
          });
        } else {
          roleblockedPlayers[e.content.target] = true;
          addNotif(e.content.target, i18n.t('game:notifications.roleblocked'), 'roleblocked');
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
          addNotif(e.content.by, i18n.t('game:notifications.heal_failed', { name: target.profile.name }));
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
        const target = players.find((p) => p.id === e.content.target);
        if (!target?.isAlive) return;
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
    // Attack vs defense matrix (jail → bodyguard → attack vs defense) is
    // a pure function — see nightResolution.js. We then overlay the
    // per-outcome notifications / events that depend on i18n state.
    const { killed, survived } = resolveKillAttempts(killAttempts, {
      players,
      jailedPlayers,
      bodyguardTargets,
      defenseBonus,
    });

    // Apply outcome-specific notifications and event emissions
    for (const [targetId, reason] of Object.entries(survived)) {
      const target = players.find((p) => p.id === targetId);
      if (!target) continue;
      if (reason === 'jailed') {
        addNotif(targetId, i18n.t('game:notifications.jail_protected'));
      } else if (reason === 'bodyguard') {
        addNotif(targetId, i18n.t('game:notifications.bodyguard_saved'));
        const bgId = bodyguardTargets[targetId];
        if (bgId) addNotif(bgId, i18n.t('game:notifications.bodyguard_sacrifice'));
      } else if (reason === 'protected') {
        // Saved by doctor/vest — announce doctor save publicly if applicable
        const wasProtectedByDoctor = currentEvents.some(
          (e) => e.type === 'PROTECT' && e.content.target === targetId
        );
        if (wasProtectedByDoctor) {
          addEvent({
            type: 'PROTECTION_SUCCESS',
            content: {
              target: targetId,
              chatMessage: i18n.t('game:death_messages.protection_success', { name: target.profile.name }),
            },
            displayed: false,
          });
        }
        addNotif(targetId, i18n.t('game:notifications.protection_saved'));
      } else {
        // 'immune' — target's intrinsic defense shrugged the attack off
        addNotif(targetId, i18n.t('game:notifications.night_immune'));
      }
    }

    // === Collect ALL player modifications, apply in ONE setPlayers at the end ===
    const killedIds = Object.keys(killed);
    const allKilledIds = new Set(killedIds);

    // Death flavor messages by kill type (from i18n)
    const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const getDeathFlavor = (killType) => {
      if (killType === 'mafia') return pickRandom(i18n.t('game:death_messages.mafia', { returnObjects: true }));
      if (killType === 'neutral') return pickRandom(i18n.t('game:death_messages.sk', { returnObjects: true }));
      if (killType === 'vigilante') return pickRandom(i18n.t('game:death_messages.vigilante', { returnObjects: true }));
      if (killType === 'sk_retaliation') return pickRandom(i18n.t('game:death_messages.sk', { returnObjects: true }));
      if (killType === 'jailor_execute') return pickRandom(i18n.t('game:death_messages.jailor', { returnObjects: true }));
      if (killType === 'bodyguard_sacrifice' || killType === 'bodyguard_kill') return i18n.t('game:death_messages.bodyguard', { returnObjects: true })[0];
      return i18n.t('game:death_messages.unknown');
    };

    // Build chat messages for kills. `chatMessage` stays as a single
    // flattened string for the chat log. Structured fields live alongside
    // it so the morning overlay can render name/flavor/role/will as
    // distinct styled blocks (role card, testament block) without
    // regex-parsing the chat message back apart.
    killedIds.forEach((targetId) => {
      const target = players.find((p) => p.id === targetId);
      const killInfo = killed[targetId];
      const flavor = getDeathFlavor(killInfo.type);
      let deathMsg = i18n.t('game:death_messages.death_role_reveal', { name: target?.profile?.name, flavor, role: target?.character?.label });
      if (target?.lastWill) {
        deathMsg += i18n.t('game:death_messages.death_with_will', { will: target.lastWill });
      }
      addEvent({
        type: 'KILL_RESULT',
        content: {
          target: targetId,
          chatMessage: deathMsg,
          victimName: target?.profile?.name,
          flavor,
          roleKey: target?.character?.key,
          roleLabel: target?.character?.label,
          roleIcon: target?.character?.icon,
          roleColor: target?.character?.couleur,
          roleTeam: target?.character?.team,
          lastWill: target?.lastWill || null,
        },
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
        addNotif(vigilanteId, i18n.t('game:notifications.vigilante_guilt'));
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
            chatMessage: i18n.t('game:death_messages.vigilante_suicide', { name: vigilante.profile.name }),
          },
          displayed: false,
        });
      }
    });

    // === Priority 5: Cult conversion ===
    // No more leader/member split: every alive cultist submits a CULT_VOTE
    // and the target is converted ONLY if all votes agree on the same
    // player. Two cultists voting different targets = no conversion that
    // night. All the classic immunities (mafia team, nightImmune, jail,
    // killed-this-night) still apply.
    const conversionResult = resolveCultVoteConversion(
      activeEvents.filter((e) => e.type === 'CULT_VOTE'),
      {
        players,
        jailedPlayers,
        roleblockedPlayers,
        killedThisNight: new Set(killedIds),
      }
    );
    const convertedMap = conversionResult.convertedIds;

    Object.entries(convertedMap).forEach(([targetId, { by }]) => {
      const target = players.find((p) => p.id === targetId);
      const targetName = target?.profile?.name;
      addNotif(targetId, i18n.t('game:notifications.converted_to_cult'), 'converted');
      // Broadcast to every living cultist (they all collectively converted
      // the new member — no "solo converter" to credit anymore).
      players.forEach((p) => {
        if (!p.isAlive || p.id === targetId) return;
        if (p.character?.team !== 'cult') return;
        const isVoter = p.id === by;
        addNotif(
          p.id,
          isVoter
            ? i18n.t('game:notifications.conversion_success', { name: targetName })
            : i18n.t('game:notifications.cult_new_member', { name: targetName }),
        );
      });
    });

    conversionResult.failures.forEach((f) => {
      const target = f.targetId ? players.find((p) => p.id === f.targetId) : null;
      const name = target?.profile?.name;
      const key = {
        mafia_immune: 'conversion_failed_mafia',
        night_immune: 'conversion_failed_immune',
        target_jailed: 'conversion_failed_jailed',
        target_killed: 'conversion_failed_killed',
        cult_disagreement: 'conversion_failed_disagreement',
      }[f.reason];
      if (key && f.by) {
        addNotif(f.by, i18n.t(`game:notifications.${key}`, { name }));
      }
    });

    // === Priority 6: Investigations (skip if roleblocked or target dead) ===
    activeEvents
      .filter((e) => e.type === 'INVESTIGATE')
      .forEach((e) => {
        const target = players.find((p) => p.id === e.content.target);
        if (target?.isAlive) {
          const isFramed = framedPlayers[target.id];
          const detectResult = isFramed ? 'suspect' : (target.character?.detectResult || 'non-suspect');
          addNotif(
            e.content.by,
            detectResult === 'suspect'
              ? i18n.t('game:notifications.investigate_suspect', { name: target.profile.name })
              : i18n.t('game:notifications.investigate_innocent', { name: target.profile.name })
          );
        }
      });

    activeEvents
      .filter((e) => e.type === 'INVESTIGATE_ROLE')
      .forEach((e) => {
        const target = players.find((p) => p.id === e.content.target);
        if (target?.isAlive) {
          addNotif(
            e.content.by,
            i18n.t('game:notifications.investigate_role', { name: target.profile.name, role: target.character?.label })
          );
        }
      });

    // === Priority 7: Spy (sees mafia targets) ===
    activeEvents
      .filter((e) => e.type === 'SPY')
      .forEach((e) => {
        if (mafiaKillTarget) {
          const mafiaTarget = players.find((p) => p.id === mafiaKillTarget.content.target);
          addNotif(e.content.by, i18n.t('game:notifications.spy_mafia_visit', { name: mafiaTarget?.profile?.name }));
        } else {
          addNotif(e.content.by, i18n.t('game:notifications.spy_no_visit'));
        }
      });

    // === Priority 7: Lookout (filter out dead visitors) ===
    activeEvents
      .filter((e) => e.type === 'LOOKOUT')
      .forEach((e) => {
        const targetId = e.content.target;
        const target = players.find((p) => p.id === targetId);
        const visitors = (visitorsMap[targetId] || [])
          .map((vid) => players.find((p) => p.id === vid))
          .filter((p) => p?.isAlive && !allKilledIds.has(p.id))
          .map((p) => p.profile?.name)
          .filter(Boolean);

        addNotif(
          e.content.by,
          visitors.length > 0
            ? i18n.t('game:notifications.lookout_visitors', { visitors: visitors.join(', '), target: target?.profile?.name })
            : i18n.t('game:notifications.lookout_no_visitors', { target: target?.profile?.name })
        );
      });

    // === SINGLE ATOMIC setPlayers: kills + blackmail + Executioner→Jester + cult conversion ===
    const jesterRole = getRole('jester');
    const cultistRole = getRole('cultist');
    // Pure function decides which Executioners flip — see nightResolution.js.
    const executionerFlips = computeExecutionerConversions(players, new Set(killedIds));

    setPlayers(
      players.map((p) => {
        let updated = { ...p };
        if (allKilledIds.has(p.id)) {
          updated.isAlive = false;
        }
        updated.isBlackmailed = !!blackmailedPlayers[p.id];
        if (executionerFlips[p.id]) {
          addNotif(p.id, i18n.t('game:notifications.executioner_to_jester'));
          updated.character = jesterRole;
          updated.executionerTarget = null;
        }
        // Conversion overrides executioner flip (target was alive at kill
        // resolution, so the exec flip wouldn't have fired anyway).
        if (convertedMap[p.id] && cultistRole) {
          updated.character = cultistRole;
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
      content: i18n.t('game:system.day_separator', { day: game.dayCount }),
      type: 'system',
      dayCount: game.dayCount,
      chat: 'default',
    });

    const resolvedEvents = resolveNightActions();

    // Check if no one died (using the freshly resolved events + disconnects)
    const deathEvents = resolvedEvents.filter(
      (e) => (e.type === 'KILL_RESULT' || e.type === 'disconnect') && !e.displayed && e.content?.chatMessage
    );

    if (deathEvents.length === 0) {
      newMessages.push({
        player: 'system',
        color: '#78ff78',
        content: i18n.t('game:system.peaceful_night'),
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
