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
} from '../../utils/supabase';
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

// Login/Register modal
const AuthModal = ({ onClose }) => {
  const { t } = useTranslation('common');
  const [mode, setMode] = useState('login'); // login | register
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

        {/* OAuth buttons */}
        <div className="auth-oauth">
          <button className="auth-oauth-btn google" onClick={() => handleOAuth('google')}>
            <i className="fab fa-google"></i> Google
          </button>
          <button className="auth-oauth-btn discord" onClick={() => handleOAuth('discord')}>
            <i className="fab fa-discord"></i> Discord
          </button>
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

// Profile badge (small, for lobby/in-game)
export const ProfileBadge = ({ onClick }) => {
  const { t } = useTranslation('common');
  const { user, profile } = useAuth();

  if (!user || !profile) {
    return (
      <button className="profile-badge profile-badge-guest" onClick={onClick}>
        <i className="fas fa-user-plus"></i> {t('login')}
      </button>
    );
  }

  const level = profile.level || 1;
  const xp = profile.xp || 0;
  const nextLevelXP = level * 100;
  const progress = Math.min((xp % 100) / 100 * 100, 100);

  return (
    <div className="profile-badge profile-badge-logged" onClick={onClick}>
      <div className="profile-badge-info">
        <span className="profile-badge-name">{profile.username}</span>
        <span className="profile-badge-level">{t('level')} {level}</span>
      </div>
      <div className="profile-badge-xp-bar">
        <div className="profile-badge-xp-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
};

export default AuthModal;
