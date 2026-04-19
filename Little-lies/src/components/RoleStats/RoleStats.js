import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { computeSummary, clearStats } from '../../utils/roleStats';
import { getRoles } from '../../data/roles';
import './RoleStats.scss';

// Personal per-role stats dialog, fed by localStorage (roleStats util).
// Shown from a lobby button — gives a new player something to grow into
// (see their win-rate per role they've tried). No backend dependency: if
// the user wipes their profile the stats reset, that's fine.
const RoleStats = ({ onClose }) => {
  const { t, i18n: i18nInst } = useTranslation(['menu', 'roles', 'common']);
  const [, tick] = useState(0);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Pull role mechanical data once so we can decorate each stat line with
  // the role's color, icon and translated label without re-resolving in
  // the render loop.
  const rolesByKey = useMemo(() => {
    const map = {};
    for (const r of getRoles()) map[r.key] = r;
    return map;
  }, [i18nInst.language]);

  const summary = useMemo(() => computeSummary(), [i18nInst.language]);
  const hasData = summary.entries.length > 0;

  const handleClear = () => {
    clearStats();
    tick((n) => n + 1);
  };

  const overallPct = Math.round(summary.overallWinRate * 100);

  return createPortal(
    <div className="role-stats-overlay" onClick={onClose}>
      <div className="role-stats-dialog" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="role-stats-header">
          <h2><i className="fas fa-chart-line" aria-hidden="true"></i> {t('menu:role_stats.title')}</h2>
          <button className="close-button" onClick={onClose} aria-label={t('common:close', { defaultValue: 'Close' })}>X</button>
        </div>

        <div className="role-stats-totals">
          <div className="role-stats-total-cell">
            <span className="role-stats-num">{summary.totals.played}</span>
            <span className="role-stats-label">{t('menu:role_stats.games')}</span>
          </div>
          <div className="role-stats-total-cell">
            <span className="role-stats-num">{summary.totals.won}</span>
            <span className="role-stats-label">{t('menu:role_stats.wins')}</span>
          </div>
          <div className="role-stats-total-cell">
            <span className="role-stats-num">{overallPct}%</span>
            <span className="role-stats-label">{t('menu:role_stats.win_rate')}</span>
          </div>
        </div>

        <div className="role-stats-body">
          {hasData ? (
            <ul className="role-stats-list">
              {summary.entries.map((entry) => {
                const role = rolesByKey[entry.key];
                const color = role?.couleur || '#aaa';
                const label = role?.label || entry.key;
                const pct = Math.round(entry.winRate * 100);
                return (
                  <li key={entry.key} className="role-stats-row" style={{ '--accent': color }}>
                    <span className="role-stats-role">
                      {role?.icon && <i className={`fas ${role.icon}`} style={{ color }} aria-hidden="true"></i>}
                      <strong style={{ color }}>{label}</strong>
                    </span>
                    <span className="role-stats-numbers">
                      <span className="role-stats-count">{entry.won}/{entry.played}</span>
                      <span className="role-stats-pct">{pct}%</span>
                    </span>
                    <span className="role-stats-bar">
                      <span className="role-stats-bar-fill" style={{ width: `${pct}%`, background: color }} />
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="role-stats-empty">{t('menu:role_stats.empty')}</p>
          )}
        </div>

        <div className="role-stats-actions">
          {hasData && (
            <button className="role-stats-clear" onClick={handleClear}>
              <i className="fas fa-trash" aria-hidden="true"></i> {t('menu:role_stats.clear')}
            </button>
          )}
          <p className="role-stats-hint">{t('menu:role_stats.hint')}</p>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default RoleStats;
