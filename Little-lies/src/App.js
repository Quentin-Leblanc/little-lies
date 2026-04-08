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

    // Phase banner overlay
    const [phaseBanner, setPhaseBanner] = useState(null);
    useEffect(() => {
        if (!isGameStarted) return;
        const prev = prevPhaseRef.current;
        prevPhaseRef.current = phase;
        if (!prev || prev === phase) return;

        const PHASE_BANNERS = {
            // Night banner removed — handled by fade overlay text
            // Day banner removed — handled by fade overlay text
            // Discussion banner removed
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
            {/* Role reveal animation on game start */}
            {isGameStarted && showRoleReveal && (
                <RoleReveal onComplete={() => setShowRoleReveal(false)} />
            )}
            {/* Phase transition banner */}
            {phaseBanner && (
                <div className={`phase-banner ${phaseBanner.className}`}>
                    <i className={`fas ${phaseBanner.icon}`}></i>
                    <span>{phaseBanner.text}</span>
                </div>
            )}
            <GameComponent>
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
                    </div>

                    {/* Right - Role info */}
                    <div className="layout-sidebar">
                        <Player />
                    </div>

                    {/* Bottom - Chat */}
                    <div className="layout-chat">
                        <Chat night={isNight} />
                    </div>
                </div>
            </GameComponent>
        </div>
    );
}

export default App;
