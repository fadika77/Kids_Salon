import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { bookingsApi } from '../api/bookings';
import Loading from '../components/Loading';
import { Message } from '../components/Message';
import { useLang } from '../i18n/LanguageContext';

/**
 * Step 2 of the booking flow — pick a time. Slots are grouped into
 * Morning / Afternoon / Evening; the selected slot glows orange.
 */
export default function ChooseTimePage() {
  const navigate  = useNavigate();
  const { t, locale } = useLang();
  const { state } = useLocation();
  const { appointmentType, date } = state || {};

  const [slots, setSlots]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [selected, setSelected] = useState(null);
  const [waitMsg, setWaitMsg]   = useState('');
  const [joining, setJoining]   = useState(false);

  const handleJoinWaitlist = async () => {
    setJoining(true);
    try {
      await bookingsApi.joinWaitlist(date);
      setWaitMsg(t('waitlistJoined'));
    } catch (e2) {
      setError(e2.message);
    } finally {
      setJoining(false);
    }
  };

  useEffect(() => {
    if (!appointmentType || !date) { navigate('/home'); return; }
    bookingsApi.getAvailableSlots(date)
      .then(setSlots)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [date, appointmentType, navigate]);

  const isBoys = appointmentType === 'BOYS_HAIRCUT';
  const label  = isBoys ? t('boysHaircut') : t('girlsHairDesign');
  const icon   = isBoys ? '💈' : '🎀';

  const handleNext = () => {
    if (!selected) return;
    navigate('/book/confirm', { state: { appointmentType, date, slot: selected } });
  };

  const displayDate = date
    ? new Date(date + 'T00:00:00').toLocaleDateString(locale, {
        weekday: 'long', month: 'long', day: 'numeric',
      })
    : '';

  // Group slots by part of day
  const hourOf = (slot) => parseInt(slot.time.slice(0, 2), 10);
  const groups = [
    { title: t('morning'),   slots: slots.filter((s) => hourOf(s) < 12) },
    { title: t('afternoon'), slots: slots.filter((s) => hourOf(s) >= 12 && hourOf(s) < 17) },
    { title: t('evening'),   slots: slots.filter((s) => hourOf(s) >= 17) },
  ].filter((g) => g.slots.length > 0);

  return (
    <div className="app-wrapper">
      {/* ── Gradient header ──────────────────────────────────────────── */}
      <div className="hero hero--compact">
        <div className="bubble bubble--slow" style={{ width: 150, height: 150, top: -50, right: -40 }} />
        <button className="hero-back" onClick={() => navigate(-1)}><span className="chev">‹</span></button>
        <h1 style={{ fontSize: 24, marginTop: 14 }}>{t('pickTime')}</h1>
        <p className="hero-sub">{icon} {label} · {displayDate}</p>
        <div className="progress-dots">
          <div className="pdot pdot--done" />
          <div className="pdot pdot--done" />
          <div className="pdot" />
        </div>
      </div>

      <div className="page page--no-bottom" style={{ paddingTop: 22 }}>
        {error && <Message type="error">{error}</Message>}

        {loading ? (
          <Loading text={t('findingTimes')} />
        ) : slots.length === 0 ? (
          <div className="empty-state anim-in">
            <div className="empty-state__icon">🕐</div>
            <div className="empty-state__title">{t('noTimesTitle')}</div>
            <p style={{ fontSize: 14, marginTop: 8, fontWeight: 600 }}>
              {t('noTimesSub')}
            </p>
            {waitMsg ? (
              <Message type="success" onClose={() => setWaitMsg('')}>{waitMsg}</Message>
            ) : (
              <button
                className="btn btn--accent"
                style={{ marginTop: 20 }}
                onClick={handleJoinWaitlist}
                disabled={joining}
              >
                {joining ? t('waitlistJoining') : t('waitlistBtn')}
              </button>
            )}
            <div>
              <button
                className="btn btn--outline"
                style={{ marginTop: 14 }}
                onClick={() => navigate(-1)}
              >
                {t('chooseAnotherDate')}
              </button>
            </div>
          </div>
        ) : (
          <>
            {groups.map((group, gi) => (
              <div key={group.title} className={`anim-in anim-d${gi + 1}`} style={{ marginBottom: 20 }}>
                <h3 className="section-title" style={{ fontSize: 17, marginBottom: 12 }}>
                  {group.title}
                </h3>
                <div className="time-grid">
                  {group.slots.map((slot) => {
                    const isSelected = selected?.id === slot.id;
                    return (
                      <button
                        key={slot.id}
                        className={`time-slot ${isSelected ? 'time-slot--selected' : ''}`}
                        onClick={() => setSelected(slot)}
                      >
                        {slot.time.slice(0, 5)}
                        <span className="ts-sub">{slot.duration_minutes} {t('min')}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* ── Your pick summary ────────────────────────────────────── */}
            {selected && (
              <div className="summary-pick pop-in" style={{ marginBottom: 18 }}>
                <span style={{ fontSize: 24 }}>🗓️</span>
                <div>
                  <div style={{
                    fontSize: 11, fontWeight: 900, color: 'var(--color-gray-400)',
                    textTransform: 'uppercase', letterSpacing: 0.6,
                  }}>
                    {t('yourPick')}
                  </div>
                  <div style={{ fontSize: 14.5, fontWeight: 900, color: 'var(--color-gray-800)' }}>
                    {displayDate} · {selected.time.slice(0, 5)}
                  </div>
                </div>
                <span style={{ marginInlineStart: 'auto', fontSize: 20 }}>✅</span>
              </div>
            )}

            <button
              className="btn btn--primary btn--full"
              disabled={!selected}
              onClick={handleNext}
            >
              {t('continueBtn')}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
