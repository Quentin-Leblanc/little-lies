// Per-role lifetime stats, stored client-side in localStorage. This gives
// players a personal progression view without requiring a backend — the
// lobby's "My stats" dialog reads these counts to show games played and
// win-rate per role they've been dealt.
//
// Shape stored:
//   { version: 1, roles: { [roleKey]: { played, won, lastPlayed } } }
//
// Kept deliberately flat so a future migration to Supabase (synced across
// devices) only needs a read/write adapter swap — the callers keep their
// current API.
const STORAGE_KEY = 'al_role_stats_v1';

const safeRead = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, roles: {} };
    const parsed = JSON.parse(raw);
    if (parsed && parsed.roles && typeof parsed.roles === 'object') return parsed;
    return { version: 1, roles: {} };
  } catch {
    return { version: 1, roles: {} };
  }
};

const safeWrite = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Quota / disabled storage — fail silently, stats are non-critical.
  }
};

/** Record one game outcome for a role. `won` is boolean. */
export const recordGame = (roleKey, won) => {
  if (!roleKey) return;
  const data = safeRead();
  const prev = data.roles[roleKey] || { played: 0, won: 0, lastPlayed: 0 };
  data.roles[roleKey] = {
    played: prev.played + 1,
    won: prev.won + (won ? 1 : 0),
    lastPlayed: Date.now(),
  };
  safeWrite(data);
};

/** Return the full stats object. Empty roles map if nothing recorded. */
export const readStats = () => safeRead();

/** Reset stats — used by a "clear" button in the viewer. */
export const clearStats = () => safeWrite({ version: 1, roles: {} });

/** Summary used by the stats dialog: sorted list + totals. */
export const computeSummary = () => {
  const { roles } = safeRead();
  const entries = Object.entries(roles).map(([key, v]) => ({
    key,
    played: v.played || 0,
    won: v.won || 0,
    winRate: v.played > 0 ? v.won / v.played : 0,
    lastPlayed: v.lastPlayed || 0,
  }));
  // Most-played first — tells the player which roles they gravitate to.
  entries.sort((a, b) => b.played - a.played || b.winRate - a.winRate);
  const totals = entries.reduce(
    (acc, r) => ({ played: acc.played + r.played, won: acc.won + r.won }),
    { played: 0, won: 0 },
  );
  return {
    entries,
    totals,
    overallWinRate: totals.played > 0 ? totals.won / totals.played : 0,
  };
};
