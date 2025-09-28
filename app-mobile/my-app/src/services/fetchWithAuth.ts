// src/services/fetchWithAuth.ts
import { getToken } from '../persist';

// Note: We can't directly use AuthContext here since this is a service function
// The AuthContext will be handled by the ProtectedRoute components
async function clearAuthData() {
  // Clear all auth data
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("selectedCity");
  
  // Clear any user-specific data
  const allKeys = Object.keys(localStorage);
  allKeys.forEach(key => {
    if (key.startsWith('closet-favs-')) {
      localStorage.removeItem(key);
    }
  });
  
  // Clear React Query cache
  const { queryClient } = await import('../queryClient');
  const { clearPersistedCache } = await import('../persist');
  
  await queryClient.cancelQueries();
  queryClient.clear();
  await clearPersistedCache();
}

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
      await clearAuthData();

      try { localStorage.setItem('sessionExpiredNotice', '1'); } catch {}

      // hard redirect to ensure a clean slate
      window.location.assign('/login');
      throw new Error('SESSION_EXPIRED');
    }

    if (code === 'INVALID_TOKEN' || code === 'NO_TOKEN') {
      await clearAuthData();
      window.location.assign('/login');
      throw new Error(code || 'AUTH_ERROR');
    }
  }

  // Build a rich error so callers can read the body (e.g., NSFW scores)
  let body: any = null;
  try {
    const cloned = response.clone();
    body = await cloned.json();
  } catch {
    // not JSON or empty body — that's fine
  }

  const err: any = new Error(body?.message || `${response.status} ${response.statusText}`);
  err.status = response.status;
  err.data = body;                           // <-- key: attach parsed JSON
  err.headers = Object.fromEntries(response.headers.entries());
  throw err;

}
