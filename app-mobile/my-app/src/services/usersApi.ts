import { fetchWithAuth } from "./fetchWithAuth";

const API_URL = "http://localhost:5001/api/users";

export async function getMe() {
  const res = await fetchWithAuth(`${API_URL}/me`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to load user");
  }
  return res.json(); // { user: { id, name, email, profilePhoto, ... } }
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

  return res.json(); // { user: {...} }
}
