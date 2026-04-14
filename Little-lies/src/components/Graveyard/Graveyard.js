import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../../hooks/useGameEngine';
import './Graveyard.scss';

const Graveyard = () => {
  const { t } = useTranslation(['game', 'roles']);
  const { getPlayers } = useGameEngine();
  const [expandedId, setExpandedId] = useState(null);

  const deadPlayers = getPlayers().filter((player) => !player.isAlive);

  return (
    <div className="graveyard-box">
      <h2><i className="fas fa-cross"></i> {t('graveyard.title')}</h2>
      {deadPlayers.length === 0 ? (
        <p className="graveyard-empty">{t('graveyard.empty')}</p>
      ) : (
        <ul>
          {deadPlayers.map((player) => (
            <li
              key={player.id}
              className={`graveyard-item ${expandedId === player.id ? 'expanded' : ''}`}
              onClick={() => setExpandedId(expandedId === player.id ? null : player.id)}
            >
              <div className="graveyard-header">
                <span style={{ color: player.character?.couleur }}>
                  {player.character?.icon && <i className={`fas ${player.character.icon}`}></i>}
                  {' '}{player.profile.name}
                </span>
                <span className="graveyard-role">{t(`roles:${player.character?.key}.label`, { defaultValue: player.character?.label })}</span>
              </div>
              {expandedId === player.id && player.lastWill && (
                <div className="graveyard-will">
                  <i className="fas fa-scroll"></i> {player.lastWill}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Graveyard;
