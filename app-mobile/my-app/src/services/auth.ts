// // src/services/auth.ts
// import { API_BASE } from '../config';
// import { clearAllAppStorage, setToken, clearPersistedCache } from '../persist';
// import { resetQueryClient } from '../queryClient';

// export async function loginUser(email: string, password: string) {
//   const res = await fetch(`${API_BASE}/api/auth/login`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ email, password }),
//   });

//   if (!res.ok) throw new Error((await res.json()).error);
//   return await res.json();
// }

// export async function signupUser(name: string, email: string, password: string) {
//   const res = await fetch(`${API_BASE}/api/auth/signup`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ name, email, password }),
//   });

//   if (!res.ok) throw new Error((await res.json()).error);
//   return await res.json();
// }

// //central cleanup for manual/automatic logout
// export async function logoutAndResetApp() {
//   try {
//     setToken(null);
//     clearAllAppStorage();
//     await resetQueryClient();
//     await clearPersistedCache();
//   } catch {
//     // swallow
//   }
// }

// src/services/auth.ts
import { API_BASE } from '../config';
import { clearAllAppStorage, setToken, clearPersistedCache } from '../persist';
import { resetQueryClient } from '../queryClient';

let tokenExpiryTimer: number | null = null;

function decodeJwtExp(token: string): number | null {
  try {
    const [, payloadB64] = token.split('.');
    const json = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    // exp is seconds since epoch
    return typeof json?.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function scheduleTokenAutoLogout(token: string) {
  // clear any previous timer
  if (tokenExpiryTimer) {
    window.clearTimeout(tokenExpiryTimer);
    tokenExpiryTimer = null;
  }
  const expMs = decodeJwtExp(token);
  if (!expMs) return;

  const now = Date.now();
  // fire a few seconds early to be safe
  const delay = Math.max(0, expMs - now - 3000);

  tokenExpiryTimer = window.setTimeout(async () => {
    try { localStorage.setItem('sessionExpiredNotice', '1'); } catch {}
    await logoutAndResetApp();
    window.location.assign('/login');
  }, delay);
}

export function cancelTokenAutoLogout() {
  if (tokenExpiryTimer) {
    window.clearTimeout(tokenExpiryTimer);
    tokenExpiryTimer = null;
  }
}

// Call this right after a successful login to persist & schedule
export function applyAuthToken(token: string) {
  setToken(token);
  scheduleTokenAutoLogout(token);
}

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  const json = await res.json();
  // If your backend returns { token, user }, schedule here:
  if (json?.token) scheduleTokenAutoLogout(json.token);
  return json;
}

export async function signupUser(name: string, email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  const json = await res.json();
  if (json?.token) scheduleTokenAutoLogout(json.token);
  return json;
}

export async function logoutAndResetApp() {
  try {
    cancelTokenAutoLogout();
    setToken(null);
    clearAllAppStorage();
    await resetQueryClient();
    await clearPersistedCache();
  } catch {
    // ignore
  }
}
