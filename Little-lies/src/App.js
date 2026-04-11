import React, { useState, useEffect, useRef } from 'react';
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
import { TimeBar } from './components/time/Time';
import { useGameEngine } from './hooks/useGameEngine';
import GameComponent from './components/GameComponent/GameComponent';
import GameOver from './components/GameOver/GameOver';
import AdminPanel from './components/AdminPanel/AdminPanel';
import RoleReveal from './components/RoleReveal/RoleReveal';
import CustomLobby from './components/CustomLobby/CustomLobby';
import StarryBackground from './utils/StarryBackground';
import './styles/global.scss';
import './styles/App.scss';

function App() {
    const { game: { isGameStarted, isGameSetup, isDay, status, phase, dayCount }, CONSTANTS } = useGameEngine();
    const isNight = phase === CONSTANTS.PHASE.NIGHT;
    const [isSelectingRoles, setIsSelectingRoles] = useState(false);
    const [showRoleReveal, setShowRoleReveal] = useState(true);
    const prevPhaseRef = useRef(null);

    const isGameOver = status === CONSTANTS.GAME_ENDED;
    const [sidebarOpen, setSidebarOpen] = useState(false);

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
            [CONSTANTS.PHASE.VOTING]: { text: 'Vote', icon: 'fa-gavel', className: 'banner-vote' },
            [CONSTANTS.PHASE.DEFENSE]: { text: 'Defense', icon: 'fa-shield', className: 'banner-defense' },
            [CONSTANTS.PHASE.JUDGMENT]: { text: 'Jugement', icon: 'fa-scale-balanced', className: 'banner-judgment' },
            [CONSTANTS.PHASE.EXECUTION]: { text: 'Execution', icon: 'fa-skull-crossbones', className: 'banner-execution' },
        };

        const banner = PHASE_BANNERS[phase];
        if (banner) {
            setPhaseBanner(banner);
            const timer = setTimeout(() => setPhaseBanner(null), 2000);
            return () => clearTimeout(timer);
        }
    }, [phase, isGameStarted]);

    // Lobby (but not if game just ended — we want to show the overlay)
    if (!isGameStarted && !isSelectingRoles && !isGameOver) {
        return (
            <div className="App">
                <CustomLobby setIsSelectingRoles={setIsSelectingRoles} />
            </div>
        );
    }

    // Role selection
    if (!isGameStarted && isSelectingRoles && !isGameOver) {
        return (
            <div className="App">
                <StarryBackground />
                <Setup />
            </div>
        );
    }

    // Main game - Grid layout
    return (
        <div className="App">
            {/* Game over overlay */}
            {isGameOver && <GameOver />}

            {/* Curtain — persists across role reveal → game transition */}
            {curtainVisible && (
                <div className={`curtain-overlay ${curtainClosed ? 'closed' : ''}`}>
                    <div className="curtain-panel curtain-left" />
                    <div className="curtain-panel curtain-right" />
                </div>
            )}

            {/* Role reveal (loader + card) — shown only after curtain is fully closed */}
            {isGameStarted && showRoleReveal && curtainReady && (
                <RoleReveal onComplete={handleRoleRevealComplete} />
            )}

            {/* Phase transition banner — hidden during role reveal */}
            {phaseBanner && !showRoleReveal && (
                <div className={`phase-banner ${phaseBanner.className}`}>
                    <i className={`fas ${phaseBanner.icon}`}></i>
                    <span>{phaseBanner.text}</span>
                </div>
            )}

            {/* Game UI — pre-mounts behind curtain during role reveal, stays after curtain opens */}
            {(curtainReady || !showRoleReveal) && <GameComponent>
                <div className="game-layout">
                    {/* Left - Menu + Roles + Graveyard */}
                    <div className="layout-players">
                        <Menu />
                        <Roles />
                        <Graveyard />
                    </div>
                    <AdminPanel />

                    {/* Center - 3D scene + progress bar + phase info */}
                    <div className="layout-center">
                        <TimeBar />
                        <div className="phase-overlay"><Time /></div>
                        <MainScene />
                        {/* Vote arrow indicator — floats over 3D scene pointing right to sidebar */}
                        {phase === CONSTANTS.PHASE.VOTING && (
                            <div className="vote-scene-arrow">
                                <i className="fas fa-arrow-right"></i>
                            </div>
                        )}
                    </div>

                    {/* Sidebar toggle (mobile/tablet) */}
                    <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        <i className={`fas ${sidebarOpen ? 'fa-times' : 'fa-user'}`}></i>
                    </button>
                    {sidebarOpen && <div className="sidebar-backdrop show" onClick={() => setSidebarOpen(false)} />}

                    {/* Right - Role info + player list */}
                    <div className={`layout-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
                        <Player />
                    </div>

                    {/* Bottom - Chat */}
                    <div className={`layout-chat ${phase === CONSTANTS.PHASE.DISCUSSION ? 'highlight-discussion' : ''}`}>
                        <Chat night={isNight} />
                    </div>
                </div>
            </GameComponent>}
        </div>
    );
}

export default App;
