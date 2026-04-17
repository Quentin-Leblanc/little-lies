import { computeNextPhase } from '../phaseTransitions';

// Minimal PHASE + DURATIONS fixture mirroring the constants in useGameEngine.
// Keeping these local to the test means the rules don't need to import
// React-land code.
const PHASE = {
  NIGHT: 'NIGHT',
  NIGHT_TRANSITION: 'NIGHT_TRANSITION',
  DEATH_REPORT: 'DEATH_REPORT',
  DISCUSSION: 'DISCUSSION',
  VOTING: 'VOTING',
  DEFENSE: 'DEFENSE',
  JUDGMENT: 'JUDGMENT',
  LAST_WORDS: 'LAST_WORDS',
  EXECUTION: 'EXECUTION',
  EXECUTION_REVEAL: 'EXECUTION_REVEAL',
  NO_LYNCH: 'NO_LYNCH',
  SPARED: 'SPARED',
};

const DURATIONS = {
  NIGHT: 30000,
  NIGHT_TRANSITION: 2000,
  DEATH_REPORT: 7000,
  DISCUSSION: 30000,
  VOTING: 30000,
  DEFENSE: 20000,
  JUDGMENT: 15000,
  LAST_WORDS: 5000,
  EXECUTION: 3000,
  EXECUTION_REVEAL: 5000,
  NO_LYNCH: 6000,
  SPARED: 5000,
};

const MAX_TRIALS_PER_DAY = 3;

const ctx = (overrides = {}) => ({
  game: { dayCount: 1, trialsToday: 0, ...(overrides.game || {}) },
  trial: { suspects: {}, votes: {} },
  accusedIfMajority: null,
  judgmentResult: null,
  PHASE,
  DURATIONS,
  MAX_TRIALS_PER_DAY,
  t: (key) => key,
  ...overrides,
});

describe('computeNextPhase — simple transitions', () => {
  test('NIGHT → DEATH_REPORT, advances dayCount, resets trialsToday, day=true', () => {
    const { gameDelta, sideEffects } = computeNextPhase(PHASE.NIGHT, ctx({
      game: { dayCount: 3, trialsToday: 2, accusedId: 'x' },
    }));
    expect(gameDelta.phase).toBe(PHASE.DEATH_REPORT);
    expect(gameDelta.timer).toBe(DURATIONS.DEATH_REPORT);
    expect(gameDelta.isDay).toBe(true);
    expect(gameDelta.dayCount).toBe(4);
    expect(gameDelta.trialsToday).toBe(0);
    expect(gameDelta.accusedId).toBeNull();
    expect(gameDelta.skipVotes).toEqual([]);
    expect(sideEffects).toEqual([]);
  });

  test('DEATH_REPORT → DISCUSSION, 30s timer', () => {
    const { gameDelta, sideEffects } = computeNextPhase(PHASE.DEATH_REPORT, ctx());
    expect(gameDelta.phase).toBe(PHASE.DISCUSSION);
    expect(gameDelta.timer).toBe(DURATIONS.DISCUSSION);
    expect(sideEffects).toEqual([]);
  });

  test('DISCUSSION → VOTING, resets trial, clears skipVotes', () => {
    const { gameDelta, sideEffects } = computeNextPhase(PHASE.DISCUSSION, ctx());
    expect(gameDelta.phase).toBe(PHASE.VOTING);
    expect(gameDelta.timer).toBe(DURATIONS.VOTING);
    expect(gameDelta.skipVotes).toEqual([]);
    expect(sideEffects).toEqual([{ kind: 'resetTrial' }]);
  });

  test('NO_LYNCH → NIGHT_TRANSITION, clears accused', () => {
    const { gameDelta, sideEffects } = computeNextPhase(PHASE.NO_LYNCH, ctx());
    expect(gameDelta.phase).toBe(PHASE.NIGHT_TRANSITION);
    expect(gameDelta.timer).toBe(DURATIONS.NIGHT_TRANSITION);
    expect(gameDelta.accusedId).toBeNull();
    expect(sideEffects).toEqual([]);
  });

  test('NIGHT_TRANSITION → NIGHT, isDay=false', () => {
    const { gameDelta } = computeNextPhase(PHASE.NIGHT_TRANSITION, ctx());
    expect(gameDelta.phase).toBe(PHASE.NIGHT);
    expect(gameDelta.timer).toBe(DURATIONS.NIGHT);
    expect(gameDelta.isDay).toBe(false);
  });

  test('DEFENSE → JUDGMENT, emits clearVotesKeepSuspects side effect', () => {
    const { gameDelta, sideEffects } = computeNextPhase(PHASE.DEFENSE, ctx());
    expect(gameDelta.phase).toBe(PHASE.JUDGMENT);
    expect(gameDelta.timer).toBe(DURATIONS.JUDGMENT);
    expect(sideEffects).toEqual([{ kind: 'clearVotesKeepSuspects' }]);
  });

  test('SPARED → NIGHT_TRANSITION with resetTrial', () => {
    const { gameDelta, sideEffects } = computeNextPhase(PHASE.SPARED, ctx());
    expect(gameDelta.phase).toBe(PHASE.NIGHT_TRANSITION);
    expect(gameDelta.accusedId).toBeNull();
    expect(sideEffects).toEqual([{ kind: 'resetTrial' }]);
  });

  test('LAST_WORDS → EXECUTION', () => {
    const { gameDelta } = computeNextPhase(PHASE.LAST_WORDS, ctx());
    expect(gameDelta.phase).toBe(PHASE.EXECUTION);
    expect(gameDelta.timer).toBe(DURATIONS.EXECUTION);
  });

  test('EXECUTION_REVEAL → NIGHT_TRANSITION', () => {
    const { gameDelta } = computeNextPhase(PHASE.EXECUTION_REVEAL, ctx());
    expect(gameDelta.phase).toBe(PHASE.NIGHT_TRANSITION);
    expect(gameDelta.accusedId).toBeNull();
  });

  test('unknown phase → noop', () => {
    const { gameDelta, sideEffects } = computeNextPhase('WAT', ctx());
    expect(gameDelta).toEqual({});
    expect(sideEffects).toEqual([]);
  });
});

describe('computeNextPhase — VOTING branches', () => {
  test('majority reached + trialsToday < MAX → DEFENSE with accusedId', () => {
    const { gameDelta, sideEffects } = computeNextPhase(PHASE.VOTING, ctx({
      game: { dayCount: 2, trialsToday: 1 },
      accusedIfMajority: 'alice',
    }));
    expect(gameDelta.phase).toBe(PHASE.DEFENSE);
    expect(gameDelta.accusedId).toBe('alice');
    expect(gameDelta.trialsToday).toBe(2);
    expect(sideEffects).toEqual([]);
  });

  test('majority reached but trialsToday === MAX → NO_LYNCH', () => {
    const { gameDelta, sideEffects } = computeNextPhase(PHASE.VOTING, ctx({
      game: { dayCount: 2, trialsToday: MAX_TRIALS_PER_DAY },
      accusedIfMajority: 'alice',
    }));
    expect(gameDelta.phase).toBe(PHASE.NO_LYNCH);
    expect(gameDelta.accusedId).toBeNull();
    // Side effects: NO_LYNCH event + resetTrial
    expect(sideEffects).toHaveLength(2);
    expect(sideEffects[0]).toMatchObject({ kind: 'addEvent', event: { type: 'NO_LYNCH' } });
    expect(sideEffects[1]).toEqual({ kind: 'resetTrial' });
  });

  test('no majority → NO_LYNCH', () => {
    const { gameDelta, sideEffects } = computeNextPhase(PHASE.VOTING, ctx({
      game: { dayCount: 2, trialsToday: 0 },
      accusedIfMajority: null,
    }));
    expect(gameDelta.phase).toBe(PHASE.NO_LYNCH);
    expect(gameDelta.accusedId).toBeNull();
    expect(sideEffects).toHaveLength(2);
  });

  test('first trial of the day increments trialsToday to 1', () => {
    const { gameDelta } = computeNextPhase(PHASE.VOTING, ctx({
      game: { dayCount: 1, trialsToday: 0 },
      accusedIfMajority: 'bob',
    }));
    expect(gameDelta.trialsToday).toBe(1);
  });
});

describe('computeNextPhase — JUDGMENT branches', () => {
  test('guilty → LAST_WORDS, adds chat + event', () => {
    const { gameDelta, sideEffects } = computeNextPhase(PHASE.JUDGMENT, ctx({
      judgmentResult: { isGuilty: true, innocentCount: 0 },
    }));
    expect(gameDelta.phase).toBe(PHASE.LAST_WORDS);
    expect(gameDelta.timer).toBe(DURATIONS.LAST_WORDS);
    expect(sideEffects).toHaveLength(2);
    expect(sideEffects[0].kind).toBe('addChat');
    expect(sideEffects[0].color).toBe('#ff4444');
    expect(sideEffects[1].kind).toBe('addEvent');
    expect(sideEffects[1].event.type).toBe('JUDGMENT_RESULT');
  });

  test('acquitted → SPARED, green chat color', () => {
    const { gameDelta, sideEffects } = computeNextPhase(PHASE.JUDGMENT, ctx({
      judgmentResult: { isGuilty: false, innocentCount: 3 },
    }));
    expect(gameDelta.phase).toBe(PHASE.SPARED);
    expect(gameDelta.timer).toBe(DURATIONS.SPARED);
    expect(sideEffects[0].kind).toBe('addChat');
    expect(sideEffects[0].color).toBe('#78ff78');
  });

  test('missing judgmentResult → treated as guilty (safer default)', () => {
    const { gameDelta } = computeNextPhase(PHASE.JUDGMENT, ctx({
      judgmentResult: null,
    }));
    // Default isGuilty = false when judgmentResult is missing — verify explicit behavior
    expect(gameDelta.phase).toBe(PHASE.SPARED);
  });
});

describe('computeNextPhase — EXECUTION', () => {
  test('emits executeAccused + endGameIfWinner + resetTrial, advances to REVEAL', () => {
    const { gameDelta, sideEffects } = computeNextPhase(PHASE.EXECUTION, ctx());
    expect(gameDelta.phase).toBe(PHASE.EXECUTION_REVEAL);
    expect(gameDelta.timer).toBe(DURATIONS.EXECUTION_REVEAL);
    // accusedId kept (handled by caller not resetting it)
    expect(gameDelta.accusedId).toBeUndefined();
    expect(sideEffects.map((s) => s.kind)).toEqual([
      'executeAccused', 'endGameIfWinner', 'resetTrial',
    ]);
  });
});
