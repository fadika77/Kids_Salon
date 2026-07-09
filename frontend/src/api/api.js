// Base API configuration
//
// Two possible run modes need two different URLs:
//   - `npm run dev` (plain browser)         -> your PC's own localhost works fine
//   - Capacitor native app (Android Studio) -> "localhost" means the device/emulator
//     itself, NOT your PC, so it must use a reachable address instead.
//
// We detect which mode we're in at runtime via Capacitor.isNativePlatform(),
// so the same code/build works correctly either way without manual edits.
import { Capacitor } from '@capacitor/core';

// Used when running in a normal browser (npm run dev / npm run preview).
const WEB_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Used when running inside the native Android/iOS app via Capacitor.
//   - Android emulator: 10.0.2.2 is the special alias for your PC's localhost.
//   - Physical device:  replace with your PC's LAN IP (e.g. 192.168.1.42),
//     either by editing the default below or setting VITE_API_URL_NATIVE
//     in your .env file before running `npm run build`.
const NATIVE_URL = import.meta.env.VITE_API_URL_NATIVE || 'http://10.0.2.2:8000';

const BASE_URL = Capacitor.isNativePlatform() ? NATIVE_URL : WEB_URL;

// Exported so image URLs (e.g. gallery photos) can be made absolute
export { BASE_URL };

function getToken() {
  return localStorage.getItem('token');
}

/**
 * Self-healing auth for customers.
 *
 * Customer identity is passwordless (name + phone stored on the device), so
 * if the server ever rejects our token (expired, backend reset, etc.) we can
 * silently re-register the device with the stored details, get a fresh
 * token, and retry the original request — the user never notices.
 */
let refreshingPromise = null;

async function tryRefreshCustomerToken() {
  // Only one refresh at a time — parallel 401s share the same promise.
  if (refreshingPromise) return refreshingPromise;

  refreshingPromise = (async () => {
    try {
      const raw = localStorage.getItem('user');
      const user = raw ? JSON.parse(raw) : null;

      // Prefer the current session user; fall back to the device profile
      // (which survives logouts) if the session was cleared.
      let profile = null;
      if (user && user.role === 'customer' && user.full_name && user.phone) {
        profile = { full_name: user.full_name, email: user.email || null, phone: user.phone };
      } else {
        try {
          const rawProfile = localStorage.getItem('device_customer');
          const p = rawProfile ? JSON.parse(rawProfile) : null;
          if (p && p.full_name && p.phone) {
            profile = { full_name: p.full_name, email: p.email || null, phone: p.phone };
          }
        } catch { /* ignore */ }
      }

      // Admins must log in again — only customers re-register silently.
      if (!profile || (user && user.role === 'admin')) {
        return false;
      }

      const res = await fetch(`${BASE_URL}/auth/device-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
      if (!res.ok) return false;

      const data = await res.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return true;
    } catch {
      return false;
    } finally {
      // Allow future refreshes after this one settles.
      setTimeout(() => { refreshingPromise = null; }, 0);
    }
  })();

  return refreshingPromise;
}

async function request(path, options = {}, isRetry = false) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // Token rejected → try silent device re-registration once, then retry.
  if (response.status === 401 && !isRetry && !path.startsWith('/auth/device-register') && !path.startsWith('/auth/login')) {
    const refreshed = await tryRefreshCustomerToken();
    if (refreshed) {
      return request(path, options, true);
    }
  }

  if (response.status === 204) return null;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.detail ||
      (Array.isArray(data?.detail) ? data.detail.map((e) => e.msg).join(', ') : null) ||
      'Something went wrong';
    throw new Error(message);
  }

  return data;
}

async function uploadRequest(path, formData) {
  const token = getToken();
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,   // browser sets multipart Content-Type automatically
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.detail || 'Upload failed');
  }
  return data;
}

export const api = {
  get:    (path, opts = {}) => request(path, { method: 'GET',    ...opts }),
  post:   (path, body, opts = {}) => request(path, { method: 'POST',   body: JSON.stringify(body), ...opts }),
  put:    (path, body, opts = {}) => request(path, { method: 'PUT',    body: JSON.stringify(body), ...opts }),
  delete: (path, opts = {}) => request(path, { method: 'DELETE', ...opts }),
  upload: (path, formData) => uploadRequest(path, formData),
};

export default api;
