import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getGameCount } from '../../utils/GameMetrics';
import './Survey.scss';

const SURVEY_STORAGE_KEY = 'amongliars_survey_responses';
const SURVEY_FREQUENCY = 3; // Show every N games

const RATING_ICONS = [
  { value: 1, labelKey: 'survey_terrible', icon: 'fa-face-frown-open', color: '#ff4444' },
  { value: 2, labelKey: 'survey_meh', icon: 'fa-face-meh', color: '#ff8844' },
  { value: 3, labelKey: 'survey_ok', icon: 'fa-face-smile', color: '#ffa502' },
  { value: 4, labelKey: 'survey_good', icon: 'fa-face-grin', color: '#78ff78' },
  { value: 5, labelKey: 'survey_great', icon: 'fa-face-grin-stars', color: '#ffd700' },
];

const saveSurveyResponse = (response) => {
  try {
    const existing = JSON.parse(localStorage.getItem(SURVEY_STORAGE_KEY) || '[]');
    existing.push({ ...response, timestamp: Date.now() });
    localStorage.setItem(SURVEY_STORAGE_KEY, JSON.stringify(existing));
    if (process.env.NODE_ENV === 'development') {
      console.log('[Survey]', response);
    }
  } catch (e) {
    console.warn('[Survey] Failed to save:', e);
  }
};

const shouldShowSurvey = () => {
  const count = getGameCount();
  // Show on every Nth game (3rd, 6th, 9th...)
  return count > 0 && count % SURVEY_FREQUENCY === 0;
};

const Survey = () => {
  const { t } = useTranslation(['menu', 'common']);
  const [rating, setRating] = useState(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [show] = useState(() => shouldShowSurvey());

  if (!show || dismissed) return null;

  const handleSubmit = () => {
    if (rating) {
      saveSurveyResponse({ rating, comment: comment.trim() || null });
    }
    setSubmitted(true);
    setTimeout(() => setDismissed(true), 1500);
  };

  const handleSkip = () => {
    setDismissed(true);
  };

  if (submitted) {
    return (
      <div className="survey-container survey-thanks">
        <i className="fas fa-heart" style={{ color: '#ff69b4' }}></i> {t('menu:survey.thanks')}
      </div>
    );
  }

  return (
    <div className="survey-container">
      <div className="survey-header">
        <span className="survey-title">{t('menu:survey.question')}</span>
        <button className="survey-close" onClick={handleSkip}>
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="survey-ratings">
        {RATING_ICONS.map((r) => (
          <button
            key={r.value}
            className={`survey-rating-btn ${rating === r.value ? 'selected' : ''}`}
            onClick={() => setRating(r.value)}
            style={{ '--rating-color': r.color }}
            title={t(`common:${r.labelKey}`)}
          >
            <i className={`fas ${r.icon}`}></i>
          </button>
        ))}
      </div>

      <input
        type="text"
        className="survey-comment"
        placeholder={t('menu:survey.comment_placeholder')}
        value={comment}
        onChange={(e) => setComment(e.target.value.slice(0, 200))}
        maxLength={200}
      />

      <div className="survey-actions">
        <button className="survey-skip" onClick={handleSkip}>{t('menu:survey.skip')}</button>
        <button className="survey-submit" onClick={handleSubmit} disabled={!rating}>
          {t('menu:survey.submit')}
        </button>
      </div>
    </div>
  );
};

export default Survey;
