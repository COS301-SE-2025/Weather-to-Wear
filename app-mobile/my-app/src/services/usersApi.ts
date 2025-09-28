import { fetchWithAuth } from "./fetchWithAuth";
import { API_BASE } from '../config';

const API_URL = `${API_BASE}/api/users`;

export async function getMe() {
  const res = await fetchWithAuth(`${API_URL}/me`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to load user");
  }
  return res.json(); 
}

export async function uploadProfilePhoto(file: File) {
  const form = new FormData();
  form.append("image", file);

  const res = await fetchWithAuth(`${API_URL}/me/profile-photo`, {
    method: "PATCH",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update profile photo");
  }

  return res.json(); 
}

export async function updatePrivacy(isPrivate: boolean) {
  const res = await fetchWithAuth(`${API_URL}/me/privacy`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isPrivate }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update privacy settings");
  }

  return res.json(); 
}