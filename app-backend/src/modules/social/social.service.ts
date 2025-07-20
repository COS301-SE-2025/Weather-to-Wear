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
    console.log('🛠 Creating post for user:', userId);
    console.log('📦 Post data:', data);

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

    if (!existing || existing.userId !== userId) {
      throw new Error('Forbidden or not found');
    }

    return this.prisma.post.update({
      where: { id },
      data,
    });
  }

  async deletePost(id: string, userId: string) {
    const existing = await this.prisma.post.findUnique({ where: { id } });

    if (!existing || existing.userId !== userId) {
      throw new Error('Forbidden or not found');
    }

    await this.prisma.post.delete({ where: { id } });
  }
}

export default new SocialService();
