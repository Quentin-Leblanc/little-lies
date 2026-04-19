import React, { useState, useEffect } from 'react';
import { useMultiplayerState } from 'playroomkit';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../../hooks/useGameEngine';
import { useAuth } from '../Auth/Auth';
import { isAdmin as checkIsAdmin } from '../../utils/supabase';
import { toTextCss } from '../../utils/playerColor';
import './AdminPanel.scss';

const AdminPanel = () => {
  const { t } = useTranslation('common');
  const { game, setGame, setPlayers, getPlayers, addChatSystem, CONSTANTS } = useGameEngine();
  const { user } = useAuth();
  const [adminCharScale, setAdminCharScale] = useMultiplayerState('adminCharScale', 0.8);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [visible, setVisible] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [chatMsg, setChatMsg] = useState('');
  const charScale = adminCharScale || 0.8;

  // Check admin status from Supabase profile
  useEffect(() => {
    if (user?.id) {
      checkIsAdmin(user.id).then(setIsAdminUser);
    } else {
      setIsAdminUser(false);
    }
  }, [user?.id]);

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
              {p.isAlive && (
                <button
                  className="admin-kill-btn"
                  onClick={() => killPlayer(p.id)}
                  aria-label={t('admin_kill_player', { defaultValue: 'Kill', name: p.profile?.name || '' })}
                >
                  <i className="fas fa-skull" aria-hidden="true"></i>
                </button>
              )}
              {!p.isAlive && <span className="admin-dead-tag">{t('dead').toLowerCase()}</span>}
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
