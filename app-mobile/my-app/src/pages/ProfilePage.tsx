// src/pages/ProfilePage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Settings, MoreHorizontal, X, Heart } from "lucide-react";
import {
  getPosts,
  likePost,
  unlikePost,
  addComment,
  followUser,
  unfollowUser,
  getFollowing,
  getFollowers,
  searchUsers,
} from "../services/socialApi";
import { API_BASE } from "../config";
import { getMe } from "../services/usersApi";
import { absolutize } from "../utils/url";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";

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
  location?: string | null;
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
    return json; // expect { id, name?, profilePhoto? ... }
  } catch {
    return null;
  }
}

async function countFollowers(userId: string): Promise<number> {
  const page = 50;
  let offset = 0;
  let total = 0;

  while (true) {
    const res = await getFollowers(userId, page, offset);
    const chunk = res?.followers ?? [];
    total += chunk.length;
    if (chunk.length < page) break;
    offset += page;
  }
  return total;
}

async function countFollowing(userId: string): Promise<number> {
  const page = 50;
  let offset = 0;
  let total = 0;

  while (true) {
    const res = await getFollowing(userId, page, offset);
    const chunk = res?.following ?? [];
    total += chunk.length;
    if (chunk.length < page) break;
    offset += page;
  }
  return total;
}

const ProfilePage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
  const targetUserId = userId ?? currentUserId ?? "";

  const [profile, setProfile] = useState<UserResult | null>(initialUser ?? null);
  const [followersCount, setFollowersCount] = useState<number | null>(initialUser?.followersCount ?? null);
  const [followingCount, setFollowingCount] = useState<number | null>(initialUser?.followingCount ?? null);
  const [isFollowing, setIsFollowing] = useState(initialUser?.isFollowing ?? false);
  const [followRequested, setFollowRequested] = useState(initialUser?.followRequested ?? false);
  const [isPrivate, setIsPrivate] = useState(initialUser?.isPrivate ?? false);
  const [error, setError] = useState<string | null>(null);

  const isMe = targetUserId === currentUserId;
  const canViewPosts = !isPrivate || isFollowing || isMe;

  const pageSize = 12;
  const [posts, setPosts] = useState<Post[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const inFlightRef = useRef(false);

  const [activePost, setActivePost] = useState<Post | null>(null);
  const [newComment, setNewComment] = useState<string>("");
  const [currentUserName, setCurrentUserName] = useState<string>(me?.name ?? "You");
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | null>(me?.profilePhoto ?? null);

  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // Fetch current user details
  useEffect(() => {
    (async () => {
      try {
        const { user } = await getMe();
        setCurrentUserName(user.name ?? "You");
        setCurrentUserAvatar(user.profilePhoto ?? null);
        localStorage.setItem("user", JSON.stringify(user));
      } catch {}
    })();
  }, []);

  // Fetch profile data if no initialUser
  useEffect(() => {
    if (!profile && targetUserId) {
      (async () => {
        try {
          if (isMe && currentUserId) {
            const { user } = await getMe();
            const meProfile: UserResult = {
              id: user.id,
              name: user.name,
              profilePhoto: user.profilePhoto,
              isFollowing: true,
              isPrivate: user.isPrivate ?? false,
              followersCount: await countFollowers(user.id),
              followingCount: await countFollowing(user.id),
              followRequested: false,
            };
            setProfile(meProfile);
            setFollowersCount(meProfile.followersCount);
            setFollowingCount(meProfile.followingCount);
            setIsFollowing(true);
            setFollowRequested(false);
            setIsPrivate(meProfile.isPrivate);
          } else {
            // Fallback: Use searchUsers to fetch profile data
            const response = await searchUsers(targetUserId, 1, 0);
            const user = response.results?.[0];
            if (user) {
              setProfile(user);
              setFollowersCount(user.followersCount);
              setFollowingCount(user.followingCount);
              setIsFollowing(user.isFollowing);
              setFollowRequested(user.followRequested);
              setIsPrivate(user.isPrivate);
            } else {
              setError("User not found");
              navigate("/feed");
            }
          }
        } catch {
          setError("Failed to load profile");
          navigate("/feed");
        }
      })();
    }
  }, [profile, isMe, currentUserId, targetUserId, navigate]);

  // Fetch posts
  const fetchNext = useCallback(async () => {
    if (inFlightRef.current || !hasMore || !canViewPosts) return;

    inFlightRef.current = true;
    setLoadingMore(true);

    try {
      const resp = await getPosts(pageSize, offset, ["user", "comments", "comments.user", "likes"], targetUserId);
      const batch = (resp.posts ?? []) as Post[];

      setPosts((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        const add = batch.filter((p) => !seen.has(p.id));
        return [...prev, ...add];
      });
      setOffset((prev) => prev + pageSize);
      setHasMore(batch.length === pageSize);
    } catch (e: any) {
      if (e.message.includes("Failed to fetch posts")) {
        setHasMore(false);
      }
      setError(e.message || "Failed to load posts");
    } finally {
      setLoadingMore(false);
      inFlightRef.current = false;
    }
  }, [offset, hasMore, canViewPosts, targetUserId, pageSize]);

  // Reset posts when target user changes
  useEffect(() => {
    setPosts([]);
    setOffset(0);
    setHasMore(true);
  }, [targetUserId]);

  // Fetch initial posts
  useEffect(() => {
    if (canViewPosts) fetchNext();
  }, [canViewPosts, fetchNext]);

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) fetchNext();
      },
      { rootMargin: "600px" }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [fetchNext]);

  // Toggle follow
  const toggleFollow = async () => {
    if (isMe || !profile) return;

    try {
      if (isFollowing || followRequested) {
        await unfollowUser(profile.id);
        setIsFollowing(false);
        setFollowRequested(false);
        setFollowersCount((prev) => (prev ?? 1) - 1);
        queryClient.invalidateQueries(["searchUsers"]);
        queryClient.invalidateQueries(["notifications"]);
      } else {
        const { follow } = await followUser(profile.id);
        const status = follow.status;
        setIsFollowing(status === "accepted");
        setFollowRequested(status === "pending");
        if (status === "accepted") {
          setFollowersCount((prev) => (prev ?? 0) + 1);
        }
        queryClient.invalidateQueries(["searchUsers"]);
        queryClient.invalidateQueries(["notifications"]);
      }
    } catch (err: any) {
      setError(err.message || "Follow action failed");
    }
  };

  // Like toggle
  const isLikedByMe = (post: Post) => (post.likes ?? []).some((l) => l.userId === currentUserId);

  const toggleLike = async (post: Post) => {
    if (!currentUserId) return;
    const liked = isLikedByMe(post);

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              likes: liked
                ? (p.likes ?? []).filter((l) => l.userId !== currentUserId)
                : [...(p.likes ?? []), { userId: currentUserId }],
            }
          : p
      )
    );
    setActivePost((prev) =>
      prev && prev.id === post.id
        ? {
            ...prev,
            likes: liked
              ? (prev.likes ?? []).filter((l) => l.userId !== currentUserId)
              : [...(prev.likes ?? []), { userId: currentUserId }],
          }
        : prev
    );

    try {
      if (liked) await unlikePost(post.id);
      else await likePost(post.id);
    } catch {
      // Revert on failure
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, likes: post.likes } : p))
      );
      setActivePost(post);
      setError("Failed to update like");
    }
  };

  // Add comment
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

      setPosts((prev) =>
        prev.map((p) =>
          p.id === activePost.id
            ? { ...p, comments: [...(p.comments ?? []), appended] }
            : p
        )
      );
      setActivePost((prev) =>
        prev ? { ...prev, comments: [...(prev.comments ?? []), appended] } : prev
      );
      setNewComment("");
    } catch {
      setError("Failed to add comment");
    }
  };

  // Visible comments
  const visibleComments = (comments?: Comment[], expanded?: boolean) => {
    if (!comments) return [];
    if (expanded) return comments;
    return comments.slice(0, 3);
  };

  // UI
  return (
    <div className="flex flex-col min-h-screen w-screen bg-white dark:bg-gray-900 transition-all duration-700 ease-in-out overflow-x-hidden ml-[calc(-50vw+50%)]">
      {/* Error Toast */}
      {error && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 p-2 bg-red-500 text-white rounded-md text-sm z-50">
          {error}
        </div>
      )}

      {/* Profile Header */}
      <div className="px-4 pt-6 md:pt-10">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-gray-700 dark:text-gray-200 font-semibold relative">
            {profile?.profilePhoto ? (
              <img
                src={absolutize(profile.profilePhoto, API_BASE)}
                alt={profile.name}
                className="w-full h-full object-cover"
                onError={() => setProfile((prev) => (prev ? { ...prev, profilePhoto: null } : prev))}
              />
            ) : (
              <span className="text-xl">{profile?.name?.[0]?.toUpperCase() ?? "U"}</span>
            )}
          </div>

          <div className="flex-1">
            <div className="flex items-center gap-4">
              <h1 className="text-lg md:text-2xl font-semibold dark:text-gray-100 -mt-1">
                {profile?.name ?? currentUserName}
              </h1>
              {isMe ? (
                <button onClick={() => navigate("/profile")} className="ml-auto">
                  <Settings className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </button>
              ) : (
                <button
                  onClick={toggleFollow}
                  className={`ml-auto text-xs px-3 py-1 rounded-full ${
                    isFollowing || followRequested
                      ? "bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-100"
                      : "bg-[#3F978F] text-white hover:bg-[#357f78]"
                  }`}
                >
                  {isFollowing ? "Following" : followRequested ? "Requested" : "Follow"}
                </button>
              )}
            </div>

            <div className="mt-3 flex items-center gap-6 text-sm">
              <div>
                <span className="font-semibold">{posts.length}</span> posts
              </div>
              <div>
                <span className="font-semibold">{followersCount ?? "—"}</span> followers
              </div>
              <div>
                <span className="font-semibold">{followingCount ?? "—"}</span> following
              </div>
            </div>

            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Welcome to my wardrobe & fits
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="mt-5 border-t border-gray-200 dark:border-gray-800" />

      {/* Posts or Private Message */}
      <div className="px-0 md:px-4 py-4 md:py-6">
        {!canViewPosts ? (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-10">
            This account is private. Follow to see posts.
          </div>
        ) : posts.length === 0 && !hasMore && !loadingMore ? (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-10">
            No posts yet.
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

            {hasMore && <div ref={sentinelRef} className="h-12" />}

            {loadingMore && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className="text-center text-xs text-gray-400 py-6">You’re all caught up ✨</div>
            )}
          </>
        )}
      </div>

      {/* Modal */}
      {activePost && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-0 md:px-6">
          <div className="bg-white dark:bg-gray-900 w-full md:max-w-5xl md:h-[80vh] md:rounded-2xl overflow-hidden grid grid-rows-[auto,1fr] md:grid-cols-2 md:grid-rows-1">
            {/* Image */}
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

            {/* Details */}
            <div className="flex flex-col max-h-[80vh]">
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

              <div className="p-4 space-y-3 overflow-y-auto">
                {activePost.caption && (
                  <div className="text-sm dark:text-gray-100">{activePost.caption}</div>
                )}

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

                <div className="mt-2">
                  <div className="text-xs uppercase tracking-wide text-gray-400 mb-1">Comments</div>

                  {visibleComments(activePost.comments, expandedComments[activePost.id]).map((c) => (
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

export default ProfilePage;