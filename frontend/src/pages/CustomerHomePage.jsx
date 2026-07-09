import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredUser, isAuthenticated, getCustomerProfile, saveAuth, authApi } from '../api/auth';
import { bookingsApi } from '../api/bookings';
import AboutButton from '../components/AboutButton';
import BottomNav from '../components/BottomNav';
import FirstRunModal from '../components/FirstRunModal';
import Loading from '../components/Loading';
import { registerPushNotifications } from '../utils/pushNotifications';
import { useLang } from '../i18n/LanguageContext';
import { todayISO } from '../utils/dates';

const APPOINTMENT_TYPES = [
  { key: 'BOYS_HAIRCUT',      labelKey: 'boysHaircut',      icon: '💈', descKey: 'boysDesc',  cardClass: 'service-card--blue'   },
  { key: 'GIRLS_HAIR_DESIGN', labelKey: 'girlsHairDesign',  icon: '🎀', descKey: 'girlsDesc', cardClass: 'service-card--orange' },
];

export default function CustomerHomePage() {
  const navigate = useNavigate();
  const { t, locale } = useLang();
  const [known, setKnown] = useState(isAuthenticated());
  // If this device already saved a customer profile before (even if the
  // session was cleared by an admin login/logout), we can restore it
  // silently instead of asking for details again.
  const [restoring, setRestoring] = useState(() => !isAuthenticated() && !!getCustomerProfile());
  const [nextAppt, setNextAppt] = useState(null);
  const user = getStoredUser();

  // Silent session restore — no popup for a device we already know.
  useEffect(() => {
    if (known) return;
    const profile = getCustomerProfile();
    if (!profile) return;
    authApi.deviceRegister(profile)
      .then((data) => {
        saveAuth(data.access_token, data.user);
        setKnown(true);
      })
      .catch(() => {
        // Backend unreachable or profile rejected → fall back to the popup
      })
      .finally(() => setRestoring(false));
  }, [known]);

  // Register for push notifications once the user is authenticated.
  // On web this is a no-op; on the native app it requests permission
  // and saves the FCM token to the backend.
  useEffect(() => {
    if (known) {
      registerPushNotifications().catch(console.error);
    }
  }, [known]);

  // Load the user's next upcoming appointment for the hero card
  useEffect(() => {
    if (!known) return;
    const today = todayISO();
    bookingsApi.getMyBookings()
      .then((bookings) => {
        const upcoming = bookings
          .filter((b) => b.status === 'booked' && b.slot?.date >= today)
          .sort((a, b) =>
            (a.slot.date + a.slot.time).localeCompare(b.slot.date + b.slot.time));
        setNextAppt(upcoming[0] || null);
      })
      .catch(() => {});
  }, [known]);

  // Restoring a known device's session — brief loader, no popup.
  if (!known && restoring) {
    return (
      <div className="app-wrapper" style={{ justifyContent: 'center' }}>
        <Loading text={t('loading')} />
      </div>
    );
  }

  // TRUE first-time visitor on this device: collect their details before
  // letting them use the app.
  if (!known) {
    return (
      <div className="app-wrapper">
        <FirstRunModal onComplete={() => setKnown(true)} />
      </div>
    );
  }

  const firstName = user?.full_name?.split(' ')[0] || 'Friend';

  const nextApptLabel = nextAppt
    ? `${formatFriendlyDate(nextAppt.slot.date, t, locale)}, ${nextAppt.slot.time.slice(0, 5)}`
    : null;

  return (
    <div className="app-wrapper">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="hero">
        {/* Floating decorations */}
        <div className="bubble bubble--slow" style={{ width: 170, height: 170, top: -60, right: -40 }} />
        <div className="bubble bubble--orange bubble--fast" style={{ width: 90, height: 90, bottom: 10, left: -30 }} />
        <div className="bubble" style={{ width: 44, height: 44, top: 66, right: 110 }} />
        <span className="float-emoji" style={{ top: 86, right: 60, fontSize: 24 }}>✂️</span>
        <span className="float-emoji" style={{ top: 26, left: 210, fontSize: 16, animationDelay: '1.2s' }}>⭐</span>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
          <div>
            <p className="hero-hello">{t('heyThere')}</p>
            <h1>{firstName}!</h1>
            <p className="hero-sub">{t('newLook')}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 50, height: 50, borderRadius: '50%',
              background: 'var(--grad-sunny)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 900, fontSize: 20,
              border: '3px solid rgba(255,255,255,0.85)',
              boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
            }}>
              {firstName.charAt(0).toUpperCase()}
            </div>
            <AboutButton style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }} />
          </div>
        </div>
      </div>

      {/* ── Next appointment card (pops out of hero) ─────────────────── */}
      <div className="hero-overlap anim-in anim-d1">
        {nextAppt ? (
          <div
            className="card card--clickable"
            onClick={() => navigate('/my-appointments')}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              borderRadius: 24, border: '2px solid var(--color-blue-light)',
              boxShadow: '0 16px 40px rgba(37,99,235,0.18)',
              padding: '18px 20px',
            }}
          >
            <div style={{
              width: 50, height: 50, borderRadius: 18, flexShrink: 0,
              background: 'var(--grad-sunny)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 25, boxShadow: 'var(--shadow-orange)',
            }}>⏰</div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: 11, fontWeight: 900, color: 'var(--color-orange-dark)',
                textTransform: 'uppercase', letterSpacing: 1,
              }}>
                {t('nextAppointment')}
              </div>
              <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--color-gray-800)', marginTop: 2 }}>
                {nextApptLabel}
              </div>
            </div>
            <div style={{
              marginInlineStart: 'auto', background: 'var(--color-blue-light)',
              color: 'var(--color-blue-dark)', borderRadius: 14,
              padding: '8px 14px', fontWeight: 900, fontSize: 13, flexShrink: 0,
            }}>
              {t('view')}
            </div>
          </div>
        ) : (
          <div className="card" style={{
            display: 'flex', alignItems: 'center', gap: 14,
            borderRadius: 24, padding: '18px 20px',
            border: '2px solid var(--color-blue-light)',
            boxShadow: '0 16px 40px rgba(37,99,235,0.18)',
          }}>
            <div style={{
              width: 50, height: 50, borderRadius: 18, flexShrink: 0,
              background: 'var(--grad-blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 25, boxShadow: 'var(--shadow-blue)',
            }}>🗓️</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--color-gray-800)' }}>
                {t('noUpcomingTitle')}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--color-text-muted)', marginTop: 2 }}>
                {t('noUpcomingSub')}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="page" style={{ paddingTop: 26 }}>
        {/* ── Section heading ──────────────────────────────────────────── */}
        <div className="anim-in anim-d2" style={{ marginBottom: 16 }}>
          <h2 className="section-title">{t('chooseService')}</h2>
          <p className="section-sub">{t('chooseServiceSub')}</p>
        </div>

        {/* ── Service cards ────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {APPOINTMENT_TYPES.map((type, i) => (
            <button
              key={type.key}
              className={`service-card ${type.cardClass} anim-in anim-d${i + 3}`}
              onClick={() => navigate('/book/date', { state: { appointmentType: type.key } })}
            >
              <span className="sparkle" style={{ top: 12, right: 70 }}>✦</span>
              <span className="sparkle" style={{ bottom: 14, right: 120, fontSize: 11 }}>✦</span>
              <div className="service-icon">{type.icon}</div>
              <div>
                <h3>{t(type.labelKey)}</h3>
                <p>{t(type.descKey)}</p>
              </div>
              <div className="service-go"><span className="chev">›</span></div>
            </button>
          ))}
        </div>

        {/* ── Quick action ─────────────────────────────────────────────── */}
        <div className="anim-in anim-d5" style={{ marginTop: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: 12 }}>
            {t('wantSee')}
          </p>
          <button
            className="btn btn--outline"
            onClick={() => navigate('/my-appointments')}
          >
            📅 {t('myAppointments')}
          </button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}

function formatFriendlyDate(dateStr, t, locale) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const d = new Date(dateStr + 'T00:00:00');

  if (d.getTime() === today.getTime())    return t('today');
  if (d.getTime() === tomorrow.getTime()) return t('tomorrow');
  return d.toLocaleDateString(locale, { weekday: 'short', month: 'short', day: 'numeric' });
}
