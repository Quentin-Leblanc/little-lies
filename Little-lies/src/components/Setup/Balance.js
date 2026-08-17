import { useTranslation } from 'react-i18next';

// Balance — the verdict, and only the verdict.
//
// It used to also print "3V · 1M · 0N · 0C". Each faction header in the
// role picker now carries its own count, so those figures appeared
// twice on the same screen and the player had to work out which one to
// trust. The picker answers "how many of each"; this line answers the
// different question: "is that a game worth playing?".
const Balance = ({ town, mafia, cult, total, isUnbalanced, missingThreat }) => {
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

  return (
    <div className={`balance-summary ${tone}`}>
      <i className="fas fa-scale-balanced" aria-hidden="true"></i>
      <span className="balance-summary__verdict">
        {t(`setup:${verdictKey}`)}
      </span>
    </div>
  );
};

export default Balance;
