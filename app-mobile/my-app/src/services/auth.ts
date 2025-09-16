// src/services/auth.ts
import { API_BASE } from '../config';
import { clearAllAppStorage, setToken, clearPersistedCache } from '../persist';
import { resetQueryClient } from '../queryClient';

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) throw new Error((await res.json()).error);
  return await res.json();
}

export async function signupUser(name: string, email: string, password: string) {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });

  if (!res.ok) throw new Error((await res.json()).error);
  return await res.json();
}

//central cleanup for manual/automatic logout
export async function logoutAndResetApp() {
  try {
    setToken(null);
    clearAllAppStorage();
    await resetQueryClient();
    await clearPersistedCache();
  } catch {
    // swallow
  }
}
