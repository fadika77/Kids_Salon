import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStoredUser, updateStoredUser, authApi } from '../api/auth';
import { bookingsApi } from '../api/bookings';
import { Message } from '../components/Message';
import AboutButton from '../components/AboutButton';
import { useLang } from '../i18n/LanguageContext';

export default function CustomerProfilePage() {
  const navigate = useNavigate();
  const { t, locale } = useLang();
  const [user, setUser]       = useState(getStoredUser());
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    email:     user?.email || '',
    phone:     user?.phone || '',
  });
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving]   = useState(false);
  const [children, setChildren]     = useState([]);
  const [newKidName, setNewKidName] = useState('');
  const [addingKid, setAddingKid]   = useState(false);

  useEffect(() => {
    bookingsApi.getChildren().then(setChildren).catch(() => {});
  }, []);

  const handleAddKid = async () => {
    const name = newKidName.trim();
    if (!name) return;
    setAddingKid(true);
    try {
      const kid = await bookingsApi.addChild(name);
      setChildren((prev) => [...prev, kid]);
      setNewKidName('');
    } catch (e) {
      setError(e.message);
    } finally {
      setAddingKid(false);
    }
  };

  const handleDeleteKid = async (kid) => {
    if (!window.confirm(t('deleteKidConfirm', { name: kid.name }))) return;
    try {
      await bookingsApi.deleteChild(kid.id);
      setChildren((prev) => prev.filter((k) => k.id !== kid.id));
    } catch (e) {
      setError(e.message);
    }
  };

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const startEditing = () => {
    setForm({
      full_name: user?.full_name || '',
      email:     user?.email || '',
      phone:     user?.phone || '',
    });
    setError('');
    setSuccess('');
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setError('');
  };

  const validate = () => {
    if (!form.full_name.trim()) return t('fullNameRequired');
    if (!form.phone.trim())     return t('phoneRequired');
    return null;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
      };
      if (form.email.trim()) payload.email = form.email.trim();

      const updated = await authApi.updateMe(payload);
      updateStoredUser(updated);
      setUser(updated);
      setSuccess(t('profileUpdated'));
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const firstLetter = user?.full_name?.charAt(0)?.toUpperCase() || '?';

  return (
    // Rendered inside CustomerRoute, which provides .app-wrapper + BottomNav
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* ── Gradient header with avatar ─────────────────────────────── */}
      <div className="hero hero--compact" style={{ paddingBottom: 60, textAlign: 'center' }}>
        <div className="bubble bubble--slow" style={{ width: 150, height: 150, top: -50, right: -40 }} />
        <div className="bubble bubble--orange bubble--fast" style={{ width: 80, height: 80, bottom: -20, left: -20 }} />
        <div style={{ position: 'absolute', top: 18, right: 18 }}>
          <AboutButton style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }} />
        </div>

        <div className="pop-in" style={{
          width: 86, height: 86, borderRadius: '50%',
          background: 'var(--grad-sunny)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 38, margin: '14px auto 12px', color: '#fff', fontWeight: 900,
          border: '4px solid rgba(255,255,255,0.85)',
          boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
        }}>
          {firstLetter}
        </div>
        <h1 style={{ fontSize: 22 }}>{user?.full_name}</h1>
        <p className="hero-sub">{t('customerAccount')}</p>
      </div>

      <div className="page" style={{ paddingTop: 24 }}>
        {success && (
          <Message type="success" onClose={() => setSuccess('')}>{success}</Message>
        )}

        {editing ? (
          /* ── Edit form ──────────────────────────────────────────────── */
          <form onSubmit={handleSave} className="card anim-in" style={{ marginBottom: 24, borderRadius: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 900, marginBottom: 16 }}>
              {t('editProfileDetails')}
            </h3>

            {error && <Message type="error" onClose={() => setError('')}>{error}</Message>}

            <div className="form-group">
              <label className="form-label">{t('fullName')}</label>
              <input
                className="form-input" type="text" name="full_name"
                value={form.full_name} onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                {t('emailAddress')}{' '}
                <span style={{ fontWeight: 500, color: 'var(--color-text-muted)', fontSize: 12 }}>
                  ({t('optional')})
                </span>
              </label>
              <input
                className="form-input" type="email" name="email"
                placeholder="you@example.com"
                value={form.email} onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t('phoneNumber')}</label>
              <input
                className="form-input" type="tel" name="phone"
                value={form.phone} onChange={handleChange}
              />
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                type="button"
                className="btn btn--secondary"
                style={{ flex: 1 }}
                onClick={cancelEditing}
                disabled={saving}
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                className="btn btn--primary"
                style={{ flex: 1 }}
                disabled={saving}
              >
                {saving ? t('saving') : t('saveChanges')}
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Info card */}
            <div className="card anim-in anim-d1" style={{ marginBottom: 16, borderRadius: 24 }}>
              <InfoRow icon="✉️" label={t('email')}  value={user?.email} />
              <InfoRow icon="📞" label={t('phone')}  value={user?.phone} />
              <InfoRow icon="📅" label={t('memberSince')} last value={
                user?.created_at
                  ? new Date(user.created_at).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
                  : '—'
              } />
            </div>

            {/* Kids profiles */}
            <div className="card anim-in anim-d2" style={{ marginBottom: 16, borderRadius: 24 }}>
              <h3 style={{ fontSize: 15, fontWeight: 900, marginBottom: 12 }}>{t('myKids')}</h3>
              {children.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  {children.map((kid) => (
                    <span
                      key={kid.id}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        padding: '7px 12px', borderRadius: 14, fontWeight: 800, fontSize: 13.5,
                        background: 'var(--color-orange-light)', color: 'var(--color-orange-dark)',
                        border: '2px solid var(--color-orange-soft)',
                      }}
                    >
                      👶 {kid.name}
                      <button
                        onClick={() => handleDeleteKid(kid)}
                        style={{
                          border: 'none', background: 'none', cursor: 'pointer',
                          color: 'var(--color-red)', fontWeight: 900, fontSize: 13,
                          padding: 0, lineHeight: 1,
                        }}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  type="text"
                  placeholder={t('kidNamePlaceholder')}
                  value={newKidName}
                  onChange={(e) => setNewKidName(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn--secondary btn--sm"
                  onClick={handleAddKid}
                  disabled={addingKid || !newKidName.trim()}
                  style={{ alignSelf: 'stretch' }}
                >
                  + {t('addKidBtn')}
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="card anim-in anim-d3" style={{ marginBottom: 24, borderRadius: 24, padding: '8px 20px' }}>
              <ActionRow icon="✏️" label={t('editProfile')}     onClick={startEditing} />
              <ActionRow icon="📅" label={t('myAppointments')}  onClick={() => navigate('/my-appointments')} />
              <ActionRow icon="✂️" label={t('bookAppointment')} onClick={() => navigate('/home')} last />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value, last = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '12px 0',
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
        <div style={{ fontSize: 15, fontWeight: 800 }}>{value || '—'}</div>
      </div>
    </div>
  );
}

function ActionRow({ icon, label, onClick, last = false }) {
  return (
    <button
      style={{
        width: '100%', background: 'none', border: 'none',
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px 0', cursor: 'pointer',
        fontSize: 15, color: 'var(--color-gray-800)',
        borderBottom: last ? 'none' : '1.5px solid var(--color-gray-100)',
        fontFamily: 'var(--font-base)',
      }}
      onClick={onClick}
    >
      <div style={{
        width: 40, height: 40, borderRadius: 14, flexShrink: 0,
        background: 'var(--color-orange-light)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
      }}>{icon}</div>
      <span style={{ fontWeight: 800 }}>{label}</span>
      <span className="chev" style={{ marginInlineStart: 'auto', color: 'var(--color-gray-400)', fontSize: 20, fontWeight: 800 }}>›</span>
    </button>
  );
}
