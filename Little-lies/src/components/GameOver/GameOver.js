import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useMultiplayerState } from 'playroomkit';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../../hooks/useGameEngine';
import { collectGameMetrics, saveMetrics } from '../../utils/GameMetrics';
import { calculateGameXP } from '../../utils/xpSystem';
import { useAuth } from '../Auth/Auth';
import { addXP, incrementGamesPlayed } from '../../utils/supabase';
import Audio from '../../utils/AudioManager';
import SurveyModal from '../Survey/Survey';
import './GameOver.scss';

const TEAM_STYLES = {
  town: { color: '#78ff78', icon: 'fa-users', bg: 'rgba(120,255,120,0.08)' },
  mafia: { color: '#ff4444', icon: 'fa-user-secret', bg: 'rgba(255,68,68,0.08)' },
  evil: { color: '#ff4444', icon: 'fa-paw', bg: 'rgba(255,68,68,0.08)' },
  cult: { color: '#a96edd', icon: 'fa-hat-wizard', bg: 'rgba(122,61,153,0.10)' },
  neutral: { color: '#9370db', icon: 'fa-star', bg: 'rgba(147,112,219,0.08)' },
  neutral_killing: { color: '#9370db', icon: 'fa-skull', bg: 'rgba(147,112,219,0.08)' },
};

const TEAM_ORDER = ['town', 'mafia', 'evil', 'cult', 'neutral'];

// Timings (ms) for the staged reveal → panel transition. Bumped from
// 5 s / 0.9 s so players actually have time to read the faction + roster
// before the panel takes over.
const INTERMEDIATE_VISIBLE_MS = 8000;
const FADE_BETWEEN_MS = 1400;

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
  const { t } = useTranslation(['game', 'common', 'menu', 'roles']);
  const { game, getPlayers, getMe, resetForNewGame } = useGameEngine();
  const { user, refreshProfile } = useAuth();
  const [_events] = useMultiplayerState('events', []);
  const events = _events || [];
  const [dismissed, setDismissed] = useState(false);
  const [stage, setStage] = useState('intermediate'); // 'intermediate' | 'between' | 'panel'
  const [showContent, setShowContent] = useState(false);
  const [showRecap, setShowRecap] = useState(false);
  const [xpGained, setXpGained] = useState(null);
  const metricsSaved = useRef(false);
  const xpSaved = useRef(false);
  const [surveyOpen, setSurveyOpen] = useState(false);
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

  // Save metrics once players have loaded. Was `[]` deps before, which
  // meant if the first render hit with players.length===0 (very common —
  // playroom state lags the phase flip by a tick) nothing saved. Watching
  // players.length makes it fire as soon as the roster shows up.
  useEffect(() => {
    if (metricsSaved.current || players.length === 0) return;
    metricsSaved.current = true;
    const metrics = collectGameMetrics({ game, players, events });
    saveMetrics(metrics);

    const xpResult = calculateGameXP({
      isWinner: isTeamWinner,
      isNeutralWinner,
      daysSurvived: game.dayCount || 1,
      isAlive: mePlayer?.isAlive,
    });
    setXpGained(xpResult);
  }, [players.length]);

  // Persist XP to Supabase separately — this effect waits for BOTH the
  // computed xpResult AND a logged-in user. Splitting it off from the
  // metrics save protects against a race where the user's auth session
  // loads a beat after the player roster does: in the old flow that was
  // fatal because metricsSaved.current flipped to true on the first run,
  // the `if (user)` branch was skipped, and the effect never re-fired.
  // Now each piece has its own ref guard, so either side arriving late
  // still triggers the save. Supabase errors are surfaced via returned
  // { error } (the builders don't throw), so we pattern-match on that.
  useEffect(() => {
    if (xpSaved.current) return;
    if (!xpGained || !user?.id) return;
    xpSaved.current = true;
    const reasonLabel = xpGained.gains.map(g => g.reason).join(', ');
    (async () => {
      try {
        const xpRes = await addXP(user.id, xpGained.total, reasonLabel);
        if (xpRes?.error) throw xpRes.error;
        const gpRes = await incrementGamesPlayed(user.id, isWinner || isNeutralWinner);
        if (gpRes?.error) throw gpRes.error;
        await refreshProfile();
        // eslint-disable-next-line no-console
        console.info('[GameOver] XP saved', { total: xpGained.total, newXP: xpRes?.newXP });
      } catch (err) {
        xpSaved.current = false; // allow retry on next render
        // eslint-disable-next-line no-console
        console.error('[GameOver] XP save failed', err);
      }
    })();
  }, [xpGained, user?.id]);

  // Lobby music on the game-over screen — same playlist as the lobby so the
  // end-of-game mood carries over into the next session. Stops on unmount.
  useEffect(() => {
    Audio.playLobbyMusic();
    return () => Audio.stopLobbyMusic();
  }, []);

  // Volume controls (mirrors CustomLobby behaviour)
  const [muted, setMuted] = useState(Audio.isMuted());
  const [volume, setVolumeState] = useState(Audio.getVolume());
  const [volumeOpen, setVolumeOpen] = useState(false);
  const volumeRef = useRef(null);

  useEffect(() => {
    if (!volumeOpen) return;
    const onDoc = (e) => {
      if (!volumeRef.current?.contains(e.target)) setVolumeOpen(false);
    };
    const t = setTimeout(() => document.addEventListener('pointerdown', onDoc), 0);
    return () => { clearTimeout(t); document.removeEventListener('pointerdown', onDoc); };
  }, [volumeOpen]);

  const handleToggleMute = () => {
    const m = Audio.toggleMute();
    setMuted(m);
  };
  const handleVolumeChange = (e) => {
    const v = parseFloat(e.target.value);
    setVolumeState(v);
    Audio.setVolume(v);
    if (v > 0 && muted) { Audio.toggleMute(); setMuted(false); }
  };

  // Staged reveal: faction + roles first (5s), fade to black, then panel.
  useEffect(() => {
    const t1 = setTimeout(() => setStage('between'), INTERMEDIATE_VISIBLE_MS);
    const t2 = setTimeout(() => setStage('panel'), INTERMEDIATE_VISIBLE_MS + FADE_BETWEEN_MS);
    const t3 = setTimeout(() => setShowContent(true), INTERMEDIATE_VISIBLE_MS + FADE_BETWEEN_MS + 200);
    const t4 = setTimeout(() => setShowRecap(true), INTERMEDIATE_VISIBLE_MS + FADE_BETWEEN_MS + 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
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
    const sorted = [];
    TEAM_ORDER.forEach(t => {
      if (groups[t]) sorted.push({ team: t, players: groups[t] });
    });
    Object.keys(groups).forEach(t => {
      if (!TEAM_ORDER.includes(t)) sorted.push({ team: t, players: groups[t] });
    });
    return sorted;
  }, [players]);

  if (dismissed) return null;

  const particleType = isWinner ? 'victory' : (isNeutralWinner ? 'neutral' : 'defeat');

  // Nouveau salon — force a fresh Playroom room by navigating to a clean URL.
  // Previous version tried to `reload()` when there was no `r=` param, which
  // landed users right back in the ENDED game state stored server-side.
  // Using `location.replace` with origin+pathname drops any cached URL state.
  const handleNewLobby = () => {
    try {
      sessionStorage.clear();
      localStorage.removeItem('playroom:lastRoom');
    } catch { /* storage blocked */ }
    const target = `${window.location.origin}${window.location.pathname}`;
    window.location.replace(target);
  };

  // Intermediate reveal — faction banner + roles in a 3D-style card.
  // Renders on top of the scene, fades out into the full panel.
  const intermediateVisible = stage === 'intermediate' || stage === 'between';
  const intermediateFading = stage === 'between';

  return (
    <>
      {intermediateVisible && (
        <div className={`go-intermediate ${intermediateFading ? 'go-intermediate-fade' : ''}`}>
          <div className="go-intermediate-backdrop" />
          <div
            className="go-intermediate-card"
            style={{ '--ring-color': teamStyle.color, borderColor: teamStyle.color }}
          >
            <div className="go-intermediate-eyebrow">{t('game:gameover.winning_faction', { defaultValue: 'Winning faction' })}</div>
            <div className="go-intermediate-title" style={{ color: teamStyle.color }}>
              <i className={`fas ${teamStyle.icon}`}></i>
              <span>{teamName}</span>
            </div>
            <div className="go-intermediate-roles">
              {players.map((p) => {
                const rColor = p.character?.couleur || '#888';
                const roleLabel = t(`roles:${p.character?.key}.label`, { defaultValue: p.character?.label || '?' });
                return (
                  <div key={p.id} className={`go-intermediate-row ${p.isAlive ? '' : 'is-dead'}`}>
                    <span className="go-intermediate-name" style={{ color: p.profile?.color || '#ddd' }}>
                      {p.character?.icon && <i className={`fas ${p.character.icon}`} style={{ color: rColor, marginRight: '0.35rem' }}></i>}
                      {p.profile?.name || '?'}
                    </span>
                    <span className="go-intermediate-role" style={{ color: rColor }}>{roleLabel}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {stage === 'panel' && (
        <div className={`go-overlay ${intermediateFading ? '' : ''}`}>
          {/* Volume control — floating top-left, same UX as lobby */}
          <div className="go-volume" ref={volumeRef}>
            <button
              className="go-mute-btn"
              onClick={() => setVolumeOpen((o) => !o)}
              title={muted || volume === 0 ? t('menu:unmute') : t('menu:volume')}
              aria-label={t('menu:volume')}
            >
              <i className={`fas ${muted || volume === 0 ? 'fa-volume-mute' : volume < 0.4 ? 'fa-volume-down' : 'fa-volume-up'}`} aria-hidden="true"></i>
            </button>
            {volumeOpen && (
              <div className="go-volume-popup">
                <button
                  className="go-volume-mute"
                  onClick={handleToggleMute}
                  title={muted ? t('menu:unmute') : t('menu:mute')}
                  aria-label={muted ? t('menu:unmute') : t('menu:mute')}
                >
                  <i className={`fas ${muted ? 'fa-volume-mute' : 'fa-volume-up'}`} aria-hidden="true"></i>
                </button>
                <div className="go-volume-slider-wrap">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={muted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="go-volume-slider"
                  />
                </div>
                <span className="go-volume-value">{Math.round((muted ? 0 : volume) * 100)}</span>
              </div>
            )}
          </div>

          <Particles type={particleType} />
          <div className="go-halo" style={{ '--halo-color': teamStyle.color }} />

          <div className={`go-container ${showContent ? 'go-visible' : ''}`}>
            <div className="go-header">
              <div className="go-icon-ring" style={{ '--ring-color': teamStyle.color }}>
                <i className={`fas ${teamStyle.icon}`} style={{ color: teamStyle.color }}></i>
              </div>
              <h1 className="go-title" style={{ color: teamStyle.color }}>{teamName}</h1>
              <p className="go-subtitle">{t('game:gameover.won')}</p>
            </div>

            <div className={`go-personal ${isWinner ? 'go-win' : 'go-loss'}`}>
              <i className={`fas ${isWinner ? 'fa-crown' : 'fa-skull-crossbones'}`}></i>
              <span>{isWinner ? t('game:gameover.victory') : t('game:gameover.defeat')}</span>
            </div>

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
                            {t(`roles:${player.character?.key}.label`, { defaultValue: player.character?.label })}
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

            <div className="go-feedback-row">
              <button className="go-btn go-btn-feedback" onClick={() => setSurveyOpen(true)}>
                <i className="fas fa-comment-dots"></i> {t('menu:survey.open_button')}
              </button>
            </div>

            <div className="go-buttons">
              <button className="go-btn go-btn-secondary" onClick={() => setDismissed(true)}>
                {t('common:close')}
              </button>
              <button className="go-btn go-btn-replay" onClick={() => resetForNewGame()}>
                <i className="fas fa-redo"></i> {t('common:replay')}
              </button>
              <button className="go-btn go-btn-primary" onClick={handleNewLobby}>
                <i className="fas fa-plus"></i> {t('common:new_lobby')}
              </button>
            </div>
          </div>
        </div>
      )}

      <SurveyModal
        open={surveyOpen}
        onClose={() => setSurveyOpen(false)}
        context={{
          days: game.dayCount,
          playerCount: players.length,
          winningTeam: winner,
        }}
      />
    </>
  );
};

export default GameOver;
