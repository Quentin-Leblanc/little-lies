import React, { memo, useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

import { useGameEngine } from '../../hooks/useGameEngine';
import { useEvents } from '../../hooks/useEvents';

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
  LOOKOUT: { bg: 'rgba(200,180,40,0.7)', hover: 'rgba(200,180,40,0.9)', color: '#000' },
  SPY: { bg: 'rgba(200,180,40,0.7)', hover: 'rgba(200,180,40,0.9)', color: '#000' },
  JAIL: { bg: 'rgba(100,100,100,0.7)', hover: 'rgba(100,100,100,0.9)', color: '#fff' },
  ROLEBLOCK: { bg: 'rgba(180,80,200,0.7)', hover: 'rgba(180,80,200,0.9)', color: '#fff' },
  FRAME: { bg: 'rgba(180,80,200,0.7)', hover: 'rgba(180,80,200,0.9)', color: '#fff' },
  BLACKMAIL: { bg: 'rgba(180,80,200,0.7)', hover: 'rgba(180,80,200,0.9)', color: '#fff' },
};
const getActionStyle = (type) => ACTION_COLORS[type] || { bg: 'rgba(100,100,100,0.7)', hover: 'rgba(100,100,100,0.9)', color: '#fff' };

const PlayerActions = memo(function () {
  const { getPlayers, getMe, game, CONSTANTS, trial, setTrial, setPlayers, setGame } = useGameEngine();
  const Events = useEvents();
  const players = getPlayers();
  const me = getMe();

  const [isDead, setIsDead] = useState(false);
  const [actionUsed, setActionUsed] = useState(null);

  const phase = game.phase;
  const isVotingPhase = phase === CONSTANTS.PHASE.VOTING;
  const isJudgmentPhase = phase === CONSTANTS.PHASE.JUDGMENT;
  const isDefensePhase = phase === CONSTANTS.PHASE.DEFENSE;
  const isLastWordsPhase = phase === CONSTANTS.PHASE.LAST_WORDS;
  const isNightPhase = phase === CONSTANTS.PHASE.NIGHT;
  const isDiscussionPhase = phase === CONSTANTS.PHASE.DISCUSSION;

  useEffect(() => {
    setActionUsed(null);
  }, [game.phase]);

  useEffect(() => {
    if (me && !me.isAlive && game.isDay) {
      setIsDead(true);
      const timer = setTimeout(() => setIsDead(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [me?.isAlive, game.isDay]);

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

    Events.add({
      type: 'REVEAL',
      content: {
        by: me.id,
        chatMessage: `${me.profile.name} s'est révélé en tant que Maire ! Ses votes comptent triple.`,
      },
      displayed: false,
    });
  };

  // --- Vote handlers (with vote weight, allows changing vote) ---
  const myVoteTarget = trial.suspects && Object.keys(trial.suspects).find((suspectedId) =>
    trial.suspects[suspectedId]?.suspectedBy?.some((voteId) => voteId === me.id)
  );

  const handleVoteClick = (suspectedPlayerId) => {
    if (!me.isAlive || !isVotingPhase) return;
    // If clicking the same target, do nothing
    if (myVoteTarget === suspectedPlayerId) return;

    const voteWeight = me.voteWeight || 1;

    // Remove my votes from all targets first
    const newSuspects = {};
    Object.keys(trial.suspects || {}).forEach((sid) => {
      const filtered = (trial.suspects[sid]?.suspectedBy || []).filter((vid) => vid !== me.id);
      if (filtered.length > 0 || sid === suspectedPlayerId) {
        newSuspects[sid] = { id: sid, suspectedBy: filtered };
      }
    });

    // Add my votes to the new target
    if (!newSuspects[suspectedPlayerId]) {
      newSuspects[suspectedPlayerId] = { id: suspectedPlayerId, suspectedBy: [] };
    }
    for (let i = 0; i < voteWeight; i++) {
      newSuspects[suspectedPlayerId].suspectedBy.push(me.id);
    }

    setTrial({ ...trial, suspects: newSuspects });
  };

  // --- Judgment handlers ---
  const handleJudgmentVote = (vote) => {
    if (!me.isAlive || !isJudgmentPhase) return;
    if (me.id === game.accusedId) return;

    setTrial({
      ...trial,
      votes: {
        ...trial.votes,
        [me.id]: vote,
      },
    });
  };

  // --- Night action handler (allows changing target) ---
  const handleNightAction = (action, targetPlayer) => {
    // Vest use tracking (only increment on first use, not on change)
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

    // Night 1: Vigilante can't shoot
    if (action.type === 'VIGILANTE_KILL' && game.dayCount <= 1) return;

    // If same target, do nothing
    const currentTarget = Events.getMyActionTarget(action.type);
    if (currentTarget === targetPlayer.id) return;

    Events.replaceAction({
      type: action.type,
      content: {
        target: targetPlayer.id,
        chatMessage: '',
        by: me.id,
      },
      displayed: false,
    });
    setActionUsed({ type: action.label, targetName: targetPlayer.profile.name });
  };

  const myJudgmentVote = trial.votes?.[me.id];
  const accusedPlayer = players.find((p) => p.id === game.accusedId);

  // Check if Mayor can reveal
  const canReveal = me.isAlive && !me.isRevealed && me.character?.key === 'maire' && (isDiscussionPhase || isVotingPhase);

  return (
    <>
      {isDead && ReactDOM.createPortal(
        <div className="death-flash"></div>,
        document.body
      )}

      <div className="player-list-container">
        {/* Mayor reveal button */}
        {canReveal && (
          <button className="reveal-btn" onClick={handleReveal}>
            <i className="fas fa-landmark"></i> Maire
          </button>
        )}

        {/* Revealed Mayor indicator */}
        {me.isRevealed && me.character?.key === 'maire' && (
          <div className="revealed-banner">
            <i className="fas fa-landmark"></i> Maire révélé — 3 votes
          </div>
        )}

        {/* Judgment phase */}
        {isJudgmentPhase && accusedPlayer && me.id !== game.accusedId && me.isAlive && (
          <div className="judgment-panel">
            <p>{accusedPlayer.profile.name} est-il coupable ?</p>
            <div className="judgment-buttons">
              <button
                className={`primaryBtn judgment-guilty ${myJudgmentVote === 'guilty' ? 'active' : ''}`}
                onClick={() => handleJudgmentVote('guilty')}
                disabled={!!myJudgmentVote}
              >
                Coupable
              </button>
              <button
                className={`primaryBtn judgment-innocent ${myJudgmentVote === 'innocent' ? 'active' : ''}`}
                onClick={() => handleJudgmentVote('innocent')}
                disabled={!!myJudgmentVote}
              >
                Innocent
              </button>
              <button
                className={`primaryBtn judgment-abstain ${myJudgmentVote === 'abstain' ? 'active' : ''}`}
                onClick={() => handleJudgmentVote('abstain')}
                disabled={!!myJudgmentVote}
              >
                Abstention
              </button>
            </div>
          </div>
        )}

        {/* Defense phase */}
        {isDefensePhase && accusedPlayer && (
          <div className="defense-panel">
            <p><strong>{accusedPlayer.profile.name}</strong> est accusé ! C'est le moment de se défendre.</p>
          </div>
        )}

        {/* Last words phase */}
        {isLastWordsPhase && accusedPlayer && (
          <div className="defense-panel">
            <p><strong>{accusedPlayer.profile.name}</strong> — Derniers mots...</p>
          </div>
        )}

        {/* Action confirmation */}
        {actionUsed && isNightPhase && (
          <div className="action-confirmation">
            <i className="fas fa-check-circle"></i> {actionUsed.type} → {actionUsed.targetName}
          </div>
        )}

        {/* Player list — always show all players */}
        <h4 className="player-list-title"><i className="fas fa-users"></i> Résidents</h4>
        <ul className="player-list">
          {players.map((player) => {
            const hasActions = me.isAlive && player.isAlive;
            return (
              <li key={player.id} className={`player-list-item ${player.id === game.accusedId ? 'accused' : ''} ${!player.isAlive ? 'is-dead' : ''}`}>
                <span className="player-name-cell">
                  <span className="player-color-dot" style={{ backgroundColor: player.profile.color || '#888' }} />
                  <span style={{ color: player.profile.color }}>
                    {player.profile.name}
                  </span>
                  {player.isRevealed && (
                    <span className="revealed-badge" title="Maire révélé">
                      <i className="fas fa-landmark"></i>
                    </span>
                  )}
                </span>

                <div className="vote-container">
                  {player.isAlive ? (
                    <>
                      {/* Vote button during VOTING phase — stays visible, pressed when selected */}
                      {me.isAlive && player.id !== me.id && isVotingPhase && (
                        <button
                          className={`vote-btn ${myVoteTarget === player.id ? 'vote-btn-active' : ''}`}
                          onClick={() => handleVoteClick(player.id)}
                        >
                          Vote
                        </button>
                      )}
                      {isVotingPhase && (
                        <span className="vote-count">
                          {trial?.suspects[player.id]?.suspectedBy?.length || 0}
                        </span>
                      )}

                      {/* Night actions — stays visible, pressed when selected */}
                      {me.isAlive && isNightPhase && me.character?.actions?.map((action) => {
                        if (action.type === 'VOTE' || action.type === 'REVEAL') return null;
                        if (!action.require.includes('isNight')) return null;

                        if (action.type === 'VIGILANTE_KILL' && game.dayCount <= 1) return null;
                        if (action.type === 'VEST' && action.maxUses && !Events.hasDoneThisActionTonight(action.type) && (me.vestUses || 0) >= action.maxUses) return null;

                        if (action.targets === 'notMyTeam' && me.character.team === player.character?.team) return null;
                        if (action.targets === 'notMe' && player.id === me.id) return null;
                        if (action.targets === 'self' && player.id !== me.id) return null;

                        const isSelected = Events.getMyActionTarget(action.type) === player.id;
                        const actionStyle = getActionStyle(action.type);
                        return (
                          <button
                            className={`action-btn ${isSelected ? 'action-btn-active' : ''}`}
                            style={{ background: isSelected ? actionStyle.hover : actionStyle.bg, color: actionStyle.color, border: 'none' }}
                            onClick={() => handleNightAction(action, player)}
                            key={action.type}
                          >
                            {action.label}
                          </button>
                        );
                      })}
                    </>
                  ) : (
                    <span className="dead-label">mort</span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
});

export default PlayerActions;
