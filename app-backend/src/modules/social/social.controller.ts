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

      const imageUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

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


}

export default new SocialController();
