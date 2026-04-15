import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../../hooks/useGameEngine';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import './RoleReveal.scss';

const MODELS_TO_PRELOAD = [
  '/models/Villager_Idle.glb',
  '/models/Villager_Walk.glb',
  '/models/Villager_Run.glb',
  '/models/Villager_Jump.glb',
  '/models/Villager_Dead.glb',
];

// Typewriter effect hook
const useTypewriter = (text, speed = 40, startDelay = 0) => {
  const [displayed, setDisplayed] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    setDisplayed('');
    setStarted(false);
    const delayTimer = setTimeout(() => setStarted(true), startDelay);
    return () => clearTimeout(delayTimer);
  }, [text, startDelay]);

  useEffect(() => {
    if (!started) return;
    if (displayed.length >= text.length) return;
    const timer = setTimeout(() => {
      setDisplayed(text.slice(0, displayed.length + 1));
    }, speed);
    return () => clearTimeout(timer);
  }, [displayed, started, text, speed]);

  return displayed;
};

// Card glow particles
const CardParticles = ({ color }) => {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: (Math.random() - 0.5) * 280,
    y: (Math.random() - 0.5) * 400,
    size: 2 + Math.random() * 4,
    delay: Math.random() * 2,
    duration: 2 + Math.random() * 3,
  }));

  return (
    <div className="card-particles">
      {particles.map(p => (
        <div
          key={p.id}
          className="card-particle"
          style={{
            left: `calc(50% + ${p.x}px)`,
            top: `calc(50% + ${p.y}px)`,
            width: p.size,
            height: p.size,
            backgroundColor: color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
          }}
        />
      ))}
    </div>
  );
};

const RoleReveal = ({ onComplete }) => {
  const { t } = useTranslation(['setup', 'game', 'roles']);
  const { getMe, getPlayers, game, markReady, readyPlayers } = useGameEngine();
  const me = getMe();
  const players = getPlayers();
  const [phase, setPhase] = useState('loading');
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [realLoaded, setRealLoaded] = useState(false);

  const loadingMessages = t('setup:loading_messages', { returnObjects: true }) || [];

  const introText = useTypewriter(
    t('setup:reveal.intro_text'),
    45,
    phase === 'intro' ? 200 : 99999
  );

  // Cycle messages every 1.8s
  useEffect(() => {
    if (phase !== 'loading') return;
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [phase, loadingMessages.length]);

  // Model preloading with real progress tracking
  useEffect(() => {
    if (phase !== 'loading') return;
    const loader = new GLTFLoader();
    let cancelled = false;
    const total = MODELS_TO_PRELOAD.length;

    const loadModel = (url) =>
      new Promise((resolve) => {
        loader.load(url, () => resolve(), undefined, () => resolve());
      });

    // Animate progress smoothly to a target value
    let targetProgress = 0;
    let displayProgress = 0;
    const animate = () => {
      if (cancelled) return;
      // Smoothly approach target
      displayProgress += (targetProgress - displayProgress) * 0.15;
      if (displayProgress > 0.995 && targetProgress >= 1) displayProgress = 1;
      setProgress(displayProgress);
      if (displayProgress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    const loadAll = async () => {
      for (let i = 0; i < total; i++) {
        if (cancelled) return;
        await loadModel(MODELS_TO_PRELOAD[i]);
        targetProgress = (i + 1) / total;
      }
      if (!cancelled) {
        targetProgress = 1;
        setRealLoaded(true);
        setTimeout(() => setPhase('waiting-players'), 800);
      }
    };

    // Small delay before starting loads — let the UI render first
    setTimeout(() => loadAll(), 100);

    return () => { cancelled = true; };
  }, [phase]);

  // Mark ready when loaded
  useEffect(() => {
    if (realLoaded && me) markReady(me.id);
  }, [realLoaded]);

  // Start reveal when all players ready
  useEffect(() => {
    if (phase !== 'waiting-players') return;
    if (!game.waitingForPlayers) setPhase('waiting');
  }, [phase, game.waitingForPlayers]);

  // Role reveal sequence — uses rAF-aware delays to survive tab throttling
  const sequenceStarted = useRef(false);
  const sequenceTimers = useRef([]);

  // rAF-aware delay: pauses when tab is hidden, catches up on resume
  const rafDelay = (callback, ms) => {
    const start = performance.now();
    let rafId;
    const check = () => {
      if (performance.now() - start >= ms) {
        callback();
      } else {
        rafId = requestAnimationFrame(check);
      }
    };
    rafId = requestAnimationFrame(check);
    return () => cancelAnimationFrame(rafId);
  };

  useEffect(() => {
    if (phase !== 'waiting' || sequenceStarted.current) return;
    sequenceStarted.current = true;
    const cancels = [];
    cancels.push(rafDelay(() => setPhase('intro'), 300));
    cancels.push(rafDelay(() => setPhase('flip'), 2200));
    cancels.push(rafDelay(() => setPhase('details'), 3000));
    cancels.push(rafDelay(() => onComplete?.(), 6000));
    sequenceTimers.current = cancels;
  }, [phase]);

  useEffect(() => {
    return () => sequenceTimers.current.forEach(cancel => cancel?.());
  }, []);

  if (!me?.character && phase !== 'loading') return null;

  const role = me?.character;
  const teamLabel = role ? t(`game:teams.${role.team}.short`) : '';
  const execTarget = me?.executionerTarget
    ? players.find((p) => p.id === me.executionerTarget)
    : null;

  const isLoading = phase === 'loading';
  const showContent = phase !== 'waiting' && phase !== 'loading' && phase !== 'waiting-players';

  // Player readiness indicators
  const readyCount = readyPlayers.length;
  const totalCount = players.length;

  return (
    <div className="role-reveal-overlay">
      {/* Loading / Waiting — single AnimatePresence, waits for exit before enter */}
      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.div
            key="loading"
            className="loading-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p className="loading-title" data-text="Among Liars">Among Liars</p>
            <AnimatePresence mode="wait">
              <motion.p
                className="loading-text"
                key={loadingMessages[msgIndex]}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
              >
                {loadingMessages[msgIndex]}
              </motion.p>
            </AnimatePresence>
            <div className="loading-bar-track">
              <div className="loading-bar-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <p className="loading-percent">{Math.round(progress * 100)}%</p>
          </motion.div>
        )}

        {phase === 'waiting-players' && (
          <motion.div
            key="waiting"
            className="loading-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p className="loading-title" data-text="Among Liars">Among Liars</p>
            <p className="loading-text">{t('setup:reveal.waiting_players')}</p>
            <div className="waiting-players-dots">
              {players.map((p) => {
                const isReady = readyPlayers.includes(p.id);
                return (
                  <div key={p.id} className={`waiting-dot ${isReady ? 'ready' : 'pending'}`} title={p.profile?.name}>
                    <span className="waiting-dot-indicator" />
                    <span className="waiting-dot-name">{p.profile?.name?.slice(0, 8)}</span>
                  </div>
                );
              })}
            </div>
            <div className="loading-bar-track">
              <div
                className="loading-bar-fill"
                style={{ width: `${totalCount > 0 ? Math.round((readyCount / totalCount) * 100) : 0}%` }}
              />
            </div>
            <p className="loading-percent">{readyCount}/{totalCount}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intro text — typewriter */}
      <AnimatePresence>
        {showContent && phase === 'intro' && (
          <motion.div
            className="reveal-intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.5 }}
          >
            <p className="typewriter-text">{introText}<span className="typewriter-cursor">|</span></p>
            <motion.p
              className="reveal-sub"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.6 }}
            >
              {t('setup:reveal.intro_sub')}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card flip */}
      {(phase === 'flip' || phase === 'details') && role && (
        <motion.div
          className="reveal-card"
          initial={{ rotateY: 180, opacity: 0, scale: 0.85 }}
          animate={{ rotateY: 0, opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        >
          <CardParticles color={role.couleur} />
          <div className="card-inner" style={{ borderColor: role.couleur, '--glow-color': `${role.couleur}20` }}>
            <div className="card-glow-ring" style={{ boxShadow: `0 0 60px ${role.couleur}30, 0 0 120px ${role.couleur}15` }} />
            <div className="card-team" style={{ color: role.couleur }}>
              {teamLabel}
            </div>
            <div className="card-icon" style={{ color: role.couleur }}>
              <i className={`fas ${role.icon}`}></i>
            </div>
            <motion.div
              className="card-name-wrapper"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="card-assigned-label">{t('setup:reveal.role_assigned')}</div>
              <div className="card-name" style={{ color: role.couleur }}>
                {t(`roles:${role.key}.label`, { defaultValue: role.label })}
              </div>
            </motion.div>

            <div className="card-details">
              <p className="card-objective">{t(`roles:${role.key}.objectif`, { defaultValue: role.objectif })}</p>
              {execTarget && (
                <p className="card-exec-target">
                  <i className="fas fa-bullseye"></i> Cible : {execTarget.profile.name}
                </p>
              )}
              {role.actions?.length > 0 && (
                <div className="card-abilities">
                  {role.actions.map((a, i) => (
                    <span key={i} className="card-ability">{a.label}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* Hint */}
      {phase === 'details' && (
        <motion.p
          className="reveal-hint"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {t('setup:reveal.game_starting')}
        </motion.p>
      )}
    </div>
  );
};

export default RoleReveal;
