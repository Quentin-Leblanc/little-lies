import React, { useState, useEffect } from 'react';
import { useMultiplayerState, getRoomCode } from 'playroomkit';
import trad from '../../trad/roles.json';

import './Menu.scss';

const Menu = () => {
  const [showLogs, setShowLogs] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [roomCode, setRoomCode] = useState('');

  const [messages = []] = useMultiplayerState('chatMessages', []);

  useEffect(() => {
    try {
      const code = getRoomCode();
      setRoomCode(code || '');
    } catch (e) {
      console.warn('Could not get room code:', e);
    }
  }, []);

  const handleQuitGame = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete('r');
    window.location.href = url.toString();
  };

  const filteredLogs = messages?.filter((message) => message.chat !== 'mafia' && message.chat !== 'whisper' && message.chat !== 'dead') || [];

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
  };

  return (
    <div className="menu-wrapper">
      <div className="menu-title-block">
        <h1 className="menu-game-title">Mafia & Wolves</h1>
        <div className="menu-lobby-code" onClick={copyCode} title="Cliquer pour copier">
          <span className="menu-code-label">Code lobby :</span>
          <span className="menu-code-value">{roomCode || '...'}</span>
          <i className="fas fa-copy menu-code-copy"></i>
        </div>
      </div>
      <div className="menu-container">
        <button className="menu-buttons" onClick={() => setShowMenu(true)}>
          <i className="fas fa-bars"></i> Menu
        </button>
        <button className="menu-buttons" onClick={() => setShowHelp(true)}>
          <i className="fas fa-book"></i> Aide
        </button>
        <button className="menu-buttons" onClick={() => setShowLogs(true)}>
          <i className="fas fa-scroll"></i> Logs
        </button>
      </div>
      {showMenu && (
        <MenuDialog
          roomCode={roomCode}
          onClose={() => setShowMenu(false)}
          onQuit={handleQuitGame}
        />
      )}
      {showLogs && <LogDialog messages={filteredLogs} onClose={() => setShowLogs(false)} />}
      {showHelp && <HelpDialog onClose={() => setShowHelp(false)} />}
    </div>
  );
};

const MenuDialog = ({ roomCode, onClose, onQuit }) => {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="quit-dialog-overlay" onClick={onClose}>
      <div className="quit-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="quit-dialog-header">
          <h2>Menu</h2>
          <button className="close-button" onClick={onClose}>X</button>
        </div>
        <div className="quit-dialog-content">
          <div className="room-code-section">
            <span className="room-code-label">Code du lobby</span>
            <div className="room-code-display" onClick={copyCode}>
              <span className="room-code-value">{roomCode || '...'}</span>
              <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
            </div>
            {copied && <span className="copied-feedback">Copié !</span>}
          </div>
          <button onClick={onQuit} className="quit-game-btn">
            <i className="fas fa-sign-out-alt"></i> Quitter la partie
          </button>
        </div>
      </div>
    </div>
  );
};

const LogDialog = ({ messages, onClose }) => (
  <div className="log-dialog-overlay" onClick={onClose}>
    <div className="log-dialog" onClick={(e) => e.stopPropagation()}>
      <div className="log-dialog-header">
        <h2>Logs</h2>
        <button className="close-button" onClick={onClose}>X</button>
      </div>
      <div className="log-dialog-content">
        {messages.length > 0 ? (
          messages.map((log, index) => (
            <div key={index} className="log-message">
              <strong style={{ color: log.color }}>{log.player}</strong>: {log.content}
            </div>
          ))
        ) : (
          <p className="log-empty">Aucun message.</p>
        )}
      </div>
    </div>
  </div>
);

const HelpDialog = ({ onClose }) => {
  const rolesByTeam = {
    town: trad.roles.filter((r) => r.team === 'town'),
    mafia: trad.roles.filter((r) => r.team === 'mafia'),
    neutral: trad.roles.filter((r) => r.team === 'neutral'),
  };

  return (
    <div className="help-dialog-overlay" onClick={onClose}>
      <div className="help-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="help-dialog-header">
          <h2>Aide du jeu</h2>
          <button className="close-button" onClick={onClose}>X</button>
        </div>
        <div className="help-dialog-content">
          <h3>Déroulement d'une partie</h3>
          <div className="help-phases">
            <div className="help-phase"><strong>Nuit</strong> — Les joueurs utilisent leurs pouvoirs en secret.</div>
            <div className="help-phase"><strong>Annonce des morts</strong> — Le village découvre qui est mort.</div>
            <div className="help-phase"><strong>Discussion</strong> — Les joueurs parlent librement.</div>
            <div className="help-phase"><strong>Vote</strong> — Votez pour accuser un suspect (majorité requise).</div>
            <div className="help-phase"><strong>Défense</strong> — Seul l'accusé peut parler.</div>
            <div className="help-phase"><strong>Jugement</strong> — Votez Coupable, Innocent ou Abstention.</div>
            <div className="help-phase"><strong>Exécution</strong> — Si coupable, le joueur est éliminé.</div>
          </div>

          <h3>Commandes chat</h3>
          <ul className="help-commands">
            <li><code>-pm joueur message</code> — Chuchoter à un joueur</li>
            <li><code>-name nouveau_nom</code> — Changer de nom (lobby uniquement)</li>
            <li><code>-lw texte</code> — Mettre à jour votre testament</li>
          </ul>

          <h3 style={{ color: '#78ff78' }}>Village</h3>
          {rolesByTeam.town.map((role) => (
            <div key={role.key} className="help-role">
              <div className="help-role-header">
                <i className={`fas ${role.icon}`} style={{ color: role.couleur }}></i>
                <strong style={{ color: role.couleur }}>{role.label}</strong>
              </div>
              <p>{role.description}</p>
              <span className="help-objective">{role.objectif}</span>
            </div>
          ))}

          <h3 style={{ color: '#ff0000' }}>Mafia</h3>
          {rolesByTeam.mafia.map((role) => (
            <div key={role.key} className="help-role">
              <div className="help-role-header">
                <i className={`fas ${role.icon}`} style={{ color: role.couleur }}></i>
                <strong style={{ color: role.couleur }}>{role.label}</strong>
              </div>
              <p>{role.description}</p>
              <span className="help-objective">{role.objectif}</span>
            </div>
          ))}

          <h3 style={{ color: '#9370db' }}>Neutres</h3>
          {rolesByTeam.neutral.map((role) => (
            <div key={role.key} className="help-role">
              <div className="help-role-header">
                <i className={`fas ${role.icon}`} style={{ color: role.couleur }}></i>
                <strong style={{ color: role.couleur }}>{role.label}</strong>
              </div>
              <p>{role.description}</p>
              <span className="help-objective">{role.objectif}</span>
            </div>
          ))}

          <h3>Conditions de victoire</h3>
          <ul>
            <li><strong style={{ color: '#78ff78' }}>Village</strong> : Éliminer toute la mafia et les menaces neutres.</li>
            <li><strong style={{ color: '#ff0000' }}>Mafia</strong> : Être en majorité par rapport aux autres joueurs.</li>
            <li><strong style={{ color: '#9370db' }}>Serial Killer</strong> : Être le dernier survivant.</li>
            <li><strong style={{ color: '#ff69b4' }}>Jester</strong> : Se faire lyncher.</li>
            <li><strong style={{ color: '#daa520' }}>Survivor</strong> : Survivre jusqu'à la fin.</li>
            <li><strong style={{ color: '#808080' }}>Executioner</strong> : Faire lyncher sa cible.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Menu;
