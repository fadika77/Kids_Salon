import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import { Message } from '../components/Message';
import { useLang } from '../i18n/LanguageContext';

/**
 * Admin "forgot password" flow — 2 steps on one page:
 *   Step 1: enter admin email → backend emails a 6-digit reset code
 *   Step 2: enter the code + new password → password is reset
 */
export default function AdminForgotPasswordPage() {
  const navigate = useNavigate();
  const { t } = useLang();

  const [step, setStep]       = useState(1);
  const [email, setEmail]     = useState('');
  const [code, setCode]       = useState('');
  const [newPass, setNewPass] = useState('');
  const [error, setError]     = useState('');
  const [info, setInfo]       = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError(t('fillAllFields')); return; }

    setLoading(true);
    try {
      await authApi.forgotPassword({ email: email.trim() });
      setInfo(t('codeSentMsg'));
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    if (!code.trim() || !newPass) { setError(t('codeRequired')); return; }
    if (newPass.length < 6)       { setError(t('passwordTooShort')); return; }

    setLoading(true);
    try {
      await authApi.resetPassword({
        email: email.trim(),
        code: code.trim(),
        new_password: newPass,
      });
      // Success → back to login with a success flag
      navigate('/admin/login', { state: { resetSuccess: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-wrapper" style={{ background: 'var(--grad-blue-deep)' }}>
      <div className="bubble bubble--slow" style={{ width: 200, height: 200, top: -70, right: -60 }} />
      <div className="bubble bubble--orange bubble--fast" style={{ width: 110, height: 110, bottom: 60, left: -40 }} />

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
            <span className="wiggle">🔑</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>
            {t('resetTitle')}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 6, fontWeight: 700, maxWidth: 300 }}>
            {t('resetSub')}
          </p>
        </div>

        {/* Card */}
        <div className="card anim-in anim-d2" style={{
          width: '100%', maxWidth: 400,
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 30px 80px rgba(15,23,42,0.4)',
        }}>
          {info  && <Message type="info"  onClose={() => setInfo('')}>{info}</Message>}
          {error && <Message type="error" onClose={() => setError('')}>{error}</Message>}

          {step === 1 ? (
            /* ── Step 1: email ─────────────────────────────────────── */
            <form onSubmit={handleSendCode}>
              <div className="form-group">
                <label className="form-label">{t('emailAddress')}</label>
                <input
                  className="form-input"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <button
                type="submit"
                className="btn btn--primary btn--full"
                disabled={loading}
                style={{ marginTop: 8 }}
              >
                {loading ? t('sendingCode') : `📨 ${t('sendCode')}`}
              </button>
            </form>
          ) : (
            /* ── Step 2: code + new password ───────────────────────── */
            <form onSubmit={handleReset}>
              <div className="form-group">
                <label className="form-label">{t('resetCodeLabel')}</label>
                <input
                  className="form-input ltr-inline"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder={t('codePlaceholder')}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  style={{ textAlign: 'center', letterSpacing: 8, fontWeight: 900, fontSize: 20 }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('newPassword')}</label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="••••••••"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="btn btn--accent btn--full"
                disabled={loading}
                style={{ marginTop: 8 }}
              >
                {loading ? t('resetting') : `🔑 ${t('resetBtn')}`}
              </button>

              <button
                type="button"
                className="btn btn--secondary btn--full"
                style={{ marginTop: 10 }}
                onClick={() => { setStep(1); setError(''); }}
                disabled={loading}
              >
                {t('back')}
              </button>
            </form>
          )}

          <div className="divider" />

          <p style={{ textAlign: 'center', fontSize: 14, fontWeight: 700 }}>
            <Link to="/admin/login" style={{ color: 'var(--color-blue-dark)', fontWeight: 800, textDecoration: 'none' }}>
              {t('backToLogin')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
