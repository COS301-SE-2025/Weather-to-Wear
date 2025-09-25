// src/services/socialApi.ts
import { fetchWithAuth } from "./fetchWithAuth";
import { API_BASE } from '../config';
import { SocialNotification, NotificationsResponse } from "../types/social";

const API_URL = `${API_BASE}/api/social`;

export interface User {
  id: string;
  name: string;
  profilePhoto?: string;
  isPrivate?: boolean;
}

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
}

export async function createPost(data: {
  image?: File;
  caption?: string;
  location?: string;
  weather?: any;
  closetItemId?: string;
}) {
  const formData = new FormData();
  if (data.image) formData.append("image", data.image);
  if (data.caption) formData.append("caption", data.caption);
  if (data.location) formData.append("location", data.location);
  if (data.weather) formData.append("weather", JSON.stringify(data.weather));
  if (data.closetItemId) formData.append("closetItemId", data.closetItemId);

  const response = await fetchWithAuth(`${API_URL}/posts`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to create post");
  }

  return response.json(); // Returns { post: {...} }
}

export async function getPosts(limit = 20, offset = 0, include: string[] = []) {
  const response = await fetchWithAuth(
    `${API_URL}/posts?limit=${limit}&offset=${offset}&include=${include.join(",")}`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to fetch posts");
  }

  return response.json(); // Returns { posts: [...] }
}

export async function getPostById(id: string, include: string[] = []) {
  const response = await fetch(`${API_URL}/posts/${id}?include=${include.join(",")}`, {
    method: "GET",
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to fetch post");
  }

  return response.json(); // Returns { post: {...} }
}

export async function addComment(postId: string, content: string) {
  const response = await fetchWithAuth(`${API_URL}/posts/${postId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to add comment");
  }

  return response.json(); // Returns { comment: {...} }
}

export async function getCommentsForPost(postId: string, limit = 20, offset = 0, include: string[] = []) {
  const response = await fetch(
    `${API_URL}/posts/${postId}/comments?limit=${limit}&offset=${offset}&include=${include.join(",")}`,
    {
      method: "GET",
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to fetch comments");
  }

  return response.json(); // Returns { comments: [...] }
}

export async function likePost(postId: string) {
  const response = await fetchWithAuth(`${API_URL}/posts/${postId}/likes`, {
    method: "POST",
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to like post");
  }

  return response.json(); // Returns { like: {...} }
}

export async function unlikePost(postId: string) {
  const response = await fetchWithAuth(`${API_URL}/posts/${postId}/likes`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to unlike post");
  }

  return response.json(); // Returns { message: 'Post unliked successfully' }
}

export async function followUser(userId: string) {
  const response = await fetchWithAuth(`${API_URL}/${userId}/follow`, {
    method: "POST",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to follow user");
  }

  return response.json() as Promise<{ follow: Follow }>;
}

export async function unfollowUser(userId: string) {
  const response = await fetchWithAuth(`${API_URL}/${userId}/unfollow`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to unfollow user");
  }

  return response.json();
}

// Notifications
// services/socialApi.ts
export async function getNotifications(): Promise<NotificationsResponse> {
  try {
    const token = localStorage.getItem('token'); // your JWT
    if (!token) return { notifications: [] }; // ✅ return object, not array

    const res = await fetch("/api/social/notifications", {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // if backend returns non-JSON (HTML error page), catch it
    if (!res.ok) {
      const text = await res.text();
      console.error("Failed to fetch notifications:", text);
      return { notifications: [] }; // ✅ return object
    }

    // try parsing JSON, fall back to empty array if it fails
    try {
      const data = await res.json();
      return data as NotificationsResponse;
    } catch (jsonErr) {
      console.error("Failed to parse notifications JSON:", jsonErr);
      return { notifications: [] }; // ✅ return object
    }
  } catch (err) {
    console.error("Error fetching notifications:", err);
    return { notifications: [] }; // ✅ return object
  }
}




export async function acceptFollowRequest(requestId: string) {
  const response = await fetchWithAuth(
    `${API_URL}/follow/accept/${requestId}`,
    { method: "POST" }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to accept follow request");
  }

  return response.json() as Promise<{ follow: Follow }>;
}

export async function rejectFollowRequest(requestId: string) {
  const response = await fetchWithAuth(
    `${API_URL}/follow/reject/${requestId}`,
    { method: "POST" }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to reject follow request");
  }

  return response.json() as Promise<{ follow: Follow }>;
}

export async function getFollowing(userId: string, limit = 20, offset = 0) {
  const response = await fetchWithAuth(
    `${API_URL}/${userId}/following?limit=${limit}&offset=${offset}`,
    { method: "GET" }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch following");
  }

  return response.json() as Promise<{ following: User[] }>;
}

export async function getFollowers(userId: string, limit = 20, offset = 0) {
  const response = await fetchWithAuth(
    `${API_URL}/${userId}/followers?limit=${limit}&offset=${offset}`,
    { method: "GET" }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch followers");
  }

  return response.json() as Promise<{ followers: User[] }>;
}

export async function searchUsers(q: string, limit = 10, offset = 0) {
  const url = `${API_URL}/users/search?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`;
  const response = await fetchWithAuth(url, { method: "GET" });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || "Failed to search users");
  }
  // { message, results: [...], pagination: {...} }
  return response.json();
}