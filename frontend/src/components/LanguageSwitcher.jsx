import React, { useState, useRef, useEffect } from 'react';
import { useLang } from '../i18n/LanguageContext';
import { LANGUAGES } from '../i18n/translations';

/**
 * Floating language switcher, rendered ONCE in App.jsx so it is visible
 * on every page (customer, admin, main page, booking flow…).
 *
 * A round 🌐 button floats near the bottom corner; tapping it opens a
 * small menu with the 3 languages. Choosing one switches the whole app
 * instantly (and flips direction to RTL for Hebrew/Arabic).
 */
export default function LanguageSwitcher() {
  const { lang, setLang, t } = useLang();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Close when tapping anywhere outside
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <div ref={wrapRef} className="lang-switcher">
      {/* Options menu */}
      {open && (
        <div className="lang-menu pop-in">
          <div className="lang-menu__title">🌐 {t('language')}</div>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              className={`lang-option ${l.code === lang ? 'lang-option--active' : ''}`}
              onClick={() => { setLang(l.code); setOpen(false); }}
            >
              <span style={{ fontSize: 18 }}>{l.flag}</span>
              <span>{l.name}</span>
              {l.code === lang && <span className="lang-check">✓</span>}
            </button>
          ))}
        </div>
      )}

      {/* Floating button */}
      <button
        className="lang-fab"
        onClick={() => setOpen((o) => !o)}
        aria-label={t('language')}
      >
        <span style={{ fontSize: 20 }}>🌐</span>
        <span className="lang-fab__code">{current.code.toUpperCase()}</span>
      </button>
    </div>
  );
}
