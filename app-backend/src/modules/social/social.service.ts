// src/modules/social/social.service.ts
import { PrismaClient } from '@prisma/client';

class SocialService {
  private prisma = new PrismaClient();

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


    return this.prisma.post.create({
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

  async getPosts(options: { currentUserId: string; limit: number; offset: number; include: string[]; }) {
    const { currentUserId, limit, offset, include } = options;
    const inc = (include ?? []).map(s => s.toLowerCase());
    const incUser = inc.includes('user');
    const incComments = inc.includes('comments');
    const incCommentUser = inc.includes('comments.user');   // NEW
    const incLikes = inc.includes('likes');
    const incClosetItem = inc.includes('closetitem');

    const following = await this.prisma.follow.findMany({
      where: { followerId: currentUserId },
      select: { followingId: true },
    });
    const followingIds = [...following.map(f => f.followingId), currentUserId];

    return this.prisma.post.findMany({
      where: { userId: { in: followingIds } },
      take: Number(limit),
      skip: Number(offset),
      orderBy: { createdAt: 'desc' },
      include: {
        user: incUser ? { select: { id: true, name: true, profilePhoto: true } } : undefined,
        comments: incComments
          ? {
            orderBy: { createdAt: 'asc' },
            include: incCommentUser
              ? { user: { select: { id: true, name: true, profilePhoto: true } } }
              : undefined,
          }
          : undefined,
        likes: incLikes ? true : undefined,
        closetItem: incClosetItem ? true : undefined,
      },
    });
  }



  async getPostById(id: string, include: string[]) {
    const inc = (include ?? []).map(s => s.toLowerCase());
    const incUser = inc.includes('user');
    const incComments = inc.includes('comments');
    const incCommentUser = inc.includes('comments.user');   // NEW
    const incLikes = inc.includes('likes');
    const incClosetItem = inc.includes('closetitem');

    return this.prisma.post.findUnique({
      where: { id },
      include: {
        user: incUser ? { select: { id: true, name: true, profilePhoto: true } } : undefined,
        comments: incComments
          ? {
            orderBy: { createdAt: 'asc' },
            include: incCommentUser
              ? { user: { select: { id: true, name: true, profilePhoto: true } } }
              : undefined,
          }
          : undefined,
        likes: incLikes ? true : undefined,
        closetItem: incClosetItem ? true : undefined,
      },
    });
  }


  async updatePost(
    id: string,
    userId: string,
    data: {
      imageUrl?: string;
      caption?: string;
      location?: string;
      weather?: any;
    }
  ) {
    const existing = await this.prisma.post.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Post not found');
    }

    if (existing.userId !== userId) {
      throw new Error('Forbidden, token incorrect');
    }
    return this.prisma.post.update({
      where: { id },
      data,
    });
  }

  async deletePost(id: string, userId: string) {
    const existing = await this.prisma.post.findUnique({ where: { id } });

    if (!existing) {
      throw new Error('Post not found');
    }

    if (existing.userId !== userId) {
      throw new Error('Forbidden, token incorrect');
    }

    await this.prisma.post.delete({ where: { id } });
  }

  async addComment(postId: string, userId: string, content: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new Error('Post not found');
    if (!content || content.trim() === '') throw new Error('Content is required');

    return this.prisma.comment.create({
      data: { postId, userId, content },
      include: { user: { select: { id: true, name: true, profilePhoto: true } } },
    });
  }


  async getCommentsForPost(postId: string, limit = 20, offset = 0, include: string[] = []) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new Error('Post not found');

    const wantUser = include.includes('user');

    return this.prisma.comment.findMany({
      where: { postId },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'asc' },
      include: wantUser
        ? { user: { select: { id: true, name: true, profilePhoto: true } } }
        : undefined,
    });
  }


  async updateComment(id: string, userId: string, content: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new Error('Comment not found');
    if (comment.userId !== userId) throw new Error('Forbidden');
    if (!content || content.trim() === '') throw new Error('Content is required');

    return this.prisma.comment.update({
      where: { id },
      data: { content },
    });
  }

  async deleteComment(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new Error('Comment not found');
    if (comment.userId !== userId) throw new Error('Forbidden');

    await this.prisma.comment.delete({ where: { id } });
  }

  // Like endpoints
  async likePost(postId: string, userId: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new Error('Post not found');

    const existingLike = await this.prisma.like.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existingLike) throw new Error('User already liked this post');

    return this.prisma.like.create({ data: { userId, postId } });
  }

  async unlikePost(postId: string, userId: string) {
    const existingLike = await this.prisma.like.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!existingLike) throw new Error('Like not found');

    await this.prisma.like.delete({
      where: { postId_userId: { postId, userId } },
    });
  }

  async getLikesForPost(postId: string, limit = 20, offset = 0, includeUser = false) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new Error('Post not found');

    return this.prisma.like.findMany({
      where: { postId },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: includeUser ? { user: { select: { id: true, name: true } } } : undefined,
    });
  }

  // follow endpoints
  async followUser(followerId: string, followingId: string) {
    if (followerId === followingId) throw new Error('You cannot follow yourself');

    const existingUser = await this.prisma.user.findUnique({ where: { id: followingId } });
    if (!existingUser) throw new Error('User not found');

    const alreadyFollowing = await this.prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });
    if (alreadyFollowing) throw new Error('Already following this user');

    return this.prisma.follow.create({
      data: { followerId, followingId },
    });
  }

  async unfollowUser(followerId: string, followingId: string) {
    try {
      await this.prisma.follow.delete({
        where: { followerId_followingId: { followerId, followingId } },
      });
    } catch (err) {
      throw new Error('Follow relationship not found');
    }
  }

  async getFollowers(userId: string, limit = 20, offset = 0) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    return this.prisma.follow.findMany({
      where: { followingId: userId },
      skip: offset,
      take: limit,
      include: {
        follower: { select: { id: true, name: true } },
      },
    });
  }

  async getFollowing(userId: string, limit = 20, offset = 0) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    return this.prisma.follow.findMany({
      where: { followerId: userId },
      skip: offset,
      take: limit,
      include: {
        following: { select: { id: true, name: true } },
      },
    });
  }

  async searchUsers(
    currentUserId: string,
    q: string,
    limit = 20,
    offset = 0
  ) {
    if (!q || !q.trim()) return [];

    const users = await this.prisma.user.findMany({
      where: {
        AND: [
          { id: { not: currentUserId } }, // exclude self
          {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { email: { contains: q, mode: 'insensitive' } },
              { location: { contains: q, mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: {
        id: true,
        name: true,
        profilePhoto: true,
        location: true,
        // Is the current user already following this user?
        followers: {
          where: { followerId: currentUserId }, // relation "Followers": followingId -> this user
          select: { id: true },
        },
        // (Optional) quick social proof if you want to show counts
        _count: { select: { followers: true, following: true } },
      },
      take: Number(limit),
      skip: Number(offset),
      orderBy: { name: 'asc' },
    });

    return users.map(u => ({
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
