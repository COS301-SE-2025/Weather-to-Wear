// src/modules/social/social.controller.ts
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import socialService from './social.service';
import { PrismaClient } from '@prisma/client';

import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import { putBufferSmart } from '../../utils/s3';

function extFromMime(m: string) {
  if (m === 'image/png') return '.png';
  if (m === 'image/jpeg' || m === 'image/jpg') return '.jpg';
  if (m === 'image/webp') return '.webp';
  return '.bin';
}

async function fileBuffer(f: Express.Multer.File): Promise<Buffer> {
  if (f.buffer) return f.buffer;
  if (f.path) return fs.readFile(f.path);
  throw new Error('No file buffer or path provided by Multer');
}

class SocialController {
  private prisma = new PrismaClient();

  createPost = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) { res.status(401).json({ message: 'Unauthorized' }); return; }

      let imageUrl: string | undefined;
      if (req.file) {
        const ext = extFromMime(req.file.mimetype);
        const key = `users/${user.id}/posts/${Date.now()}-${randomUUID()}${ext}`;
        const body = await fileBuffer(req.file);
        const { publicUrl } = await putBufferSmart({
          key,
          contentType: req.file.mimetype || 'application/octet-stream',
          body,
        });
        imageUrl = publicUrl;
      }

      const { caption, location, closetItemId, weather } = req.body;
      const weatherData = typeof weather === 'string' ? JSON.parse(weather) : weather;

      const post = await socialService.createPost(user.id, {
        imageUrl,
        caption,
        location,
        weather: weatherData,
        closetItemId,
      });

      res.status(201).json({ message: 'Post created successfully', post });
    } catch (err) {
      next(err);
    }
  };

 getPosts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      const { limit = 20, offset = 0, include } = req.query;
      if (!user?.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      const currentUserId = user.id;

      const posts = await socialService.getPosts({
        currentUserId: user.id,
        limit: Number(limit),
        offset: Number(offset),
        include: (include as string | undefined)?.split(',') ?? [],
      });

      res.status(200).json({ message: 'Posts retrieved successfully', posts });
    } catch (err) {
      next(err);
    }
  };

  getPostById = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const include = (req.query.include as string)?.split(',') ?? [];

      const post = await socialService.getPostById(id, include);

      if (post == null) {
        res.status(404).json({ message: 'Post not found' });
        return;
      }

      res.status(200).json({ message: 'Post retrieved successfully', post });
    } catch (err) {
      next(err);
    }
  };

  updatePost = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      const post = await socialService.updatePost(id, user.id, req.body);

      res.status(200).json({ message: 'Post updated successfully', post });
    } catch (err) {
      next(err);
    }
  };

  deletePost = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      await socialService.deletePost(id, user.id);

      res.status(200).json({ message: 'Post deleted successfully' });
    } catch (err) {
      next(err);
    }
  };

  addComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const { postId } = req.params;
      const { content } = req.body;

      if (!user?.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }
      if (!content) {
        res.status(400).json({ message: 'Content is required' });
        return;
      }

      const comment = await socialService.addComment(postId, user.id, content);
      res.status(201).json({ message: 'Comment added successfully', comment });
    } catch (err: any) {
      if (err.message === 'Post not found') {
        res.status(404).json({ message: err.message });
        return;
      }
      if (err.message === 'Content is required') {
        res.status(400).json({ message: err.message });
        return;
      }
      next(err);
    }
  };

  async getCommentsForPost(
    postId: string,
    limit: number,
    offset: number,
    includeArr: string[]
  ) {
    // ensure post exists
const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new Error("Post not found");

    return this.prisma.comment.findMany({
      where: { postId },
      skip: offset,
      take: limit,
      include: {
        user: includeArr.includes("user"),
        post: includeArr.includes("post"),
      },
      orderBy: { createdAt: "desc" },
    });
  }

  // in SocialController

getCommentsForPostHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { postId } = req.params;
    const { limit = 20, offset = 0, include = '' } = req.query;
    const includeArr = typeof include === 'string' ? include.split(',') : [];

    // call the existing prisma method
    const comments = await this.getCommentsForPost(
      postId,
      Number(limit),
      Number(offset),
      includeArr
    );

    res.status(200).json({ message: 'Comments retrieved successfully', comments });
  } catch (err: any) {
    if (err.message === 'Post not found') return res.status(404).json({ message: err.message });
    next(err);
  }
};


  updateComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const { id } = req.params;
      const { content } = req.body;

      if (!user?.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const comment = await socialService.updateComment(id, user.id, content);
      res.status(200).json({ message: 'Comment updated successfully', comment });
    } catch (err: any) {
      if (err.message === 'Comment not found') {
        res.status(404).json({ message: err.message });
        return;
      }
      if (err.message === 'Forbidden') {
        res.status(403).json({ message: err.message });
        return;
      }
      if (err.message === 'Content is required') {
        res.status(400).json({ message: err.message });
        return;
      }
      next(err);
    }
  };

  deleteComment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const { id } = req.params;

      if (!user?.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      await socialService.deleteComment(id, user.id);
      res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (err: any) {
      if (err.message === 'Comment not found') {
        res.status(404).json({ message: err.message });
        return;
      }
      if (err.message === 'Forbidden') {
        res.status(403).json({ message: err.message });
        return;
      }
      next(err);
    }
  };

  likePost = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) return res.status(401).json({ message: 'Unauthorized' });

      const { postId } = req.params;
      const like = await socialService.likePost(postId, user.id);

      res.status(201).json({ message: 'Post liked successfully', like });
    } catch (err) {
      next(err);
    }
  };

  unlikePost = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) return res.status(401).json({ message: 'Unauthorized' });

      const { postId } = req.params;
      await socialService.unlikePost(postId, user.id);

      res.status(200).json({ message: 'Post unliked successfully' });
    } catch (err) {
      next(err);
    }
  };

  async getLikesForPost(
    postId: string,
    limit: number,
    offset: number,
    includeUser: boolean
  ) {
    // ensure post exists
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new Error("Post not found");

    return this.prisma.like.findMany({
      where: { postId },
      skip: offset,
      take: limit,
      include: includeUser ? { user: true } : undefined,
      orderBy: { createdAt: "desc" },
    });
  }

  followUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
      const follow = await socialService.followUser(req.user.id, req.params.userId);
      res.status(201).json({ message: 'Follow request sent', follow });
    } catch (err) {
      next(err);
    }
  };

  unfollowUser = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
      await socialService.unfollowUser(req.user.id, req.params.userId);
      res.status(200).json({ message: 'User unfollowed successfully' });
    } catch (err) {
      next(err);
    }
  };

  getFollowers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const followers = await socialService.getFollowers(req.params.userId);
      res.status(200).json({ followers });
    } catch (err) {
      next(err);
    }
  };

  getFollowing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const following = await socialService.getFollowing(req.params.userId);
      res.status(200).json({ following });
    } catch (err) {
      next(err);
    }
  };

  getNotifications = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
      const notifications = await socialService.getNotifications(req.user.id);
      res.status(200).json({ notifications });
    } catch (err) {
      next(err);
    }
  };

  acceptFollowRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
      const updated = await socialService.acceptFollowRequest(req.params.followerId, req.user.id);
      res.status(200).json({ message: 'Follow request accepted', follow: updated });
    } catch (err) {
      next(err);
    }
  };

  rejectFollowRequest = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) return res.status(401).json({ message: 'Unauthorized' });
      const removed = await socialService.rejectFollowRequest(req.params.followerId, req.user.id);
      res.status(200).json({ message: 'Follow request rejected', follow: removed });
    } catch (err) {
      next(err);
    }
  };

  searchUsers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;
      if (!user?.id) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const { q, limit = 20, offset = 0 } = req.query;
      if (typeof q !== 'string' || q.trim() === '') {
        res.status(400).json({ message: 'Query parameter "q" is required' });
        return;
      }

      const results = await socialService.searchUsers(
        user.id,
        q,
        Number(limit),
        Number(offset)
      );

      res.status(200).json({
        message: 'Users retrieved successfully',
        results,
        pagination: { limit: Number(limit), offset: Number(offset) },
      });
    } catch (err) {
      next(err);
    }
  };
}

export default new SocialController();
