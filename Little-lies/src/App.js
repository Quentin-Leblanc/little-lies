import React, { useState } from 'react';
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
import RoleReveal from './components/RoleReveal/RoleReveal';
import CustomLobby from './components/CustomLobby/CustomLobby';
import StarryBackground from './utils/StarryBackground';
import './styles/global.scss';
import './styles/App.scss';

function App() {
    const { game: { isGameStarted, isGameSetup, isDay, status, phase }, CONSTANTS } = useGameEngine();
    const isNight = phase === CONSTANTS.PHASE.NIGHT;
    const [isSelectingRoles, setIsSelectingRoles] = useState(false);
    const [showRoleReveal, setShowRoleReveal] = useState(true);

    const isGameOver = status === CONSTANTS.GAME_ENDED;

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
            <GameComponent>
                <div className="game-layout">
                    {/* Header - Phase timer */}
                    <div className="layout-header">
                        <Time />
                    </div>

                    {/* Left - Menu + Roles + Graveyard */}
                    <div className="layout-players">
                        <Menu />
                        <Roles />
                        <Graveyard />
                    </div>

                    {/* Center - 3D scene */}
                    <div className="layout-center">
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
