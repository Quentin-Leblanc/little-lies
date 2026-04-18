/**
 * Pure helpers for connection/AFK lifecycle. No React, no network.
 * Host uses them in intervals; the results are applied via setPlayers /
 * setChatMessages / Events.add.
 */

import i18n from '../trad/i18n';

/**
 * Reconcile the current players array against the set of connected ids.
 *
 * Returns a shape identical to the in-place resolve the host used to run:
 *   {
 *     updated,       // new players array (immutable)
 *     newMessages,   // system chat messages to append
 *     killedNotifs,  // entries to pass to Events.add on grace expiry
 *     changed,       // true if players array changed
 *   }
 *
 * Behavior:
 *  - Alive player whose id leaves `connectedIds` → grace period starts.
 *  - Alive player whose id returns to `connectedIds` → reconnect.
 *  - Alive player whose grace expired → killed via disconnect event.
 */
export function resolveDisconnects({
  players,
  connectedIds,
  now,
  dayCount,
  graceMs,
}) {
  const newMessages = [];
  const killedNotifs = [];
  let changed = false;

  const updated = (players || []).map((player) => {
    if (!player.isAlive) return player;
    const isConnected = connectedIds.has(player.id);

    if (!isConnected && player.connected !== false && !player.disconnectedAt) {
      changed = true;
      newMessages.push({
        player: 'system',
        color: '#ff8800',
        content: i18n.t('game:system.player_disconnecting', {
          name: player.profile?.name,
          seconds: Math.round(graceMs / 1000),
        }),
        type: 'system',
        dayCount,
        chat: 'default',
      });
      return { ...player, disconnectedAt: now, connected: false };
    }

    if (isConnected && player.disconnectedAt) {
      changed = true;
      newMessages.push({
        player: 'system',
        color: '#78ff78',
        content: i18n.t('game:system.player_reconnected', { name: player.profile?.name }),
        type: 'system',
        dayCount,
        chat: 'default',
      });
      return { ...player, disconnectedAt: null, connected: true };
    }

    if (
      !isConnected &&
      player.disconnectedAt &&
      now - player.disconnectedAt >= graceMs
    ) {
      changed = true;
      killedNotifs.push({
        type: 'disconnect',
        content: {
          chatMessage: i18n.t('game:system.player_disconnected', { name: player.profile?.name }),
        },
        displayed: false,
      });
      return { ...player, disconnectedAt: null, connected: false, isAlive: false };
    }

    return player;
  });

  return { updated, newMessages, killedNotifs, changed };
}

/**
 * Mark alive, connected players as AFK if their `lastActivityAt` is older
 * than `timeoutMs`. Already-AFK players are left alone.
 */
export function resolveAFK({ players, now, dayCount, timeoutMs }) {
  const newMessages = [];
  let changed = false;

  const updated = (players || []).map((player) => {
    if (!player.isAlive || player.connected === false) return player;
    if (player.isAFK) return player;
    if (!player.lastActivityAt) return player;
    if (now - player.lastActivityAt > timeoutMs) {
      // Silently flip the AFK flag — the player roster already shows
      // an "AFK" badge next to the name, so spamming the chat with
      // "X est inactif..." just adds noise players can't act on.
      changed = true;
      return { ...player, isAFK: true };
    }
    return player;
  });

  return { updated, newMessages, changed };
}
