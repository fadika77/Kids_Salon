import React, { useEffect, useState } from 'react';
import { adminApi } from '../api/admin';
import Loading from '../components/Loading';
import { Message } from '../components/Message';
import { useLang } from '../i18n/LanguageContext';

/** Simple CSS bar chart — no external chart library needed. */
function BarChart({ buckets, color = 'var(--grad-blue)' }) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {buckets.map((b) => (
        <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            minWidth: 46, fontSize: 12, fontWeight: 800,
            color: 'var(--color-text-muted)', textAlign: 'end',
          }}>
            {b.label}
          </span>
          <div style={{ flex: 1, background: 'var(--color-gray-100)', borderRadius: 8, height: 22, overflow: 'hidden' }}>
            <div style={{
              width: `${(b.count / max) * 100}%`,
              minWidth: b.count > 0 ? 24 : 0,
              height: '100%',
              background: color,
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
              paddingInlineEnd: 6,
              transition: 'width 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
            }}>
              {b.count > 0 && (
                <span style={{ fontSize: 11, fontWeight: 900, color: '#fff' }}>{b.count}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminStatsPage() {
  const { t } = useLang();
  const [stats, setStats]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    adminApi.getStats()
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading text={t('loadingStats')} />;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>{t('statsTitle')}</h1>
      <p style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 700, marginBottom: 18 }}>
        {t('statsSub')}
      </p>

      {error && <Message type="error">{error}</Message>}

      {stats && (
        <>
          {/* Totals */}
          <div className="anim-in" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 18 }}>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <div className="stat-num" style={{ color: 'var(--color-blue-dark)' }}>{stats.booked_total}</div>
              <div className="stat-lb">{t('totalAppts')}</div>
            </div>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <div className="stat-num" style={{ color: 'var(--color-red)' }}>{stats.cancelled_total}</div>
              <div className="stat-lb">{t('cancelledTotal')}</div>
            </div>
            <div className="stat-card" style={{ textAlign: 'center' }}>
              <div className="stat-num" style={{ color: 'var(--color-orange-dark)' }}>{stats.no_show_total}</div>
              <div className="stat-lb">{t('noShowsTotal')}</div>
            </div>
          </div>

          {/* Charts */}
          <div className="card anim-in anim-d1" style={{ marginBottom: 16, borderRadius: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 900, marginBottom: 14 }}>📅 {t('perWeekday')}</h3>
            <BarChart buckets={stats.per_weekday} color="var(--grad-blue)" />
          </div>

          <div className="card anim-in anim-d2" style={{ marginBottom: 16, borderRadius: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 900, marginBottom: 14 }}>🕐 {t('perHour')}</h3>
            {stats.per_hour.length === 0
              ? <p style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>—</p>
              : <BarChart buckets={stats.per_hour} color="var(--grad-sunny)" />}
          </div>

          <div className="card anim-in anim-d3" style={{ marginBottom: 24, borderRadius: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 900, marginBottom: 14 }}>📈 {t('perWeek')}</h3>
            {stats.per_week.length === 0
              ? <p style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>—</p>
              : <BarChart buckets={stats.per_week} color="var(--grad-green)" />}
          </div>
        </>
      )}
    </div>
  );
}
