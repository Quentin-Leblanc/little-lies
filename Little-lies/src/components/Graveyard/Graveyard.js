import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../../hooks/useGameEngine';
import './Graveyard.scss';

const Graveyard = () => {
  const { t } = useTranslation(['game', 'roles']);
  const { getPlayers, game } = useGameEngine();
  const [expandedId, setExpandedId] = useState(null);

  const deadPlayers = getPlayers().filter((player) => !player.isAlive);
  // House rules: when roles are hidden on death, the graveyard shows only
  // names (no role label, no role icon, no color tint). When last wills
  // are disabled, the testament row never expands — the card stays a
  // simple name tag.
  const rules = game?.config?.rules || {};
  const revealRoles = rules.revealOnDeath !== false;
  const allowWills = rules.lastWills !== false;

  return (
    <div className="graveyard-box">
      <h2><i className="fas fa-cross"></i> {t('graveyard.title')}</h2>
      {deadPlayers.length === 0 ? (
        <p className="graveyard-empty">{t('graveyard.empty')}</p>
      ) : (
        <ul>
          {deadPlayers.map((player) => {
            const canExpand = allowWills && !!player.lastWill;
            return (
            <li
              key={player.id}
              className={`graveyard-item ${expandedId === player.id ? 'expanded' : ''}`}
              onClick={canExpand ? () => setExpandedId(expandedId === player.id ? null : player.id) : undefined}
              style={canExpand ? undefined : { cursor: 'default' }}
            >
              <div className="graveyard-header">
                <span style={{ color: revealRoles ? player.character?.couleur : undefined }}>
                  {revealRoles && player.character?.icon && <i className={`fas ${player.character.icon}`}></i>}
                  {revealRoles && player.character?.icon ? ' ' : null}{player.profile.name}
                </span>
                {revealRoles && (
                  <span className="graveyard-role">{t(`roles:${player.character?.key}.label`, { defaultValue: player.character?.label })}</span>
                )}
              </div>
              {expandedId === player.id && canExpand && (
                <div className="graveyard-will">
                  <i className="fas fa-scroll"></i> {player.lastWill}
                </div>
              )}
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Graveyard;
