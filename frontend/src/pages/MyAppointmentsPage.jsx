import React, { useEffect, useState } from 'react';
import { bookingsApi } from '../api/bookings';
import Loading from '../components/Loading';
import { Message } from '../components/Message';
import AboutButton from '../components/AboutButton';
import { useLang } from '../i18n/LanguageContext';
import { todayISO } from '../utils/dates';

const TYPE_INFO = {
  BOYS_HAIRCUT:      { labelKey: 'boysHaircut',     icon: '💈', orange: false },
  GIRLS_HAIR_DESIGN: { labelKey: 'girlsHairDesign', icon: '🎀', orange: true  },
};

const TABS = [
  { key: 'upcoming',  labelKey: 'upcomingTab'  },
  { key: 'past',      labelKey: 'pastTab'      },
  { key: 'cancelled', labelKey: 'cancelledTab' },
];

export default function MyAppointmentsPage() {
  const { t, locale } = useLang();
  const [bookings, setBookings]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [canceling, setCanceling]   = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [tab, setTab]               = useState('upcoming');
  // Ticks every minute so countdown badges ("in 3 hours") stay live.
  const [, setNowTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNowTick((n) => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const load = () => {
    setLoading(true);
    bookingsApi.getMyBookings()
      .then(setBookings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (bookingId) => {
    if (!window.confirm(t('confirmCancelAppt'))) return;
    setCanceling(bookingId);
    try {
      await bookingsApi.cancelBooking(bookingId);
      setSuccessMsg(t('apptCancelled'));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setCanceling(null);
    }
  };

  const today = todayISO();

  const categorize = (b) => {
    if (b.status === 'canceled') return 'cancelled';
    if (b.slot?.date >= today)   return 'upcoming';
    return 'past';
  };

  const sorted = [...bookings].sort((a, b) => {
    const ka = (a.slot?.date || '') + (a.slot?.time || '');
    const kb = (b.slot?.date || '') + (b.slot?.time || '');
    return tab === 'upcoming' ? ka.localeCompare(kb) : kb.localeCompare(ka);
  });
  const filtered = sorted.filter((b) => categorize(b) === tab);

  return (
    // Rendered inside CustomerRoute, which already provides .app-wrapper + BottomNav
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* ── Gradient header ──────────────────────────────────────────── */}
      <div className="hero hero--compact">
        <div className="bubble bubble--slow" style={{ width: 150, height: 150, top: -50, right: -40 }} />
        <span className="float-emoji" style={{ top: 30, right: 90, fontSize: 20 }}>📅</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 24, marginTop: 8 }}>{t('myApptsTitle')}</h1>
            <p className="hero-sub">{t('myApptsSub')}</p>
          </div>
          <AboutButton style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }} />
        </div>
      </div>

      <div className="page" style={{ paddingTop: 20 }}>
        {successMsg && (
          <Message type="success" onClose={() => setSuccessMsg('')}>{successMsg}</Message>
        )}
        {error && (
          <Message type="error" onClose={() => setError('')}>{error}</Message>
        )}

        {/* ── Filter tabs ──────────────────────────────────────────────── */}
        <div className="filter-tabs anim-in">
          {TABS.map((tb) => (
            <button
              key={tb.key}
              className={`ftab ${tab === tb.key ? 'ftab--on' : ''}`}
              onClick={() => setTab(tb.key)}
            >
              {t(tb.labelKey)}
            </button>
          ))}
        </div>

        {loading ? (
          <Loading text={t('loadingAppts')} />
        ) : filtered.length === 0 ? (
          <div className="empty-state anim-in">
            <div className="empty-state__icon">
              {tab === 'upcoming' ? '📅' : tab === 'past' ? '⏳' : '🚫'}
            </div>
            <div className="empty-state__title">
              {tab === 'upcoming' ? t('noUpcomingTitle')
                : tab === 'past' ? t('noPastAppts')
                : t('noCancelledAppts')}
            </div>
            {tab === 'upcoming' && (
              <p style={{ fontSize: 14, marginTop: 8, fontWeight: 600 }}>
                {t('bookFirst')}
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {filtered.map((b, i) => (
              <AppointmentCard
                key={b.id}
                booking={b}
                category={tab}
                canceling={canceling === b.id}
                onCancel={() => handleCancel(b.id)}
                animClass={`anim-in anim-d${Math.min(i + 1, 6)}`}
                t={t}
                locale={locale}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Single appointment card ─────────────────────────────────────────── */
function AppointmentCard({ booking: b, category, canceling, onCancel, animClass, t, locale }) {
  const info = TYPE_INFO[b.appointment_type] || { labelKey: null, icon: '✂️' };
  const label = info.labelKey ? t(info.labelKey) : b.appointment_type;

  const bannerClass =
    category === 'cancelled' ? 'appt-banner--red'
    : category === 'past'    ? 'appt-banner--gray'
    : info.orange            ? 'appt-banner--orange'
    : '';

  return (
    <div className={`appt-card ${category !== 'upcoming' ? 'appt-card--past' : ''} ${animClass}`}>
      {/* Date banner */}
      <div className={`appt-banner ${bannerClass}`}>
        <span>📍 {formatBannerDate(b.slot?.date, t, locale)}</span>
        {category === 'upcoming' && b.slot && (
          <span className="countdown">⏳ {countdownText(b.slot.date, b.slot.time, t)}</span>
        )}
      </div>

      {/* Body */}
      <div className="appt-body">
        <div className={`appt-ic ${info.orange ? 'appt-ic--orange' : ''}`}>{info.icon}</div>
        <div style={{ minWidth: 0 }}>
          <h4 style={{ fontSize: 16.5, fontWeight: 900, color: 'var(--color-gray-800)' }}>
            {label}
          </h4>
          {b.child && (
            <div style={{ fontSize: 12, color: 'var(--color-orange-dark)', fontWeight: 800, marginTop: 1 }}>
              👶 {t('forChildBadge', { name: b.child.name })}
            </div>
          )}
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 700, marginTop: 2 }}>
            🕐 {b.slot?.time?.slice(0, 5)} · {b.slot?.duration_minutes} {t('min')}
          </div>
        </div>
        {category === 'upcoming' ? (
          <span className="badge badge--booked" style={{ marginInlineStart: 'auto', flexShrink: 0 }}>
            <span className="pulse-dot" />{t('booked')}
          </span>
        ) : category === 'past' ? (
          <span className="badge badge--done" style={{ marginInlineStart: 'auto', flexShrink: 0 }}>✓ {t('doneBadge')}</span>
        ) : (
          <span className="badge badge--canceled" style={{ marginInlineStart: 'auto', flexShrink: 0 }}>✕ {t('cancelledBadge')}</span>
        )}
      </div>

      {/* Actions (upcoming only) */}
      {category === 'upcoming' && (
        <div className="appt-actions">
          <button className="act-cancel" onClick={onCancel} disabled={canceling}>
            {canceling ? t('cancelling') : t('cancelAction')}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────── */
function formatBannerDate(dateStr, t, locale) {
  if (!dateStr) return '—';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const d = new Date(dateStr + 'T00:00:00');

  const short = d.toLocaleDateString(locale, { month: 'long', day: 'numeric' });
  if (d.getTime() === today.getTime())    return `${t('today')} — ${short}`;
  if (d.getTime() === tomorrow.getTime()) return `${t('tomorrow')} — ${short}`;
  return d.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
}

function countdownText(dateStr, timeStr, t) {
  const appt = new Date(`${dateStr}T${timeStr}`);
  const diffMs = appt - new Date();
  if (diffMs <= 0) return t('countdownNow');

  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return t('inMinutes', { n: mins });

  const hours = Math.round(mins / 60);
  if (hours === 1) return t('inOneHour');
  if (hours < 48)  return t('inHours', { n: hours });

  const days = Math.round(hours / 24);
  return t('inDays', { n: days });
}