import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayersList, getRoomCode } from 'playroomkit';
import {
    Graveyard,
    MainScene,
    Setup,
    Chat,
    Player,
    Roles,
} from './components';
import { useGameEngine } from './hooks/useGameEngine';
import GameComponent from './components/GameComponent/GameComponent';
import GameOver from './components/GameOver/GameOver';
import AdminPanel from './components/AdminPanel/AdminPanel';
import RoleReveal from './components/RoleReveal/RoleReveal';
import CustomLobby from './components/CustomLobby/CustomLobby';
import UnifiedScene from './components/Scenes/UnifiedScene';
import TopBar from './components/TopBar';
import LagIndicator from './components/LagIndicator/LagIndicator';
import AmbientEffects from './utils/AmbientEffects';
import i18n from './trad/i18n';
import './styles/global.scss';
import './styles/App.scss';

// Persisted across F5 (sessionStorage = lives within the tab). When the
// player has already cleared the RoleReveal card once, we skip it on
// subsequent reloads within the same session so they don't get the
// "La nuit tombe sur le village..." intro replayed every refresh. Wiped
// when the game resets to ROLE_SELECTION (new game starts) and when the
// tab closes.
const ROLE_REVEAL_SEEN_KEY = 'amongliars_role_reveal_seen';
const readRoleRevealSeen = () => {
    try { return sessionStorage.getItem(ROLE_REVEAL_SEEN_KEY) === 'true'; }
    catch { return false; }
};
const writeRoleRevealSeen = (seen) => {
    try {
        if (seen) sessionStorage.setItem(ROLE_REVEAL_SEEN_KEY, 'true');
        else sessionStorage.removeItem(ROLE_REVEAL_SEEN_KEY);
    } catch { /* storage blocked — accept degraded behavior */ }
};

function App() {
    const { game: { isGameStarted, status, phase }, CONSTANTS, getMe } = useGameEngine();
    const me = getMe();
    const isSpectator = !!me?.isSpectator;
    const isNight = phase === CONSTANTS.PHASE.NIGHT || phase === CONSTANTS.PHASE.NIGHT_TRANSITION;

    // TopBar data — room code (resolved async by PlayroomKit) + live
    // player count. Both surface in the TopBar centre slot during the
    // pre-game screens. Game-mode swaps in <Time /> instead.
    const players = usePlayersList(true);
    const [roomCode, setRoomCode] = useState('');
    useEffect(() => {
        const code = getRoomCode();
        if (code && typeof code.then === 'function') code.then((c) => setRoomCode(c || ''));
        else setRoomCode(code || '');
    }, []);
    // Lobby ↔ Setup switch is driven directly by the shared game.status
    // so the guest moves in lockstep with the host. Previously this was a
    // local useState synced via an effect on [status] — if PlayroomKit
    // coalesced the host's moveToRoleSelection() + startGame() replicas
    // into a single update (status 'setup' → 'started' straight), the
    // role_selection observation window never fired on the guest and the
    // useEffect condition `!isGameStarted` was also false, leaving the
    // guest stuck on CustomLobby with isSelectingRoles=false. Deriving
    // the switch instead removes the timing hole.
    const isSelectingRoles = status === CONSTANTS.GAME_ROLE_SELECTION;
    // showRoleReveal starts false if this tab already saw the reveal, so
    // F5 during a game drops the player straight into the match instead
    // of replaying the card + "la nuit tombe" intro.
    const [showRoleReveal, setShowRoleReveal] = useState(() => !readRoleRevealSeen());

    const isGameOver = status === CONSTANTS.GAME_ENDED;
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Rejouer / new-match reset: when status bounces back to ROLE_SELECTION
    // after a finished game, re-arm the role reveal and the curtain so the
    // next match plays its intro fresh. isSelectingRoles itself is derived
    // above, so nothing to set for the screen switch here.
    useEffect(() => {
        if (status === CONSTANTS.GAME_ROLE_SELECTION && !isGameStarted && !isGameOver) {
            setShowRoleReveal(true);
            writeRoleRevealSeen(false);
            setCurtainVisible(false);
            setCurtainClosed(false);
            setCurtainReady(false);
        }
    }, [status]);

    // ── Curtain managed at App level (persists across RoleReveal unmount) ──
    const [curtainVisible, setCurtainVisible] = useState(false);
    const [curtainClosed, setCurtainClosed] = useState(false);
    const [curtainReady, setCurtainReady] = useState(false); // true once curtain is fully closed
    // Brief "La nuit tombe sur le village…" beat played ON the closed
    // curtain between RoleReveal finishing and the curtain actually
    // opening. Without it the cut from role card → live scene was abrupt:
    // the reveal's own intro text appears too early (before the card) to
    // serve as the bridge, so we explicitly show it here as a hand-off.
    const [showNightFall, setShowNightFall] = useState(false);

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

    // RoleReveal is done → play the "la nuit tombe" beat on the closed
    // curtain, THEN open the curtain. Timeline (from reveal complete):
    //   0.00s : reveal overlay unmounts, curtain still closed
    //   0.15s : night-fall text fades in
    //   2.80s : text fades out
    //   3.10s : curtain slides open
    //   4.30s : curtain element removed, tutorial armed
    const handleRoleRevealComplete = () => {
        setShowRoleReveal(false);
        writeRoleRevealSeen(true); // remember across F5 in this tab
        // Show the transition text right after the reveal unmounts so
        // there's no black-screen dead time.
        setTimeout(() => setShowNightFall(true), 150);
        setTimeout(() => setShowNightFall(false), 2800);
        // Open curtain after the text has faded out.
        setTimeout(() => setCurtainClosed(false), 3100);
        // Remove curtain element after opening animation (1s) — total 4.3s
        setTimeout(() => {
            setCurtainVisible(false);
            setCurtainReady(false);
        }, 4300);
    };

    // Pre-game: Lobby ↔ Setup with fade transition.
    // Same status flip ('role_selection') drives the switch for all players,
    // so host and guests see the transition at the same moment.
    //
    // The 3D backdrop (campfire scene) is owned by a single persistent
    // <UnifiedScene /> mounted here — it survives the lobby→setup swap
    // and CameraRig lerps between the "lobby" (intimate) and "setup"
    // (pulled-back assembly) views as the screen changes. No more
    // StarryBackground — the UnifiedScene already carries stars + moon
    // + fire as part of the persistent atmosphere.
    if (!isGameStarted && !isGameOver) {
        const sceneView = isSelectingRoles ? 'setup' : 'lobby';
        const topBarMode = isSelectingRoles ? 'setup' : 'lobby';
        return (
            <div className="App has-topbar">
                <UnifiedScene view={sceneView} />
                <TopBar
                    mode={topBarMode}
                    roomCode={roomCode}
                    playersCount={players.length}
                />
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
                            <CustomLobby />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="setup"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.45, ease: 'easeOut' }}
                            style={{ width: '100%', height: '100%' }}
                        >
                            <Setup />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // Main game - Grid layout
    const inGameTopBarMode = isGameOver ? 'gameover' : 'game';
    const topBarHidden = isGameStarted && phase === CONSTANTS.PHASE.INTRO_CINEMATIC;
    return (
        <div className={`App has-topbar ${topBarHidden ? 'topbar-cinematic-hidden' : ''}`}>
            {/* The R3F village now lives inside <UnifiedScene view="game" />
                — same persistent Canvas the lobby+setup used, just routed
                to <VillageView /> instead of <LobbyView />. MainScene
                kept the HTML overlays (blood, death-report, lynch-reveal,
                scene-announcements, night-fade) but no longer mounts a
                Canvas of its own. */}
            <UnifiedScene view="game" />
            <TopBar
                mode={inGameTopBarMode}
                roomCode={roomCode}
                playersCount={players.length}
            />
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

            {/* "La nuit tombe sur le village…" — plays on top of the closed
                black curtain, between RoleReveal finishing and the curtain
                opening on the scene. Z-index above the curtain (2000). */}
            <AnimatePresence>
                {showNightFall && (
                    <motion.div
                        key="nightfall"
                        className="nightfall-beat"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.7, ease: 'easeInOut' }}
                    >
                        <p className="nightfall-text">{i18n.t('setup:reveal.intro_text')}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Role reveal (loader + card) — shown only after curtain is
                fully closed. Keeps rendering even after the game has
                ended, so a very short round (e.g. first-night sweep)
                still shows each player their role before cutting to
                GameOver. `isGameStarted` flips to false on endGame(),
                which is why we also accept isGameOver here. */}
            {(isGameStarted || isGameOver) && showRoleReveal && curtainReady && (
                <RoleReveal onComplete={handleRoleRevealComplete} />
            )}

            {/* Spectator banner */}
            {isSpectator && (
                <div className="spectator-banner">
                    <i className="fas fa-eye" aria-hidden="true"></i>
                    <span>{i18n.t('game:spectator_banner', { defaultValue: 'Spectator mode' })}</span>
                </div>
            )}

            {/* Game UI — pre-mounts behind curtain during role reveal, stays after curtain opens.
                During INTRO_CINEMATIC (6s village fly-over right after the curtain opens) every
                UI surface except the 3D scene + the spectator/phase banners is hidden so the
                camera shots read as a cinematic. The .intro-cinematic-hide class fades them out
                and back in when the phase flips to DISCUSSION. */}
            {(curtainReady || !showRoleReveal) && <GameComponent>
                {/* HTML overlays for phase transitions (blood vignette,
                    death report, lynch reveal, scene announcements,
                    night-fade). The 3D village itself is rendered by
                    <UnifiedScene /> above — MainScene no longer owns a
                    Canvas. */}
                <div className="layout-center">
                    <MainScene />
                </div>

                {(() => {
                    const hideUi = isGameStarted && phase === CONSTANTS.PHASE.INTRO_CINEMATIC;
                    const uiClass = hideUi ? 'intro-cinematic-hide' : 'intro-cinematic-reveal';
                    // Time HUD lives in the TopBar centre now; no more
                    // floating .hud-top element — the persistent bar is
                    // the single source of truth for "what phase / day /
                    // timer am I on" across every screen.
                    return (
                        <>
                            <div className={`game-layout ${uiClass}`}>
                                {/* Top-left — who's still in the village.
                                    The old Menu bar that sat above this
                                    block moved into the TopBar: it
                                    duplicated the title, help and sound
                                    the TopBar already carried. */}
                                <div className="layout-players">
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
                        </>
                    );
                })()}
                <AmbientEffects />
            </GameComponent>}
        </div>
    );
}

export default App;
