import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../../hooks/useGameEngine';
import { useEvents } from '../../hooks/useEvents';
import PlayerActions from '../PlayerActions/PlayerActions';
import { toTextCss } from '../../utils/playerColor';
import './Player.scss';

const Player = () => {
    const { t } = useTranslation(['game', 'common', 'roles']);
    const { game, getMe, getPlayers, setPlayers } = useGameEngine();
    const { getMyNotifications } = useEvents();
    const me = getMe();
    const players = getPlayers();
    const notifications = getMyNotifications();

    const [lastWill, setLastWill] = useState(me?.lastWill || '');
    const [showLwDialog, setShowLwDialog] = useState(false);
    // One fold for everything you read once and then stop reading:
    // description, abilities, and the mechanical fine print. They used to
    // be three permanently-open cells plus a separate hover tooltip —
    // half the panel height, every phase of every game, for text the
    // player already met on the role reveal card.
    //
    // What stays out of the fold is what you actually check each turn:
    // who you are, which side you're on, and what you need to win.
    const [detailsOpen, setDetailsOpen] = useState(false);
    useEffect(() => {
        if (!detailsOpen) return;
        const onKey = (e) => { if (e.key === 'Escape') setDetailsOpen(false); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [detailsOpen]);
    const toggleDetails = useCallback((e) => {
        e.stopPropagation();
        setDetailsOpen((v) => !v);
    }, []);

    // White pulse around the role description block at game start (~3s) so
    // players notice their role after the role reveal card closes. Fires
    // exactly once per game on Day 1 when the character is assigned.
    const [roleIntroHighlight, setRoleIntroHighlight] = useState(false);
    const introFiredRef = useRef(false);
    useEffect(() => {
        if (introFiredRef.current) return;
        if (!me?.character) return;
        if (!game?.isGameStarted || game?.dayCount !== 1) return;
        introFiredRef.current = true;
        setRoleIntroHighlight(true);
        const timer = setTimeout(() => setRoleIntroHighlight(false), 3100);
        return () => clearTimeout(timer);
    }, [me?.character, game?.isGameStarted, game?.dayCount]);

    const execTarget = me?.executionerTarget
        ? players.find((p) => p.id === me.executionerTarget)
        : null;

    // Save last will to player state when it changes
    useEffect(() => {
        if (me && me.isAlive && lastWill !== me.lastWill) {
            const timer = setTimeout(() => {
                setPlayers((prev) =>
                    prev.map((p) =>
                        p.id === me.id ? { ...p, lastWill } : p
                    )
                );
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [lastWill]);

    // Sync from server
    useEffect(() => {
        if (me?.lastWill !== undefined && me.lastWill !== lastWill) {
            setLastWill(me.lastWill || '');
        }
    }, [me?.id]);

    if (!me) {
        return <div className="player-container"><p style={{color:'#666',fontStyle:'italic'}}>{t('common:loading')}</p></div>;
    }
    if (!me.character) {
        return (
            <div className="player-container">
                <div className="role-container">
                    <p style={{color:'#aaa'}}>{me.profile?.name || 'Joueur'}</p>
                    <p style={{color:'#666',fontStyle:'italic'}}>{t('common:waiting')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="player-container">
            {/* Role + Team side by side */}
            <div className="role-team-row">
            {/* Team block — left, for teams with shared night awareness
                (mafia, cult). Members see each other and their roles. */}
            {me.character && (me.character.team === 'mafia' || me.character.team === 'cult') && (
                <div className="team-block">
                    <h4 className="team-block-title">{t('game:team_block_title', { team: t(`game:teams.${me.character.team}.short`) })}</h4>
                    {players.filter(p => p.character?.team === me.character.team).map(p => (
                        <div key={p.id} className="team-member" style={{ opacity: p.isAlive ? 1 : 0.4 }}>
                            <span style={{ color: toTextCss(p.profile?.color) }}>{p.profile?.name}</span>
                            <span className="team-member-role" style={{ color: p.character?.couleur || '#888' }}>
                                {t(`roles:${p.character?.key}.label`, { defaultValue: p.character?.label })}
                            </span>
                            {!p.isAlive && <span className="team-member-dead">{t('common:dead').toLowerCase()}</span>}
                        </div>
                    ))}
                </div>
            )}
            {/* Role info */}
            <div className={`role-container ${roleIntroHighlight ? 'role-intro-highlight' : ''}`}>
                <div className="status-line">
                    <span className="status-name" style={{ color: toTextCss(me.profile?.color, '#fff') }}>{me.profile?.name || 'Joueur'}</span>
                    <span className="status-separator">&mdash;</span>
                    <span className="status-team" style={{ color: { town: '#78ff78', mafia: '#ff4444', cult: '#a96edd', neutral: '#9370db' }[me.character?.team] || '#aaa' }}>
                        {t(`game:teams.${me.character?.team}.short`)}
                    </span>
                    {!me.isAlive && <span className="status-dead">{t('common:dead').toLowerCase()}</span>}
                    {me.isBlackmailed && (
                        <span className="status-blackmailed">
                            <i className="fas fa-comment-slash"></i> {t('game:notifications.blackmailed')}
                        </span>
                    )}
                </div>

                {me.character?.label && (() => {
                    const roleLabel = t(`roles:${me.character.key}.label`, { defaultValue: me.character.label });
                    const rawDescription = t(`roles:${me.character.key}.description`, { defaultValue: me.character.description });
                    // Bold the role label wherever it appears in the description
                    // (e.g. "Tu es le Sheriff." → "Tu es le **Sheriff**.")
                    const descriptionParts = roleLabel
                        ? rawDescription.split(new RegExp(`(${roleLabel.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'i'))
                        : [rawDescription];
                    return (
                    <>
                        <div className="role-name" style={{ color: me.character.couleur }}>
                            <span className="role-kicker">{t('game:role_sections.your_role_is', { defaultValue: 'Your role is' })}</span>
                            {me.character.icon && <i className={`fas ${me.character.icon}`}></i>}
                            <h2>{roleLabel}</h2>
                        </div>

                        {/* Objective stays out of the fold: it's the one line
                            a player re-reads every single turn — "what do I
                            need for this to end well for me?". */}
                        <div className="role-objective">
                            <i className="fas fa-crosshairs" aria-hidden="true"></i>
                            <span>{t(`roles:${me.character.key}.objectif`, { defaultValue: me.character.objectif })}</span>
                        </div>
                        {execTarget && (
                            <div className="exec-target">
                                <i className="fas fa-bullseye" aria-hidden="true"></i> {t('game:role_sections.target')} : <strong>{execTarget.profile.name}</strong>
                            </div>
                        )}

                        {/* Everything you read once — description, abilities,
                            fine print — behind one control. Replaces three
                            permanently-open cells plus a hover tooltip. */}
                        <button
                            type="button"
                            className={`role-details-toggle ${detailsOpen ? 'is-open' : ''}`}
                            onClick={toggleDetails}
                            aria-expanded={detailsOpen}
                        >
                            <i className={`fas fa-chevron-${detailsOpen ? 'up' : 'down'}`} aria-hidden="true"></i>
                            <span>{t('game:role_sections.details', { defaultValue: 'Détails du rôle' })}</span>
                        </button>

                        {detailsOpen && (
                            <div className="role-details-panel">
                                <p className="role-description">
                                    {descriptionParts.map((part, i) =>
                                        part.toLowerCase() === roleLabel.toLowerCase()
                                            ? <strong key={i}>{part}</strong>
                                            : <React.Fragment key={i}>{part}</React.Fragment>
                                    )}
                                </p>

                                <h4 className="role-section-title"><i className="fas fa-bolt" aria-hidden="true"></i> {t('game:role_sections.abilities')}</h4>
                                {me.character.actions?.length > 0 ? (
                                    <ul className="role-actions">
                                        {me.character.actions.map((action, index) => (
                                            <li key={index}>
                                                <strong>{t(`roles:${me.character.key}.actions.${action.type}.label`, { defaultValue: action.label })}</strong> — {t(`roles:${me.character.key}.actions.${action.type}.description`, { defaultValue: action.description })}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="no-ability">{t('game:no_ability')}</p>
                                )}

                                {Array.isArray(me.character.details) && me.character.details.length > 0 && (
                                    <ul className="role-details-list">
                                        {me.character.details.map((line, i) => (
                                            <li
                                                key={i}
                                                dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }}
                                            />
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )}
                    </>
                    );
                })()}
            </div>
            </div>{/* end role-team-row */}

            {/* Actions block */}
            <div className="sidebar-actions-block">
                <PlayerActions />
            </div>

            {/* Night-info reveal panel — sits under the action list so the
                Sheriff/Consigliere/Spy etc. reveal lands in a dedicated slot
                instead of piling onto the role description. `night-info-key`
                gets the emphasis treatment (larger font + gold accent) and is
                applied to the investigate/investigate_role notifications. */}
            {notifications.length > 0 && (
                <div className="night-info-panel" key={`ni-${game.dayCount}-${notifications.length}`}>
                    <span className="night-info-title">
                        <i className="fas fa-scroll" aria-hidden="true"></i> {t('game:role_sections.information')}
                    </span>
                    {notifications.map((notif, i) => {
                        const isReveal = notif.type === 'investigate' || notif.type === 'investigate_role';
                        return (
                            <div
                                key={i}
                                className={`night-info-item ${isReveal ? 'night-info-key' : ''}`}
                                style={{ animationDelay: `${0.15 + i * 0.08}s` }}
                            >
                                {notif.message}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Last Will — always at bottom. Hidden when the host disabled
                the "Last wills" house rule: no trigger, no dialog, no UI
                affordance whatsoever so players can't even start drafting a
                testament that would never be surfaced. */}
            {game?.config?.rules?.lastWills !== false && (
            <div className="last-will-section">
                <div className="last-will-trigger" onClick={() => setShowLwDialog(true)}>
                    <span className="lw-label">
                        <i className="fas fa-scroll"></i> {t('game:last_will_title')}
                    </span>
                    <span className="lw-preview">
                        {lastWill ? lastWill.substring(0, 30) + (lastWill.length > 30 ? '...' : '') : t('game:last_will_placeholder')}
                    </span>
                </div>
            </div>
            )}

            {/* Last Will dialog */}
            {game?.config?.rules?.lastWills !== false && showLwDialog && (
                <div className="lw-overlay" onClick={() => setShowLwDialog(false)}>
                    <div className="lw-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="lw-dialog-header">
                            <h3><i className="fas fa-scroll"></i> {t('game:last_will_title')}</h3>
                            <button className="close-button" onClick={() => setShowLwDialog(false)}>X</button>
                        </div>
                        {me.isAlive ? (
                            <>
                                <textarea
                                    className="last-will-input"
                                    value={lastWill}
                                    onChange={(e) => setLastWill(e.target.value)}
                                    placeholder={t('game:last_will_placeholder_write')}
                                    maxLength={300}
                                    autoFocus
                                />
                                <p className="lw-hint">
                                    {lastWill.length}/300 — {t('game:last_will_chat_hint', { cmd: '-lw' })}
                                </p>
                            </>
                        ) : (
                            <div className="last-will-display">
                                {lastWill || t('game:last_will_none')}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Player;
