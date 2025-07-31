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

  async getPosts(options: {
    userId?: string;
    limit: number;
    offset: number;
    include: string[];
  }) {
    const { userId, limit, offset, include } = options;
    return this.prisma.post.findMany({
      where: userId ? { userId } : {},
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        user: include.includes('user'),
        comments: include.includes('comments'),
        likes: include.includes('likes'),
      },
    });
  }

  async getPostById(id: string, include: string[]) {
    return this.prisma.post.findUnique({
      where: { id },
      include: {
        user: include.includes('user'),
        comments: include.includes('comments'),
        likes: include.includes('likes'),
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
    // Check post exists
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new Error('Post not found');
    if (!content || content.trim() === '') throw new Error('Content is required');

    return this.prisma.comment.create({
      data: {
        postId,
        userId,
        content,
      },
      include: {
        user: true, // Optional: include user info in response
      }
    });
  }

  async getCommentsForPost(postId: string, limit = 20, offset = 0, include: string[] = []) {
    // Confirm post exists
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new Error('Post not found');

    return this.prisma.comment.findMany({
      where: { postId },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'asc' },
      include: {
        user: include.includes('user'), // Prisma will join user via "UserComments"
      },
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

}

export default new SocialService();
