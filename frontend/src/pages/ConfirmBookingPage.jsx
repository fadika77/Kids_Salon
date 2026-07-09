import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { bookingsApi } from '../api/bookings';
import { getStoredUser } from '../api/auth';
import { Message } from '../components/Message';
import { useLang } from '../i18n/LanguageContext';

const CONFETTI_COLORS = ['#3B82F6', '#FB923C', '#FBBF24', '#10B981', '#F87171', '#60A5FA'];

/** Full-screen confetti burst rendered on the success screen. */
function Confetti() {
  const pieces = Array.from({ length: 36 }, (_, i) => ({
    left: `${(i * 137.5) % 100}%`,
    background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    animationDuration: `${2.2 + (i % 5) * 0.35}s`,
    animationDelay: `${(i % 7) * 0.12}s`,
    width: 7 + (i % 3) * 3,
    height: 10 + (i % 4) * 3,
    borderRadius: i % 3 === 0 ? '50%' : 3,
  }));
  return (
    <>
      {pieces.map((style, i) => (
        <div key={i} className="confetti-piece" style={style} />
      ))}
    </>
  );
}

export default function ConfirmBookingPage() {
  const navigate  = useNavigate();
  const { t, locale } = useLang();
  const { state } = useLocation();
  const { appointmentType, date, slot } = state || {};

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);
  const [children, setChildren]     = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [newKidName, setNewKidName] = useState('');
  const [addingKid, setAddingKid]   = useState(false);

  // Load kid profiles for the "who is this for?" selector
  useEffect(() => {
    bookingsApi.getChildren().then(setChildren).catch(() => {});
  }, []);

  const handleAddKid = async () => {
    const name = newKidName.trim();
    if (!name) return;
    setAddingKid(true);
    try {
      const kid = await bookingsApi.addChild(name);
      setChildren((prev) => [...prev, kid]);
      setSelectedChild(kid.id);
      setNewKidName('');
    } catch (e2) {
      setError(e2.message);
    } finally {
      setAddingKid(false);
    }
  };

  const user   = getStoredUser();
  const isBoys = appointmentType === 'BOYS_HAIRCUT';
  const label  = isBoys ? t('boysHaircut') : t('girlsHairDesign');
  const icon   = isBoys ? '💈' : '🎀';

  if (!appointmentType || !date || !slot) {
    navigate('/home');
    return null;
  }

  const displayDate = new Date(date + 'T00:00:00').toLocaleDateString(locale, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  const handleConfirm = async () => {
    setError('');
    setLoading(true);
    try {
      await bookingsApi.createBooking({
        slot_id: slot.id,
        appointment_type: appointmentType,
        child_id: selectedChild,
      });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Success screen with confetti ─────────────────────────────────── */
  if (success) {
    return (
      <div className="app-wrapper">
        <Confetti />
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '32px 24px', textAlign: 'center',
        }}>
          <div className="pop-in" style={{
            width: 110, height: 110, borderRadius: '50%',
            background: 'var(--grad-green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 54, marginBottom: 20,
            boxShadow: '0 20px 50px rgba(16,185,129,0.4)',
          }}>
            <span className="wiggle">🎉</span>
          </div>
          <h2 className="anim-in anim-d1" style={{ fontSize: 25, fontWeight: 900, color: 'var(--color-gray-800)', marginBottom: 8 }}>
            {t('youreBooked')}
          </h2>
          <p className="anim-in anim-d2" style={{ color: 'var(--color-text-muted)', fontSize: 15, fontWeight: 600, marginBottom: 6 }}>
            {t('bookedSub')}
          </p>
          {user?.email && (
            <p className="anim-in anim-d2" style={{ color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, marginBottom: 24 }}>
              {t('emailOnWay', { email: user.email })}
            </p>
          )}

          <div className="card anim-in anim-d3" style={{ width: '100%', marginBottom: 24, borderRadius: 24 }}>
            <DetailRow label={t('service')} value={`${icon} ${label}`} />
            <DetailRow label={t('date')}    value={displayDate} />
            <DetailRow label={t('time')}    value={slot.time.slice(0, 5)} last />
          </div>

          <button
            className="btn btn--primary btn--full anim-in anim-d4"
            onClick={() => navigate('/my-appointments')}
          >
            {t('viewMyAppointments')}
          </button>
          <button
            className="btn btn--secondary btn--full anim-in anim-d5"
            style={{ marginTop: 12 }}
            onClick={() => navigate('/home')}
          >
            {t('backToHome')}
          </button>
        </div>
      </div>
    );
  }

  /* ── Review & confirm ─────────────────────────────────────────────── */
  return (
    <div className="app-wrapper">
      <div className="hero hero--compact">
        <div className="bubble bubble--slow" style={{ width: 150, height: 150, top: -50, right: -40 }} />
        <button className="hero-back" onClick={() => navigate(-1)} disabled={loading}><span className="chev">‹</span></button>
        <h1 style={{ fontSize: 24, marginTop: 14 }}>{t('almostDone')}</h1>
        <p className="hero-sub">{t('checkEverything')}</p>
        <div className="progress-dots">
          <div className="pdot pdot--done" />
          <div className="pdot pdot--done" />
          <div className="pdot pdot--done" />
        </div>
      </div>

      <div className="page page--no-bottom" style={{ paddingTop: 22 }}>
        {/* Service banner */}
        <div
          className={`anim-in anim-d1`}
          style={{
            background: isBoys ? 'var(--grad-blue)' : 'var(--grad-orange)',
            borderRadius: 'var(--radius-xl)',
            padding: '22px', color: '#fff', textAlign: 'center',
            marginBottom: 18, position: 'relative', overflow: 'hidden',
            boxShadow: isBoys ? 'var(--shadow-blue)' : 'var(--shadow-orange)',
          }}
        >
          <span className="sparkle" style={{ top: 14, right: 40 }}>✦</span>
          <span className="sparkle" style={{ bottom: 16, left: 40, fontSize: 11 }}>✦</span>
          <div style={{ fontSize: 42, marginBottom: 6 }}>{icon}</div>
          <h2 style={{ fontSize: 20, fontWeight: 900 }}>{label}</h2>
        </div>

        {error && <Message type="error" onClose={() => setError('')}>{error}</Message>}

        {/* Details */}
        <div className="card anim-in anim-d2" style={{ marginBottom: 16, borderRadius: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 900, marginBottom: 14, color: 'var(--color-gray-600)' }}>
            {t('appointmentDetails')}
          </h3>
          <DetailRow label={`📅 ${t('date')}`}     value={displayDate} />
          <DetailRow label={`🕐 ${t('time')}`}     value={slot.time.slice(0, 5)} />
          <DetailRow label={`⏱ ${t('duration')}`} value={`${slot.duration_minutes} ${t('minutes')}`} last />
        </div>

        {/* Who is this appointment for? (kids profiles) */}
        <div className="card anim-in anim-d3" style={{ marginBottom: 16, borderRadius: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 900, marginBottom: 12, color: 'var(--color-gray-600)' }}>
            {t('forWho')}
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => setSelectedChild(null)}
              style={{
                padding: '8px 14px', borderRadius: 14, fontWeight: 800, fontSize: 13.5,
                border: `2px solid ${selectedChild === null ? 'var(--color-blue)' : 'var(--color-gray-200)'}`,
                background: selectedChild === null ? 'var(--color-blue-light)' : '#fff',
                color: selectedChild === null ? 'var(--color-blue-dark)' : 'var(--color-gray-600)',
                cursor: 'pointer', fontFamily: 'var(--font-base)',
              }}
            >
              {t('forMyself')}
            </button>
            {children.map((kid) => (
              <button
                key={kid.id}
                type="button"
                onClick={() => setSelectedChild(kid.id)}
                style={{
                  padding: '8px 14px', borderRadius: 14, fontWeight: 800, fontSize: 13.5,
                  border: `2px solid ${selectedChild === kid.id ? 'var(--color-orange)' : 'var(--color-gray-200)'}`,
                  background: selectedChild === kid.id ? 'var(--color-orange-light)' : '#fff',
                  color: selectedChild === kid.id ? 'var(--color-orange-dark)' : 'var(--color-gray-600)',
                  cursor: 'pointer', fontFamily: 'var(--font-base)',
                }}
              >
                👶 {kid.name}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-input"
              type="text"
              placeholder={t('kidNamePlaceholder')}
              value={newKidName}
              onChange={(e) => setNewKidName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={handleAddKid}
              disabled={addingKid || !newKidName.trim()}
              style={{ alignSelf: 'stretch' }}
            >
              + {t('addKidBtn')}
            </button>
          </div>
        </div>

        <div className="card anim-in anim-d3" style={{ marginBottom: 22, borderRadius: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 900, marginBottom: 14, color: 'var(--color-gray-600)' }}>
            {t('yourInformation')}
          </h3>
          <DetailRow label={`👤 ${t('fullName')}`}  value={user?.full_name || '—'} />
          <DetailRow label={`📞 ${t('phone')}`} value={user?.phone || '—'} />
          <DetailRow label={`✉️ ${t('email')}`} value={user?.email || '—'} last />
        </div>

        <button
          className="btn btn--accent btn--full anim-in anim-d4"
          onClick={handleConfirm}
          disabled={loading}
          style={{ marginBottom: 12 }}
        >
          {loading ? t('bookingBtn') : t('confirmBookingBtn')}
        </button>
        <button
          className="btn btn--secondary btn--full anim-in anim-d5"
          onClick={() => navigate(-1)}
          disabled={loading}
        >
          {t('back')}
        </button>
      </div>
    </div>
  );
}

function DetailRow({ label, value, last = false }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', padding: '10px 0',
      borderBottom: last ? 'none' : '1.5px solid var(--color-gray-100)',
    }}>
      <span style={{ fontSize: 14, color: 'var(--color-text-muted)', fontWeight: 700 }}>{label}</span>
      <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-gray-800)' }}>{value}</span>
    </div>
  );
}
