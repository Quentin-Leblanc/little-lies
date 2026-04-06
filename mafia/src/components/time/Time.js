import { motion } from 'framer-motion';
import { useGameEngine } from '../../hooks/useGameEngine';
import './Time.scss';
import { useEffect, useState } from 'react';

const Time = () => {
  const {
    game: { isDay, timer, dayCount, phase },
    CONSTANTS,
  } = useGameEngine();

  const totalDuration = CONSTANTS.DURATIONS[phase] || 30000;
  const phaseLabel = CONSTANTS.PHASE_LABELS[phase] || phase;

  const [localTimer, setLocalTimer] = useState(timer);
  const timeRemaining = Math.floor(localTimer / 1000);
  const progressPercentage = (localTimer / totalDuration) * 100;

  useEffect(() => {
    const interval = setInterval(() => {
      setLocalTimer((prevTimer) => Math.max(prevTimer - 100, 0));
    }, 100);
    return () => clearInterval(interval);
  }, []);

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

  return (
    <div className="time-container">
      <span className="game-title">Werewolf</span>
      <div className="DayNightTimer">
        <motion.div
          className="progress-bar"
          initial={{ width: '100%' }}
          animate={{
            width: `${progressPercentage}%`,
            backgroundColor: barColor,
          }}
          transition={{ ease: 'linear', duration: 0.1 }}
        />
        <div className="textOverlayTimer">
          <div className="progress-content">
            <i className={`fas ${phaseIcon}`}></i>
            {headerText}
          </div>
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
        </div>
      </div>
    </div>
  );
};

export default Time;
