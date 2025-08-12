import { Heart, Loader2, Search } from "lucide-react";
import React, { useState, useEffect, useCallback } from "react";
import {
  getPosts,
  addComment,
  likePost,
  unlikePost,
  followUser,
  unfollowUser,
  getFollowing,
  getFollowers,
  searchUsers,
} from "../services/socialApi";

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
  followersCount: number;
  followingCount: number;
};

const API_URL = "http://localhost:5001";

type SearchUsersCardProps = {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  searchLoading: boolean;
  searchError: string | null;
  searchResults: UserResult[];
  searchHasMore: boolean;
  onLoadMore: () => void;
  onToggleFollow: (id: string, isFollowing: boolean) => void;
};

const SearchUsersCard: React.FC<SearchUsersCardProps> = React.memo(({
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
      <div className="relative mb-3 md:mb-6">
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
                  src={`${API_URL}${u.profilePhoto}`}
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
              onClick={() => onToggleFollow(u.id, u.isFollowing)}
              className={`ml-auto text-xs px-3 py-1 rounded-full ${u.isFollowing
                ? "bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100"
                : "bg-[#3F978F] text-white"
                }`}
            >
              {u.isFollowing ? "Following" : "Follow"}
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
});


const FeedPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
  const [following, setFollowing] = useState<Account[]>([]);
  const [followers, setFollowers] = useState<Account[]>([]);
  const [activeTab, setActiveTab] = useState<"following" | "followers">("following");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null); // New state for username
  const [searchQuery, setSearchQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searchOffset, setSearchOffset] = useState(0);
  const [searchHasMore, setSearchHasMore] = useState(false);
  // paging
  const pageSize = 2;
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);


  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length !== 3) {
          throw new Error('Invalid token format');
        }
        const encodedPayload = tokenParts[1];
        const rawPayload = atob(encodedPayload);
        const user = JSON.parse(rawPayload);
        setCurrentUserId(user.id);
        setUsername(user.name || user.username || "Unknown"); // Adjust based on your token field
      } catch (err) {
        setError('Failed to decode authentication token. Please log in again.');
      }
    } else {
      setError('No authentication token found. Please log in.');
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
        imageUrl: post.imageUrl,
        location: post.location,
        weather: post.weather,
        // closetItem only if your API includes it
      }));

      setPosts(prev => [...prev, ...batch]);
      setOffset(prev => prev + pageSize);
      setHasMore(batch.length === pageSize);
    } catch (e: any) {
      setError(e.message || "Failed to load posts");
    } finally {
      setLoadingMore(false);
    }
  }, [currentUserId, offset, hasMore, loadingMore]);

  const fetchFollowData = useCallback(async () => {
    if (!currentUserId) return;
    try {
      const [followingRes, followersRes] = await Promise.all([
        getFollowing(currentUserId, 20, 0),
        getFollowers(currentUserId, 20, 0),
      ]);
      setFollowing(
        followingRes.following.map((f: any) => ({
          id: f.following.id,
          username: f.following.name,
          profilePhoto: f.following.profilePhoto,
        }))
      );
      setFollowers(
        followersRes.followers.map((f: any) => ({
          id: f.follower.id,
          username: f.follower.name,
          profilePhoto: f.follower.profilePhoto,
        }))
      );
    } catch (err: any) {
      setError(err.message || "Failed to load follow data");
    }
  }, [currentUserId]);


  // reset when we know the user
  useEffect(() => {
    if (!currentUserId) return;
    setPosts([]);
    setOffset(0);
    setHasMore(true);
  }, [currentUserId]);

  // kick off the first page
  useEffect(() => {
    if (!currentUserId) return;
    fetchNext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting) {
        fetchNext();
      }
    }, { rootMargin: "600px" }); // prefetch before the very bottom
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

    // debounce 400ms
    timer = window.setTimeout(run, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const loadMoreSearch = async () => {
    if (!searchHasMore || !searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const data = await searchUsers(searchQuery, pageSize, searchOffset);
      const newResults: UserResult[] = data.results || [];
      setSearchResults(prev => [...prev, ...newResults]);
      setSearchOffset(prev => prev + pageSize);
      setSearchHasMore(newResults.length === pageSize);
    } catch (e: any) {
      setSearchError(e.message || "Failed to load more");
    } finally {
      setSearchLoading(false);
    }
  };


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
    } catch (err: any) {
      setError(err.message);
    }
  };

  const addCommentHandler = async (postId: string) => {
    const content = (newComment[postId] || "").trim();
    if (!content) return; // bail early

    try {

      const { comment: c } = await addComment(postId, content); // one call, inside try

      const newComm = {
        id: c.id,
        content: c.content,
        userId: c.userId,
        username: c.user?.name || "You",
        // profilePhoto: c.user?.profilePhoto,
      };

      setPosts(prev =>
        prev.map(p =>
          p.id === postId ? { ...p, comments: [...p.comments, newComm] } : p
        )
      );
      setNewComment(prev => ({ ...prev, [postId]: "" }));

    } catch (err: any) {
      setError(err.message || "Failed to add comment");
    }
  };



  const toggleFollow = async (accountId: string, isFollowing: boolean) => {
    try {
      if (isFollowing) {
        await unfollowUser(accountId);
        setFollowing(following.filter((f) => f.id !== accountId));
      } else {
        await followUser(accountId);
        setFollowing([...following, { id: accountId, username: "New User", profilePhoto: "U" }]);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };


  const toggleFollowFromSearch = async (userId: string, isFollowing: boolean) => {
    try {
      if (isFollowing) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }
      setSearchResults(prev =>
        prev.map(u => (u.id === userId ? { ...u, isFollowing: !isFollowing } : u))
      );
      if (isFollowing) {
        setFollowing(prev => prev.filter(f => f.id !== userId));
      } else {
        setFollowing(prev => [...prev, { id: userId, username: "New User", profilePhoto: "U" }]);
      }
    } catch (err: any) {
      setError(err.message || "Follow action failed");
    }
  };

  return (
    <div className="w-full max-w-screen-xl mx-auto px-0 md:px-4 py-3 md:py-6 flex flex-col md:flex-row gap-4 md:gap-10">      <div className="w-full md:w-[32%] order-1 md:order-2">
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

      <div className="w-full md:w-[58%] space-y-4 md:space-y-6 order-2 md:order-1 -mx-0 md:mx-0">        {error && <div className="text-red-500 text-sm">{error}</div>}
        {posts.length === 0 && loadingMore ? (
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white dark:bg-gray-800 rounded-none p-5 shadow-md border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-gray-700 dark:text-gray-200 font-semibold relative">
                    <span className="absolute inset-0 flex items-center justify-center">
                      {post.username?.[0].toUpperCase() || "U"}
                    </span>
                    {post.profilePhoto && (
                      <img
                        src={`${API_URL}${post.profilePhoto}`}
                        alt={`${post.username}'s profile photo`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget).style.display = "none";
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm dark:text-gray-100">@{post.username}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{post.date}</div>
                  </div>
                </div>

                <p className="text-sm text-gray-800 dark:text-gray-200 mb-3">{post.content}</p>
                {post.imageUrl && (
                  <div className="-mx-5 md:-mx-5 bg-gray-100 dark:bg-gray-700">
                    <img
                      src={`${API_URL}${post.imageUrl}`}
                      alt="Outfit"
                      className="w-full h-auto object-cover"
                    />
                  </div>
                )}

                {(post.location || post.weather || post.closetItem) && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    {post.weather && `Weather: ${post.weather.condition} (${post.weather.temp}°C)`}
                    {post.weather && (post.location || post.closetItem) && " | "}
                    {post.location && `Location: ${post.location}`}
                    {(post.weather || post.location) && post.closetItem && " | "}
                    {post.closetItem && `Item: ${post.closetItem.filename} (${post.closetItem.category})`}
                  </p>
                )}

                <div className="mt-3 flex items-center">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className="flex items-center space-x-1 focus:outline-none"
                    aria-label={post.liked ? "Unlike post" : "Like post"}
                  >
                    <Heart
                      className={`h-5 w-5 transition-colors ${post.liked ? "fill-red-500 text-red-500" : "text-gray-400 dark:text-gray-400"
                        }`}
                    />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {post.likes} likes
                    </span>
                  </button>
                </div>

                <div className="mt-4 space-y-1">
                  {post.comments.map((comment) => (
                    <div key={comment.id} className="text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-semibold">{comment.username}: </span>
                      {comment.content}
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center border-t border-gray-200 dark:border-gray-700 pt-2">
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    value={newComment[post.id] || ""}
                    onChange={(e) => setNewComment({ ...newComment, [post.id]: e.target.value })}
                    className="flex-1 bg-transparent outline-none text-sm dark:text-gray-100"
                    aria-label="Comment input"
                  />
                  <button
                    onClick={() => addCommentHandler(post.id)}
                    className="text-[#3F978F] text-sm font-semibold"
                    disabled={!newComment[post.id]?.trim()}
                  >
                    Post
                  </button>
                </div>
              </div>
            ))}
            {/* Sentinel only when there is more to load */}
            {hasMore && <div ref={sentinelRef} className="h-12" />}

            {/* Show loading-more indicator independently */}
            {loadingMore && (
              <div className="flex justify-center py-3 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
              </div>
            )}

            {/* Caught up message */}
            {!hasMore && posts.length > 0 && (
              <div className="text-center text-xs text-gray-400">You’re all caught up ✨</div>
            )}

          </>
        )}
      </div>
    </div>
  );
};

export default FeedPage;