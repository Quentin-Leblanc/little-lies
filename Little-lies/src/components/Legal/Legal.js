import React from 'react';
import { useTranslation } from 'react-i18next';
import './Legal.scss';

const Legal = ({ onClose }) => {
  const { t } = useTranslation('legal');

  return (
    <div className="legal-overlay" onClick={onClose}>
      <div className="legal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="legal-header">
          <h2>{t('title')}</h2>
          <button className="close-button" onClick={onClose}>X</button>
        </div>
        <div className="legal-content">

          <section>
            <h3><i className="fas fa-copyright"></i> {t('copyright.title')}</h3>
            <p>{t('copyright.text')}</p>
            <p>{t('copyright.rights')}</p>
          </section>

          <section>
            <h3><i className="fas fa-shield-halved"></i> {t('privacy.title')}</h3>
            <p>{t('privacy.intro')}</p>
            <ul>
              <li><strong>Pseudo</strong> &mdash; {t('privacy.data_username')}</li>
              <li><strong>Statistiques</strong> &mdash; {t('privacy.data_stats')}</li>
              <li><strong>Cookies</strong> &mdash; {t('privacy.data_cookies')}</li>
            </ul>
            <p>{t('privacy.no_sale')}</p>
          </section>

          <section>
            <h3><i className="fas fa-gavel"></i> {t('terms.title')}</h3>
            <ul>
              <li>{t('terms.free')}</li>
              <li>{t('terms.behavior')}</li>
              <li>{t('terms.fiction')}</li>
            </ul>
          </section>

          <section>
            <h3><i className="fas fa-code"></i> {t('credits.title')}</h3>
            <div className="legal-credits">
              <div className="credit-item">
                <strong>React</strong> <span>{t('credits.react')}</span>
              </div>
              <div className="credit-item">
                <strong>Three.js / React Three Fiber</strong> <span>{t('credits.threejs')}</span>
              </div>
              <div className="credit-item">
                <strong>PlayroomKit</strong> <span>{t('credits.playroom')}</span>
              </div>
              <div className="credit-item">
                <strong>Supabase</strong> <span>{t('credits.supabase')}</span>
              </div>
              <div className="credit-item">
                <strong>Framer Motion</strong> <span>{t('credits.framer')}</span>
              </div>
              <div className="credit-item">
                <strong>Font Awesome</strong> <span>{t('credits.fontawesome')}</span>
              </div>
              <div className="credit-item">
                <strong>Google Fonts</strong> <span>{t('credits.fonts')}</span>
              </div>
            </div>
          </section>

          <section>
            <h3><i className="fas fa-info-circle"></i> {t('disclaimer.title')}</h3>
            <p>{t('disclaimer.text')}</p>
          </section>

          <p className="legal-version">{t('version')}</p>
        </div>
      </div>
    </div>
  );
};

export default Legal;
