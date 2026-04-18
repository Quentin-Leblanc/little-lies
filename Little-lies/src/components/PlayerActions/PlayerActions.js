import React, { memo, useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import i18n from '../../trad/i18n';

import { useGameEngine } from '../../hooks/useGameEngine';
import { useEvents } from '../../hooks/useEvents';
import Audio from '../../utils/AudioManager';
import './playerActions.scss';

const ACTION_COLORS = {
  KILL: { bg: 'rgba(200,40,40,0.7)', hover: 'rgba(200,40,40,0.9)', color: '#fff' },
  MAFIA_KILL: { bg: 'rgba(200,40,40,0.7)', hover: 'rgba(200,40,40,0.9)', color: '#fff' },
  VIGILANTE_KILL: { bg: 'rgba(200,40,40,0.7)', hover: 'rgba(200,40,40,0.9)', color: '#fff' },
  SK_KILL: { bg: 'rgba(200,40,40,0.7)', hover: 'rgba(200,40,40,0.9)', color: '#fff' },
  HEAL: { bg: 'rgba(40,180,80,0.7)', hover: 'rgba(40,180,80,0.9)', color: '#fff' },
  PROTECT: { bg: 'rgba(40,180,80,0.7)', hover: 'rgba(40,180,80,0.9)', color: '#fff' },
  BODYGUARD: { bg: 'rgba(40,180,80,0.7)', hover: 'rgba(40,180,80,0.9)', color: '#fff' },
  VEST: { bg: 'rgba(40,140,180,0.7)', hover: 'rgba(40,140,180,0.9)', color: '#fff' },
  INVESTIGATE: { bg: 'rgba(200,180,40,0.7)', hover: 'rgba(200,180,40,0.9)', color: '#000' },
  INVESTIGATE_ROLE: { bg: 'rgba(200,180,40,0.7)', hover: 'rgba(200,180,40,0.9)', color: '#000' },
  LOOKOUT: { bg: 'rgba(200,180,40,0.7)', hover: 'rgba(200,180,40,0.9)', color: '#000' },
  SPY: { bg: 'rgba(200,180,40,0.7)', hover: 'rgba(200,180,40,0.9)', color: '#000' },
  JAIL: { bg: 'rgba(100,100,100,0.7)', hover: 'rgba(100,100,100,0.9)', color: '#fff' },
  JAILOR_EXECUTE: { bg: 'rgba(180,40,40,0.7)', hover: 'rgba(180,40,40,0.9)', color: '#fff' },
  ROLEBLOCK: { bg: 'rgba(180,80,200,0.7)', hover: 'rgba(180,80,200,0.9)', color: '#fff' },
  FRAME: { bg: 'rgba(180,80,200,0.7)', hover: 'rgba(180,80,200,0.9)', color: '#fff' },
  BLACKMAIL: { bg: 'rgba(180,80,200,0.7)', hover: 'rgba(180,80,200,0.9)', color: '#fff' },
  CONVERT: { bg: 'rgba(122,61,153,0.75)', hover: 'rgba(122,61,153,0.95)', color: '#fff' },
  CULT_VOTE: { bg: 'rgba(169,110,221,0.6)', hover: 'rgba(169,110,221,0.85)', color: '#fff' },
};
const getActionStyle = (type) => ACTION_COLORS[type] || { bg: 'rgba(100,100,100,0.7)', hover: 'rgba(100,100,100,0.9)', color: '#fff' };

const getActionTooltip = (type) => i18n.t(`game:action_tooltips.${type}`, { defaultValue: '' });

// Stable, shared across renders — lifted out of the component to keep
// the useMemo below purely dependent on rawPlayers.
const PLAYER_COLORS_ORDER = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6',
  '#1abc9c', '#e91e63', '#00bcd4', '#ff9800', '#8bc34a',
  '#ff5722', '#607d8b', '#cddc39', '#795548', '#03a9f4',
];

const PlayerActions = memo(function () {
  const { t } = useTranslation(['game', 'common']);
  const { getPlayers, getMe, game, CONSTANTS, trial, trialRef, setTrial, setPlayers, addChatSystem, updateActivity } = useGameEngine();
  const Events = useEvents();
  const rawPlayers = getPlayers();
  const me = getMe();

  // Sort players by PLAYER_COLORS index for consistent order across all clients
  const players = useMemo(() => {
    return [...rawPlayers].sort((a, b) => {
      const colA = typeof a.profile?.color === 'string' ? a.profile.color : '';
      const colB = typeof b.profile?.color === 'string' ? b.profile.color : '';
      const idxA = PLAYER_COLORS_ORDER.indexOf(colA);
      const idxB = PLAYER_COLORS_ORDER.indexOf(colB);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });
  }, [rawPlayers]);

  const [isDead, setIsDead] = useState(false);
  const [blockFlash, setBlockFlash] = useState(null); // 'roleblocked' | 'jailed' | null
  const prevAliveRef = useRef(me?.isAlive ?? true);
  const seenBlockNotifRef = useRef(new Set());

  const phase = game.phase;
  const isVotingPhase = phase === CONSTANTS.PHASE.VOTING;
  const isJudgmentPhase = phase === CONSTANTS.PHASE.JUDGMENT;
  const isDefensePhase = phase === CONSTANTS.PHASE.DEFENSE;
  const isLastWordsPhase = phase === CONSTANTS.PHASE.LAST_WORDS;
  const isNightPhase = phase === CONSTANTS.PHASE.NIGHT;
  const isDiscussionPhase = phase === CONSTANTS.PHASE.DISCUSSION;
  const isDayPhase = game.isDay && phase !== CONSTANTS.PHASE.NIGHT_TRANSITION;

  // Death flash
  useEffect(() => {
    const wasAlive = prevAliveRef.current;
    const isNowDead = me && !me.isAlive;
    prevAliveRef.current = me?.isAlive ?? true;
    if (wasAlive && isNowDead) {
      setIsDead(true);
      const timer = setTimeout(() => setIsDead(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [me?.isAlive]);

  // Roleblock / Jail flash — fires when a fresh notification of that type lands
  const myNotifs = Events?.getMyNotifications?.() || [];
  const blockNotifKey = myNotifs
    .filter((n) => n.type === 'roleblocked' || n.type === 'jailed')
    .map((n) => `${n.dayCount}:${n.type}`)
    .pop() || null;
  useEffect(() => {
    if (!blockNotifKey) return;
    if (seenBlockNotifRef.current.has(blockNotifKey)) return;
    seenBlockNotifRef.current.add(blockNotifKey);
    const type = blockNotifKey.split(':')[1];
    setBlockFlash(type);
    if (type === 'jailed') Audio.playJailed(); else Audio.playActionBlocked();
    const timer = setTimeout(() => setBlockFlash(null), 1500);
    return () => clearTimeout(timer);
  }, [blockNotifKey]);

  if (!me) return null;

  // --- Mayor REVEAL action ---
  const handleReveal = () => {
    if (!me.isAlive || me.isRevealed) return;
    setPlayers((prev) =>
      prev.map((p) =>
        p.id === me.id
          ? { ...p, isRevealed: true, voteWeight: 3, canBeHealed: false }
          : p
      )
    );
    // Immediate chat message for reveal
    addChatSystem(i18n.t('game:system.mayor_reveal', { name: me.profile.name }), '#ffd700');
  };

  // --- Vote handlers ---
  const myVoteTarget = trial.suspects && Object.keys(trial.suspects).find((suspectedId) =>
    trial.suspects[suspectedId]?.suspectedBy?.some((voteId) => voteId === me.id)
  );
  const hasVoted = !!myVoteTarget;

  const handleVoteClick = (suspectedPlayerId) => {
    if (!me.isAlive || me.isSpectator || !isVotingPhase || hasVoted) return;
    // Reject obviously invalid targets at source — the host sanitizer
    // would drop them within 1s anyway, but filtering here avoids a flash
    // of bad UI state and keeps the chat announcement honest.
    if (suspectedPlayerId === me.id) return;
    const target = players.find((p) => p.id === suspectedPlayerId);
    if (!target || !target.isAlive || target.isSpectator) return;
    updateActivity(me.id);
    const voteWeight = me.voteWeight || 1;
    // Deep copy trial to avoid mutating shared references
    const latestTrial = trialRef.current || { suspects: {}, votes: {} };
    const newSuspects = {};
    // Deep copy each suspect entry (clone the suspectedBy arrays)
    Object.keys(latestTrial.suspects || {}).forEach(key => {
      const entry = latestTrial.suspects[key];
      newSuspects[key] = { ...entry, suspectedBy: [...(entry.suspectedBy || [])] };
    });
    if (!newSuspects[suspectedPlayerId]) {
      newSuspects[suspectedPlayerId] = { id: suspectedPlayerId, suspectedBy: [] };
    }
    for (let i = 0; i < voteWeight; i++) {
      newSuspects[suspectedPlayerId].suspectedBy.push(me.id);
    }
    setTrial({ suspects: newSuspects, votes: latestTrial.votes || {} });
    const targetPlayer = players.find(p => p.id === suspectedPlayerId);
    const totalVotes = newSuspects[suspectedPlayerId]?.suspectedBy?.length || 0;
    const aliveCount = players.filter(p => p.isAlive).length;
    if (targetPlayer) {
      addChatSystem(`Vote ${targetPlayer.profile.name} (${totalVotes}/${aliveCount})`, 'vote');
    }
  };

  // --- Judgment handlers ---
  const handleJudgmentVote = (vote) => {
    if (!me.isAlive || me.isSpectator || !isJudgmentPhase) return;
    if (me.id === game.accusedId) return;
    // Only accept the three valid verdicts — defense in depth against UI
    // bugs that might pass through something weird.
    if (vote !== 'guilty' && vote !== 'innocent' && vote !== 'abstain') return;
    updateActivity(me.id);
    const latestTrial = trialRef.current || { suspects: {}, votes: {} };
    setTrial({ suspects: latestTrial.suspects || {}, votes: { ...(latestTrial.votes || {}), [me.id]: vote } });
  };

  // --- Day action handler (Jailor jail) ---
  const handleDayAction = (action, targetPlayer) => {
    if (me.isSpectator || !me.isAlive) return;
    updateActivity(me.id);
    if (action.type === 'JAIL') {
      const currentTarget = Events.getMyActionTarget('JAIL');
      if (currentTarget === targetPlayer.id) return;
      Events.replaceAction({
        type: 'JAIL',
        content: { target: targetPlayer.id, chatMessage: '', by: me.id },
        displayed: false,
      });
    }
  };

  // --- Night action handler ---
  const handleNightAction = (action, targetPlayer) => {
    if (me.isSpectator || !me.isAlive) return;
    updateActivity(me.id);
    if (action.type === 'VEST' && action.maxUses) {
      const alreadyUsed = Events.hasDoneThisActionTonight(action.type);
      if (!alreadyUsed) {
        const vestUses = me.vestUses || 0;
        if (vestUses >= action.maxUses) return;
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === me.id ? { ...p, vestUses: vestUses + 1 } : p
          )
        );
      }
    }

    if (action.type === 'JAILOR_EXECUTE' && action.maxUses) {
      const alreadyUsed = Events.hasDoneThisActionTonight(action.type);
      if (!alreadyUsed) {
        const execUses = me.jailorExecutes || 0;
        if (execUses >= action.maxUses) return;
        setPlayers((prev) =>
          prev.map((p) =>
            p.id === me.id ? { ...p, jailorExecutes: execUses + 1 } : p
          )
        );
      }
    }

    if (action.type === 'VIGILANTE_KILL') {
      if (game.dayCount <= 1) return;
      if (action.maxUses) {
        const alreadyUsed = Events.hasDoneThisActionTonight(action.type);
        if (!alreadyUsed) {
          const shots = me.vigilanteShots || 0;
          if (shots >= action.maxUses) return;
          setPlayers((prev) =>
            prev.map((p) =>
              p.id === me.id ? { ...p, vigilanteShots: shots + 1 } : p
            )
          );
        }
      }
    }

    const currentTarget = Events.getMyActionTarget(action.type);
    if (currentTarget === targetPlayer.id) return;

    Events.replaceAction({
      type: action.type,
      content: { target: targetPlayer.id, chatMessage: '', by: me.id },
      displayed: false,
    });
  };

  const myJudgmentVote = trial.votes?.[me.id];
  const accusedPlayer = players.find((p) => p.id === game.accusedId);
  const canReveal = me.isAlive && !me.isRevealed && me.character?.key === 'maire' && (isDiscussionPhase || isVotingPhase);

  // Jailor: get jail target for night display
  const jailTarget = me.character?.key === 'jailor' ? Events.getMyActionTarget('JAIL') : null;

  // Phase header text
  const getPhaseHeader = () => {
    if (isNightPhase) return { text: t('game:phase_headers.night_actions'), icon: 'fa-moon', color: '#8899cc' };
    if (isVotingPhase) return { text: t('game:phase_headers.voting_phase'), icon: 'fa-gavel', color: '#ffa502' };
    if (isJudgmentPhase) return { text: t('game:phase_headers.judgment'), icon: 'fa-scale-balanced', color: '#cc88ff' };
    if (isDefensePhase) return { text: t('game:phase_headers.defense'), icon: 'fa-shield', color: '#ff6666' };
    if (isDiscussionPhase) return { text: t('game:phase_headers.discussion'), icon: 'fa-comments', color: '#78ff78' };
    return null;
  };
  const phaseHeader = getPhaseHeader();

  return (
    <>
      {isDead && createPortal(
        <div className="death-flash"></div>,
        document.body
      )}

      {blockFlash && createPortal(
        <div className={`block-flash block-flash-${blockFlash}`}>
          <div className="block-flash-label">
            <i className={`fas ${blockFlash === 'jailed' ? 'fa-lock' : 'fa-ban'}`}></i>
            {blockFlash === 'jailed'
              ? t('game:notifications.jailed')
              : t('game:notifications.roleblocked')}
          </div>
        </div>,
        document.body
      )}

      {/* Big centered judgment buttons overlay (jurors only) */}
      {isJudgmentPhase && accusedPlayer && me.id !== game.accusedId && me.isAlive && createPortal(
        <div className="judgment-center-overlay">
          <div className="judgment-center-title">
            {t('game:gameover.is_accused', { name: accusedPlayer.profile.name })}
          </div>
          <div className="judgment-center-buttons">
            <button
              className={`judgment-center-btn judgment-center-innocent ${myJudgmentVote === 'innocent' ? 'active' : ''}`}
              onClick={() => handleJudgmentVote('innocent')}
              disabled={!!myJudgmentVote}
              aria-pressed={myJudgmentVote === 'innocent'}
              aria-label={t('common:innocent')}
            >
              <i className="fas fa-shield" aria-hidden="true"></i>
              <span>{t('common:innocent')}</span>
            </button>
            <button
              className={`judgment-center-btn judgment-center-guilty ${myJudgmentVote === 'guilty' ? 'active' : ''}`}
              onClick={() => handleJudgmentVote('guilty')}
              disabled={!!myJudgmentVote}
              aria-pressed={myJudgmentVote === 'guilty'}
              aria-label={t('common:guilty')}
            >
              <i className="fas fa-gavel" aria-hidden="true"></i>
              <span>{t('common:guilty')}</span>
            </button>
          </div>
          {myJudgmentVote && (
            <div className="judgment-center-hint">
              {t('game:judgment_vote_cast', { defaultValue: 'Your verdict has been cast.' })}
            </div>
          )}
        </div>,
        document.body
      )}

      <div className={`player-list-container ${isVotingPhase ? 'highlight-vote' : ''}`}>
        {/* Mayor reveal button */}
        {canReveal && (
          <button className="reveal-btn" onClick={handleReveal}>
            <i className="fas fa-landmark"></i> {t('game:mayor_reveal_btn', { defaultValue: 'Reveal as Mayor' })}
          </button>
        )}

        {/* Revealed Mayor indicator */}
        {me.isRevealed && me.character?.key === 'maire' && (
          <div className="revealed-banner">
            <i className="fas fa-landmark"></i> {t('game:player_list.mayor_revealed')}
          </div>
        )}

        {/* Phase context panel — fixed height container to prevent layout shift */}
        <div className="phase-context-slot">
          {/* Judgment phase — sidebar recap (buttons also shown as big center overlay) */}
          {isJudgmentPhase && accusedPlayer && me.id !== game.accusedId && me.isAlive && (
            <div className="judgment-panel">
              <p>{t('game:gameover.is_accused', { name: accusedPlayer.profile.name })}</p>
              <div className="judgment-buttons">
                <button
                  className={`primaryBtn judgment-innocent ${myJudgmentVote === 'innocent' ? 'active' : ''}`}
                  onClick={() => handleJudgmentVote('innocent')}
                  disabled={!!myJudgmentVote}
                  aria-pressed={myJudgmentVote === 'innocent'}
                  aria-label={t('common:innocent')}
                >
                  <i className="fas fa-shield" aria-hidden="true"></i> {t('common:innocent')}
                </button>
                <button
                  className={`primaryBtn judgment-guilty ${myJudgmentVote === 'guilty' ? 'active' : ''}`}
                  onClick={() => handleJudgmentVote('guilty')}
                  disabled={!!myJudgmentVote}
                  aria-pressed={myJudgmentVote === 'guilty'}
                  aria-label={t('common:guilty')}
                >
                  <i className="fas fa-gavel" aria-hidden="true"></i> {t('common:guilty')}
                </button>
              </div>
              <p className="judgment-hint">{t('game:judgment_default_guilty', { defaultValue: 'Guilty by default — vote Innocent to save' })}</p>
            </div>
          )}

          {/* Defense phase */}
          {isDefensePhase && accusedPlayer && (
            <div className="defense-panel">
              <p>{t('game:gameover.accused_defense', { name: accusedPlayer.profile.name })}</p>
            </div>
          )}

          {/* Last words phase */}
          {isLastWordsPhase && accusedPlayer && (
            <div className="defense-panel">
              <p>{t('game:gameover.last_words', { name: accusedPlayer.profile.name })}</p>
            </div>
          )}

          {/* Phase header */}
          {phaseHeader && me.isAlive && (
            <div className="phase-header" style={{ color: phaseHeader.color }}>
              <i className={`fas ${phaseHeader.icon}`}></i> {phaseHeader.text}
            </div>
          )}
        </div>

        {/* Player list */}
        <div className={`player-list-wrapper ${isNightPhase ? 'night-mode' : ''}`}>
        <h4 className="player-list-title"><i className="fas fa-users"></i> {t('game:player_list.title', { alive: players.filter(p => p.isAlive).length, total: players.length })}</h4>
        <ul className="player-list">
          {players.map((player) => {
            const isNightTarget = isNightPhase && me.isAlive && me.character?.actions?.some(
              (a) => a.type !== 'VOTE' && a.type !== 'REVEAL' && Events.getMyActionTarget(a.type) === player.id
            );
            const isDayTarget = isDayPhase && me.isAlive && jailTarget === player.id;
            const voteCount = trial?.suspects?.[player.id]?.suspectedBy?.length || 0;
            const isBlackmailed = player.isBlackmailed && game.isDay;

            return (
              <li key={player.id} className={`player-list-item ${player.id === game.accusedId ? 'accused' : ''} ${!player.isAlive ? 'is-dead' : ''} ${player.id === me.id ? 'is-me' : ''} ${isNightTarget || isDayTarget ? 'night-target' : ''}`}>
                <span className="player-name-cell">
                  <span className={`player-status-dot ${player.connected !== false ? 'dot-online' : 'dot-offline'}`}></span>
                  <span className="player-name-text" style={{ color: player.isAlive ? (player.profile?.color || '#ccc') : '#666' }}>
                    {player.profile.name}{player.id === me.id ? ` (${t('common:you')})` : ''}
                  </span>
                  {player.isRevealed && (
                    <span className="revealed-badge" title={t('game:player_list.mayor_revealed')}>
                      <i className="fas fa-landmark"></i>
                    </span>
                  )}
                  {isBlackmailed && (
                    <span className="blackmailed-badge" title={t('game:notifications.blackmailed')}>
                      <i className="fas fa-comment-slash"></i>
                    </span>
                  )}
                  {player.disconnectedAt && player.isAlive && (
                    <span className="disconnecting-badge" title={t('game:player_list.disconnecting', { defaultValue: 'Disconnecting...' })}>
                      <i className="fas fa-wifi" aria-hidden="true"></i>
                    </span>
                  )}
                  {player.isAFK && player.isAlive && (
                    <span className="afk-badge" title={t('game:player_list.afk', { defaultValue: 'Inactive' })}>
                      <i className="fas fa-moon"></i> AFK
                    </span>
                  )}
                </span>

                <div className="vote-container">
                  {player.isAlive ? (
                    <>
                      {/* Vote button */}
                      {isVotingPhase && (
                        <button
                          className={`vote-btn ${myVoteTarget === player.id ? 'vote-btn-active' : ''} ${(hasVoted && myVoteTarget !== player.id) || player.id === me.id ? 'vote-btn-disabled' : ''}`}
                          onClick={() => player.id !== me.id && handleVoteClick(player.id)}
                          disabled={player.id === me.id}
                          aria-pressed={myVoteTarget === player.id}
                          aria-label={t('game:aria.vote_for', { name: player.profile.name, defaultValue: `Vote for ${player.profile.name}` })}
                        >
                          Vote
                        </button>
                      )}
                      {isVotingPhase && (
                        <span className="vote-count-num">{voteCount}</span>
                      )}

                      {/* Day actions — Jailor JAIL during Discussion/Voting */}
                      {me.isAlive && isDayPhase && (isDiscussionPhase || isVotingPhase) && me.character?.actions?.map((action) => {
                        if (!action.require.includes('isDay')) return null;
                        if (action.type === 'REVEAL') return null; // handled separately
                        if (action.targets === 'notMe' && player.id === me.id) return null;
                        if (action.targets === 'self' && player.id !== me.id) return null;

                        const isSelected = Events.getMyActionTarget(action.type) === player.id;
                        const style = getActionStyle(action.type);
                        return (
                          <button
                            className={`action-btn ${isSelected ? 'action-btn-active' : ''}`}
                            style={{ '--action-bg': style.bg, '--action-hover': style.hover }}
                            onClick={() => handleDayAction(action, player)}
                            key={action.type}
                            title={getActionTooltip(action.type) || action.description || ''}
                            aria-pressed={isSelected}
                            aria-label={t('game:aria.action_on', { action: action.label, name: player.profile.name, defaultValue: `${action.label} ${player.profile.name}` })}
                          >
                            {action.label}
                          </button>
                        );
                      })}

                      {/* Night actions */}
                      {me.isAlive && isNightPhase && me.character?.actions?.map((action) => {
                        if (action.type === 'VOTE' || action.type === 'REVEAL') return null;
                        if (!action.require.includes('isNight')) return null;

                        if (action.type === 'VIGILANTE_KILL' && game.dayCount <= 1) {
                          // Show disabled hint only on first player to explain why
                          if (players.indexOf(player) === 0) {
                            return (
                              <span key={action.type} className="action-hint-disabled" title={t('game:vigilante_night1', { defaultValue: 'Cannot shoot night 1' })}>
                                <i className="fas fa-lock"></i> {action.label}
                              </span>
                            );
                          }
                          return null;
                        }
                        if (action.type === 'VIGILANTE_KILL' && action.maxUses && !Events.hasDoneThisActionTonight(action.type) && (me.vigilanteShots || 0) >= action.maxUses) {
                          if (players.indexOf(player) === 0) {
                            return (
                              <span key={action.type} className="action-hint-disabled" title={t('game:vigilante_out_of_shots', { defaultValue: 'No shots remaining' })}>
                                <i className="fas fa-ban"></i> {action.label}
                              </span>
                            );
                          }
                          return null;
                        }
                        if (action.type === 'VEST' && action.maxUses && !Events.hasDoneThisActionTonight(action.type) && (me.vestUses || 0) >= action.maxUses) return null;
                        if (action.type === 'JAILOR_EXECUTE') {
                          if (player.id !== jailTarget) return null;
                          if (action.maxUses && (me.jailorExecutes || 0) >= action.maxUses) return null;
                        }

                        if (action.targets === 'notMyTeam' && me.character.team === player.character?.team) return null;
                        if (action.targets === 'notMe' && player.id === me.id) return null;
                        if (action.targets === 'self' && player.id !== me.id) return null;
                        if (action.targets === 'jailed') return null;

                        const isSelected = Events.getMyActionTarget(action.type) === player.id;
                        const style = getActionStyle(action.type);
                        const showCounter = action.type === 'VIGILANTE_KILL' && action.maxUses;
                        const shotsLeft = showCounter ? action.maxUses - (me.vigilanteShots || 0) : null;
                        return (
                          <button
                            className={`action-btn ${isSelected ? 'action-btn-active' : ''}`}
                            style={{ '--action-bg': style.bg, '--action-hover': style.hover }}
                            onClick={() => handleNightAction(action, player)}
                            key={action.type}
                            title={getActionTooltip(action.type) || action.description || ''}
                            aria-pressed={isSelected}
                            aria-label={t('game:aria.action_on', { action: action.label, name: player.profile.name, defaultValue: `${action.label} ${player.profile.name}` })}
                          >
                            {action.label}{showCounter ? ` (${shotsLeft})` : ''}
                          </button>
                        );
                      })}
                    </>
                  ) : (
                    <span className="dead-label">{t('common:dead').toLowerCase()}</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        </div>
      </div>
    </>
  );
});

export default PlayerActions;
