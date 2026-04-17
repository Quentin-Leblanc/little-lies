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
  const neutralKillingAlive = alive.filter(
    (p) => p.character?.winCondition === 'lastStanding'
  ).length;

  if (neutralKillingAlive > 0 && townAlive === 0 && mafiaAlive === 0 && evilAlive === 0) {
    return 'neutral_killing';
  }
  if (mafiaAlive === 0 && evilAlive === 0 && neutralKillingAlive === 0 && townAlive > 0) return 'town';
  if (mafiaAlive >= townAlive + evilAlive + neutralKillingAlive && mafiaAlive > 0) return 'mafia';
  if (evilAlive >= townAlive + mafiaAlive + neutralKillingAlive && evilAlive > 0) return 'evil';
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
