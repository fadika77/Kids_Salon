import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { clearAuth } from '../api/auth';
import { useLang } from '../i18n/LanguageContext';

const adminLinks = [
  { to: '/admin/dashboard', icon: '📊', labelKey: 'navDashboard'     },
  { to: '/admin/slots',     icon: '🗓️', labelKey: 'navSlots'         },
  { to: '/admin/bookings',  icon: '📋', labelKey: 'navAdminBookings' },
  { to: '/admin/stats',     icon: '📈', labelKey: 'navStats'         },
  { to: '/admin/settings',  icon: '⚙️', labelKey: 'navSettings'      },
];

export default function Navbar() {
  const navigate = useNavigate();
  const { t } = useLang();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const handleLogout = () => {
    clearAuth();
    navigate('/admin/login');
  };

  return (
    <header style={{
      background: 'var(--grad-blue-deep)',
      color: '#fff',
      position: 'sticky', top: 0, zIndex: 100,
      boxShadow: '0 8px 24px rgba(30,58,138,0.25)',
    }}>
      <div style={{
        maxWidth: 480,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '13px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 13,
            background: 'rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 19,
          }}>✂️</div>
          {/* Salon name — intentionally NOT translated, it's the brand name */}
          <span style={{ fontWeight: 900, fontSize: 17, letterSpacing: -0.3 }}>
            Kids Salon
          </span>
        </div>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            background: 'rgba(255,255,255,0.18)', border: 'none',
            borderRadius: 13, color: '#fff', cursor: 'pointer',
            width: 38, height: 38, fontSize: 18,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.2s',
          }}
        >
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>

      {menuOpen && (
        <div
          className="anim-in"
          style={{
            background: '#fff',
            position: 'absolute', width: '100%', maxWidth: 480,
            left: '50%', transform: 'translateX(-50%)',
            boxShadow: 'var(--shadow-lg)', zIndex: 200,
            borderRadius: '0 0 24px 24px',
            overflow: 'hidden',
            padding: '8px 10px 12px',
          }}
        >
          {adminLinks.map(({ to, icon, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 16px',
                margin: '2px 0',
                borderRadius: 16,
                textDecoration: 'none',
                color: isActive ? 'var(--color-blue-dark)' : 'var(--color-gray-800)',
                fontWeight: isActive ? 900 : 700,
                fontSize: 15,
                background: isActive ? 'var(--color-blue-light)' : 'transparent',
              })}
            >
              <span style={{ fontSize: 19 }}>{icon}</span>
              {t(labelKey)}
            </NavLink>
          ))}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', textAlign: 'start',
              padding: '13px 16px', marginTop: 2,
              background: 'var(--color-red-light)',
              border: 'none', cursor: 'pointer', borderRadius: 16,
              color: 'var(--color-red)', fontWeight: 800, fontSize: 15,
              fontFamily: 'var(--font-base)',
            }}
          >
            <span style={{ fontSize: 19 }}>🚪</span>
            {t('logout')}
          </button>
        </div>
      )}
    </header>
  );
}
