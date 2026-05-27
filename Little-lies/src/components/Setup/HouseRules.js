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

// Compact chip row — each rule renders as a single tap-toggleable chip
// with its label and an on/off dot. Replaces the previous full-row
// switches that took the same vertical space as the role list.
const HouseRules = ({ rules, onChange, disabled }) => {
  const { t } = useTranslation(['setup']);
  const current = resolveRules(rules);

  const toggle = (key) => {
    if (disabled) return;
    onChange({ ...current, [key]: !current[key] });
  };

  return (
    <div className="rules-chips" role="group" aria-label={t('setup:rules.title')}>
      {RULE_KEYS.map((key) => {
        const on = !!current[key];
        return (
          <button
            key={key}
            type="button"
            className={`rule-chip ${on ? 'is-on' : 'is-off'}`}
            onClick={() => toggle(key)}
            disabled={disabled}
            role="switch"
            aria-checked={on}
            title={t(`setup:rules.${key}.hint`)}
          >
            <span className={`rule-chip__dot ${on ? 'is-on' : ''}`} aria-hidden="true" />
            <span className="rule-chip__label">{t(`setup:rules.${key}.label`)}</span>
          </button>
        );
      })}
    </div>
  );
};

export default HouseRules;
