import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../../trad/i18n';
import { AVAILABLE_LANGUAGES } from '../../trad/i18n';
import { getRoles } from '../../data/roles.js';
import Audio from '../../utils/AudioManager';
import useEscapeKey from '../../hooks/useEscapeKey';

import './Menu.scss';

// ─────────────────────────────────────────────────────────────────────
// The in-game menu bar that used to sit in the top-left corner is gone.
// It duplicated the game title, the help button and the sound toggle the
// persistent TopBar already carried, plus a room code the Setup screen
// also showed — seven controls where the player needed one.
//
// What survives are the three dialogs, now opened from the TopBar:
//   - MenuDialog : room code, volume, language, legal, quit
//   - LogDialog  : the public chat history
//   - HelpDialog : the full role guide
// ─────────────────────────────────────────────────────────────────────

export const MenuDialog = ({ roomCode, onClose, onQuit, onShowLegal, onShowLogs, isAdmin }) => {
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
          <button onClick={onShowLogs} className="legal-btn">
            <i className="fas fa-scroll"></i> {t('menu:logs')}
          </button>
          {isAdmin && (
            <button
              onClick={() => { onClose(); window.dispatchEvent(new Event('admin-panel-open')); }}
              className="legal-btn"
            >
              <i className="fas fa-shield-alt"></i> Admin
            </button>
          )}
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

export const LogDialog = ({ messages, onClose }) => {
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

// Faction sections of the role guide, in reading order. Colours match
// the faction colours used on the role cards themselves.
const ROLE_SECTIONS = [
  { team: 'town',    titleKey: 'roles_town',    color: '#78ff78' },
  { team: 'mafia',   titleKey: 'roles_mafia',   color: '#ff4444' },
  { team: 'cult',    titleKey: 'roles_cult',    color: '#a96edd' },
  { team: 'neutral', titleKey: 'roles_neutral', color: '#9370db' },
];

const RoleSection = ({ title, color, roles }) => {
  if (!roles || roles.length === 0) return null;
  return (
    <>
      <h3 style={{ color }}>{title}</h3>
      <div className="help-role-grid">
        {roles.map((role) => (
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
    </>
  );
};

export const HelpDialog = ({ onClose }) => {
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

          {/* One section per faction, driven by a list — the Cult used to
              be silently missing because the three sections were pasted
              copies and nobody added a fourth. A converted player could
              not look up their own role. */}
          {ROLE_SECTIONS.map(({ team, titleKey, color }) => (
            <RoleSection
              key={team}
              title={t(`menu:help_dialog.${titleKey}`)}
              color={color}
              roles={rolesByTeam[team]}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
