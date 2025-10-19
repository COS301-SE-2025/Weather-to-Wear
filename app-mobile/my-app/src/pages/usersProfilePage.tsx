import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MoreHorizontal, X, Heart } from "lucide-react";
import {
  getPosts,
  likePost,
  unlikePost,
  addComment,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  searchUsers,
} from "../services/socialApi";
import { API_BASE } from "../config";
import { getMe } from "../services/usersApi";
import { absolutize } from "../utils/url";
import { useParams, useLocation, useNavigate } from "react-router-dom";

const API_URL = `${API_BASE}`;
const prefixed = (url: string) =>
  url.startsWith("http") ? url : `${API_URL}${url}`;

type Comment = {
  id: string;
  content: string;
  userId: string;
  user?: { id: string; name?: string | null; profilePhoto?: string | null };
};

type Post = {
  id: string;
  userId: string;
  imageUrl?: string;
  caption?: string;
  location?: string;
  weather?: any;
  createdAt: string;
  likes?: { userId: string }[];
  comments?: Comment[];
  user?: {
    id: string;
    name?: string | null;
    profilePhoto?: string | null;
  };
};

type UserResult = {
  id: string;
  name: string;
  profilePhoto?: string | null;
  isFollowing: boolean;
  followRequested?: boolean;
  isPrivate: boolean;
  followersCount: number;
  followingCount: number;
};

function decodeToken() {
  try {
    const raw = localStorage.getItem("token");
    if (!raw) return null;
    const [, payload] = raw.split(".");
    const json = JSON.parse(atob(payload));
    return json;
  } catch {
    return null;
  }
}

const UsersPostsPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const location = useLocation();
  const navigate = useNavigate();

  const initialUser = location.state?.user as UserResult | undefined;

  // Auth / current user
  const me = useMemo(() => {
    const fromToken = decodeToken();
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        return { ...fromToken, ...parsed };
      }
    } catch {}
    return fromToken;
  }, []);

  const currentUserId: string | null = me?.id ?? null;
  const isMe = userId === currentUserId;

  // User profile state
  const [userProfile, setUserProfile] = useState<UserResult | null>(null);
  const [postsCount, setPostsCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Posts state
  const pageSize = 12;
  const [posts, setPosts] = useState<Post[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const inFlightRef = useRef(false);

  // Modal state
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [newComment, setNewComment] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>(me?.name ?? "You");
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(me?.profilePhoto ?? null);
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // Derived values - FIXED: Only show posts if actually following (not just requested)
  const canViewPosts = isMe || !userProfile?.isPrivate || (userProfile?.isPrivate && userProfile?.isFollowing);
  const shouldShowPrivateMessage = userProfile?.isPrivate && !userProfile?.isFollowing && !isMe;
  const shouldShowNoPosts = canViewPosts && posts.length === 0 && !loadingMore && !isLoading;

  // Load user profile data
  useEffect(() => {
    if (!userId) {
      setError("Invalid user ID");
      setIsLoading(false);
      return;
    }

    const loadUserData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Get current user info
        try {
          const { user } = await getMe();
          setCurrentUserName(user.name ?? "You");
          setCurrentUserAvatar(user.profilePhoto ?? null);
          localStorage.setItem("user", JSON.stringify(user));
        } catch {}

        let userData: UserResult;

        if (initialUser) {
          userData = initialUser;
        } else {
          const data = await searchUsers(userId, 1, 0);
          userData = data.results[0];
          if (!userData) {
            setError("User not found");
            setIsLoading(false);
            return;
          }
        }

        setUserProfile(userData);

        // Count posts - only if we can view them
        if (isMe || !userData.isPrivate || (userData.isPrivate && userData.isFollowing)) {
          try {
            const resp = await getPosts(1, 0, ["user"], userId);
            const allPosts: Post[] = (resp.posts ?? []) as Post[];
            const userPosts = allPosts.filter((post) => post.userId === userId);
            setPostsCount(userPosts.length);
          } catch {
            setPostsCount(0);
          }
        } else {
          setPostsCount(0);
        }

      } catch (err: any) {
        setError(err.message || "Failed to load user data");
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [userId, initialUser]);

  // Load user posts
  const fetchPosts = useCallback(async (reset = false) => {
    if (!userId || !canViewPosts) return;

    if (reset) {
      setPosts([]);
      setOffset(0);
      setHasMore(true);
    }

    if (inFlightRef.current || !hasMore) return;

    inFlightRef.current = true;
    setLoadingMore(true);

    try {
      const currentOffset = reset ? 0 : offset;
      const resp = await getPosts(pageSize, currentOffset, ["user", "comments", "comments.user", "likes"], userId);
      const batch: Post[] = (resp.posts ?? []) as Post[];

      const userPosts = batch.filter((post) => post.userId === userId);

      if (reset) {
        setPosts(userPosts);
      } else {
        setPosts(prev => {
          const seen = new Set(prev.map(p => p.id));
          const newPosts = userPosts.filter(p => !seen.has(p.id));
          return [...prev, ...newPosts];
        });
      }

      const newOffset = currentOffset + userPosts.length;
      setOffset(newOffset);
      setHasMore(userPosts.length === pageSize);

      // Update posts count based on actual loaded posts
      if (reset) {
        setPostsCount(userPosts.length);
      }

    } catch (err: any) {
      setError(err.message || "Failed to load posts");
      setHasMore(false);
    } finally {
      setLoadingMore(false);
      inFlightRef.current = false;
    }
  }, [userId, offset, hasMore, canViewPosts, pageSize]);

  // Load posts when user profile is loaded and we can view them
  useEffect(() => {
    if (userProfile && canViewPosts && posts.length === 0 && !loadingMore) {
      fetchPosts(true);
    }
  }, [userProfile, canViewPosts]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loadingMore || !canViewPosts) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          fetchPosts(false);
        }
      },
      { rootMargin: "600px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [fetchPosts, hasMore, loadingMore, canViewPosts]);

  // Like functionality
  const isLikedByMe = (post: Post) =>
    (post.likes ?? []).some((l) => l.userId === currentUserId);

  const toggleLike = async (post: Post) => {
    if (!currentUserId) return;
    const liked = isLikedByMe(post);

    // Optimistic update
    setPosts(prev =>
      prev.map(p =>
        p.id === post.id
          ? {
              ...p,
              likes: liked
                ? (p.likes ?? []).filter(l => l.userId !== currentUserId)
                : [...(p.likes ?? []), { userId: currentUserId }],
            }
          : p
      )
    );

    if (activePost?.id === post.id) {
      setActivePost(prev =>
        prev ? {
          ...prev,
          likes: liked
            ? (prev.likes ?? []).filter(l => l.userId !== currentUserId)
            : [...(prev.likes ?? []), { userId: currentUserId }],
        } : prev
      );
    }

    try {
      if (liked) await unlikePost(post.id);
      else await likePost(post.id);
    } catch {
      // Revert on failure
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, likes: post.likes } : p));
      setActivePost(post);
    }
  };

  // Comment functionality
  const handleAddComment = async () => {
    const content = newComment.trim();
    if (!activePost || !content) return;

    try {
      const { comment: created } = await addComment(activePost.id, content);
      const appended: Comment = {
        id: created.id,
        content: created.content,
        userId: created.userId,
        user: created.user ?? { id: created.userId, name: currentUserName },
      };

      setPosts(prev =>
        prev.map(p =>
          p.id === activePost.id
            ? { ...p, comments: [...(p.comments ?? []), appended] }
            : p
        )
      );

      setActivePost(prev =>
        prev ? { ...prev, comments: [...(prev.comments ?? []), appended] } : prev
      );

      setNewComment("");
    } catch {
      setError("Failed to add comment");
    }
  };

  // Follow functionality - FIXED: Don't load posts when request is pending
  const toggleFollow = async () => {
    if (isMe || !userId || !userProfile) return;

    const oldIsFollowing = userProfile.isFollowing;
    const oldFollowRequested = userProfile.followRequested;

    // Optimistic update
    setUserProfile(prev => prev ? {
      ...prev,
      isFollowing: false,
      followRequested: false,
      followersCount: oldIsFollowing ? prev.followersCount - 1 : prev.followersCount
    } : prev);

    try {
      if (oldIsFollowing || oldFollowRequested) {
        await unfollowUser(userId);
        // If unfollowing a private account, clear posts
        if (userProfile.isPrivate && !isMe) {
          setPosts([]);
          setHasMore(false);
          setPostsCount(0);
        }
      } else {
        const { follow } = await followUser(userId);
        const newIsFollowing = follow.status === "accepted";
        const newFollowRequested = follow.status === "pending";
        
        setUserProfile(prev => prev ? {
          ...prev,
          isFollowing: newIsFollowing,
          followRequested: newFollowRequested,
          followersCount: newIsFollowing ? prev.followersCount + 1 : prev.followersCount
        } : prev);

        // ONLY load posts if follow was immediately accepted
        if (newIsFollowing) {
          // Wait a bit for state to update, then load posts
          setTimeout(() => {
            fetchPosts(true);
          }, 100);
        } else if (newFollowRequested) {
          // If request is pending, ensure posts are cleared
          setPosts([]);
          setHasMore(false);
          setPostsCount(0);
        }
      }
    } catch {
      // Revert on failure
      setUserProfile(prev => prev ? {
        ...prev,
        isFollowing: oldIsFollowing,
        followRequested: oldFollowRequested,
        followersCount: oldIsFollowing ? prev.followersCount : prev.followersCount - 1
      } : prev);
      setError("Failed to update follow status");
    }
  };

  // Helper functions
  const visibleComments = (comments?: Comment[], expanded?: boolean) => {
    if (!comments) return [];
    return expanded ? comments : comments.slice(0, 3);
  };

  // Render
  if (!userId) {
    return (
      <div className="flex flex-col min-h-screen w-screen bg-white dark:bg-gray-900 p-4">
        <div className="text-center text-sm text-red-500 dark:text-red-400">
          Invalid user ID
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen w-screen bg-white dark:bg-gray-900 p-4">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      </div>
    );
  }

  if (error || !userProfile) {
    return (
      <div className="flex flex-col min-h-screen w-screen bg-white dark:bg-gray-900 p-4">
        <div className="text-center text-sm text-red-500 dark:text-red-400">
          {error || "User not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen w-screen bg-white dark:bg-gray-900 transition-all duration-700 ease-in-out overflow-x-hidden ml-[calc(-50vw+50%)]">
      {/* Profile header */}
      <div className="px-4 pt-6 md:pt-10">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-gray-700 dark:text-gray-200 font-semibold relative">
            {userProfile.profilePhoto ? (
              <img
                src={absolutize(userProfile.profilePhoto, API_BASE)}
                alt={userProfile.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <span className="text-xl">
                {userProfile.name?.trim()?.charAt(0)?.toUpperCase() ?? "U"}
              </span>
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-lg md:text-2xl font-semibold dark:text-gray-100 -mt-1">
              {userProfile.name}
            </h1>

            <div className="mt-3 flex items-center gap-6 text-sm">
              <div>
                <span className="font-semibold">{postsCount}</span> posts
              </div>
              <div>
                <span className="font-semibold">{userProfile.followersCount}</span> followers
              </div>
              <div>
                <span className="font-semibold">{userProfile.followingCount}</span> following
              </div>
            </div>

            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Welcome to my wardrobe & fits
            </div>
          </div>

          {!isMe && (
            <button
              onClick={toggleFollow}
              className={`ml-auto text-xs px-3 py-1 rounded-full ${
                userProfile.isFollowing || userProfile.followRequested
                  ? "bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100"
                  : "bg-[#3F978F] text-white hover:bg-[#357f78]"
              }`}
            >
              {userProfile.isFollowing
                ? "Following"
                : userProfile.followRequested
                ? "Requested"
                : "Follow"}
            </button>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="mt-5 border-t border-gray-200 dark:border-gray-800" />

      {/* Posts section */}
      <div className="px-0 md:px-4 py-4 md:py-6">
        {shouldShowPrivateMessage || userProfile.followRequested ? (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-10">
            {userProfile.followRequested 
              ? "Follow request sent." 
              : "This account is private. Follow to see posts."}
          </div>
        ) : shouldShowNoPosts ? (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-10">
            
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-0.5 md:gap-2">
              {posts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => setActivePost(post)}
                  className="relative block aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden"
                  title={post.caption ?? "Post"}
                >
                  {post.imageUrl ? (
                    <img
                      src={absolutize(post.imageUrl, API_BASE)}
                      alt={post.caption ?? "Post image"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                      No Image
                    </div>
                  )}
                  <div className="hidden md:flex absolute inset-0 items-center justify-center bg-black/0 hover:bg-black/20 transition-colors">
                    <MoreHorizontal className="text-white opacity-0 hover:opacity-100 transition-opacity" />
                  </div>
                </button>
              ))}
            </div>

            {/* Sentinel for infinite scroll */}
            {hasMore && <div ref={sentinelRef} className="h-12" />}

            {loadingMore && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className="text-center text-xs text-gray-400 py-6">
                You're all caught up ✨
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal / Lightbox */}
      {activePost && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-0 md:px-6">
          <div className="bg-white dark:bg-gray-900 w-full md:max-w-5xl md:h-[80vh] md:rounded-2xl overflow-hidden grid grid-rows-[auto,1fr] md:grid-cols-2 md:grid-rows-1">
            {/* Image side */}
            <div className="relative bg-black">
              <img
                src={absolutize(activePost.imageUrl ?? "", API_BASE)}
                alt={activePost.caption ?? "Post image"}
                className="w-full h-full object-contain md:object-cover bg-black"
              />
              <button
                className="absolute top-3 right-3 bg-white/80 dark:bg-black/60 rounded-full p-1"
                onClick={() => setActivePost(null)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Meta side */}
            <div className="flex flex-col max-h-[80vh]">
              {/* header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-gray-700 dark:text-gray-200">
                  {activePost.user?.profilePhoto ? (
                    <img
                      src={absolutize(activePost.user.profilePhoto, API_BASE)}
                      alt={activePost.user?.name ?? "user"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs">
                      {(activePost.user?.name ?? currentUserName)?.[0]?.toUpperCase() ?? "U"}
                    </span>
                  )}
                </div>
                <div className="text-sm font-medium">
                  @{activePost.user?.name ?? currentUserName}
                </div>
              </div>

              {/* scrollable content */}
              <div className="p-4 space-y-3 overflow-y-auto">
                {activePost.caption && (
                  <div className="text-sm dark:text-gray-100">{activePost.caption}</div>
                )}

                {/* likes + like button */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleLike(activePost)}
                    className="inline-flex items-center gap-1 text-sm"
                  >
                    <Heart
                      className={`w-5 h-5 ${isLikedByMe(activePost) ? "fill-red-500 text-red-500" : "text-gray-400"}`}
                    />
                    <span className="text-gray-600 dark:text-gray-300">
                      {(activePost.likes ?? []).length} likes
                    </span>
                  </button>
                </div>

                {/* comments */}
                <div className="mt-2">
                  <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">
                    Comments
                  </div>

                  {visibleComments(
                    activePost.comments,
                    expandedComments[activePost.id]
                  ).map((c) => (
                    <div key={c.id} className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                      <span className="font-semibold">
                        @{c.user?.name ?? c.userId.slice(0, 6)}:{" "}
                      </span>
                      {c.content}
                    </div>
                  ))}

                  {(activePost.comments?.length ?? 0) > 3 && (
                    <button
                      className="mt-1 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      onClick={() =>
                        setExpandedComments((m) => ({
                          ...m,
                          [activePost.id]: !m[activePost.id],
                        }))
                      }
                    >
                      {expandedComments[activePost.id]
                        ? "Hide comments"
                        : `View all ${activePost.comments?.length ?? 0} comments`}
                    </button>
                  )}
                </div>
              </div>

              {/* add comment */}
              <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex items-center gap-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment…"
                  className="flex-1 bg-transparent outline-none text-sm dark:text-gray-100"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className="text-sm font-semibold text-[#3F978F] disabled:opacity-60"
                >
                  Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPostsPage;