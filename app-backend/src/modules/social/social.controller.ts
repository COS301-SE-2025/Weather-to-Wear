// src/modules/social/social.controller.ts

import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import socialService from './social.service';

class SocialController {
  createPost = async (
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

      const { imageUrl, caption, location, weather, closetItemId } = req.body;

      const post = await socialService.createPost(user.id, {
        imageUrl,
        caption,
        location,
        weather,
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
      const { userId, limit = 20, offset = 0, include } = req.query;

      const posts = await socialService.getPosts({
        userId: userId as string | undefined,
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
}

export default new SocialController();
