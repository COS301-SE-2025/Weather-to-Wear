import { Heart, Loader2 } from "lucide-react";
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

const API_URL = "http://localhost:5001";

const FeedPage: React.FC = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [newComment, setNewComment] = useState<{ [key: string]: string }>({});
  const [following, setFollowing] = useState<Account[]>([]);
  const [followers, setFollowers] = useState<Account[]>([]);
  const [activeTab, setActiveTab] = useState<"following" | "followers">("following");
  const currentUserId = "current-user-id"; // TODO: Replace with auth context

  const fetchPosts = useCallback(
    async (reset: boolean = false) => {
      if (!hasMore && !reset) return;
      setLoadingPosts(true);
      try {
        const response = await getPosts(20, reset ? 0 : offset, ["user", "comments", "likes", "closetItem"]);
        const formattedPosts: Post[] = response.posts.map((post: any) => ({
          id: post.id,
          userId: post.userId,
          username: post.user?.name || "Unknown",
          profilePhoto: post.user?.profilePhoto || post.user?.name?.[0] || "U",
          content: post.caption || "",
          likes: post.likes?.length || 0,
          liked: post.likes?.some((like: any) => like.userId === currentUserId) || false,
          date: new Date(post.createdAt).toLocaleString(),
          comments: post.comments?.map((comment: any) => ({
            id: comment.id,
            content: comment.content,
            userId: comment.userId,
            username: comment.user?.name || "Unknown",
          })) || [],
          imageUrl: post.imageUrl,
          location: post.location,
          weather: post.weather,
          closetItem: post.closetItem
            ? { id: post.closetItem.id, filename: post.closetItem.filename, category: post.closetItem.category }
            : undefined,
        }));
        setPosts((prev) => (reset ? formattedPosts : [...prev, ...formattedPosts]));
        setOffset((prev) => (reset ? 20 : prev + 20));
        setHasMore(formattedPosts.length === 20);
      } catch (err: any) {
        setError(err.message || "Failed to load posts");
      } finally {
        setLoadingPosts(false);
      }
    },
    [offset, hasMore, currentUserId]
  );

  const fetchFollowData = useCallback(async () => {
    try {
      const [followingRes, followersRes] = await Promise.all([
        getFollowing(currentUserId, 20, 0),
        getFollowers(currentUserId, 20, 0),
      ]);
      setFollowing(
        followingRes.following.map((f: any) => ({
          id: f.following.id,
          username: f.following.name,
          profilePhoto: f.following.profilePhoto || f.following.name?.[0] || "U",
        }))
      );
      setFollowers(
        followersRes.followers.map((f: any) => ({
          id: f.follower.id,
          username: f.follower.name,
          profilePhoto: f.follower.profilePhoto || f.follower.name?.[0] || "U",
        }))
      );
    } catch (err: any) {
      setError(err.message || "Failed to load follow data");
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchPosts(true);
    fetchFollowData();
  }, [fetchPosts, fetchFollowData]);

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

  const addCommentHandler = async (id: string) => {
    const comment = newComment[id]?.trim();
    if (!comment) return;
    try {
      const response = await addComment(id, comment);
      const newComm = { id: response.comment.id, content: comment, userId: currentUserId, username: "You" };
      setPosts(posts.map((p) => (p.id === id ? { ...p, comments: [...p.comments, newComm] } : p)));
      setNewComment({ ...newComment, [id]: "" });
    } catch (err: any) {
      setError(err.message);
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

  return (
    <div className="w-full max-w-screen-xl mx-auto px-4 py-6 flex flex-col md:flex-row gap-10">
      <div className="hidden md:block w-4" />

      <div className="w-full md:w-[58%] space-y-6">
        {error && <div className="text-red-500 text-sm">{error}</div>}
        {loadingPosts && posts.length === 0 ? (
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white dark:bg-gray-800 rounded-3xl p-5 shadow-md border border-black dark:border-gray-700"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-gray-700 dark:text-gray-200 font-semibold relative">
                    {post.profilePhoto && (
                      <>
                        <img
                          src={`${API_URL}${post.profilePhoto}`}
                          alt={`${post.username}'s profile photo`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                            e.currentTarget.nextSibling!.textContent = post.profilePhoto || "U";
                          }}
                        />
                        <span className="absolute">{post.profilePhoto}</span>
                      </>
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-sm dark:text-gray-100">@{post.username}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{post.date}</div>
                  </div>
                </div>

                <p className="text-sm text-gray-800 dark:text-gray-200 mb-3">{post.content}</p>
                {post.imageUrl && (
                  <div className="rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                    <img
                      src={`${API_URL}${post.imageUrl}`}
                      alt="Outfit"
                      className="w-full h-auto"
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
                      className={`h-5 w-5 transition-colors ${
                        post.liked ? "fill-red-500 text-red-500" : "text-gray-400 dark:text-gray-400"
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
                    className="text-blue-500 text-sm font-semibold"
                    disabled={!newComment[post.id]?.trim()}
                  >
                    Post
                  </button>
                </div>
              </div>
            ))}
            {hasMore && (
              <button
                onClick={() => fetchPosts()}
                className="mt-4 bg-blue-500 text-white px-4 py-2 rounded text-sm"
                disabled={loadingPosts}
              >
                {loadingPosts ? <Loader2 className="h-5 w-5 animate-spin inline" /> : "Load More"}
              </button>
            )}
          </>
        )}
      </div>

      <div className="w-full md:w-[32%]">
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setActiveTab("following")}
            className={`text-xl font-livvic ${activeTab === "following" ? "text-blue-500" : "text-gray-500"} dark:text-gray-100`}
          >
            Following
          </button>
          <button
            onClick={() => setActiveTab("followers")}
            className={`text-xl font-livvic ${activeTab === "followers" ? "text-blue-500" : "text-gray-500"} dark:text-gray-100`}
          >
            Followers
          </button>
        </div>
        <div className="space-y-5">
          {(activeTab === "following" ? following : followers).map((account) => (
            <div
              key={account.id}
              className="bg-white dark:bg-gray-800 rounded-3xl p-4 shadow-md border border-black dark:border-gray-700 flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-700 dark:text-gray-200 font-bold relative overflow-hidden">
                {account.profilePhoto && (
                  <>
                    <img
                      src={`${API_URL}${account.profilePhoto}`}
                      alt={`${account.username}'s profile photo`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        e.currentTarget.nextSibling!.textContent = account.profilePhoto || "U";
                      }}
                    />
                    <span className="absolute">{account.profilePhoto}</span>
                  </>
                )}
              </div>
              <div className="text-sm font-medium dark:text-gray-100">
                @{account.username}
              </div>
              <button
                onClick={() => toggleFollow(account.id, activeTab === "following")}
                className="ml-auto bg-blue-500 text-white px-2 py-1 rounded text-sm"
              >
                {activeTab === "following" ? "Unfollow" : "Follow"}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FeedPage;