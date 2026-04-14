import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

const LOADING_MESSAGES = [
  'Ouverture des volets...',
  'Allumage des lanternes...',
  'Pr\u00e9paration de la forge...',
  'Ouverture de la taverne...',
  'Balayage de la place du village...',
  'Sonnerie des cloches de l\'\u00e9glise...',
  'Les villageois se rassemblent...',
  'Le village est pr\u00eat.',
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
  const { getMe, getPlayers, game, markReady, readyPlayers } = useGameEngine();
  const me = getMe();
  const players = getPlayers();
  const [phase, setPhase] = useState('loading');
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [realLoaded, setRealLoaded] = useState(false);

  const introText = useTypewriter(
    'La nuit tombe sur le village...',
    45,
    phase === 'intro' ? 200 : 99999
  );

  // Cycle messages every 1.8s
  useEffect(() => {
    if (phase !== 'loading') return;
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [phase]);

  // Fake smooth progress bar
  useEffect(() => {
    if (phase !== 'loading') return;
    let cancelled = false;
    const start = Date.now();
    const fakeDuration = 4000;
    const tick = () => {
      if (cancelled) return;
      const elapsed = Date.now() - start;
      const fakeProgress = Math.min(elapsed / fakeDuration, 0.9);
      if (realLoaded) setProgress(1);
      else setProgress(fakeProgress);
      if (fakeProgress < 0.9 || !realLoaded) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return () => { cancelled = true; };
  }, [phase, realLoaded]);

  // Real model preloading
  useEffect(() => {
    const loader = new GLTFLoader();
    let cancelled = false;
    const loadModel = (url) =>
      new Promise((resolve) => {
        loader.load(url, () => resolve(), undefined, () => resolve());
      });
    const loadAll = async () => {
      for (let i = 0; i < MODELS_TO_PRELOAD.length; i++) {
        if (cancelled) return;
        await loadModel(MODELS_TO_PRELOAD[i]);
      }
      if (!cancelled) {
        setRealLoaded(true);
        // Small delay before transitioning — use rAF to survive throttled tabs
        requestAnimationFrame(() => {
          setProgress(1);
          requestAnimationFrame(() => {
            setTimeout(() => setPhase('waiting-players'), 400);
          });
        });
      }
    };
    loadAll();
    return () => { cancelled = true; };
  }, []);

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
  const teamLabel = role ? ({ town: 'Village', mafia: 'Mafia', neutral: 'Neutre' }[role.team] || role.team) : '';
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
      {/* Loading screen */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="loading-container"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="loading-title">Among Liars</p>
            <AnimatePresence mode="wait">
              <motion.p
                className="loading-text"
                key={LOADING_MESSAGES[msgIndex]}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.35 }}
              >
                {LOADING_MESSAGES[msgIndex]}
              </motion.p>
            </AnimatePresence>
            <div className="loading-bar-track">
              <div className="loading-bar-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
            <p className="loading-percent">{Math.round(progress * 100)}%</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Waiting for other players */}
      <AnimatePresence>
        {phase === 'waiting-players' && (
          <motion.div
            className="loading-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="loading-title">Among Liars</p>
            <p className="loading-text">En attente des joueurs...</p>
            {/* Player dots */}
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
              Votre destin est scell&eacute;.
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
              <div className="card-assigned-label">R&ocirc;le assign&eacute; :</div>
              <div className="card-name" style={{ color: role.couleur }}>
                {role.label}
              </div>
            </motion.div>

            <div className="card-details">
              <p className="card-objective">{role.objectif}</p>
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
          La partie commence...
        </motion.p>
      )}
    </div>
  );
};

export default RoleReveal;
