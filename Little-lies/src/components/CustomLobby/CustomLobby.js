import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { usePlayersList, isHost, getRoomCode, myPlayer, useMultiplayerState } from 'playroomkit';
import { useTranslation } from 'react-i18next';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Character } from '../Character/Character';
import AuthModal, { ProfileBadge } from '../Auth/Auth';
import { useAuth } from '../Auth/Auth';
import i18n from '../../trad/i18n';
import { AVAILABLE_LANGUAGES } from '../../trad/i18n';
import { getLevel } from '../../utils/xpSystem';
import './CustomLobby.scss';

const GRADIENT_UNLOCK_LEVEL = 6;
const GRADIENT_STORAGE_KEY = 'amongliars_gradient';

// Save/load gradient preference
const saveGradient = (grad) => {
  try { localStorage.setItem(GRADIENT_STORAGE_KEY, JSON.stringify(grad)); } catch {}
};
const loadGradient = () => {
  try { return JSON.parse(localStorage.getItem(GRADIENT_STORAGE_KEY)); } catch { return null; }
};

// Get CSS color string from a color value (supports both solid and gradient)
const getColorCSS = (color) => {
  if (!color) return '#888';
  if (typeof color === 'object' && color.type === 'gradient') {
    return `linear-gradient(135deg, ${color.color1}, ${color.color2})`;
  }
  return color;
};

// Get first color for Three.js (doesn't support gradients)
const getColor3D = (color) => {
  if (!color) return '#888';
  if (typeof color === 'object' && color.type === 'gradient') return color.color1;
  return color;
};

// 15 distinct player colors
const PLAYER_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e91e63', '#00bcd4', '#ff9800', '#8bc34a',
  '#ff5722', '#607d8b', '#cddc39', '#795548', '#03a9f4',
];

// ── Campfire scene components ──

const CampfireFlame = () => {
  const flameRef = useRef();
  useFrame((state) => {
    if (!flameRef.current) return;
    const t = state.clock.elapsedTime;
    flameRef.current.scale.y = 1 + Math.sin(t * 8) * 0.2 + Math.sin(t * 13) * 0.1;
    flameRef.current.scale.x = 1 + Math.sin(t * 6 + 1) * 0.15;
    flameRef.current.rotation.y = t * 0.3;
  });

  return (
    <group>
      {/* Logs */}
      {[0, 1.2, 2.4, 3.6, 4.8].map((angle, i) => (
        <mesh key={i} position={[Math.cos(angle) * 0.4, 0.1, Math.sin(angle) * 0.4]}
          rotation={[0, angle + 0.5, Math.PI / 12]}>
          <cylinderGeometry args={[0.06, 0.08, 0.8, 5]} />
          <meshStandardMaterial color="#4a2a0a" />
        </mesh>
      ))}
      {/* Fire */}
      <group ref={flameRef} position={[0, 0.35, 0]}>
        <mesh><coneGeometry args={[0.3, 0.8, 6]} /><meshBasicMaterial color="#ff4400" transparent opacity={0.85} /></mesh>
        <mesh position={[0, 0.1, 0]}><coneGeometry args={[0.2, 0.6, 5]} /><meshBasicMaterial color="#ff8800" transparent opacity={0.8} /></mesh>
        <mesh position={[0, 0.15, 0]}><coneGeometry args={[0.12, 0.4, 4]} /><meshBasicMaterial color="#ffdd44" transparent opacity={0.9} /></mesh>
        <mesh position={[0, 0.2, 0]}><coneGeometry args={[0.05, 0.2, 4]} /><meshBasicMaterial color="#ffffcc" transparent opacity={0.7} /></mesh>
      </group>
      {/* Light */}
      <pointLight position={[0, 1, 0]} intensity={3} color="#ff8833" distance={15} />
      <pointLight position={[0, 0.5, 0]} intensity={1.5} color="#ff4400" distance={8} />
    </group>
  );
};

// Embers rising from fire
const Embers = () => {
  const meshRef = useRef();
  const count = 20;
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const offsets = useMemo(() =>
    Array.from({ length: count }, () => ({
      speed: 0.4 + Math.random() * 0.6,
      drift: (Math.random() - 0.5) * 1.5,
      driftZ: (Math.random() - 0.5) * 1.5,
      phase: Math.random() * Math.PI * 2,
      size: 0.02 + Math.random() * 0.03,
    })), []);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    for (let i = 0; i < count; i++) {
      const o = offsets[i];
      const life = ((t * o.speed + o.phase) % 1);
      dummy.position.set(
        Math.sin(t * 0.5 + o.phase) * o.drift,
        life * 4,
        Math.cos(t * 0.3 + o.phase) * o.driftZ
      );
      const s = o.size * (1 - life);
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[null, null, count]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial color="#ff6600" transparent opacity={0.8} />
    </instancedMesh>
  );
};

// Ground
const CampGround = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <circleGeometry args={[20, 32]} />
      <meshStandardMaterial color="#1a2a1a" />
    </mesh>
    {/* Stone circle around fire */}
    {Array.from({ length: 10 }).map((_, i) => {
      const angle = (i / 10) * Math.PI * 2;
      return (
        <mesh key={i} position={[Math.cos(angle) * 0.9, 0.05, Math.sin(angle) * 0.9]}>
          <dodecahedronGeometry args={[0.12, 0]} />
          <meshStandardMaterial color="#555" />
        </mesh>
      );
    })}
  </group>
);

// Dark trees in background
const BackgroundTrees = () => {
  const trees = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => {
      const angle = (i / 20) * Math.PI * 2;
      const r = 8 + Math.random() * 7;
      return { x: Math.cos(angle) * r, z: Math.sin(angle) * r, h: 2 + Math.random() * 2, r: angle };
    }), []);

  return (
    <group>
      {trees.map((tree, i) => (
        <group key={i} position={[tree.x, 0, tree.z]}>
          <mesh position={[0, tree.h * 0.4, 0]} castShadow>
            <cylinderGeometry args={[0.08, 0.12, tree.h * 0.8, 5]} />
            <meshStandardMaterial color="#1a1008" />
          </mesh>
          <mesh position={[0, tree.h * 0.8, 0]}>
            <coneGeometry args={[0.8 + Math.random() * 0.4, tree.h * 0.7, 6]} />
            <meshStandardMaterial color="#0a1a0a" />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// Slow orbit camera
const OrbitCamera = () => {
  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.08;
    const r = 6;
    state.camera.position.set(Math.cos(t) * r, 3.5, Math.sin(t) * r);
    state.camera.lookAt(0, 0.5, 0);
  });
  return null;
};

// Lobby animations — assigned per player index
const LOBBY_ANIMS = ['SitCross', 'LieDown'];

// Player seat around fire
const PlayerSeat = ({ index, total, player, color }) => {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  const r = 2.2;
  const x = Math.cos(angle) * r;
  const z = Math.sin(angle) * r;
  const lookAtAngle = Math.atan2(-x, -z);

  // Alternate animations based on player index
  const anim = LOBBY_ANIMS[index % LOBBY_ANIMS.length];

  return (
    <group position={[x, 0, z]} rotation={[0, lookAtAngle, 0]}>
      <Character color={color} animation={anim} scale={0.55} animOffset={index * 0.5} />
      <Html position={[0, 1.6, 0]} center distanceFactor={6} style={{ pointerEvents: 'none' }}>
        {(() => {
          const rawColor = player.getState?.()?.profile?.color;
          const isGrad = rawColor && typeof rawColor === 'object' && rawColor.type === 'gradient';
          const borderCol = isGrad ? rawColor.color1 : (color || '#888');
          const nameStyle = isGrad
            ? { background: `linear-gradient(90deg, ${rawColor.color1}, ${rawColor.color2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
            : { color: color };
          return (
            <div style={{
              backgroundColor: 'rgba(0,0,0,0.7)',
              padding: '3px 10px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
              textShadow: isGrad ? 'none' : '0 1px 4px rgba(0,0,0,0.8)',
              border: `1px solid ${borderCol}`,
            }}>
              <span style={nameStyle}>{player.getState?.()?.profile?.name || 'Player'}</span>
            </div>
          );
        })()}
      </Html>
    </group>
  );
};

// ── Main Lobby Component ──

// Lobby chat component
const LobbyChat = () => {
  const { t } = useTranslation('common');
  const currentPlayer = myPlayer();
  const [lobbyMessages, setLobbyMessages] = useMultiplayerState('lobbyChat', []);
  const [input, setInput] = useState('');
  const [inputVisible, setInputVisible] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const msgs = lobbyMessages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs.length]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Enter' && !inputVisible && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        setInputVisible(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inputVisible]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const name = currentPlayer?.getState?.()?.profile?.name || 'Player';
    const color = currentPlayer?.getState?.()?.profile?.color || '#ccc';
    setLobbyMessages([...msgs.slice(-50), {
      id: Date.now(),
      player: name,
      color,
      content: input.trim(),
    }]);
    setInput('');
    setInputVisible(false);
  };

  return (
    <div className="lobby-chat">
      <div className="lobby-chat-messages">
        {msgs.map((m) => (
          <div key={m.id} className="lobby-chat-msg">
            <strong style={{ color: m.color }}>{m.player}</strong>
            <span>: {m.content}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      {inputVisible ? (
        <input
          ref={inputRef}
          className="lobby-chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') sendMessage();
            if (e.key === 'Escape') { setInputVisible(false); setInput(''); }
          }}
          onBlur={() => { if (!input.trim()) setInputVisible(false); }}
          placeholder="Message..."
          maxLength={150}
          autoFocus
        />
      ) : (
        <div className="lobby-chat-hint">
          <kbd>Enter</kbd> {t('common:send').toLowerCase()}
        </div>
      )}
    </div>
  );
};

const CustomLobby = ({ setIsSelectingRoles }) => {
  const { t } = useTranslation(['setup', 'common']);
  const currentPlayer = myPlayer();
  const playroom_players = usePlayersList(true);
  const { profile } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [playerName, setPlayerName] = useState(
    currentPlayer?.getState?.()?.profile?.name || ''
  );
  const [selectedColor, setSelectedColor] = useState(
    currentPlayer?.getState?.()?.profile?.color || PLAYER_COLORS[0]
  );
  const [useGradient, setUseGradient] = useState(false);
  const [gradColor1, setGradColor1] = useState('#e74c3c');
  const [gradColor2, setGradColor2] = useState('#3498db');

  // Player level for gradient unlock
  const playerLevel = profile ? getLevel(profile.xp) : 1;
  const canUseGradient = playerLevel >= GRADIENT_UNLOCK_LEVEL;

  // Load saved gradient on mount
  useEffect(() => {
    const saved = loadGradient();
    if (saved && canUseGradient) {
      setUseGradient(true);
      setGradColor1(saved.color1 || '#e74c3c');
      setGradColor2(saved.color2 || '#3498db');
      const grad = { type: 'gradient', color1: saved.color1, color2: saved.color2 };
      setSelectedColor(grad);
      if (currentPlayer) {
        currentPlayer.setState('profile', { ...currentPlayer.getState().profile, color: grad });
      }
    }
  }, [canUseGradient]);

  // Sync Supabase username
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
    const code = getRoomCode();
    if (code && typeof code.then === 'function') code.then((c) => setRoomCode(c));
    else setRoomCode(code || '');
  }, []);

  const handleNameChange = (e) => {
    const name = e.target.value;
    setPlayerName(name);
    currentPlayer.setState('profile', { ...currentPlayer.getState().profile, name });
  };

  const handleColorChange = (color) => {
    setSelectedColor(color);
    setUseGradient(false);
    currentPlayer.setState('profile', { ...currentPlayer.getState().profile, color });
  };

  const handleGradientChange = (c1, c2) => {
    const grad = { type: 'gradient', color1: c1, color2: c2 };
    setSelectedColor(grad);
    setGradColor1(c1);
    setGradColor2(c2);
    saveGradient({ color1: c1, color2: c2 });
    currentPlayer.setState('profile', { ...currentPlayer.getState().profile, color: grad });
  };

  const toggleGradient = () => {
    if (!canUseGradient) return;
    if (useGradient) {
      // Switch back to solid
      setUseGradient(false);
      const fallback = PLAYER_COLORS.find(c => !takenColors.has(c)) || PLAYER_COLORS[0];
      handleColorChange(fallback);
    } else {
      setUseGradient(true);
      handleGradientChange(gradColor1, gradColor2);
    }
  };

  // Colors already taken by other players
  const takenColors = new Set(
    playroom_players
      .filter(p => p.id !== currentPlayer?.id)
      .map(p => p.getState?.()?.profile?.color)
      .filter(Boolean)
  );

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
    if (hadRoomCode) window.location.href = url.toString();
    else window.location.reload();
  };

  return (
    <div className="custom-lobby-container">
      {/* 3D Campfire Scene */}
      <Canvas shadows camera={{ position: [6, 3.5, 0], fov: 50 }} dpr={[1, 1.5]}
        gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.8 }}>
        <color attach="background" args={['#050810']} />
        <fog attach="fog" args={['#050810', 10, 25]} />
        <ambientLight intensity={0.05} />

        <Suspense fallback={null}>
          <OrbitCamera />
          <CampGround />
          <CampfireFlame />
          <Embers />
          <BackgroundTrees />
          <Stars radius={50} depth={40} count={2000} factor={3} fade speed={0.5} />

          {/* Players seated around fire */}
          {playroom_players.map((player, idx) => (
            <PlayerSeat
              key={player.id}
              index={idx}
              total={playroom_players.length}
              player={player}
              color={getColor3D(player.getState?.()?.profile?.color) || PLAYER_COLORS[idx % PLAYER_COLORS.length]}
            />
          ))}

          <EffectComposer>
            <Bloom intensity={0.8} luminanceThreshold={0.4} luminanceSmoothing={0.5} mipmapBlur />
            <Vignette offset={0.15} darkness={0.8} />
          </EffectComposer>
        </Suspense>
      </Canvas>

      {/* Auth modal */}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

      {/* UI Panel */}
      <div className="lobby-panel">
        <div className="lobby-panel-inner">
          <h1 className="lobby-title" data-text="AMONG LIARS">AMONG LIARS</h1>
          <p className="lobby-subtitle">{t('setup:multiplayer_lobby')}</p>

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

          {/* Color picker */}
          <div className="lobby-section">
            <label className="lobby-label">{t('common:color', { defaultValue: 'Color' })}</label>
            <div className="lobby-color-picker">
              {PLAYER_COLORS.map((color) => {
                const taken = takenColors.has(color);
                const isSelected = !useGradient && selectedColor === color;
                return (
                  <button
                    key={color}
                    className={`lobby-color-dot ${isSelected ? 'selected' : ''} ${taken ? 'taken' : ''}`}
                    style={{ '--dot-color': color }}
                    onClick={() => !taken && handleColorChange(color)}
                    disabled={taken}
                    title={taken ? 'Taken' : color}
                  />
                );
              })}
            </div>

            {/* Gradient option — unlocked at level 6 */}
            <div className="lobby-gradient-section">
              <button
                className={`lobby-gradient-toggle ${useGradient ? 'active' : ''} ${!canUseGradient ? 'locked' : ''}`}
                onClick={toggleGradient}
                disabled={!canUseGradient}
              >
                <i className={`fas ${canUseGradient ? 'fa-palette' : 'fa-lock'}`}></i>
                {canUseGradient ? (useGradient ? 'Gradient ON' : 'Gradient') : `Niv. ${GRADIENT_UNLOCK_LEVEL}`}
              </button>

              {useGradient && canUseGradient && (
                <div className="lobby-gradient-pickers">
                  <input
                    type="color"
                    value={gradColor1}
                    onChange={(e) => handleGradientChange(e.target.value, gradColor2)}
                    className="lobby-color-input"
                  />
                  <div className="lobby-gradient-preview" style={{
                    background: `linear-gradient(135deg, ${gradColor1}, ${gradColor2})`
                  }} />
                  <input
                    type="color"
                    value={gradColor2}
                    onChange={(e) => handleGradientChange(gradColor1, e.target.value)}
                    className="lobby-color-input"
                  />
                </div>
              )}
            </div>
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
                const n = p.getState?.()?.profile?.name || 'Player';
                const isMe = p.id === currentPlayer?.id;
                const isH = playroom_players.indexOf(p) === 0;
                return (
                  <div key={p.id} className={`player-list-item ${isMe ? 'is-me' : ''}`}>
                    <span className="player-dot" style={{ background: getColorCSS(p.getState?.()?.profile?.color) || '#888' }} />
                    <span className="player-list-name">{n}</span>
                    {isH && <span className="player-badge host">{t('common:host')}</span>}
                    {isMe && <span className="player-badge me">{t('common:me')}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lobby-actions">
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

          <div className="lobby-lang-row">
            {AVAILABLE_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                className={`lobby-lang-btn ${i18n.language === lang.code ? 'active' : ''}`}
                onClick={() => i18n.changeLanguage(lang.code)}
              >
                {lang.flag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lobby Chat */}
      <LobbyChat />
    </div>
  );
};

export default CustomLobby;
