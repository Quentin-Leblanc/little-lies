import React, { useState } from 'react';
import { useGameEngine } from '../../hooks/useGameEngine';
import './Graveyard.scss';

const Graveyard = () => {
  const { getPlayers } = useGameEngine();
  const [expandedId, setExpandedId] = useState(null);

  const deadPlayers = getPlayers().filter((player) => !player.isAlive);

  return (
    <div className="graveyard-box">
      <h2><i className="fas fa-cross"></i> Cimetière</h2>
      {deadPlayers.length === 0 ? (
        <p className="graveyard-empty">Aucun mort pour l'instant.</p>
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
                <span className="graveyard-role">{player.character?.label}</span>
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
