import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../../hooks/useGameEngine';
import './Time.scss';
import { useEffect, useState } from 'react';

const Time = () => {
  const { t } = useTranslation(['game', 'common']);
  const {
    game: { isDay, timer, dayCount, phase, adminFreeRoam, phaseStartedAt },
    CONSTANTS,
  } = useGameEngine();

  const isInfoPhase = CONSTANTS.INFO_PHASES?.includes(phase) || false;
  const isPaused = !!adminFreeRoam;
  const totalDuration = CONSTANTS.DURATIONS[phase] || 30000;
  const phaseLabel = t(`game:phases.${phase}`, { defaultValue: phase });
  const phaseIcon = CONSTANTS.PHASE_ICONS?.[phase] || (isDay ? 'fa-sun' : 'fa-moon');

  // Use phaseStartedAt for sync if available, fallback to timer
  const [localTimer, setLocalTimer] = useState(timer);
  const timeRemaining = Math.floor(localTimer / 1000);
  const progressPercentage = (localTimer / totalDuration) * 100;

  useEffect(() => {
    if (isPaused) return;
    // If we have a sync timestamp, calculate from it
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

  let barColor;
  if (progressPercentage <= 25) barColor = '#ff4757';
  else if (progressPercentage <= 55) barColor = '#ffa502';
  else barColor = '#44cc44';

  const dayNightLabel = `${isDay ? t('common:day') : t('common:night')} ${dayCount}`;
  const isFirstDayDiscussion = dayCount === 1 && phase === 'DISCUSSION';
  const showCountdown = !isInfoPhase && !isFirstDayDiscussion;

  // Phase-colored background
  const PHASE_COLORS = {
    DISCUSSION: 'rgba(40, 120, 40, 0.7)',
    VOTING: 'rgba(140, 90, 20, 0.7)',
    DEFENSE: 'rgba(140, 40, 40, 0.7)',
    JUDGMENT: 'rgba(80, 40, 120, 0.7)',
    NIGHT: 'rgba(20, 20, 60, 0.7)',
    NIGHT_TRANSITION: 'rgba(15, 15, 40, 0.8)',
    DEATH_REPORT: 'rgba(80, 30, 30, 0.6)',
    EXECUTION: 'rgba(120, 20, 20, 0.7)',
    LAST_WORDS: 'rgba(60, 40, 40, 0.6)',
    NO_LYNCH: 'rgba(60, 60, 60, 0.6)',
    SPARED: 'rgba(40, 80, 40, 0.6)',
  };
  const phaseBg = PHASE_COLORS[phase] || 'rgba(0, 0, 0, 0.7)';

  return (
    <div className="time-container">
      {/* Day/Night label */}
      <AnimatePresence mode="wait">
        <motion.div
          className="day-label"
          key={dayNightLabel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <i className={`fas ${isDay ? 'fa-sun' : 'fa-moon'}`}></i>
          {dayNightLabel}
        </motion.div>
      </AnimatePresence>

      {/* Phase info */}
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
              <><i className={`fas ${phaseIcon}`} style={{ marginRight: 6, fontSize: '0.85em' }}></i>{phaseLabel}</>
            )}
          </motion.div>
        </AnimatePresence>

        {showCountdown && (
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

        {showCountdown && (
          <div className="phase-progress-bar">
            <div className="phase-progress-fill" style={{ width: `${progressPercentage}%`, backgroundColor: barColor }} />
          </div>
        )}
      </div>
    </div>
  );
};

/** Progress bar — rendered inside the 3D scene container */
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
