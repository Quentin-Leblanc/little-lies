import React, { useState, useCallback } from 'react';
import { useGameEngine } from '../../hooks/useGameEngine';
import './AdminPanel.scss';

// SHA-256 hash comparison (no plaintext password in code)
const ADMIN_HASH = 'cb9ab1bf41b54456b0e80459c734fccb905c098bf30942ee40a76f111256c9fc';

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const AdminPanel = () => {
  const { game, setGame, setPlayers, getPlayers, addChatSystem, CONSTANTS } = useGameEngine();
  const [showPrompt, setShowPrompt] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [chatMsg, setChatMsg] = useState('');
  const [charScale, setCharScale] = useState(game?.characterScale || 0.8);

  const handleUnlock = useCallback(async () => {
    const hash = await sha256(password);
    if (hash === ADMIN_HASH) {
      setUnlocked(true);
      setError('');
      setPassword('');
    } else {
      setError('Mot de passe incorrect');
      setTimeout(() => setError(''), 2000);
    }
  }, [password]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleUnlock();
    if (e.key === 'Escape') { setShowPrompt(false); setPassword(''); }
  };

  // Admin actions
  const skipToNextDay = () => {
    const nextDayCount = (game.dayCount || 1) + 1;
    setGame(prev => ({
      ...prev,
      phase: CONSTANTS.PHASE.DEATH_REPORT,
      timer: CONSTANTS.DURATIONS.DEATH_REPORT,
      isDay: true,
      dayCount: nextDayCount,
      trialsToday: 0,
      accusedId: null,
      skipVotes: [],
    }));
    addChatSystem(`[ADMIN] Passage au jour ${nextDayCount}`, '#ff4444');
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
    addChatSystem('[ADMIN] Retour au lobby', '#ff4444');
  };

  const updateCharScale = (val) => {
    const s = parseFloat(val);
    setCharScale(s);
    setGame(prev => ({ ...prev, characterScale: s }));
  };

  const sendAnnouncement = () => {
    if (!announcement.trim()) return;
    setGame(prev => ({ ...prev, adminAnnouncement: announcement.trim() }));
    setTimeout(() => setGame(prev => ({ ...prev, adminAnnouncement: null })), 8000);
    setAnnouncement('');
  };

  const sendAdminChat = () => {
    if (!chatMsg.trim()) return;
    addChatSystem(`[ADMIN] ${chatMsg.trim()}`, '#ff4444');
    setChatMsg('');
  };

  // Hidden dot button
  if (!showPrompt && !unlocked) {
    return (
      <button
        className="admin-dot"
        onClick={() => setShowPrompt(true)}
        title=""
      />
    );
  }

  // Password prompt
  if (showPrompt && !unlocked) {
    return (
      <div className="admin-prompt">
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="..."
          autoFocus
          className="admin-pw-input"
        />
        <button onClick={handleUnlock} className="admin-pw-btn">OK</button>
        <button onClick={() => { setShowPrompt(false); setPassword(''); }} className="admin-pw-close">X</button>
        {error && <span className="admin-pw-error">{error}</span>}
      </div>
    );
  }

  // Admin panel
  return (
    <div className="admin-panel">
      <div className="admin-header">
        <span><i className="fas fa-shield-alt"></i> Admin</span>
        <button onClick={() => setUnlocked(false)} className="admin-close">X</button>
      </div>

      <div className="admin-section">
        <button className="admin-action-btn" onClick={skipToNextDay}>
          <i className="fas fa-forward"></i> Passer au jour suivant
        </button>
        <button className="admin-action-btn admin-danger" onClick={kickToLobby}>
          <i className="fas fa-sign-out-alt"></i> Kick tous → Lobby
        </button>
      </div>

      <div className="admin-section">
        <label className="admin-label">Taille personnages: {charScale.toFixed(1)}</label>
        <input
          type="range"
          min="0.3"
          max="2.0"
          step="0.1"
          value={charScale}
          onChange={e => updateCharScale(e.target.value)}
          className="admin-slider"
        />
      </div>

      <div className="admin-section">
        <label className="admin-label">Annonce scène 3D</label>
        <div className="admin-input-row">
          <input
            value={announcement}
            onChange={e => setAnnouncement(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendAnnouncement()}
            placeholder="Message..."
            className="admin-input"
          />
          <button onClick={sendAnnouncement} className="admin-send">Envoyer</button>
        </div>
      </div>

      <div className="admin-section">
        <label className="admin-label">Message admin chat</label>
        <div className="admin-input-row">
          <input
            value={chatMsg}
            onChange={e => setChatMsg(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendAdminChat()}
            placeholder="Message chat..."
            className="admin-input"
          />
          <button onClick={sendAdminChat} className="admin-send">Envoyer</button>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
