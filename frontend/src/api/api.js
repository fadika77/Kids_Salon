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

// The live production backend (Render).
const PROD_URL = 'https://kids-salon-api.onrender.com';

// Used when running in a normal browser (npm run dev / npm run preview).
// Safety net: if the build forgot VITE_API_URL but the site is being served
// from a real domain (not localhost), we're clearly in production — use the
// live backend instead of localhost so the deployed site never silently
// points at the developer machine.
const isLocalHost =
  typeof window !== 'undefined' &&
  ['localhost', '127.0.0.1'].includes(window.location.hostname);

const WEB_URL =
  import.meta.env.VITE_API_URL ||
  (isLocalHost ? 'http://localhost:8000' : PROD_URL);

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

// Friendly, localized message for network-level failures (server unreachable,
// no internet, CORS/misconfigured URL). Raw fetch errors like "Failed to
// fetch" are meaningless to users, so we replace them.
const NETWORK_ERROR_MESSAGES = {
  en: "Can't reach the server. Please check your internet connection and try again.",
  he: 'לא ניתן להתחבר לשרת. בדקו את חיבור האינטרנט ונסו שוב.',
  ar: 'تعذّر الاتصال بالخادم. تحقّقوا من اتصال الإنترنت وحاولوا مرة أخرى.',
};

function networkError() {
  let lang = 'en';
  try { lang = localStorage.getItem('app_language') || 'en'; } catch { /* ignore */ }
  const err = new Error(NETWORK_ERROR_MESSAGES[lang] || NETWORK_ERROR_MESSAGES.en);
  err.isNetworkError = true;
  return err;
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

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch {
    // fetch itself failed — server down, no internet, or wrong API URL.
    throw networkError();
  }

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
    throw new Error(errorMessageFrom(data));
  }

  return data;
}

// Turn any FastAPI error body into a human-readable string.
//   - 4xx/5xx with {"detail": "some text"}            -> "some text"
//   - 422 validation with {"detail": [{msg, loc}...]} -> "field: message, ..."
// The array case MUST be checked first: an array is truthy, so `detail || ...`
// would return the raw array and it would render as "[object Object],...".
function errorMessageFrom(data) {
  const detail = data?.detail;

  if (Array.isArray(detail)) {
    const parts = detail
      .map((e) => {
        const field = Array.isArray(e?.loc) ? e.loc[e.loc.length - 1] : null;
        const msg = e?.msg || (typeof e === 'string' ? e : null);
        if (!msg) return null;
        return field && field !== 'body' ? `${field}: ${msg}` : msg;
      })
      .filter(Boolean);
    if (parts.length) return parts.join(' · ');
  }

  if (typeof detail === 'string' && detail) return detail;

  // Objects / anything unexpected — never let "[object Object]" through.
  if (detail && typeof detail === 'object') {
    try { return JSON.stringify(detail); } catch { /* ignore */ }
  }

  return 'Something went wrong';
}

async function uploadRequest(path, formData) {
  const token = getToken();
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,   // browser sets multipart Content-Type automatically
    });
  } catch {
    throw networkError();
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg = errorMessageFrom(data);
    throw new Error(msg === 'Something went wrong' ? 'Upload failed' : msg);
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