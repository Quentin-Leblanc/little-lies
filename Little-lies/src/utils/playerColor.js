// Player "profile.color" can be either a solid hex string or a gradient
// object ({ type: 'gradient', color1, color2 }) when the player picked a
// SPECIAL palette in the lobby. React style props need CSS strings —
// passing the raw object yields invalid CSS and the UI fell back to white
// everywhere (chat highlight, player-list names, GameOver recap, etc.).
//
//   toTextCss  → a CSS color value safe to use in `color:` props.
//                Gradients collapse to their first colour (CSS can't paint
//                text with an arbitrary gradient in one shot).
//   toBgCss    → a CSS background value. For gradients this is the full
//                linear-gradient string — MUST be used on `background`,
//                not `backgroundColor` (gradients require `background`).
//
// Kept centralised so any component that surfaces player identity picks
// up the same handling and one bug-fix covers the whole UI.

export const toTextCss = (color, fallback = '#ccc') => {
  if (!color) return fallback;
  if (typeof color === 'object' && color?.type === 'gradient') {
    return color.color1 || fallback;
  }
  return color;
};

export const toBgCss = (color) => {
  if (!color) return null;
  if (typeof color === 'object' && color?.type === 'gradient') {
    return `linear-gradient(135deg, ${color.color1}, ${color.color2})`;
  }
  return color;
};

// Unified nameplate style for the 3D billboard labels (in-game figure +
// lobby seat) and for the in-game player list / action bar. Anchored on
// the lobby's existing look so the player's color identity stays consistent
// across all surfaces:
//   - solid color    → BLACK background, text painted in the player color,
//                      colored border
//   - gradient color → BLACK background, text painted with the gradient
//                      (background-clip: text) + a thin stroke for legibility,
//                      border uses color1 as a gradient-evocative hint
// Use `pillStyle` on the outer pill <div> and spread `textStyle` on the
// inner <span> wrapping the name text.
export const buildPlayerNamePillStyle = (rawColor, fallback = '#888') => {
  const isGradient = typeof rawColor === 'object' && rawColor?.type === 'gradient';
  if (isGradient) {
    const gradient = `linear-gradient(135deg, ${rawColor.color1}, ${rawColor.color2})`;
    return {
      isGradient: true,
      pillStyle: {
        background: 'rgba(0, 0, 0, 0.78)',
        border: `2px solid ${rawColor.color1}`,
      },
      textStyle: {
        background: gradient,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        WebkitTextStroke: '0.5px rgba(0,0,0,0.55)',
        filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
      },
    };
  }
  const solid = rawColor || fallback;
  return {
    isGradient: false,
    pillStyle: {
      background: 'rgba(0, 0, 0, 0.78)',
      border: `2px solid ${solid}`,
    },
    textStyle: {
      color: solid,
      textShadow: '0 1px 4px rgba(0,0,0,0.85)',
    },
  };
};
