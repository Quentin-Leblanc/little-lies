import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../Auth/Auth';
import { submitSurvey } from '../../utils/supabase';
import './Survey.scss';

const SURVEY_STORAGE_KEY = 'amongliars_survey_responses';
const SUBMIT_TIMEOUT_MS = 8000;

const RATING_ICONS = [
  { value: 1, labelKey: 'survey_terrible', icon: 'fa-face-frown-open', color: '#ff4444' },
  { value: 2, labelKey: 'survey_meh', icon: 'fa-face-meh', color: '#ff8844' },
  { value: 3, labelKey: 'survey_ok', icon: 'fa-face-smile', color: '#ffa502' },
  { value: 4, labelKey: 'survey_good', icon: 'fa-face-grin', color: '#78ff78' },
  { value: 5, labelKey: 'survey_great', icon: 'fa-face-grin-stars', color: '#ffd700' },
];

// Three open questions — kept short and inviting. Keys match menu.survey.*
// exactly (no prefix) so t('menu:survey.q_more_roles') resolves.
const EXTRA_QUESTIONS = [
  { id: 'more_roles', tKey: 'q_more_roles' },
  { id: 'more_interactions', tKey: 'q_more_interactions' },
  { id: 'interesting', tKey: 'q_interesting' },
];

// Local cache so feedback isn't lost if the Supabase insert fails (extension
// interference, RLS, network). Belt and braces alongside the remote insert.
const saveLocal = (response) => {
  try {
    const existing = JSON.parse(localStorage.getItem(SURVEY_STORAGE_KEY) || '[]');
    existing.push({ ...response, timestamp: Date.now() });
    localStorage.setItem(SURVEY_STORAGE_KEY, JSON.stringify(existing));
  } catch {
    // storage blocked — fine, we already tried remote
  }
};

// Wraps submitSurvey with a hard timeout so a hanging fetch (browser
// extension intercepting XHR, bad network) doesn't freeze the UI forever.
const submitWithTimeout = (payload) => Promise.race([
  submitSurvey(payload).catch((e) => ({ error: { message: e?.message || String(e) } })),
  new Promise((resolve) => setTimeout(
    () => resolve({ error: { message: 'Timeout — answer still saved locally.' } }),
    SUBMIT_TIMEOUT_MS,
  )),
]);

// Small CSS confetti burst — no runtime deps, just 40 randomly-colored
// divs animating with stagger. Positions/delays are memoized per mount.
const Confetti = () => {
  const pieces = useMemo(() => Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 1.6 + Math.random() * 1.4,
    drift: (Math.random() - 0.5) * 180,
    rotate: Math.random() * 360,
    color: ['#ff4da6', '#ffd700', '#6bb5ff', '#78ff78', '#a96edd', '#ff8844'][i % 6],
    size: 6 + Math.random() * 6,
  })), []);
  return (
    <div className="survey-confetti" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="survey-confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.size,
            height: p.size * 1.6,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--confetti-drift': `${p.drift}px`,
            '--confetti-rotate': `${p.rotate}deg`,
          }}
        />
      ))}
    </div>
  );
};

// Navigate back to a clean URL (no ?r=) so Playroom spawns a fresh lobby
// on reload — same behaviour as the GameOver "Nouveau salon" button.
const goToNewLobby = () => {
  try {
    sessionStorage.clear();
    localStorage.removeItem('playroom:lastRoom');
  } catch { /* storage blocked */ }
  const target = `${window.location.origin}${window.location.pathname}`;
  window.location.replace(target);
};

const SurveyModal = ({ open, onClose, context }) => {
  const { t, i18n } = useTranslation(['menu', 'common']);
  const { user } = useAuth();
  const [rating, setRating] = useState(null);
  const [answers, setAnswers] = useState({}); // { q_id: 'yes'|'meh'|'no' }
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    const payload = {
      userId: user?.id || null,
      rating,
      comment: comment.trim() || null,
      answers,
      context: { ...context, language: i18n.language || 'fr' },
    };
    let result;
    try {
      result = await submitWithTimeout(payload);
    } catch (e) {
      result = { error: { message: e?.message || 'Unknown error' } };
    }
    saveLocal(payload);
    setSubmitting(false);
    if (result?.error) {
      setError(result.error.message || t('menu:survey.submit_failed'));
      // Still show the thank-you screen on error — we kept a local copy and
      // the user shouldn't feel punished for network hiccups.
      setSubmitted(true);
      return;
    }
    setSubmitted(true);
  };

  return createPortal(
    <div className="survey-modal-overlay" onClick={submitted ? undefined : onClose}>
      <div className="survey-modal" onClick={(e) => e.stopPropagation()}>
        {!submitted && (
          <button className="survey-modal-close" onClick={onClose} aria-label={t('common:close')}>
            <i className="fas fa-times"></i>
          </button>
        )}

        {submitted ? (
          <div className="survey-thanks-screen">
            <Confetti />
            <div className="survey-thanks-heart">
              <i className="fas fa-heart"></i>
            </div>
            <h2 className="survey-thanks-title">{t('menu:survey.thanks_big')}</h2>
            <p className="survey-thanks-sub">{t('menu:survey.thanks_sub')}</p>
            {error && (
              <p className="survey-thanks-warning">
                <i className="fas fa-exclamation-circle"></i> {error}
              </p>
            )}
            <div className="survey-thanks-actions">
              <button className="survey-thanks-btn survey-thanks-btn-primary" onClick={goToNewLobby}>
                <i className="fas fa-plus"></i> {t('common:new_lobby')}
              </button>
              <button className="survey-thanks-btn survey-thanks-btn-secondary" onClick={goToNewLobby}>
                <i className="fas fa-door-open"></i> {t('menu:survey.quit')}
              </button>
            </div>
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
                    onClick={() => setRating(rating === r.value ? null : r.value)}
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
                <div className="survey-modal-label">{t(`menu:survey.${q.tKey}`)}</div>
                <div className="survey-yn">
                  {['yes', 'meh', 'no'].map((v) => (
                    <button
                      key={v}
                      className={`survey-yn-btn ${answers[q.id] === v ? 'selected' : ''}`}
                      onClick={() => setAnswers((a) => ({
                        ...a,
                        [q.id]: a[q.id] === v ? null : v, // toggle off on second click
                      }))}
                    >
                      {t(`menu:survey.answer_${v}`)}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="survey-modal-block">
              <div className="survey-modal-label">{t('menu:survey.ideas_title')}</div>
              <textarea
                className="survey-comment-area"
                placeholder={t('menu:survey.comment_placeholder')}
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, 500))}
                maxLength={500}
                rows={3}
              />
            </div>

            <div className="survey-modal-actions">
              <button className="survey-skip" onClick={onClose} disabled={submitting}>
                {t('menu:survey.skip')}
              </button>
              <button
                className="survey-submit"
                onClick={handleSubmit}
                disabled={submitting}
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
