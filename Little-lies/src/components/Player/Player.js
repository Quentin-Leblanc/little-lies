import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useGameEngine } from '../../hooks/useGameEngine';
import { useEvents } from '../../hooks/useEvents';
import PlayerActions from '../PlayerActions/PlayerActions';
import './Player.scss';

const Player = () => {
    const { t } = useTranslation(['game', 'common']);
    const { getMe, getPlayers, game, setPlayers } = useGameEngine();
    const { getMyNotifications } = useEvents();
    const me = getMe();
    const players = getPlayers();
    const notifications = getMyNotifications();

    const [lastWill, setLastWill] = useState(me?.lastWill || '');
    const [showLwDialog, setShowLwDialog] = useState(false);

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
            {/* Team block — left, for mafia */}
            {me.character && me.character.team === 'mafia' && (
                <div className="team-block">
                    <h4 className="team-block-title">{t('game:teams.mafia.short')}</h4>
                    {players.filter(p => p.character?.team === 'mafia').map(p => (
                        <div key={p.id} className="team-member" style={{ opacity: p.isAlive ? 1 : 0.4 }}>
                            <span style={{ color: p.profile?.color || '#ccc' }}>{p.profile?.name}</span>
                            <span className="team-member-role" style={{ color: p.character?.couleur || '#888' }}>
                                {p.character?.label}
                            </span>
                            {!p.isAlive && <span className="team-member-dead">{t('common:dead').toLowerCase()}</span>}
                        </div>
                    ))}
                </div>
            )}
            {/* Role info */}
            <div className="role-container">
                <div className="status-line">
                    <span className="status-name" style={{ color: me.profile?.color || '#fff' }}>{me.profile?.name || 'Joueur'}</span>
                    <span className="status-separator">&mdash;</span>
                    <span className="status-team" style={{ color: { town: '#78ff78', mafia: '#ff4444', neutral: '#9370db' }[me.character?.team] || '#aaa' }}>
                        {t(`game:teams.${me.character?.team}.short`)}
                    </span>
                    {!me.isAlive && <span className="status-dead">{t('common:dead').toLowerCase()}</span>}
                    {me.isBlackmailed && (
                        <span className="status-blackmailed">
                            <i className="fas fa-comment-slash"></i> {t('game:notifications.blackmailed')}
                        </span>
                    )}
                </div>

                {me.character?.label && (
                    <>
                        <div className="role-name" style={{ color: me.character.couleur }}>
                            {me.character.icon && <i className={`fas ${me.character.icon}`}></i>}
                            <h2>{me.character.label}</h2>
                        </div>

                        <h4 className="role-section-title"><i className="fas fa-info-circle"></i> Description</h4>
                        <p className="role-description">{me.character.description}</p>

                        <h4 className="role-section-title"><i className="fas fa-crosshairs"></i> Objectif</h4>
                        <div className="role-objective">
                            <span>{me.character.objectif}</span>
                            {execTarget && (
                                <div className="exec-target">
                                    <i className="fas fa-bullseye"></i> Cible : <strong>{execTarget.profile.name}</strong>
                                </div>
                            )}
                        </div>

                        <h4 className="role-section-title"><i className="fas fa-bolt"></i> Actions</h4>
                        <div className="role-actions">
                            {me.character.actions?.length > 0 ? (
                                <ul>
                                    {me.character.actions.map(({ label, description }, index) => (
                                        <li key={index}>
                                            <strong>{label}:</strong> {description}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="no-ability">{t('game:no_ability')}</p>
                            )}
                        </div>

                        {/* Private notifications */}
                        {notifications.length > 0 && (
                            <div className="notifications">
                                <span className="notif-title">
                                    <i className="fas fa-bell"></i> Informations
                                </span>
                                {notifications.map((notif, i) => (
                                    <div key={i} className="notification-item">
                                        {notif.message}
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
            </div>{/* end role-team-row */}

            {/* Actions block */}
            <div className="sidebar-actions-block">
                <PlayerActions />
            </div>

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
