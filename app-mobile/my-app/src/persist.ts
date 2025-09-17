// src/persist.ts
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

const storage = typeof window !== 'undefined' ? window.localStorage : null;

// async wrapper over localStorage for the new API
export const persister = createAsyncStoragePersister({
  storage: {
    getItem: (key: string) => Promise.resolve(storage ? storage.getItem(key) : null),
    setItem: (key: string, value: string) => {
      if (storage) storage.setItem(key, value);
      return Promise.resolve();
    },
    removeItem: (key: string) => {
      if (storage) storage.removeItem(key);
      return Promise.resolve();
    },
  },
  key: 'REACT_QUERY_OFFLINE_CACHE',
  throttleTime: 1000,
});

export async function clearPersistedCache() {
  // remove the dehydrated cache
  await persister.removeClient?.();
  // belt & braces: nuke any matching keys
  if (storage) {
    Object.keys(storage).forEach(k => {
      if (k.includes('REACT_QUERY_OFFLINE_CACHE')) storage.removeItem(k);
    });
  }
}

// small helpers used by auto-logout 
export function getToken(): string | null {
  try { return storage?.getItem('token') ?? null; } catch { return null; }
}

export function setToken(token: string | null) {
  try {
    if (!storage) return;
    if (token) storage.setItem('token', token);
    else storage.removeItem('token');
  } catch {}
}

export function clearAllAppStorage() {
  try {
    if (!storage) return;
    const token = storage.getItem('token');
    if (token) storage.removeItem(`closet-favs-${token}`);
    storage.removeItem('token');
    storage.removeItem('user');
    storage.removeItem('selectedCity');
    // Optionally: a one-shot message for the login page
    // storage.setItem('sessionExpiredNotice', '1');
  } catch {}
}
