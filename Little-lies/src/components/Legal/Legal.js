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
            <p className="legal-credits-text">{t('credits.intro')}</p>
          </section>

          <section>
            <h3><i className="fas fa-images"></i> {t('assets.title')}</h3>
            <p className="legal-assets-intro">{t('assets.intro')}</p>
            <div className="legal-credits">
              <div className="credit-item legal-asset">
                <div>
                  <strong>Medieval Ambient — DeusLower</strong>
                  <span className="legal-asset-role">{t('assets.music')}</span>
                </div>
                <a href="https://pixabay.com/music/ambient-deuslower-medieval-ambient-236809/" target="_blank" rel="noopener noreferrer" className="legal-asset-link">
                  Pixabay <i className="fas fa-external-link-alt"></i>
                </a>
              </div>
              <div className="credit-item legal-asset">
                <div>
                  <strong>Meshy AI</strong>
                  <span className="legal-asset-role">{t('assets.meshy')}</span>
                </div>
                <a href="https://www.meshy.ai/" target="_blank" rel="noopener noreferrer" className="legal-asset-link">
                  meshy.ai <i className="fas fa-external-link-alt"></i>
                </a>
              </div>
              <div className="credit-item legal-asset">
                <div>
                  <strong>KayKit — Kay Lousberg</strong>
                  <span className="legal-asset-role">{t('assets.kaykit')}</span>
                </div>
                <a href="https://kaylousberg.itch.io/" target="_blank" rel="noopener noreferrer" className="legal-asset-link">
                  kaylousberg.itch.io <i className="fas fa-external-link-alt"></i>
                </a>
              </div>
              <div className="credit-item legal-asset">
                <div>
                  <strong>Kenney</strong>
                  <span className="legal-asset-role">{t('assets.kenney')}</span>
                </div>
                <a href="https://kenney.nl/assets" target="_blank" rel="noopener noreferrer" className="legal-asset-link">
                  kenney.nl <i className="fas fa-external-link-alt"></i>
                </a>
              </div>
              <div className="credit-item legal-asset">
                <div>
                  <strong>Pixabay</strong>
                  <span className="legal-asset-role">{t('assets.textures')}</span>
                </div>
                <a href="https://pixabay.com/" target="_blank" rel="noopener noreferrer" className="legal-asset-link">
                  pixabay.com <i className="fas fa-external-link-alt"></i>
                </a>
              </div>
            </div>
            <p className="legal-asset-license">{t('assets.license')}</p>
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
