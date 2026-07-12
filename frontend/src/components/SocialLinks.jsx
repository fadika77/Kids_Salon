import React from 'react';
import { SOCIAL } from '../config/social';

/**
 * Instagram + Facebook buttons linking to the salon's social pages.
 * Links open in the device browser (target="_blank"); an icon is hidden
 * automatically if its URL is empty in src/config/social.js.
 *
 * Usage:  <SocialLinks />            — icons only, centered
 *         <SocialLinks label="..." /> — with a small heading above
 */
export default function SocialLinks({ label = '', size = 46, style = {} }) {
  const items = [
    SOCIAL.instagram && !SOCIAL.instagram.includes('YOUR_') && {
      key: 'instagram',
      url: SOCIAL.instagram,
      title: 'Instagram',
      background: 'radial-gradient(circle at 30% 110%, #fdf497 0%, #fd5949 45%, #d6249f 60%, #285AEB 90%)',
      icon: (
        <svg viewBox="0 0 24 24" width="55%" height="55%" fill="none"
             stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5.5" />
          <circle cx="12" cy="12" r="4.5" />
          <circle cx="17.6" cy="6.4" r="1.3" fill="#fff" stroke="none" />
        </svg>
      ),
    },
    SOCIAL.facebook && !SOCIAL.facebook.includes('YOUR_') && {
      key: 'facebook',
      url: SOCIAL.facebook,
      title: 'Facebook',
      background: '#1877F2',
      icon: (
        <svg viewBox="0 0 24 24" width="58%" height="58%" fill="#fff">
          <path d="M13.5 21v-7h2.6l.5-3.2h-3.1V8.7c0-.93.3-1.7 1.8-1.7h1.4V4.1c-.3 0-1.2-.1-2.2-.1-2.4 0-4 1.4-4 4.2v2.6H8v3.2h2.5v7h3z" />
        </svg>
      ),
    },
    SOCIAL.tiktok && !SOCIAL.tiktok.includes('YOUR_') && {
      key: 'tiktok',
      url: SOCIAL.tiktok,
      title: 'TikTok',
      background: '#010101',
      icon: (
        <svg viewBox="0 0 24 24" width="55%" height="55%" fill="#fff">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
      ),
    },
  ].filter(Boolean);

  if (items.length === 0) return null;   // no links configured yet

  return (
    <div style={{ textAlign: 'center', ...style }}>
      {label && (
        <div style={{
          fontSize: 13, fontWeight: 800, color: 'var(--color-text-muted)',
          marginBottom: 10,
        }}>
          {label}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 14 }}>
        {items.map((it) => (
          <a
            key={it.key}
            href={it.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={it.title}
            title={it.title}
            style={{
              width: size, height: size, borderRadius: size * 0.32,
              background: it.background,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-md)',
              textDecoration: 'none',
              transition: 'transform .15s ease',
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.92)'; }}
            onMouseUp={(e)   => { e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            {it.icon}
          </a>
        ))}
      </div>
    </div>
  );
}
