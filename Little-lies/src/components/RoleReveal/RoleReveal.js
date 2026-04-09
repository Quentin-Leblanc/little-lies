import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameEngine } from '../../hooks/useGameEngine';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import './RoleReveal.scss';

// All models to preload (download + parse into Three.js cache)
const MODELS_TO_PRELOAD = [
  '/models/mountain.glb',
  '/models/terrain.glb',
  '/models/forge.glb',
  '/models/tavern.glb',
  '/models/chapel.glb',
  '/models/rue.glb',
  '/models/cottage.glb',
  '/models/gallows.glb',
  '/models/Meshy_AI_Circular_Wicker_Place_0408110924_texture.glb',
  '/models/Villager_Idle.glb',
  '/models/Villager_Walk.glb',
  '/models/Villager_Run.glb',
  '/models/Villager_Jump.glb',
  '/models/Villager_Dead.glb',
];

const RoleReveal = ({ onComplete }) => {
  const { getMe, getPlayers } = useGameEngine();
  const me = getMe();
  const players = getPlayers();
  // loading -> waiting -> intro -> flip -> details -> done
  const [phase, setPhase] = useState('loading');
  const [progress, setProgress] = useState(0);

  // Preload all models with GLTFLoader (download + parse into Three.js cache)
  useEffect(() => {
    const loader = new GLTFLoader();
    const fileProgress = new Array(MODELS_TO_PRELOAD.length).fill(0);
    const fileTotals = new Array(MODELS_TO_PRELOAD.length).fill(1);
    let completed = 0;

    const updateProgress = () => {
      const loaded = fileProgress.reduce((a, b) => a + b, 0);
      const total = fileTotals.reduce((a, b) => a + b, 0);
      setProgress(total > 0 ? loaded / total : 0);
    };

    // Load sequentially in batches of 3 to avoid overwhelming the GPU
    const batchSize = 3;
    const loadModel = (url, i) =>
      new Promise((resolve) => {
        loader.load(
          url,
          () => { // onLoad — model fully parsed
            completed++;
            fileProgress[i] = fileTotals[i];
            updateProgress();
            resolve();
          },
          (xhr) => { // onProgress — byte download progress
            if (xhr.lengthComputable) {
              fileProgress[i] = xhr.loaded;
              fileTotals[i] = xhr.total;
              updateProgress();
            }
          },
          () => { // onError — don't block
            completed++;
            fileProgress[i] = fileTotals[i];
            updateProgress();
            resolve();
          }
        );
      });

    const loadAll = async () => {
      for (let i = 0; i < MODELS_TO_PRELOAD.length; i += batchSize) {
        const batch = MODELS_TO_PRELOAD.slice(i, i + batchSize).map(
          (url, j) => loadModel(url, i + j)
        );
        await Promise.all(batch);
      }
      setProgress(1);
      setTimeout(() => setPhase('waiting'), 400);
    };

    loadAll();
  }, []);

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
  const showContent = phase !== 'waiting' && phase !== 'loading';

  return (
    <div className="role-reveal-overlay">
      {/* Loading screen */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            className="loading-container"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="loading-bar-track">
              <div
                className="loading-bar-fill"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <p className="loading-text">Chargement...</p>
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
