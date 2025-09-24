// src/modules/social/social.controller.ts

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import socialService from './social.service';
import prisma from "../../prisma";

import { cdnUrlFor, uploadBufferToS3, putBufferSmart } from '../../utils/s3';
import { randomUUID } from 'crypto';
import path from 'path';
import fs from 'fs/promises';

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
  // createPost = async (
  //   req: Request,
  //   res: Response,
  //   next: NextFunction
  // ): Promise<void> => {
  //   try {
  //     const { user } = req as AuthenticatedRequest;
  //     if (!user?.id) {
  //       res.status(401).json({ message: 'Unauthorized' });
  //       return;
  //     }

  //     const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

  //     const { caption, location, closetItemId, weather } = req.body;
  //     const weatherData = typeof weather === 'string' ? JSON.parse(weather) : weather;

  //     const post = await socialService.createPost(user.id, {
  //       imageUrl,
  //       caption,
  //       location,
  //       weather: weatherData,
  //       closetItemId,
  //     });

  //     res.status(201).json({ message: 'Post created successfully', post });
  //   } catch (err) {
  //     next(err);
  //   }
  // };

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

  getCommentsForPost = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { postId } = req.params;
      const { limit = 20, offset = 0, include = '' } = req.query;
      const includeArr = typeof include === 'string' ? include.split(',') : [];

      const comments = await socialService.getCommentsForPost(
        postId,
        Number(limit),
        Number(offset),
        includeArr
      );
      res.status(200).json({ message: 'Comments retrieved successfully', comments });
    } catch (err: any) {
      if (err.message === 'Post not found') {
        res.status(404).json({ message: err.message });
        return;
      }
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
      const { postId } = req.params;
      if (!user?.id) return res.status(401).json({ message: 'Unauthorized' });

      const like = await socialService.likePost(postId, user.id);
      res.status(201).json({ message: "Post liked successfully", like });
    } catch (err: any) {
      if (err.message === 'Post not found') return res.status(404).json({ message: err.message });
      if (err.message === 'User already liked this post') return res.status(400).json({ message: err.message });
      next(err);
    }
  };

  unlikePost = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const { postId } = req.params;
      if (!user?.id) return res.status(401).json({ message: 'Unauthorized' });

      await socialService.unlikePost(postId, user.id);
      res.status(200).json({ message: "Post unliked successfully" });
    } catch (err: any) {
      if (err.message === 'Like not found') return res.status(404).json({ message: err.message });
      next(err);
    }
  };

  getLikesForPost = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { postId } = req.params;
      const { limit = 20, offset = 0, include } = req.query;
      const includeUser = (include as string)?.split(',').includes('user');
      const likes = await socialService.getLikesForPost(postId, Number(limit), Number(offset), includeUser);
      res.status(200).json({ message: "Likes retrieved successfully", likes });
    } catch (err: any) {
      if (err.message === 'Post not found') return res.status(404).json({ message: err.message });
      next(err);
    }
  };

  followUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { userId } = req.params;
    if (!user?.id) return res.status(401).json({ message: "Unauthorized" });
    if (user.id === userId) return res.status(400).json({ message: "You cannot follow yourself" });

    const follow = await socialService.followUser(user.id, userId);
    const msg = follow.status === "pending"
      ? "Follow request sent successfully"
      : "User followed successfully";

    res.status(200).json({ message: msg, follow });
  } catch (err: any) {
    if (["Already following this user", "Follow request already pending"].includes(err.message)) {
      return res.status(400).json({ message: err.message });
    }
    if (err.message === "User not found") {
      return res.status(404).json({ message: err.message });
    }
    next(err);
  }
};

getNotifications = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req as AuthenticatedRequest;
    if (!user?.id) return res.status(401).json({ message: "Unauthorized" });

    const notifications = await socialService.getNotifications(user.id);
    res.status(200).json({ message: "Notifications retrieved successfully", notifications });
  } catch (err) {
    next(err);
  }
};

acceptFollowRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { requestId } = req.params;
    if (!user?.id) return res.status(401).json({ message: "Unauthorized" });

    const follow = await socialService.acceptFollowRequest(user.id, requestId);
    res.status(200).json({ message: "Follow request accepted", follow });
  } catch (err: any) {
    if (err.message === "Follow request not found") {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === "Unauthorized") {
      return res.status(403).json({ message: err.message });
    }
    next(err);
  }
};

rejectFollowRequest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user } = req as AuthenticatedRequest;
    const { requestId } = req.params;
    if (!user?.id) return res.status(401).json({ message: "Unauthorized" });

    const follow = await socialService.rejectFollowRequest(user.id, requestId);
    res.status(200).json({ message: "Follow request rejected", follow });
  } catch (err: any) {
    if (err.message === "Follow request not found") {
      return res.status(404).json({ message: err.message });
    }
    if (err.message === "Unauthorized") {
      return res.status(403).json({ message: err.message });
    }
    next(err);
  }
};

  unfollowUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { user } = req as AuthenticatedRequest;
      const { userId } = req.params;
      if (!user?.id) return res.status(401).json({ message: 'Unauthorized' });

      await socialService.unfollowUser(user.id, userId);
      res.status(200).json({ message: 'User unfollowed successfully' });
    } catch (err: any) {
      if (err.message === 'Follow relationship not found') {
        return res.status(404).json({ message: err.message });
      }
      next(err);
    }
  };

  getFollowers = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const followers = await socialService.getFollowers(userId, Number(limit), Number(offset));
      res.status(200).json({ message: 'Followers retrieved successfully', followers });
    } catch (err: any) {
      if (err.message === 'User not found') {
        return res.status(404).json({ message: err.message });
      }
      next(err);
    }
  };

  getFollowing = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      const following = await socialService.getFollowing(userId, Number(limit), Number(offset));
      res.status(200).json({ message: 'Following users retrieved successfully', following });
    } catch (err: any) {
      if (err.message === 'User not found') {
        return res.status(404).json({ message: err.message });
      }
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
