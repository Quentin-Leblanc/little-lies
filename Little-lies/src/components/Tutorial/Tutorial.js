import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import './Tutorial.scss';

// Lightweight "first-time player" walkthrough: 4 staged slides covering the
// factions, the night/day loop, how to win and where to dig deeper. Meant
// to be discoverable from the lobby so people who just landed in a room
// can get the gist in under a minute — the full role-by-role guide stays
// accessible via the in-game menu (which the last slide links out to).
const Tutorial = ({ onClose }) => {
  const { t } = useTranslation(['menu', 'common']);
  const [step, setStep] = useState(0);

  // Close on Escape. Not using useEscapeKey because this component is
  // imported from the lobby (Menu.js's hook lives in its own file).
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const steps = [
    {
      icon: 'fa-masks-theater',
      title: t('menu:tutorial.step1_title'),
      body: t('menu:tutorial.step1_body'),
    },
    {
      icon: 'fa-moon',
      title: t('menu:tutorial.step2_title'),
      body: t('menu:tutorial.step2_body'),
    },
    {
      icon: 'fa-gavel',
      title: t('menu:tutorial.step3_title'),
      body: t('menu:tutorial.step3_body'),
    },
    {
      icon: 'fa-trophy',
      title: t('menu:tutorial.step4_title'),
      body: t('menu:tutorial.step4_body'),
    },
  ];

  const isLast = step === steps.length - 1;
  const current = steps[step];

  return createPortal(
    <div className="tutorial-overlay" onClick={onClose}>
      <div className="tutorial-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="tutorial-header">
          <h2><i className="fas fa-graduation-cap" aria-hidden="true"></i> {t('menu:tutorial.title')}</h2>
          <button className="close-button" onClick={onClose} aria-label={t('common:close', { defaultValue: 'Close' })}>X</button>
        </div>

        <div className="tutorial-progress">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`tutorial-dot ${i === step ? 'tutorial-dot-active' : ''} ${i < step ? 'tutorial-dot-done' : ''}`}
              onClick={() => setStep(i)}
              aria-label={t('menu:tutorial.step_aria', { n: i + 1 })}
            />
          ))}
        </div>

        <div className="tutorial-body" key={step}>
          <div className="tutorial-icon"><i className={`fas ${current.icon}`} aria-hidden="true"></i></div>
          <h3>{current.title}</h3>
          <p>{current.body}</p>
        </div>

        <div className="tutorial-actions">
          {step > 0 && (
            <button className="tutorial-btn tutorial-btn-ghost" onClick={() => setStep(step - 1)}>
              <i className="fas fa-arrow-left" aria-hidden="true"></i> {t('menu:tutorial.prev')}
            </button>
          )}
          {!isLast ? (
            <button className="tutorial-btn tutorial-btn-primary" onClick={() => setStep(step + 1)}>
              {t('menu:tutorial.next')} <i className="fas fa-arrow-right" aria-hidden="true"></i>
            </button>
          ) : (
            <button className="tutorial-btn tutorial-btn-primary" onClick={onClose}>
              <i className="fas fa-check" aria-hidden="true"></i> {t('menu:tutorial.done')}
            </button>
          )}
        </div>

        <p className="tutorial-hint">{t('menu:tutorial.guide_hint')}</p>
      </div>
    </div>,
    document.body,
  );
};

export default Tutorial;
