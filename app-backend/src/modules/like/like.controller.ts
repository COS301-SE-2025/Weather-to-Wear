import { Request, Response } from "express";
import { AuthenticatedRequest } from "../auth/auth.middleware";
import prisma from "../../prisma";

// POST /api/social/posts/:postId/likes
export const likePost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { postId } = req.params;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    const existingLike = await prisma.like.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existingLike) {
      res.status(400).json({ message: "User already liked this post" });
      return;
    }

    const like = await prisma.like.create({
      data: { userId, postId },
    });

    res.status(201).json({
      message: "Post liked successfully",
      like,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// DELETE /api/social/posts/:postId/likes
export const unlikePost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { postId } = req.params;

    if (!userId) {
      res.status(401).json({ message: "Unauthorized" });
      return;
    }

    const existingLike = await prisma.like.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!existingLike) {
      res.status(404).json({ message: "Like not found" });
      return;
    }

    await prisma.like.delete({
      where: { postId_userId: { postId, userId } },
    });

    res.status(200).json({ message: "Post unliked successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// GET /api/social/posts/:postId/likes
export const getLikesForPost = async (req: Request, res: Response): Promise<void> => {
  try {
    const { postId } = req.params;
    const { limit = 20, offset = 0, include } = req.query;

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }

    const includeUser = (include as string)?.split(',').includes('user');

    const likes = await prisma.like.findMany({
      where: { postId },
      skip: Number(offset),
      take: Number(limit),
      orderBy: { createdAt: 'desc' },
      include: includeUser ? { user: { select: { id: true, name: true } } } : undefined,
    });

    res.status(200).json({
      message: "Likes retrieved successfully",
      likes,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
