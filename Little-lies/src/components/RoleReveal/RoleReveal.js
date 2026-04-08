import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameEngine } from '../../hooks/useGameEngine';
import './RoleReveal.scss';

const RoleReveal = ({ onComplete }) => {
  const { getMe, getPlayers } = useGameEngine();
  const me = getMe();
  const players = getPlayers();
  const [phase, setPhase] = useState('intro'); // intro -> flip -> details -> waiting -> fade

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase('flip'), 1500),
      setTimeout(() => setPhase('details'), 3000),
      // Auto-dismiss after 7s — no button needed
      setTimeout(() => handleDismiss(), 7000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  const handleDismiss = () => {
    setPhase('fade');
    setTimeout(() => onComplete?.(), 800);
  };

  if (!me?.character) return null;

  const role = me.character;
  const teamLabel = { town: 'Village', mafia: 'Mafia', neutral: 'Neutre' }[role.team] || role.team;
  const execTarget = me.executionerTarget
    ? players.find((p) => p.id === me.executionerTarget)
    : null;

  return (
    <AnimatePresence>
      <motion.div
        className="role-reveal-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'fade' ? 0 : 1 }}
        transition={{ duration: phase === 'fade' ? 1 : 0.5 }}
      >
        {/* Intro text */}
        <AnimatePresence>
          {phase === 'intro' && (
            <motion.div
              className="reveal-intro"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.6 }}
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
                className="card-name"
                style={{ color: role.couleur }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                {role.label}
              </motion.div>

              {/* Details always visible — no size jump */}
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

        {/* Countdown hint — plain text, no interaction */}
        {phase === 'details' && (
          <motion.p
            className="reveal-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            La nuit commence bientôt...
          </motion.p>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default RoleReveal;
