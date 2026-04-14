import React, { useState, useEffect, useRef } from 'react';
import { usePlayersList, isHost, getRoomCode, myPlayer } from 'playroomkit';
import { useTranslation } from 'react-i18next';
import { CharacterController } from '../CharacterController/CharacterController';
import LobbyParkour from '../LobbyParkour/LobbyParkour';
import CameraFollow from './CameraFollow';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { TEXT_LAYER } from '../../utils/constants';
import AuthModal, { ProfileBadge } from '../Auth/Auth';
import { useAuth } from '../Auth/Auth';
import './CustomLobby.scss';

const CustomLobby = ({ setIsSelectingRoles }) => {
  const { t } = useTranslation(['setup', 'common']);
  const currentPlayer = myPlayer();
  const playroom_players = usePlayersList(true);
  const { user, profile } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [keys, setKeys] = useState({});
  const [roomCode, setRoomCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [playerName, setPlayerName] = useState(
    currentPlayer?.getState?.()?.profile?.name || ''
  );
  const localBodyRef = useRef();
  const localRotRef = useRef(0);

  // Sync Supabase username to PlayroomKit on login
  useEffect(() => {
    if (profile?.username && currentPlayer) {
      const current = currentPlayer.getState?.()?.profile?.name;
      if (current !== profile.username) {
        currentPlayer.setState('profile', {
          ...currentPlayer.getState().profile,
          name: profile.username,
        });
        setPlayerName(profile.username);
      }
    }
  }, [profile?.username]);

  useEffect(() => {
    const isTyping = () => {
      const tag = document.activeElement?.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    };
    const down = (e) => { if (!isTyping()) setKeys((p) => ({ ...p, [e.code]: true })); };
    const up = (e) => { setKeys((p) => ({ ...p, [e.code]: false })); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => {
    const code = getRoomCode();
    if (code && typeof code.then === 'function') code.then((c) => setRoomCode(c));
    else setRoomCode(code || '');
  }, []);

  const dir = (k) => {
    const d = { x: 0, z: 0 };
    if (k['ArrowUp'] || k['KeyW']) d.z -= 1;
    if (k['ArrowDown'] || k['KeyS']) d.z += 1;
    if (k['ArrowLeft'] || k['KeyA']) d.x -= 1;
    if (k['ArrowRight'] || k['KeyD']) d.x += 1;
    return d;
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    setPlayerName(name);
    currentPlayer.setState('profile', { ...currentPlayer.getState().profile, name });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const newLobby = () => {
    const url = new URL(window.location.href);
    const hadRoomCode = url.searchParams.has('r');
    url.searchParams.delete('r');
    if (hadRoomCode) {
      window.location.href = url.toString();
    } else {
      // URL already has no room code — force a full reload to create a fresh room
      window.location.reload();
    }
  };

  return (
    <div className="custom-lobby-container">
      {/* 3D Scene */}
      <Canvas shadows camera={{ position: [0, 10, 18], fov: 55 }} dpr={[1, 1.5]}>
        <color attach="background" args={['#87CEEB']} />
        <fog attach="fog" args={['#87CEEB', 80, 180]} />
        <PerformanceMonitor />
        <ambientLight intensity={0.6} />
        <directionalLight
          castShadow position={[15, 25, 10]} intensity={2.5} color="#fff5e0"
          shadow-mapSize-width={2048} shadow-mapSize-height={2048}
          shadow-camera-left={-35} shadow-camera-right={35}
          shadow-camera-top={35} shadow-camera-bottom={-35}
        />
        <hemisphereLight intensity={0.4} groundColor="#8B7355" color="#87CEEB" />
        <EffectComposer>
          <Bloom intensity={0.3} luminanceThreshold={0.8} luminanceSmoothing={0.4} />
        </EffectComposer>

        <CameraFollow target={localBodyRef} rotationRef={localRotRef} />

        <Physics gravity={[0, -20, 0]}>
          <LobbyParkour />
          {playroom_players.map((player, idx) => {
            const name = player.getState?.()?.profile?.name || 'Joueur';
            const isLocal = player.id === currentPlayer?.id;
            // Unique spawn based on player ID hash — avoids collisions
            const idHash = player.id ? player.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) : idx * 137;
            const spawnAngle = (idHash % 360) * (Math.PI / 180);
            const spawnRadius = 3 + (idHash % 4);
            const spawnX = Math.cos(spawnAngle) * spawnRadius;
            const spawnZ = Math.sin(spawnAngle) * spawnRadius;
            return (
              <CharacterController
                key={player.id}
                position={[spawnX, 0.5, spawnZ]}
                state={player}
                isLocalPlayer={isLocal}
                playerName={name}
                moveDirection={isLocal ? dir(keys) : null}
                textLayer={TEXT_LAYER}
                bodyRef={isLocal ? localBodyRef : undefined}
                rotationRef={isLocal ? localRotRef : undefined}
              />
            );
          })}
        </Physics>
      </Canvas>

      {/* Auth modal */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* UI Panel */}
      <div className="lobby-panel">
        <div className="lobby-panel-inner">
          <h1 className="lobby-title">AMONG LIARS</h1>
          <p className="lobby-subtitle">{t('setup:multiplayer_lobby')}</p>

          {/* Profile badge / Login */}
          <div className="lobby-section lobby-auth-section">
            <ProfileBadge onClick={() => setShowAuth(true)} />
          </div>

          <div className="lobby-section">
            <label className="lobby-label">{t('setup:your_username')}</label>
            <input
              type="text" className="lobby-input"
              value={playerName} onChange={handleNameChange}
              placeholder={t('setup:enter_username')} maxLength={20}
            />
          </div>

          <div className="lobby-section">
            <label className="lobby-label">{t('setup:room_code')}</label>
            <div className="room-code-row">
              <span className="room-code">{roomCode || '...'}</span>
              <button className="lobby-btn-icon" onClick={copyCode} title={t('setup:room_code')}>
                <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
              </button>
            </div>
          </div>

          <button className="lobby-btn lobby-btn-secondary" onClick={copyLink}>
            <i className="fas fa-link"></i>
            {copied ? t('common:copied') : t('setup:copy_link')}
          </button>

          <div className="lobby-section">
            <label className="lobby-label">{t('setup:players_count', { count: playroom_players.length })}</label>
            <div className="player-list">
              {playroom_players.map((p) => {
                const n = p.getState?.()?.profile?.name || 'Joueur';
                const isMe = p.id === currentPlayer?.id;
                const isH = playroom_players.indexOf(p) === 0;
                return (
                  <div key={p.id} className={`player-list-item ${isMe ? 'is-me' : ''}`}>
                    <span className="player-dot" style={{ background: p.getState?.()?.profile?.color || '#888' }} />
                    <span className="player-list-name">{n}</span>
                    {isH && <span className="player-badge host">{t('common:host')}</span>}
                    {isMe && <span className="player-badge me">{t('common:me')}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lobby-instructions">
            <i className="fas fa-keyboard"></i> {t('setup:controls')}
          </div>

          <div className="lobby-actions">
            {/* isHost() re-evaluated on each render triggered by usePlayersList changes */}
            {playroom_players.length > 0 && isHost() ? (
              <button className="lobby-btn lobby-btn-primary" onClick={() => setIsSelectingRoles(true)}>
                <i className="fas fa-play"></i> {t('common:start_game')}
              </button>
            ) : (
              <p className="lobby-waiting"><i className="fas fa-hourglass-half"></i> {t('setup:waiting_host', { host: '...' })}</p>
            )}
            <button className="lobby-btn lobby-btn-ghost" onClick={newLobby}>
              <i className="fas fa-plus"></i> {t('common:new_lobby')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomLobby;
