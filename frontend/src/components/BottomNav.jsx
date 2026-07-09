import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useLang } from '../i18n/LanguageContext';

/**
 * Curved bottom navigation with a floating "book now" scissors button
 * in the middle that gently bounces.
 */
export default function BottomNav() {
  const navigate = useNavigate();
  const { t } = useLang();

  const linkClass = ({ isActive }) =>
    `nav-item ${isActive ? 'nav-item--active' : ''}`;

  return (
    <nav className="bottom-nav">
      <NavLink to="/home" className={linkClass} end>
        <span className="nav-ico">🏠</span>
        <span>{t('navHome')}</span>
      </NavLink>

      <NavLink to="/my-appointments" className={linkClass}>
        <span className="nav-ico">📅</span>
        <span>{t('navBookings')}</span>
      </NavLink>

      <NavLink to="/gallery" className={linkClass}>
        <span className="nav-ico">📸</span>
        <span>{t('navGallery')}</span>
      </NavLink>

      <button
        className="nav-fab fab-bounce"
        onClick={() => navigate('/home')}
        aria-label={t('bookAppointment')}
      >
        ✂️
      </button>

      <NavLink to="/profile" className={linkClass}>
        <span className="nav-ico">👤</span>
        <span>{t('navProfile')}</span>
      </NavLink>
    </nav>
  );
}
