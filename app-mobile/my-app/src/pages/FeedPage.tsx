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
  followStatus?: "pending" | "accepted" | "rejected"; // add this
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
  isFollowing: boolean;      // true if following or follow accepted
  followRequested?: boolean; // true if follow request is pending
  isPrivate: boolean;        // needed to know if user is private
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
      status: "pending" | "accepted" | "rejected"; // ✅ Add status here
    };


interface NotificationsApiResult {
  notifications: NotificationAPIItem[];
}

// Alias for convenience
type NotificationsResponse = NotificationAPIItem[];

const API_URL = `${API_BASE}`;

type SearchUsersCardProps = {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  searchLoading: boolean;
  searchError: string | null;
  searchResults: UserResult[];
  searchHasMore: boolean;
  onLoadMore: () => void;
  // Change this line:
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
      <div>
        <div className="relative mb-3 md:mb-6 left-3 md:left-0 -right-4 md:right-3 mr-6 md:mr-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="pl-10 pr-4 py-2 w-full border rounded-full bg-white dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700"
          />
        </div>

        {searchError && <div className="mt-3 text-xs text-red-500">{searchError}</div>}

        <div className="space-y-3">
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
              className="flex items-center gap-3 p-2 rounded-xl border border-gray-200 dark:border-gray-700"
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
      : "bg-[#3F978F] text-white"
  }`}
>
  {u.isFollowing
    ? "Following"
    : u.followRequested
    ? "Requested"
    : "Follow"}
</button>


            </div>
          ))}

          {searchHasMore && (
            <button
              onClick={onLoadMore}
              className="w-full mt-2 bg-[#3F978F] text-white px-3 py-2 rounded-full text-xs disabled:opacity-70"
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
  const [loadingPosts, setLoadingPosts] = useState(true);
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
  const [activeLeftTab, setActiveLeftTab] = useState<"search" | "notifications">("search");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);

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

  // Replace your fetchNotifs / fetchNotifications logic with this:
// Type guard for "follow" notifications
function isFollowNotification(
  n: NotificationAPIItem
): n is Extract<NotificationAPIItem, { type: "follow" }> {
  return n.type === "follow";
}

const fetchNotifications = useCallback(async () => {
  if (!currentUserId) return;

  setLoadingNotifications(true);
  setNotificationsError(null);

  try {
    const response = await getNotifications(); // returns { notifications: NotificationAPIItem[] }

    // Map API notifications to frontend Notification type
    const notificationsArray: Notification[] = (response.notifications ?? []).map((n) => ({
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

    // Optional: sort by newest first
    notificationsArray.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setNotifications(notificationsArray);
  } catch (err: any) {
    setNotificationsError(err.message || "Failed to load notifications");
  } finally {
    setLoadingNotifications(false);
  }
}, [currentUserId]);





// Auto-refresh notifications every 5s
useEffect(() => {
  if (!currentUserId || activeLeftTab !== "notifications") return;

  fetchNotifications();
  const interval = setInterval(fetchNotifications, 5000);
  return () => clearInterval(interval);
}, [currentUserId, activeLeftTab, fetchNotifications]);



  useEffect(() => {
    if (currentUserId && activeLeftTab === "notifications") fetchNotifications();
  }, [currentUserId, activeLeftTab, fetchNotifications]);

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

      // Refresh notifications
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

      // Refresh notifications
      fetchNotifications();
    } catch (err: any) {
      setError(err.message || "Failed to add comment");
    }
  };

  // const toggleFollowFromSearch = async (userId: string, isFollowing: boolean) => {
  //   try {
  //     if (isFollowing) await unfollowUser(userId);
  //     else await followUser(userId);

  //     setSearchResults((prev) =>
  //       prev.map((u) => (u.id === userId ? { ...u, isFollowing: !isFollowing } : u))
  //     );
  //     if (isFollowing) setFollowing((prev) => prev.filter((f) => f.id !== userId));
  //     else setFollowing((prev) => [...prev, { id: userId, username: "New User", profilePhoto: "U" }]);
  //   } catch (err: any) {
  //     setError(err.message || "Follow action failed");
  //   }
  // };

  const toggleFollowFromSearch = async (userId: string, user: UserResult) => {
  try {
    if (user.isFollowing || user.followRequested) {
      // Unfollow or cancel pending request
      await unfollowUser(userId);

      // Update search results
      setSearchResults(prev =>
        prev.map(u =>
          u.id === userId ? { ...u, isFollowing: false, followRequested: false } : u
        )
      );

      // Remove from following list if it was accepted
      setFollowing(prev => prev.filter(f => f.id !== userId));

    } else {
      // Send follow request
      const { follow } = await followUser(userId);

      // Update search results with status
      setSearchResults(prev =>
        prev.map(u =>
          u.id === userId
            ? {
                ...u,
                isFollowing: follow.status === "accepted",
                followRequested: follow.status === "pending",
              }
            : u
        )
      );

      // If follow is accepted, add to following list
      if (follow.status === "accepted") {
        setFollowing(prev => [
          ...prev,
          { id: userId, username: user.name, profilePhoto: user.profilePhoto || undefined },
        ]);
      }
    }
  } catch (err: any) {
    setError(err.message || "Follow action failed");
  }
};



  // Search and infinite scrolling logic remains unchanged
  useEffect(() => {
    if (!currentUserId) return;
    setPosts([]);
    setOffset(0);
    setHasMore(true);
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;
    fetchNext();
  }, [currentUserId]);

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
    <div className="w-full max-w-screen-md mx-auto px-2 md:px-0 py-4 flex flex-col gap-4">
      {showSuccessPopup && (
        <div className="p-2 bg-green-500 text-white rounded-md text-sm">Post created successfully!</div>
      )}

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

      {activeLeftTab === "search" ? (
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
      ) : (
        <div>
          {loadingNotifications && <Loader2 className="animate-spin w-5 h-5" />}
          {notificationsError && <div className="text-red-500 text-sm">{notificationsError}</div>}
          {!loadingNotifications && notifications.length === 0 && <div className="text-gray-500 text-sm">No notifications.</div>}
          <div className="space-y-2 mt-2">
            {notifications.map((n) => (
  <div key={n.id} className="p-2 border rounded-md flex flex-col gap-1">
    <span className="font-semibold">{n.fromUser.name}</span>
    {n.type === "like" && <span>liked your post</span>}
    {n.type === "comment" && <span>commented on your post</span>}

    {n.type === "follow" && n.followStatus === "pending" && (
  <div className="flex gap-2 mt-1">
    <button
      className="px-2 py-1 text-xs bg-green-500 text-white rounded"
      onClick={async () => {
        try {
          if (!n.followId) throw new Error("Missing followId");
          const acceptedFollow = await acceptFollowRequest(n.followId);

          setFollowing(prev => [
            ...prev,
            {
              id: n.fromUser.id,
              username: n.fromUser.name,
              profilePhoto: n.fromUser.profilePhoto || undefined,
            },
          ]);

          // Optimistically mark as accepted
          setNotifications(prev =>
            prev.map(notif =>
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
      className="px-2 py-1 text-xs bg-red-500 text-white rounded"
      onClick={async () => {
        try {
          if (!n.followId) throw new Error("Missing followId");
          await rejectFollowRequest(n.followId);

          // Optimistically mark as rejected
          setNotifications(prev =>
            prev.map(notif =>
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

    {n.type === "follow" && n.followStatus === "accepted" && <span>accepted your follow request</span>}
    {n.type === "follow" && n.followStatus === "rejected" && <span>rejected your follow request</span>}

    {n.postContent && <div className="mt-1 text-gray-700 dark:text-gray-300">{n.postContent}</div>}
  </div>
))}

          </div>
        </div>
      )}

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

            <div className="mt-2">
              {post.comments.slice(0, expandedComments[post.id] ? undefined : 2).map((c) => (
                <div key={c.id} className="text-sm mb-1">
                  <span className="font-semibold">{c.username}: </span>
                  {c.content}
                </div>
              ))}

              {post.comments.length > 2 && !expandedComments[post.id] && (
                <button
                  className="text-xs text-gray-500"
                  onClick={() => setExpandedComments((prev) => ({ ...prev, [post.id]: true }))}
                >
                  View all comments
                </button>
              )}

              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  value={newComment[post.id] || ""}
                  onChange={(e) => setNewComment((prev) => ({ ...prev, [post.id]: e.target.value }))}
                  placeholder="Add a comment..."
                  className="flex-1 border rounded-full px-2 py-1 text-sm"
                />
                <button
                  className="px-3 py-1 bg-[#3F978F] text-white rounded-full text-xs"
                  onClick={() => addCommentHandler(post.id)}
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div ref={sentinelRef} className="h-4" />
      {loadingMore && (
        <div className="flex justify-center py-2">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      )}
    </div>
  );
};

export default FeedPage;
