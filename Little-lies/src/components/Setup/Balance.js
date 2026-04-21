import { useTranslation } from 'react-i18next';

const FACTIONS = [
  { key: 'town', color: 'var(--al-town)' },
  { key: 'mafia', color: 'var(--al-mafia)' },
  { key: 'neutral', color: 'var(--al-neutral)' },
  { key: 'cult', color: 'var(--al-cult)' },
];

const Balance = ({ town, mafia, neutral, cult, total, isUnbalanced, missingThreat }) => {
  const { t } = useTranslation(['setup']);
  const counts = { town, mafia, neutral, cult };

  const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0);

  let verdictKey = 'balance.verdict_empty';
  if (total > 0) {
    if (missingThreat) verdictKey = 'balance.verdict_no_threat';
    else if (isUnbalanced) verdictKey = 'balance.verdict_evil_leans';
    else if (town > mafia + cult) verdictKey = 'balance.verdict_town_leans';
    else verdictKey = 'balance.verdict_balanced';
  }

  return (
    <section className="setup-panel balance-panel">
      <header className="panel-title">
        <i className="fas fa-scale-balanced"></i>
        <span>{t('setup:balance.title')}</span>
      </header>

      <ul className="balance-rows">
        {FACTIONS.map((f) => (
          <li key={f.key} className={`balance-row balance-row--${f.key}`}>
            <span className="balance-row__label">{t(`setup:balance.${f.key}`)}</span>
            <span className="balance-row__track">
              <span
                className="balance-row__fill"
                style={{ width: `${pct(counts[f.key])}%` }}
              />
            </span>
            <span className="balance-row__pct">{pct(counts[f.key])}%</span>
          </li>
        ))}
      </ul>

      <p className={`balance-verdict ${missingThreat ? 'is-danger' : isUnbalanced ? 'is-warning' : ''}`}>
        {t(`setup:${verdictKey}`)}
      </p>
    </section>
  );
};

export default Balance;
