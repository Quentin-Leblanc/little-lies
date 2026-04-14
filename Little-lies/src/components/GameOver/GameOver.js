import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useMultiplayerState } from 'playroomkit';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../../hooks/useGameEngine';
import { collectGameMetrics, saveMetrics } from '../../utils/GameMetrics';
import { calculateGameXP } from '../../utils/xpSystem';
import { useAuth } from '../Auth/Auth';
import { addXP, incrementGamesPlayed } from '../../utils/supabase';
import Survey from '../Survey/Survey';
import './GameOver.scss';

const TEAM_STYLES = {
  town: { color: '#78ff78', icon: 'fa-users', bg: 'rgba(120,255,120,0.08)' },
  mafia: { color: '#ff4444', icon: 'fa-user-secret', bg: 'rgba(255,68,68,0.08)' },
  evil: { color: '#ff4444', icon: 'fa-paw', bg: 'rgba(255,68,68,0.08)' },
  neutral: { color: '#9370db', icon: 'fa-star', bg: 'rgba(147,112,219,0.08)' },
  neutral_killing: { color: '#9370db', icon: 'fa-skull', bg: 'rgba(147,112,219,0.08)' },
};

const TEAM_ORDER = ['town', 'mafia', 'evil', 'neutral'];

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
  const { t } = useTranslation(['game', 'common']);
  const { game, getPlayers, getMe, resetForNewGame } = useGameEngine();
  const { user, refreshProfile } = useAuth();
  const [_events] = useMultiplayerState('events', []);
  const events = _events || [];
  const [dismissed, setDismissed] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [xpGained, setXpGained] = useState(null);
  const metricsSaved = useRef(false);
  const winner = game.winner;
  const players = getPlayers();
  const mePlayer = getMe();
  const neutralWinners = game.neutralWinners || [];

  const teamStyle = TEAM_STYLES[winner] || TEAM_STYLES.town;
  const teamName = t(`game:teams.${winner}.name`);
  const myTeam = mePlayer?.character?.team;

  const isTeamWinner = myTeam === winner;
  const isNeutralWinner = neutralWinners.some((nw) => nw.id === mePlayer?.id);
  const isWinner = isTeamWinner || isNeutralWinner;

  // Save metrics + XP once
  useEffect(() => {
    if (!metricsSaved.current && players.length > 0) {
      metricsSaved.current = true;
      const metrics = collectGameMetrics({ game, players, events });
      saveMetrics(metrics);

      // Calculate and save XP (if logged in)
      const xpResult = calculateGameXP({
        isWinner: isTeamWinner,
        isNeutralWinner,
        daysSurvived: game.dayCount || 1,
        isAlive: mePlayer?.isAlive,
      });
      setXpGained(xpResult);

      if (user) {
        const totalXP = xpResult.total;
        addXP(user.id, totalXP, xpResult.gains.map(g => g.reason).join(', ')).then(() => {
          incrementGamesPlayed(user.id, isWinner || isNeutralWinner);
          refreshProfile();
        });
      }
    }
  }, []);

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
    const durationMs = game.gameStartedAt ? Date.now() - game.gameStartedAt : 0;
    const durationMin = Math.floor(durationMs / 60000);
    const durationSec = Math.floor((durationMs % 60000) / 1000);
    return {
      days: game.dayCount || 1,
      dead: deadCount,
      alive: aliveCount,
      total: players.length,
      duration: durationMs > 0 ? `${durationMin}m${durationSec.toString().padStart(2, '0')}s` : null,
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
      <div className="go-halo" style={{ '--halo-color': teamStyle.color }} />

      <div className={`go-container ${showContent ? 'go-visible' : ''}`}>
        {/* Header : equipe gagnante */}
        <div className="go-header">
          <div className="go-icon-ring" style={{ '--ring-color': teamStyle.color }}>
            <i className={`fas ${teamStyle.icon}`} style={{ color: teamStyle.color }}></i>
          </div>
          <h1 className="go-title" style={{ color: teamStyle.color }}>{teamName}</h1>
          <p className="go-subtitle">{t('game:gameover.won')}</p>
        </div>

        {/* Victoire/Defaite personnelle */}
        <div className={`go-personal ${isWinner ? 'go-win' : 'go-loss'}`}>
          <i className={`fas ${isWinner ? 'fa-crown' : 'fa-skull-crossbones'}`}></i>
          <span>{isWinner ? t('game:gameover.victory') : t('game:gameover.defeat')}</span>
        </div>

        {/* Gagnants neutres */}
        {neutralWinners.length > 0 && (
          <div className="go-neutrals">
            {neutralWinners.map((nw, i) => {
              const p = players.find((pl) => pl.id === nw.id);
              return (
                <div key={i} className="go-neutral-item">
                  <i className="fas fa-star"></i>
                  <span>{t('game:gameover.neutral_also_won', { name: p?.profile?.name, role: nw.role })}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Stats rapides */}
        <div className="go-stats">
          <div className="go-stat">
            <span className="go-stat-value">{stats.days}</span>
            <span className="go-stat-label">{stats.days > 1 ? t('common:days') : t('common:day')}</span>
          </div>
          <div className="go-stat-divider" />
          <div className="go-stat">
            <span className="go-stat-value">{stats.dead}</span>
            <span className="go-stat-label">{t('common:deaths')}</span>
          </div>
          <div className="go-stat-divider" />
          <div className="go-stat">
            <span className="go-stat-value">{stats.alive}</span>
            <span className="go-stat-label">{t('common:survivors')}</span>
          </div>
          {stats.duration && (
            <>
              <div className="go-stat-divider" />
              <div className="go-stat">
                <span className="go-stat-value">{stats.duration}</span>
                <span className="go-stat-label">{t('common:duration')}</span>
              </div>
            </>
          )}
        </div>

        {/* XP gained */}
        {xpGained && (
          <div className="go-xp-section">
            <div className="go-xp-total">+{xpGained.total} XP</div>
            <div className="go-xp-details">
              {xpGained.gains.map((g, i) => (
                <span key={i} className="go-xp-item">+{g.amount} {g.reason}</span>
              ))}
            </div>
            {!user && (
              <p className="go-xp-hint"><i className="fas fa-info-circle"></i> {t('game:gameover.xp_hint')}</p>
            )}
          </div>
        )}

        {/* Recap par equipe */}
        <div className={`go-recap ${showRecap ? 'go-recap-visible' : ''}`}>
          <h3 className="go-recap-title">{t('game:gameover.recap')}</h3>
          {playersByTeam.map(({ team, players: teamPlayers }) => {
            const teamDisplayColor = TEAM_STYLES[team]?.color || '#aaa';
            const teamDisplayLabel = t(`game:teams.${team}.short`);
            const isWinningTeam = team === winner;
            return (
              <div key={team} className={`go-team-group ${isWinningTeam ? 'go-team-winner' : ''}`}>
                <div className="go-team-header" style={{ borderColor: teamDisplayColor }}>
                  <span style={{ color: teamDisplayColor }}>{teamDisplayLabel}</span>
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
                        {player.id === mePlayer?.id && <span className="go-me-badge">{t('common:you')}</span>}
                      </span>
                      <span className="go-player-role" style={{ color: player.character?.couleur || '#888' }}>
                        {player.character?.label}
                      </span>
                      <span className={`go-player-status ${player.isAlive ? 'alive' : 'dead'}`}>
                        {player.isAlive ? (
                          <><i className="fas fa-heart"></i> {t('common:alive')}</>
                        ) : (
                          <><i className="fas fa-skull"></i> {t('common:dead')}</>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Survey */}
        <Survey />

        {/* Boutons */}
        <div className="go-buttons">
          <button className="go-btn go-btn-secondary" onClick={() => setDismissed(true)}>
            {t('common:close')}
          </button>
          <button className="go-btn go-btn-replay" onClick={() => resetForNewGame()}>
            <i className="fas fa-redo"></i> {t('common:replay')}
          </button>
          <button
            className="go-btn go-btn-primary"
            onClick={() => {
              const url = new URL(window.location.href);
              url.searchParams.delete('r');
              window.location.href = url.toString();
            }}
          >
            <i className="fas fa-plus"></i> {t('common:new_lobby')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOver;
