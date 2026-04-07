import React, { useState, useEffect } from 'react';
import { useGameEngine } from '../../hooks/useGameEngine';
import { useEvents } from '../../hooks/useEvents';
import PlayerActions from '../PlayerActions/PlayerActions';
import './Player.scss';

const Player = () => {
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
        return <div className="player-container"><p style={{color:'#666',fontStyle:'italic'}}>Connexion en cours...</p></div>;
    }
    if (!me.character) {
        return (
            <div className="player-container">
                <div className="role-container">
                    <p style={{color:'#aaa'}}>{me.profile?.name || 'Joueur'}</p>
                    <p style={{color:'#666',fontStyle:'italic'}}>En attente de l'attribution des rôles...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="player-container">
            {/* Role info */}
            <div className="role-container">
                <div className="status-line">
                    <span className="status-name">{me.profile?.name || 'Joueur'}</span>
                    <span className="status-separator">—</span>
                    <span className="status-team" style={{ color: { town: '#78ff78', mafia: '#ff4444', neutral: '#9370db' }[me.character?.team] || '#aaa' }}>
                        {{ town: 'Village', mafia: 'Mafia', neutral: 'Neutre' }[me.character?.team] || me.character?.team}
                    </span>
                    {!me.isAlive && <span className="status-dead">mort</span>}
                    {me.isBlackmailed && (
                        <span className="status-blackmailed">
                            <i className="fas fa-comment-slash"></i> Bâillonné
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
                                <p className="no-ability">Aucune capacité spéciale</p>
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
                        {lastWill ? lastWill.substring(0, 30) + (lastWill.length > 30 ? '...' : '') : 'Votre testament...'}
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
                                    placeholder="Écrivez votre testament... Il sera révélé à votre mort."
                                    maxLength={300}
                                    autoFocus
                                />
                                <p className="lw-hint">
                                    {lastWill.length}/300 — Aussi accessible via <code>-lw</code> dans le chat
                                </p>
                            </>
                        ) : (
                            <div className="last-will-display">
                                {lastWill || 'Aucun testament laissé.'}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Player;
