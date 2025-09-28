import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Settings, MoreHorizontal, X, Heart } from "lucide-react";
import {
    getPosts,
    getFollowers,
    getFollowing,
    likePost,
    unlikePost,
    addComment,
} from "../services/socialApi";
import { API_BASE } from '../config';

import { getMe } from "../services/usersApi";
import { absolutize } from '../utils/url';

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

type MiniUser = {
    id: string;
    name?: string;
    profilePhoto?: string | null;
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

const PostsPage: React.FC = () => {
    const me = useMemo(() => {
        const fromToken = decodeToken();
        try {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
                const parsed = JSON.parse(storedUser);
                return { ...fromToken, ...parsed };
            }
        } catch { }
        return fromToken;
    }, []);

    const currentUserId: string | null = me?.id ?? null;
    const [followersCount, setFollowersCount] = useState<number | null>(null);
    const [followingCount, setFollowingCount] = useState<number | null>(null);


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

    useEffect(() => {
        (async () => {
            try {
                const { user } = await getMe(); 
                setCurrentUserName(user.name ?? "You");
                setCurrentUserAvatar(user.profilePhoto ?? null);

                localStorage.setItem("user", JSON.stringify(user));
            } catch {
            }
        })();
    }, []);



    useEffect(() => {
        if (!currentUserId) return;
        (async () => {
            try {
                const [fCount, gCount] = await Promise.all([
                    countFollowers(currentUserId),
                    countFollowing(currentUserId),
                ]);
                setFollowersCount(fCount);
                setFollowingCount(gCount);
            } catch {
                setFollowersCount(null);
                setFollowingCount(null);
            }
        })();
    }, [currentUserId]);


    const fetchNext = useCallback(async () => {
        if (!currentUserId || inFlightRef.current || !hasMore) return;

        inFlightRef.current = true;       
        setLoadingMore(true);

        try {
            const resp = await getPosts(pageSize, offset, ["user", "comments", "comments.user", "likes"]);
            const batch: Post[] = ((resp.posts ?? []) as Post[]).filter(
                (p: Post) => p.userId === currentUserId
            );

            setPosts(prev => {
                const seen = new Set(prev.map(p => p.id));
                const add = batch.filter(p => !seen.has(p.id));
                return [...prev, ...add];
            });

            setOffset(prev => prev + pageSize);
            setHasMore(batch.length === pageSize);
        } catch {
            setHasMore(false);
        } finally {
            setLoadingMore(false);
            inFlightRef.current = false;    
        }
    }, [currentUserId, offset, hasMore, pageSize]);


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
        if (!el || posts.length === 0) return;  

        const io = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) fetchNext();
            },
            { rootMargin: "600px" }
        );

        io.observe(el);
        return () => io.disconnect();
    }, [fetchNext, posts.length]);


    // ----- derived counts -----
    const postsCount = posts.length;

    // ----- like toggle inside modal -----
    const isLikedByMe = (post: Post) =>
        (post.likes ?? []).some((l) => l.userId === currentUserId);

    const toggleLike = async (post: Post) => {
        if (!currentUserId) return;
        const liked = isLikedByMe(post);

        // optimistic update within grid + active modal
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
        setActivePost(prev =>
            prev && prev.id === post.id
                ? {
                    ...prev,
                    likes: liked
                        ? (prev.likes ?? []).filter(l => l.userId !== currentUserId)
                        : [...(prev.likes ?? []), { userId: currentUserId }],
                }
                : prev
        );

        try {
            if (liked) await unlikePost(post.id);
            else await likePost(post.id);
        } catch {
            // revert on failure
            setPosts(prev =>
                prev.map(p =>
                    p.id === post.id
                        ? { ...p, likes: post.likes }
                        : p
                )
            );
            setActivePost(post);
        }
    };

    // ----- comment add (modal) -----
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
                prev
                    ? { ...prev, comments: [...(prev.comments ?? []), appended] }
                    : prev
            );
            setNewComment("");
        } catch {
            // ignore for now
        }
    };

    // ----- small helpers -----
    const visibleComments = (comments?: Comment[], expanded?: boolean) => {
        if (!comments) return [];
        if (expanded) return comments;
        return comments.slice(0, 3);
    };

    const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

    // ----- UI -----
    return (
        <div
      className="flex flex-col min-h-screen w-screen bg-white dark:bg-gray-900 transition-all duration-700 ease-in-out overflow-x-hidden ml-[calc(-50vw+50%)]"
    >
            {/* Profile header */}
            <div className="px-4 pt-6 md:pt-10">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden flex items-center justify-center text-gray-700 dark:text-gray-200 font-semibold relative">
                        {currentUserAvatar ? (
                            <img
                                // src={prefixed(currentUserAvatar)}
                                src={absolutize(currentUserAvatar, API_BASE)}
                                alt={currentUserName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.currentTarget as HTMLImageElement).style.display = "none";
                                    setCurrentUserAvatar(null); // fall back to initial
                                }}
                            />
                        ) : (
                            <span className="text-xl">
                                {currentUserName?.trim()?.charAt(0)?.toUpperCase() ?? "U"}
                            </span>
                        )}
                    </div>


                    <div className="flex-1">
                        {/* Name like the Profile page */}
                        <h1 className="text-lg md:text-2xl font-semibold dark:text-gray-100 -mt-1">
                            {currentUserName}
                        </h1>

                        <div className="mt-3 flex items-center gap-6 text-sm">
                            <div><span className="font-semibold">{postsCount}</span> posts</div>
                            <div><span className="font-semibold">{followersCount ?? "—"}</span> followers</div>
                            <div><span className="font-semibold">{followingCount ?? "—"}</span> following</div>
                        </div>

                        <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                            Welcome to my wardrobe & fits 
                        </div>
                    </div>

                </div>
            </div>

            {/* Divider */}
            <div className="mt-5 border-t border-gray-200 dark:border-gray-800" />

            {/* Grid of posts */}
            <div className="px-0 md:px-4 py-4 md:py-6">
                {posts.length === 0 && !hasMore ? (
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
                                            // src={`${API_URL}${post.imageUrl}`}
                                            src={absolutize(post.imageUrl, API_BASE)}
                                            alt={post.caption ?? "Post image"}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                                            No Image
                                        </div>
                                    )}
                                    {/* subtle overlay on hover (desktop) */}
                                    <div className="hidden md:flex absolute inset-0 items-center justify-center bg-black/0 hover:bg-black/20 transition-colors">
                                        <MoreHorizontal className="text-white opacity-0 hover:opacity-100 transition-opacity" />
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Sentinel for infinite scroll */}
                        {hasMore && posts.length > 0 && <div ref={sentinelRef} className="h-12" />}

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

            {/* Modal / Lightbox */}
            {activePost && (
                <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-0 md:px-6">
                    <div className="bg-white dark:bg-gray-900 w-full md:max-w-5xl md:h-[80vh] md:rounded-2xl overflow-hidden grid grid-rows-[auto,1fr] md:grid-cols-2 md:grid-rows-1">
                        {/* Image side */}
                        <div className="relative bg-black">
                            <img
                                // src={`${API_URL}${activePost.imageUrl ?? ""}`}
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
                                            // src={`${API_URL}${activePost.user.profilePhoto}`}
                                            src={absolutize(activePost.user.profilePhoto, API_BASE)}
                                            alt={activePost.user?.name ?? "user"}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-xs">{(activePost.user?.name ?? currentUserName)?.[0]?.toUpperCase() ?? "U"}</span>
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

export default PostsPage;
