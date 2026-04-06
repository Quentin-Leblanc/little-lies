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

  // --- Vote handlers (with vote weight) ---
  const handleVoteClick = (suspectedPlayerId) => {
    if (!me.isAlive || !isVotingPhase) return;

    const voteWeight = me.voteWeight || 1;
    const existingVotes = trial?.suspects[suspectedPlayerId]?.suspectedBy || [];

    // Add vote(s) based on weight
    const newVotes = [...existingVotes];
    for (let i = 0; i < voteWeight; i++) {
      newVotes.push(me.id);
    }

    setTrial({
      ...trial,
      suspects: {
        ...trial.suspects,
        [suspectedPlayerId]: {
          id: suspectedPlayerId,
          suspectedBy: newVotes,
        },
      },
    });
  };

  const hasVotedToday = trial.suspects && Object.keys(trial.suspects).some((suspectedId) =>
    trial.suspects[suspectedId]?.suspectedBy?.some((voteId) => voteId === me.id)
  );

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

  // --- Night action handler ---
  const handleNightAction = (action, targetPlayer) => {
    // Vest use tracking
    if (action.type === 'VEST' && action.maxUses) {
      const vestUses = me.vestUses || 0;
      if (vestUses >= action.maxUses) return; // No more vests
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === me.id ? { ...p, vestUses: vestUses + 1 } : p
        )
      );
    }

    // Night 1: Vigilante can't shoot
    if (action.type === 'VIGILANTE_KILL' && game.dayCount <= 1) return;

    Events.add({
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
          <button className="primaryBtn reveal-btn" onClick={handleReveal}>
            <i className="fas fa-landmark"></i> Se révéler Maire
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
        <ul className="player-list">
          {players.map((player) => {
            const hasActions = me.isAlive && player.isAlive;
            return (
              <li key={player.id} className={`player-list-item ${player.id === game.accusedId ? 'accused' : ''} ${!player.isAlive ? 'is-dead' : ''}`}>
                <span className="player-name-cell">
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
                      {/* Vote button during VOTING phase */}
                      {me.isAlive && player.id !== me.id && !hasVotedToday && isVotingPhase && (
                        <button className="primaryBtn vote-btn" onClick={() => handleVoteClick(player.id)}>
                          Vote
                        </button>
                      )}
                      {isVotingPhase && (
                        <span className="vote-count">
                          {trial?.suspects[player.id]?.suspectedBy?.length || 0}
                        </span>
                      )}

                      {/* Night actions */}
                      {me.isAlive && isNightPhase && me.character?.actions?.map((action) => {
                        if (Events.hasDoneThisActionTonight(action.type)) return null;
                        if (action.type === 'VOTE' || action.type === 'REVEAL') return null;
                        if (!action.require.includes('isNight')) return null;

                        if (action.type === 'VIGILANTE_KILL' && game.dayCount <= 1) return null;
                        if (action.type === 'VEST' && action.maxUses && (me.vestUses || 0) >= action.maxUses) return null;

                        if (action.targets === 'notMyTeam' && me.character.team === player.character?.team) return null;
                        if (action.targets === 'notMe' && player.id === me.id) return null;
                        if (action.targets === 'self' && player.id !== me.id) return null;

                        const actionStyle = getActionStyle(action.type);
                        return (
                          <button
                            className="action-btn"
                            style={{ background: actionStyle.bg, color: actionStyle.color, border: 'none' }}
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
