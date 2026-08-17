import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../../hooks/useGameEngine';
import Audio from '../../utils/AudioManager';
import './Time.scss';
import { useEffect, useRef, useState } from 'react';

// Big "5… 4… 3… 2… 1" overlay that pops in during the last 5 seconds of
// VOTING. Unchanged from the original Time HUD — just kept local to this
// file so the redesigned pill bar keeps the late-voting drama.
const FINAL_FIVE_COLORS = {
  5: '#ffcf4b',
  4: '#ff9f43',
  3: '#ff7a3d',
  2: '#ff5252',
  1: '#ff3344',
};
// Grows as the clock runs out: 5 is a discreet reminder, 1 fills the
// screen. The old version jumped straight to full size at 5, which read
// as an alarm going off rather than time draining away.
const FINAL_FIVE_SCALE = { 5: 0.5, 4: 0.62, 3: 0.76, 2: 0.9, 1: 1.08 };

const FinalFiveCountdown = ({ active, timeRemaining }) => {
  const color = FINAL_FIVE_COLORS[timeRemaining] || '#ff5252';
  const scale = FINAL_FIVE_SCALE[timeRemaining] || 1;
  const rgb = color.replace('#', '');
  const r = parseInt(rgb.substring(0, 2), 16);
  const g = parseInt(rgb.substring(2, 4), 16);
  const b = parseInt(rgb.substring(4, 6), 16);
  const textShadow = `
    0 0 16px rgba(${r}, ${g}, ${b}, 0.6),
    0 0 36px rgba(${r}, ${g}, ${b}, 0.35),
    0 4px 18px rgba(0, 0, 0, 0.85)
  `;
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key={`finalfive-${timeRemaining}`}
          className="final-five-countdown"
          style={{ color, textShadow }}
          // x: '-50%' does the horizontal centring here rather than in
          // CSS — motion composes its own transform and would discard a
          // stylesheet translateX.
          initial={{ opacity: 0, scale: scale * 0.75, x: '-50%', y: -8 }}
          animate={{ opacity: 1, scale, x: '-50%', y: 0 }}
          exit={{ opacity: 0, scale: scale * 1.3, x: '-50%', y: 4 }}
          transition={{ duration: 0.42, ease: [0.2, 0.9, 0.3, 1.1] }}
        >
          {timeRemaining}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Format ms → "m:ss" for the mid-pill timer.
const formatMs = (ms) => {
  const total = Math.max(Math.floor(ms / 1000), 0);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const Time = () => {
  const { t } = useTranslation(['game', 'common']);
  const {
    game: { isDay, timer, dayCount, phase, adminFreeRoam, phaseStartedAt },
    CONSTANTS,
    getPlayers,
  } = useGameEngine();

  const players = getPlayers();
  const aliveCount = players.filter((p) => p.isAlive && !p.isSpectator).length;
  const totalCount = players.filter((p) => !p.isSpectator).length;

  const isInfoPhase = CONSTANTS.INFO_PHASES?.includes(phase) || false;
  const isPaused = !!adminFreeRoam;
  const totalDuration = CONSTANTS.DURATIONS[phase] || 30000;

  const [localTimer, setLocalTimer] = useState(timer);
  const timeRemaining = Math.floor(localTimer / 1000);

  useEffect(() => {
    if (isPaused) return;
    if (phaseStartedAt) {
      const elapsed = Date.now() - phaseStartedAt;
      const remaining = Math.max(totalDuration - elapsed, 0);
      setLocalTimer(remaining);
    } else {
      setLocalTimer(timer);
    }
  }, [phaseStartedAt, timer, totalDuration, isPaused]);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setLocalTimer((prev) => Math.max(prev - 100, 0));
    }, 100);
    return () => clearInterval(interval);
  }, [isPaused, phase]);

  // Audible warning on the last three seconds, so a player who looked
  // away doesn't lose an un-taken action. Keyed on "phase + second" so
  // the 100ms interval above can't fire the same second twice and a
  // phase change re-arms it cleanly.
  //
  // Declared here, above the cinematic early-return: a hook after a
  // conditional return changes the hook order between renders and React
  // throws the moment the intro ends.
  const lastBeepRef = useRef(null);
  useEffect(() => {
    if (isPaused || isInfoPhase) return;
    const secs = Math.floor(localTimer / 1000);
    if (secs > 3 || secs < 1) return;
    const stamp = `${phase}-${secs}`;
    if (lastBeepRef.current === stamp) return;
    lastBeepRef.current = stamp;
    Audio.playCountdownTick(secs);
  }, [localTimer, phase, isPaused, isInfoPhase]);

  // Opening cinematic: no UI.
  if (phase === CONSTANTS.PHASE.INTRO_CINEMATIC) return null;

  // Day 1 used to hide its countdown. The clock ran anyway — the host
  // tick decrements it and flips to VOTING at zero — so the first
  // discussion simply ended without warning. A running clock you can't
  // see is worse than no clock: the only phases without a countdown are
  // the ones that genuinely have no deadline (info beats).
  const showCountdown = !isInfoPhase;

  // Middle pill label — "DAY 2 · 0:42" or "NIGHT 02 · 0:42" with a
  // zero-padded night count to mirror the mockup's typography. Paused
  // games collapse to a "PAUSE" token so the host knows the clock
  // isn't running.
  const phaseLabel = t(`game:phases.${phase}`, { defaultValue: phase });
  const dayNightKey = isDay ? 'day' : 'night';
  const dayNightShort = t(`common:${dayNightKey}`, { defaultValue: dayNightKey }).toUpperCase();
  const dayNumberText = isDay ? `${dayCount}` : dayCount.toString().padStart(2, '0');
  const midLabel = isPaused ? 'PAUSE' : `${dayNightShort} ${dayNumberText}`;

  // The last five seconds of ANY phase with a deadline, not just voting:
  // a night action left untaken is lost exactly the same way a vote is.
  const isFinalFive = showCountdown && !isPaused && timeRemaining > 0 && timeRemaining <= 5;
  const urgentClass = isFinalFive ? 'is-urgent' : '';

  // Dramatic phases get a one-shot color flash + persistent tinted border on
  // the phase pill — replaces the giant center "phase banner" overlay that
  // used to fight the HUD for the player's attention. The `key` on the
  // motion element forces a remount on phase change so the CSS entry
  // animation fires fresh each transition.
  const dramaticPhaseClass = phase ? `time-pill--phase-${phase.toLowerCase()}` : '';

  return (
    <div className="time-hud">
      {/* Pill 1 — phase name + seconds left, side by side. The countdown
          lives here: "what's happening" and "how long have I got" are
          one question and belong in one place.

          NO opacity animation anywhere in this HUD. The old version
          wrapped the timer pill in AnimatePresence keyed on a label
          containing the seconds, so it unmounted and remounted every
          single tick — that was the once-a-second blink. The phase pill
          is now a plain element that simply stays on screen; the
          phase-change cue is the CSS colour flash below
          (.time-pill--phase-*), which fires once and never touches
          opacity. */}
      <div
        key={`phase-pill-${phase}`}
        className={`time-pill time-pill--phase ${dramaticPhaseClass} ${urgentClass}`}
      >
        <i className="fas fa-book" aria-hidden="true"></i>
        <span className="time-pill__label">{phaseLabel}</span>
        {showCountdown && !isPaused && (
          <span className="time-pill__seconds">{formatMs(localTimer)}</span>
        )}
      </div>

      {/* Pill 2 — day / night counter. Static: no per-second key. */}
      <div className="time-pill time-pill--timer">
        <i
          className={`fas ${isPaused ? 'fa-pause' : (isDay ? 'fa-sun' : 'fa-moon')}`}
          aria-hidden="true"
        ></i>
        <span className="time-pill__label">{midLabel}</span>
      </div>

      {/* Pill 3 — alive / total */}
      <div className="time-pill">
        <i className="fas fa-users" aria-hidden="true"></i>
        <span className="time-pill__label">{aliveCount}<span className="time-pill__slash"> / </span>{totalCount}</span>
      </div>

      <FinalFiveCountdown active={isFinalFive} timeRemaining={timeRemaining} />
    </div>
  );
};

export default Time;
