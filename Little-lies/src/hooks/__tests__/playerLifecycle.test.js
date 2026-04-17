import { resolveDisconnects, resolveAFK } from '../playerLifecycle';

const player = (id, overrides = {}) => ({
  id,
  profile: { name: id },
  isAlive: true,
  connected: true,
  ...overrides,
});

describe('resolveDisconnects', () => {
  test('no change when everyone is still connected', () => {
    const players = [player('a'), player('b')];
    const result = resolveDisconnects({
      players,
      connectedIds: new Set(['a', 'b']),
      now: 1000,
      dayCount: 1,
      graceMs: 30000,
    });
    expect(result.changed).toBe(false);
    expect(result.newMessages).toEqual([]);
    expect(result.killedNotifs).toEqual([]);
  });

  test('a drops → grace period starts', () => {
    const players = [player('a'), player('b')];
    const result = resolveDisconnects({
      players,
      connectedIds: new Set(['b']),
      now: 1000,
      dayCount: 2,
      graceMs: 30000,
    });
    expect(result.changed).toBe(true);
    expect(result.updated[0].connected).toBe(false);
    expect(result.updated[0].disconnectedAt).toBe(1000);
    expect(result.updated[0].isAlive).toBe(true);
    expect(result.newMessages).toHaveLength(1);
    expect(result.killedNotifs).toEqual([]);
  });

  test('returns within grace → reconnect and clear disconnectedAt', () => {
    const players = [player('a', { connected: false, disconnectedAt: 500 })];
    const result = resolveDisconnects({
      players,
      connectedIds: new Set(['a']),
      now: 10000, // 9.5s later — still within 30s grace
      dayCount: 2,
      graceMs: 30000,
    });
    expect(result.changed).toBe(true);
    expect(result.updated[0].connected).toBe(true);
    expect(result.updated[0].disconnectedAt).toBeNull();
    expect(result.updated[0].isAlive).toBe(true);
  });

  test('grace expires → kill player and emit disconnect notif', () => {
    const players = [player('a', { connected: false, disconnectedAt: 500 })];
    const result = resolveDisconnects({
      players,
      connectedIds: new Set(),
      now: 40000, // 39.5s after disconnect, grace is 30s
      dayCount: 3,
      graceMs: 30000,
    });
    expect(result.changed).toBe(true);
    expect(result.updated[0].isAlive).toBe(false);
    expect(result.updated[0].connected).toBe(false);
    expect(result.updated[0].disconnectedAt).toBeNull();
    expect(result.killedNotifs).toHaveLength(1);
    expect(result.killedNotifs[0].type).toBe('disconnect');
  });

  test('dead players are ignored', () => {
    const players = [player('a', { isAlive: false })];
    const result = resolveDisconnects({
      players,
      connectedIds: new Set(),
      now: 1000,
      dayCount: 1,
      graceMs: 30000,
    });
    expect(result.changed).toBe(false);
    expect(result.updated[0]).toBe(players[0]); // same reference
  });
});

describe('resolveAFK', () => {
  const TIMEOUT = 180000;

  test('no change when recent activity', () => {
    const players = [player('a', { lastActivityAt: 500 })];
    const result = resolveAFK({
      players,
      now: 1000,
      dayCount: 1,
      timeoutMs: TIMEOUT,
    });
    expect(result.changed).toBe(false);
  });

  test('marks inactive player AFK', () => {
    const players = [player('a', { lastActivityAt: 1000 })];
    const result = resolveAFK({
      players,
      now: 1000 + TIMEOUT + 1, // just past timeout
      dayCount: 2,
      timeoutMs: TIMEOUT,
    });
    expect(result.changed).toBe(true);
    expect(result.updated[0].isAFK).toBe(true);
    expect(result.newMessages).toHaveLength(1);
  });

  test('already AFK stays AFK (no duplicate message)', () => {
    const players = [player('a', { isAFK: true, lastActivityAt: 500 })];
    const result = resolveAFK({
      players,
      now: 1000 + TIMEOUT + 1,
      dayCount: 2,
      timeoutMs: TIMEOUT,
    });
    expect(result.changed).toBe(false);
    expect(result.newMessages).toEqual([]);
  });

  test('players without lastActivityAt get a grace period', () => {
    const players = [player('a')];
    const result = resolveAFK({
      players,
      now: 999999,
      dayCount: 3,
      timeoutMs: TIMEOUT,
    });
    expect(result.changed).toBe(false);
  });

  test('disconnected players ignored', () => {
    const players = [player('a', { connected: false, lastActivityAt: 500 })];
    const result = resolveAFK({
      players,
      now: 1000 + TIMEOUT + 1,
      dayCount: 1,
      timeoutMs: TIMEOUT,
    });
    expect(result.changed).toBe(false);
  });

  test('dead players ignored', () => {
    const players = [player('a', { isAlive: false, lastActivityAt: 500 })];
    const result = resolveAFK({
      players,
      now: 1000 + TIMEOUT + 1,
      dayCount: 1,
      timeoutMs: TIMEOUT,
    });
    expect(result.changed).toBe(false);
  });
});
