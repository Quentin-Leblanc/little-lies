import React, { useState, useMemo, useEffect } from 'react';
import { useGameEngine } from '../../hooks/useGameEngine';
import './GameOver.scss';

const TEAM_LABELS = {
  town: { name: 'Le Village', color: '#78ff78', icon: 'fa-users', bg: 'rgba(120,255,120,0.08)' },
  mafia: { name: 'La Mafia', color: '#ff4444', icon: 'fa-user-secret', bg: 'rgba(255,68,68,0.08)' },
  evil: { name: 'Les Loups-Garous', color: '#ff4444', icon: 'fa-paw', bg: 'rgba(255,68,68,0.08)' },
  neutral: { name: 'Neutre', color: '#9370db', icon: 'fa-star', bg: 'rgba(147,112,219,0.08)' },
  neutral_killing: { name: 'Le Serial Killer', color: '#9370db', icon: 'fa-skull', bg: 'rgba(147,112,219,0.08)' },
};

const TEAM_ORDER = ['town', 'mafia', 'evil', 'neutral'];
const TEAM_DISPLAY = {
  town: { label: 'Village', color: '#78ff78' },
  mafia: { label: 'Mafia', color: '#ff4444' },
  evil: { label: 'Loups-Garous', color: '#ff4444' },
  neutral: { label: 'Neutre', color: '#9370db' },
};

// Particules flottantes selon victoire/defaite
const Particles = ({ type }) => {
  const particles = useMemo(() =>
    Array.from({ length: 35 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 4}s`,
      duration: `${3 + Math.random() * 4}s`,
      size: 3 + Math.random() * 6,
      drift: (Math.random() - 0.5) * 80,
    })), []);

  return (
    <div className={`go-particles go-particles-${type}`}>
      {particles.map((p) => (
        <div
          key={p.id}
          className="go-particle"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDelay: p.delay,
            animationDuration: p.duration,
            '--drift': `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
};

const GameOver = () => {
  const { game, getPlayers, getMe } = useGameEngine();
  const [dismissed, setDismissed] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const winner = game.winner;
  const players = getPlayers();
  const mePlayer = getMe();
  const neutralWinners = game.neutralWinners || [];

  const teamInfo = TEAM_LABELS[winner] || TEAM_LABELS.town;
  const myTeam = mePlayer?.character?.team;

  const isTeamWinner = myTeam === winner;
  const isNeutralWinner = neutralWinners.some((nw) => nw.id === mePlayer?.id);
  const isWinner = isTeamWinner || isNeutralWinner;

  // Stagger animations
  useEffect(() => {
    const t1 = setTimeout(() => setShowContent(true), 300);
    const t2 = setTimeout(() => setShowRecap(true), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Stats rapides
  const stats = useMemo(() => {
    const deadCount = players.filter(p => !p.isAlive).length;
    const aliveCount = players.filter(p => p.isAlive).length;
    return {
      days: game.dayCount || 1,
      dead: deadCount,
      alive: aliveCount,
      total: players.length,
    };
  }, [players, game.dayCount]);

  // Grouper joueurs par equipe
  const playersByTeam = useMemo(() => {
    const groups = {};
    players.forEach(p => {
      const team = p.character?.team || 'neutral';
      if (!groups[team]) groups[team] = [];
      groups[team].push(p);
    });
    // Trier par ordre defini
    const sorted = [];
    TEAM_ORDER.forEach(t => {
      if (groups[t]) sorted.push({ team: t, players: groups[t] });
    });
    // Ajouter les equipes non listees
    Object.keys(groups).forEach(t => {
      if (!TEAM_ORDER.includes(t)) sorted.push({ team: t, players: groups[t] });
    });
    return sorted;
  }, [players]);

  if (dismissed) return null;

  const particleType = isWinner ? 'victory' : (isNeutralWinner ? 'neutral' : 'defeat');

  return (
    <div className="go-overlay">
      {/* Particules de fond */}
      <Particles type={particleType} />

      {/* Halo de fond */}
      <div className="go-halo" style={{ '--halo-color': teamInfo.color }} />

      <div className={`go-container ${showContent ? 'go-visible' : ''}`}>
        {/* Header : equipe gagnante */}
        <div className="go-header">
          <div className="go-icon-ring" style={{ '--ring-color': teamInfo.color }}>
            <i className={`fas ${teamInfo.icon}`} style={{ color: teamInfo.color }}></i>
          </div>
          <h1 className="go-title" style={{ color: teamInfo.color }}>{teamInfo.name}</h1>
          <p className="go-subtitle">a remport&eacute; la partie</p>
        </div>

        {/* Victoire/Defaite personnelle */}
        <div className={`go-personal ${isWinner ? 'go-win' : 'go-loss'}`}>
          <i className={`fas ${isWinner ? 'fa-crown' : 'fa-skull-crossbones'}`}></i>
          <span>{isWinner ? 'Victoire' : 'D\u00e9faite'}</span>
        </div>

        {/* Gagnants neutres */}
        {neutralWinners.length > 0 && (
          <div className="go-neutrals">
            {neutralWinners.map((nw, i) => {
              const p = players.find((pl) => pl.id === nw.id);
              return (
                <div key={i} className="go-neutral-item">
                  <i className="fas fa-star"></i>
                  <span>{p?.profile?.name}</span> a aussi gagn&eacute; en tant que <strong>{nw.role}</strong>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats rapides */}
        <div className="go-stats">
          <div className="go-stat">
            <span className="go-stat-value">{stats.days}</span>
            <span className="go-stat-label">{stats.days > 1 ? 'Jours' : 'Jour'}</span>
          </div>
          <div className="go-stat-divider" />
          <div className="go-stat">
            <span className="go-stat-value">{stats.dead}</span>
            <span className="go-stat-label">Morts</span>
          </div>
          <div className="go-stat-divider" />
          <div className="go-stat">
            <span className="go-stat-value">{stats.alive}</span>
            <span className="go-stat-label">Survivants</span>
          </div>
        </div>

        {/* Recap par equipe */}
        <div className={`go-recap ${showRecap ? 'go-recap-visible' : ''}`}>
          <h3 className="go-recap-title">R&eacute;capitulatif</h3>
          {playersByTeam.map(({ team, players: teamPlayers }) => {
            const teamDisplay = TEAM_DISPLAY[team] || { label: team, color: '#aaa' };
            const isWinningTeam = team === winner;
            return (
              <div key={team} className={`go-team-group ${isWinningTeam ? 'go-team-winner' : ''}`}>
                <div className="go-team-header" style={{ borderColor: teamDisplay.color }}>
                  <span style={{ color: teamDisplay.color }}>{teamDisplay.label}</span>
                  {isWinningTeam && <i className="fas fa-trophy" style={{ color: '#daa520' }}></i>}
                </div>
                {teamPlayers.map((player, idx) => {
                  const isNeutralW = neutralWinners.some(nw => nw.id === player.id);
                  return (
                    <div
                      key={player.id}
                      className={`go-player-row ${!player.isAlive ? 'go-player-dead' : ''} ${isNeutralW ? 'go-player-neutral-win' : ''}`}
                      style={{ animationDelay: showRecap ? `${idx * 0.08}s` : '0s' }}
                    >
                      <span className="go-player-name" style={{ color: player.profile?.color || '#ccc' }}>
                        {player.character?.icon && <i className={`fas ${player.character.icon}`} style={{ color: player.character.couleur }}></i>}
                        {player.profile.name}
                        {player.id === mePlayer?.id && <span className="go-me-badge">toi</span>}
                      </span>
                      <span className="go-player-role" style={{ color: player.character?.couleur || '#888' }}>
                        {player.character?.label}
                      </span>
                      <span className={`go-player-status ${player.isAlive ? 'alive' : 'dead'}`}>
                        {player.isAlive ? (
                          <><i className="fas fa-heart"></i> Vivant</>
                        ) : (
                          <><i className="fas fa-skull"></i> Mort</>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Boutons */}
        <div className="go-buttons">
          <button className="go-btn go-btn-secondary" onClick={() => setDismissed(true)}>
            Fermer
          </button>
          <button
            className="go-btn go-btn-primary"
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.delete('r');
              window.location.href = url.toString();
            }}
          >
            <i className="fas fa-plus"></i> Nouveau salon
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOver;
