import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, LANGUAGES } from './translations';

/**
 * Global language state.
 *
 * - Persists the chosen language to localStorage, so it applies to the
 *   WHOLE app (every page) and survives restarts.
 * - Sets <html dir="rtl|ltr" lang="..."> so Hebrew & Arabic render
 *   right-to-left everywhere automatically.
 *
 * Usage in any component:
 *   const { t, lang, setLang, dir, locale } = useLang();
 *   <h1>{t('myAppointments')}</h1>
 */
const LanguageContext = createContext(null);

const STORAGE_KEY = 'app_language';

function getInitialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && translations[saved]) return saved;
  } catch { /* ignore */ }
  return 'en';
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLang);

  const meta   = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];
  const dir    = meta.dir;
  const locale = meta.locale;

  // Apply direction + language to the whole document
  useEffect(() => {
    document.documentElement.dir  = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  const setLang = useCallback((code) => {
    if (!translations[code]) return;
    setLangState(code);
    try { localStorage.setItem(STORAGE_KEY, code); } catch { /* ignore */ }
  }, []);

  const t = useCallback((key, vars) => {
    let str = translations[lang]?.[key] ?? translations.en[key] ?? key;
    if (vars) {
      Object.entries(vars).forEach(([k, v]) => {
        str = str.split(`{${k}}`).join(String(v));
      });
    }
    return str;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir, locale, isRTL: dir === 'rtl' }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside <LanguageProvider>');
  return ctx;
}
