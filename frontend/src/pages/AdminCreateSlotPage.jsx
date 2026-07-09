import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/admin';
import { Message } from '../components/Message';
import { useLang } from '../i18n/LanguageContext';
import { todayISO, toLocalISO } from '../utils/dates';

/**
 * Build the tappable time grid from the chosen duration:
 * 15 min -> 08:00, 08:15, 08:30 ... | 30 min -> 08:00, 08:30 ... | 60 min -> hourly.
 * Working window: 08:00 - 21:00.
 */
function buildTimes(stepMinutes) {
  const step = Number(stepMinutes) || 30;
  const times = [];
  for (let m = 8 * 60; m + step <= 21 * 60; m += step) {
    const h  = String(Math.floor(m / 60)).padStart(2, '0');
    const mm = String(m % 60).padStart(2, '0');
    times.push(`${h}:${mm}`);
  }
  return times;
}

export default function AdminCreateSlotPage() {
  const navigate = useNavigate();
  const { t, locale } = useLang();
  const today = todayISO();

  const [mode, setMode] = useState('single');   // 'single' | 'weekly'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <button className="page-header__back" onClick={() => navigate('/admin/slots')}>
          <span className="chev">‹</span>
        </button>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>{t('createSlotTitle')}</h1>
      </div>

      {/* Mode tabs */}
      <div className="filter-tabs">
        <button
          className={`ftab ${mode === 'single' ? 'ftab--on' : ''}`}
          onClick={() => setMode('single')}
        >
          {t('singleSlotTab')}
        </button>
        <button
          className={`ftab ${mode === 'weekly' ? 'ftab--on' : ''}`}
          onClick={() => setMode('weekly')}
        >
          {t('weeklyTab')}
        </button>
      </div>

      {mode === 'single'
        ? <SingleSlotForm t={t} today={today} navigate={navigate} />
        : <WeeklyScheduleForm t={t} today={today} locale={locale} />}
    </div>
  );
}

/* ═══════════════ Single slot (original flow) ═══════════════ */
function SingleSlotForm({ t, today, navigate }) {
  const [form, setForm] = useState({
    date: today, time: '', duration_minutes: 30, notes: '',
  });
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const quickTimes = buildTimes(form.duration_minutes);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date || !form.time) { setError(t('dateTimeRequired')); return; }
    setError(''); setLoading(true);
    try {
      await adminApi.createSlot({
        date: form.date,
        time: form.time,
        duration_minutes: Number(form.duration_minutes),
        notes: form.notes || null,
      });
      setSuccess(t('slotCreated'));
      setForm({ date: form.date, time: '', duration_minutes: 30, notes: '' });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error   && <Message type="error"   onClose={() => setError('')}>{error}</Message>}
      {success && <Message type="success" onClose={() => setSuccess('')}>{success}</Message>}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('dateRequired')}</label>
            <input
              type="date" name="date" className="form-input"
              min={today} value={form.date} onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('timeRequired')}</label>
            <input
              type="time" name="time" className="form-input"
              value={form.time} onChange={handleChange}
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {quickTimes.map((tm) => (
                <button
                  key={tm} type="button"
                  onClick={() => setForm((p) => ({ ...p, time: tm }))}
                  style={{
                    padding: '5px 10px', fontSize: 13, borderRadius: 8,
                    border: `1.5px solid ${form.time === tm ? 'var(--color-blue)' : 'var(--color-gray-200)'}`,
                    background: form.time === tm ? 'var(--color-blue)' : '#fff',
                    color: form.time === tm ? '#fff' : 'var(--color-gray-800)',
                    cursor: 'pointer', fontWeight: 600,
                    fontFamily: 'var(--font-base)',
                  }}
                >
                  {tm}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">{t('durationMinutes')}</label>
            <select name="duration_minutes" className="form-input" value={form.duration_minutes} onChange={handleChange}>
              <option value={15}>{t('m15')}</option>
              <option value={30}>{t('m30')}</option>
              <option value={45}>{t('m45')}</option>
              <option value={60}>{t('m60')}</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t('notesOptional')}</label>
            <input
              type="text" name="notes" className="form-input"
              placeholder={t('notesPlaceholder')}
              value={form.notes} onChange={handleChange}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn--primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? t('creating') : t('createSlotBtn')}
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => navigate('/admin/slots')}>
              {t('cancel')}
            </button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: 16, background: 'var(--color-blue-light)' }}>
        <p style={{ fontSize: 13, color: 'var(--color-blue-dark)', fontWeight: 600 }}>
          {t('createTip')}
        </p>
      </div>
    </>
  );
}

/* ═══════════════ Weekly schedule ═══════════════ */
function WeeklyScheduleForm({ t, today, locale }) {
  const [weekStart, setWeekStart] = useState(today);
  const [duration, setDuration]   = useState(30);
  // dayTimes: { 'YYYY-MM-DD': array of selected times }
  const [dayTimes, setDayTimes]   = useState({});
  const [error, setError]         = useState('');
  const [success, setSuccess]     = useState('');
  const [loading, setLoading]     = useState(false);

  // Build the 7 days of the chosen week
  const days = [];
  const start = new Date(weekStart + 'T00:00:00');
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push({
      iso: toLocalISO(d),
      label: d.toLocaleDateString(locale, { weekday: 'long', month: 'short', day: 'numeric' }),
      isPast: toLocalISO(d) < today,
    });
  }

  const quickTimes = buildTimes(duration);

  // Changing the duration rebuilds the grid — clear selections that no
  // longer exist on the new grid.
  const handleDurationChange = (value) => {
    setDuration(value);
    setDayTimes({});
  };

  const toggleTime = (dayIso, time) => {
    setDayTimes((prev) => {
      const current = prev[dayIso] ? [...prev[dayIso]] : [];
      const idx = current.indexOf(time);
      if (idx >= 0) current.splice(idx, 1);
      else current.push(time);
      return { ...prev, [dayIso]: current };
    });
  };

  const totalSelected = Object.values(dayTimes).reduce((sum, arr) => sum + arr.length, 0);

  const handleGenerate = async () => {
    const payloadDays = days
      .filter((d) => !d.isPast && dayTimes[d.iso]?.length)
      .map((d) => ({ date: d.iso, times: [...dayTimes[d.iso]].sort() }));

    if (payloadDays.length === 0) { setError(t('noTimesSelected')); return; }

    setError(''); setLoading(true);
    try {
      const result = await adminApi.createSlotsBulk({
        duration_minutes: Number(duration),
        days: payloadDays,
      });
      setSuccess(t('weekCreated', { n: result.created, m: result.skipped }));
      setDayTimes({});
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error   && <Message type="error"   onClose={() => setError('')}>{error}</Message>}
      {success && <Message type="success" onClose={() => setSuccess('')}>{success}</Message>}

      {/* Week + duration selectors */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className="form-label">{t('weekStarting')}</label>
            <input
              type="date" className="form-input"
              min={today} value={weekStart}
              onChange={(e) => e.target.value && setWeekStart(e.target.value < today ? today : e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">{t('durationMinutes')}</label>
            <select className="form-input" value={duration} onChange={(e) => handleDurationChange(e.target.value)}>
              <option value={15}>{t('m15')}</option>
              <option value={30}>{t('m30')}</option>
              <option value={45}>{t('m45')}</option>
              <option value={60}>{t('m60')}</option>
            </select>
          </div>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 10 }}>
          💡 {t('tapTimesHint')}
        </p>
      </div>

      {/* One card per day */}
      {days.map((day) => (
        <div
          key={day.iso}
          className="card"
          style={{ marginBottom: 12, opacity: day.isPast ? 0.45 : 1 }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <h3 style={{ fontSize: 15, fontWeight: 900 }}>{day.label}</h3>
            {dayTimes[day.iso]?.length > 0 && (
              <span className="badge badge--booked">{dayTimes[day.iso].length}</span>
            )}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {quickTimes.map((tm) => {
              const on = dayTimes[day.iso]?.includes(tm);
              return (
                <button
                  key={tm} type="button"
                  disabled={day.isPast}
                  onClick={() => toggleTime(day.iso, tm)}
                  style={{
                    padding: '5px 10px', fontSize: 12.5, borderRadius: 8,
                    border: `1.5px solid ${on ? 'var(--color-orange)' : 'var(--color-gray-200)'}`,
                    background: on ? 'var(--grad-sunny)' : '#fff',
                    color: on ? '#fff' : 'var(--color-gray-800)',
                    cursor: day.isPast ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontFamily: 'var(--font-base)',
                  }}
                >
                  {tm}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <button
        className="btn btn--accent btn--full"
        onClick={handleGenerate}
        disabled={loading || totalSelected === 0}
        style={{ marginTop: 6, marginBottom: 24 }}
      >
        {loading ? t('generatingWeek') : `${t('generateWeek')} (${totalSelected})`}
      </button>
    </>
  );
}
