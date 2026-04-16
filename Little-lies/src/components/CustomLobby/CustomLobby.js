import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import { usePlayersList, isHost, getRoomCode, myPlayer, useMultiplayerState } from 'playroomkit';
import { useTranslation } from 'react-i18next';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, Html } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Character, skinForPlayer } from '../Character/Character';
import GameConfig from '../GameConfig/GameConfig';
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
      {/* Light — wide throw so it washes the surrounding seats & ground */}
      <pointLight position={[0, 1, 0]} intensity={7} color="#ff8833" distance={28} decay={0.9} />
      <pointLight position={[0, 0.5, 0]} intensity={3.5} color="#ff4400" distance={16} decay={1} />
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
// Slow orbit camera
const OrbitCamera = () => {
  useFrame((state) => {
    const t = state.clock.elapsedTime * 0.03;
    const r = 6;
    state.camera.position.set(Math.cos(t) * r, 3.5, Math.sin(t) * r);
    state.camera.lookAt(0, 0.5, 0);
  });
  return null;
};

// Lobby animations — assigned per player index
const LOBBY_ANIMS = ['SitCross', 'LieDown'];

// Player seat around fire
const PlayerSeat = ({ index, total, player, color, isMe }) => {
  const angle = (index / Math.max(total, 1)) * Math.PI * 2;
  const r = 2.2;
  const x = Math.cos(angle) * r;
  const z = Math.sin(angle) * r;
  const lookAtAngle = Math.atan2(-x, -z);

  // Alternate animations based on player index
  const anim = LOBBY_ANIMS[index % LOBBY_ANIMS.length];
  // LieDown animation model is offset upward — compensate with Y shift
  const yOffset = anim === 'LieDown' ? -0.35 : 0;
  const nameY = anim === 'LieDown' ? 1.1 : 1.15;

  return (
    <group position={[x, yOffset, z]} rotation={[0, lookAtAngle, 0]}>
      <Character color={color} animation={anim} scale={0.55} skin={skinForPlayer(player.id)} animOffset={index * 0.5} />
      {/* Aura glow under local player */}
      {isMe && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03 - yOffset, 0]}>
          <circleGeometry args={[0.55, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.12} />
        </mesh>
      )}
      {isMe && (
        <pointLight position={[0, 0.3 - yOffset, 0]} color={color} intensity={1.5} distance={4} />
      )}
      <Html position={[0, nameY, 0]} center distanceFactor={6} style={{ pointerEvents: 'none' }}>
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
              {isMe && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block', marginRight: 6, flexShrink: 0 }} />}
              <span style={nameStyle}>{player.getState?.()?.profile?.name || 'Player'}</span>
            </div>
          );
        })()}
      </Html>
    </group>
  );
};

// ── Main Lobby Component ──

// Lobby chat component with /votehost and /votekick commands
const LobbyChat = () => {
  const { t } = useTranslation('common');
  const currentPlayer = myPlayer();
  const playroom_players = usePlayersList(true);
  const [lobbyMessages, setLobbyMessages] = useMultiplayerState('lobbyChat', []);
  const [lobbyVotes, setLobbyVotes] = useMultiplayerState('lobbyVotes', {});
  const [input, setInput] = useState('');
  const [inputVisible, setInputVisible] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const msgs = lobbyMessages || [];
  const votes = lobbyVotes || {};

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

  const addSystemMsg = (content) => {
    setLobbyMessages([...msgs.slice(-50), {
      id: Date.now(), player: 'system', color: '#888', content, isSystem: true,
    }]);
  };

  const getMyId = () => currentPlayer?.id;
  const majority = Math.floor(playroom_players.length / 2) + 1;

  const handleCommand = (cmd, args) => {
    const myName = currentPlayer?.getState?.()?.profile?.name || 'Player';

    // /votehost <number>
    if (cmd === 'votehost' && args[0]) {
      const idx = parseInt(args[0]) - 1;
      const target = playroom_players[idx];
      if (!target) { addSystemMsg(`Player #${args[0]} not found`); return true; }
      if (playroom_players.length < 3) { addSystemMsg('Min 3 players to vote'); return true; }
      const targetName = target.getState?.()?.profile?.name || 'Player';
      const voteKey = `host_${target.id}`;
      const current = votes[voteKey] || [];
      if (current.includes(getMyId())) { addSystemMsg('Already voted'); return true; }
      const newVotes = [...current, getMyId()];
      setLobbyVotes({ ...votes, [voteKey]: newVotes });
      addSystemMsg(`${myName} voted to make ${targetName} host (${newVotes.length}/${majority})`);
      return true;
    }

    // /votekick <number>
    if (cmd === 'votekick' && args[0]) {
      const idx = parseInt(args[0]) - 1;
      const target = playroom_players[idx];
      if (!target) { addSystemMsg(`Player #${args[0]} not found`); return true; }
      if (target.id === getMyId()) { addSystemMsg('Cannot kick yourself'); return true; }
      if (playroom_players.length < 3) { addSystemMsg('Min 3 players to vote'); return true; }
      const targetName = target.getState?.()?.profile?.name || 'Player';
      const voteKey = `kick_${target.id}`;
      const current = votes[voteKey] || [];
      if (current.includes(getMyId())) { addSystemMsg('Already voted'); return true; }
      const newVotes = [...current, getMyId()];
      setLobbyVotes({ ...votes, [voteKey]: newVotes });
      addSystemMsg(`${myName} voted to kick ${targetName} (${newVotes.length}/${majority})`);
      if (newVotes.length >= majority) {
        addSystemMsg(`${targetName} a été expulsé !`);
        target.kick();
      }
      return true;
    }

    return false;
  };

  const sendMessage = () => {
    if (!input.trim()) return;

    // Handle commands
    if (input.startsWith('/')) {
      const [rawCmd, ...args] = input.trim().split(' ');
      const cmd = rawCmd.slice(1).toLowerCase();
      if (handleCommand(cmd, args)) { setInput(''); setInputVisible(false); return; }
    }

    const name = currentPlayer?.getState?.()?.profile?.name || 'Player';
    const rawColor = currentPlayer?.getState?.()?.profile?.color;
    const color = typeof rawColor === 'object' ? rawColor.color1 : (rawColor || '#ccc');
    setLobbyMessages([...msgs.slice(-50), {
      id: Date.now(), player: name, color, content: input.trim(),
    }]);
    setInput('');
    setInputVisible(false);
  };

  return (
    <div className="lobby-chat">
      <div className="lobby-chat-header">
        <span>Chat</span>
        <button className="lobby-chat-info-btn" onClick={() => setShowInfo(!showInfo)}>
          <i className={`fas ${showInfo ? 'fa-times' : 'fa-circle-info'}`}></i>
        </button>
      </div>

      {showInfo && (
        <div className="lobby-chat-info-panel">
          <div><code>/votehost #</code> — Vote to change host</div>
          <div><code>/votekick #</code> — Vote to kick a player</div>
          <div className="lobby-chat-info-hint"># = player number in list (1, 2, 3...)</div>
          <div className="lobby-chat-info-hint">Majority needed ({majority}/{playroom_players.length})</div>
        </div>
      )}

      <div className="lobby-chat-messages">
        {msgs.map((m) => (
          <div key={m.id} className={`lobby-chat-msg ${m.isSystem ? 'system-msg' : ''}`}>
            {m.isSystem ? (
              <span>{m.content}</span>
            ) : (
              <><strong style={{ color: m.color }}>{m.player}</strong><span>: {m.content}</span></>
            )}
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
          <kbd>Enter</kbd> {t('send').toLowerCase()}
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
  const [game, setGame] = useMultiplayerState('game', {});

  const handleConfigChange = (newConfig) => {
    if (!isHost()) return;
    setGame({ ...(game || {}), config: newConfig });
  };
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

  // Assign / re-assign a unique color.
  //
  // Runs on every playroom_players change (not just once) so that if our
  // local state wasn't yet synced with other players at mount time, we still
  // correct our color once we see them.
  //
  // Conflict rule: sort players deterministically by id (all clients agree
  // on the same order), and the player with the HIGHER sorted index yields.
  // Earlier players keep their color, later players pick a free one.
  useEffect(() => {
    if (!currentPlayer || useGradient) return;
    // Respect saved gradient preference
    const saved = loadGradient();
    if (saved && canUseGradient) return;

    // Deterministic ordering shared across clients
    const sorted = [...playroom_players].sort((a, b) => (a.id < b.id ? -1 : 1));
    const myIndex = sorted.findIndex(p => p.id === currentPlayer.id);
    if (myIndex === -1) return;

    const myColor = currentPlayer.getState?.()?.profile?.color;
    const hasValidSolid = typeof myColor === 'string' && PLAYER_COLORS.includes(myColor);

    // Do we collide with a player that sorts BEFORE us? If yes we yield.
    const earlierConflict = hasValidSolid && sorted.some((p, i) => {
      if (i >= myIndex) return false;
      const c = p.getState?.()?.profile?.color;
      return typeof c === 'string' && c === myColor;
    });

    if (hasValidSolid && !earlierConflict) return; // nothing to do

    // Pick the first color not taken by anyone else
    const takenByOthers = new Set(
      sorted
        .filter(p => p.id !== currentPlayer.id)
        .map(p => p.getState?.()?.profile?.color)
        .filter(c => typeof c === 'string')
    );
    const freeColor = PLAYER_COLORS.find(c => !takenByOthers.has(c));
    if (!freeColor || freeColor === myColor) return;

    setSelectedColor(freeColor);
    currentPlayer.setState('profile', { ...currentPlayer.getState().profile, color: freeColor });
  }, [currentPlayer, playroom_players, useGradient, canUseGradient]);

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
      const fallback = PLAYER_COLORS.find(c => !takenByOthers.has(c)) || PLAYER_COLORS[0];
      handleColorChange(fallback);
    } else {
      setUseGradient(true);
      handleGradientChange(gradColor1, gradColor2);
    }
  };

  // ALL solid colors in use by ANY player (including self)
  const allUsedColors = new Set(
    playroom_players
      .map(p => {
        const c = p.getState?.()?.profile?.color;
        return c && typeof c === 'string' ? c : null;
      })
      .filter(Boolean)
  );
  // Colors taken by OTHER players (can't pick these)
  const takenByOthers = new Set(
    playroom_players
      .filter(p => p.id !== currentPlayer?.id)
      .map(p => {
        const c = p.getState?.()?.profile?.color;
        return c && typeof c === 'string' ? c : null;
      })
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
              isMe={player.id === currentPlayer?.id}
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
                const isMine = !useGradient && selectedColor === color;
                const takenByOther = takenByOthers.has(color);
                const blocked = takenByOther; // can't pick colors taken by others
                return (
                  <button
                    key={color}
                    className={`lobby-color-dot ${isMine ? 'selected' : ''} ${blocked ? 'taken' : ''}`}
                    style={{ '--dot-color': color }}
                    onClick={() => !blocked && handleColorChange(color)}
                    title={blocked ? 'Taken' : isMine ? 'Your color' : color}
                  />
                );
              })}
            </div>

            {/* Gradient option — unlocked at level 6 */}
            <div className="lobby-gradient-section">
              <button
                className={`lobby-gradient-toggle ${useGradient ? 'active' : ''} ${!canUseGradient ? 'locked' : ''}`}
                onClick={canUseGradient ? toggleGradient : undefined}
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
              {playroom_players.map((p, idx) => {
                const n = p.getState?.()?.profile?.name || 'Player';
                const isMe = p.id === currentPlayer?.id;
                const isH = idx === 0;
                return (
                  <div key={p.id} className={`player-list-item ${isMe ? 'is-me' : ''}`}>
                    <span className="player-number">#{idx + 1}</span>
                    <span className="player-dot" style={{ background: getColorCSS(p.getState?.()?.profile?.color) || '#888' }} />
                    <span className="player-list-name">{n}</span>
                    {isH && <span className="player-badge host">{t('common:host')}</span>}
                    {isMe && <span className="player-badge me">{t('common:me')}</span>}
                    {isHost() && !isMe && !isH && (
                      <button
                        className="player-kick-btn"
                        onClick={() => p.kick()}
                        title={t('common:kick')}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <GameConfig config={game?.config} onConfigChange={handleConfigChange} />

          <div className="lobby-actions">
            {playroom_players.length > 0 && isHost() ? (
              <button className="lobby-btn lobby-btn-primary" onClick={() => setIsSelectingRoles(true)}>
                <i className="fas fa-play"></i> {t('common:start_game')}
              </button>
            ) : (
              <p className="lobby-waiting"><i className="fas fa-hourglass-half"></i> {t('setup:waiting_host', { host: playroom_players[0]?.getState?.()?.profile?.name || 'host' })}</p>
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
