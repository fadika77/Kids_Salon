import api from './api';

export const authApi = {
  register:       (data) => api.post('/auth/register', data),
  login:          (data) => api.post('/auth/login', data),
  deviceRegister: (data) => api.post('/auth/device-register', data),
  me:             ()     => api.get('/auth/me'),
  updateMe:       (data) => api.put('/auth/me', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword:  (data) => api.post('/auth/reset-password', data),
};

// ── Auth state helpers ───────────────────────────────────────────────────
//
// Two storage layers:
//   token / user        → the CURRENT session (cleared on logout)
//   device_customer     → the customer profile remembered on THIS DEVICE.
//                         It survives logout (even admin logins/logouts),
//                         so the "enter your details" popup only ever
//                         appears once per device.

export function saveAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));

  // Remember customer details permanently on this device
  if (user?.role === 'customer') {
    saveCustomerProfile(user);
  }
}

export function clearAuth() {
  // NOTE: intentionally does NOT remove 'device_customer' —
  // the customer profile stays on the device forever.
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

export function updateStoredUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
  if (user?.role === 'customer') {
    saveCustomerProfile(user);
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return !!localStorage.getItem('token');
}

// ── Device customer profile (persists across logouts) ───────────────────
export function saveCustomerProfile(user) {
  try {
    localStorage.setItem('device_customer', JSON.stringify({
      full_name: user.full_name,
      email:     user.email || null,
      phone:     user.phone,
    }));
  } catch { /* ignore */ }
}

export function getCustomerProfile() {
  try {
    const raw = localStorage.getItem('device_customer');
    const p = raw ? JSON.parse(raw) : null;
    return p && p.full_name && p.phone ? p : null;
  } catch {
    return null;
  }
}
