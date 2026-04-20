import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMultiplayerState, getRoomCode } from 'playroomkit';
import { useTranslation } from 'react-i18next';
import i18n from '../../trad/i18n';
import { AVAILABLE_LANGUAGES } from '../../trad/i18n';
import { getRoles } from '../../data/roles.js';
import Audio from '../../utils/AudioManager';
import useEscapeKey from '../../hooks/useEscapeKey';
import Legal from '../Legal/Legal';
import { useAuth } from '../Auth/Auth';
import { isAdminEmail } from '../../utils/supabase';

import './Menu.scss';

const Menu = () => {
  const { t } = useTranslation(['menu', 'common']);
  const { user } = useAuth();
  const [showLogs, setShowLogs] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [muted, setMuted] = useState(Audio.isMuted());
  const [barCopied, setBarCopied] = useState(false);
  const isAdmin = isAdminEmail(user);

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
    if (!roomCode) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(roomCode).catch(() => {
        try {
          const ta = document.createElement('textarea');
          ta.value = roomCode;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        } catch (_) {}
      });
    }
    setBarCopied(true);
    setTimeout(() => setBarCopied(false), 1600);
  };

  return (
    <div className="menu-wrapper">
      <div className="menu-bar">
        <h1 className="menu-game-title" data-text="AMONG LIARS">AMONG LIARS</h1>
        <div
          className={`menu-lobby-code ${barCopied ? 'is-copied' : ''}`}
          onClick={copyCode}
          title={t('menu:copy_tooltip')}
        >
          <span className="menu-code-value">{roomCode || '...'}</span>
          <i className={`fas ${barCopied ? 'fa-check' : 'fa-copy'} menu-code-copy`}></i>
          {barCopied && <span className="menu-code-tooltip">{t('common:copied')}</span>}
        </div>
        <button className="menu-btn-icon" onClick={() => setShowMenu(true)} title={t('menu:menu')} aria-label={t('menu:menu')} aria-expanded={showMenu}>
          <i className="fas fa-bars" aria-hidden="true"></i>
        </button>
        <button className="menu-btn-icon" onClick={() => setShowHelp(true)} title={t('menu:help')} aria-label={t('menu:help')} aria-expanded={showHelp}>
          <i className="fas fa-book" aria-hidden="true"></i>
        </button>
        <button className="menu-btn-icon" onClick={() => setShowLogs(true)} title={t('menu:logs')} aria-label={t('menu:logs')} aria-expanded={showLogs}>
          <i className="fas fa-scroll" aria-hidden="true"></i>
        </button>
        <button className="menu-btn-icon" onClick={() => { const m = Audio.toggleMute(); setMuted(m); }} title={muted ? t('menu:unmute') : t('menu:mute')} aria-label={muted ? t('menu:unmute') : t('menu:mute')} aria-pressed={muted}>
          <i className={`fas ${muted ? 'fa-volume-mute' : 'fa-volume-up'}`} aria-hidden="true"></i>
        </button>
        {isAdmin && (
          <button className="menu-btn-icon menu-btn-admin" onClick={() => window.dispatchEvent(new Event('admin-panel-open'))} title="Admin" aria-label="Admin">
            <i className="fas fa-shield-alt" aria-hidden="true"></i>
          </button>
        )}
      </div>
      {showMenu && createPortal(
        <MenuDialog
          roomCode={roomCode}
          onClose={() => setShowMenu(false)}
          onQuit={handleQuitGame}
          onShowLegal={() => { setShowMenu(false); setShowLegal(true); }}
        />,
        document.body
      )}
      {showLogs && createPortal(<LogDialog messages={filteredLogs} onClose={() => setShowLogs(false)} />, document.body)}
      {showHelp && createPortal(<HelpDialog onClose={() => setShowHelp(false)} />, document.body)}
      {showLegal && createPortal(<Legal onClose={() => setShowLegal(false)} />, document.body)}
    </div>
  );
};

const MenuDialog = ({ roomCode, onClose, onQuit, onShowLegal }) => {
  const { t } = useTranslation(['menu', 'common']);
  const [copied, setCopied] = useState(false);
  const [volume, setVolume] = useState(Audio.getVolume());
  const [muted, setMuted] = useState(Audio.isMuted());
  useEscapeKey(onClose);

  const copyCode = () => {
    if (!roomCode) return;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(roomCode).catch(() => {
        try {
          const ta = document.createElement('textarea');
          ta.value = roomCode;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        } catch (_) {}
      });
    }
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
      <div className="quit-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('menu:menu')}>
        <div className="quit-dialog-header">
          <h2>{t('menu:menu')}</h2>
          <button className="close-button" onClick={onClose} aria-label={t('common:close', { defaultValue: 'Close' })}>X</button>
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
              <button
                className="volume-mute-btn"
                onClick={handleToggleMute}
                aria-label={muted ? t('menu:unmute') : t('menu:mute')}
                aria-pressed={muted}
              >
                <i className={`fas ${muted ? 'fa-volume-mute' : 'fa-volume-up'}`} aria-hidden="true"></i>
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
            <span className="room-code-label"><i className="fas fa-globe" aria-hidden="true"></i> {t('menu:language')}</span>
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
  const { t } = useTranslation(['menu', 'common']);
  useEscapeKey(onClose);

  return (
    <div className="log-dialog-overlay" onClick={onClose}>
      <div className="log-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('menu:logs')}>
        <div className="log-dialog-header">
          <h2>{t('logs')}</h2>
          <button className="close-button" onClick={onClose} aria-label={t('common:close', { defaultValue: 'Close' })}>X</button>
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
  const { t } = useTranslation(['menu', 'game', 'common']);
  useEscapeKey(onClose);
  const allRoles = getRoles();
  const rolesByTeam = {
    town: allRoles.filter((r) => r.team === 'town'),
    mafia: allRoles.filter((r) => r.team === 'mafia'),
    cult: allRoles.filter((r) => r.team === 'cult'),
    neutral: allRoles.filter((r) => r.team === 'neutral'),
  };

  return (
    <div className="help-dialog-overlay" onClick={onClose}>
      <div className="help-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('menu:help_dialog.title')}>
        <div className="help-dialog-header">
          <h2>{t('menu:help_dialog.title')}</h2>
          <button className="close-button" onClick={onClose} aria-label={t('common:close', { defaultValue: 'Close' })}>X</button>
        </div>
        <div className="help-dialog-content">
          {/* Big-picture summary at the top: one paragraph describing the
              game, the factions and the depth angle so a new player knows
              what they're signing up for before scrolling into phases/roles. */}
          <p className="help-intro-summary">{t('menu:help_dialog.intro_summary')}</p>

          <h3>{t('menu:help_dialog.how_to_play')}</h3>
          <p>{t('menu:help_dialog.intro')}</p>

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
            <div className="help-phase"><strong style={{color:'#a96edd'}}>{t('menu:help_dialog.win_cult')}</strong></div>
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
          <div className="help-role-grid">
            {rolesByTeam.town.map((role) => (
              <div key={role.key} className="help-role">
                <div className="help-role-header">
                  <i className={`fas ${role.icon}`} style={{ color: role.couleur }}></i>
                  <strong style={{ color: role.couleur }}>{role.label}</strong>
                </div>
                <p>{role.description}</p>
                {Array.isArray(role.details) && role.details.length > 0 && (
                  <ul className="help-role-details">
                    {role.details.map((line, i) => (
                      <li key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
                    ))}
                  </ul>
                )}
                <span className="help-objective">{role.objectif}</span>
              </div>
            ))}
          </div>

          <h3 style={{ color: '#ff4444' }}>{t('menu:help_dialog.roles_mafia')}</h3>
          <div className="help-role-grid">
            {rolesByTeam.mafia.map((role) => (
              <div key={role.key} className="help-role">
                <div className="help-role-header">
                  <i className={`fas ${role.icon}`} style={{ color: role.couleur }}></i>
                  <strong style={{ color: role.couleur }}>{role.label}</strong>
                </div>
                <p>{role.description}</p>
                {Array.isArray(role.details) && role.details.length > 0 && (
                  <ul className="help-role-details">
                    {role.details.map((line, i) => (
                      <li key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
                    ))}
                  </ul>
                )}
                <span className="help-objective">{role.objectif}</span>
              </div>
            ))}
          </div>

          <h3 style={{ color: '#9370db' }}>{t('menu:help_dialog.roles_neutral')}</h3>
          <div className="help-role-grid">
            {rolesByTeam.neutral.map((role) => (
              <div key={role.key} className="help-role">
                <div className="help-role-header">
                  <i className={`fas ${role.icon}`} style={{ color: role.couleur }}></i>
                  <strong style={{ color: role.couleur }}>{role.label}</strong>
                </div>
                <p>{role.description}</p>
                {Array.isArray(role.details) && role.details.length > 0 && (
                  <ul className="help-role-details">
                    {role.details.map((line, i) => (
                      <li key={i} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }} />
                    ))}
                  </ul>
                )}
                <span className="help-objective">{role.objectif}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Menu;
