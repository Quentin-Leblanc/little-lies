/**
 * GameMetrics — Collecte et stocke les stats de parties en localStorage.
 * Historique des 50 dernieres parties. Pas de service externe.
 */

const STORAGE_KEY = 'notme_game_metrics';
const MAX_HISTORY = 50;

// Collect metrics from final game state
export const collectGameMetrics = ({ game, players, events }) => {
  const allEvents = events || [];
  const now = Date.now();

  // Count deaths by type
  const killEvents = allEvents.filter(e => e.type === 'KILL_RESULT');
  const eliminationEvents = allEvents.filter(e => e.type === 'ELIMINATION');

  const deathsByType = {};
  allEvents.filter(e => e.type === 'KILL_RESULT' || e.type === 'ELIMINATION').forEach(e => {
    const type = e.type === 'ELIMINATION' ? 'lynch' : 'night_kill';
    deathsByType[type] = (deathsByType[type] || 0) + 1;
  });

  // Roles in play
  const rolesInPlay = players.map(p => p.character?.key).filter(Boolean);
  const uniqueRoles = [...new Set(rolesInPlay)];

  // Team ratios
  const teamCounts = {};
  players.forEach(p => {
    const team = p.character?.team || 'unknown';
    teamCounts[team] = (teamCounts[team] || 0) + 1;
  });

  // Alive at end
  const aliveAtEnd = {};
  players.filter(p => p.isAlive).forEach(p => {
    const team = p.character?.team || 'unknown';
    aliveAtEnd[team] = (aliveAtEnd[team] || 0) + 1;
  });

  // Disconnections
  const disconnections = players.filter(p => p.connected === false).length;

  return {
    id: `game_${now}`,
    timestamp: now,
    date: new Date(now).toISOString(),
    winner: game.winner,
    dayCount: game.dayCount || 1,
    playerCount: players.length,
    roles: uniqueRoles,
    teamCounts,
    aliveAtEnd,
    totalDeaths: players.filter(p => !p.isAlive).length,
    deathsByType,
    nightKills: killEvents.length,
    lynches: eliminationEvents.length,
    disconnections,
    neutralWinners: (game.neutralWinners || []).map(nw => nw.role),
  };
};

// Save to localStorage
export const saveMetrics = (metrics) => {
  try {
    const existing = getMetricsHistory();
    existing.unshift(metrics);
    // Keep only last N
    const trimmed = existing.slice(0, MAX_HISTORY);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    // Also log for future backend
    console.log('[GameMetrics]', metrics);
    return true;
  } catch (e) {
    console.warn('[GameMetrics] Failed to save:', e);
    return false;
  }
};

// Get full history
export const getMetricsHistory = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// Get aggregate stats from history
export const getAggregateStats = () => {
  const history = getMetricsHistory();
  if (history.length === 0) return null;

  const totalGames = history.length;
  const avgDays = history.reduce((s, g) => s + (g.dayCount || 1), 0) / totalGames;
  const avgPlayers = history.reduce((s, g) => s + (g.playerCount || 0), 0) / totalGames;

  const winCounts = {};
  history.forEach(g => {
    winCounts[g.winner] = (winCounts[g.winner] || 0) + 1;
  });

  return {
    totalGames,
    avgDays: Math.round(avgDays * 10) / 10,
    avgPlayers: Math.round(avgPlayers * 10) / 10,
    winCounts,
  };
};

// Get count for survey throttling
export const getGameCount = () => {
  return getMetricsHistory().length;
};
