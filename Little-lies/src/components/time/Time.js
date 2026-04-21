import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../../hooks/useGameEngine';
import './Time.scss';
import { useEffect, useState } from 'react';

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
const FinalFiveCountdown = ({ phase, timeRemaining }) => {
  const active = phase === 'VOTING' && timeRemaining > 0 && timeRemaining <= 5;
  const color = FINAL_FIVE_COLORS[timeRemaining] || '#ff5252';
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
          initial={{ opacity: 0, scale: 0.6, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.4, y: 4 }}
          transition={{ duration: 0.45, ease: [0.2, 0.9, 0.3, 1.1] }}
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

  // Opening cinematic: no UI.
  if (phase === CONSTANTS.PHASE.INTRO_CINEMATIC) return null;

  const isFirstDayDiscussion = dayCount === 1 && phase === 'DISCUSSION';
  const showCountdown = !isInfoPhase && !isFirstDayDiscussion;

  // Middle pill label — "DAY 2 · 0:42" or "NIGHT 02 · 0:42" with a
  // zero-padded night count to mirror the mockup's typography. Paused
  // games collapse to a "PAUSE" token so the host knows the clock
  // isn't running.
  const phaseLabel = t(`game:phases.${phase}`, { defaultValue: phase });
  const dayNightKey = isDay ? 'day' : 'night';
  const dayNightShort = t(`common:${dayNightKey}`, { defaultValue: dayNightKey }).toUpperCase();
  const dayNumberText = isDay ? `${dayCount}` : dayCount.toString().padStart(2, '0');
  const midLabel = isPaused
    ? 'PAUSE'
    : (showCountdown ? `${dayNightShort} ${dayNumberText} · ${formatMs(localTimer)}` : `${dayNightShort} ${dayNumberText}`);

  // Final-five recoloring only applies in VOTING.
  const urgentClass = phase === 'VOTING' && timeRemaining > 0 && timeRemaining <= 5 ? 'is-urgent' : '';

  return (
    <div className="time-hud">
      {/* Pill 1 — day counter + phase name */}
      <div className="time-pill">
        <i className="fas fa-book" aria-hidden="true"></i>
        <span className="time-pill__label">{phaseLabel}</span>
      </div>

      {/* Pill 2 — day/night + countdown */}
      <AnimatePresence mode="wait">
        <motion.div
          className={`time-pill time-pill--timer ${urgentClass}`}
          key={midLabel}
          initial={{ opacity: 0.3 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0.3 }}
          transition={{ duration: 0.25 }}
        >
          <i
            className={`fas ${isPaused ? 'fa-pause' : (isDay ? 'fa-sun' : 'fa-moon')}`}
            aria-hidden="true"
          ></i>
          <span className="time-pill__label">{midLabel}</span>
        </motion.div>
      </AnimatePresence>

      {/* Pill 3 — alive / total */}
      <div className="time-pill">
        <i className="fas fa-users" aria-hidden="true"></i>
        <span className="time-pill__label">{aliveCount}<span className="time-pill__slash"> / </span>{totalCount}</span>
      </div>

      <FinalFiveCountdown phase={phase} timeRemaining={timeRemaining} />
    </div>
  );
};

/** Progress bar rendered inside the 3D scene container — kept intact. */
export const TimeBar = () => {
  const {
    game: { timer, phase, dayCount, adminFreeRoam, phaseStartedAt },
    CONSTANTS,
  } = useGameEngine();

  const isPaused = !!adminFreeRoam;
  const totalDuration = CONSTANTS.DURATIONS[phase] || 30000;
  const [localTimer, setLocalTimer] = useState(timer);

  useEffect(() => {
    if (isPaused) return;
    if (phaseStartedAt) {
      const elapsed = Date.now() - phaseStartedAt;
      setLocalTimer(Math.max(totalDuration - elapsed, 0));
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

  const isInfoPhase = CONSTANTS.INFO_PHASES?.includes(phase) || false;
  const isFirstDayDiscussion = dayCount === 1 && phase === 'DISCUSSION';
  if (phase === 'NIGHT' || phase === 'NIGHT_TRANSITION' || isInfoPhase || isFirstDayDiscussion) return null;

  const DAY_PHASE_ORDER = ['DEATH_REPORT', 'DISCUSSION', 'VOTING', 'DEFENSE', 'JUDGMENT', 'LAST_WORDS', 'EXECUTION', 'NO_LYNCH', 'SPARED'];
  const currentIdx = DAY_PHASE_ORDER.indexOf(phase);
  const currentRemaining = localTimer;
  let futureTime = 0;
  for (let i = currentIdx + 1; i < DAY_PHASE_ORDER.length; i++) {
    const p = DAY_PHASE_ORDER[i];
    if (p === 'DEFENSE' || p === 'JUDGMENT' || p === 'LAST_WORDS' || p === 'EXECUTION' || p === 'SPARED') break;
    futureTime += CONSTANTS.DURATIONS[p] || 0;
  }
  const totalDayTime = (CONSTANTS.DURATIONS.DISCUSSION || 30000) + (CONSTANTS.DURATIONS.VOTING || 30000);
  const totalRemaining = currentRemaining + futureTime;
  const progressPercentage = Math.min((totalRemaining / totalDayTime) * 100, 100);

  let barColor;
  if (progressPercentage <= 25) barColor = '#ff4757';
  else if (progressPercentage <= 55) barColor = '#ffa502';
  else barColor = '#44cc44';

  return (
    <div className="progress-bar-scene">
      <div
        className="progress-bar-fill"
        style={{ width: `${progressPercentage}%`, backgroundColor: barColor }}
      />
    </div>
  );
};

export default Time;
