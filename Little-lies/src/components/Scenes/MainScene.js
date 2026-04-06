import React, { useRef, useMemo, useState, useEffect, Suspense, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Sky, Stars, Text, Billboard, Html } from '@react-three/drei';
import { useMultiplayerState } from 'playroomkit';
import * as THREE from 'three';
import { useGameEngine } from '../../hooks/useGameEngine';
import './MainScene.scss';

// Ambient night messages
const NIGHT_AMBIANCE = [
  'Un bruit sourd résonne du côté de l\'église...',
  'La lune brille d\'un éclat inquiétant ce soir.',
  'Des pas furtifs se font entendre dans la ruelle...',
  'Une ombre se glisse entre les maisons.',
  'Le vent souffle et emporte des murmures lointains...',
  'Les preuves sont les seules traces qui restent d\'une mort...',
  'Quelqu\'un frappe à une porte... puis le silence.',
  'Un cri étouffé perce la nuit.',
  'Les torches vacillent dans l\'obscurité...',
  'Le village retient son souffle.',
  'Une lumière s\'éteint dans une maison au loin...',
  'Les étoiles semblent observer le village cette nuit.',
  'Un chat noir traverse la place du village...',
  'Le bois de la potence grince sous le vent...',
];

// ============================================================
// Ground
// ============================================================
const GroundPlane = ({ isDay }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
    <circleGeometry args={[25, 64]} />
    <meshStandardMaterial color={isDay ? '#3a6e2c' : '#1a2e1c'} />
  </mesh>
);

// ============================================================
// Village Building
// ============================================================
const Building = ({ position, size = [2, 2.5, 2], color, roofColor }) => (
  <group position={position}>
    <mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} />
    </mesh>
    <mesh position={[0, size[1] + 0.4, 0]} castShadow>
      <coneGeometry args={[size[0] * 0.85, 1.2, 4]} />
      <meshStandardMaterial color={roofColor} />
    </mesh>
    <mesh position={[0, 0.5, size[2] / 2 + 0.01]}>
      <planeGeometry args={[0.6, 1]} />
      <meshStandardMaterial color="#3d2b1f" />
    </mesh>
    <mesh position={[0.5, size[1] * 0.7, size[2] / 2 + 0.01]}>
      <planeGeometry args={[0.4, 0.4]} />
      <meshBasicMaterial color="#ffdd88" transparent opacity={0.6} />
    </mesh>
  </group>
);

// ============================================================
// Torch
// ============================================================
const Torch = ({ position }) => {
  const lightRef = useRef();
  useFrame((state) => {
    if (lightRef.current) {
      lightRef.current.intensity = 1.5 + Math.sin(state.clock.elapsedTime * 8) * 0.3;
    }
  });
  return (
    <group position={position}>
      <mesh position={[0, 0.8, 0]}>
        <cylinderGeometry args={[0.03, 0.05, 1.6, 6]} />
        <meshStandardMaterial color="#5a3a1a" />
      </mesh>
      <pointLight ref={lightRef} position={[0, 1.7, 0]} intensity={1.5} color="#ff8833" distance={8} />
      <mesh position={[0, 1.7, 0]}>
        <sphereGeometry args={[0.08, 6, 6]} />
        <meshBasicMaterial color="#ff6600" />
      </mesh>
    </group>
  );
};

// ============================================================
// Town Square
// ============================================================
const TownSquare = () => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <circleGeometry args={[6, 32]} />
      <meshStandardMaterial color="#6b6b6b" />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
      <ringGeometry args={[4.5, 5, 32]} />
      <meshStandardMaterial color="#555" />
    </mesh>
    <mesh position={[0, 0.3, 0]} castShadow>
      <cylinderGeometry args={[0.8, 1, 0.6, 16]} />
      <meshStandardMaterial color="#888" />
    </mesh>
    <mesh position={[0, 1.0, 0]} castShadow>
      <cylinderGeometry args={[0.15, 0.15, 1.0, 8]} />
      <meshStandardMaterial color="#999" />
    </mesh>
  </group>
);

// ============================================================
// Gallows
// ============================================================
const Gallows = ({ visible }) => {
  if (!visible) return null;
  return (
    <group position={[0, 0, -2]}>
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[2.5, 0.3, 2]} />
        <meshStandardMaterial color="#5a3a1a" />
      </mesh>
      <mesh position={[-0.8, 1.5, 0]} castShadow>
        <boxGeometry args={[0.15, 3, 0.15]} />
        <meshStandardMaterial color="#4a2a0a" />
      </mesh>
      <mesh position={[0, 2.9, 0]} castShadow>
        <boxGeometry args={[1.8, 0.12, 0.12]} />
        <meshStandardMaterial color="#4a2a0a" />
      </mesh>
    </group>
  );
};

// ============================================================
// Village Layout
// ============================================================
const BUILDINGS = [
  { pos: [-8, 0, -6], size: [2.5, 3, 2.5], color: '#b8a080', roof: '#8b4513' },
  { pos: [-10, 0, 2], size: [2, 2.5, 2], color: '#c8b898', roof: '#a0522d' },
  { pos: [-6, 0, 7], size: [2.2, 2.8, 2.2], color: '#d4c4a8', roof: '#6b3a1a' },
  { pos: [8, 0, -5], size: [3, 3.5, 2.5], color: '#a89070', roof: '#7a4422' },
  { pos: [9, 0, 3], size: [2, 2.2, 2], color: '#baa888', roof: '#8b5a2b' },
  { pos: [6, 0, 8], size: [2.5, 2.5, 2], color: '#c0a080', roof: '#6d3d1d' },
  { pos: [0, 0, -10], size: [3.5, 4, 3], color: '#a08060', roof: '#5c2e0e' },
  { pos: [-4, 0, -9], size: [2, 2.2, 2], color: '#bbb098', roof: '#8a4a2a' },
];
const TORCH_POS = [[-4,0,-4],[4,0,-4],[-4,0,4],[4,0,4],[0,0,-5.5],[-5.5,0,0],[5.5,0,0],[0,0,5.5]];

const Village = ({ isDay, isTrialPhase }) => (
  <group>
    <TownSquare />
    {BUILDINGS.map((b, i) => (
      <Building key={i} position={b.pos} size={b.size} color={b.color} roofColor={b.roof} />
    ))}
    {!isDay && TORCH_POS.map((pos, i) => <Torch key={i} position={pos} />)}
    <Gallows visible={isTrialPhase} />
  </group>
);

// ============================================================
// Player Figure (simple capsule with name)
// ============================================================
const PlayerFigure = ({ player, position, color, isAccused, showVote, isVoteTarget, onVote, showJudgment, onJudge }) => {
  const meshRef = useRef();

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.05;
    }
  });

  return (
    <group ref={meshRef} position={position}>
      <mesh position={[0, 0.5, 0]} castShadow>
        <capsuleGeometry args={[0.2, 0.6, 4, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0, 1.1, 0]} castShadow>
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial color="#ffe0bd" />
      </mesh>
      {isAccused && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.55, 16]} />
          <meshBasicMaterial color="#ff0000" transparent opacity={0.7} />
        </mesh>
      )}
      <Billboard position={[0, 1.6, 0]}>
        <Text fontSize={0.18} color="white" anchorX="center" anchorY="bottom" outlineWidth={0.02} outlineColor="black">
          {player.profile.name}
        </Text>
      </Billboard>
      {/* Vote button - on the character body */}
      {showVote && (
        <Html position={[0, 0.7, 0]} center>
          <button
            className={`vote-3d-btn ${isVoteTarget ? 'vote-3d-btn-active' : ''}`}
            onClick={() => onVote(player.id)}
          >Vote</button>
        </Html>
      )}
      {/* Judgment buttons (on accused player) */}
      {showJudgment && (
        <Html position={[0, 0.7, 0]} center>
          <div className="judgment-3d-btns">
            <button className="judge-btn judge-save" onClick={() => onJudge('innocent')}>Sauver</button>
            <button className="judge-btn judge-lynch" onClick={() => onJudge('guilty')}>Lyncher</button>
          </div>
        </Html>
      )}
    </group>
  );
};

// ============================================================
// Dead Player (lying down)
// ============================================================
const DeadPlayerFigure = ({ player, position }) => {
  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      <mesh position={[0, 0.15, 0]}>
        <capsuleGeometry args={[0.15, 0.5, 4, 8]} />
        <meshStandardMaterial color="#444" />
      </mesh>
    </group>
  );
};

// ============================================================
// Camera Controller (smooth follow based on phase)
// ============================================================
const CameraController = ({ phase, CONSTANTS }) => {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3(0, 8, 12));
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0));

  useFrame(() => {
    // Different camera angles per phase
    switch (phase) {
      case CONSTANTS.PHASE.NIGHT:
        targetPos.current.set(0, 12, 8);
        targetLookAt.current.set(0, 0, 0);
        break;
      case CONSTANTS.PHASE.DEFENSE:
      case CONSTANTS.PHASE.JUDGMENT:
      case CONSTANTS.PHASE.LAST_WORDS:
      case CONSTANTS.PHASE.EXECUTION:
        // Close-up on gallows area
        targetPos.current.set(3, 4, 5);
        targetLookAt.current.set(0, 1, 0);
        break;
      case CONSTANTS.PHASE.DISCUSSION:
      case CONSTANTS.PHASE.VOTING:
        // Overview of town square
        targetPos.current.set(0, 10, 10);
        targetLookAt.current.set(0, 0, 0);
        break;
      default:
        targetPos.current.set(0, 8, 12);
        targetLookAt.current.set(0, 0, 0);
    }

    // Smooth lerp
    camera.position.lerp(targetPos.current, 0.02);
    const currentLookAt = new THREE.Vector3();
    camera.getWorldDirection(currentLookAt);
    const desiredDir = targetLookAt.current.clone().sub(camera.position).normalize();
    currentLookAt.lerp(desiredDir, 0.02);
    camera.lookAt(
      camera.position.x + currentLookAt.x,
      camera.position.y + currentLookAt.y,
      camera.position.z + currentLookAt.z
    );
  });

  return null;
};

// ============================================================
// Scene Lighting (day/night)
// ============================================================
const SceneLighting = ({ isDay }) => {
  const lightRef = useRef();
  const ambientRef = useRef();

  useFrame(() => {
    if (lightRef.current) {
      const t = isDay ? 2.5 : 0.8;
      lightRef.current.intensity += (t - lightRef.current.intensity) * 0.03;
    }
    if (ambientRef.current) {
      const t = isDay ? 0.5 : 0.35;
      ambientRef.current.intensity += (t - ambientRef.current.intensity) * 0.03;
    }
  });

  return (
    <>
      <ambientLight ref={ambientRef} intensity={isDay ? 0.5 : 0.35} />
      <directionalLight
        ref={lightRef}
        position={isDay ? [10, 15, 10] : [-5, 12, 8]}
        intensity={isDay ? 2.5 : 0.8}
        color={isDay ? '#ffffff' : '#8899cc'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
    </>
  );
};

// ============================================================
// Main Scene Component
// ============================================================
const MainScene = () => {
  const { game, getPlayers, getMe, CONSTANTS, trial, setTrial } = useGameEngine();
  const [chatMessages] = useMultiplayerState('chatMessages', []);
  const players = getPlayers();
  const me = getMe();
  const phase = game.phase;
  const alivePlayers = players.filter((p) => p.isAlive);
  const deadPlayers = players.filter((p) => !p.isAlive);

  const isTrialPhase = [
    CONSTANTS.PHASE.DEFENSE, CONSTANTS.PHASE.JUDGMENT,
    CONSTANTS.PHASE.LAST_WORDS, CONSTANTS.PHASE.EXECUTION,
  ].includes(phase);

  const isVotingPhase = phase === CONSTANTS.PHASE.VOTING;
  const isJudgmentPhase = phase === CONSTANTS.PHASE.JUDGMENT;

  const myVoteTarget = trial.suspects && Object.keys(trial.suspects).find((sid) =>
    trial.suspects[sid]?.suspectedBy?.some((vid) => vid === me?.id)
  );
  const hasJudged = trial.votes?.[me?.id];

  const handleVote = useCallback((targetId) => {
    if (!me?.isAlive || !isVotingPhase) return;
    if (myVoteTarget === targetId) return;

    const voteWeight = me.voteWeight || 1;

    // Remove my votes from all targets first
    const newSuspects = {};
    Object.keys(trial.suspects || {}).forEach((sid) => {
      const filtered = (trial.suspects[sid]?.suspectedBy || []).filter((vid) => vid !== me.id);
      if (filtered.length > 0 || sid === targetId) {
        newSuspects[sid] = { id: sid, suspectedBy: filtered };
      }
    });

    // Add my votes to the new target
    if (!newSuspects[targetId]) {
      newSuspects[targetId] = { id: targetId, suspectedBy: [] };
    }
    for (let i = 0; i < voteWeight; i++) {
      newSuspects[targetId].suspectedBy.push(me.id);
    }

    setTrial({ ...trial, suspects: newSuspects });
  }, [me, isVotingPhase, myVoteTarget, trial, setTrial]);

  const handleJudge = useCallback((vote) => {
    if (!me?.isAlive || !isJudgmentPhase || hasJudged || me.id === game.accusedId) return;
    setTrial({ ...trial, votes: { ...trial.votes, [me.id]: vote } });
  }, [me, isJudgmentPhase, hasJudged, game.accusedId, trial, setTrial]);

  // Calculate player positions based on phase
  const playerPositions = useMemo(() => {
    const positions = {};
    const circleRadius = 4;

    if (phase === CONSTANTS.PHASE.NIGHT) {
      alivePlayers.forEach((p, i) => {
        const angle = (i / Math.max(alivePlayers.length, 1)) * Math.PI * 2;
        positions[p.id] = [Math.cos(angle) * 8, 0, Math.sin(angle) * 8];
      });
    } else if (isTrialPhase) {
      alivePlayers.forEach((p, i) => {
        if (p.id === game.accusedId) {
          positions[p.id] = [0, 0.3, -1.5];
        } else {
          const idx = i - (players.findIndex(pl => pl.id === game.accusedId) < i ? 1 : 0);
          const count = alivePlayers.length - 1;
          const angle = (idx / Math.max(count, 1)) * Math.PI - Math.PI / 2;
          positions[p.id] = [Math.cos(angle) * 4, 0, Math.sin(angle) * 4 + 2];
        }
      });
    } else {
      alivePlayers.forEach((p, i) => {
        const angle = (i / Math.max(alivePlayers.length, 1)) * Math.PI * 2 - Math.PI / 2;
        positions[p.id] = [Math.cos(angle) * circleRadius, 0, Math.sin(angle) * circleRadius];
      });
    }

    deadPlayers.forEach((p, i) => {
      positions[p.id] = [-10 + i * 1.2, 0, -10];
    });

    return positions;
  }, [phase, alivePlayers.length, deadPlayers.length, game.accusedId]);

  return (
    <div className="main-scene-3d">
      <Canvas
        shadows
        camera={{ position: [0, 8, 12], fov: 50 }}
        gl={{ antialias: true }}
      >
        <Suspense fallback={null}>
          {/* Camera */}
          <CameraController phase={phase} CONSTANTS={CONSTANTS} />

          {/* Lighting */}
          <SceneLighting isDay={game.isDay} />

          {/* Sky */}
          {game.isDay ? (
            <Sky sunPosition={[100, 60, 100]} turbidity={8} rayleigh={2} />
          ) : (
            <>
              <color attach="background" args={['#080820']} />
              <fog attach="fog" args={['#080820', 30, 60]} />
              <Stars radius={80} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
            </>
          )}

          <GroundPlane isDay={game.isDay} />
          <Village isDay={game.isDay} isTrialPhase={isTrialPhase} />

          {/* Alive Players */}
          {alivePlayers.map((player) => {
            const isMe = player.id === me?.id;
            const isAccused = player.id === game.accusedId;
            const showVoteBtn = isVotingPhase && me?.isAlive && !isMe;
            const isVoteTarget = myVoteTarget === player.id;
            const showJudgmentBtn = isJudgmentPhase && isAccused && me?.isAlive && me.id !== game.accusedId && !hasJudged;
            return (
              <PlayerFigure
                key={player.id}
                player={player}
                position={playerPositions[player.id] || [0, 0, 0]}
                color={player.character?.couleur || '#ffffff'}
                isAccused={isAccused}
                showVote={showVoteBtn}
                isVoteTarget={isVoteTarget}
                onVote={handleVote}
                showJudgment={showJudgmentBtn}
                onJudge={handleJudge}
              />
            );
          })}

          {/* Dead Players */}
          {deadPlayers.map((player) => (
            <DeadPlayerFigure
              key={player.id}
              player={player}
              position={playerPositions[player.id] || [0, 0, 0]}
            />
          ))}
        </Suspense>
      </Canvas>

      {/* Night ambiance messages */}
      {phase === CONSTANTS.PHASE.NIGHT && <NightAmbiance />}

      {/* Death report overlay */}
      {phase === CONSTANTS.PHASE.DEATH_REPORT && (() => {
        const dayMessages = (chatMessages || []).filter(
          m => m.type === 'system' && m.dayCount === game.dayCount && m.content !== `--- Jour ${game.dayCount} ---`
        );
        return dayMessages.length > 0 ? (
          <div className="scene-announcement">
            <div className="announcement-text announcement-report">
              {dayMessages.map((m, i) => (
                <div key={i}>{m.content}</div>
              ))}
            </div>
          </div>
        ) : null;
      })()}

      {/* Discussion start message */}
      {phase === CONSTANTS.PHASE.DISCUSSION && (
        <div className="scene-announcement scene-announcement-fade">
          <div className="announcement-text">La nuit tombe sur le village...</div>
        </div>
      )}

      {/* Phase announcements overlay */}
      {phase === CONSTANTS.PHASE.NO_LYNCH && (
        <div className="scene-announcement">
          <div className="announcement-text">Personne ne sera lynché aujourd'hui.</div>
        </div>
      )}
      {phase === CONSTANTS.PHASE.SPARED && (
        <div className="scene-announcement">
          <div className="announcement-text announcement-spared">
            {players.find(p => p.id === game.accusedId)?.profile.name || 'Le joueur'} a été épargné !
          </div>
        </div>
      )}
      {phase === CONSTANTS.PHASE.EXECUTION && (
        <div className="scene-announcement">
          <div className="announcement-text announcement-execution">
            {players.find(p => p.id === game.accusedId)?.profile.name || 'Le joueur'} a été exécuté !
          </div>
        </div>
      )}
    </div>
  );
};

// Night ambiance — random messages that cycle during night phase
const NightAmbiance = () => {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timeout;
    const showNext = () => {
      const msg = NIGHT_AMBIANCE[Math.floor(Math.random() * NIGHT_AMBIANCE.length)];
      setMessage(msg);
      setVisible(true);
      // Stay visible for 4s, then fade out
      timeout = setTimeout(() => {
        setVisible(false);
        // Wait 2s before next message
        timeout = setTimeout(showNext, 2000);
      }, 4000);
    };
    // Start after a short delay
    timeout = setTimeout(showNext, 1500);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className={`night-ambiance ${visible ? 'visible' : ''}`}>
      <div className="night-ambiance-text">{message}</div>
    </div>
  );
};

export default MainScene;
