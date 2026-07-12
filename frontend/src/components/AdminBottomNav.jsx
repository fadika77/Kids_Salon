import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { clearAuth } from '../api/auth';
import { useLang } from '../i18n/LanguageContext';
import GalleryManager from './GalleryManager';

/**
 * Persistent bottom navigation for the ADMIN side.
 *
 *  [Home] [Bookings]  (＋)  [Slots] [More]
 *
 *  - The floating orange ＋ opens "Add Slot" from anywhere.
 *  - "More" slides up a sheet with the less-used pages:
 *    Statistics, Gallery, Weekly Slots, Settings, View as Customer, Logout.
 */
export default function AdminBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLang();
  const [moreOpen, setMoreOpen] = useState(false);
  const [showGallery, setShowGallery] = useState(false);

  const isActive = (path) => location.pathname.startsWith(path);

  const go = (path, state) => {
    setMoreOpen(false);
    navigate(path, state ? { state } : undefined);
  };

  const handleLogout = () => {
    setMoreOpen(false);
    clearAuth();
    navigate('/admin/login');
  };

  const tabs = [
    { key: 'home',     icon: '🏠', label: t('adminNavHome'),     path: '/admin/dashboard' },
    { key: 'bookings', icon: '📋', label: t('navAdminBookings'), path: '/admin/bookings'  },
    { key: 'FAB' },   // placeholder space under the floating button
    { key: 'slots',    icon: '🗓️', label: t('navSlots'),         path: '/admin/slots'     },
    { key: 'more',     icon: '⚙️', label: t('adminNavMore') },
  ];

  const moreItems = [
    { icon: '📈', label: t('navStats'),       onClick: () => go('/admin/stats') },
    { icon: '📸', label: t('galleryShort'),   onClick: () => { setMoreOpen(false); setShowGallery(true); } },
    { icon: '🗓️', label: t('weeklyTab'),      onClick: () => go('/admin/slots/create', { mode: 'weekly' }) },
    { icon: '⚙️', label: t('navSettings'),    onClick: () => go('/admin/settings') },
    { icon: '👀', label: t('viewAsCustomer'), onClick: () => go('/home') },
    { icon: '🚪', label: t('logout'),         onClick: handleLogout, danger: true },
  ];

  return (
    <>
      {/* ── Floating "+" — add slot from anywhere ─────────────────────── */}
      <button
        onClick={() => go('/admin/slots/create')}
        aria-label={t('addSlot')}
        style={{
          position: 'fixed', bottom: 36, left: '50%', transform: 'translateX(-50%)',
          width: 58, height: 58, borderRadius: '50%',
          background: 'var(--grad-sunny)', color: '#fff',
          border: '5px solid var(--color-bg, #F6F8FC)',
          fontSize: 28, fontWeight: 900, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', zIndex: 320,
          boxShadow: '0 12px 28px rgba(234,88,12,0.45)',
        }}
      >
        +
      </button>

      {/* ── Tab bar ───────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 310,
        background: '#fff',
        borderRadius: '24px 24px 0 0',
        boxShadow: '0 -8px 30px rgba(15,23,42,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        height: 66,
        paddingBottom: 'env(safe-area-inset-bottom)',
        maxWidth: 480, margin: '0 auto',
      }}>
        {tabs.map((tab) => {
          if (tab.key === 'FAB') return <div key="fab-space" style={{ width: 58 }} />;
          const active = tab.path ? isActive(tab.path) : moreOpen;
          return (
            <button
              key={tab.key}
              onClick={() => tab.path ? go(tab.path) : setMoreOpen((o) => !o)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                textAlign: 'center', width: 60, padding: 0,
                color: active ? 'var(--color-blue-dark)' : 'var(--color-text-muted)',
                fontFamily: 'var(--font-base)',
              }}
            >
              <div style={{
                fontSize: 19, lineHeight: 1.2,
                background: active ? 'var(--color-blue-light)' : 'transparent',
                borderRadius: 12, padding: '3px 12px', display: 'inline-block',
              }}>
                {tab.icon}
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, marginTop: 1 }}>{tab.label}</div>
            </button>
          );
        })}
      </nav>

      {/* ── "More" sheet ──────────────────────────────────────────────── */}
      {moreOpen && (
        <>
          <div
            onClick={() => setMoreOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 330 }}
          />
          <div className="pop-in" style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 340,
            maxWidth: 480, margin: '0 auto',
            background: '#fff', borderRadius: '28px 28px 0 0',
            padding: '14px 14px calc(20px + env(safe-area-inset-bottom))',
            boxShadow: '0 -20px 60px rgba(15,23,42,0.35)',
          }}>
            <div style={{
              width: 44, height: 5, borderRadius: 3,
              background: 'var(--color-gray-200)', margin: '0 auto 14px',
            }} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {moreItems.map((item) => (
                <button
                  key={item.label}
                  onClick={item.onClick}
                  style={{
                    border: 'none', cursor: 'pointer',
                    borderRadius: 18, padding: '14px 6px',
                    background: item.danger ? 'var(--color-red-light)' : 'var(--color-gray-100)',
                    color: item.danger ? 'var(--color-red)' : 'var(--color-gray-800)',
                    fontWeight: 900, fontSize: 11.5,
                    fontFamily: 'var(--font-base)',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Gallery manager popup (opened from the More sheet) */}
      {showGallery && <GalleryManager onClose={() => setShowGallery(false)} />}
    </>
  );
}
