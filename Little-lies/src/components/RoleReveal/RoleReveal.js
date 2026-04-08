import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameEngine } from '../../hooks/useGameEngine';
import './RoleReveal.scss';

const RoleReveal = ({ onComplete }) => {
  const { getMe, getPlayers } = useGameEngine();
  const me = getMe();
  const players = getPlayers();
  const [phase, setPhase] = useState('waiting'); // waiting -> intro -> flip -> details -> done

  useEffect(() => {
    const timers = [
      // 0-1.2s: black screen (parent curtain closing)
      // 1.2s: intro text
      setTimeout(() => setPhase('intro'), 1200),
      // 2.2s: card flip
      setTimeout(() => setPhase('flip'), 2200),
      // 3s: details visible
      setTimeout(() => setPhase('details'), 3000),
      // 5.5s: signal parent → curtain opens over card
      setTimeout(() => onComplete?.(), 5500),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  if (!me?.character) return null;

  const role = me.character;
  const teamLabel = { town: 'Village', mafia: 'Mafia', neutral: 'Neutre' }[role.team] || role.team;
  const execTarget = me.executionerTarget
    ? players.find((p) => p.id === me.executionerTarget)
    : null;

  const showContent = phase !== 'waiting';

  return (
    <div className="role-reveal-overlay">
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
      {(phase === 'flip' || phase === 'details') && (
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
