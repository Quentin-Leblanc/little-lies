import React, { useState, useEffect, useRef } from 'react';
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
                    <h4 className="team-block-title">{t(`game:teams.${me.character.team}.short`)}</h4>
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
                            {me.character.icon && <i className={`fas ${me.character.icon}`}></i>}
                            <h2>{roleLabel}</h2>
                        </div>

                        {/* Role info split into a 2-column grid so the block
                            halves its vertical footprint: left column = what
                            you do (description + abilities), right column =
                            what it means (objective + mechanics detail).
                            Grid collapses to one column on narrow viewports. */}
                        <div className="role-info-grid">
                            <section className="role-info-cell">
                                <h4 className="role-section-title"><i className="fas fa-info-circle" aria-hidden="true"></i> {t('game:role_sections.description')}</h4>
                                <p className="role-description">
                                    {descriptionParts.map((part, i) =>
                                        part.toLowerCase() === roleLabel.toLowerCase()
                                            ? <strong key={i}>{part}</strong>
                                            : <React.Fragment key={i}>{part}</React.Fragment>
                                    )}
                                </p>
                            </section>

                            <section className="role-info-cell">
                                <h4 className="role-section-title"><i className="fas fa-crosshairs"></i> {t('game:role_sections.objective', { defaultValue: 'Objectif' })}</h4>
                                <div className="role-objective">
                                    <span>{t(`roles:${me.character.key}.objectif`, { defaultValue: me.character.objectif })}</span>
                                    {execTarget && (
                                        <div className="exec-target">
                                            <i className="fas fa-bullseye" aria-hidden="true"></i> {t('game:role_sections.target')} : <strong>{execTarget.profile.name}</strong>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section className="role-info-cell">
                                <h4 className="role-section-title role-section-title-abilities"><i className="fas fa-bolt" aria-hidden="true"></i> {t('game:role_sections.abilities')}</h4>
                                <div className="role-actions role-actions-highlight">
                                    {me.character.actions?.length > 0 ? (
                                        <ul>
                                            {me.character.actions.map((action, index) => (
                                                <li key={index}>
                                                    <strong>{t(`roles:${me.character.key}.actions.${action.type}.label`, { defaultValue: action.label })}:</strong> {t(`roles:${me.character.key}.actions.${action.type}.description`, { defaultValue: action.description })}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="no-ability">{t('game:no_ability')}</p>
                                    )}
                                </div>
                            </section>

                            {/* Rich mechanics detail — the "why does it matter" bullets
                                the 1-line description can't convey (framing persistence,
                                sheriff binary result, vigilante suicide rule, etc.).
                                Mirrors the role cards in the help dialog so the in-game
                                block shows the same level of nuance a player would look
                                up mid-debate. Supports **markdown bold** inline via the
                                same regex as the help dialog. */}
                            {Array.isArray(me.character.details) && me.character.details.length > 0 && (
                                <section className="role-info-cell">
                                    <h4 className="role-section-title role-section-title-details"><i className="fas fa-scroll" aria-hidden="true"></i> {t('game:role_sections.details', { defaultValue: 'Détails' })}</h4>
                                    <ul className="role-details-list">
                                        {me.character.details.map((line, i) => (
                                            <li
                                                key={i}
                                                dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') }}
                                            />
                                        ))}
                                    </ul>
                                </section>
                            )}
                        </div>
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

            {/* Last Will — always at bottom */}
            <div className="last-will-section">
                <div className="last-will-trigger" onClick={() => setShowLwDialog(true)}>
                    <span className="lw-label">
                        <i className="fas fa-scroll"></i> Last Will
                    </span>
                    <span className="lw-preview">
                        {lastWill ? lastWill.substring(0, 30) + (lastWill.length > 30 ? '...' : '') : t('game:last_will_placeholder')}
                    </span>
                </div>
            </div>

            {/* Last Will dialog */}
            {showLwDialog && (
                <div className="lw-overlay" onClick={() => setShowLwDialog(false)}>
                    <div className="lw-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="lw-dialog-header">
                            <h3><i className="fas fa-scroll"></i> Last Will</h3>
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
                                    {lastWill.length}/300 — Aussi accessible via <code>-lw</code> dans le chat
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
