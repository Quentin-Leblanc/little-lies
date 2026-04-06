import React, { useState, useMemo } from 'react';
import { useGameEngine } from '../../hooks/useGameEngine';
import './GameOver.scss';

const TEAM_LABELS = {
  town: { name: 'Le Village', color: '#78ff78', icon: 'fa-users' },
  mafia: { name: 'La Mafia', color: '#ff0000', icon: 'fa-user-secret' },
  evil: { name: 'Les Loups-Garous', color: '#ff4444', icon: 'fa-paw' },
  neutral: { name: 'Neutre', color: '#9370db', icon: 'fa-star' },
  neutral_killing: { name: 'Le Serial Killer', color: '#9370db', icon: 'fa-skull' },
};

const CONFETTI_COLORS = ['#ff0', '#f0f', '#0ff', '#f44', '#4f4', '#44f', '#fa0', '#fff'];

const Confetti = () => {
  const pieces = useMemo(() =>
    Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: `${Math.random() * 3}s`,
      duration: `${2 + Math.random() * 3}s`,
      size: 6 + Math.random() * 8,
      shape: Math.random() > 0.5 ? '50%' : '0%',
    })), []);

  return (
    <div className="confetti-container">
      {pieces.map((p) => (
        <div
          key={p.id}
          className="confetti-piece"
          style={{
            left: p.left,
            backgroundColor: p.color,
            width: p.size,
            height: p.size,
            borderRadius: p.shape,
            animationDelay: p.delay,
            animationDuration: p.duration,
          }}
        />
      ))}
    </div>
  );
};

const GameOver = () => {
  const { game, getPlayers, getMe } = useGameEngine();
  const [dismissed, setDismissed] = useState(false);
  const winner = game.winner;
  const players = getPlayers();
  const me = getMe();
  const neutralWinners = game.neutralWinners || [];

  const teamInfo = TEAM_LABELS[winner] || TEAM_LABELS.town;
  const myTeam = me?.character?.team;

  const isTeamWinner = myTeam === winner;
  const isNeutralWinner = neutralWinners.some((nw) => nw.id === me?.id);
  const isWinner = isTeamWinner || isNeutralWinner;

  if (dismissed) return null;

  return (
    <>
      {isWinner && <Confetti />}
      <div className="gameover-overlay">
        <div className="gameover-container">
          <div className="gameover-result" style={{ color: teamInfo.color }}>
            <i className={`fas ${teamInfo.icon}`}></i>
            <h1>{teamInfo.name} a gagn&eacute; !</h1>
          </div>

          <h2 className={isWinner ? 'victory' : 'defeat'}>
            {isWinner ? 'Victoire !' : 'D\u00e9faite...'}
          </h2>

          {neutralWinners.length > 0 && (
            <div className="neutral-winners">
              {neutralWinners.map((nw, i) => {
                const p = players.find((pl) => pl.id === nw.id);
                return (
                  <div key={i} className="neutral-winner-item">
                    <i className="fas fa-star" style={{ color: '#daa520' }}></i>
                    {' '}{p?.profile?.name} a aussi gagn&eacute; en tant que {nw.role} !
                  </div>
                );
              })}
            </div>
          )}

          <div className="gameover-players">
            <h3>R&eacute;capitulatif</h3>
            <ul>
              {players.map((player) => (
                <li key={player.id} className={player.isAlive ? 'alive' : 'dead'}>
                  <span className="player-name" style={{ color: player.character?.couleur }}>
                    {player.character?.icon && <i className={`fas ${player.character.icon}`}></i>}
                    {' '}{player.profile.name}
                  </span>
                  <span className="player-role">{player.character?.label}</span>
                  <span className="player-team">{player.character?.team}</span>
                  <span className="player-status">
                    {player.isAlive ? 'Survivant' : 'Mort'}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="gameover-buttons">
            <button
              className="gameover-close-btn"
              onClick={() => setDismissed(true)}
            >
              Fermer
            </button>
            <button
              className="primaryBtn gameover-btn"
              onClick={() => window.location.reload()}
            >
              Retour au lobby
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default GameOver;
