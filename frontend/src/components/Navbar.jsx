import React from 'react';

/**
 * Slim admin top bar — brand only.
 * All navigation moved to the bottom tab bar (AdminBottomNav).
 */
export default function Navbar() {
  return (
    <header style={{
      background: 'var(--grad-blue-deep)',
      color: '#fff',
      position: 'sticky', top: 0, zIndex: 100,
      boxShadow: '0 8px 24px rgba(30,58,138,0.25)',
    }}>
      <div style={{
        maxWidth: 480,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '13px 16px',
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 13,
          background: 'rgba(255,255,255,0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 19,
        }}>✂️</div>
        {/* Salon name — intentionally NOT translated, it's the brand name */}
        <span style={{ fontWeight: 900, fontSize: 17, letterSpacing: -0.3 }}>
          Kids Salon
        </span>
      </div>
    </header>
  );
}
