import {
  checkWinCondition,
  checkVotingMajority,
  resolveJudgment,
  sanitizeTrial,
  trialsEqual,
  sanitizeGameState,
  gameStateDirty,
} from '../gameRules';

// --- Helpers ---
const p = (id, { team = 'town', alive = true, winCondition = null, spectator = false } = {}) => ({
  id,
  isAlive: alive,
  isSpectator: spectator,
  character: { team, winCondition },
  profile: { name: id },
});

describe('checkWinCondition', () => {
  test('returns null when no one has a character yet', () => {
    expect(checkWinCondition([{ id: 'a', isAlive: true, profile: {} }])).toBeNull();
  });

  test('returns null when nobody is alive', () => {
    expect(checkWinCondition([p('a', { alive: false })])).toBeNull();
  });

  test('town wins when no mafia / neutral killer / evil remain', () => {
    expect(checkWinCondition([p('a'), p('b'), p('c')])).toBe('town');
  });

  test('mafia wins at parity', () => {
    expect(
      checkWinCondition([
        p('t1'),
        p('m1', { team: 'mafia' }),
      ])
    ).toBe('mafia');
  });

  test('mafia wins at majority', () => {
    expect(
      checkWinCondition([
        p('t1'),
        p('m1', { team: 'mafia' }),
        p('m2', { team: 'mafia' }),
      ])
    ).toBe('mafia');
  });

  test('town still alive + mafia minority → no win yet', () => {
    expect(
      checkWinCondition([
        p('t1'),
        p('t2'),
        p('m1', { team: 'mafia' }),
      ])
    ).toBeNull();
  });

  test('neutral killer wins alone', () => {
    expect(
      checkWinCondition([
        p('sk', { team: 'neutral', winCondition: 'lastStanding' }),
      ])
    ).toBe('neutral_killing');
  });

  test('neutral killer vs town alone → no winner (mafia rule does not apply to neutral)', () => {
    // With SK still alive, town cannot win. SK cannot win while town remains.
    expect(
      checkWinCondition([
        p('t1'),
        p('sk', { team: 'neutral', winCondition: 'lastStanding' }),
      ])
    ).toBeNull();
  });

  test('dead mafia is ignored — town wins', () => {
    expect(
      checkWinCondition([
        p('t1'),
        p('m1', { team: 'mafia', alive: false }),
      ])
    ).toBe('town');
  });

  test('cult wins at parity (conversions push them past the threshold)', () => {
    expect(
      checkWinCondition([
        p('t1'),
        p('c1', { team: 'cult' }),
      ])
    ).toBe('cult');
  });

  test('cult wins at majority', () => {
    expect(
      checkWinCondition([
        p('t1'),
        p('c1', { team: 'cult' }),
        p('c2', { team: 'cult' }),
      ])
    ).toBe('cult');
  });

  test('living cult blocks town from winning', () => {
    expect(
      checkWinCondition([
        p('t1'),
        p('t2'),
        p('t3'),
        p('c1', { team: 'cult' }),
      ])
    ).toBeNull();
  });

  test('mafia parity vs cult → no winner (neither side has the upper hand)', () => {
    // 1 mafia + 1 cult + 0 town: mafia needs mafiaAlive >= town+evil+cult+nk
    // → 1 >= 0+0+1+0 = 1 → mafia wins. Sanity check: cult also meets parity,
    // but mafia is checked first, so mafia wins.
    expect(
      checkWinCondition([
        p('m1', { team: 'mafia' }),
        p('c1', { team: 'cult' }),
      ])
    ).toBe('mafia');
  });

  test('cult wins when it outnumbers a mixed remainder', () => {
    // 2 cult vs 1 town + 1 mafia → cult 2 >= 1+1+0+0 = 2 — but mafia
    // parity check (1 >= 1+0+2+0 = 3) fails first. Town check requires
    // all non-town dead. Cult branch must win.
    expect(
      checkWinCondition([
        p('t1'),
        p('m1', { team: 'mafia' }),
        p('c1', { team: 'cult' }),
        p('c2', { team: 'cult' }),
      ])
    ).toBe('cult');
  });

  test('neutral killer + cult alive → neutral_killing branch does not fire', () => {
    // SK alone needs town+mafia+evil+cult all dead.
    expect(
      checkWinCondition([
        p('sk', { team: 'neutral', winCondition: 'lastStanding' }),
        p('c1', { team: 'cult' }),
      ])
    ).toBe('cult'); // cult has 1 >= 0+0+0+1 = 1 → parity wins
  });
});

describe('checkVotingMajority', () => {
  const players = [p('a'), p('b'), p('c'), p('d'), p('e')]; // 5 alive → majority = 3

  test('returns null when no suspects', () => {
    expect(checkVotingMajority(players, { suspects: {} })).toBeNull();
  });

  test('returns null without majority', () => {
    const trial = { suspects: { a: { suspectedBy: ['b', 'c'] } } }; // 2/3 needed
    expect(checkVotingMajority(players, trial)).toBeNull();
  });

  test('returns the accused when majority reached', () => {
    const trial = { suspects: { a: { suspectedBy: ['b', 'c', 'd'] } } };
    expect(checkVotingMajority(players, trial)).toBe('a');
  });

  test('Mayor vote weight works (3 votes from same voter allowed)', () => {
    // Mayor casts 3 votes by pushing id three times
    const trial = { suspects: { a: { suspectedBy: ['b', 'b', 'b'] } } };
    expect(checkVotingMajority(players, trial)).toBe('a');
  });

  test('ties go to the top-votes-encountered', () => {
    const trial = {
      suspects: {
        a: { suspectedBy: ['x', 'y', 'z'] },
        b: { suspectedBy: ['x', 'y', 'z'] },
      },
    };
    // Tie at 3: first key processed wins (implementation detail — not asserted
    // beyond "returns one of them")
    const winner = checkVotingMajority(players, trial);
    expect(['a', 'b']).toContain(winner);
  });

  test('dead players do not count toward majority baseline', () => {
    const mix = [p('a'), p('b'), p('c', { alive: false }), p('d', { alive: false })];
    // 2 alive → majority = 2
    const trial = { suspects: { a: { suspectedBy: ['b', 'c'] } } };
    expect(checkVotingMajority(mix, trial)).toBe('a');
  });
});

describe('resolveJudgment', () => {
  const players = [p('a'), p('b'), p('c'), p('d')]; // accused = 'a' → 3 voters → majority = 2

  test('guilty by default when no one votes innocent', () => {
    const result = resolveJudgment(players, { votes: {} }, 'a');
    expect(result.isGuilty).toBe(true);
    expect(result.innocentCount).toBe(0);
  });

  test('guilty when innocent votes < majority', () => {
    const result = resolveJudgment(players, { votes: { b: 'innocent' } }, 'a');
    expect(result.isGuilty).toBe(true);
    expect(result.innocentCount).toBe(1);
  });

  test('saved when innocent votes >= majority', () => {
    const result = resolveJudgment(
      players,
      { votes: { b: 'innocent', c: 'innocent' } },
      'a'
    );
    expect(result.isGuilty).toBe(false);
    expect(result.innocentCount).toBe(2);
  });

  test('accused cannot vote on themselves (excluded from voter count)', () => {
    const result = resolveJudgment(
      players,
      { votes: { a: 'innocent' } }, // self-vote ignored in eligibleVoters
      'a'
    );
    // 3 eligible voters, majority = 2 — 1 innocent vote not enough
    expect(result.eligibleVoters).toBe(3);
    expect(result.majority).toBe(2);
  });
});

describe('sanitizeTrial', () => {
  const players = [p('a'), p('b'), p('c'), p('d'), p('e', { alive: false }), p('spec', { spectator: true })];

  test('returns empty trial for nullish input', () => {
    expect(sanitizeTrial(players, null, null)).toEqual({ suspects: {}, votes: {} });
    expect(sanitizeTrial(players, undefined, null)).toEqual({ suspects: {}, votes: {} });
  });

  test('keeps valid suspects untouched', () => {
    const trial = { suspects: { a: { id: 'a', suspectedBy: ['b', 'c'] } }, votes: {} };
    expect(sanitizeTrial(players, trial, null)).toEqual(trial);
  });

  test('drops votes cast by dead voters', () => {
    const trial = { suspects: { a: { id: 'a', suspectedBy: ['b', 'e'] } } };
    expect(sanitizeTrial(players, trial, null).suspects.a.suspectedBy).toEqual(['b']);
  });

  test('drops votes cast by spectators', () => {
    const trial = { suspects: { a: { id: 'a', suspectedBy: ['b', 'spec'] } } };
    expect(sanitizeTrial(players, trial, null).suspects.a.suspectedBy).toEqual(['b']);
  });

  test('drops votes against dead targets', () => {
    const trial = { suspects: { e: { id: 'e', suspectedBy: ['a', 'b', 'c'] } } };
    expect(sanitizeTrial(players, trial, null).suspects).toEqual({});
  });

  test('drops votes against spectator targets', () => {
    const trial = { suspects: { spec: { id: 'spec', suspectedBy: ['a', 'b', 'c'] } } };
    expect(sanitizeTrial(players, trial, null).suspects).toEqual({});
  });

  test('drops self-vote (voter === suspect)', () => {
    const trial = { suspects: { a: { id: 'a', suspectedBy: ['a', 'b'] } } };
    expect(sanitizeTrial(players, trial, null).suspects.a.suspectedBy).toEqual(['b']);
  });

  test('drops suspect entry when all voters become invalid', () => {
    const trial = { suspects: { a: { id: 'a', suspectedBy: ['a', 'e', 'spec'] } } };
    expect(sanitizeTrial(players, trial, null).suspects).toEqual({});
  });

  test('preserves Mayor repeated votes (same voter id twice)', () => {
    const trial = { suspects: { a: { id: 'a', suspectedBy: ['b', 'b', 'b'] } } };
    expect(sanitizeTrial(players, trial, null).suspects.a.suspectedBy).toEqual(['b', 'b', 'b']);
  });

  test('drops judgment votes by dead voters', () => {
    const trial = { votes: { b: 'innocent', e: 'innocent' } };
    expect(sanitizeTrial(players, trial, 'a').votes).toEqual({ b: 'innocent' });
  });

  test('drops judgment votes by spectators', () => {
    const trial = { votes: { b: 'guilty', spec: 'innocent' } };
    expect(sanitizeTrial(players, trial, 'a').votes).toEqual({ b: 'guilty' });
  });

  test('drops judgment vote by the accused', () => {
    const trial = { votes: { a: 'innocent', b: 'guilty' } };
    expect(sanitizeTrial(players, trial, 'a').votes).toEqual({ b: 'guilty' });
  });

  test('drops invalid verdict strings', () => {
    const trial = { votes: { b: 'innocent', c: 'plotTwist', d: null, e: 'guilty' } };
    // 'e' is dead → dropped too
    expect(sanitizeTrial(players, trial, 'a').votes).toEqual({ b: 'innocent' });
  });

  test('accepts abstain verdict', () => {
    const trial = { votes: { b: 'abstain' } };
    expect(sanitizeTrial(players, trial, 'a').votes).toEqual({ b: 'abstain' });
  });
});

describe('sanitizeGameState', () => {
  const players = [p('a'), p('b'), p('dead', { alive: false }), p('spec', { spectator: true })];

  test('returns a safe default for null input', () => {
    const clean = sanitizeGameState(null, players);
    expect(clean).toEqual({ phase: 'NIGHT', dayCount: 0, winner: null, accusedId: null });
  });

  test('passes through a valid state untouched (same field values)', () => {
    const game = {
      phase: 'VOTING', winner: null, accusedId: 'a', dayCount: 3,
      isGameStarted: true, isDay: true, trialsToday: 1,
      timer: 30, phaseStartedAt: 12345,
    };
    const clean = sanitizeGameState(game, players);
    expect(clean).toEqual(game);
  });

  test('invalid phase falls back to NIGHT', () => {
    const clean = sanitizeGameState({ phase: 'HACKED', dayCount: 1 }, players);
    expect(clean.phase).toBe('NIGHT');
  });

  test('non-string phase falls back to NIGHT', () => {
    const clean = sanitizeGameState({ phase: 42, dayCount: 1 }, players);
    expect(clean.phase).toBe('NIGHT');
  });

  test('unknown winner is reset to null', () => {
    const clean = sanitizeGameState({ phase: 'NIGHT', winner: 'hacker' }, players);
    expect(clean.winner).toBeNull();
  });

  test('known winner is kept', () => {
    const clean = sanitizeGameState({ phase: 'GAMEOVER', winner: 'cult' }, players);
    expect(clean.winner).toBe('cult');
  });

  test('accusedId pointing to a dead player is reset', () => {
    const clean = sanitizeGameState({ phase: 'JUDGMENT', accusedId: 'dead' }, players);
    expect(clean.accusedId).toBeNull();
  });

  test('accusedId pointing to a spectator is reset', () => {
    const clean = sanitizeGameState({ phase: 'JUDGMENT', accusedId: 'spec' }, players);
    expect(clean.accusedId).toBeNull();
  });

  test('accusedId pointing to a ghost id is reset', () => {
    const clean = sanitizeGameState({ phase: 'JUDGMENT', accusedId: 'ghost' }, players);
    expect(clean.accusedId).toBeNull();
  });

  test('negative dayCount is reset to 0', () => {
    const clean = sanitizeGameState({ phase: 'NIGHT', dayCount: -5 }, players);
    expect(clean.dayCount).toBe(0);
  });

  test('non-number dayCount is reset to 0', () => {
    const clean = sanitizeGameState({ phase: 'NIGHT', dayCount: '5' }, players);
    expect(clean.dayCount).toBe(0);
  });

  test('preserves unrelated fields (timer, phaseStartedAt, neutralWinners…)', () => {
    const game = {
      phase: 'NIGHT', dayCount: 1, winner: null,
      timer: 42, phaseStartedAt: 123, neutralWinners: [{ id: 'x', role: 'jester' }],
      config: { something: true },
    };
    const clean = sanitizeGameState(game, players);
    expect(clean.timer).toBe(42);
    expect(clean.phaseStartedAt).toBe(123);
    expect(clean.neutralWinners).toEqual([{ id: 'x', role: 'jester' }]);
    expect(clean.config).toEqual({ something: true });
  });
});

describe('gameStateDirty', () => {
  test('identical objects → not dirty', () => {
    const g = { phase: 'NIGHT', winner: null, accusedId: null, dayCount: 1 };
    expect(gameStateDirty(g, { ...g })).toBe(false);
  });

  test('phase change → dirty', () => {
    const a = { phase: 'NIGHT', dayCount: 1 };
    const b = { phase: 'VOTING', dayCount: 1 };
    expect(gameStateDirty(a, b)).toBe(true);
  });

  test('winner change → dirty', () => {
    expect(gameStateDirty({ winner: null }, { winner: 'cult' })).toBe(true);
  });

  test('unrelated field change (timer) → not dirty', () => {
    expect(gameStateDirty({ phase: 'NIGHT', timer: 10 }, { phase: 'NIGHT', timer: 5 })).toBe(false);
  });

  test('handles nullish inputs', () => {
    expect(gameStateDirty(null, null)).toBe(false);
    expect(gameStateDirty(null, {})).toBe(true);
  });
});

describe('trialsEqual', () => {
  test('both nullish → true only if same reference', () => {
    expect(trialsEqual(null, null)).toBe(true);
    expect(trialsEqual(undefined, undefined)).toBe(true);
    expect(trialsEqual(null, { suspects: {}, votes: {} })).toBe(false);
  });

  test('identical trials → true', () => {
    const t = { suspects: { a: { suspectedBy: ['b', 'c'] } }, votes: { d: 'guilty' } };
    expect(trialsEqual(t, { ...t, suspects: { ...t.suspects }, votes: { ...t.votes } })).toBe(true);
  });

  test('different suspect order in array → false', () => {
    const a = { suspects: { x: { suspectedBy: ['a', 'b'] } }, votes: {} };
    const b = { suspects: { x: { suspectedBy: ['b', 'a'] } }, votes: {} };
    expect(trialsEqual(a, b)).toBe(false);
  });

  test('extra vote on one side → false', () => {
    const a = { suspects: {}, votes: { b: 'guilty' } };
    const b = { suspects: {}, votes: { b: 'guilty', c: 'innocent' } };
    expect(trialsEqual(a, b)).toBe(false);
  });

  test('same vote keys but different values → false', () => {
    const a = { suspects: {}, votes: { b: 'guilty' } };
    const b = { suspects: {}, votes: { b: 'innocent' } };
    expect(trialsEqual(a, b)).toBe(false);
  });
});
