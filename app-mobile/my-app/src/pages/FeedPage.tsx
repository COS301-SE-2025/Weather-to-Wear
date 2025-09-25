// src/pages/FeedPage.tsx
import { Heart, Loader2, Search } from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";

import {
  getPosts,
  addComment,
  likePost,
  unlikePost,
  followUser,
  unfollowUser,
  searchUsers,
  getNotifications,
} from "../services/socialApi";
import { API_BASE } from "../config";
import { absolutize } from "../utils/url";

interface Post {
  id: string;
  userId: string;
  username: string;
  profilePhoto?: string;
  content: string;
  likes: number;
  liked: boolean;
  date: string;
  comments: { id: string; content: string; userId: string; username?: string }[];
  imageUrl?: string;
  location?: string;
  weather?: { temp: number; condition: string };
  closetItem?: { id: string; filename: string; category: string };
}

interface Notification {
  id: string;
  type: "like" | "comment" | "follow";
  fromUser: { id: string; name: string; profilePhoto?: string };
  postId?: string;
  postContent?: string;
  date: string;
}

interface UserResult {
  id: string;
  name: string;
  profilePhoto?: string | null;
  location?: string | null;
  isFollowing: boolean;
  followersCount: number;
  followingCount: number;
}

// Frontend types for notifications API
export type NotificationAPIItem = {
  id: string;
  type: "like" | "comment" | "follow";
  fromUser: {
    id: string;
    name: string;
    profilePhoto?: string;
  };
  postId?: string | null;
  postContent?: string | null;
  createdAt: string;
};

type NotificationsResponse = {
  notifications: NotificationAPIItem[];
};

const FeedPage: React.FC = () => {
  const location = useLocation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const pageSize = 5;
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [activeLeftTab, setActiveLeftTab] = useState<"search" | "notifications">("search");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  // decode token to get current user
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      setCurrentUserId(payload.id);
    } catch (err) {
      setError("Failed to decode token");
    }
  }, []);

  // ─────────── FETCH POSTS ───────────
  const fetchNext = useCallback(async () => {
    if (!currentUserId || !hasMore) return;
    try {
      const resp = await getPosts(pageSize, offset, ["user", "comments", "comments.user", "likes"]);
      const batch = (resp.posts ?? []).map((post: any) => ({
        id: post.id,
        userId: post.userId,
        username: post.user?.name || "Unknown",
        profilePhoto: post.user?.profilePhoto,
        content: post.caption || "",
        likes: post.likes?.length || 0,
        liked: post.likes?.some((l: any) => l.userId === currentUserId) || false,
        date: new Date(post.createdAt).toLocaleString(),
        comments: (post.comments ?? []).map((c: any) => ({
          id: c.id,
          content: c.content,
          userId: c.userId,
          username: c.user?.name || "Unknown",
        })),
        imageUrl: absolutize(post.imageUrl, API_BASE),
        location: post.location,
        weather: post.weather,
        closetItem: post.closetItem,
      }));
      setPosts((prev) => [...prev, ...batch]);
      setOffset((prev) => prev + pageSize);
      setHasMore(batch.length === pageSize);
    } catch (err: any) {
      setError(err.message || "Failed to load posts");
    }
  }, [currentUserId, offset, hasMore]);

  useEffect(() => {
    if (currentUserId) fetchNext();
  }, [currentUserId]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchNext();
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNext]);

  // ─────────── FETCH NOTIFICATIONS ───────────
 const fetchNotifications = useCallback(async () => {
  if (!currentUserId) return;
  setLoadingNotifications(true);
  setNotificationsError(null);

  try {
    const response = await getNotifications(); // response from socialApi
    const mapped: Notification[] = (response.notifications ?? []).map((n) => ({
      id: n.id,
      type: n.type,
      fromUser: {
        ...n.fromUser,
        profilePhoto: n.fromUser.profilePhoto ?? undefined, // normalize null → undefined
      },
      postId: n.postId ?? undefined,
      postContent: n.postContent ?? undefined,
      date: new Date(n.createdAt).toLocaleString(),
    }));
    setNotifications(mapped);
  } catch (err: any) {
    setNotificationsError(err.message || "Failed to load notifications");
  } finally {
    setLoadingNotifications(false);
  }
}, [currentUserId]);


  useEffect(() => {
    if (currentUserId && activeLeftTab === "notifications") fetchNotifications();
  }, [currentUserId, activeLeftTab, fetchNotifications]);

  // ─────────── LIKE / COMMENT HANDLERS ───────────
  const toggleLike = async (postId: string) => {
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    try {
      if (post.liked) {
        await unlikePost(postId);
        setPosts(posts.map((p) => (p.id === postId ? { ...p, liked: false, likes: p.likes - 1 } : p)));
      } else {
        await likePost(postId);
        setPosts(posts.map((p) => (p.id === postId ? { ...p, liked: true, likes: p.likes + 1 } : p)));
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const addCommentHandler = async (postId: string) => {
    const content = (newComment[postId] || "").trim();
    if (!content) return;
    try {
      const { comment: c } = await addComment(postId, content);
      const newComm = {
        id: c.id,
        content: c.content,
        userId: c.userId,
        username: c.user?.name || "You",
      };
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, newComm] } : p))
      );
      setNewComment((prev) => ({ ...prev, [postId]: "" }));
      setExpandedComments((prev) => ({ ...prev, [postId]: true }));
    } catch (err: any) {
      setError(err.message || "Failed to add comment");
    }
  };

  return (
    <div className="w-full max-w-screen-md mx-auto px-2 md:px-0 py-4 flex flex-col gap-4">
      <div className="flex gap-2 justify-center">
        <button
          className={`px-4 py-1 rounded-full ${activeLeftTab === "search" ? "bg-[#3F978F] text-white" : "bg-gray-200 dark:bg-gray-700"}`}
          onClick={() => setActiveLeftTab("search")}
        >
          Search Users
        </button>
        <button
          className={`px-4 py-1 rounded-full ${activeLeftTab === "notifications" ? "bg-[#3F978F] text-white" : "bg-gray-200 dark:bg-gray-700"}`}
          onClick={() => setActiveLeftTab("notifications")}
        >
          Notifications
        </button>
      </div>

      {activeLeftTab === "notifications" ? (
        <div>
          {loadingNotifications && <Loader2 className="animate-spin w-5 h-5" />}
          {notificationsError && <div className="text-red-500 text-sm">{notificationsError}</div>}
          {!loadingNotifications && notifications.length === 0 && (
            <div className="text-gray-500 text-sm">No notifications.</div>
          )}
          <div className="space-y-2 mt-2">
            {notifications.map((n) => (
              <div key={n.id} className="p-2 border rounded-md">
                <span className="font-semibold">{n.fromUser.name}</span>{" "}
                {n.type === "like" && "liked your post"}
                {n.type === "comment" && "commented on your post"}
                {n.type === "follow" && "started following you"}
                {n.postContent && <div className="mt-1 text-gray-700 dark:text-gray-300">{n.postContent}</div>}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* POSTS */}
      <div className="space-y-6 mt-4">
        {posts.map((post) => (
          <div key={post.id} className="p-3 border rounded-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200 font-semibold">
                {post.profilePhoto ? (
                  <img src={absolutize(post.profilePhoto, API_BASE)} alt={post.username} className="w-full h-full object-cover" />
                ) : (
                  <span>{post.username?.[0] || "U"}</span>
                )}
              </div>
              <span className="font-medium">{post.username}</span>
            </div>
            <div className="text-sm mb-2">{post.content}</div>
            {post.imageUrl && <img src={post.imageUrl} alt="Post" className="w-full rounded-xl mb-2" />}
            <div className="flex items-center gap-4 text-sm mb-2">
              <button className="flex items-center gap-1" onClick={() => toggleLike(post.id)}>
                <Heart className={`w-4 h-4 ${post.liked ? "text-red-500" : "text-gray-400"}`} />
                {post.likes}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div ref={sentinelRef} className="h-4" />
    </div>
  );
};

export default FeedPage;
