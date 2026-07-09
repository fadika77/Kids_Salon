import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLang } from '../i18n/LanguageContext';
import { todayISO, toLocalISO } from '../utils/dates';

/**
 * Step 1 of the booking flow — pick a date from a horizontal strip of
 * the next 14 days (plus a fallback native date input for further ahead).
 */
export default function ChooseDatePage() {
  const navigate  = useNavigate();
  const { t, locale } = useLang();
  const { state } = useLocation();
  const appointmentType = state?.appointmentType;

  const today = todayISO();
  const [selectedDate, setSelectedDate] = useState(today);

  if (!appointmentType) {
    navigate('/home');
    return null;
  }

  const isBoys = appointmentType === 'BOYS_HAIRCUT';
  const label  = isBoys ? t('boysHaircut') : t('girlsHairDesign');
  const icon   = isBoys ? '💈' : '🎀';

  // Build the next 14 days for the chip strip
  const days = [];
  for (let i = 0; i < 14; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    days.push({
      iso: toLocalISO(d),
      dow: d.toLocaleDateString(locale, { weekday: 'short' }),
      num: d.getDate(),
      mon: d.toLocaleDateString(locale, { month: 'short' }),
    });
  }

  // Past dates are NEVER allowed — the chip strip already starts from today,
  // and the manual date input silently snaps any past date back to today
  // (some Android date pickers ignore the `min` attribute).
  const handleManualDate = (value) => {
    if (!value) return;
    setSelectedDate(value < today ? today : value);
  };

  const handleNext = () => {
    if (!selectedDate || selectedDate < today) return;
    navigate('/book/time', { state: { appointmentType, date: selectedDate } });
  };

  const displayDate = new Date(selectedDate + 'T00:00:00').toLocaleDateString(locale, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div className="app-wrapper">
      {/* ── Gradient header ──────────────────────────────────────────── */}
      <div className="hero hero--compact">
        <div className="bubble bubble--slow" style={{ width: 150, height: 150, top: -50, right: -40 }} />
        <button className="hero-back" onClick={() => navigate('/home')}><span className="chev">‹</span></button>
        <h1 style={{ fontSize: 24, marginTop: 14 }}>{t('pickDate')}</h1>
        <p className="hero-sub">{icon} {label}</p>
        <div className="progress-dots">
          <div className="pdot pdot--done" />
          <div className="pdot" />
          <div className="pdot" />
        </div>
      </div>

      <div className="page page--no-bottom" style={{ paddingTop: 22 }}>
        {/* ── Date chip strip ──────────────────────────────────────────── */}
        <div className="anim-in anim-d1">
          <h3 className="section-title" style={{ fontSize: 16, marginBottom: 10 }}>
            {t('nextTwoWeeks')}
          </h3>
          <div className="date-strip">
            {days.map((d) => (
              <button
                key={d.iso}
                className={`date-chip ${selectedDate === d.iso ? 'date-chip--selected' : ''}`}
                onClick={() => setSelectedDate(d.iso)}
              >
                <div className="dc-dow">{d.dow}</div>
                <div className="dc-num">{d.num}</div>
                <div className="dc-mon">{d.mon}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Further ahead? ───────────────────────────────────────────── */}
        <div className="card anim-in anim-d2" style={{ marginTop: 18 }}>
          <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>
            {t('lookingAhead')}
          </h3>
          <input
            className="form-input"
            type="date"
            value={selectedDate}
            min={today}
            onChange={(e) => handleManualDate(e.target.value)}
            style={{ textAlign: 'center', fontWeight: 800 }}
          />
        </div>

        {/* ── Your pick summary ────────────────────────────────────────── */}
        <div className="summary-pick anim-in anim-d3" style={{ marginTop: 18 }}>
          <span style={{ fontSize: 24 }}>🗓️</span>
          <div>
            <div style={{
              fontSize: 11, fontWeight: 900, color: 'var(--color-gray-400)',
              textTransform: 'uppercase', letterSpacing: 0.6,
            }}>
              {t('yourPick')}
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 900, color: 'var(--color-gray-800)' }}>
              {displayDate}
            </div>
          </div>
          <span style={{ marginInlineStart: 'auto', fontSize: 20 }}>✅</span>
        </div>

        <button
          className="btn btn--primary btn--full anim-in anim-d4"
          disabled={!selectedDate || selectedDate < today}
          onClick={handleNext}
          style={{ marginTop: 20 }}
        >
          {t('seeTimes')}
        </button>
      </div>
    </div>
  );
}
