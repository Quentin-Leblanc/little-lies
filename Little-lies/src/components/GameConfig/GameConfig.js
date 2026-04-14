import React, { useState } from 'react';
import { isHost } from 'playroomkit';
import './GameConfig.scss';

const DEFAULT_DURATIONS = {
  NIGHT: 30,
  DEATH_REPORT: 5,
  DISCUSSION: 30,
  VOTING: 30,
  DEFENSE: 15,
  JUDGMENT: 10,
  LAST_WORDS: 5,
  EXECUTION: 3,
};

const DURATION_LABELS = {
  NIGHT: 'Nuit',
  DISCUSSION: 'Discussion',
  VOTING: 'Vote',
  DEFENSE: 'D\u00e9fense',
  JUDGMENT: 'Jugement',
};

const GameConfig = ({ config, onConfigChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const host = isHost();

  const durations = config?.durations || DEFAULT_DURATIONS;

  const handleDurationChange = (phase, value) => {
    if (!host) return;
    const newDurations = { ...durations, [phase]: Math.max(5, Math.min(120, parseInt(value) || 5)) };
    onConfigChange({ ...config, durations: newDurations });
  };

  return (
    <div className="game-config">
      <button className="config-toggle" onClick={() => setIsOpen(!isOpen)}>
        <i className="fas fa-cog"></i> {isOpen ? 'Fermer' : 'Config'}
      </button>

      {isOpen && (
        <div className="config-panel">
          <h3>Configuration de la partie</h3>
          {!host && <p className="config-readonly-hint">Seul l'h\u00f4te peut modifier</p>}
          <div className="config-durations">
            {Object.entries(DURATION_LABELS).map(([key, label]) => (
              <div key={key} className="config-row">
                <label>{label}</label>
                <div className="config-input-group">
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={durations[key]}
                    onChange={(e) => handleDurationChange(key, e.target.value)}
                    disabled={!host}
                  />
                  <span>s</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GameConfig;
export { DEFAULT_DURATIONS };
