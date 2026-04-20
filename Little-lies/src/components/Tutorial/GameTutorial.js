import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './GameTutorial.scss';

// First-match tutorial — highlights the 3 live HUD zones directly on the
// real UI instead of showing a modal with a mock schematic. Works by:
//
//  1. Picking the current step's target DOM selector.
//  2. Reading its bounding rect.
//  3. Rendering a `.tutorial-spotlight` div at that rect; its outer
//     box-shadow paints everything else dark (cheap "cutout" effect that
//     doesn't require clip-path / pointer-events hacks).
//  4. Rendering a `.tutorial-tooltip` next to the spotlight with title +
//     description + Next/Skip.
//
// Keeps updating the rect on resize so the spotlight follows layout
// changes. Not a full MutationObserver — overkill for 3 fixed zones.

const STEPS = [
  {
    key: 'roster',
    selector: '.layout-players',
    tooltipSide: 'below',
  },
  {
    key: 'role',
    selector: '.layout-sidebar',
    tooltipSide: 'left',
  },
  {
    key: 'chat',
    selector: '.layout-chat',
    tooltipSide: 'above',
  },
];

const useBoundingRect = (selector, dep) => {
  const [rect, setRect] = useState(null);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      const el = document.querySelector(selector);
      if (!el) {
        setRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
    };

    // First measure on next frame so the layout has committed before we
    // read it (especially important right after the curtain animation
    // finishes and the tutorial mounts).
    frame = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [selector, dep]);

  return rect;
};

const GameTutorial = ({ onClose }) => {
  const { t } = useTranslation(['menu']);
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const rect = useBoundingRect(current.selector, step);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Padding around the real element so the spotlight has breathing room
  // and the glow doesn't cut flush against text.
  const PAD = 10;

  const spotlightStyle = useMemo(() => {
    if (!rect) return { display: 'none' };
    return {
      top: Math.max(rect.top - PAD, 0),
      left: Math.max(rect.left - PAD, 0),
      width: rect.width + PAD * 2,
      height: rect.height + PAD * 2,
    };
  }, [rect]);

  // Tooltip placement — rough "attach to the side of the spotlight".
  // Falls back to centered if the rect isn't measured yet.
  const tooltipStyle = useMemo(() => {
    if (!rect) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const MARGIN = 16;
    if (current.tooltipSide === 'left') {
      // Right-sidebar zone → tooltip on the left of the spotlight.
      return {
        top: Math.max(rect.top + rect.height / 2, 160),
        right: vw - rect.left + MARGIN,
        transform: 'translateY(-50%)',
      };
    }
    if (current.tooltipSide === 'above') {
      // Bottom-left chat zone → tooltip above the spotlight.
      return {
        bottom: vh - rect.top + MARGIN,
        left: Math.max(rect.left, MARGIN),
      };
    }
    // Top-left roster zone → tooltip below the spotlight.
    return {
      top: rect.top + rect.height + MARGIN,
      left: Math.max(rect.left, MARGIN),
    };
  }, [rect, current.tooltipSide]);

  const isLast = step === STEPS.length - 1;
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="tutorial-root">
      {/* Spotlight — transparent centre, massive outer box-shadow darkens
          the rest of the screen. Not clickable so the UI beneath stays
          visible but inert. */}
      <div className="tutorial-spotlight" style={spotlightStyle} />

      {/* Tooltip card — floats next to the highlighted zone. */}
      <div className={`tutorial-tooltip tooltip-${current.tooltipSide}`} style={tooltipStyle} role="dialog" aria-modal="true">
        <div className="tutorial-tooltip-header">
          <span className="tutorial-tooltip-label">
            <i className="fas fa-graduation-cap" aria-hidden="true"></i>{' '}
            {t('menu:game_tutorial.title')}
          </span>
          <button
            className="tutorial-tooltip-skip"
            onClick={onClose}
            aria-label={t('menu:game_tutorial.skip')}
          >
            {t('menu:game_tutorial.skip')}
            <i className="fas fa-forward" aria-hidden="true"></i>
          </button>
        </div>

        <div className="tutorial-tooltip-progress">
          <div className="tutorial-tooltip-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <h3 className="tutorial-tooltip-title">
          {t(`menu:game_tutorial.${current.key}_title`)}
        </h3>
        <p className="tutorial-tooltip-body">
          {t(`menu:game_tutorial.${current.key}_body`)}
        </p>

        <div className="tutorial-tooltip-actions">
          <span className="tutorial-tooltip-step">
            {step + 1} / {STEPS.length}
          </span>
          <div className="tutorial-tooltip-buttons">
            {step > 0 && (
              <button
                className="tutorial-tooltip-btn tutorial-tooltip-btn-ghost"
                onClick={() => setStep(step - 1)}
              >
                <i className="fas fa-arrow-left" aria-hidden="true"></i>{' '}
                {t('menu:game_tutorial.prev')}
              </button>
            )}
            {!isLast ? (
              <button
                className="tutorial-tooltip-btn tutorial-tooltip-btn-primary"
                onClick={() => setStep(step + 1)}
              >
                {t('menu:game_tutorial.next')}{' '}
                <i className="fas fa-arrow-right" aria-hidden="true"></i>
              </button>
            ) : (
              <button
                className="tutorial-tooltip-btn tutorial-tooltip-btn-primary"
                onClick={onClose}
              >
                <i className="fas fa-check" aria-hidden="true"></i>{' '}
                {t('menu:game_tutorial.done')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameTutorial;
