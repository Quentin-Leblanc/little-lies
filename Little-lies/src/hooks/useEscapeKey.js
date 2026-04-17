import { useEffect } from 'react';

/**
 * Call `onEscape` when the user presses Escape. No-op when `onEscape` is falsy.
 */
export default function useEscapeKey(onEscape) {
  useEffect(() => {
    if (!onEscape) return;
    const handler = (e) => {
      if (e.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onEscape]);
}
