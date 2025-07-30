import { fetchWithAuth } from "./fetchWithAuth";

const API_URL = "http://localhost:5001/api/social";

export async function uploadPostImage(file: File) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetchWithAuth(`${API_URL}/posts/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to upload image");
  }

  return response.json(); // { imageUrl: "/uploads/filename.png" }
}

export async function createPost(data: {
  imageUrl: string;
  caption: string;
  location?: string;
  weather?: any;
}) {
  const response = await fetchWithAuth(`${API_URL}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to create post");
  }

  return response.json();
}
