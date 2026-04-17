/**
 * Pure kill-resolution logic — no React, no networking.
 * Extracted from useEvents.resolveNightActions so the attack/defense
 * matrix (jail > bodyguard > attack vs defense) can be unit-tested.
 *
 * The caller builds the context maps (jailedPlayers, bodyguardTargets,
 * defenseBonus) from the night events, then passes them in here along
 * with the ordered list of kill attempts.
 */

/**
 * Resolve a batch of kill attempts into { killed, survived } maps.
 *
 * Priority order (highest wins):
 *  1. Jail: jailed target is immune unless the attack is jailor_execute.
 *  2. Bodyguard intercept: if a living bodyguard protects the target,
 *     both the bodyguard and the attacker die, target survives.
 *  3. Defense vs attack: attackLevel must strictly exceed defense to kill.
 *
 * @param {Array<{targetId, attackerId, attackLevel, type}>} attempts
 * @param {Object} context
 * @param {Array} context.players
 * @param {Object} context.jailedPlayers   targetId → jailorId
 * @param {Object} context.bodyguardTargets targetId → bodyguardId
 * @param {Object} context.defenseBonus    targetId → extra defense (int)
 * @returns {{ killed: Record<string, {attackerId, type}>, survived: Record<string, string> }}
 */
export function resolveKillAttempts(attempts, context) {
  const { players, jailedPlayers = {}, bodyguardTargets = {}, defenseBonus = {} } = context;
  const killed = {};
  const survived = {};
  const byId = new Map((players || []).map((p) => [p.id, p]));

  for (const attempt of attempts) {
    const { targetId, attackerId, attackLevel, type } = attempt;
    const target = byId.get(targetId);
    // Skip if target doesn't exist or is already dead before this attack
    // (a chain of kill attempts could eliminate them in the same pass —
    // we check the killed map too).
    if (!target) continue;
    if (!target.isAlive) continue;
    if (killed[targetId]) continue;

    // 1. Jail: target immune unless jailor-execute
    if (jailedPlayers[targetId] && type !== 'jailor_execute') {
      survived[targetId] = 'jailed';
      continue;
    }

    // 2. Bodyguard: living BG sacrifices + kills attacker, target lives
    if (bodyguardTargets[targetId]) {
      const bgId = bodyguardTargets[targetId];
      const bg = byId.get(bgId);
      if (bg?.isAlive && !killed[bgId]) {
        killed[bgId] = { attackerId, type: 'bodyguard_sacrifice' };
        killed[attackerId] = { attackerId: bgId, type: 'bodyguard_kill' };
        survived[targetId] = 'bodyguard';
        continue;
      }
      // Dead BG → no protection, fall through to defense check
    }

    // 3. Defense vs attack
    const baseDefense = target.character?.defenseLevel || 0;
    const bonus = defenseBonus[targetId] || 0;
    const totalDefense = baseDefense + bonus;

    if (attackLevel > totalDefense) {
      killed[targetId] = { attackerId, type };
    } else {
      survived[targetId] = bonus > 0 ? 'protected' : 'immune';
    }
  }

  return { killed, survived };
}

/**
 * Filter a list of night events down to those that should be resolved:
 *  - Correct dayCount (events created last night, before dayCount++)
 *  - Not already `displayed` (i.e. not already processed)
 *  - Not authored by an AFK player (AFK actions are silently dropped)
 */
export function filterResolvableEvents(events, { dayCount, afkIds }) {
  const afk = afkIds instanceof Set ? afkIds : new Set(afkIds || []);
  return (events || []).filter(
    (e) => e.dayCount === dayCount && !e.displayed && !afk.has(e.content?.by)
  );
}

/**
 * Determine which Executioners flip to Jester based on who died tonight.
 * Returns a map { playerId: true } of Executioners whose target died.
 * Caller applies the character swap + notification.
 */
export function computeExecutionerConversions(players, killedIds) {
  const killedSet = killedIds instanceof Set ? killedIds : new Set(killedIds || []);
  const flips = {};
  (players || []).forEach((p) => {
    if (!p.isAlive) return;
    if (p.character?.winCondition !== 'getTargetLynched') return;
    if (p.executionerTarget && killedSet.has(p.executionerTarget)) {
      flips[p.id] = true;
    }
  });
  return flips;
}

/**
 * Resolve cult conversion attempts for the night.
 *
 * Rules:
 *  - Only CONVERT events are consumed (CULT_VOTE events are advisory and
 *    consumed by the vote aggregator upstream).
 *  - At most one conversion lands per night. If several CONVERT events
 *    exist (unusual — leader is unique), the last one wins.
 *  - Targets from team 'mafia' are immune (mafia loyalty).
 *  - Targets with character.nightImmune are immune.
 *  - Jailed targets can't be converted.
 *  - Targets killed this night can't be converted (kill happens first).
 *  - Roleblocked or killed-this-night converters fail silently.
 *  - Already-cult targets → skip (defensive).
 *
 * @param {Array} conversionEvents
 * @param {Object} context
 * @param {Array} context.players
 * @param {Object} context.jailedPlayers
 * @param {Object} context.roleblockedPlayers
 * @param {Set|Array} [context.killedThisNight] — ids killed earlier in the pass
 * @returns {{ convertedIds: Record<string, {by}>, failures: Array }}
 */
export function resolveConversions(conversionEvents, context) {
  const {
    players,
    jailedPlayers = {},
    roleblockedPlayers = {},
    killedThisNight,
  } = context;
  const byId = new Map((players || []).map((p) => [p.id, p]));
  const killedSet = killedThisNight instanceof Set
    ? killedThisNight
    : new Set(killedThisNight || []);
  const convertedIds = {};
  const failures = [];

  // Last conversion wins (leader is unique; this is defensive).
  const events = [...(conversionEvents || [])].filter((e) => e?.type === 'CONVERT');
  if (events.length === 0) return { convertedIds, failures };
  const e = events[events.length - 1];

  const converter = byId.get(e.content?.by);
  const target = byId.get(e.content?.target);

  if (!converter?.isAlive || killedSet.has(converter?.id)) {
    failures.push({ by: e.content?.by, reason: 'converter_dead' });
    return { convertedIds, failures };
  }
  if (!target?.isAlive) {
    failures.push({ by: converter.id, reason: 'target_dead' });
    return { convertedIds, failures };
  }
  if (killedSet.has(target.id)) {
    failures.push({ by: converter.id, reason: 'target_killed', targetId: target.id });
    return { convertedIds, failures };
  }
  if (target.character?.team === 'cult') {
    failures.push({ by: converter.id, reason: 'already_cult', targetId: target.id });
    return { convertedIds, failures };
  }
  if (target.character?.team === 'mafia') {
    failures.push({ by: converter.id, reason: 'mafia_immune', targetId: target.id });
    return { convertedIds, failures };
  }
  if (target.character?.nightImmune) {
    failures.push({ by: converter.id, reason: 'night_immune', targetId: target.id });
    return { convertedIds, failures };
  }
  if (jailedPlayers[target.id]) {
    failures.push({ by: converter.id, reason: 'target_jailed', targetId: target.id });
    return { convertedIds, failures };
  }
  if (roleblockedPlayers[converter.id]) {
    failures.push({ by: converter.id, reason: 'self_roleblocked' });
    return { convertedIds, failures };
  }

  convertedIds[target.id] = { by: converter.id };
  return { convertedIds, failures };
}
