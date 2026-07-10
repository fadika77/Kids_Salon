import React, { useState } from 'react';
import { authApi, saveAuth, getCustomerProfile } from '../api/auth';
import { Message } from './Message';
import { useLang } from '../i18n/LanguageContext';

/**
 * Full-screen, non-dismissable modal shown the very first time the app is
 * opened on a device. Collects the customer's name/email/phone, registers
 * (or re-links) a passwordless device identity on the backend, then calls
 * onComplete() so the parent can re-render as "known user".
 */
export default function FirstRunModal({ onComplete }) {
  const { t } = useLang();
  // If this device already saved a profile (e.g. the silent session restore
  // failed because of a network hiccup), pre-fill the fields so the user
  // never has to re-type their details.
  const [form, setForm] = useState(() => {
    const saved = getCustomerProfile();
    return {
      full_name: saved?.full_name || '',
      email:     saved?.email     || '',
      phone:     saved?.phone     || '',
    };
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!form.full_name.trim()) return t('fullNameRequired');
    if (!form.phone.trim())     return t('phoneRequired');
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      const data = await authApi.deviceRegister({
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim(),
      });
      saveAuth(data.access_token, data.user);
      onComplete(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'linear-gradient(160deg, rgba(30,58,138,0.75), rgba(37,99,235,0.65))',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div className="card pop-in" style={{
        width: '100%', maxWidth: 400,
        borderRadius: 'var(--radius-xl)',
        boxShadow: '0 30px 80px rgba(15,23,42,0.4)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{
            width: 76, height: 76, borderRadius: 26,
            background: 'var(--grad-sunny)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 38, margin: '0 auto 14px',
            boxShadow: 'var(--shadow-orange)',
          }}>
            <span className="wiggle">✂️</span>
          </div>
          <h2 style={{ fontSize: 21, fontWeight: 900 }}>{t('welcomeTitle')}</h2>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 14, marginTop: 6, fontWeight: 600 }}>
            {t('welcomeSub')}
          </p>
        </div>

        {error && <Message type="error" onClose={() => setError('')}>{error}</Message>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('fullName')}</label>
            <input
              className="form-input" type="text" name="full_name"
              placeholder="Jane Doe"
              value={form.full_name} onChange={handleChange}
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              {t('emailAddress')}{' '}
              <span style={{ fontWeight: 500, color: 'var(--color-text-muted)', fontSize: 12 }}>
                {t('emailHint')}
              </span>
            </label>
            <input
              className="form-input" type="email" name="email"
              placeholder="you@example.com"
              value={form.email} onChange={handleChange}
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('phoneNumber')}</label>
            <input
              className="form-input" type="tel" name="phone"
              placeholder="(555) 123-4567"
              value={form.phone} onChange={handleChange}
              autoComplete="tel"
            />
          </div>

          <button
            type="submit"
            className="btn btn--accent btn--full"
            disabled={loading}
            style={{ marginTop: 8 }}
          >
            {loading ? t('gettingSetUp') : t('letsStart')}
          </button>
        </form>
      </div>
    </div>
  );
}