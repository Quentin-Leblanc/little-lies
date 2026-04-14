import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useMultiplayerState, getRoomCode } from 'playroomkit';
import { useTranslation } from 'react-i18next';
import i18n from '../../trad/i18n';
import { AVAILABLE_LANGUAGES } from '../../trad/i18n';
import { getRoles } from '../../data/roles.js';
import Audio from '../../utils/AudioManager';
import Legal from '../Legal/Legal';

import './Menu.scss';

const Menu = () => {
  const { t } = useTranslation(['menu', 'common']);
  const [showLogs, setShowLogs] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
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
        <h1 className="menu-game-title">Among Liars</h1>
        <div className="menu-lobby-code" onClick={copyCode} title={t('menu:copy_tooltip')}>
          <span className="menu-code-value">{roomCode || '...'}</span>
          <i className="fas fa-copy menu-code-copy"></i>
        </div>
        <button className="menu-btn-icon" onClick={() => setShowMenu(true)} title={t('menu:menu')}>
          <i className="fas fa-bars"></i>
        </button>
        <button className="menu-btn-icon" onClick={() => setShowHelp(true)} title={t('menu:help')}>
          <i className="fas fa-book"></i>
        </button>
        <button className="menu-btn-icon" onClick={() => setShowLogs(true)} title={t('menu:logs')}>
          <i className="fas fa-scroll"></i>
        </button>
        <button className="menu-btn-icon" onClick={() => { const m = Audio.toggleMute(); setMuted(m); }} title={muted ? t('menu:unmute') : t('menu:mute')}>
          <i className={`fas ${muted ? 'fa-volume-mute' : 'fa-volume-up'}`}></i>
        </button>
      </div>
      {showMenu && ReactDOM.createPortal(
        <MenuDialog
          roomCode={roomCode}
          onClose={() => setShowMenu(false)}
          onQuit={handleQuitGame}
          onShowLegal={() => { setShowMenu(false); setShowLegal(true); }}
        />,
        document.body
      )}
      {showLogs && ReactDOM.createPortal(<LogDialog messages={filteredLogs} onClose={() => setShowLogs(false)} />, document.body)}
      {showHelp && ReactDOM.createPortal(<HelpDialog onClose={() => setShowHelp(false)} />, document.body)}
      {showLegal && ReactDOM.createPortal(<Legal onClose={() => setShowLegal(false)} />, document.body)}
    </div>
  );
};

const MenuDialog = ({ roomCode, onClose, onQuit, onShowLegal }) => {
  const { t } = useTranslation(['menu', 'common']);
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
          <h2>{t('menu:menu')}</h2>
          <button className="close-button" onClick={onClose}>X</button>
        </div>
        <div className="quit-dialog-content">
          <div className="room-code-section">
            <span className="room-code-label">{t('menu:lobby_code')}</span>
            <div className="room-code-display" onClick={copyCode}>
              <span className="room-code-value">{roomCode || '...'}</span>
              <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
            </div>
            {copied && <span className="copied-feedback">{t('common:copied')}</span>}
          </div>
          <div className="volume-section">
            <span className="room-code-label">{t('menu:volume')}</span>
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
          <div className="language-section">
            <span className="room-code-label"><i className="fas fa-globe"></i> Language</span>
            <div className="language-buttons">
              {AVAILABLE_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  className={`lang-btn ${i18n.language === lang.code ? 'lang-active' : ''}`}
                  onClick={() => i18n.changeLanguage(lang.code)}
                >
                  <span className="lang-flag">{lang.flag}</span>
                  <span className="lang-label">{lang.label}</span>
                </button>
              ))}
            </div>
          </div>
          <button onClick={onShowLegal} className="legal-btn">
            <i className="fas fa-scale-balanced"></i> {t('menu:legal')}
          </button>
          <button onClick={onQuit} className="quit-game-btn">
            <i className="fas fa-sign-out-alt"></i> {t('common:quit_game')}
          </button>
        </div>
      </div>
    </div>
  );
};

const LogDialog = ({ messages, onClose }) => {
  const { t } = useTranslation('menu');

  return (
    <div className="log-dialog-overlay" onClick={onClose}>
      <div className="log-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="log-dialog-header">
          <h2>{t('logs')}</h2>
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
            <p className="log-empty">{t('no_messages')}</p>
          )}
        </div>
      </div>
    </div>
  );
};

const HelpDialog = ({ onClose }) => {
  const { t } = useTranslation(['menu', 'game']);
  const allRoles = getRoles();
  const rolesByTeam = {
    town: allRoles.filter((r) => r.team === 'town'),
    mafia: allRoles.filter((r) => r.team === 'mafia'),
    neutral: allRoles.filter((r) => r.team === 'neutral'),
  };

  return (
    <div className="help-dialog-overlay" onClick={onClose}>
      <div className="help-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="help-dialog-header">
          <h2>{t('menu:help_dialog.title')}</h2>
          <button className="close-button" onClick={onClose}>X</button>
        </div>
        <div className="help-dialog-content">
          <h3>{t('menu:help_dialog.how_to_play')}</h3>
          <p style={{color:'#bbb',fontSize:'13px',lineHeight:'1.6',marginBottom:'12px'}}>
            {t('menu:help_dialog.intro')}
          </p>

          <h3>{t('menu:help_dialog.turn_flow')}</h3>
          <div className="help-phases">
            <div className="help-phase"><strong style={{color:'#8899cc'}}>{t('menu:help_dialog.phase_night')}</strong></div>
            <div className="help-phase"><strong style={{color:'#ffcc44'}}>{t('menu:help_dialog.phase_report')}</strong></div>
            <div className="help-phase"><strong style={{color:'#78ff78'}}>{t('menu:help_dialog.phase_discussion')}</strong></div>
            <div className="help-phase"><strong style={{color:'#ffa502'}}>{t('menu:help_dialog.phase_vote')}</strong></div>
            <div className="help-phase"><strong style={{color:'#ff6666'}}>{t('menu:help_dialog.phase_defense')}</strong></div>
            <div className="help-phase"><strong style={{color:'#cc88ff'}}>{t('menu:help_dialog.phase_judgment')}</strong></div>
          </div>

          <h3>{t('menu:help_dialog.win_conditions')}</h3>
          <div className="help-phases">
            <div className="help-phase"><strong style={{color:'#78ff78'}}>{t('menu:help_dialog.win_town')}</strong></div>
            <div className="help-phase"><strong style={{color:'#ff4444'}}>{t('menu:help_dialog.win_mafia')}</strong></div>
            <div className="help-phase"><strong style={{color:'#9370db'}}>{t('menu:help_dialog.win_sk')}</strong></div>
            <div className="help-phase"><strong style={{color:'#ff69b4'}}>{t('menu:help_dialog.win_jester')}</strong></div>
            <div className="help-phase"><strong style={{color:'#daa520'}}>{t('menu:help_dialog.win_survivor')}</strong></div>
            <div className="help-phase"><strong style={{color:'#808080'}}>{t('menu:help_dialog.win_executioner')}</strong></div>
          </div>

          <h3>{t('menu:help_dialog.chat_commands')}</h3>
          <ul className="help-commands">
            <li><code>-pm</code> {t('menu:help_dialog.cmd_pm')}</li>
            <li><code>-lw</code> {t('menu:help_dialog.cmd_lw')}</li>
            <li><code>-name</code> {t('menu:help_dialog.cmd_name')}</li>
            <li><code>-skip</code> {t('menu:help_dialog.cmd_skip')}</li>
          </ul>

          <h3>{t('menu:help_dialog.shortcuts')}</h3>
          <ul className="help-commands">
            <li>{t('menu:help_dialog.key_enter')}</li>
            <li>{t('menu:help_dialog.key_escape')}</li>
          </ul>

          <h3 style={{ color: '#78ff78' }}>{t('menu:help_dialog.roles_town')}</h3>
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

          <h3 style={{ color: '#ff0000' }}>{t('menu:help_dialog.roles_mafia')}</h3>
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

          <h3 style={{ color: '#9370db' }}>{t('menu:help_dialog.roles_neutral')}</h3>
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
        </div>
      </div>
    </div>
  );
};

export default Menu;
