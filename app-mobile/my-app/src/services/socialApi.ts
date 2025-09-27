// src/services/socialApi.ts
import { fetchWithAuth } from "./fetchWithAuth";
import { API_BASE } from '../config';
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

export type Notification =
  | {
      id: string;
      type: "like" | "comment";
      fromUser: {
        id: string;
        name: string;
        profilePhoto?: string | null;
      };
      postId?: string;
      postContent?: string;
      createdAt: string;
    }
  | {
      id: string;
      type: "follow";
      fromUser: {
        id: string;
        name: string;
        profilePhoto?: string | null;
      };
      postId?: undefined;
      postContent?: undefined;
      createdAt: string;
    };

export async function createPost(data: {
  image?: File;
  caption?: string;
  location?: string;
  weather?: any;
  closetItemId?: string;
  closetItemIds?: string[];
}) {
  const formData = new FormData();
  if (data.image) formData.append("image", data.image);
  if (data.caption) formData.append("caption", data.caption);
  if (data.location) formData.append("location", data.location);
  if (data.weather) formData.append("weather", JSON.stringify(data.weather));
  if (data.closetItemId) formData.append("closetItemId", data.closetItemId);
  if (data.closetItemIds && data.closetItemIds.length > 0) {
    formData.append("closetItemIds", JSON.stringify(data.closetItemIds));
  }

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

// export async function followUser(userId: string) {
//   const response = await fetchWithAuth(`${API_URL}/${userId}/follow`, {
//     method: "POST",
//   });

//   if (!response.ok) {
//     const errorData = await response.json().catch(() => ({}));
//     throw new Error(errorData.message || "Failed to follow user");
//   }

//   return response.json() as Promise<{ follow: Follow }>;
// }

export async function followUser(userId: string) {
  const response = await fetchWithAuth(`${API_URL}/${userId}/follow`, {
    method: "POST",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to follow user");
  }

  // The returned JSON now includes { follow: { status: "pending" | "accepted" } }
  return response.json() as Promise<{ follow: { id: string; followerId: string; followingId: string; status: string } }>;
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
export type NotificationAPIItem =
  | {
      id: string;
      type: "like" | "comment";
      fromUser: {
        id: string;
        name: string;
        profilePhoto?: string | null;
      };
      postId?: string;
      postContent?: string;
      createdAt: string;
    }
  | {
      id: string;
      type: "follow";
      fromUser: {
        id: string;
        name: string;
        profilePhoto?: string | null;
      };
      createdAt: string;
      status: "pending" | "accepted" | "rejected"; // ✅ status is required here
    };

export interface NotificationsApiResult {
  notifications: NotificationAPIItem[];
}


export type NotificationsResponse = {
  notifications: NotificationAPIItem[];
};

// export async function getNotifications(): Promise<NotificationsResponse> {
//   try {
//     const res = await fetchWithAuth(`${API_URL}/notifications`, { method: "GET" });

//     if (!res.ok) {
//       console.error("Failed to fetch notifications:", res.statusText);
//       return { notifications: [] };
//     }

//     // Parse JSON
//     const data = (await res.json()) as NotificationsResponse;

//     // Ensure notifications array exists
//     return {
//       notifications: data.notifications ?? [],
//     };
//   } catch (err) {
//     console.error("Error fetching notifications:", err);
//     return { notifications: [] };
//   }
// }

export async function getNotifications(): Promise<NotificationsApiResult> {
  const response = await fetchWithAuth(`${API_URL}/notifications`, { method: "GET" });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch notifications");
  }

  const data = (await response.json()) as NotificationsApiResult;
  return data;
}



export async function acceptFollowRequest(followId: string) {
  const response = await fetchWithAuth(
    `${API_URL}/follow/${followId}/accept`,
    { method: "POST" }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to accept follow request");
  }

  return response.json() as Promise<{ follow: Follow }>;
}

export async function rejectFollowRequest(followId: string) {
  const response = await fetchWithAuth(
    `${API_URL}/follow/${followId}/reject`,
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

export async function editPost(postId: string, data: {
  caption?: string;
  imageUrl?: string;
  location?: string;
  weather?: any;
  closetItemId?: string;
}) {
  const formData = new FormData();
  if (data.caption) formData.append("caption", data.caption);
  if (data.imageUrl) formData.append("imageUrl", data.imageUrl);
  if (data.location) formData.append("location", data.location);
  if (data.weather) formData.append("weather", JSON.stringify(data.weather));
  if (data.closetItemId) formData.append("closetItemId", data.closetItemId);

  const response = await fetchWithAuth(`${API_URL}/posts/${postId}`, {
    method: "PATCH",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to edit post");
  }

  return response.json(); // Returns { message: 'Post updated successfully', post: {...} }
}

export async function deletePost(postId: string) {
  const response = await fetchWithAuth(`${API_URL}/posts/${postId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to delete post");
  }

  return response.json(); // Returns { message: 'Post deleted successfully' }
}