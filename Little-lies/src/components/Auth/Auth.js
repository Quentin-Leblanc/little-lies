import React, { useState, useEffect, createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import {
  supabase,
  isSupabaseConfigured,
  signUpWithEmail,
  signInWithEmail,
  signInWithOAuth,
  signOut,
  getProfile,
  updateProfile,
} from '../../utils/supabase';
import { TIERS, COLOR_REWARDS, getTierForLevel, getNextTier, getTierProgress } from '../../data/progression';
import './Auth.scss';

// Auth context — provides user + profile to the entire app
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        getProfile(session.user.id).then(setProfile);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const p = await getProfile(session.user.id);
          setProfile(p);
        } else {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = async () => {
    if (user) {
      const p = await getProfile(user.id);
      setProfile(p);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

// ============================================================
// Profile panel (shown when user is connected) — rich view with
// avatar, tier, stats, rewards grid.
// ============================================================
const ProfilePanel = ({ onClose }) => {
  const { t, i18n } = useTranslation('common');
  const { user, profile, refreshProfile, signOut: contextSignOut } = useAuth();

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(profile?.username || '');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');

  const lang = i18n.language?.startsWith('fr') ? 'fr' : 'en';
  const level = profile?.level || 1;
  const xp = profile?.xp || 0;
  const gamesPlayed = profile?.games_played || 0;
  const gamesWon = profile?.games_won || 0;
  const winRate = gamesPlayed > 0 ? Math.round((gamesWon / gamesPlayed) * 100) : 0;
  const tier = getTierForLevel(level);
  const nextTier = getNextTier(level);
  const tierProgress = getTierProgress(level);
  const xpInLevel = xp % 100;
  const initial = (profile?.username || '?').trim().charAt(0).toUpperCase();

  const handleSaveName = async () => {
    const trimmed = nameDraft.trim();
    if (!trimmed) { setNameError(t('username_required')); return; }
    if (trimmed.length > 20) { setNameError(t('username_too_long')); return; }
    if (trimmed === profile.username) { setEditingName(false); return; }
    setSavingName(true);
    setNameError('');
    const { error } = await updateProfile(user.id, { username: trimmed });
    setSavingName(false);
    if (error) {
      // Postgres unique_violation (23505) on profiles.username means someone
      // else already took that handle. Surface a friendly message instead of
      // the raw "duplicate key value violates unique constraint" noise.
      const isTaken =
        error.code === '23505' ||
        /duplicate key|profiles_username_key/i.test(error.message || '');
      setNameError(isTaken ? t('username_taken') : error.message);
    } else {
      await refreshProfile();
      setEditingName(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-dialog profile-panel" onClick={(e) => e.stopPropagation()}>

        {/* Header : avatar, pseudo éditable, rang */}
        <div className="profile-hero">
          <button className="close-button profile-close" onClick={onClose}>X</button>

          <div
            className="profile-avatar"
            style={{ background: `linear-gradient(135deg, ${tier.gradient[0]}, ${tier.gradient[1]})` }}
          >
            <span className="profile-avatar-initial">{initial}</span>
            <div className="profile-avatar-tier" title={tier.name[lang]}>
              <i className={`fas ${tier.icon}`}></i>
            </div>
          </div>

          <div className="profile-hero-info">
            {editingName ? (
              <div className="profile-name-edit">
                <input
                  type="text"
                  className="profile-name-input"
                  value={nameDraft}
                  onChange={(e) => { setNameDraft(e.target.value); setNameError(''); }}
                  maxLength={20}
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') { setEditingName(false); setNameDraft(profile.username); } }}
                />
                <button className="profile-name-save" onClick={handleSaveName} disabled={savingName}>
                  <i className="fas fa-check"></i>
                </button>
                <button
                  className="profile-name-cancel"
                  onClick={() => { setEditingName(false); setNameDraft(profile.username); setNameError(''); }}
                  disabled={savingName}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            ) : (
              <div className="profile-name-display">
                <h2 className="profile-name">{profile.username}</h2>
                <button
                  className="profile-name-edit-btn"
                  onClick={() => { setNameDraft(profile.username); setEditingName(true); }}
                  title={t('edit')}
                >
                  <i className="fas fa-pen"></i>
                </button>
              </div>
            )}
            {nameError && <p className="auth-error"><i className="fas fa-exclamation-circle"></i> {nameError}</p>}

            <div className="profile-tier-label" style={{ color: tier.gradient[1] }}>
              <i className={`fas ${tier.icon}`}></i> {tier.name[lang]}
              <span className="profile-level-badge">{t('level')} {level}</span>
            </div>
          </div>
        </div>

        {/* Tier progress bar (to next rank) */}
        {nextTier && (
          <div className="profile-tier-progress">
            <div className="profile-tier-progress-label">
              <span>{tier.name[lang]}</span>
              <span>{nextTier.name[lang]} ({t('level')} {nextTier.minLevel})</span>
            </div>
            <div className="profile-tier-progress-bar">
              <div
                className="profile-tier-progress-fill"
                style={{
                  width: `${tierProgress * 100}%`,
                  background: `linear-gradient(90deg, ${tier.gradient[0]}, ${nextTier.gradient[0]})`,
                }}
              />
            </div>
          </div>
        )}

        {/* XP progress within current level */}
        <div className="profile-xp-section">
          <div className="profile-xp-label">
            <span><i className="fas fa-star"></i> {xp} XP</span>
            <span className="profile-xp-next">{100 - xpInLevel} XP → {t('level')} {level + 1}</span>
          </div>
          <div className="profile-xp-bar">
            <div className="profile-xp-fill" style={{ width: `${xpInLevel}%` }} />
          </div>
        </div>

        {/* Stats grid */}
        <div className="profile-stats-grid">
          <div className="profile-stat">
            <i className="fas fa-gamepad"></i>
            <strong>{gamesPlayed}</strong>
            <span>{t('games_played_label')}</span>
          </div>
          <div className="profile-stat">
            <i className="fas fa-trophy"></i>
            <strong>{gamesWon}</strong>
            <span>{t('wins')}</span>
          </div>
          <div className="profile-stat">
            <i className="fas fa-chart-line"></i>
            <strong>{winRate}%</strong>
            <span>{t('win_rate')}</span>
          </div>
        </div>

        {/* Tier rewards — show all tiers, highlight current */}
        <div className="profile-section">
          <h3 className="profile-section-title">
            <i className="fas fa-medal"></i> {t('ranks')}
          </h3>
          <div className="profile-tiers-grid">
            {TIERS.map((ti) => {
              const unlocked = level >= ti.minLevel;
              const isCurrent = ti.key === tier.key;
              return (
                <div
                  key={ti.key}
                  className={`profile-tier-card ${unlocked ? 'unlocked' : 'locked'} ${isCurrent ? 'current' : ''}`}
                  style={unlocked ? { borderColor: ti.gradient[1] } : null}
                >
                  <div
                    className="profile-tier-icon"
                    style={unlocked ? { background: `linear-gradient(135deg, ${ti.gradient[0]}, ${ti.gradient[1]})` } : null}
                  >
                    <i className={`fas ${ti.icon}`}></i>
                  </div>
                  <div className="profile-tier-name">{ti.name[lang]}</div>
                  <div className="profile-tier-req">{t('level')} {ti.minLevel}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Color skins — unlockable */}
        <div className="profile-section">
          <h3 className="profile-section-title">
            <i className="fas fa-palette"></i> {t('color_skins')}
            <span className="profile-section-hint">{t('coming_soon_short')}</span>
          </h3>
          <div className="profile-skins-grid">
            {COLOR_REWARDS.map((c) => {
              const unlocked = level >= c.unlockLevel;
              return (
                <div key={c.id} className={`profile-skin ${unlocked ? 'unlocked' : 'locked'}`}>
                  <div
                    className="profile-skin-swatch"
                    style={{ background: `linear-gradient(135deg, ${c.gradient[0]}, ${c.gradient[1]})` }}
                  />
                  <div className="profile-skin-name">{c.name[lang]}</div>
                  <div className="profile-skin-req">
                    {unlocked ? <><i className="fas fa-check"></i> {t('unlocked')}</> : <><i className="fas fa-lock"></i> {t('level')} {c.unlockLevel}</>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Teaser — future features */}
        <div className="profile-section profile-section-teaser">
          <h3 className="profile-section-title">
            <i className="fas fa-flask"></i> {t('coming_soon')}
          </h3>
          <div className="profile-teaser-grid">
            <div className="profile-teaser">
              <i className="fas fa-history"></i>
              <span>{t('match_history')}</span>
              <em>{t('wip')}</em>
            </div>
            <div className="profile-teaser">
              <i className="fas fa-award"></i>
              <span>{t('achievements')}</span>
              <em>{t('wip')}</em>
            </div>
            <div className="profile-teaser">
              <i className="fas fa-user-tag"></i>
              <span>{t('role_stats')}</span>
              <em>{t('wip')}</em>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="profile-footer">
          <button className="auth-btn-guest" onClick={onClose}>{t('close')}</button>
          <button
            className="profile-logout-btn"
            onClick={async () => { await contextSignOut(); onClose(); }}
          >
            <i className="fas fa-sign-out-alt"></i> {t('logout')}
          </button>
        </div>

      </div>
    </div>
  );
};

// ============================================================
// Login / Register form (shown when user is NOT connected)
// ============================================================
const AuthModal = ({ onClose }) => {
  const { t } = useTranslation('common');
  const { user, profile } = useAuth();
  const [mode, setMode] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Connecté : délègue à ProfilePanel
  if (user && profile) return <ProfilePanel onClose={onClose} />;

  if (!isSupabaseConfigured()) {
    return (
      <div className="auth-overlay" onClick={onClose}>
        <div className="auth-dialog" onClick={(e) => e.stopPropagation()}>
          <p style={{ color: '#888', textAlign: 'center', padding: 20 }}>
            {t('auth_unavailable')}
          </p>
          <button className="auth-btn-guest" onClick={onClose}>{t('close')}</button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    if (mode === 'register') {
      if (!username.trim()) { setError(t('username_required')); setSubmitting(false); return; }
      if (password.length < 6) { setError(t('password_min')); setSubmitting(false); return; }
      const { error } = await signUpWithEmail(email, password, username.trim());
      if (error) setError(error.message);
      else { setSuccess(t('account_created')); setTimeout(onClose, 2000); }
    } else {
      const { error } = await signInWithEmail(email, password);
      if (error) setError(error.message);
      else onClose();
    }

    setSubmitting(false);
  };

  const handleOAuth = async (provider) => {
    setError('');
    const { error } = await signInWithOAuth(provider);
    if (error) setError(error.message);
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="auth-header">
          <h2>{mode === 'login' ? t('login') : t('create_account')}</h2>
          <button className="close-button" onClick={onClose}>X</button>
        </div>

        {/* OAuth buttons. Discord pas encore configuré (Supabase Auth >
            Providers > Discord + app Discord Dev Portal) — à décommenter
            quand ce sera fait. */}
        <div className="auth-oauth">
          <button className="auth-oauth-btn google" onClick={() => handleOAuth('google')}>
            <i className="fab fa-google"></i> Google
          </button>
          {/*
          <button className="auth-oauth-btn discord" onClick={() => handleOAuth('discord')}>
            <i className="fab fa-discord"></i> Discord
          </button>
          */}
        </div>

        <div className="auth-divider"><span>{t('or')}</span></div>

        {/* Email form */}
        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'register' && (
            <input
              type="text"
              placeholder={t('username')}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={20}
              autoComplete="username"
            />
          )}
          <input
            type="email"
            placeholder={t('email')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            type="password"
            placeholder={t('password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          />

          {error && <p className="auth-error"><i className="fas fa-exclamation-circle"></i> {error}</p>}
          {success && <p className="auth-success"><i className="fas fa-check-circle"></i> {success}</p>}

          <button type="submit" className="auth-btn-submit" disabled={submitting}>
            {submitting ? '...' : mode === 'login' ? t('sign_in') : t('create_account_btn')}
          </button>
        </form>

        {/* Toggle login/register */}
        <p className="auth-toggle">
          {mode === 'login' ? (
            <>{t('no_account')} <button onClick={() => { setMode('register'); setError(''); }}>{t('create_account')}</button></>
          ) : (
            <>{t('has_account')} <button onClick={() => { setMode('login'); setError(''); }}>{t('sign_in')}</button></>
          )}
        </p>

        {/* Guest mode */}
        <button className="auth-btn-guest" onClick={onClose}>
          <i className="fas fa-user-slash"></i> {t('play_as_guest')}
        </button>
      </div>
    </div>
  );
};

// ============================================================
// Profile badge (shown in lobby sidebar)
// ============================================================
export const ProfileBadge = ({ onClick }) => {
  const { t, i18n } = useTranslation('common');
  const { user, profile } = useAuth();

  if (!user || !profile) {
    return (
      <button className="profile-badge profile-badge-guest" onClick={onClick}>
        <i className="fas fa-user-plus"></i> {t('login')}
      </button>
    );
  }

  const lang = i18n.language?.startsWith('fr') ? 'fr' : 'en';
  const level = profile.level || 1;
  const xp = profile.xp || 0;
  const xpInLevel = xp % 100;
  const tier = getTierForLevel(level);
  const initial = (profile.username || '?').trim().charAt(0).toUpperCase();

  return (
    <button className="profile-badge profile-badge-logged" onClick={onClick}>
      <div
        className="profile-badge-avatar"
        style={{ background: `linear-gradient(135deg, ${tier.gradient[0]}, ${tier.gradient[1]})` }}
      >
        <span>{initial}</span>
        <div className="profile-badge-tier-icon" title={tier.name[lang]}>
          <i className={`fas ${tier.icon}`}></i>
        </div>
      </div>
      <div className="profile-badge-body">
        <div className="profile-badge-top">
          <span className="profile-badge-name">{profile.username}</span>
          <span className="profile-badge-level">{t('level')} {level}</span>
        </div>
        <div className="profile-badge-tier-name" style={{ color: tier.gradient[1] }}>
          {tier.name[lang]}
        </div>
        <div className="profile-badge-xp-bar">
          <div
            className="profile-badge-xp-fill"
            style={{
              width: `${xpInLevel}%`,
              background: `linear-gradient(90deg, ${tier.gradient[0]}, ${tier.gradient[1]})`,
            }}
          />
        </div>
      </div>
    </button>
  );
};

export default AuthModal;
