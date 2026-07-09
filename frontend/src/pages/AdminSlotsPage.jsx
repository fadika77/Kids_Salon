import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi } from '../api/admin';
import Loading from '../components/Loading';
import { Message } from '../components/Message';
import { useLang } from '../i18n/LanguageContext';
import { todayISO } from '../utils/dates';

const TYPE_LABEL = {
  BOYS_HAIRCUT:      { labelKey: 'boysHaircut',     icon: '💈' },
  GIRLS_HAIR_DESIGN: { labelKey: 'girlsHairDesign', icon: '🎀' },
};

export default function AdminSlotsPage() {
  const navigate = useNavigate();
  const { t } = useLang();
  const today    = todayISO();

  const [filterDate, setFilterDate] = useState(today);
  const [slots, setSlots]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [deleting, setDeleting] = useState(null);
  const [msg, setMsg] = useState('');

  const load = (date) => {
    setLoading(true);
    adminApi.getSlots(date)
      .then(setSlots)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(filterDate); }, [filterDate]);

  const handleDelete = async (slot) => {
    if (slot.status === 'booked') {
      if (!window.confirm(
        t('forceDeleteConfirm', { name: slot.booking?.customer?.full_name || t('aCustomer') })
      )) return;
      setDeleting(slot.id);
      try {
        await adminApi.deleteSlot(slot.id, true);
        setMsg(t('slotDeletedNotified'));
        load(filterDate);
      } catch (e) { setError(e.message); }
      finally { setDeleting(null); }
    } else {
      if (!window.confirm(t('deleteSlotConfirm'))) return;
      setDeleting(slot.id);
      try {
        await adminApi.deleteSlot(slot.id, false);
        setMsg(t('slotDeleted'));
        load(filterDate);
      } catch (e) { setError(e.message); }
      finally { setDeleting(null); }
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>{t('slotsTitle')}</h1>
        <button className="btn btn--primary btn--sm" onClick={() => navigate('/admin/slots/create')}>
          {t('addSlotBtn')}
        </button>
      </div>

      {/* Date filter */}
      <div className="card" style={{ marginBottom: 16 }}>
        <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>{t('filterByDate')}</label>
        <input
          type="date" className="form-input"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
      </div>

      {msg   && <Message type="success" onClose={() => setMsg('')}>{msg}</Message>}
      {error && <Message type="error"   onClose={() => setError('')}>{error}</Message>}

      {loading ? <Loading /> : slots.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">🗓️</div>
          <div className="empty-state__title">{t('noSlotsDate')}</div>
          <button className="btn btn--primary" style={{ marginTop: 16 }} onClick={() => navigate('/admin/slots/create')}>
            {t('createSlotBtn')}
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {slots.map((slot) => {
            const booking = slot.booking;
            const typeInfo = booking ? TYPE_LABEL[booking.appointment_type] || {} : {};
            return (
              <div key={slot.id} className="card">
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{slot.time.slice(0, 5)}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      {slot.duration_minutes} {t('min')}{slot.notes ? ` · ${slot.notes}` : ''}
                    </div>
                  </div>
                  <span className={`badge badge--${slot.status}`}>
                    {slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}
                  </span>
                </div>

                {/* Booking info */}
                {booking && (
                  <div style={{
                    background: 'var(--color-blue-light)',
                    borderRadius: 'var(--radius-md)',
                    padding: '10px 12px', marginBottom: 10, fontSize: 13,
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                      {typeInfo.icon} {typeInfo.labelKey ? t(typeInfo.labelKey) : ''}
                    </div>
                    <div>👤 {booking.customer?.full_name}</div>
                    <div>✉️ {booking.customer?.email}</div>
                    <div>📞 {booking.customer?.phone}</div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="btn btn--outline btn--sm"
                    style={{ flex: 1 }}
                    onClick={() => navigate(`/admin/slots/edit/${slot.id}`, { state: { slot } })}
                  >
                    {t('edit')}
                  </button>
                  <button
                    className="btn btn--danger btn--sm"
                    style={{ flex: 1 }}
                    disabled={deleting === slot.id}
                    onClick={() => handleDelete(slot)}
                  >
                    {deleting === slot.id ? t('deleting') : t('delete')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
