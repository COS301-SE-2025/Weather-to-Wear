import { Heart, Loader2, Search, Bell } from "lucide-react";
import React, { useState, useEffect, useCallback, useRef } from "react";
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
  acceptFollowRequest,
  rejectFollowRequest,
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
  followStatus?: "pending" | "accepted" | "rejected";
  followId: string;
}

interface Account {
  id: string;
  username: string;
  profilePhoto?: string;
}

type UserResult = {
  id: string;
  name: string;
  profilePhoto?: string | null;
  location?: string | null;
  isFollowing: boolean;
  followRequested?: boolean;
  isPrivate: boolean;
  followersCount: number;
  followingCount: number;
};

export type NotificationAPIItem =
  | {
      id: string;
      type: "like" | "comment";
      fromUser: { id: string; name: string; profilePhoto?: string | null };
      postId?: string;
      postContent?: string;
      createdAt: string;
      followId: string;
    }
  | {
      id: string;
      type: "follow";
      fromUser: { id: string; name: string; profilePhoto?: string | null };
      createdAt: string;
      status: "pending" | "accepted" | "rejected";
    };

const API_URL = `${API_BASE}`;

type SearchUsersCardProps = {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  searchLoading: boolean;
  searchError: string | null;
  searchResults: UserResult[];
  searchHasMore: boolean;
  onLoadMore: () => void;
  onToggleFollow: (id: string, user: UserResult) => void;
};

const SearchUsersCard: React.FC<SearchUsersCardProps> = React.memo(
  ({
    searchQuery,
    setSearchQuery,
    searchLoading,
    searchError,
    searchResults,
    searchHasMore,
    onLoadMore,
    onToggleFollow,
  }) => {
    return (
      <div className="w-full">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="pl-10 pr-4 py-2 w-full border rounded-full bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#3F978F]"
          />
        </div>

        {searchError && <div className="mt-3 text-xs text-red-500">{searchError}</div>}

        <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hide">
          {searchLoading && searchResults.length === 0 && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
            </div>
          )}

          {!searchLoading && searchQuery.trim() && searchResults.length === 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400">No users found.</div>
          )}

          {searchResults.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 p-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-600 overflow-hidden flex items-center justify-center text-gray-700 dark:text-gray-200 font-semibold relative">
                {u.profilePhoto ? (
                  <img
                    src={absolutize(u.profilePhoto, API_BASE)}
                    alt={u.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      (e.currentTarget.nextSibling as HTMLElement).style.display = "block";
                    }}
                  />
                ) : null}
                <span className="absolute hidden">{u.name?.[0] || "U"}</span>
              </div>

              <div className="flex flex-col">
                <span className="text-sm font-medium dark:text-gray-100">@{u.name}</span>
                <span className="text-[11px] text-gray-500 dark:text-gray-400">
                  {u.location || "—"} • {u.followersCount} followers
                </span>
              </div>

              <button
                onClick={() => onToggleFollow(u.id, u)}
                className={`ml-auto text-xs px-3 py-1 rounded-full ${
                  u.isFollowing || u.followRequested
                    ? "bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100"
                    : "bg-[#3F978F] text-white hover:bg-[#357f78]"
                }`}
              >
                {u.isFollowing ? "Following" : u.followRequested ? "Requested" : "Follow"}
              </button>
            </div>
          ))}

          {searchHasMore && (
            <button
              onClick={onLoadMore}
              className="w-full mt-2 bg-[#3F978F] text-white px-3 py-2 rounded-full text-xs disabled:opacity-70 hover:bg-[#357f78]"
              disabled={searchLoading}
            >
              {searchLoading ? <Loader2 className="h-4 w-4 animate-spin inline" /> : "Load more"}
            </button>
          )}
        </div>
      </div>
    );
  }
);

const FeedPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
  const [following, setFollowing] = useState<Account[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searchOffset, setSearchOffset] = useState(0);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const pageSize = 2;

  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const location = useLocation();
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

  const postsContainerRef = useRef<HTMLDivElement | null>(null);
  const notificationsContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (location.state?.postSuccess) {
      setShowSuccessPopup(true);
      const timer = setTimeout(() => setShowSuccessPopup(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const tokenParts = token.split(".");
        if (tokenParts.length !== 3) throw new Error("Invalid token format");
        const rawPayload = atob(tokenParts[1]);
        const user = JSON.parse(rawPayload);
        setCurrentUserId(user.id);
        setUsername(user.name || user.username || "Unknown");
      } catch (err) {
        setError("Failed to decode authentication token. Please log in again.");
      }
    } else {
      setError("No authentication token found. Please log in.");
    }
  }, []);

  const fetchNext = useCallback(async () => {
    if (!currentUserId || loadingMore || !hasMore) return;
    setLoadingMore(true);
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
    } catch (e: any) {
      setError(e.message || "Failed to load posts");
    } finally {
      setLoadingMore(false);
    }
  }, [currentUserId, offset, hasMore, loadingMore]);

  const fetchNotifications = useCallback(async () => {
    if (!currentUserId) return;
    setLoadingNotifications(true);
    setNotificationsError(null);
    try {
      const response = await getNotifications();
      const notificationsArray: Notification[] = (response.notifications ?? []).map((n: any) => ({
        id: n.id,
        type: n.type,
        fromUser: {
          id: n.fromUser.id,
          name: n.fromUser.name,
          profilePhoto: n.fromUser.profilePhoto ?? undefined,
        },
        postId: n.type !== "follow" ? n.postId : undefined,
        postContent: n.type !== "follow" ? n.postContent : undefined,
        date: n.createdAt,
        followStatus: n.type === "follow" ? n.status : undefined,
        followId: n.type === "follow" ? (n as any).followId : undefined,
      }));
      notificationsArray.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setNotifications(notificationsArray);
    } catch (err: any) {
      setNotificationsError(err.message || "Failed to load notifications");
    } finally {
      setLoadingNotifications(false);
    }
  }, [currentUserId]);

  // Fetch notifications continuously (desktop sidebar always visible; mobile popover stays fresh too)
  useEffect(() => {
    if (!currentUserId) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [currentUserId, fetchNotifications]);

  const toggleLike = async (id: string) => {
    const post = posts.find((p) => p.id === id);
    if (!post) return;
    try {
      if (post.liked) {
        await unlikePost(id);
        setPosts(posts.map((p) => (p.id === id ? { ...p, liked: false, likes: p.likes - 1 } : p)));
      } else {
        await likePost(id);
        setPosts(posts.map((p) => (p.id === id ? { ...p, liked: true, likes: p.likes + 1 } : p)));
      }
      fetchNotifications();
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
      fetchNotifications();
    } catch (err: any) {
      setError(err.message || "Failed to add comment");
    }
  };

  const toggleFollowFromSearch = async (userId: string, user: UserResult) => {
    try {
      if (user.isFollowing || user.followRequested) {
        await unfollowUser(userId);
        setSearchResults((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, isFollowing: false, followRequested: false } : u))
        );
        setFollowing((prev) => prev.filter((f) => f.id !== userId));
      } else {
        const { follow } = await followUser(userId);
        setSearchResults((prev) =>
          prev.map((u) =>
            u.id === userId
              ? { ...u, isFollowing: follow.status === "accepted", followRequested: follow.status === "pending" }
              : u
          )
        );
        if (follow.status === "accepted") {
          setFollowing((prev) => [
            ...prev,
            { id: userId, username: user.name, profilePhoto: user.profilePhoto || undefined },
          ]);
        }
      }
    } catch (err: any) {
      setError(err.message || "Follow action failed");
    }
  };

  useEffect(() => {
    if (!currentUserId) return;
    setPosts([]);
    setOffset(0);
    setHasMore(true);
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    fetchNext();
  }, [currentUserId, fetchNext]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first.isIntersecting) fetchNext();
      },
      { rootMargin: "600px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [fetchNext]);

  useEffect(() => {
    let timer: number | undefined;

    async function run() {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setSearchHasMore(false);
        setSearchError(null);
        return;
      }
      setSearchLoading(true);
      setSearchError(null);
      try {
        const data = await searchUsers(searchQuery, pageSize, 0);
        setSearchResults(data.results || []);
        setSearchOffset(pageSize);
        setSearchHasMore((data.results || []).length === pageSize);
      } catch (e: any) {
        setSearchError(e.message || "Failed to search");
      } finally {
        setSearchLoading(false);
      }
    }

    timer = window.setTimeout(run, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadMoreSearch = async () => {
    if (!searchHasMore || !searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const data = await searchUsers(searchQuery, pageSize, searchOffset);
      const newResults: UserResult[] = data.results || [];
      setSearchResults((prev) => [...prev, ...newResults]);
      setSearchOffset((prev) => prev + pageSize);
      setSearchHasMore(newResults.length === pageSize);
    } catch (e: any) {
      setSearchError(e.message || "Failed to load more");
    } finally {
      setSearchLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <style>
        {`
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        `}
      </style>

      {showSuccessPopup && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 p-2 bg-green-500 text-white rounded-md text-sm z-50">
          Post created successfully!
        </div>
      )}

      {/* Mobile header: centered search + bell */}
      <div className="lg:hidden sticky top-0 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b">
        <div className="px-4 py-2 flex items-center gap-3">
          <form className="flex-1">
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search people"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 rounded-full bg-gray-100 dark:bg-gray-800 text-sm outline-none"
              />
            </div>
          </form>

          <button
            type="button"
            aria-label="Notifications"
            className="shrink-0 w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center"
            onClick={() => setShowNotifications((v) => !v)}
          >
            <Bell className="h-5 w-5" />
          </button>
        </div>

        {/* Mobile notifications popover */}
        {showNotifications && (
          <div className="relative">
            <div className="absolute right-2 left-2 top-0 translate-y-2 rounded-xl shadow-lg bg-white dark:bg-gray-800 p-3 max-h-[60vh] overflow-y-auto">
              <div ref={notificationsContainerRef} className="space-y-3">
                {loadingNotifications && (
                  <div className="flex justify-center py-4">
                    <Loader2 className="animate-spin w-6 h-6 text-[#3F978F]" />
                  </div>
                )}
                {notificationsError && (
                  <div className="text-red-500 text-sm text-center bg-red-100 dark:bg-red-900/30 p-2 rounded-md">
                    {notificationsError}
                  </div>
                )}
                {!loadingNotifications && notifications.length === 0 && (
                  <div className="text-gray-500 dark:text-gray-400 text-sm text-center p-4">
                    No notifications yet.
                  </div>
                )}

                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-200 font-semibold">
                      {n.fromUser.profilePhoto ? (
                        <img
                          src={absolutize(n.fromUser.profilePhoto, API_BASE)}
                          alt={n.fromUser.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{n.fromUser.name?.[0] || "U"}</span>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                          {n.fromUser.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(n.date).toLocaleString()}
                        </span>
                      </div>

                      <div className="text-sm text-gray-700 dark:text-gray-200 mt-1">
                        {n.type === "like" && (
                          <span className="flex items-center gap-1">
                            <Heart className="w-4 h-4 text-red-500" fill="red" />
                            Liked your post
                          </span>
                        )}
                        {n.type === "comment" && <span>Commented on your post</span>}
                        {n.type === "follow" && n.followStatus === "pending" && <span>Sent you a follow request</span>}
                        {n.type === "follow" && n.followStatus === "accepted" && <span>Started following you</span>}
                        {n.type === "follow" && n.followStatus === "rejected" && <span>Follow request rejected</span>}
                      </div>

                      {n.postContent && (
                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                          "{n.postContent}"
                        </div>
                      )}

                      {n.type === "follow" && n.followStatus === "pending" && (
                        <div className="flex gap-2 mt-2">
                          <button
                            className="px-3 py-1 text-xs bg-[#3F978F] text-white rounded-full hover:bg-[#357f78] transition-colors duration-150"
                            onClick={async () => {
                              try {
                                if (!n.followId) throw new Error("Missing followId");
                                await acceptFollowRequest(n.followId);
                                setFollowing((prev) => [
                                  ...prev,
                                  {
                                    id: n.fromUser.id,
                                    username: n.fromUser.name,
                                    profilePhoto: n.fromUser.profilePhoto || undefined,
                                  },
                                ]);
                                setNotifications((prev) =>
                                  prev.map((notif) =>
                                    notif.id === n.id ? { ...notif, followStatus: "accepted" } : notif
                                  )
                                );
                              } catch (err: any) {
                                setNotificationsError(err.message || "Failed to accept request");
                              }
                            }}
                          >
                            Accept
                          </button>
                          <button
                            className="px-3 py-1 text-xs bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-150"
                            onClick={async () => {
                              try {
                                if (!n.followId) throw new Error("Missing followId");
                                await rejectFollowRequest(n.followId);
                                setNotifications((prev) =>
                                  prev.map((notif) =>
                                    notif.id === n.id ? { ...notif, followStatus: "rejected" } : notif
                                  )
                                );
                              } catch (err: any) {
                                setNotificationsError(err.message || "Failed to reject request");
                              }
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop layout grid */}
      <div className="max-w-7xl mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Sidebar (desktop) */}
        <aside className="hidden lg:block lg:col-span-1">
          <div className="sticky top-4 bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
            <div className="flex gap-2 mb-4">
              <button className="flex-1 py-2 rounded-full text-sm font-medium bg-[#3F978F] text-white">
                Notifications
              </button>
            </div>

            <div
              ref={notificationsContainerRef}
              className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-hide"
            >
              {loadingNotifications && (
                <div className="flex justify-center py-4">
                  <Loader2 className="animate-spin w-6 h-6 text-[#3F978F]" />
                </div>
              )}
              {notificationsError && (
                <div className="text-red-500 text-sm text-center bg-red-100 dark:bg-red-900/30 p-2 rounded-md">
                  {notificationsError}
                </div>
              )}
              {!loadingNotifications && notifications.length === 0 && (
                <div className="text-gray-500 dark:text-gray-400 text-sm text-center p-4">
                  No notifications yet.
                </div>
              )}

              {notifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-200 font-semibold">
                    {n.fromUser.profilePhoto ? (
                      <img
                        src={absolutize(n.fromUser.profilePhoto, API_BASE)}
                        alt={n.fromUser.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{n.fromUser.name?.[0] || "U"}</span>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                        {n.fromUser.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(n.date).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-sm text-gray-700 dark:text-gray-200 mt-1">
                      {n.type === "like" && (
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4 text-red-500" fill="red" />
                          Liked your post
                        </span>
                      )}
                      {n.type === "comment" && <span>Commented on your post</span>}
                      {n.type === "follow" && n.followStatus === "pending" && <span>Sent you a follow request</span>}
                      {n.type === "follow" && n.followStatus === "accepted" && <span>Started following you</span>}
                      {n.type === "follow" && n.followStatus === "rejected" && <span>Follow request rejected</span>}
                    </div>

                    {n.postContent && (
                      <div className="mt-2 text-xs text-gray-600 dark:text-gray-300 line-clamp-2">
                        "{n.postContent}"
                      </div>
                    )}

                    {n.type === "follow" && n.followStatus === "pending" && (
                      <div className="flex gap-2 mt-2">
                        <button
                          className="px-3 py-1 text-xs bg-[#3F978F] text-white rounded-full hover:bg-[#357f78] transition-colors duration-150"
                          onClick={async () => {
                            try {
                              if (!n.followId) throw new Error("Missing followId");
                              await acceptFollowRequest(n.followId);
                              setFollowing((prev) => [
                                ...prev,
                                {
                                  id: n.fromUser.id,
                                  username: n.fromUser.name,
                                  profilePhoto: n.fromUser.profilePhoto || undefined,
                                },
                              ]);
                              setNotifications((prev) =>
                                prev.map((notif) =>
                                  notif.id === n.id ? { ...notif, followStatus: "accepted" } : notif
                                )
                              );
                            } catch (err: any) {
                              setNotificationsError(err.message || "Failed to accept request");
                            }
                          }}
                        >
                          Accept
                        </button>
                        <button
                          className="px-3 py-1 text-xs bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors duration-150"
                          onClick={async () => {
                            try {
                              if (!n.followId) throw new Error("Missing followId");
                              await rejectFollowRequest(n.followId);
                              setNotifications((prev) =>
                                prev.map((notif) =>
                                  notif.id === n.id ? { ...notif, followStatus: "rejected" } : notif
                                )
                              );
                            } catch (err: any) {
                              setNotificationsError(err.message || "Failed to reject request");
                            }
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Feed (desktop + mobile) */}
        <main className="lg:col-span-3 space-y-4">
          {/* Desktop search card */}
          <div className="hidden lg:block">
            <SearchUsersCard
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              searchLoading={searchLoading}
              searchError={searchError}
              searchResults={searchResults}
              searchHasMore={searchHasMore}
              onLoadMore={loadMoreSearch}
              onToggleFollow={toggleFollowFromSearch}
            />
          </div>

          {/* Posts */}
          <div
            ref={postsContainerRef}
            className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-hide"
          >
            {posts.map((post) => (
              <div key={post.id} className="p-4 border rounded-xl bg-white dark:bg-gray-800 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200 font-semibold">
                    {post.profilePhoto ? (
                      <img
                        src={absolutize(post.profilePhoto, API_BASE)}
                        alt={post.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span>{post.username?.[0] || "U"}</span>
                    )}
                  </div>
                  <span className="font-medium text-sm">{post.username}</span>
                </div>

                <div className="text-sm mb-2">{post.content}</div>
                {post.imageUrl && (
                  <img src={post.imageUrl} alt="Post" className="w-full rounded-xl mb-2 object-cover" />
                )}

                <div className="flex items-center gap-4 text-sm mb-2">
                  <button className="flex items-center gap-1" onClick={() => toggleLike(post.id)}>
                    <Heart
                      className={`w-4 h-4 ${post.liked ? "text-red-500" : "text-gray-400"}`}
                      fill={post.liked ? "red" : "none"}
                    />
                    {post.likes}
                  </button>
                </div>

                <div className="mt-2">
                  {post.comments.slice(0, expandedComments[post.id] ? undefined : 2).map((c) => (
                    <div key={c.id} className="text-sm mb-1">
                      <span className="font-semibold">{c.username}: </span>
                      {c.content}
                    </div>
                  ))}

                  {post.comments.length > 2 && !expandedComments[post.id] && (
                    <button
                      className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      onClick={() => setExpandedComments((prev) => ({ ...prev, [post.id]: true }))}
                    >
                      View all comments
                    </button>
                  )}

                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={newComment[post.id] || ""}
                      onChange={(e) =>
                        setNewComment((prev) => ({ ...prev, [post.id]: e.target.value }))
                      }
                      placeholder="Add a comment..."
                      className="flex-1 border rounded-full px-3 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-[#3F978F]"
                    />
                    <button
                      className="px-3 py-1 bg-[#3F978F] text-white rounded-full text-xs hover:bg-[#357f78]"
                      onClick={() => addCommentHandler(post.id)}
                    >
                      Post
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <div ref={sentinelRef} className="h-4" />
            {loadingMore && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default FeedPage;
