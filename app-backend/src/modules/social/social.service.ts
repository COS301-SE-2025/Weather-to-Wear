// src/modules/social/social.service.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export type NotificationAPIItem = {
  id: string;
  type: "like" | "comment" | "follow";
  fromUser: {
    id: string;
    name: string;
    profilePhoto?: string | null;
  };
  postId?: string | null;
  postContent?: string | null;
  createdAt: string; // ISO string
};

class SocialService {
  // ────────────── POSTS ──────────────
  async createPost(
    userId: string,
    data: {
      imageUrl?: string;
      caption?: string;
      location?: string;
      weather?: any;
      closetItemId?: string;
    }
  ) {
    return prisma.post.create({
      data: {
        userId,
        imageUrl: data.imageUrl,
        caption: data.caption,
        location: data.location,
        weather: data.weather,
        closetItemId: data.closetItemId,
      },
    });
  }

  async getPosts(options: {
    currentUserId: string;
    limit: number;
    offset: number;
    include: string[];
  }) {
    const { currentUserId, limit, offset, include } = options;
    const inc = (include ?? []).map((s) => s.toLowerCase());

    const following = await prisma.follow.findMany({
      where: { followerId: currentUserId, status: "accepted" },
      select: { followingId: true },
    });
    const followingIds = [...following.map((f) => f.followingId), currentUserId];

    return prisma.post.findMany({
      where: { userId: { in: followingIds } },
      take: Number(limit),
      skip: Number(offset),
      orderBy: { createdAt: "desc" },
      include: {
        user: inc.includes("user")
          ? { select: { id: true, name: true, profilePhoto: true } }
          : undefined,
        comments: inc.includes("comments")
          ? {
              orderBy: { createdAt: "asc" },
              include: inc.includes("comments.user")
                ? { user: { select: { id: true, name: true, profilePhoto: true } } }
                : undefined,
            }
          : undefined,
        likes: inc.includes("likes") ? true : undefined,
        closetItem: inc.includes("closetitem") ? true : undefined,
      },
    });
  }

  async getPostById(id: string, include: string[]) {
    const inc = (include ?? []).map((s) => s.toLowerCase());
    return prisma.post.findUnique({
      where: { id },
      include: {
        user: inc.includes("user")
          ? { select: { id: true, name: true, profilePhoto: true } }
          : undefined,
        comments: inc.includes("comments")
          ? {
              orderBy: { createdAt: "asc" },
              include: inc.includes("comments.user")
                ? { user: { select: { id: true, name: true, profilePhoto: true } } }
                : undefined,
            }
          : undefined,
        likes: inc.includes("likes") ? true : undefined,
        closetItem: inc.includes("closetitem") ? true : undefined,
      },
    });
  }

  async updatePost(
    id: string,
    userId: string,
    data: { imageUrl?: string; caption?: string; location?: string; weather?: any }
  ) {
    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) throw new Error("Post not found");
    if (existing.userId !== userId) throw new Error("Forbidden");

    return prisma.post.update({ where: { id }, data });
  }

  async deletePost(id: string, userId: string) {
    const existing = await prisma.post.findUnique({ where: { id } });
    if (!existing) throw new Error("Post not found");
    if (existing.userId !== userId) throw new Error("Forbidden");

    await prisma.post.delete({ where: { id } });
  }

  // ────────────── COMMENTS ──────────────
  async addComment(postId: string, userId: string, content: string) {
    if (!content.trim()) throw new Error("Content is required");
    return prisma.comment.create({
      data: { postId, userId, content },
      include: { user: { select: { id: true, name: true, profilePhoto: true } } },
    });
  }

  async getCommentsForPost(postId: string, limit = 20, offset = 0) {
    return prisma.comment.findMany({
      where: { postId },
      take: limit,
      skip: offset,
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, profilePhoto: true } } },
    });
  }

  async updateComment(id: string, userId: string, content: string) {
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new Error("Comment not found");
    if (comment.userId !== userId) throw new Error("Forbidden");
    if (!content.trim()) throw new Error("Content is required");

    return prisma.comment.update({ where: { id }, data: { content } });
  }

  async deleteComment(id: string, userId: string) {
    const comment = await prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new Error("Comment not found");
    if (comment.userId !== userId) throw new Error("Forbidden");

    await prisma.comment.delete({ where: { id } });
  }

  // ────────────── LIKES ──────────────
  async likePost(postId: string, userId: string) {
    const existingLike = await prisma.like.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existingLike) throw new Error("Already liked");

    return prisma.like.create({ data: { postId, userId } });
  }

  async unlikePost(postId: string, userId: string) {
    const existingLike = await prisma.like.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!existingLike) throw new Error("Like not found");

    await prisma.like.delete({ where: { postId_userId: { postId, userId } } });
  }

  async getLikesForPost(postId: string, limit = 20, offset = 0) {
    return prisma.like.findMany({
      where: { postId },
      skip: offset,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, profilePhoto: true } } },
    });
  }

  // ────────────── FOLLOWS ──────────────
  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) throw new Error("Cannot follow yourself");

    const existingUser = await prisma.user.findUnique({ where: { id: followingId } });
    if (!existingUser) throw new Error("User not found");

    const alreadyFollowing = await prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (alreadyFollowing) throw new Error("Already following");

    return prisma.follow.create({
      data: {
        followerId,
        followingId,
        status: existingUser.isPrivate ? "pending" : "accepted",
      },
    });
  }

  async unfollowUser(followerId: string, followingId: string) {
    await prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    });
  }

  async getFollowers(userId: string, limit = 20, offset = 0) {
    return prisma.follow.findMany({
      where: { followingId: userId, status: "accepted" },
      skip: offset,
      take: limit,
      include: { follower: { select: { id: true, name: true, profilePhoto: true } } },
    });
  }

  async getFollowing(userId: string, limit = 20, offset = 0) {
    return prisma.follow.findMany({
      where: { followerId: userId, status: "accepted" },
      skip: offset,
      take: limit,
      include: { following: { select: { id: true, name: true, profilePhoto: true } } },
    });
  }

  async getFollowRequests(userId: string) {
    return prisma.follow.findMany({
      where: { followingId: userId, status: "pending" },
      include: { follower: { select: { id: true, name: true, profilePhoto: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async acceptFollowRequest(followerId: string, followingId: string) {
    return prisma.follow.update({
      where: { followerId_followingId: { followerId, followingId } },
      data: { status: "accepted" },
    });
  }

  async rejectFollowRequest(followerId: string, followingId: string) {
    return prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    });
  }

  // ────────────── NOTIFICATIONS (DYNAMIC) ──────────────
  async getNotifications(userId: string): Promise<NotificationAPIItem[]> {
    // Get latest comments, likes, and follow requests on user's posts
    const [likes, comments, followRequests] = await Promise.all([
      prisma.like.findMany({
        where: { post: { userId }, NOT: { userId } },
        include: {
          user: { select: { id: true, name: true, profilePhoto: true } },
          post: { select: { id: true, caption: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.comment.findMany({
        where: { post: { userId }, NOT: { userId } },
        include: {
          user: { select: { id: true, name: true, profilePhoto: true } },
          post: { select: { id: true, caption: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      this.getFollowRequests(userId),
    ]);

    const notifications: NotificationAPIItem[] = [
      ...likes.map((l) => ({
        id: l.id,
        type: "like" as const,
        fromUser: {
          id: l.user.id,
          name: l.user.name,
          profilePhoto: l.user.profilePhoto,
        },
        postId: l.postId,
        postContent: l.post?.caption ?? null,
        createdAt: l.createdAt.toISOString(),
      })),
      ...comments.map((c) => ({
        id: c.id,
        type: "comment" as const,
        fromUser: {
          id: c.user.id,
          name: c.user.name,
          profilePhoto: c.user.profilePhoto,
        },
        postId: c.postId,
        postContent: c.post?.caption ?? null,
        createdAt: c.createdAt.toISOString(),
      })),
      ...followRequests.map((f) => ({
        id: f.id,
        type: "follow" as const,
        fromUser: {
          id: f.follower.id,
          name: f.follower.name,
          profilePhoto: f.follower.profilePhoto,
        },
        postId: null,
        postContent: null,
        createdAt: f.createdAt.toISOString(),
      })),
    ];

    // Sort by newest first
    notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return notifications;
  }

  // ────────────── SEARCH ──────────────
  async searchUsers(currentUserId: string, q: string, limit = 20, offset = 0) {
    if (!q.trim()) return [];

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } },
          {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { location: { contains: q, mode: "insensitive" } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        profilePhoto: true,
        location: true,
        followers: { where: { followerId: currentUserId }, select: { id: true } },
        _count: { select: { followers: true, following: true } },
      },
      skip: offset,
      take: limit,
      orderBy: { name: "asc" },
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      profilePhoto: u.profilePhoto,
      location: u.location,
      isFollowing: u.followers.length > 0,
      followersCount: u._count.followers,
      followingCount: u._count.following,
    }));
  }
}

export default new SocialService();
