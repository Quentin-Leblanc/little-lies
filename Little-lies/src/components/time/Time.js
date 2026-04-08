import { motion, AnimatePresence } from 'framer-motion';
import { useGameEngine } from '../../hooks/useGameEngine';
import './Time.scss';
import { useEffect, useState } from 'react';

// Phases that are purely informational — no countdown needed
const INFO_PHASES = ['DEATH_REPORT', 'LAST_WORDS', 'EXECUTION', 'NO_LYNCH', 'SPARED'];

const Time = () => {
  const {
    game: { isDay, timer, dayCount, phase, adminFreeRoam },
    CONSTANTS,
  } = useGameEngine();

  const isInfoPhase = INFO_PHASES.includes(phase);
  const isPaused = !!adminFreeRoam;
  const totalDuration = CONSTANTS.DURATIONS[phase] || 30000;
  const phaseLabel = CONSTANTS.PHASE_LABELS[phase] || phase;

  const [localTimer, setLocalTimer] = useState(timer);
  const timeRemaining = Math.floor(localTimer / 1000);
  const progressPercentage = (localTimer / totalDuration) * 100;

  useEffect(() => {
    // Freeze countdown when admin pauses
    if (isPaused) return;
    const interval = setInterval(() => {
      setLocalTimer((prevTimer) => Math.max(prevTimer - 100, 0));
    }, 100);
    return () => clearInterval(interval);
  }, [isPaused]);

  useEffect(() => {
    setLocalTimer(timer);
  }, [timer]);

  let barColor;
  if (progressPercentage <= 25) {
    barColor = '#ff4757';
  } else if (progressPercentage <= 55) {
    barColor = '#ffa502';
  } else {
    barColor = '#44cc44';
  }

  const phaseIcon = isDay ? 'fa-sun' : 'fa-moon';
  const dayNightLabel = `${isDay ? 'Jour' : 'Nuit'} ${dayCount}`;
  const headerText = isDay ? `${dayNightLabel} — ${phaseLabel}` : dayNightLabel;

  // Phase-colored background
  const PHASE_COLORS = {
    DISCUSSION: 'rgba(40, 120, 40, 0.7)',
    VOTING: 'rgba(140, 90, 20, 0.7)',
    DEFENSE: 'rgba(140, 40, 40, 0.7)',
    JUDGMENT: 'rgba(80, 40, 120, 0.7)',
    NIGHT: 'rgba(20, 20, 60, 0.7)',
  };
  const phaseBg = PHASE_COLORS[phase] || 'rgba(0, 0, 0, 0.7)';

  return (
    <div className="time-container">
      {/* Day/Night label — top left */}
      <AnimatePresence mode="wait">
        <motion.div
          className="day-label"
          key={dayNightLabel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <i className={`fas ${phaseIcon}`}></i>
          {dayNightLabel}
        </motion.div>
      </AnimatePresence>
      {/* Phase + countdown — top right */}
      <div className="phase-info" style={{ background: phaseBg }}>
        <AnimatePresence mode="wait">
          <motion.div
            className="progress-content"
            key={phaseLabel}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {isPaused ? (
              <><i className="fas fa-pause"></i> PAUSE</>
            ) : (
              phaseLabel
            )}
          </motion.div>
        </AnimatePresence>
        {!isInfoPhase && !(dayCount === 1 && phase === 'DISCUSSION') && (
          <div className="timer">
            <motion.div
              key={localTimer}
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 1, color: barColor }}
              exit={{ opacity: 0.8 }}
              transition={{ duration: 0.5 }}
            >
              {timeRemaining}s
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
};

/** Progress bar — rendered inside the 3D scene container, hidden during info phases */
export const TimeBar = () => {
  const {
    game: { timer, phase, dayCount, adminFreeRoam },
    CONSTANTS,
  } = useGameEngine();

  const isPaused = !!adminFreeRoam;
  const [localTimer, setLocalTimer] = useState(timer);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setLocalTimer((prev) => Math.max(prev - 100, 0));
    }, 100);
    return () => clearInterval(interval);
  }, [isPaused]);

  useEffect(() => {
    setLocalTimer(timer);
  }, [timer]);

  // Hide bar during night, info phases, first day discussion
  const isFirstDayDiscussion = dayCount === 1 && phase === 'DISCUSSION';
  if (phase === 'NIGHT' || INFO_PHASES.includes(phase) || isFirstDayDiscussion) return null;

  // Calculate progress as countdown to night (not just current phase)
  // Day phases order: DISCUSSION → VOTING → (DEFENSE → JUDGMENT → ...)
  const DAY_PHASE_ORDER = ['DEATH_REPORT', 'DISCUSSION', 'VOTING', 'DEFENSE', 'JUDGMENT', 'LAST_WORDS', 'EXECUTION', 'NO_LYNCH', 'SPARED'];
  const currentIdx = DAY_PHASE_ORDER.indexOf(phase);
  // Time remaining in current phase
  const currentRemaining = localTimer;
  // Time remaining in upcoming phases until night
  let futureTime = 0;
  for (let i = currentIdx + 1; i < DAY_PHASE_ORDER.length; i++) {
    const p = DAY_PHASE_ORDER[i];
    if (p === 'DEFENSE' || p === 'JUDGMENT' || p === 'LAST_WORDS' || p === 'EXECUTION' || p === 'SPARED') break; // these are conditional
    futureTime += CONSTANTS.DURATIONS[p] || 0;
  }
  // Total day time (from DISCUSSION to end of VOTING = main day phases)
  const totalDayTime = (CONSTANTS.DURATIONS.DISCUSSION || 15000) + (CONSTANTS.DURATIONS.VOTING || 30000);
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
        style={{
          width: `${progressPercentage}%`,
          backgroundColor: barColor,
        }}
      />
    </div>
  );
};

export default Time;
