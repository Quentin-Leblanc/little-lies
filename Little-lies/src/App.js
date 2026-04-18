import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Graveyard,
    Menu,
    MainScene,
    Setup,
    Chat,
    Player,
    Roles,
    Time,
} from './components';
import { useGameEngine } from './hooks/useGameEngine';
import GameComponent from './components/GameComponent/GameComponent';
import GameOver from './components/GameOver/GameOver';
import AdminPanel from './components/AdminPanel/AdminPanel';
import RoleReveal from './components/RoleReveal/RoleReveal';
import CustomLobby from './components/CustomLobby/CustomLobby';
import StarryBackground from './utils/StarryBackground';
import LagIndicator from './components/LagIndicator/LagIndicator';
import AmbientEffects from './utils/AmbientEffects';
import i18n from './trad/i18n';
import './styles/global.scss';
import './styles/App.scss';

function App() {
    const { game: { isGameStarted, status, phase }, CONSTANTS, getMe } = useGameEngine();
    const me = getMe();
    const isSpectator = !!me?.isSpectator;
    const isNight = phase === CONSTANTS.PHASE.NIGHT || phase === CONSTANTS.PHASE.NIGHT_TRANSITION;
    const [isSelectingRoles, setIsSelectingRoles] = useState(false);
    const [showRoleReveal, setShowRoleReveal] = useState(true);
    const prevPhaseRef = useRef(null);

    const isGameOver = status === CONSTANTS.GAME_ENDED;
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Sync isSelectingRoles when game resets to ROLE_SELECTION (e.g. Rejouer)
    useEffect(() => {
        if (status === CONSTANTS.GAME_ROLE_SELECTION && !isGameStarted && !isGameOver) {
            setIsSelectingRoles(true);
            setShowRoleReveal(true);
            setCurtainVisible(false);
            setCurtainClosed(false);
            setCurtainReady(false);
        }
    }, [status]);

    // ── Curtain managed at App level (persists across RoleReveal unmount) ──
    const [curtainVisible, setCurtainVisible] = useState(false);
    const [curtainClosed, setCurtainClosed] = useState(false);
    const [curtainReady, setCurtainReady] = useState(false); // true once curtain is fully closed

    // When game starts → show curtain and close it, wait for it to finish
    useEffect(() => {
        if (isGameStarted && showRoleReveal && !curtainVisible) {
            setCurtainVisible(true);
            // Start closing curtain
            requestAnimationFrame(() => setCurtainClosed(true));
            // Curtain animation is 1s — mark ready once fully closed
            setTimeout(() => setCurtainReady(true), 1100);
        }
    }, [isGameStarted]);

    // RoleReveal is done → remove overlay and open curtain immediately
    const handleRoleRevealComplete = () => {
        setShowRoleReveal(false);
        // Open curtain right away
        requestAnimationFrame(() => setCurtainClosed(false));
        // Remove curtain element after opening animation (1s)
        setTimeout(() => {
            setCurtainVisible(false);
            setCurtainReady(false);
        }, 1200);
    };

    // Phase banner overlay
    const [phaseBanner, setPhaseBanner] = useState(null);
    useEffect(() => {
        if (!isGameStarted) return;
        const prev = prevPhaseRef.current;
        prevPhaseRef.current = phase;
        if (!prev || prev === phase) return;

        const PHASE_BANNERS = {
            // Voting banner removed — the action block now pulses to draw attention instead
            [CONSTANTS.PHASE.DEFENSE]: { text: i18n.t('game:phases.DEFENSE'), icon: 'fa-shield', className: 'banner-defense' },
            [CONSTANTS.PHASE.JUDGMENT]: { text: i18n.t('game:phases.JUDGMENT'), icon: 'fa-scale-balanced', className: 'banner-judgment' },
            [CONSTANTS.PHASE.EXECUTION]: { text: i18n.t('game:phases.EXECUTION'), icon: 'fa-skull-crossbones', className: 'banner-execution' },
        };

        const banner = PHASE_BANNERS[phase];
        if (banner) {
            setPhaseBanner(banner);
            const timer = setTimeout(() => setPhaseBanner(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [phase, isGameStarted]);

    // Pre-game: Lobby ↔ Setup with fade transition.
    // Same status flip ('role_selection') drives the switch for all players,
    // so host and guests see the transition at the same moment.
    if (!isGameStarted && !isGameOver) {
        return (
            <div className="App">
                <AnimatePresence mode="wait">
                    {!isSelectingRoles ? (
                        <motion.div
                            key="lobby"
                            initial={{ opacity: 1 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.7, ease: 'easeInOut' }}
                            style={{ width: '100%', height: '100%' }}
                        >
                            <CustomLobby setIsSelectingRoles={setIsSelectingRoles} />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="setup"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.45, ease: 'easeOut' }}
                            style={{ width: '100%', height: '100%' }}
                        >
                            <StarryBackground />
                            <Setup />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // Main game - Grid layout
    return (
        <div className="App">
            {/* Game over overlay — held back while the initial RoleReveal
                is still animating in, otherwise a game that ends during
                the reveal (short round, lucky first-night kill) would
                skip the reveal entirely and cut straight to the end
                screen. RoleReveal calls handleRoleRevealComplete when
                done, which flips showRoleReveal to false and lets
                GameOver take over. */}
            {isGameOver && !showRoleReveal && <GameOver />}

            {/* Curtain — persists across role reveal → game transition */}
            {curtainVisible && (
                <div className={`curtain-overlay ${curtainClosed ? 'closed' : ''}`}>
                    <div className="curtain-fade" />
                    <div className="curtain-panel curtain-left" />
                    <div className="curtain-panel curtain-right" />
                </div>
            )}

            {/* Role reveal (loader + card) — shown only after curtain is
                fully closed. Keeps rendering even after the game has
                ended, so a very short round (e.g. first-night sweep)
                still shows each player their role before cutting to
                GameOver. `isGameStarted` flips to false on endGame(),
                which is why we also accept isGameOver here. */}
            {(isGameStarted || isGameOver) && showRoleReveal && curtainReady && (
                <RoleReveal onComplete={handleRoleRevealComplete} />
            )}

            {/* Phase transition banner — hidden during role reveal */}
            {phaseBanner && !showRoleReveal && (
                <div className={`phase-banner ${phaseBanner.className}`}>
                    <i className={`fas ${phaseBanner.icon}`}></i>
                    <span>{phaseBanner.text}</span>
                </div>
            )}

            {/* Spectator banner */}
            {isSpectator && (
                <div className="spectator-banner">
                    <i className="fas fa-eye" aria-hidden="true"></i>
                    <span>{i18n.t('game:spectator_banner', { defaultValue: 'Spectator mode' })}</span>
                </div>
            )}

            {/* Game UI — pre-mounts behind curtain during role reveal, stays after curtain opens */}
            {(curtainReady || !showRoleReveal) && <GameComponent>
                {/* 3D Scene — fullscreen background */}
                <div className="layout-center">
                    <MainScene />
                </div>

                {/* HUD — fixed top center */}
                <div className="hud-top">
                    <Time />
                </div>

                <div className="game-layout">
                    {/* Top-left — Menu + (Graveyard | Roles) */}
                    <div className="layout-players">
                        <Menu />
                        <div className="players-row">
                            <Graveyard />
                            <Roles />
                        </div>
                    </div>
                    <AdminPanel />

                    {/* Sidebar toggle (mobile/tablet) */}
                    <button
                        className="sidebar-toggle-btn"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        aria-label={sidebarOpen ? 'Fermer le panneau joueur' : 'Ouvrir le panneau joueur'}
                        aria-expanded={sidebarOpen}
                    >
                        <i className={`fas ${sidebarOpen ? 'fa-times' : 'fa-user'}`} aria-hidden="true"></i>
                    </button>
                    {sidebarOpen && <div className="sidebar-backdrop show" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}

                    {/* Right — Role info + player list */}
                    <div className={`layout-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
                        <Player />
                    </div>

                    {/* Bottom-left — Chat */}
                    <div className="layout-chat">
                        <Chat night={isNight} highlight={phase === CONSTANTS.PHASE.DISCUSSION} />
                    </div>
                    <LagIndicator />
                </div>
                <AmbientEffects />
            </GameComponent>}
        </div>
    );
}

export default App;
