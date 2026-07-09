import React, { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../api/admin';
import Loading from '../components/Loading';
import { Message } from '../components/Message';
import { useLang } from '../i18n/LanguageContext';

const TYPE_LABEL = {
  BOYS_HAIRCUT:      { labelKey: 'boysHaircut',     icon: '💈', color: 'var(--color-blue)' },
  GIRLS_HAIR_DESIGN: { labelKey: 'girlsHairDesign', icon: '🎀', color: 'var(--color-pink)' },
};

export default function AdminBookingsPage() {
  const { t, locale } = useLang();
  const [bookings, setBookings]   = useState([]);
  const [custStats, setCustStats] = useState({});   // customer_id -> {total_visits, no_shows, last_visit}
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [msg, setMsg]             = useState('');
  const [canceling, setCanceling] = useState(null);

  const [filters, setFilters] = useState({
    date: '', appointment_type: '', status: '', search: '',
  });

  const load = useCallback(() => {
    setLoading(true);
    adminApi.getBookings(filters)
      .then(setBookings)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  // Customer history (visits / no-shows / last visit) — loaded once
  useEffect(() => {
    adminApi.getCustomerStats()
      .then((rows) => {
        const map = {};
        rows.forEach((r) => { map[r.customer_id] = r; });
        setCustStats(map);
      })
      .catch(() => {});
  }, []);

  const handleNoShow = async (b) => {
    const marking = !b.no_show;
    if (marking && !window.confirm(t('noShowConfirm'))) return;
    try {
      await adminApi.setNoShow(b.id, marking);
      setBookings((prev) => prev.map((x) => x.id === b.id ? { ...x, no_show: marking } : x));
    } catch (e) {
      setError(e.message);
    }
  };

  const handleFilterChange = (e) =>
    setFilters((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleCancel = async (bookingId) => {
    if (!window.confirm(t('cancelBookingConfirm'))) return;
    setCanceling(bookingId);
    try {
      await adminApi.cancelBooking(bookingId);
      setMsg(t('bookingCancelledMsg'));
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setCanceling(null);
    }
  };

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 16 }}>{t('allBookings')}</h1>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <div>
            <label className="form-label">{t('date')}</label>
            <input type="date" name="date" className="form-input"
              value={filters.date} onChange={handleFilterChange} />
          </div>
          <div>
            <label className="form-label">{t('status')}</label>
            <select name="status" className="form-input"
              value={filters.status} onChange={handleFilterChange}>
              <option value="">{t('all')}</option>
              <option value="booked">{t('booked')}</option>
              <option value="canceled">{t('cancelledBadge')}</option>
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 10 }}>
          <label className="form-label">{t('serviceType')}</label>
          <select name="appointment_type" className="form-input"
            value={filters.appointment_type} onChange={handleFilterChange}>
            <option value="">{t('all')}</option>
            <option value="BOYS_HAIRCUT">{t('boysHaircut')}</option>
            <option value="GIRLS_HAIR_DESIGN">{t('girlsHairDesign')}</option>
          </select>
        </div>
        <div>
          <label className="form-label">{t('searchLabel')}</label>
          <input type="text" name="search" className="form-input"
            placeholder={t('searchPlaceholder')}
            value={filters.search} onChange={handleFilterChange} />
        </div>
      </div>

      {msg   && <Message type="success" onClose={() => setMsg('')}>{msg}</Message>}
      {error && <Message type="error"   onClose={() => setError('')}>{error}</Message>}

      {loading ? <Loading /> : bookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">📋</div>
          <div className="empty-state__title">{t('noBookingsFound')}</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
            {bookings.length === 1 ? t('oneBookingFound') : t('nBookingsFound', { n: bookings.length })}
          </p>
          {bookings.map((b) => {
            const typeInfo = TYPE_LABEL[b.appointment_type] || {};
            return (
              <div key={b.id} className="card">
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 26 }}>{typeInfo.icon}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: typeInfo.color }}>
                        {typeInfo.labelKey ? t(typeInfo.labelKey) : b.appointment_type}
                      </div>
                      {b.slot && (
                        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                          {new Date(b.slot.date + 'T00:00:00').toLocaleDateString(locale, {
                            month: 'short', day: 'numeric',
                          })} · {b.slot.time.slice(0, 5)}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className={`badge badge--${b.status}`}>
                    {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                  </span>
                </div>

                {/* Customer info */}
                {b.customer && (
                  <div style={{
                    background: 'var(--color-gray-100)', borderRadius: 'var(--radius-md)',
                    padding: '10px 12px', fontSize: 13, marginBottom: 10,
                  }}>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                      👤 {b.customer.full_name}
                      {b.child && (
                        <span style={{ fontWeight: 800, color: 'var(--color-orange-dark)' }}>
                          {' '}· 👶 {b.child.name}
                        </span>
                      )}
                    </div>
                    <div>✉️ {b.customer.email || '—'}</div>
                    <div>📞 <span className="ltr-inline">{b.customer.phone}</span></div>

                    {/* Customer history */}
                    {custStats[b.customer.id] && (
                      <div style={{
                        display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8,
                        paddingTop: 8, borderTop: '1.5px solid var(--color-gray-200)',
                      }}>
                        <span className="badge badge--booked">
                          ✂️ {custStats[b.customer.id].total_visits} {t('visitsLabel')}
                        </span>
                        <span className="badge badge--done">
                          🗓️ {t('lastVisitLabel')}: {custStats[b.customer.id].last_visit
                            ? new Date(custStats[b.customer.id].last_visit + 'T00:00:00')
                                .toLocaleDateString(locale, { month: 'short', day: 'numeric' })
                            : t('neverLabel')}
                        </span>
                        {custStats[b.customer.id].no_shows > 0 && (
                          <span className="badge badge--canceled">
                            {t('noShowBadge', { n: custStats[b.customer.id].no_shows })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Cancel action */}
                {b.status === 'booked' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className="btn btn--danger btn--sm"
                      style={{ flex: 1 }}
                      disabled={canceling === b.id}
                      onClick={() => handleCancel(b.id)}
                    >
                      {canceling === b.id ? t('cancelling') : t('cancelBookingBtn')}
                    </button>
                    <button
                      className={`btn btn--sm ${b.no_show ? 'btn--secondary' : 'btn--outline'}`}
                      style={{ flex: 1 }}
                      onClick={() => handleNoShow(b)}
                    >
                      {b.no_show ? t('noShowUndo') : t('noShowBtn')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
