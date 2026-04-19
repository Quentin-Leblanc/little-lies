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
