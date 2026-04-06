import React from 'react';
import { motion } from 'framer-motion';
import { useGameEngine } from '../../hooks/useGameEngine';
import { dayNightTransition } from '../../utils/animations';
import './GameComponent.scss'; // Assure-toi que le chemin est correct

const GameComponent = ({ children }) => {
    const { game } = useGameEngine();

    return (
        <motion.div
            {...dayNightTransition(game.isDay)}
            className="game-background"
        >
            <div className="game-content">
                {children} {/* C'est ici que les composants de App.js sont rendus */}
            </div>
        </motion.div>
    );
};

export default GameComponent;
