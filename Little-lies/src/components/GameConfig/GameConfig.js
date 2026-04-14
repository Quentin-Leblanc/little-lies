import React, { useState } from 'react';
import { isHost } from 'playroomkit';
import { useTranslation } from 'react-i18next';
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

const CONFIGURABLE_PHASES = ['NIGHT', 'DISCUSSION', 'VOTING', 'DEFENSE', 'JUDGMENT'];

const GameConfig = ({ config, onConfigChange }) => {
  const { t } = useTranslation(['setup', 'game']);
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
        <i className="fas fa-cog"></i> {isOpen ? t('setup:config.toggle_close') : t('setup:config.toggle_open')}
      </button>

      {isOpen && (
        <div className="config-panel">
          <h3>{t('setup:config.title')}</h3>
          {!host && <p className="config-readonly-hint">{t('setup:config.host_only')}</p>}
          <div className="config-durations">
            {CONFIGURABLE_PHASES.map((key) => (
              <div key={key} className="config-row">
                <label>{t(`game:phases.${key}`)}</label>
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
