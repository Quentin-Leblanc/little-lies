import { useTranslation } from 'react-i18next';

// BalanceSummary — single-line verdict for the new compact Setup footer.
// Replaces the previous 4-bar BalancePanel which competed visually with
// the role list. The role-section headers already surface per-faction
// counts, so this widget only needs to communicate the verdict.
const Balance = ({ town, mafia, neutral, cult, total, isUnbalanced, missingThreat }) => {
  const { t } = useTranslation(['setup']);

  let verdictKey = 'balance.verdict_empty';
  let tone = '';
  if (total > 0) {
    if (missingThreat) {
      verdictKey = 'balance.verdict_no_threat';
      tone = 'is-danger';
    } else if (isUnbalanced) {
      verdictKey = 'balance.verdict_evil_leans';
      tone = 'is-warning';
    } else if (town > mafia + cult) {
      verdictKey = 'balance.verdict_town_leans';
      tone = 'is-ok';
    } else {
      verdictKey = 'balance.verdict_balanced';
      tone = 'is-ok';
    }
  }

  // Inline counts: "3 V · 2 M · 0 N · 0 C" — only non-zero factions are
  // surfaced so empty rosters don't read as four zeroes.
  const segments = [
    { key: 'town', n: town, letter: 'V' },
    { key: 'mafia', n: mafia, letter: 'M' },
    { key: 'neutral', n: neutral, letter: 'N' },
    { key: 'cult', n: cult, letter: 'C' },
  ].filter((s) => s.n > 0);

  return (
    <div className={`balance-summary ${tone}`}>
      <i className="fas fa-scale-balanced" aria-hidden="true"></i>
      {segments.length > 0 && (
        <span className="balance-summary__counts">
          {segments.map((s, i) => (
            <span key={s.key} className={`balance-summary__seg balance-summary__seg--${s.key}`}>
              {s.n}<span className="balance-summary__letter">{s.letter}</span>
              {i < segments.length - 1 && <span className="balance-summary__dot" aria-hidden="true">·</span>}
            </span>
          ))}
        </span>
      )}
      <span className="balance-summary__verdict">
        {t(`setup:${verdictKey}`)}
      </span>
    </div>
  );
};

export default Balance;
