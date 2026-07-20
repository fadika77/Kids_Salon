import React, { useEffect, useRef, useState } from 'react';
import { adminApi } from '../api/admin';
import { bookingsApi } from '../api/bookings';
import { BASE_URL } from '../api/api';
import { Message } from './Message';
import { useLang } from '../i18n/LanguageContext';

// Cloud images come as full https URLs; local ones as /uploads/... paths
const imgSrc = (url) => (url?.startsWith('http') ? url : `${BASE_URL}${url}`);

/**
 * Admin gallery manager — a popup opened from the dashboard.
 * Lets the admin upload a picture from the device OR take one with the
 * camera (the file input's `capture` hint opens the camera on mobile),
 * and delete existing pictures.
 */
export default function GalleryManager({ onClose }) {
  const { t } = useLang();
  const galleryRef = useRef(null);   // opens the photo gallery / file picker
  const cameraRef  = useRef(null);   // opens the camera directly (mobile)

  const [images, setImages]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');

  const load = () => {
    bookingsApi.getGallery()
      .then(setImages)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';   // allow re-selecting the same file
    if (!file) return;

    setError(''); setUploading(true);
    try {
      await adminApi.uploadGalleryImage(file);
      setSuccess(t('photoAdded'));
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('deletePhotoConfirm'))) return;
    try {
      await adminApi.deleteGalleryImage(id);
      setImages((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1200,
      background: 'rgba(15, 23, 42, 0.6)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div className="anim-in" style={{
        width: '100%', maxWidth: 480, maxHeight: '88vh',
        background: 'var(--color-bg)',
        borderRadius: '28px 28px 0 0',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px 12px',
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 900 }}>{t('manageGallery')}</h2>
          <button
            onClick={onClose}
            style={{
              width: 38, height: 38, borderRadius: 13, border: 'none',
              background: 'var(--color-gray-100)', cursor: 'pointer',
              fontSize: 16, fontWeight: 900, color: 'var(--color-gray-800)',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '0 20px 24px', overflowY: 'auto' }}>
          {error   && <Message type="error"   onClose={() => setError('')}>{error}</Message>}
          {success && <Message type="success" onClose={() => setSuccess('')}>{success}</Message>}

          {/* Two hidden inputs:
              - WITHOUT capture -> opens the phone's gallery / file picker
              - WITH capture    -> opens the camera directly on mobile      */}
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleFile}
          />
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handleFile}
          />

          <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
            <button
              className="btn btn--primary"
              onClick={() => galleryRef.current?.click()}
              disabled={uploading}
              style={{ flex: 1, fontSize: 14 }}
            >
              {uploading ? t('uploadingPhoto') : t('chooseFromGallery')}
            </button>
            <button
              className="btn btn--accent"
              onClick={() => cameraRef.current?.click()}
              disabled={uploading}
              style={{ flex: 1, fontSize: 14 }}
            >
              {uploading ? t('uploadingPhoto') : t('takePhoto')}
            </button>
          </div>

          {loading ? (
            <p style={{ textAlign: 'center', fontWeight: 700, color: 'var(--color-text-muted)' }}>
              {t('loadingGallery')}
            </p>
          ) : images.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 12px' }}>
              <div className="empty-state__icon">📸</div>
              <div className="empty-state__title">{t('noPhotos')}</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
              {images.map((img) => (
                <div key={img.id} style={{ position: 'relative' }}>
                  <img
                    src={imgSrc(img.url)}
                    alt="Haircut"
                    loading="lazy"
                    style={{
                      width: '100%', aspectRatio: '1 / 1', objectFit: 'cover',
                      borderRadius: 14, display: 'block',
                      boxShadow: 'var(--shadow-sm)',
                    }}
                  />
                  <button
                    onClick={() => handleDelete(img.id)}
                    style={{
                      position: 'absolute', top: 6, insetInlineEnd: 6,
                      width: 28, height: 28, borderRadius: 10, border: 'none',
                      background: 'rgba(239, 68, 68, 0.92)', color: '#fff',
                      fontSize: 13, fontWeight: 900, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
