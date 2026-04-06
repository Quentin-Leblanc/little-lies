import React, { useState, useEffect, useRef } from 'react';
import { usePlayersList, isHost, getRoomCode, myPlayer } from 'playroomkit';
import { CharacterController } from '../CharacterController/CharacterController';
import LobbyParkour from '../LobbyParkour/LobbyParkour';
import CameraFollow from './CameraFollow';
import { Canvas } from '@react-three/fiber';
import { Physics } from '@react-three/rapier';
import { PerformanceMonitor } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { TEXT_LAYER } from '../../utils/constants';
import './CustomLobby.scss';

const CustomLobby = ({ setIsSelectingRoles }) => {
  const currentPlayer = myPlayer();
  const playroom_players = usePlayersList(true);
  const [keys, setKeys] = useState({});
  const [roomCode, setRoomCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [playerName, setPlayerName] = useState(
    currentPlayer?.getState?.()?.profile?.name || ''
  );
  const localBodyRef = useRef();
  const localRotRef = useRef(0);

  useEffect(() => {
    const down = (e) => setKeys((p) => ({ ...p, [e.code]: true }));
    const up = (e) => setKeys((p) => ({ ...p, [e.code]: false }));
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
    url.searchParams.delete('r');
    window.location.href = url.toString();
  };

  return (
    <div className="custom-lobby-container">
      {/* 3D Scene */}
      <Canvas shadows camera={{ position: [0, 10, 18], fov: 55 }} dpr={[1, 1.5]}>
        <color attach="background" args={['#e8e8f0']} />
        <fog attach="fog" args={['#e8e8f0', 80, 180]} />
        <PerformanceMonitor />
        <ambientLight intensity={0.7} />
        <directionalLight
          castShadow position={[15, 25, 10]} intensity={1.2} color="#ffffff"
          shadow-mapSize-width={2048} shadow-mapSize-height={2048}
          shadow-camera-left={-35} shadow-camera-right={35}
          shadow-camera-top={35} shadow-camera-bottom={-35}
        />
        <hemisphereLight intensity={0.5} groundColor="#b0b0c0" color="#ffffff" />
        <EffectComposer>
          <Bloom intensity={0.8} luminanceThreshold={0.3} luminanceSmoothing={0.2} />
        </EffectComposer>

        <CameraFollow target={localBodyRef} rotationRef={localRotRef} />

        <Physics gravity={[0, -20, 0]}>
          <LobbyParkour />
          {playroom_players.map((player, idx) => {
            const name = player.getState?.()?.profile?.name || 'Joueur';
            const isLocal = player.id === currentPlayer?.id;
            return (
              <CharacterController
                key={player.id}
                position={[idx * 1.5 - 2, 1.5, 0]}
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

      {/* UI Panel */}
      <div className="lobby-panel">
        <div className="lobby-panel-inner">
          <h1 className="lobby-title">LITTLE LIES</h1>
          <p className="lobby-subtitle">Salon multijoueur</p>

          <div className="lobby-section">
            <label className="lobby-label">Ton pseudo</label>
            <input
              type="text" className="lobby-input"
              value={playerName} onChange={handleNameChange}
              placeholder="Entrer un pseudo..." maxLength={20}
            />
          </div>

          <div className="lobby-section">
            <label className="lobby-label">Code du salon</label>
            <div className="room-code-row">
              <span className="room-code">{roomCode || '...'}</span>
              <button className="lobby-btn-icon" onClick={copyCode} title="Copier le code">
                <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
              </button>
            </div>
          </div>

          <button className="lobby-btn lobby-btn-secondary" onClick={copyLink}>
            <i className="fas fa-link"></i>
            {copied ? 'Copié !' : 'Copier le lien d\'invitation'}
          </button>

          <div className="lobby-section">
            <label className="lobby-label">Joueurs ({playroom_players.length})</label>
            <div className="player-list">
              {playroom_players.map((p) => {
                const n = p.getState?.()?.profile?.name || 'Joueur';
                const isMe = p.id === currentPlayer?.id;
                const isH = playroom_players.indexOf(p) === 0;
                return (
                  <div key={p.id} className={`player-list-item ${isMe ? 'is-me' : ''}`}>
                    <span className="player-dot" style={{ background: p.getState?.()?.profile?.color || '#888' }} />
                    <span className="player-list-name">{n}</span>
                    {isH && <span className="player-badge host">HOST</span>}
                    {isMe && <span className="player-badge me">TOI</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lobby-instructions">
            <i className="fas fa-keyboard"></i> ZQSD / Flèches = bouger &middot; Espace = sauter
          </div>

          <div className="lobby-actions">
            {isHost() ? (
              <button className="lobby-btn lobby-btn-primary" onClick={() => setIsSelectingRoles(true)}>
                <i className="fas fa-play"></i> Lancer la partie
              </button>
            ) : (
              <p className="lobby-waiting"><i className="fas fa-hourglass-half"></i> En attente de l'hote...</p>
            )}
            <button className="lobby-btn lobby-btn-ghost" onClick={newLobby}>
              <i className="fas fa-plus"></i> Nouveau salon
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomLobby;
