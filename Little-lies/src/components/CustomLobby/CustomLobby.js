import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { usePlayersList, isHost, getRoomCode, myPlayer, useMultiplayerState } from 'playroomkit';
import { useTranslation } from 'react-i18next';
import { skinForPlayer, SKIN_KEYS } from '../Character/Character';
import GameConfig from '../GameConfig/GameConfig';
import { useAuth } from '../Auth/Auth';
import { useGameEngine } from '../../hooks/useGameEngine';
import Legal from '../Legal/Legal';
import Audio from '../../utils/AudioManager';
import i18n from '../../trad/i18n';
import { AVAILABLE_LANGUAGES } from '../../trad/i18n';
import { getLevel } from '../../utils/xpSystem';
import { COLOR_REWARDS } from '../../data/progression';
import { motion, AnimatePresence } from 'framer-motion';
import './CustomLobby.scss';

const GRADIENT_UNLOCK_LEVEL = 6;
const GRADIENT_STORAGE_KEY = 'amongliars_gradient';
const MANUAL_COLOR_STORAGE_KEY = 'amongliars_manual_color';

// Gradient-equality check used to mark the active palette swatch.
const gradientMatches = (a, b) => (
  a && b && typeof a === 'object' && typeof b === 'object' &&
  a.type === 'gradient' && b.type === 'gradient' &&
  a.color1?.toLowerCase?.() === b.color1?.toLowerCase?.() &&
  a.color2?.toLowerCase?.() === b.color2?.toLowerCase?.()
);

// Save/load gradient preference
const saveGradient = (grad) => {
  try { localStorage.setItem(GRADIENT_STORAGE_KEY, JSON.stringify(grad)); } catch {}
};
const loadGradient = () => {
  try { return JSON.parse(localStorage.getItem(GRADIENT_STORAGE_KEY)); } catch { return null; }
};

// Manual solid-color pick. Persisted so the slot-index auto-assign below
// doesn't clobber a deliberate choice the next time the player list
// reshuffles (e.g. another player joins/leaves and the sorted index
// mapping produces a different slot).
const saveManualColor = (color) => {
  try {
    if (color) localStorage.setItem(MANUAL_COLOR_STORAGE_KEY, color);
    else localStorage.removeItem(MANUAL_COLOR_STORAGE_KEY);
  } catch {}
};
const loadManualColor = () => {
  try { return localStorage.getItem(MANUAL_COLOR_STORAGE_KEY); } catch { return null; }
};

// Get CSS color string from a color value (supports both solid and gradient)
const getColorCSS = (color) => {
  if (!color) return '#888';
  if (typeof color === 'object' && color.type === 'gradient') {
    return `linear-gradient(135deg, ${color.color1}, ${color.color2})`;
  }
  return color;
};

// 15 distinct player colors
const PLAYER_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e91e63', '#00bcd4', '#ff9800', '#8bc34a',
  '#ff5722', '#607d8b', '#cddc39', '#795548', '#03a9f4',
];

// Mystical lobby ambiance text — cycles through flavored one-liners
// (campfire, crow, someone-is-lying) every ~7s. Centered near the top
// of the screen, white, no background, soft fade between phrases so it
// stays atmospheric instead of feeling like a notification.
const LobbyMysticText = () => {
  const { t } = useTranslation('common');
  const lines = useMemo(() => {
    const arr = t('lobby_ambiance', { returnObjects: true });
    return Array.isArray(arr) && arr.length > 0 ? arr : null;
  }, [t]);
  const [idx, setIdx] = useState(() =>
    lines ? Math.floor(Math.random() * lines.length) : 0,
  );
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!lines) return;
    const FADE_MS = 600;
    const HOLD_MS = 8500;
    const tick = () => {
      setVisible(false);
      setTimeout(() => {
        setIdx((prev) => {
          // Avoid picking the same line back-to-back (feels more alive).
          if (lines.length <= 1) return prev;
          let next = Math.floor(Math.random() * lines.length);
          if (next === prev) next = (next + 1) % lines.length;
          return next;
        });
        setVisible(true);
      }, FADE_MS);
    };
    const interval = setInterval(tick, HOLD_MS);
    return () => clearInterval(interval);
  }, [lines]);

  if (!lines) return null;
  return (
    <div
      className={`lobby-mystic-text ${visible ? 'is-visible' : 'is-fading'}`}
      aria-live="polite"
    >
      {lines[idx]}
    </div>
  );
};

// ── Main Lobby Component ──

// Lobby chat component with /votehost and /votekick commands
export const LobbyChat = () => {
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
    <>
    <div className="lobby-chat">
      <div className="lobby-chat-header">
        <span>{t('lobby')}</span>
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
        {msgs.map((m) => {
          if (m.isSystem) {
            return (
              <div key={m.id} className="lobby-chat-msg-wrapper system-msg">
                <div className="lobby-chat-msg">{m.content}</div>
              </div>
            );
          }
          const col = typeof m.color === 'object' ? (m.color.color1 || '#ccc') : (m.color || '#ccc');
          return (
            <div key={m.id} className="lobby-chat-msg-wrapper">
              <div className="lobby-chat-msg-bg" style={{ backgroundColor: col }}></div>
              <div className="lobby-chat-msg">
                <strong style={{ color: col }}>{m.player}</strong>
                <span>: {m.content}</span>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
    {inputVisible ? (
      <div className="lobby-chat-input-outside">
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
          placeholder={t('common:lobby_chat_placeholder', { defaultValue: 'Message...' })}
          maxLength={150}
          autoFocus
          aria-label={t('common:lobby_chat_placeholder', { defaultValue: 'Message...' })}
        />
      </div>
    ) : (
      <div className="lobby-chat-hint-outside">
        <kbd>Enter</kbd> {t('send').toLowerCase()}
      </div>
    )}
    </>
  );
};

const CustomLobby = () => {
  const { t } = useTranslation(['setup', 'common']);
  const currentPlayer = myPlayer();
  const playroom_players = usePlayersList(true);
  const { profile } = useAuth();
  const { moveToRoleSelection } = useGameEngine();
  const [game, setGame] = useMultiplayerState('game', {});

  const handleConfigChange = (newConfig) => {
    if (!isHost()) return;
    setGame({ ...(game || {}), config: newConfig });
  };
  // Legal modal stays here — it's the only modal the lobby still owns
  // directly. Auth / Tutorial / Stats / Volume all moved to the TopBar.
  const [showLegal, setShowLegal] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [copied, setCopied] = useState(false);

  // Lobby ambient music — gesture-gated (browser autoplay policy).
  // Starts on the first user pointerdown/keydown anywhere on the page.
  // The music keeps playing across the game (lobby → match → game over →
  // lobby) so the 3-track rotation stays seamless. stopLobbyMusic() is
  // not called here — playLobbyMusic() is idempotent, so re-mounting the
  // lobby doesn't restart the track.
  useEffect(() => {
    const unlock = () => { Audio.playLobbyMusic(); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const [playerName, setPlayerName] = useState(
    currentPlayer?.getState?.()?.profile?.name || ''
  );
  const [selectedColor, setSelectedColor] = useState(
    currentPlayer?.getState?.()?.profile?.color || PLAYER_COLORS[0]
  );
  const [useGradient, setUseGradient] = useState(false);
  const [gradColor1, setGradColor1] = useState('#e74c3c');
  const [gradColor2, setGradColor2] = useState('#3498db');
  // Character model picker — persisted across sessions in localStorage
  // so the choice sticks match-to-match. Falls back to the hash-based
  // `skinForPlayer` if nothing has been saved yet (preserves the look
  // everyone had before the selector existed).
  const [selectedSkin, setSelectedSkin] = useState(() => {
    try {
      const saved = localStorage.getItem('amongliars_skin');
      if (saved && SKIN_KEYS.includes(saved)) return saved;
    } catch { /* ignore */ }
    return skinForPlayer(currentPlayer?.id);
  });

  // Player level for gradient unlock. When the user isn't signed in we
  // have no level → no cosmetic should be available, even the level-1
  // palettes (Slate/Forest) that would otherwise be "free". Guests get
  // solid colors only; palettes and the custom picker require an account.
  const isLoggedIn = !!profile;
  const playerLevel = profile ? getLevel(profile.xp) : 0;
  const canUseGradient = isLoggedIn && playerLevel >= GRADIENT_UNLOCK_LEVEL;

  // Load saved gradient on mount. This used to be gated on canUseGradient,
  // but palettes now unlock at level 1+ so a saved gradient might legitimately
  // come from a palette pick even when the custom picker is still locked.
  // Level never decreases, so anything saved was valid at save-time and
  // remains valid now.
  useEffect(() => {
    const saved = loadGradient();
    if (saved) {
      setUseGradient(true);
      setGradColor1(saved.color1 || '#e74c3c');
      setGradColor2(saved.color2 || '#3498db');
      const grad = { type: 'gradient', color1: saved.color1, color2: saved.color2 };
      setSelectedColor(grad);
      if (currentPlayer) {
        currentPlayer.setState('profile', { ...currentPlayer.getState().profile, color: grad });
      }
    }
  }, []);

  // Auto-assign a unique color on lobby mount / roster change.
  //
  // Strategy: deterministic slot-index mapping. Sort the player list by
  // id (every client agrees on the order), locate our own index, and map
  // that to PLAYER_COLORS[index]. Since every client computes the same
  // index→color map from the same sorted ids, two clients can never pick
  // the same slot simultaneously — no race, no "first free" stale read.
  //
  // Tradeoff: if someone leaves mid-lobby, everyone after them slides one
  // slot and sees their color shift. Acceptable for short pre-game lobbies
  // and a far lesser evil than two players spawning in the same color.
  //
  // Manual picks win: if the user clicked a swatch (persisted in
  // localStorage), we respect it unchanged. Saved gradients likewise.
  useEffect(() => {
    if (!currentPlayer || useGradient) return;
    if (loadGradient()) return; // saved gradient preference

    const myColor = currentPlayer.getState?.()?.profile?.color;

    // Honor a manual solid pick — skip auto-assign entirely. The color
    // must still be a valid PLAYER_COLORS entry; a stale value from an
    // older build gets discarded so we don't end up locked on a color
    // that no longer exists in the palette.
    const manual = loadManualColor();
    if (manual && PLAYER_COLORS.includes(manual)) {
      if (myColor !== manual) {
        setSelectedColor(manual);
        currentPlayer.setState('profile', { ...currentPlayer.getState().profile, color: manual });
      }
      return;
    }

    const sorted = [...playroom_players].sort((a, b) => (a.id < b.id ? -1 : 1));
    const myIndex = sorted.findIndex(p => p.id === currentPlayer.id);
    if (myIndex === -1) return;

    const slotColor = PLAYER_COLORS[myIndex % PLAYER_COLORS.length];
    if (myColor === slotColor) return;

    setSelectedColor(slotColor);
    currentPlayer.setState('profile', { ...currentPlayer.getState().profile, color: slotColor });
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

  // Push the current skin pick into the playroom profile so every client
  // (lobby preview + in-game 3D) sees the same model. Re-fires whenever
  // `currentPlayer` becomes available (late mount) so a saved pick lands
  // even if the user didn't click the selector this session.
  useEffect(() => {
    if (!currentPlayer) return;
    const profileState = currentPlayer.getState?.()?.profile || {};
    if (profileState.skin === selectedSkin) return;
    currentPlayer.setState('profile', { ...profileState, skin: selectedSkin });
  }, [currentPlayer, selectedSkin]);

  const cycleSkin = (direction) => {
    const i = SKIN_KEYS.indexOf(selectedSkin);
    const baseIdx = i === -1 ? 0 : i;
    const nextIdx = (baseIdx + direction + SKIN_KEYS.length) % SKIN_KEYS.length;
    const next = SKIN_KEYS[nextIdx];
    setSelectedSkin(next);
    try { localStorage.setItem('amongliars_skin', next); } catch { /* ignore */ }
    if (currentPlayer) {
      const profileState = currentPlayer.getState?.()?.profile || {};
      currentPlayer.setState('profile', { ...profileState, skin: next });
    }
  };

  const handleColorChange = (color) => {
    setSelectedColor(color);
    setUseGradient(false);
    // Persist so the slot-index auto-assign below doesn't overwrite this
    // deliberate pick the next time the player list re-sorts.
    saveManualColor(color);
    currentPlayer.setState('profile', { ...currentPlayer.getState().profile, color });
  };

  const handleGradientChange = (c1, c2) => {
    const grad = { type: 'gradient', color1: c1, color2: c2 };
    // Flip into gradient mode so the auto solid-color reassign effect
    // doesn't immediately overwrite our choice. Also needed for palette
    // picks from low-level players where canUseGradient is false.
    setUseGradient(true);
    setSelectedColor(grad);
    setGradColor1(c1);
    setGradColor2(c2);
    saveGradient({ color1: c1, color2: c2 });
    // Switching to a gradient clears any old solid pick — otherwise
    // removing the gradient later would snap back to that stale solid
    // instead of the slot-based auto-assign.
    saveManualColor(null);
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

  const writeToClipboard = (text) => {
    // Clipboard API needs a secure context and window focus — both fail in
    // some embedded previews and fullscreen/canvas workflows. Fall back to
    // the legacy execCommand path before giving up so the user still gets
    // the code copied even when the modern API rejects.
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {
        try {
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
        } catch (_) {}
      });
    }
  };

  const copyCode = () => {
    if (!roomCode) return;
    writeToClipboard(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const copyLink = () => {
    writeToClipboard(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
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
      {/* 3D scene is mounted at App.js level via <UnifiedScene /> and
          sits behind every screen overlay. CustomLobby only owns the
          HTML panel + the mystic flavor text from here on. */}

      {/* Ambient flavor text — floats above the 3D scene, below the UI */}
      <LobbyMysticText />

      {/* Legal / credits modal — portal so it floats above the R3F Html player labels */}
      {showLegal && createPortal(<Legal onClose={() => setShowLegal(false)} />, document.body)}

      {/* UI Panel */}
      <div className="lobby-panel">
        <div className="lobby-panel-inner">
          <h1 className="lobby-title" data-text="AMONG LIARS">AMONG LIARS</h1>
          <div className="lobby-subtitle-row">
            <p className="lobby-subtitle">{t('setup:multiplayer_lobby')}</p>
            <div className="lobby-lang-inline">
              {AVAILABLE_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  className={`lobby-lang-flag ${i18n.language === lang.code ? 'active' : ''}`}
                  onClick={() => i18n.changeLanguage(lang.code)}
                  title={lang.label}
                >
                  {lang.flag}
                </button>
              ))}
            </div>
          </div>

          <div className="lobby-section">
            <label className="lobby-label">{t('setup:your_username')}</label>
            <input
              type="text" className="lobby-input"
              value={playerName} onChange={handleNameChange}
              placeholder={t('setup:enter_username')} maxLength={20}
            />
          </div>

          {/* Character model selector — left/right arrows cycle between
              the Villager and Wanderer skins. No dropdown, no modal; the
              label between the arrows reflects the current pick and the
              lobby 3D preview updates in place. */}
          <div className="lobby-section">
            <label className="lobby-label">{t('common:model', { defaultValue: 'Mod\u00e8le' })}</label>
            <div className="lobby-model-picker">
              <button
                type="button"
                className="lobby-model-arrow"
                onClick={() => cycleSkin(-1)}
                aria-label={t('common:model_prev', { defaultValue: 'Mod\u00e8le pr\u00e9c\u00e9dent' })}
              >
                <i className="fas fa-chevron-left"></i>
              </button>
              <span className="lobby-model-name">
                {t(`common:models.${selectedSkin}`, { defaultValue: selectedSkin })}
              </span>
              <button
                type="button"
                className="lobby-model-arrow"
                onClick={() => cycleSkin(1)}
                aria-label={t('common:model_next', { defaultValue: 'Mod\u00e8le suivant' })}
              >
                <i className="fas fa-chevron-right"></i>
              </button>
            </div>
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
                    title={blocked ? t('common:color_taken', { defaultValue: 'Taken' }) : isMine ? t('common:your_color', { defaultValue: 'Your color' }) : color}
                  />
                );
              })}
            </div>

            {/* Unlocked palettes (gradient presets) — shareable across players
                unlike solid colors. Each one applies a fixed 2-color gradient
                from COLOR_REWARDS; locked ones stay visible but disabled. */}
            <div className="lobby-palettes-section">
              <div className="lobby-palettes-label">
                <i className="fas fa-palette"></i> {t('common:palettes_title', { defaultValue: 'Palettes' })}
              </div>
              <div className="lobby-palettes-grid">
                {COLOR_REWARDS.map((palette) => {
                  const unlocked = isLoggedIn && playerLevel >= palette.unlockLevel;
                  const paletteValue = { type: 'gradient', color1: palette.gradient[0], color2: palette.gradient[1] };
                  const isActive = useGradient && gradientMatches(selectedColor, paletteValue);
                  // Guests see the same padlock but a "log in to unlock"
                  // tooltip instead of the level requirement — hides the
                  // per-palette thresholds from non-players.
                  const lockedHint = isLoggedIn
                    ? t('common:palettes_locked_hint', { level: palette.unlockLevel })
                    : t('common:palettes_login_hint', { defaultValue: 'Log in to unlock' });
                  return (
                    <button
                      key={palette.id}
                      className={`lobby-palette-dot ${isActive ? 'selected' : ''} ${unlocked ? '' : 'locked'}`}
                      style={{ '--palette-bg': `linear-gradient(135deg, ${palette.gradient[0]}, ${palette.gradient[1]})` }}
                      onClick={() => unlocked && handleGradientChange(palette.gradient[0], palette.gradient[1])}
                      disabled={!unlocked}
                      title={unlocked ? palette.name[i18n.language?.startsWith('fr') ? 'fr' : 'en'] : lockedHint}
                    >
                      {!unlocked && <i className="fas fa-lock"></i>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom gradient picker — unlocked at level 6 */}
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
            <div className={`room-code-row ${copied ? 'is-copied' : ''}`} onClick={copyCode} role="button" tabIndex={0}>
              <span className="room-code">{roomCode || '...'}</span>
              <button className="lobby-btn-icon" onClick={(e) => { e.stopPropagation(); copyCode(); }} title={t('setup:room_code')}>
                <i className={`fas ${copied ? 'fa-check' : 'fa-copy'}`}></i>
              </button>
              {copied && <span className="room-code-tooltip">{t('common:copied')}</span>}
            </div>
          </div>

          <button className="lobby-btn lobby-btn-secondary" onClick={copyLink}>
            <i className="fas fa-link"></i>
            {copied ? t('common:copied') : t('setup:copy_link')}
          </button>

          <div className="lobby-section">
            <label className="lobby-label">{t('setup:players_count', { count: playroom_players.length })}</label>
            <div className="player-list">
              <AnimatePresence>
                {playroom_players.map((p, idx) => {
                  const n = p.getState?.()?.profile?.name || 'Player';
                  const isMe = p.id === currentPlayer?.id;
                  const isH = idx === 0;
                  return (
                    <motion.div
                      key={p.id}
                      className={`player-list-item ${isMe ? 'is-me' : ''}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.22, ease: 'easeOut' }}
                    >
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
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

          {isHost() && <GameConfig config={game?.config} onConfigChange={handleConfigChange} />}

          <div className="lobby-actions">
            {playroom_players.length > 0 && isHost() ? (
              <button className="lobby-btn lobby-btn-primary" onClick={moveToRoleSelection}>
                <i className="fas fa-play"></i> {t('common:start_game')}
              </button>
            ) : (
              <p className="lobby-waiting"><i className="fas fa-hourglass-half"></i> {t('setup:waiting_host', { host: playroom_players[0]?.getState?.()?.profile?.name || 'host' })}</p>
            )}
            <button className="lobby-btn lobby-btn-ghost" onClick={newLobby}>
              <i className="fas fa-plus"></i> {t('common:new_lobby')}
            </button>
          </div>

          {/* Tutorial / Stats / Auth / Volume moved to the persistent
              TopBar. The lobby panel now only keeps the room-specific
              legal/credits link below. */}

          <button className="lobby-legal-link" onClick={() => setShowLegal(true)}>
            {t('common:legal', { defaultValue: 'Mentions légales & crédits' })}
          </button>

        </div>
      </div>

      {/* Lobby Chat */}
      <LobbyChat />
    </div>
  );
};

export default CustomLobby;
