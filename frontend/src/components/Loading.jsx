import React from 'react';
import { useLang } from '../i18n/LanguageContext';

/**
 * Playful loader — bouncing scissors with animated dots.
 */
export default function Loading({ text, fullscreen = false }) {
  const { t } = useLang();
  if (text === undefined) text = t('loading');
  const content = (
    <>
      <div className="loader-scissors">✂️</div>
      <p style={{
        color: 'var(--color-text-muted)', fontSize: 14, fontWeight: 700,
      }}>
        {text}
      </p>
      <style>{loaderCSS}</style>
    </>
  );

  if (fullscreen) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'var(--color-bg)', zIndex: 999,
        gap: 16,
      }}>
        {content}
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '48px 24px', gap: 16,
    }}>
      {content}
    </div>
  );
}

const loaderCSS = `
  .loader-scissors {
    font-size: 44px;
    animation: loaderBounce 0.9s cubic-bezier(0.34, 1.4, 0.64, 1) infinite;
  }
  @keyframes loaderBounce {
    0%, 100% { transform: translateY(0) rotate(-8deg); }
    50%      { transform: translateY(-16px) rotate(10deg); }
  }
`;
