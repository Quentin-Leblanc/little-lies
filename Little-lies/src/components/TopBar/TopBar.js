import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import AuthModal, { useAuth } from '../Auth/Auth';
import Tutorial from '../Tutorial/Tutorial';
import Time from '../time/Time';
import Audio from '../../utils/AudioManager';
import { getLevel, getXPProgress } from '../../utils/xpSystem';
import './TopBar.scss';

// ─────────────────────────────────────────────────────────────────────
// TopBar — persistent navigation chrome above every screen.
//
//   ┌──────────────────────────────────────────────────────────────┐
//   │ AMONG LIARS │ <centre contextuel> │ Profil · ? · 🔊         │
//   └──────────────────────────────────────────────────────────────┘
//
// Mode drives:
//   - lobby/setup/gameover : 48px tall, full layout
//   - game                  : 36px tall, denser spacing, <Time /> in centre
//
// The 3 right-side affordances replace what used to be scattered across
// the lobby (volume button top-left, ProfileBadge inside the lobby
// panel, "Comment jouer ?" link in the panel footer). One predictable
// place across every screen.
// ─────────────────────────────────────────────────────────────────────

// ── Profile chip ──────────────────────────────────────────────────
// Compact identity card. Logged in → avatar + name + level + tiny xp
// bar with a brief "+N" flash whenever the player's XP increases.
// Guest → "Connexion" call-to-action that opens the same auth modal
// the lobby used to surface inline.
const ProfileChip = ({ onClick }) => {
  const { t } = useTranslation('common');
  const { user, profile } = useAuth();
  const prevXpRef = useRef(profile?.xp || 0);
  const [xpGain, setXpGain] = useState(null);
  // Watch profile.xp — when it jumps, flash a "+N" badge on the chip
  // for ~1.6s. The xp value itself drives the bar width naturally via
  // the next render, so this effect only handles the burst animation.
  useEffect(() => {
    const current = profile?.xp || 0;
    const previous = prevXpRef.current;
    if (current > previous) {
      const delta = current - previous;
      setXpGain(delta);
      const id = setTimeout(() => setXpGain(null), 1600);
      prevXpRef.current = current;
      return () => clearTimeout(id);
    }
    prevXpRef.current = current;
  }, [profile?.xp]);

  if (!user || !profile) {
    return (
      <button
        type="button"
        className="topbar-profile topbar-profile--guest"
        onClick={onClick}
        title={t('login', { defaultValue: 'Connexion' })}
      >
        <i className="fas fa-user-plus" aria-hidden="true"></i>
        <span>{t('login', { defaultValue: 'Connexion' })}</span>
      </button>
    );
  }

  const level = profile.level || getLevel(profile.xp || 0);
  const xpInLevel = getXPProgress(profile.xp || 0);
  const initial = (profile.username || '?').trim().charAt(0).toUpperCase();

  return (
    <button
      type="button"
      className={`topbar-profile topbar-profile--logged ${xpGain ? 'is-gaining' : ''}`}
      onClick={onClick}
      title={t('profile_open', { defaultValue: 'Mon profil' })}
    >
      <span className="topbar-profile__avatar">
        {profile.avatar_url
          ? <img src={profile.avatar_url} alt="" />
          : <span>{initial}</span>}
      </span>
      <span className="topbar-profile__body">
        <span className="topbar-profile__name">{profile.username}</span>
        <span className="topbar-profile__meta">
          <span className="topbar-profile__level">Niv. {level}</span>
          <span className="topbar-profile__xp-bar">
            <span
              className="topbar-profile__xp-fill"
              style={{ width: `${xpInLevel}%` }}
            />
          </span>
        </span>
      </span>
      {xpGain != null && (
        <span className="topbar-profile__gain" aria-live="polite">
          +{xpGain}
        </span>
      )}
    </button>
  );
};

// ── Volume control ───────────────────────────────────────────────
// Inline icon + popup slider. Behaviour copied verbatim from the
// previous lobby implementation so muscle memory carries over.
const VolumeControl = () => {
  const { t } = useTranslation(['menu', 'common']);
  const [open, setOpen] = useState(false);
  const [muted, setMuted] = useState(Audio.isMuted());
  const [volume, setVolume] = useState(Audio.getVolume());
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    };
    // One-tick defer so the click that opened the popup doesn't close it.
    const id = setTimeout(() => document.addEventListener('pointerdown', onDoc), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('pointerdown', onDoc);
    };
  }, [open]);

  const handleToggleMute = () => {
    setMuted(Audio.toggleMute());
  };

  const handleChange = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    Audio.setVolume(v);
    if (v > 0 && muted) {
      Audio.toggleMute();
      setMuted(false);
    }
  };

  const icon = muted || volume === 0
    ? 'fa-volume-mute'
    : volume < 0.4
      ? 'fa-volume-down'
      : 'fa-volume-up';

  return (
    <div className="topbar-volume" ref={rootRef}>
      <button
        type="button"
        className="topbar-icon-btn"
        onClick={() => setOpen((o) => !o)}
        title={muted || volume === 0 ? t('menu:unmute', { defaultValue: 'Activer le son' }) : t('menu:volume', { defaultValue: 'Volume' })}
        aria-label={t('menu:volume', { defaultValue: 'Volume' })}
        aria-expanded={open}
      >
        <i className={`fas ${icon}`} aria-hidden="true"></i>
      </button>
      {open && (
        <div className="topbar-volume__popup" role="dialog">
          <button
            type="button"
            className="topbar-volume__mute"
            onClick={handleToggleMute}
            title={muted ? t('menu:unmute', { defaultValue: 'Activer le son' }) : t('menu:mute', { defaultValue: 'Couper le son' })}
            aria-label={muted ? t('menu:unmute', { defaultValue: 'Activer le son' }) : t('menu:mute', { defaultValue: 'Couper le son' })}
          >
            <i className={`fas ${muted ? 'fa-volume-mute' : 'fa-volume-up'}`} aria-hidden="true"></i>
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.02"
            value={muted ? 0 : volume}
            onChange={handleChange}
            className="topbar-volume__slider"
            aria-label={t('menu:volume', { defaultValue: 'Volume' })}
          />
          <span className="topbar-volume__value">{Math.round((muted ? 0 : volume) * 100)}</span>
        </div>
      )}
    </div>
  );
};

// ── Centre slot ──────────────────────────────────────────────────
const LobbyCentre = ({ roomCode, playersCount }) => {
  const { t } = useTranslation(['setup', 'common']);
  return (
    <div className="topbar-centre topbar-centre--lobby">
      {roomCode && (
        <span className="topbar-pill">
          <i className="fas fa-door-closed" aria-hidden="true"></i>
          <span className="topbar-pill__label">{t('setup:room_code', { defaultValue: 'Code' })}</span>
          <span className="topbar-pill__value">{roomCode}</span>
        </span>
      )}
      <span className="topbar-pill topbar-pill--players">
        <i className="fas fa-users" aria-hidden="true"></i>
        <span className="topbar-pill__value">{playersCount}</span>
      </span>
    </div>
  );
};

const SetupCentre = ({ roomCode, playersCount }) => {
  const { t } = useTranslation(['setup', 'common']);
  return (
    <div className="topbar-centre topbar-centre--setup">
      <span className="topbar-pill topbar-pill--accent">
        <i className="fas fa-scroll" aria-hidden="true"></i>
        <span className="topbar-pill__value">
          {t('setup:topbar_label', { defaultValue: 'Rôles' })}
        </span>
      </span>
      {roomCode && (
        <span className="topbar-pill">
          <i className="fas fa-door-closed" aria-hidden="true"></i>
          <span className="topbar-pill__value">{roomCode}</span>
        </span>
      )}
      <span className="topbar-pill topbar-pill--players">
        <i className="fas fa-users" aria-hidden="true"></i>
        <span className="topbar-pill__value">{playersCount}</span>
      </span>
    </div>
  );
};

const GameOverCentre = () => {
  const { t } = useTranslation(['game', 'common']);
  return (
    <div className="topbar-centre topbar-centre--gameover">
      <span className="topbar-pill topbar-pill--accent">
        <i className="fas fa-flag-checkered" aria-hidden="true"></i>
        <span className="topbar-pill__value">
          {t('game:game_over_title', { defaultValue: 'Partie terminée' })}
        </span>
      </span>
    </div>
  );
};

// ── TopBar ────────────────────────────────────────────────────────
const TopBar = ({ mode = 'lobby', roomCode = '', playersCount = 0 }) => {
  const [showAuth, setShowAuth] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const compact = mode === 'game';

  return (
    <>
      <header className={`topbar topbar--${mode} ${compact ? 'topbar--compact' : ''}`}>
        <div className="topbar-left">
          <span className="topbar-logo" aria-label="Among Liars">
            <span className="topbar-logo__text">AMONG LIARS</span>
          </span>
        </div>

        <div className="topbar-middle">
          {mode === 'lobby' && <LobbyCentre roomCode={roomCode} playersCount={playersCount} />}
          {mode === 'setup' && <SetupCentre roomCode={roomCode} playersCount={playersCount} />}
          {mode === 'game' && <Time />}
          {mode === 'gameover' && <GameOverCentre />}
        </div>

        <div className="topbar-right">
          <ProfileChip onClick={() => setShowAuth(true)} />
          <button
            type="button"
            className="topbar-icon-btn topbar-icon-btn--help"
            onClick={() => setShowTutorial(true)}
            title="Comment jouer ?"
            aria-label="Comment jouer ?"
          >
            <i className="fas fa-question" aria-hidden="true"></i>
          </button>
          <VolumeControl />
        </div>
      </header>

      {/* Modals — portaled so they sit above everything including the
          UnifiedScene canvas and any active in-game overlay. */}
      {showAuth && createPortal(
        <AuthModal onClose={() => setShowAuth(false)} />,
        document.body,
      )}
      {showTutorial && createPortal(
        <Tutorial onClose={() => setShowTutorial(false)} />,
        document.body,
      )}
    </>
  );
};

export default TopBar;
