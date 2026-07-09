import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { authApi, saveAuth, clearAuth } from '../api/auth';
import { Message } from '../components/Message';
import { useLang } from '../i18n/LanguageContext';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { t } = useLang();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [resetOk, setResetOk] = useState(!!state?.resetSuccess);

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email || !form.password) {
      setError(t('fillAllFields'));
      return;
    }

    setLoading(true);
    try {
      const data = await authApi.login(form);
      if (data.role !== 'admin') {
        clearAuth();
        setError(t('adminOnly'));
        return;
      }
      saveAuth(data.access_token, data.user);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-wrapper" style={{ background: 'var(--grad-blue-deep)' }}>
      {/* Floating background bubbles */}
      <div className="bubble bubble--slow" style={{ width: 200, height: 200, top: -70, right: -60 }} />
      <div className="bubble bubble--orange bubble--fast" style={{ width: 110, height: 110, bottom: 60, left: -40 }} />
      <div className="bubble" style={{ width: 50, height: 50, top: 160, left: 40 }} />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '32px 24px', position: 'relative', zIndex: 2,
      }}>
        {/* Logo */}
        <div className="anim-in" style={{ textAlign: 'center', marginBottom: 30 }}>
          <div className="pop-in" style={{
            width: 88, height: 88, borderRadius: 30,
            background: 'var(--grad-sunny)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 44, margin: '0 auto 16px',
            boxShadow: 'var(--shadow-orange)',
          }}>
            <span className="wiggle">✂️</span>
          </div>
          {/* Salon name — intentionally NOT translated, it's the brand name */}
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff' }}>
            Kids Salon
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 4, fontWeight: 700 }}>
            {t('adminSignIn')}
          </p>
        </div>

        {/* Form card */}
        <div className="card anim-in anim-d2" style={{
          width: '100%', maxWidth: 400,
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 30px 80px rgba(15,23,42,0.4)',
        }}>
          {resetOk && <Message type="success" onClose={() => setResetOk(false)}>{t('resetSuccess')}</Message>}
          {error && <Message type="error" onClose={() => setError('')}>{error}</Message>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">{t('emailAddress')}</label>
              <input
                className="form-input"
                type="email"
                name="email"
                placeholder="admin@example.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('password')}</label>
              <input
                className="form-input"
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn--primary btn--full"
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? t('signingIn') : t('signIn')}
            </button>

            <p style={{ textAlign: 'center', marginTop: 14 }}>
              <Link
                to="/admin/forgot-password"
                style={{ color: 'var(--color-orange-dark)', fontWeight: 800, fontSize: 13.5, textDecoration: 'none' }}
              >
                {t('forgotPassword')}
              </Link>
            </p>
          </form>

          <div className="divider" />

          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--color-text-muted)', fontWeight: 700 }}>
            <Link to="/" style={{ color: 'var(--color-blue-dark)', fontWeight: 800, textDecoration: 'none' }}>
              {t('backToMain')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
