import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Reusable "back to main page" icon button.
 * Drop it into any customer-facing header so the user can always get back
 * to the app's main info page (description, salon address/phone, admin
 * login) without losing their place.
 */
export default function AboutButton({ className = 'page-header__info', style }) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      className={className}
      style={style}
      onClick={() => navigate('/')}
      title="Main Page"
      aria-label="Back to Main Page"
    >
      ℹ️
    </button>
  );
}
