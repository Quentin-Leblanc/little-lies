import React, { useState, useEffect } from 'react';
import { useMultiplayerState } from 'playroomkit';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../../hooks/useGameEngine';
import { useAuth } from '../Auth/Auth';
import { isAdmin as checkIsAdmin, isAdminEmail, addXP } from '../../utils/supabase';
import { toTextCss } from '../../utils/playerColor';
import './AdminPanel.scss';

const WEATHER_OPTIONS_DAY = [
  { key: 'sunny', label: 'Soleil', icon: 'fa-sun' },
  { key: 'misty', label: 'Brume', icon: 'fa-smog' },
  { key: 'rainy', label: 'Pluie', icon: 'fa-cloud-rain' },
];
const WEATHER_OPTIONS_NIGHT = [
  { key: 'clear', label: 'Claire', icon: 'fa-moon' },
  { key: 'rainy', label: 'Pluie', icon: 'fa-cloud-rain' },
  { key: 'foggy', label: 'Brouillard', icon: 'fa-smog' },
];

const AdminPanel = () => {
  const { t } = useTranslation('common');
  const { game, setGame, setPlayers, getPlayers, kickPlayer, addChatSystem, CONSTANTS } = useGameEngine();
  const { user } = useAuth();
  const [adminCharScale, setAdminCharScale] = useMultiplayerState('adminCharScale', 0.8);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [visible, setVisible] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [chatMsg, setChatMsg] = useState('');
  const [xpStatus, setXpStatus] = useState('');
  const charScale = adminCharScale || 0.8;

  // Fast path: email whitelist; slow path: DB flag
  useEffect(() => {
    if (!user) { setIsAdminUser(false); return; }
    if (isAdminEmail(user)) { setIsAdminUser(true); return; }
    if (user.id) checkIsAdmin(user.id).then(setIsAdminUser);
    else setIsAdminUser(false);
  }, [user?.id, user?.email]);

  // Listen for menu-triggered open
  useEffect(() => {
    const open = () => setVisible(true);
    window.addEventListener('admin-panel-open', open);
    return () => window.removeEventListener('admin-panel-open', open);
  }, []);

  // Not admin -> render nothing
  if (!isAdminUser) return null;

  // Admin icon (collapsed)
  if (!visible) {
    return (
      <button className="admin-toggle" onClick={() => setVisible(true)} title={t('admin_panel')} aria-label={t('admin_panel')}>
        <i className="fas fa-shield-alt" aria-hidden="true"></i>
      </button>
    );
  }

  // Admin actions
  const skipToNextPhase = () => {
    setGame(prev => ({ ...prev, timer: 0 }));
    addChatSystem(`[ADMIN] ${t('admin_next_phase')}`, '#ff4444');
  };

  const kickToLobby = () => {
    setGame(prev => ({
      ...prev,
      status: CONSTANTS.STATUS.SETUP,
      isGameStarted: false,
      isGameSetup: true,
      phase: CONSTANTS.PHASE.NIGHT,
      dayCount: 0,
      timer: 0,
    }));
    setPlayers(getPlayers().map(p => ({ ...p, isAlive: true, character: null })));
    addChatSystem(`[ADMIN] ${t('admin_kick_lobby')}`, '#ff4444');
  };

  const toggleFreeRoam = () => {
    const entering = !game.adminFreeRoam;
    setGame(prev => ({ ...prev, adminFreeRoam: entering }));
    addChatSystem(entering ? `[ADMIN] ${t('admin_free_roam')}` : `[ADMIN] ${t('admin_resume')}`, '#ff4444');
  };

  const updateCharScale = (val) => setAdminCharScale(parseFloat(val));
  const resetCharScale = () => setAdminCharScale(0.8);

  const sendAnnouncement = () => {
    if (!announcement.trim()) return;
    setGame(prev => ({ ...prev, adminAnnouncement: announcement.trim() }));
    setTimeout(() => setGame(prev => ({ ...prev, adminAnnouncement: null })), 3000);
    setAnnouncement('');
  };

  const sendAdminChat = () => {
    if (!chatMsg.trim()) return;
    addChatSystem(`[ADMIN] ${chatMsg.trim()}`, '#ff4444');
    setChatMsg('');
  };

  const killPlayer = (playerId) => {
    setPlayers(getPlayers().map(p =>
      p.id === playerId ? { ...p, isAlive: false } : p
    ));
  };

  const kickPlayerFromGame = (playerId) => {
    kickPlayer(playerId);
    addChatSystem(`[ADMIN] Joueur expulsé`, '#ff4444');
  };

  const setWeather = (key) => {
    const current = game.adminWeather;
    setGame(prev => ({ ...prev, adminWeather: current === key ? null : key }));
  };

  const grantMaxXP = async () => {
    if (!user?.id) return;
    setXpStatus('…');
    const { error } = await addXP(user.id, 99999, 'admin_max_xp');
    setXpStatus(error ? `Erreur: ${error.message}` : 'XP max accordé !');
    setTimeout(() => setXpStatus(''), 3000);
  };

  const players = getPlayers();

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <span><i className="fas fa-shield-alt" aria-hidden="true"></i> {t('admin_title')}</span>
        <button
          onClick={() => setVisible(false)}
          className="admin-close"
          aria-label={t('common:close', { defaultValue: 'Close' })}
          title={t('common:close', { defaultValue: 'Close' })}
        >X</button>
      </div>

      <div className="admin-section">
        <label className="admin-label">{t('players')} ({players.filter(p => p.isAlive).length}/{players.length})</label>
        <div className="admin-player-list">
          {players.map(p => (
            <div key={p.id} className={`admin-player-item ${!p.isAlive ? 'admin-player-dead' : ''}`}>
              <span style={{ color: toTextCss(p.profile?.color, '#aaa') }}>
                <i className="fas fa-gem" style={{ marginRight: 6 }}></i>
                {p.profile?.name || 'Joueur'}
              </span>
              <div className="admin-player-actions">
                {p.isAlive && (
                  <button
                    className="admin-kill-btn"
                    onClick={() => killPlayer(p.id)}
                    title="Tuer"
                    aria-label={t('admin_kill_player', { defaultValue: 'Kill', name: p.profile?.name || '' })}
                  >
                    <i className="fas fa-skull" aria-hidden="true"></i>
                  </button>
                )}
                <button
                  className="admin-kick-btn"
                  onClick={() => kickPlayerFromGame(p.id)}
                  title="Expulser"
                  aria-label={`Expulser ${p.profile?.name || ''}`}
                >
                  <i className="fas fa-door-open" aria-hidden="true"></i>
                </button>
                {!p.isAlive && <span className="admin-dead-tag">{t('dead').toLowerCase()}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="admin-section">
        <button className="admin-action-btn" onClick={skipToNextPhase}>
          <i className="fas fa-forward"></i> {t('admin_next_phase')}
        </button>
        <button className="admin-action-btn admin-danger" onClick={kickToLobby}>
          <i className="fas fa-sign-out-alt"></i> {t('admin_kick_lobby')}
        </button>
        <button className={`admin-action-btn ${game.adminFreeRoam ? 'admin-active' : ''}`} onClick={toggleFreeRoam}>
          <i className={`fas ${game.adminFreeRoam ? 'fa-play' : 'fa-video'}`}></i>
          {game.adminFreeRoam ? ` ${t('admin_resume')}` : ` ${t('admin_free_roam')}`}
        </button>
      </div>

      <div className="admin-section">
        <label className="admin-label"><i className="fas fa-cloud" style={{ marginRight: 4 }}></i> Météo (jour)</label>
        <div className="admin-weather-row">
          {WEATHER_OPTIONS_DAY.map(w => (
            <button
              key={w.key}
              className={`admin-weather-btn ${game.adminWeather === w.key ? 'admin-active' : ''}`}
              onClick={() => setWeather(w.key)}
              title={w.label}
            >
              <i className={`fas ${w.icon}`}></i>
            </button>
          ))}
        </div>
        <label className="admin-label" style={{ marginTop: 6 }}><i className="fas fa-moon" style={{ marginRight: 4 }}></i> Météo (nuit)</label>
        <div className="admin-weather-row">
          {WEATHER_OPTIONS_NIGHT.map(w => (
            <button
              key={w.key}
              className={`admin-weather-btn ${game.adminWeather === w.key ? 'admin-active' : ''}`}
              onClick={() => setWeather(w.key)}
              title={w.label}
            >
              <i className={`fas ${w.icon}`}></i>
            </button>
          ))}
          {game.adminWeather && (
            <button className="admin-weather-btn" onClick={() => setGame(prev => ({ ...prev, adminWeather: null }))} title="Auto">
              <i className="fas fa-rotate-left"></i>
            </button>
          )}
        </div>
      </div>

      <div className="admin-section">
        <button className="admin-action-btn admin-xp-btn" onClick={grantMaxXP}>
          <i className="fas fa-star"></i> Max XP (moi)
        </button>
        {xpStatus && <span className="admin-xp-status">{xpStatus}</span>}
      </div>

      <div className="admin-section">
        <div className="admin-input-row">
          <label className="admin-label" style={{ flex: 1 }}>{t('admin_char_size')}: {charScale.toFixed(1)}</label>
          <button onClick={resetCharScale} className="admin-send">{t('admin_reset')}</button>
        </div>
        <input type="range" min="0.3" max="2.0" step="0.1" value={charScale}
          onChange={e => updateCharScale(e.target.value)} className="admin-slider" />
      </div>

      <div className="admin-section">
        <label className="admin-label">{t('admin_3d_announce')}</label>
        <div className="admin-input-row">
          <input value={announcement} onChange={e => setAnnouncement(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendAnnouncement()} placeholder="Message..." className="admin-input" />
          <button onClick={sendAnnouncement} className="admin-send">{t('send')}</button>
        </div>
      </div>

      <div className="admin-section">
        <label className="admin-label">{t('admin_chat_msg')}</label>
        <div className="admin-input-row">
          <input value={chatMsg} onChange={e => setChatMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendAdminChat()} placeholder="Message chat..." className="admin-input" />
          <button onClick={sendAdminChat} className="admin-send">{t('send')}</button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
