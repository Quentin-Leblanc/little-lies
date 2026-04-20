import React, { useMemo } from 'react';
import i18n from '../trad/i18n';
import { useGameEngine } from '../hooks/useGameEngine';
import './AmbientEffects.scss';

const AmbientEffects = () => {
  const { game, CONSTANTS } = useGameEngine();
  const isNight = game.phase === CONSTANTS.PHASE.NIGHT || game.phase === CONSTANTS.PHASE.NIGHT_TRANSITION;
  const isExecution = game.phase === CONSTANTS.PHASE.EXECUTION;
  const isVoting = game.phase === CONSTANTS.PHASE.VOTING;
  const isNightTransition = game.phase === CONSTANTS.PHASE.NIGHT_TRANSITION;
  const isDay = game.isDay && !isExecution && !isVoting && !isNightTransition;
  // Cinema-style vignette: always on once the match has started so the
  // 3D scene always reads as "framed shot" instead of full-bleed. Kept
  // subtle enough that it doesn't fight with the phase-specific
  // vignettes (night / execution / vote) stacked on top — their radial
  // stops are deeper so they still come through on top of this base.
  const showCinemaVignette = !!game.isGameStarted && !isExecution;

  // Pick a random night text per night cycle
  const nightText = useMemo(() => {
    const texts = i18n.t('game:ambiance', { returnObjects: true }) || [];
    if (!Array.isArray(texts) || texts.length === 0) return '';
    return texts[Math.floor(Math.random() * texts.length)];
  }, [game.dayCount, isNight]);

  // Dust motes (day only)
  const dustMotes = useMemo(() =>
    Array.from({ length: 15 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 8}s`,
      duration: `${6 + Math.random() * 6}s`,
      size: 2 + Math.random() * 3,
    })), []);

  return (
    <div className="ambient-effects">
      {/* Cinema vignette — base darkening of the frame corners so the
          3D scene always feels composed. Renders under the phase-
          specific vignettes so night / vote / etc. still read on top. */}
      {showCinemaVignette && <div className="ambient-vignette ambient-vignette-cinema" />}

      {/* Night vignette */}
      {isNight && <div className="ambient-vignette ambient-vignette-night" />}

      {/* Execution red flash */}
      {isExecution && <div className="ambient-vignette ambient-vignette-execution" />}

      {/* Voting orange glow */}
      {isVoting && <div className="ambient-vignette ambient-vignette-vote" />}

      {/* Dust motes (day) */}
      {isDay && (
        <div className="ambient-dust">
          {dustMotes.map(d => (
            <div
              key={d.id}
              className="dust-mote"
              style={{
                left: d.left,
                width: d.size,
                height: d.size,
                animationDelay: d.delay,
                animationDuration: d.duration,
              }}
            />
          ))}
        </div>
      )}

      {/* Night ambiance text */}
      {isNight && (
        <div className="ambient-text" key={game.dayCount}>
          <i className="fas fa-moon"></i> {nightText}
        </div>
      )}

      {/* Day sun ray */}
      {isDay && <div className="ambient-sun-ray" />}
    </div>
  );
};

export default AmbientEffects;
