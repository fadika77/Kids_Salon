import React, { useEffect, useState } from 'react';
import { adminApi } from '../api/admin';
import Loading from '../components/Loading';
import { Message } from '../components/Message';
import { useLang } from '../i18n/LanguageContext';

export default function AdminSettingsPage() {
  const { t } = useLang();
  const [form, setForm]       = useState({ shop_name: '', admin_email: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    adminApi.getSettings()
      .then((s) => setForm({ shop_name: s.shop_name || '', admin_email: s.admin_email || '', phone: s.phone || '' }))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.shop_name || !form.admin_email) {
      setError(t('settingsRequired'));
      return;
    }
    setError(''); setSaving(true);
    try {
      await adminApi.updateSettings(form);
      setSuccess(t('settingsSaved'));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24 }}>{t('settingsTitle')}</h1>

      {error   && <Message type="error"   onClose={() => setError('')}>{error}</Message>}
      {success && <Message type="success" onClose={() => setSuccess('')}>{success}</Message>}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('shopNameLabel')}</label>
            <input
              type="text" name="shop_name" className="form-input"
              placeholder="Kids Salon"
              value={form.shop_name} onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('adminEmailLabel')}</label>
            <input
              type="email" name="admin_email" className="form-input"
              placeholder="admin@example.com"
              value={form.admin_email} onChange={handleChange}
            />
            <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
              {t('adminEmailHint')}
            </span>
          </div>

          <div className="form-group">
            <label className="form-label">{t('phoneOptionalLabel')}</label>
            <input
              type="tel" name="phone" className="form-input"
              placeholder="+1 234 567 8900"
              value={form.phone} onChange={handleChange}
            />
          </div>

          <button type="submit" className="btn btn--primary btn--full" disabled={saving}>
            {saving ? t('saving') : t('saveSettings')}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginTop: 16, background: 'var(--color-blue-light)' }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-blue-dark)', marginBottom: 8 }}>
          {t('emailConfigTitle')}
        </h3>
        <p style={{ fontSize: 13, color: 'var(--color-blue-dark)' }}>
          {t('emailConfigText')}
        </p>
      </div>
    </div>
  );
}
