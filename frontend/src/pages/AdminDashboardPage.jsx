import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/admin';
import Loading from '../components/Loading';
import { Message } from '../components/Message';
import { registerPushNotifications } from '../utils/pushNotifications';
import { useLang } from '../i18n/LanguageContext';
import { todayISO } from '../utils/dates';
import GalleryManager from '../components/GalleryManager';
import SocialLinks from '../components/SocialLinks';

/** Number that counts up from 0 when it first appears. */
function CountUp({ value, duration = 900 }) {
  const [display, setDisplay] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    const target = Number(value) || 0;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration]);

  return <>{display}</>;
}

function StatCard({ icon, label, value, iconBg, animClass }) {
  return (
    <div className={`stat-card ${animClass}`}>
      <div className="stat-ic" style={{ background: iconBg }}>{icon}</div>
      <div className="stat-num"><CountUp value={value} /></div>
      <div className="stat-lb">{label}</div>
    </div>
  );
}

const TYPE_INFO = {
  BOYS_HAIRCUT:      { labelKey: 'boysHaircut',     icon: '💈', orange: false },
  GIRLS_HAIR_DESIGN: { labelKey: 'girlsHairDesign', icon: '🎀', orange: true  },
};

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { t, locale } = useLang();
  const [stats, setStats]         = useState(null);
  const [todayList, setTodayList] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [showGallery, setShowGallery] = useState(false);

  useEffect(() => {
    const today = todayISO();

    Promise.all([
      adminApi.getDashboard(),
      adminApi.getBookings({ date: today, status: 'booked' }).catch(() => []),
    ])
      .then(([dashboard, bookings]) => {
        setStats(dashboard);
        const sorted = [...bookings].sort((a, b) =>
          (a.slot?.time || '').localeCompare(b.slot?.time || ''));
        setTodayList(sorted);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));

    // Register for push notifications so the admin receives alerts on their device
    registerPushNotifications().catch(console.error);
  }, []);

  if (loading) return <Loading text={t('loadingDashboard')} />;

  const todayNice = new Date().toLocaleDateString(locale, {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div style={{ margin: '-16px -16px 0' }}>
      {/* ── Deep blue hero ───────────────────────────────────────────── */}
      <div className="hero hero--admin" style={{ paddingBottom: 66 }}>
        <div className="bubble bubble--slow" style={{ width: 160, height: 160, top: -50, right: -40 }} />
        <div className="bubble bubble--orange bubble--fast" style={{ width: 80, height: 80, bottom: 0, left: -25 }} />
        <h1 style={{ marginTop: 6 }}>{t('dashboardTitle')}</h1>
        <p className="hero-sub">{todayNice}</p>
      </div>

      <div style={{ padding: '0 16px 24px' }}>
        {error && <div style={{ marginTop: 16 }}><Message type="error">{error}</Message></div>}

        {stats && (
          <>
            {/* ── Stat cards overlap the hero ──────────────────────────── */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
              marginTop: -46, position: 'relative', zIndex: 5,
            }}>
              <StatCard
                icon="🗓️" label={t('availableSlots')}
                value={stats.total_available_slots}
                iconBg="var(--color-green-light)"
                animClass="anim-in anim-d1"
              />
              <StatCard
                icon="📋" label={t('totalBooked')}
                value={stats.total_booked}
                iconBg="var(--color-blue-soft)"
                animClass="anim-in anim-d2"
              />
              <StatCard
                icon="📅" label={t('todayStat')}
                value={stats.today_appointments}
                iconBg="var(--color-orange-soft)"
                animClass="anim-in anim-d3"
              />
              <StatCard
                icon="🔮" label={t('upcomingStat')}
                value={stats.upcoming_appointments}
                iconBg="#FEF3C7"
                animClass="anim-in anim-d4"
              />
            </div>

            {/* ── Quick actions ────────────────────────────────────────── */}
            <div className="anim-in anim-d4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 22 }}>
              <QuickBtn
                icon="➕" label={t('addSlot')}
                gradient="var(--grad-sunny)" shadow="var(--shadow-orange)"
                onClick={() => navigate('/admin/slots/create')}
              />
              <QuickBtn
                icon="📋" label={t('quickBookings')}
                gradient="var(--grad-blue)" shadow="var(--shadow-blue)"
                onClick={() => navigate('/admin/bookings')}
              />
              <QuickBtn
                icon="🗓️" label={t('quickSlots')}
                gradient="var(--grad-green)" shadow="0 10px 24px rgba(16,185,129,0.35)"
                onClick={() => navigate('/admin/slots')}
              />
              <QuickBtn
                icon="📈" label={t('navStats')}
                gradient="linear-gradient(135deg,#8B5CF6,#7C3AED)" shadow="0 10px 24px rgba(139,92,246,0.35)"
                onClick={() => navigate('/admin/stats')}
              />
              <QuickBtn
                icon="📸" label={t('quickGallery')}
                gradient="linear-gradient(135deg,#EC4899,#DB2777)" shadow="0 10px 24px rgba(236,72,153,0.35)"
                onClick={() => setShowGallery(true)}
              />
              <QuickBtn
                icon="⚙️" label={t('quickSettings')}
                gradient="linear-gradient(135deg,#64748B,#475569)" shadow="0 10px 24px rgba(71,85,105,0.3)"
                onClick={() => navigate('/admin/settings')}
              />
            </div>

            {/* ── Today's timeline ─────────────────────────────────────── */}
            <div className="anim-in anim-d5" style={{ marginTop: 28, marginBottom: 12 }}>
              <h2 className="section-title">{t('todaysTimeline')}</h2>
              <p className="section-sub">
                {todayList.length === 0
                  ? t('noApptsToday')
                  : todayList.length === 1
                    ? t('oneApptToday')
                    : t('nApptsToday', { n: todayList.length })}
              </p>
            </div>

            {todayList.length === 0 ? (
              <div className="card anim-in anim-d6" style={{
                textAlign: 'center', padding: '28px 20px', borderRadius: 24,
              }}>
                <div style={{ fontSize: 38, marginBottom: 8 }}>🏖️</div>
                <div style={{ fontWeight: 800, color: 'var(--color-text-muted)', fontSize: 14 }}>
                  {t('enjoyQuiet')}
                </div>
              </div>
            ) : (
              todayList.map((b, i) => {
                const info = TYPE_INFO[b.appointment_type] || { labelKey: null, icon: '✂️' };
                const label = info.labelKey ? t(info.labelKey) : b.appointment_type;
                return (
                  <div
                    key={b.id}
                    className={`timeline-item ${info.orange ? 'timeline-item--orange' : ''} anim-in anim-d${Math.min(i + 1, 6)}`}
                  >
                    <div className="tl-time">{b.slot?.time?.slice(0, 5)}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: 'var(--color-gray-800)', fontSize: 14 }}>
                        {b.customer?.full_name || '—'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600, marginTop: 1 }}>
                        {label} · {b.slot?.duration_minutes} {t('min')}
                      </div>
                    </div>
                    <div style={{ marginInlineStart: 'auto', fontSize: 22 }}>{info.icon}</div>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ── Salon social pages ─────────────────────────────────────── */}
        <SocialLinks label={t('followUs')} style={{ marginTop: 30, marginBottom: 8 }} />
      </div>

      {showGallery && <GalleryManager onClose={() => setShowGallery(false)} />}
    </div>
  );
}

function QuickBtn({ icon, label, gradient, shadow, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        borderRadius: 20,
        padding: '15px 6px',
        textAlign: 'center',
        background: gradient,
        boxShadow: shadow,
        border: 'none',
        cursor: 'pointer',
        transition: 'transform 0.2s cubic-bezier(0.34, 1.3, 0.64, 1)',
        fontFamily: 'var(--font-base)',
      }}
      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.92)'}
      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
    >
      <div style={{ fontSize: 24 }}>{icon}</div>
      <div style={{ color: '#fff', fontSize: 11, fontWeight: 900, marginTop: 5 }}>{label}</div>
    </button>
  );
}
