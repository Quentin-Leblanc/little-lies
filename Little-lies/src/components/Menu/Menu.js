import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useMultiplayerState, getRoomCode } from 'playroomkit';
import trad from '../../trad/roles.json';
import Audio from '../../utils/AudioManager';

import './Menu.scss';

const Menu = () => {
  const [showLogs, setShowLogs] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [muted, setMuted] = useState(Audio.isMuted());

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
      <div className="menu-bar">
        <h1 className="menu-game-title">Not Me</h1>
        <div className="menu-lobby-code" onClick={copyCode} title="Cliquer pour copier">
          <span className="menu-code-value">{roomCode || '...'}</span>
          <i className="fas fa-copy menu-code-copy"></i>
        </div>
        <button className="menu-btn-icon" onClick={() => setShowMenu(true)} title="Menu">
          <i className="fas fa-bars"></i>
        </button>
        <button className="menu-btn-icon" onClick={() => setShowHelp(true)} title="Aide">
          <i className="fas fa-book"></i>
        </button>
        <button className="menu-btn-icon" onClick={() => setShowLogs(true)} title="Logs">
          <i className="fas fa-scroll"></i>
        </button>
        <button className="menu-btn-icon" onClick={() => { const m = Audio.toggleMute(); setMuted(m); }} title={muted ? 'Activer le son' : 'Couper le son'}>
          <i className={`fas ${muted ? 'fa-volume-mute' : 'fa-volume-up'}`}></i>
        </button>
      </div>
      {showMenu && ReactDOM.createPortal(
        <MenuDialog
          roomCode={roomCode}
          onClose={() => setShowMenu(false)}
          onQuit={handleQuitGame}
        />,
        document.body
      )}
      {showLogs && ReactDOM.createPortal(<LogDialog messages={filteredLogs} onClose={() => setShowLogs(false)} />, document.body)}
      {showHelp && ReactDOM.createPortal(<HelpDialog onClose={() => setShowHelp(false)} />, document.body)}
    </div>
  );
};

const MenuDialog = ({ roomCode, onClose, onQuit }) => {
  const [copied, setCopied] = useState(false);
  const [volume, setVolume] = useState(Audio.getVolume());
  const [muted, setMuted] = useState(Audio.isMuted());

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    Audio.setVolume(v);
  };

  const handleToggleMute = () => {
    const m = Audio.toggleMute();
    setMuted(m);
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
          <div className="volume-section">
            <span className="room-code-label">Volume</span>
            <div className="volume-controls">
              <button className="volume-mute-btn" onClick={handleToggleMute}>
                <i className={`fas ${muted ? 'fa-volume-mute' : 'fa-volume-up'}`}></i>
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={muted ? 0 : volume}
                onChange={handleVolumeChange}
                className="volume-slider"
              />
            </div>
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
          <h2>Guide du jeu</h2>
          <button className="close-button" onClick={onClose}>X</button>
        </div>
        <div className="help-dialog-content">
          <h3>Comment jouer ?</h3>
          <p style={{color:'#bbb',fontSize:'13px',lineHeight:'1.6',marginBottom:'12px'}}>
            Not Me est un jeu de déduction sociale. Chaque joueur reçoit un rôle secret.
            Le <strong style={{color:'#78ff78'}}>Village</strong> doit identifier et éliminer les menaces.
            La <strong style={{color:'#ff4444'}}>Mafia</strong> élimine les villageois la nuit en restant discrète.
            Les <strong style={{color:'#9370db'}}>Neutres</strong> ont leurs propres objectifs.
          </p>

          <h3>Déroulement d'un tour</h3>
          <div className="help-phases">
            <div className="help-phase"><strong style={{color:'#8899cc'}}>Nuit</strong> — Chaque joueur utilise son pouvoir en secret. La Mafia choisit une cible à éliminer.</div>
            <div className="help-phase"><strong style={{color:'#ffcc44'}}>Annonce</strong> — Le village découvre les victimes de la nuit.</div>
            <div className="help-phase"><strong style={{color:'#78ff78'}}>Discussion</strong> — Débattez, accusez, défendez-vous. Utilisez le chat ou le vocal.</div>
            <div className="help-phase"><strong style={{color:'#ffa502'}}>Vote</strong> — Votez contre un suspect. Une majorité est nécessaire pour accuser.</div>
            <div className="help-phase"><strong style={{color:'#ff6666'}}>Défense</strong> — L'accusé a un dernier mot pour se défendre.</div>
            <div className="help-phase"><strong style={{color:'#cc88ff'}}>Jugement</strong> — Votez Coupable ou Innocent. Si coupable, le joueur est exécuté.</div>
          </div>

          <h3>Conditions de victoire</h3>
          <div className="help-phases">
            <div className="help-phase"><strong style={{color:'#78ff78'}}>Village</strong> — Éliminer toute la Mafia et les menaces neutres.</div>
            <div className="help-phase"><strong style={{color:'#ff4444'}}>Mafia</strong> — Être en majorité par rapport aux autres joueurs.</div>
            <div className="help-phase"><strong style={{color:'#9370db'}}>Serial Killer</strong> — Être le dernier survivant.</div>
            <div className="help-phase"><strong style={{color:'#ff69b4'}}>Jester</strong> — Se faire lyncher.</div>
            <div className="help-phase"><strong style={{color:'#daa520'}}>Survivor</strong> — Rester en vie jusqu'à la fin.</div>
            <div className="help-phase"><strong style={{color:'#808080'}}>Executioner</strong> — Faire lyncher sa cible.</div>
          </div>

          <h3>Commandes du chat</h3>
          <ul className="help-commands">
            <li><code>-pm joueur message</code> — Envoyer un message privé à un joueur</li>
            <li><code>-lw texte</code> — Écrire votre testament (visible à votre mort)</li>
            <li><code>-name pseudo</code> — Changer de pseudo (lobby uniquement)</li>
            <li><code>-skip</code> — Voter pour passer la phase de discussion</li>
          </ul>

          <h3>Raccourcis</h3>
          <ul className="help-commands">
            <li><kbd>Entrée</kbd> — Ouvrir le chat / Envoyer un message</li>
            <li><kbd>Échap</kbd> — Fermer le chat</li>
          </ul>

          <h3 style={{ color: '#78ff78' }}>Rôles du Village</h3>
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

          <h3 style={{ color: '#ff0000' }}>Rôles de la Mafia</h3>
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
