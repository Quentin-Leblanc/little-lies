import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import './LagIndicator.scss';

const LagIndicator = () => {
  const { t } = useTranslation('game');
  const [lagging, setLagging] = useState(false);
  const framesRef = useRef([]);

  useEffect(() => {
    let raf;
    let lastTime = performance.now();

    const tick = () => {
      const now = performance.now();
      const delta = now - lastTime;
      lastTime = now;

      framesRef.current.push(delta);
      if (framesRef.current.length > 30) framesRef.current.shift();

      // Average FPS over last 30 frames
      const avg = framesRef.current.reduce((a, b) => a + b, 0) / framesRef.current.length;
      const fps = 1000 / avg;

      setLagging(fps < 20);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!lagging) return null;

  return (
    <div className="lag-indicator" title={t('lag_indicator', { defaultValue: 'Unstable connection / low FPS' })}
         role="status" aria-live="polite">
      <i className="fas fa-exclamation-triangle" aria-hidden="true"></i>
    </div>
  );
};

export default LagIndicator;
