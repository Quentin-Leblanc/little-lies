import React, { useMemo } from 'react';
import { useGameEngine } from '../hooks/useGameEngine';
import './AmbientEffects.scss';

// Night ambiance texts — displayed as subtle overlay
const NIGHT_TEXTS = [
  'Un chat noir traverse lentement la place du village...',
  'Des pas furtifs se font entendre dans la ruelle...',
  'Une ombre se glisse entre les maisons...',
  'Le vent souffle et emporte des murmures lointains...',
  'Les torches vacillent dans l\'obscurit\u00e9...',
  'Une lumi\u00e8re s\'\u00e9teint dans une maison au loin...',
  'Le bois de la potence grince sous le vent...',
  'La lune dispara\u00eet un instant derri\u00e8re les nuages...',
  'Un volet claque quelque part dans le village...',
  'La brume s\'\u00e9paissit autour du village...',
  'Un corbeau croasse au loin...',
  'Les flammes des torches dansent nerveusement...',
  'L\'air est charg\u00e9 de tension cette nuit...',
];

const AmbientEffects = () => {
  const { game, CONSTANTS } = useGameEngine();
  const isNight = game.phase === CONSTANTS.PHASE.NIGHT || game.phase === CONSTANTS.PHASE.NIGHT_TRANSITION;
  const isExecution = game.phase === CONSTANTS.PHASE.EXECUTION;
  const isVoting = game.phase === CONSTANTS.PHASE.VOTING;
  const isNightTransition = game.phase === CONSTANTS.PHASE.NIGHT_TRANSITION;
  const isDay = game.isDay && !isExecution && !isVoting && !isNightTransition;

  // Pick a random night text per night cycle
  const nightText = useMemo(() => {
    return NIGHT_TEXTS[Math.floor(Math.random() * NIGHT_TEXTS.length)];
  }, [game.dayCount, isNight]);

  // Firefly particles (night only)
  const fireflies = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      top: `${10 + Math.random() * 80}%`,
      size: 2 + Math.random() * 3,
      delay: `${Math.random() * 6}s`,
      duration: `${4 + Math.random() * 5}s`,
      drift: (Math.random() - 0.5) * 60,
    })), []);

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
      {/* Night vignette */}
      {isNight && <div className="ambient-vignette ambient-vignette-night" />}

      {/* Execution red flash */}
      {isExecution && <div className="ambient-vignette ambient-vignette-execution" />}

      {/* Voting orange glow */}
      {isVoting && <div className="ambient-vignette ambient-vignette-vote" />}

      {/* Fireflies (night) */}
      {isNight && (
        <div className="ambient-fireflies">
          {fireflies.map(f => (
            <div
              key={f.id}
              className="firefly"
              style={{
                left: f.left,
                top: f.top,
                width: f.size,
                height: f.size,
                animationDelay: f.delay,
                animationDuration: f.duration,
                '--drift': `${f.drift}px`,
              }}
            />
          ))}
        </div>
      )}

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
