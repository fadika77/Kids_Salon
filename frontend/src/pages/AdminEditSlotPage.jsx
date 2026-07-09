import React, { useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { adminApi } from '../api/admin';
import { Message } from '../components/Message';
import { useLang } from '../i18n/LanguageContext';

export default function AdminEditSlotPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const { id }   = useParams();
  const { state } = useLocation();
  const slot     = state?.slot;

  const [form, setForm] = useState({
    date:             slot?.date || '',
    time:             slot?.time?.slice(0, 5) || '',
    duration_minutes: slot?.duration_minutes || 30,
    notes:            slot?.notes || '',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  if (!slot) {
    navigate('/admin/slots');
    return null;
  }

  const isBooked = slot.status === 'booked';

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.date || !form.time) { setError(t('dateTimeRequired')); return; }

    let force = false;
    if (isBooked) {
      const ok = window.confirm(t('editBookedConfirm'));
      if (!ok) return;
      force = true;
    }

    setError(''); setLoading(true);
    try {
      await adminApi.updateSlot(id, {
        date:             form.date,
        time:             form.time,
        duration_minutes: Number(form.duration_minutes),
        notes:            form.notes || null,
      }, force);
      navigate('/admin/slots');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="page-header__back" onClick={() => navigate('/admin/slots')}><span className="chev">‹</span></button>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>{t('editSlotTitle')}</h1>
      </div>

      {isBooked && (
        <Message type="warning">
          {t('slotBookedWarning')}
        </Message>
      )}

      {error && <Message type="error" onClose={() => setError('')}>{error}</Message>}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">{t('dateRequired')}</label>
            <input
              type="date" name="date" className="form-input"
              value={form.date} onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('timeRequired')}</label>
            <input
              type="time" name="time" className="form-input"
              value={form.time} onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">{t('durationMinutes')}</label>
            <select name="duration_minutes" className="form-input" value={form.duration_minutes} onChange={handleChange}>
              <option value={15}>{t('m15')}</option>
              <option value={30}>{t('m30')}</option>
              <option value={45}>{t('m45')}</option>
              <option value={60}>{t('m60')}</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">{t('notesOptional')}</label>
            <input
              type="text" name="notes" className="form-input"
              placeholder={t('notesOptional')}
              value={form.notes} onChange={handleChange}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" className="btn btn--primary" style={{ flex: 1 }} disabled={loading}>
              {loading ? t('saving') : t('saveChanges')}
            </button>
            <button type="button" className="btn btn--secondary" onClick={() => navigate('/admin/slots')}>
              {t('cancel')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
