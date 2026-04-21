import { useTranslation } from 'react-i18next';

// Default values for each house rule. Undefined entries in game.config.rules
// fall back to these — so legacy games (without config.rules) keep running
// with the classic ruleset: full trial, last wills on, roles revealed on
// death, votes are public.
export const DEFAULT_RULES = {
  trialDefense: true,
  lastWills: true,
  revealOnDeath: true,
  anonymousVotes: false,
};

const RULE_KEYS = ['trialDefense', 'lastWills', 'revealOnDeath', 'anonymousVotes'];

export const resolveRules = (rules) => ({ ...DEFAULT_RULES, ...(rules || {}) });

const HouseRules = ({ rules, onChange, disabled }) => {
  const { t } = useTranslation(['setup']);
  const current = resolveRules(rules);

  const toggle = (key) => {
    if (disabled) return;
    onChange({ ...current, [key]: !current[key] });
  };

  return (
    <section className="setup-panel rules-panel">
      <header className="panel-title">
        <i className="fas fa-scroll"></i>
        <span>{t('setup:rules.title')}</span>
      </header>

      <ul className="rules-list">
        {RULE_KEYS.map((key) => {
          const on = !!current[key];
          return (
            <li key={key} className={`rule-row ${on ? 'is-on' : 'is-off'}`}>
              <div className="rule-row__text">
                <span className="rule-row__label">{t(`setup:rules.${key}.label`)}</span>
                <span className="rule-row__hint">{t(`setup:rules.${key}.hint`)}</span>
              </div>
              <button
                type="button"
                className={`rule-toggle ${on ? 'is-on' : ''}`}
                onClick={() => toggle(key)}
                disabled={disabled}
                role="switch"
                aria-checked={on}
                aria-label={t(`setup:rules.${key}.label`)}
              >
                <span className="rule-toggle__dot" />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default HouseRules;
