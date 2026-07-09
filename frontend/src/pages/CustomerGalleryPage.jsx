import React, { useEffect, useState } from 'react';
import { bookingsApi } from '../api/bookings';
import { BASE_URL } from '../api/api';
import Loading from '../components/Loading';
import { Message } from '../components/Message';
import AboutButton from '../components/AboutButton';
import { useLang } from '../i18n/LanguageContext';

/**
 * Customer-facing gallery — all the haircut photos the admin uploaded,
 * in a 2-column grid with a full-screen viewer on tap.
 */
export default function CustomerGalleryPage() {
  const { t } = useLang();
  const [images, setImages]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [viewing, setViewing] = useState(null);   // image being viewed full-screen

  useEffect(() => {
    bookingsApi.getGallery()
      .then(setImages)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    // Rendered inside CustomerRoute (provides .app-wrapper + BottomNav)
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1 }}>
      {/* ── Gradient header ──────────────────────────────────────────── */}
      <div className="hero hero--compact">
        <div className="bubble bubble--slow" style={{ width: 150, height: 150, top: -50, right: -40 }} />
        <span className="float-emoji" style={{ top: 30, right: 90, fontSize: 20 }}>📸</span>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 24, marginTop: 8 }}>{t('galleryTitle')}</h1>
            <p className="hero-sub">{t('gallerySub')}</p>
          </div>
          <AboutButton style={{ background: 'rgba(255,255,255,0.2)', color: '#fff' }} />
        </div>
      </div>

      <div className="page" style={{ paddingTop: 20 }}>
        {error && <Message type="error" onClose={() => setError('')}>{error}</Message>}

        {loading ? (
          <Loading text={t('loadingGallery')} />
        ) : images.length === 0 ? (
          <div className="empty-state anim-in">
            <div className="empty-state__icon">📸</div>
            <div className="empty-state__title">{t('noPhotos')}</div>
            <p style={{ fontSize: 14, marginTop: 8, fontWeight: 600 }}>{t('noPhotosSub')}</p>
          </div>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
          }}>
            {images.map((img, i) => (
              <button
                key={img.id}
                className={`anim-in anim-d${Math.min(i + 1, 6)}`}
                onClick={() => setViewing(img)}
                style={{
                  border: 'none', padding: 0, cursor: 'pointer',
                  borderRadius: 20, overflow: 'hidden',
                  boxShadow: 'var(--shadow-md)', background: 'var(--color-gray-100)',
                  aspectRatio: '1 / 1',
                }}
              >
                <img
                  src={`${BASE_URL}${img.url}`}
                  alt="Haircut"
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Full-screen viewer ─────────────────────────────────────────── */}
      {viewing && (
        <div
          onClick={() => setViewing(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1500,
            background: 'rgba(15, 23, 42, 0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16, cursor: 'zoom-out',
          }}
        >
          <img
            src={`${BASE_URL}${viewing.url}`}
            alt="Haircut"
            className="pop-in"
            style={{
              maxWidth: '100%', maxHeight: '90vh',
              borderRadius: 20, boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
            }}
          />
        </div>
      )}
    </div>
  );
}
