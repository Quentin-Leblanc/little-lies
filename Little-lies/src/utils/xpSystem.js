/**
 * XP System — calcul des gains, niveaux, couleurs de degradee
 */

// XP par action
const XP_REWARDS = {
  PARTICIPATION: 10,
  TEAM_WIN: 25,
  NEUTRAL_WIN: 15,
  PER_DAY_SURVIVED: 3,
  FIRST_BLOOD: 5,
};

// Level = floor(totalXP / 100) + 1
export const getLevel = (xp) => Math.floor((xp || 0) / 100) + 1;
export const getXPForLevel = (level) => (level - 1) * 100;
export const getXPProgress = (xp) => (xp || 0) % 100;
export const getXPToNextLevel = (xp) => 100 - getXPProgress(xp);

/**
 * Calculate XP earned for a game
 */
export const calculateGameXP = ({ isWinner, isNeutralWinner, daysSurvived, isAlive }) => {
  const gains = [];

  // Participation
  gains.push({ amount: XP_REWARDS.PARTICIPATION, reason: 'Participation' });

  // Win bonus
  if (isWinner) {
    gains.push({ amount: XP_REWARDS.TEAM_WIN, reason: 'Victoire' });
  } else if (isNeutralWinner) {
    gains.push({ amount: XP_REWARDS.NEUTRAL_WIN, reason: 'Victoire neutre' });
  }

  // Days survived
  if (daysSurvived > 1) {
    const survivalXP = (daysSurvived - 1) * XP_REWARDS.PER_DAY_SURVIVED;
    gains.push({ amount: survivalXP, reason: `${daysSurvived - 1}j surv\u00e9cu` });
  }

  const total = gains.reduce((sum, g) => sum + g.amount, 0);
  return { gains, total };
};

/**
 * Level color gradients — visual reward for higher levels
 */
const LEVEL_GRADIENTS = {
  // 1-5: solid color (no gradient)
  1: null,
  // 6-10: 2-color linear gradient
  6: 'linear-gradient(90deg, #3498db, #2ecc71)',
  7: 'linear-gradient(90deg, #e74c3c, #f39c12)',
  8: 'linear-gradient(90deg, #9b59b6, #3498db)',
  9: 'linear-gradient(90deg, #1abc9c, #f39c12)',
  10: 'linear-gradient(90deg, #e91e63, #9b59b6)',
  // 11-20: animated gradient
  11: 'linear-gradient(90deg, #ff6b6b, #ffd93d, #6bcb77)',
  15: 'linear-gradient(90deg, #a855f7, #ec4899, #f97316)',
  // 21+: gold prismatic
  21: 'linear-gradient(90deg, #ffd700, #ffaa00, #fff, #ffd700)',
};

const getGradientForLevel = (level) => {
  if (level >= 21) return LEVEL_GRADIENTS[21];
  if (level >= 15) return LEVEL_GRADIENTS[15];
  if (level >= 11) return LEVEL_GRADIENTS[11];
  if (level >= 6) return LEVEL_GRADIENTS[Math.min(level, 10)];
  return null;
};

/**
 * Get CSS style for a player name based on their level
 * @param {number} level - Player level
 * @param {string} fallbackColor - Default color if no gradient
 * @returns {object} CSS style object
 */
export const getPlayerNameStyle = (level, fallbackColor = '#ccc') => {
  const gradient = getGradientForLevel(level || 1);

  if (!gradient) {
    return { color: fallbackColor };
  }

  const style = {
    background: gradient,
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  };

  // Animated for level 11+
  if (level >= 11) {
    style.backgroundSize = '200% 100%';
    style.animation = 'gradient-shift 3s ease infinite';
  }

  // Shimmer for level 21+
  if (level >= 21) {
    style.backgroundSize = '300% 100%';
    style.animation = 'gradient-shimmer 2s ease infinite';
  }

  return style;
};

/**
 * Get level tier name
 */
export const getLevelTier = (level) => {
  if (level >= 21) return { name: 'L\u00e9gende', color: '#ffd700', icon: 'fa-gem' };
  if (level >= 11) return { name: 'V\u00e9t\u00e9ran', color: '#a855f7', icon: 'fa-star' };
  if (level >= 6) return { name: 'Confirm\u00e9', color: '#3498db', icon: 'fa-shield' };
  return { name: 'D\u00e9butant', color: '#888', icon: 'fa-seedling' };
};

export { XP_REWARDS };
