import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useLang } from '../i18n/LanguageContext';
import SocialLinks from '../components/SocialLinks';

// TODO: update with your real salon details.
// The address is written per-language so it always shows correctly:
const SHOP = {
  name:  'Kids Salon',
  address: {
    en: 'Kafr Qara, opposite Elementary School A',
    he: 'כפר קרע, מול בית ספר יסודי א׳',
    ar: 'كفر قرع، مقابل المدرسة الابتدائية أ',
  },
  phone:     '050-379-6880',       // how the number is displayed
  phoneLink: '+972503796880',      // international format used for the actual call
  email: 'kidssalon060@gmail.com',
  hours: {
    en: 'Mon–Sat: 9:00 AM – 6:00 PM',
    he: 'ב׳–ש׳: 9:00 – 18:00',
    ar: 'الاثنين–السبت: 9:00 – 18:00',
  },
  // TODO: put your real prices here
  services: [
    { labelKey: 'boysHaircut',     icon: '💈', price: '₪30' },
    { labelKey: 'girlsHairDesign', icon: '🎀', price: '₪50' },
  ],
};

export default function MainInfoPage() {
  const navigate = useNavigate();
  const { t, lang } = useLang();

  return (
    <div className="app-wrapper">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <div className="hero" style={{ textAlign: 'center', paddingBottom: 70 }}>
        <div className="bubble bubble--slow" style={{ width: 170, height: 170, top: -60, right: -40 }} />
        <div className="bubble bubble--orange bubble--fast" style={{ width: 90, height: 90, bottom: 0, left: -30 }} />
        <span className="float-emoji" style={{ top: 40, left: 40, fontSize: 22 }}>⭐</span>
        <span className="float-emoji" style={{ top: 90, right: 50, fontSize: 20, animationDelay: '1s' }}>🎈</span>

        <div className="pop-in" style={{
          width: 92, height: 92, borderRadius: 30,
          background: 'var(--grad-sunny)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 46, margin: '14px auto 16px',
          boxShadow: 'var(--shadow-orange)',
        }}>
          <span className="wiggle">✂️</span>
        </div>
        {/* Salon name — intentionally NOT translated, it's the brand name */}
        <h1 style={{ fontSize: 28 }}>{SHOP.name}</h1>
        <p className="hero-sub" style={{ maxWidth: 280, margin: '6px auto 0' }}>
          {t('tagline')}
        </p>
      </div>

      <div className="page page--no-bottom" style={{ paddingTop: 0, marginTop: -40, position: 'relative', zIndex: 5 }}>
        {/* About */}
        <div className="card anim-in anim-d1" style={{ marginBottom: 16, borderRadius: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 10 }}>{t('aboutTitle')}</h2>
          <p style={{ fontSize: 14, color: 'var(--color-gray-600)', lineHeight: 1.6, fontWeight: 600 }}>
            {t('aboutText')}
          </p>
        </div>

        {/* Services & prices */}
        <div className="card anim-in anim-d2" style={{ marginBottom: 16, borderRadius: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 12 }}>{t('ourServices')}</h2>
          {SHOP.services.map((svc, i) => (
            <div
              key={svc.labelKey}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 0',
                borderBottom: i === SHOP.services.length - 1 ? 'none' : '1.5px solid var(--color-gray-100)',
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 14, flexShrink: 0,
                background: 'var(--color-orange-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18,
              }}>{svc.icon}</div>
              <span style={{ fontSize: 14.5, fontWeight: 800 }}>{t(svc.labelKey)}</span>
              <span style={{
                marginInlineStart: 'auto', fontWeight: 900, fontSize: 15,
                color: 'var(--color-blue-dark)',
              }}>
                <span className="ltr-inline">{svc.price}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Salon details */}
        <div className="card anim-in anim-d2" style={{ marginBottom: 24, borderRadius: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, marginBottom: 14 }}>{t('visitUs')}</h2>
          <InfoRow icon="📍" label={t('address')} value={SHOP.address[lang] || SHOP.address.en} />
          <InfoRow icon="📞" label={t('phone')}   value={
            <a
              href={`tel:${SHOP.phoneLink}`}
              className="ltr-inline"
              style={{ color: 'var(--color-blue-dark)', fontWeight: 800, textDecoration: 'none' }}
            >
              {SHOP.phone}
            </a>
          } />
          <InfoRow icon="🕐" label={t('hours')}   value={SHOP.hours[lang] || SHOP.hours.en} />
          <InfoRow icon="✉️" label={t('questionsEmail')} value={
            <a
              href={`mailto:${SHOP.email}`}
              className="ltr-inline"
              style={{ color: 'var(--color-blue-dark)', fontWeight: 800, textDecoration: 'none' }}
            >
              {SHOP.email}
            </a>
          } last />

          {/* Social pages */}
          <div style={{ borderTop: '1.5px solid var(--color-gray-100)', paddingTop: 14, marginTop: 4 }}>
            <SocialLinks label={t('followUs')} />
          </div>
        </div>

        {/* Actions */}
        <button
          className="btn btn--accent btn--full anim-in anim-d3"
          onClick={() => navigate('/home')}
          style={{ marginBottom: 14, fontSize: 17 }}
        >
          {t('enterApp')}
        </button>

        <p className="anim-in anim-d4" style={{ textAlign: 'center', fontSize: 13, color: 'var(--color-text-muted)', fontWeight: 600 }}>
          {t('adminHint')}{' '}
          <Link to="/admin/login" style={{ color: 'var(--color-blue-dark)', fontWeight: 800 }}>
            {t('loginHere')}
          </Link>.
        </p>
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, last = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 0',
      borderBottom: last ? 'none' : '1.5px solid var(--color-gray-100)',
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 14, flexShrink: 0,
        background: 'var(--color-blue-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17,
      }}>{icon}</div>
      <div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 700 }}>{label}</div>
        <div style={{ fontSize: 14.5, fontWeight: 800 }}>{value}</div>
      </div>
    </div>
  );
}
