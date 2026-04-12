import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameEngine } from '../../hooks/useGameEngine';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import './RoleReveal.scss';

// Character models to preload (village is now fully procedural)
const MODELS_TO_PRELOAD = [
  '/models/Villager_Idle.glb',
  '/models/Villager_Walk.glb',
  '/models/Villager_Run.glb',
  '/models/Villager_Jump.glb',
  '/models/Villager_Dead.glb',
];

// Loading flavor messages — cycle independently of progress
const LOADING_MESSAGES = [
  'Ouverture des volets...',
  'Allumage des lanternes...',
  'Préparation de la forge...',
  'Ouverture de la taverne...',
  'Balayage de la place du village...',
  'Sonnerie des cloches de l\'église...',
  'Les villageois se rassemblent...',
  'Le village est prêt.',
];

const RoleReveal = ({ onComplete }) => {
  const { getMe, getPlayers, game, markReady, readyPlayers } = useGameEngine();
  const me = getMe();
  const players = getPlayers();
  // loading -> waiting -> intro -> flip -> details -> done
  const [phase, setPhase] = useState('loading');
  const [progress, setProgress] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);

  const [realLoaded, setRealLoaded] = useState(false);

  // Cycle messages every 1.8s
  useEffect(() => {
    if (phase !== 'loading') return;
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % LOADING_MESSAGES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, [phase]);

  // Fake smooth progress bar — fills over ~4s, then waits for real load
  useEffect(() => {
    if (phase !== 'loading') return;
    let cancelled = false;
    const start = Date.now();
    const fakeDuration = 4000; // 4 seconds to reach ~90%

    const tick = () => {
      if (cancelled) return;
      const elapsed = Date.now() - start;
      const fakeProgress = Math.min(elapsed / fakeDuration, 0.9); // caps at 90%
      if (realLoaded) {
        setProgress(1);
      } else {
        setProgress(fakeProgress);
      }
      if (fakeProgress < 0.9 || !realLoaded) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
    return () => { cancelled = true; };
  }, [phase, realLoaded]);

  // Real model preloading in background
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
        setTimeout(() => {
          setProgress(1);
          setTimeout(() => setPhase('waiting-players'), 500);
        }, 300);
      }
    };

    loadAll();
    return () => { cancelled = true; };
  }, []);

  // Mark this player as ready when assets are loaded
  useEffect(() => {
    if (realLoaded && me) {
      markReady(me.id);
    }
  }, [realLoaded]);

  // Start reveal sequence when all players are ready
  useEffect(() => {
    if (phase !== 'waiting-players') return;
    if (!game.waitingForPlayers) {
      setPhase('waiting');
    }
  }, [phase, game.waitingForPlayers]);

  // Role reveal sequence — starts once loading is done
  const sequenceStarted = useRef(false);
  const sequenceTimers = useRef([]);
  useEffect(() => {
    if (phase !== 'waiting' || sequenceStarted.current) return;
    sequenceStarted.current = true;
    sequenceTimers.current = [
      setTimeout(() => setPhase('intro'), 300),
      setTimeout(() => setPhase('flip'), 1500),
      setTimeout(() => setPhase('details'), 2300),
      setTimeout(() => onComplete?.(), 5000),
    ];
  }, [phase]);

  // Cleanup only on unmount
  useEffect(() => {
    return () => sequenceTimers.current.forEach(clearTimeout);
  }, []);

  if (!me?.character && phase !== 'loading') return null;

  const role = me?.character;
  const teamLabel = role ? ({ town: 'Village', mafia: 'Mafia', neutral: 'Neutre' }[role.team] || role.team) : '';
  const execTarget = me?.executionerTarget
    ? players.find((p) => p.id === me.executionerTarget)
    : null;

  const isLoading = phase === 'loading';
  const showContent = phase !== 'waiting' && phase !== 'loading' && phase !== 'waiting-players';

  return (
    <div className="role-reveal-overlay">
      {/* Loading screen — visible immediately */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="loading-container"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="loading-title">Not Me</p>
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
              <div
                className="loading-bar-fill"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
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
            <p className="loading-title">Not Me</p>
            <p className="loading-text">
              En attente des joueurs... ({readyPlayers.length}/{players.length})
            </p>
            <div className="loading-bar-track">
              <div
                className="loading-bar-fill"
                style={{ width: `${players.length > 0 ? Math.round((readyPlayers.length / players.length) * 100) : 0}%` }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intro text */}
      <AnimatePresence>
        {showContent && phase === 'intro' && (
          <motion.div
            className="reveal-intro"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.5 }}
          >
            <p>La nuit tombe sur le village...</p>
            <p className="reveal-sub">Votre destin est scellé.</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card flip */}
      {(phase === 'flip' || phase === 'details') && role && (
        <motion.div
          className="reveal-card"
          initial={{ rotateY: 180, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="card-inner" style={{ borderColor: role.couleur }}>
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
              <div className="card-assigned-label">Rôle assigné :</div>
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
