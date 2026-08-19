import React from 'react';
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

// Phase durations. Rendered flat — no toggle of its own.
//
// This used to hide behind a "config-toggle" button, which put it two
// collapses deep: the host opened "Configuration & règles", found a
// single button, clicked it, and only then saw the settings. Two clicks
// to reach four number fields, and the second click made the panel jump
// in height with nothing on screen explaining why. The parent <details>
// is the only disclosure this content needs.
const GameConfig = ({ config, onConfigChange }) => {
  const { t } = useTranslation(['setup', 'game']);
  const host = isHost();

  const durations = config?.durations || DEFAULT_DURATIONS;

  const handleDurationChange = (phase, value) => {
    if (!host) return;
    const newDurations = { ...durations, [phase]: Math.max(5, Math.min(120, parseInt(value) || 5)) };
    onConfigChange({ ...config, durations: newDurations });
  };

  const handleReset = () => {
    if (!host) return;
    onConfigChange({ ...config, durations: { ...DEFAULT_DURATIONS } });
  };

  return (
    <div className="game-config">
      {!host && <p className="config-readonly-hint">{t('setup:config.host_only')}</p>}

      <div className="config-durations">
        {CONFIGURABLE_PHASES.map((key) => (
          <div key={key} className="config-row">
            <label htmlFor={`duration-${key}`}>{t(`game:phases.${key}`)}</label>
            <div className="config-input-group">
              <input
                id={`duration-${key}`}
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

      {host && (
        <button
          type="button"
          className="config-reset"
          onClick={handleReset}
          title={t('setup:config.reset')}
        >
          <i className="fas fa-rotate-left"></i> {t('setup:config.reset')}
        </button>
      )}
    </div>
  );
};

export default GameConfig;
export { DEFAULT_DURATIONS };
