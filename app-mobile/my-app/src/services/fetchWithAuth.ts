// src/services/fetchWithAuth.ts
import { getToken } from '../persist';
import { logoutAndResetApp } from './auth';

export async function fetchWithAuth(input: RequestInfo, init: RequestInit = {}) {
  const token = getToken();

  const headers = new Headers(init.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(input, { ...init, headers });

  if (response.ok) return response;

  // Handle auth errors in one place
  if (response.status === 401 || response.status === 403) {
    // header sent by backend on expiry
    const expiredHeader = response.headers.get('X-Session-Expired') === 'true';

    let code = '';
    try {
      const cloned = response.clone();
      const json = await cloned.json();
      code = json?.code || '';
    } catch {

    }

    if (expiredHeader || code === 'SESSION_EXPIRED') {
      console.warn('Session expired, logging out automatically');
      await logoutAndResetApp();

      try { localStorage.setItem('sessionExpiredNotice', '1'); } catch {}

      // hard redirect to ensure a clean slate
      window.location.assign('/login');
      throw new Error('SESSION_EXPIRED');
    }

    if (code === 'INVALID_TOKEN' || code === 'NO_TOKEN') {
      await logoutAndResetApp();
      window.location.assign('/login');
      throw new Error(code || 'AUTH_ERROR');
    }
  }

  throw new Error(`${response.status} ${response.statusText}`);
}
