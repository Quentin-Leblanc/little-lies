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
import { useSound } from './hooks/useSound';
import GameComponent from './components/GameComponent/GameComponent';
import GameOver from './components/GameOver/GameOver';
import RoleReveal from './components/RoleReveal/RoleReveal';
import CustomLobby from './components/CustomLobby/CustomLobby';
import StarryBackground from './utils/StarryBackground';
import './styles/global.scss';
import './styles/App.scss';

function App() {
    const { game: { isGameStarted, isGameSetup, isDay, status, phase, timer }, CONSTANTS } = useGameEngine();
    const { play } = useSound();
    const isNight = phase === CONSTANTS.PHASE.NIGHT;
    const [isSelectingRoles, setIsSelectingRoles] = useState(false);
    const [showRoleReveal, setShowRoleReveal] = useState(true);
    const prevPhaseRef = useRef(null);
    const prevStatusRef = useRef(null);

    // Sound triggers on phase changes
    useEffect(() => {
        if (!isGameStarted) return;
        const prev = prevPhaseRef.current;
        prevPhaseRef.current = phase;
        if (!prev || prev === phase) return;

        switch (phase) {
            case CONSTANTS.PHASE.NIGHT: play('nightFall'); break;
            case CONSTANTS.PHASE.DEATH_REPORT: play('morning'); break;
            case CONSTANTS.PHASE.DISCUSSION: play('discussion'); break;
            case CONSTANTS.PHASE.VOTING: play('voteOpen'); break;
            case CONSTANTS.PHASE.JUDGMENT: play('judgment'); break;
            case CONSTANTS.PHASE.EXECUTION: play('execution'); break;
            case CONSTANTS.PHASE.LAST_WORDS: play('guilty'); break;
            case CONSTANTS.PHASE.SPARED: play('innocent'); break;
            default: break;
        }
    }, [phase, isGameStarted]);

    // Sound on game over
    useEffect(() => {
        const prev = prevStatusRef.current;
        prevStatusRef.current = status;
        if (prev === status) return;
        if (status === CONSTANTS.GAME_ENDED) play('defeat');
    }, [status]);

    // Tick sound for last 5 seconds
    useEffect(() => {
        if (!isGameStarted) return;
        if (timer <= 5000 && timer > 0 && timer % 1000 === 0) {
            play('tick');
        }
    }, [timer, isGameStarted]);

    const isGameOver = status === CONSTANTS.GAME_ENDED;

    // Phase banner overlay
    const [phaseBanner, setPhaseBanner] = useState(null);
    useEffect(() => {
        if (!isGameStarted || !prevPhaseRef.current) return;
        if (prevPhaseRef.current === phase) return;

        const PHASE_BANNERS = {
            [CONSTANTS.PHASE.NIGHT]: { text: 'La nuit tombe...', icon: 'fa-moon', className: 'banner-night' },
            [CONSTANTS.PHASE.DEATH_REPORT]: { text: 'Aube', icon: 'fa-sun', className: 'banner-morning' },
            [CONSTANTS.PHASE.DISCUSSION]: { text: 'Discussion', icon: 'fa-comments', className: 'banner-day' },
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

                    {/* Center - 3D scene + progress bar overlay */}
                    <div className="layout-center">
                        <TimeBar />
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
