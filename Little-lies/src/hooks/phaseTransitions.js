/**
 * Pure phase-transition rules — no React, no networking, no side effects.
 * Extracted from useGameEngine.transitionPhase so the transition table can
 * be tested exhaustively without mocking PlayroomKit or Events.
 *
 * The function returns a *plain description* of what should happen:
 *   {
 *     gameDelta,     // partial game state to merge (phase, timer, etc.)
 *     sideEffects,   // ordered list of imperative actions the host runs
 *   }
 *
 * sideEffect kinds — keep tight, extend as needed:
 *   - { kind: 'resetTrial' }
 *   - { kind: 'addEvent', event: { type, content, displayed } }
 *   - { kind: 'executeAccused' }
 *   - { kind: 'addChat', content, color }
 *   - { kind: 'endGameIfWinner' }  // check again after execution
 *
 * Callers apply the side effects in order and then setGame(gameDelta).
 */

export function computeNextPhase(currentPhase, context) {
  const {
    game,
    trial,
    accusedIfMajority,       // result of checkVotingMajority on sanitized trial
    judgmentResult,          // { innocentCount, guiltyCount, isGuilty } from resolveJudgment, or null
    PHASE,
    DURATIONS,
    MAX_TRIALS_PER_DAY,
    t,                       // i18n translator function
  } = context;

  const dur = (k) => DURATIONS[k] ?? 0;

  switch (currentPhase) {
    // One-shot opening cinematic at game start. The intro is Night 0
    // narratively — startGame() seeds dayCount=0 / isDay=false so the
    // cinematic reads as "players arriving under moonlight". When it
    // ends we flip to Day 1 proper: bump dayCount to 1 and isDay=true.
    case PHASE.INTRO_CINEMATIC:
      return {
        gameDelta: {
          phase: PHASE.DISCUSSION,
          timer: dur('DISCUSSION'),
          isDay: true,
          dayCount: 1,
        },
        sideEffects: [],
      };

    case PHASE.NIGHT:
      return {
        gameDelta: {
          phase: PHASE.DEATH_REPORT,
          timer: dur('DEATH_REPORT'),
          isDay: true,
          dayCount: (game?.dayCount || 0) + 1,
          trialsToday: 0,
          accusedId: null,
          skipVotes: [],
        },
        sideEffects: [],
      };

    case PHASE.DEATH_REPORT:
      return {
        gameDelta: { phase: PHASE.DISCUSSION, timer: dur('DISCUSSION') },
        sideEffects: [],
      };

    case PHASE.DISCUSSION:
      return {
        gameDelta: { phase: PHASE.VOTING, timer: dur('VOTING'), skipVotes: [] },
        sideEffects: [{ kind: 'resetTrial' }],
      };

    case PHASE.VOTING: {
      const canGoToTrial = accusedIfMajority && (game?.trialsToday || 0) < MAX_TRIALS_PER_DAY;
      if (canGoToTrial) {
        return {
          gameDelta: {
            phase: PHASE.DEFENSE,
            timer: dur('DEFENSE'),
            accusedId: accusedIfMajority,
            trialsToday: (game?.trialsToday || 0) + 1,
          },
          sideEffects: [],
        };
      }
      return {
        gameDelta: {
          phase: PHASE.NO_LYNCH,
          timer: dur('NO_LYNCH'),
          accusedId: null,
        },
        sideEffects: [
          { kind: 'addEvent', event: { type: 'NO_LYNCH', content: { chatMessage: '' }, displayed: true } },
          { kind: 'resetTrial' },
        ],
      };
    }

    case PHASE.NO_LYNCH:
      return {
        gameDelta: { phase: PHASE.NIGHT_TRANSITION, timer: dur('NIGHT_TRANSITION'), accusedId: null },
        sideEffects: [],
      };

    case PHASE.NIGHT_TRANSITION:
      return {
        gameDelta: { phase: PHASE.NIGHT, timer: dur('NIGHT'), isDay: false },
        sideEffects: [],
      };

    case PHASE.DEFENSE:
      return {
        gameDelta: { phase: PHASE.JUDGMENT, timer: dur('JUDGMENT') },
        // DEFENSE→JUDGMENT clears votes but keeps suspects for the UI;
        // the caller does setTrial({ ...trial, votes: {} }) itself (it
        // needs live `trial` ref that this pure function doesn't hold).
        sideEffects: [{ kind: 'clearVotesKeepSuspects' }],
      };

    case PHASE.JUDGMENT: {
      const isGuilty = !!judgmentResult?.isGuilty;
      const innocentCount = judgmentResult?.innocentCount ?? 0;
      const guiltyCount = judgmentResult?.guiltyCount ?? 0;
      const resultMsg = isGuilty
        ? (t ? t('game:system.judgment_guilty', { guilty: guiltyCount, innocent: innocentCount }) : '')
        : (t ? t('game:system.judgment_acquitted', { guilty: guiltyCount, innocent: innocentCount }) : '');
      const sideEffects = [
        { kind: 'addChat', content: resultMsg, color: isGuilty ? '#ff4444' : '#78ff78' },
        { kind: 'addEvent', event: { type: 'JUDGMENT_RESULT', content: { chatMessage: resultMsg }, displayed: true } },
      ];
      if (isGuilty) {
        return {
          gameDelta: { phase: PHASE.LAST_WORDS, timer: dur('LAST_WORDS') },
          sideEffects,
        };
      }
      return {
        gameDelta: { phase: PHASE.SPARED, timer: dur('SPARED') },
        sideEffects,
      };
    }

    case PHASE.SPARED:
      return {
        gameDelta: { phase: PHASE.NIGHT_TRANSITION, timer: dur('NIGHT_TRANSITION'), accusedId: null },
        sideEffects: [{ kind: 'resetTrial' }],
      };

    case PHASE.LAST_WORDS:
      return {
        gameDelta: { phase: PHASE.EXECUTION, timer: dur('EXECUTION') },
        sideEffects: [],
      };

    case PHASE.EXECUTION:
      // accusedId is preserved so EXECUTION_REVEAL can show the lynched role.
      return {
        gameDelta: { phase: PHASE.EXECUTION_REVEAL, timer: dur('EXECUTION_REVEAL') },
        sideEffects: [
          { kind: 'executeAccused' },
          { kind: 'endGameIfWinner' },
          { kind: 'resetTrial' },
        ],
      };

    case PHASE.EXECUTION_REVEAL:
      return {
        gameDelta: { phase: PHASE.NIGHT_TRANSITION, timer: dur('NIGHT_TRANSITION'), accusedId: null },
        sideEffects: [],
      };

    default:
      return { gameDelta: {}, sideEffects: [] };
  }
}
