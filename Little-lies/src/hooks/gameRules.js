/**
 * Pure game-rules helpers — no React, no networking.
 * Extracted from useGameEngine so the rules can be unit-tested without
 * mocking PlayroomKit.
 */

/**
 * Decide whether the game has ended and, if so, who won.
 * @param {Array} players
 * @returns {null | 'town' | 'mafia' | 'evil' | 'neutral_killing'}
 */
export function checkWinCondition(players) {
  const alive = (players || []).filter((p) => p.isAlive);
  if (alive.length === 0 || !alive.some((p) => p.character)) return null;

  const townAlive = alive.filter((p) => p.character?.team === 'town').length;
  const mafiaAlive = alive.filter((p) => p.character?.team === 'mafia').length;
  const evilAlive = alive.filter((p) => p.character?.team === 'evil').length;
  const cultAlive = alive.filter((p) => p.character?.team === 'cult').length;
  const neutralKillingAlive = alive.filter(
    (p) => p.character?.winCondition === 'lastStanding'
  ).length;

  if (neutralKillingAlive > 0 && townAlive === 0 && mafiaAlive === 0 && evilAlive === 0 && cultAlive === 0) {
    return 'neutral_killing';
  }
  if (mafiaAlive === 0 && evilAlive === 0 && cultAlive === 0 && neutralKillingAlive === 0 && townAlive > 0) return 'town';
  if (mafiaAlive >= townAlive + evilAlive + cultAlive + neutralKillingAlive && mafiaAlive > 0) return 'mafia';
  if (evilAlive >= townAlive + mafiaAlive + cultAlive + neutralKillingAlive && evilAlive > 0) return 'evil';
  // Cult wins at parity like mafia — conversions push them over the threshold.
  if (cultAlive >= townAlive + mafiaAlive + evilAlive + neutralKillingAlive && cultAlive > 0) return 'cult';
  return null;
}

/**
 * Who (if anyone) has reached the majority vote threshold and should
 * head to trial. Majority = strict >50%: `floor(n/2) + 1`.
 * @returns {string | null} suspect playerId, or null if no majority
 */
export function checkVotingMajority(players, trial) {
  if (!trial?.suspects || Object.keys(trial.suspects).length === 0) return null;
  const totalPossibleVotes = (players || []).filter((p) => p.isAlive).length;
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
  return topVotes >= majority ? topSuspect : null;
}

/**
 * Resolve the guilty/innocent vote.
 * Guilty by default: need ≥ majority of eligible voters to save the accused.
 */
export function resolveJudgment(players, trial, accusedId) {
  const votes = trial?.votes || {};
  let innocentCount = 0;
  Object.values(votes).forEach((vote) => {
    if (vote === 'innocent') innocentCount++;
  });
  const eligibleVoters = (players || []).filter((p) => p.isAlive && p.id !== accusedId).length;
  const majority = Math.floor(eligibleVoters / 2) + 1;
  const isSaved = innocentCount >= majority;
  return { innocentCount, eligibleVoters, majority, isGuilty: !isSaved };
}

/**
 * Strip impossible entries from trial state so malicious or stale client
 * writes can't corrupt the vote. Pure function; keeps valid entries as-is
 * (preserves vote order for Mayor weight) and drops the rest.
 *
 * Rules:
 * - suspects[id].suspectedBy: voter must be alive + not a spectator + not
 *   the suspect himself. Suspect must be alive + not a spectator.
 * - votes[voterId]: voter must be alive + not a spectator + not the
 *   accused. Vote value must be 'guilty' / 'innocent' / 'abstain'.
 *
 * The function is phase-agnostic — it only removes impossible entries,
 * never legitimate ones. Safe to call on every host tick.
 */
export function sanitizeTrial(players, trial, accusedId) {
  if (!trial) return { suspects: {}, votes: {} };
  const playersArr = players || [];
  const livingIds = new Set(
    playersArr.filter((p) => p.isAlive && !p.isSpectator).map((p) => p.id)
  );

  const cleanSuspects = {};
  Object.keys(trial.suspects || {}).forEach((suspectedId) => {
    if (!livingIds.has(suspectedId)) return;
    const entry = trial.suspects[suspectedId];
    const validVoters = (entry?.suspectedBy || []).filter(
      (vid) => livingIds.has(vid) && vid !== suspectedId
    );
    if (validVoters.length > 0) {
      cleanSuspects[suspectedId] = { id: suspectedId, suspectedBy: validVoters };
    }
  });

  const VALID_VERDICTS = new Set(['guilty', 'innocent', 'abstain']);
  const cleanVotes = {};
  Object.keys(trial.votes || {}).forEach((voterId) => {
    if (!livingIds.has(voterId)) return;
    if (voterId === accusedId) return;
    const v = trial.votes[voterId];
    if (VALID_VERDICTS.has(v)) cleanVotes[voterId] = v;
  });

  return { suspects: cleanSuspects, votes: cleanVotes };
}

/**
 * Sanitize the top-level game state — strip obviously-tampered fields
 * so a malicious client poking at PlayroomKit from the browser console
 * can't force-end the game, fake a winner, or point the trial at a
 * ghost player.
 *
 * This is a first line of defense, NOT a full anti-cheat. A sophisticated
 * attacker could still write *valid* transitions at the wrong time (e.g.
 * jump from VOTING to EXECUTION without a majority). Catching those
 * requires comparing against the host's expected state machine, which
 * lives in useGameEngine.
 *
 * Caller (host watchdog) should diff the result against the input and
 * re-broadcast only if something changed — avoids setGame loops.
 *
 * @returns a (possibly-modified) game object. Only known-bad fields are
 *   touched; everything else passes through untouched.
 */
const VALID_PHASES = new Set([
  'NIGHT', 'NIGHT_TRANSITION', 'DAY_RISING', 'DEATH_REPORT', 'DISCUSSION',
  'VOTING', 'DEFENSE', 'JUDGMENT', 'LAST_WORDS', 'EXECUTION',
  'EXECUTION_REVEAL', 'NO_LYNCH', 'SPARED', 'GAMEOVER',
]);
const VALID_WINNERS = new Set([
  'town', 'mafia', 'cult', 'evil', 'neutral_killing',
]);

export function sanitizeGameState(game, players) {
  if (!game || typeof game !== 'object') {
    return { phase: 'NIGHT', dayCount: 0, winner: null, accusedId: null };
  }
  const out = { ...game };
  const livingIds = new Set(
    (players || []).filter((p) => p?.isAlive && !p?.isSpectator).map((p) => p.id)
  );

  if (typeof out.phase !== 'string' || !VALID_PHASES.has(out.phase)) {
    out.phase = 'NIGHT';
  }
  if (out.winner !== null && out.winner !== undefined && !VALID_WINNERS.has(out.winner)) {
    out.winner = null;
  }
  if (out.accusedId && !livingIds.has(out.accusedId)) {
    out.accusedId = null;
  }
  if (typeof out.dayCount !== 'number' || out.dayCount < 0 || !Number.isFinite(out.dayCount)) {
    out.dayCount = 0;
  }
  if (typeof out.isGameStarted !== 'boolean') out.isGameStarted = !!out.isGameStarted;
  if (typeof out.isDay !== 'boolean') out.isDay = !!out.isDay;
  if (out.trialsToday !== undefined) {
    if (typeof out.trialsToday !== 'number' || out.trialsToday < 0) out.trialsToday = 0;
  }
  return out;
}

/**
 * Cheap delta check used by the host watchdog. Only compares the fields
 * sanitizeGameState can rewrite — avoids false positives on harmless
 * fields (timer, phaseStartedAt, etc.).
 */
export function gameStateDirty(before, after) {
  if (!before || !after) return before !== after;
  const keys = ['phase', 'winner', 'accusedId', 'dayCount', 'isGameStarted', 'isDay', 'trialsToday'];
  return keys.some((k) => before[k] !== after[k]);
}

/**
 * Cheap structural equality check for trial payloads — used by the host
 * to decide whether a sanitized trial is worth broadcasting back.
 * Avoids a full JSON.stringify on every tick.
 */
export function trialsEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  const aSuspectKeys = Object.keys(a.suspects || {});
  const bSuspectKeys = Object.keys(b.suspects || {});
  if (aSuspectKeys.length !== bSuspectKeys.length) return false;
  for (const k of aSuspectKeys) {
    const av = a.suspects[k]?.suspectedBy || [];
    const bv = b.suspects?.[k]?.suspectedBy || [];
    if (av.length !== bv.length) return false;
    for (let i = 0; i < av.length; i++) if (av[i] !== bv[i]) return false;
  }
  const aVoteKeys = Object.keys(a.votes || {});
  const bVoteKeys = Object.keys(b.votes || {});
  if (aVoteKeys.length !== bVoteKeys.length) return false;
  for (const k of aVoteKeys) {
    if (a.votes[k] !== b.votes?.[k]) return false;
  }
  return true;
}
