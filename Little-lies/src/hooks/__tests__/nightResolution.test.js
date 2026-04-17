import {
  resolveKillAttempts,
  filterResolvableEvents,
  computeExecutionerConversions,
  resolveConversions,
} from '../nightResolution';

const p = (id, {
  alive = true, defense = 0, team = 'town', key = 'villager', winCondition = null,
  executionerTarget = null,
} = {}) => ({
  id,
  isAlive: alive,
  isAFK: false,
  profile: { name: id },
  character: { key, team, defenseLevel: defense, winCondition },
  executionerTarget,
});

describe('resolveKillAttempts', () => {
  test('basic kill succeeds when attack > defense', () => {
    const players = [p('victim'), p('killer')];
    const attempts = [{ targetId: 'victim', attackerId: 'killer', attackLevel: 1, type: 'mafia' }];
    const { killed, survived } = resolveKillAttempts(attempts, { players });
    expect(killed.victim).toEqual({ attackerId: 'killer', type: 'mafia' });
    expect(survived.victim).toBeUndefined();
  });

  test('kill blocked when defense equals attack (attack must be strictly greater)', () => {
    const players = [p('victim', { defense: 1 }), p('killer')];
    const attempts = [{ targetId: 'victim', attackerId: 'killer', attackLevel: 1, type: 'mafia' }];
    const { killed, survived } = resolveKillAttempts(attempts, { players });
    expect(killed).toEqual({});
    expect(survived.victim).toBe('immune');
  });

  test('doctor heal (+1 defense bonus) blocks a basic attack', () => {
    const players = [p('victim'), p('killer')];
    const attempts = [{ targetId: 'victim', attackerId: 'killer', attackLevel: 1, type: 'mafia' }];
    const defenseBonus = { victim: 1 };
    const { killed, survived } = resolveKillAttempts(attempts, { players, defenseBonus });
    expect(killed).toEqual({});
    expect(survived.victim).toBe('protected');
  });

  test('powerful attack (2) bypasses basic defense + heal', () => {
    const players = [p('victim', { defense: 1 }), p('killer')];
    const attempts = [{ targetId: 'victim', attackerId: 'killer', attackLevel: 2, type: 'sk' }];
    const defenseBonus = { victim: 0 };
    const { killed } = resolveKillAttempts(attempts, { players, defenseBonus });
    expect(killed.victim).toBeDefined();
  });

  test('unstoppable attack (3) bypasses everything', () => {
    const players = [p('victim', { defense: 2 }), p('killer')];
    const attempts = [{ targetId: 'victim', attackerId: 'killer', attackLevel: 3, type: 'unstoppable' }];
    const defenseBonus = { victim: 1 }; // would total defense = 3
    const { killed, survived } = resolveKillAttempts(attempts, { players, defenseBonus });
    // attack 3 vs defense 3 → strictly greater fails → survives
    expect(killed).toEqual({});
    expect(survived.victim).toBeDefined();
  });

  test('jail: target immune to all attacks except jailor_execute', () => {
    const players = [p('victim'), p('killer'), p('jailor')];
    const attempts = [{ targetId: 'victim', attackerId: 'killer', attackLevel: 2, type: 'mafia' }];
    const jailedPlayers = { victim: 'jailor' };
    const { killed, survived } = resolveKillAttempts(attempts, { players, jailedPlayers });
    expect(killed).toEqual({});
    expect(survived.victim).toBe('jailed');
  });

  test('jailor_execute bypasses the jail immunity', () => {
    const players = [p('victim'), p('jailor')];
    const attempts = [{ targetId: 'victim', attackerId: 'jailor', attackLevel: 2, type: 'jailor_execute' }];
    const jailedPlayers = { victim: 'jailor' };
    const { killed } = resolveKillAttempts(attempts, { players, jailedPlayers });
    expect(killed.victim).toEqual({ attackerId: 'jailor', type: 'jailor_execute' });
  });

  test('bodyguard intercept: BG dies, attacker dies, target lives', () => {
    const players = [p('victim'), p('killer'), p('bg')];
    const attempts = [{ targetId: 'victim', attackerId: 'killer', attackLevel: 1, type: 'mafia' }];
    const bodyguardTargets = { victim: 'bg' };
    const { killed, survived } = resolveKillAttempts(attempts, { players, bodyguardTargets });
    expect(killed.bg).toEqual({ attackerId: 'killer', type: 'bodyguard_sacrifice' });
    expect(killed.killer).toEqual({ attackerId: 'bg', type: 'bodyguard_kill' });
    expect(killed.victim).toBeUndefined();
    expect(survived.victim).toBe('bodyguard');
  });

  test('dead bodyguard does NOT intercept (falls through to defense check)', () => {
    const players = [p('victim'), p('killer'), p('bg', { alive: false })];
    const attempts = [{ targetId: 'victim', attackerId: 'killer', attackLevel: 1, type: 'mafia' }];
    const bodyguardTargets = { victim: 'bg' };
    const { killed } = resolveKillAttempts(attempts, { players, bodyguardTargets });
    expect(killed.victim).toBeDefined(); // attack 1 > defense 0 → kill succeeds
    expect(killed.bg).toBeUndefined();
  });

  test('multiple attacks on same target: first kill recorded, subsequent ignored', () => {
    const players = [p('victim'), p('a'), p('b')];
    const attempts = [
      { targetId: 'victim', attackerId: 'a', attackLevel: 1, type: 'mafia' },
      { targetId: 'victim', attackerId: 'b', attackLevel: 2, type: 'sk' },
    ];
    const { killed } = resolveKillAttempts(attempts, { players });
    // First wins, second is ignored (target already dead in this pass)
    expect(killed.victim).toEqual({ attackerId: 'a', type: 'mafia' });
  });

  test('attack on dead target is ignored', () => {
    const players = [p('victim', { alive: false }), p('killer')];
    const attempts = [{ targetId: 'victim', attackerId: 'killer', attackLevel: 3, type: 'mafia' }];
    const { killed, survived } = resolveKillAttempts(attempts, { players });
    expect(killed).toEqual({});
    expect(survived).toEqual({});
  });

  test('unknown target id is ignored silently', () => {
    const players = [p('a')];
    const attempts = [{ targetId: 'ghost', attackerId: 'a', attackLevel: 3, type: 'mafia' }];
    const { killed } = resolveKillAttempts(attempts, { players });
    expect(killed).toEqual({});
  });

  test('jail + bodyguard: jail takes precedence (target safe, BG not consumed)', () => {
    const players = [p('victim'), p('killer'), p('bg'), p('jailor')];
    const attempts = [{ targetId: 'victim', attackerId: 'killer', attackLevel: 2, type: 'mafia' }];
    const jailedPlayers = { victim: 'jailor' };
    const bodyguardTargets = { victim: 'bg' };
    const { killed, survived } = resolveKillAttempts(attempts, {
      players, jailedPlayers, bodyguardTargets,
    });
    expect(killed).toEqual({});
    expect(survived.victim).toBe('jailed');
  });
});

describe('filterResolvableEvents', () => {
  const events = [
    { type: 'KILL', dayCount: 1, displayed: false, content: { by: 'a' } },
    { type: 'KILL', dayCount: 2, displayed: false, content: { by: 'b' } }, // wrong day
    { type: 'KILL', dayCount: 1, displayed: true,  content: { by: 'c' } }, // already displayed
    { type: 'KILL', dayCount: 1, displayed: false, content: { by: 'afk' } }, // AFK author
    { type: 'VEST', dayCount: 1, displayed: false, content: { by: 'a' } },
  ];

  test('keeps only events matching dayCount, undisplayed, non-AFK', () => {
    const result = filterResolvableEvents(events, {
      dayCount: 1, afkIds: new Set(['afk']),
    });
    expect(result).toHaveLength(2);
    expect(result.map((e) => e.type)).toEqual(['KILL', 'VEST']);
  });

  test('accepts afkIds as array', () => {
    const result = filterResolvableEvents(events, { dayCount: 1, afkIds: ['afk'] });
    expect(result).toHaveLength(2);
  });

  test('empty events → empty array', () => {
    expect(filterResolvableEvents([], { dayCount: 1, afkIds: [] })).toEqual([]);
    expect(filterResolvableEvents(null, { dayCount: 1 })).toEqual([]);
  });
});

describe('computeExecutionerConversions', () => {
  const exec = (id, target) => ({
    id,
    isAlive: true,
    character: { winCondition: 'getTargetLynched' },
    executionerTarget: target,
  });

  test('Executioner whose target died flips to Jester', () => {
    const players = [
      exec('exec1', 'victim'),
      p('victim'),
      p('unrelated'),
    ];
    const flips = computeExecutionerConversions(players, new Set(['victim']));
    expect(flips).toEqual({ exec1: true });
  });

  test('Executioner whose target is still alive does not flip', () => {
    const players = [exec('exec1', 'victim'), p('victim')];
    const flips = computeExecutionerConversions(players, new Set([]));
    expect(flips).toEqual({});
  });

  test('dead Executioner does not flip even if target dies', () => {
    const players = [
      { ...exec('exec1', 'victim'), isAlive: false },
      p('victim'),
    ];
    const flips = computeExecutionerConversions(players, new Set(['victim']));
    expect(flips).toEqual({});
  });

  test('non-Executioner players are ignored', () => {
    const players = [p('bob'), p('alice')];
    const flips = computeExecutionerConversions(players, new Set(['bob']));
    expect(flips).toEqual({});
  });

  test('accepts killedIds as array', () => {
    const players = [exec('exec1', 'victim'), p('victim')];
    const flips = computeExecutionerConversions(players, ['victim']);
    expect(flips).toEqual({ exec1: true });
  });
});

describe('resolveConversions', () => {
  const convert = (by, target) => ({
    type: 'CONVERT',
    content: { by, target },
  });

  test('empty events → no conversions, no failures', () => {
    const players = [p('a', { team: 'cult', key: 'cult_leader' }), p('b')];
    const result = resolveConversions([], { players });
    expect(result.convertedIds).toEqual({});
    expect(result.failures).toEqual([]);
  });

  test('basic conversion of a town villager succeeds', () => {
    const players = [
      p('leader', { team: 'cult', key: 'cult_leader' }),
      p('victim', { team: 'town' }),
    ];
    const result = resolveConversions([convert('leader', 'victim')], { players });
    expect(result.convertedIds.victim).toEqual({ by: 'leader' });
    expect(result.failures).toEqual([]);
  });

  test('mafia targets are immune (loyalty)', () => {
    const players = [
      p('leader', { team: 'cult', key: 'cult_leader' }),
      p('gf', { team: 'mafia', key: 'godfather' }),
    ];
    const result = resolveConversions([convert('leader', 'gf')], { players });
    expect(result.convertedIds).toEqual({});
    expect(result.failures).toEqual([
      { by: 'leader', reason: 'mafia_immune', targetId: 'gf' },
    ]);
  });

  test('night-immune targets (e.g. Serial Killer) are rejected', () => {
    const players = [
      p('leader', { team: 'cult', key: 'cult_leader' }),
      {
        id: 'sk',
        isAlive: true,
        isAFK: false,
        profile: { name: 'sk' },
        character: { key: 'serial_killer', team: 'neutral', nightImmune: true, defenseLevel: 1 },
      },
    ];
    const result = resolveConversions([convert('leader', 'sk')], { players });
    expect(result.convertedIds).toEqual({});
    expect(result.failures[0]).toMatchObject({ reason: 'night_immune', targetId: 'sk' });
  });

  test('jailed targets cannot be converted', () => {
    const players = [
      p('leader', { team: 'cult', key: 'cult_leader' }),
      p('victim'),
    ];
    const result = resolveConversions(
      [convert('leader', 'victim')],
      { players, jailedPlayers: { victim: 'jailor' } }
    );
    expect(result.convertedIds).toEqual({});
    expect(result.failures[0]).toMatchObject({ reason: 'target_jailed', targetId: 'victim' });
  });

  test('target killed earlier in the pass cannot be converted', () => {
    const players = [
      p('leader', { team: 'cult', key: 'cult_leader' }),
      p('victim'),
    ];
    const result = resolveConversions(
      [convert('leader', 'victim')],
      { players, killedThisNight: new Set(['victim']) }
    );
    expect(result.convertedIds).toEqual({});
    expect(result.failures[0]).toMatchObject({ reason: 'target_killed', targetId: 'victim' });
  });

  test('converter killed the same night fails silently', () => {
    const players = [
      p('leader', { team: 'cult', key: 'cult_leader' }),
      p('victim'),
    ];
    const result = resolveConversions(
      [convert('leader', 'victim')],
      { players, killedThisNight: new Set(['leader']) }
    );
    expect(result.convertedIds).toEqual({});
    expect(result.failures[0]).toMatchObject({ reason: 'converter_dead' });
  });

  test('roleblocked converter does not convert', () => {
    // Upstream filter in useEvents already strips roleblocked converter
    // events, but the pure function stays defensive.
    const players = [
      p('leader', { team: 'cult', key: 'cult_leader' }),
      p('victim'),
    ];
    const result = resolveConversions(
      [convert('leader', 'victim')],
      { players, roleblockedPlayers: { leader: true } }
    );
    expect(result.convertedIds).toEqual({});
    expect(result.failures[0]).toMatchObject({ reason: 'self_roleblocked' });
  });

  test('already-cult target is rejected defensively', () => {
    const players = [
      p('leader', { team: 'cult', key: 'cult_leader' }),
      p('mate', { team: 'cult', key: 'cult_member' }),
    ];
    const result = resolveConversions([convert('leader', 'mate')], { players });
    expect(result.convertedIds).toEqual({});
    expect(result.failures[0]).toMatchObject({ reason: 'already_cult', targetId: 'mate' });
  });

  test('dead converter (already dead before night) fails', () => {
    const players = [
      p('leader', { team: 'cult', key: 'cult_leader', alive: false }),
      p('victim'),
    ];
    const result = resolveConversions([convert('leader', 'victim')], { players });
    expect(result.convertedIds).toEqual({});
    expect(result.failures[0]).toMatchObject({ reason: 'converter_dead' });
  });

  test('dead target (already dead before night) fails', () => {
    const players = [
      p('leader', { team: 'cult', key: 'cult_leader' }),
      p('victim', { alive: false }),
    ];
    const result = resolveConversions([convert('leader', 'victim')], { players });
    expect(result.convertedIds).toEqual({});
    expect(result.failures[0]).toMatchObject({ reason: 'target_dead' });
  });

  test('multiple CONVERT events → last one wins (defensive, leader is unique)', () => {
    const players = [
      p('leader', { team: 'cult', key: 'cult_leader' }),
      p('a'),
      p('b'),
    ];
    const result = resolveConversions(
      [convert('leader', 'a'), convert('leader', 'b')],
      { players }
    );
    expect(result.convertedIds).toEqual({ b: { by: 'leader' } });
  });

  test('ignores non-CONVERT events', () => {
    const players = [p('leader', { team: 'cult' }), p('victim')];
    const result = resolveConversions(
      [{ type: 'KILL', content: { by: 'leader', target: 'victim' } }],
      { players }
    );
    expect(result.convertedIds).toEqual({});
    expect(result.failures).toEqual([]);
  });

  test('evil team targets (e.g. werewolves) are convertible', () => {
    const players = [
      p('leader', { team: 'cult', key: 'cult_leader' }),
      p('wolf', { team: 'evil' }),
    ];
    const result = resolveConversions([convert('leader', 'wolf')], { players });
    expect(result.convertedIds.wolf).toEqual({ by: 'leader' });
  });
});
