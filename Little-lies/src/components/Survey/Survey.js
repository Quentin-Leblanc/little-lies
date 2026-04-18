import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Auth/Auth';
import { submitSurvey } from '../../utils/supabase';
import './Survey.scss';

const SURVEY_STORAGE_KEY = 'amongliars_survey_responses';

const RATING_ICONS = [
  { value: 1, labelKey: 'survey_terrible', icon: 'fa-face-frown-open', color: '#ff4444' },
  { value: 2, labelKey: 'survey_meh', icon: 'fa-face-meh', color: '#ff8844' },
  { value: 3, labelKey: 'survey_ok', icon: 'fa-face-smile', color: '#ffa502' },
  { value: 4, labelKey: 'survey_good', icon: 'fa-face-grin', color: '#78ff78' },
  { value: 5, labelKey: 'survey_great', icon: 'fa-face-grin-stars', color: '#ffd700' },
];

// Extra Y/N questions — we ship the prompt + keys and let i18n pick the text.
const EXTRA_QUESTIONS = [
  { id: 'pace', labelKey: 'survey_q_pace' },
  { id: 'clarity', labelKey: 'survey_q_clarity' },
  { id: 'recommend', labelKey: 'survey_q_recommend' },
];

// Local cache so the dev can inspect offline — belt and braces alongside
// the Supabase insert in case the network was flaky.
const saveLocal = (response) => {
  try {
    const existing = JSON.parse(localStorage.getItem(SURVEY_STORAGE_KEY) || '[]');
    existing.push({ ...response, timestamp: Date.now() });
    localStorage.setItem(SURVEY_STORAGE_KEY, JSON.stringify(existing));
  } catch (e) {
    // storage blocked — fine, we already pushed to Supabase
  }
};

// Standalone modal — use <SurveyModal context={...} onClose={...} /> from
// anywhere (GameOver, menu, etc.). Renders nothing unless `open` is true.
const SurveyModal = ({ open, onClose, context }) => {
  const { t, i18n } = useTranslation(['menu', 'common']);
  const { user } = useAuth();
  const [rating, setRating] = useState(null);
  const [answers, setAnswers] = useState({}); // { pace: 'yes'|'no'|'meh' }
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    setError('');
    const payload = {
      userId: user?.id || null,
      rating,
      comment: comment.trim() || null,
      answers,
      context: { ...context, language: i18n.language || 'fr' },
    };
    const { error: err } = await submitSurvey(payload);
    setSubmitting(false);
    if (err) {
      // Keep a local copy even if Supabase failed so feedback isn't lost.
      saveLocal(payload);
      setError(err.message || t('menu:survey.submit_failed'));
      return;
    }
    saveLocal(payload);
    setSubmitted(true);
    setTimeout(() => onClose?.(), 1400);
  };

  return createPortal(
    <div className="survey-modal-overlay" onClick={onClose}>
      <div className="survey-modal" onClick={(e) => e.stopPropagation()}>
        <button className="survey-modal-close" onClick={onClose} aria-label={t('common:close')}>
          <i className="fas fa-times"></i>
        </button>

        {submitted ? (
          <div className="survey-modal-thanks">
            <i className="fas fa-heart" style={{ color: '#ff69b4' }}></i>
            <span>{t('menu:survey.thanks')}</span>
          </div>
        ) : (
          <>
            <h3 className="survey-modal-title">{t('menu:survey.title')}</h3>
            <p className="survey-modal-subtitle">{t('menu:survey.subtitle')}</p>

            <div className="survey-modal-block">
              <div className="survey-modal-label">{t('menu:survey.question')}</div>
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
            </div>

            {EXTRA_QUESTIONS.map((q) => (
              <div key={q.id} className="survey-modal-block">
                <div className="survey-modal-label">{t(`menu:survey.${q.labelKey}`)}</div>
                <div className="survey-yn">
                  {['yes', 'meh', 'no'].map((v) => (
                    <button
                      key={v}
                      className={`survey-yn-btn ${answers[q.id] === v ? 'selected' : ''}`}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: v }))}
                    >
                      {t(`menu:survey.answer_${v}`)}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="survey-modal-block">
              <div className="survey-modal-label">{t('menu:survey.comment_title')}</div>
              <textarea
                className="survey-comment-area"
                placeholder={t('menu:survey.comment_placeholder')}
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 500))}
                maxLength={500}
                rows={3}
              />
            </div>

            {error && <p className="survey-modal-error"><i className="fas fa-exclamation-circle"></i> {error}</p>}

            <div className="survey-modal-actions">
              <button className="survey-skip" onClick={onClose} disabled={submitting}>
                {t('menu:survey.skip')}
              </button>
              <button
                className="survey-submit"
                onClick={handleSubmit}
                disabled={!rating || submitting}
              >
                {submitting ? <i className="fas fa-spinner fa-spin"></i> : t('menu:survey.submit')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
};

export default SurveyModal;
