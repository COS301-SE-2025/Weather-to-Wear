import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client"; 
import { AuthenticatedRequest } from "../auth/auth.middleware";
import prisma from "../../prisma";


  export const followUser = async (req: Request, res: Response): Promise<void> => {
    const { user } = req as AuthenticatedRequest;
    const { userId } = req.params;

    if (!user?.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (user.id === userId) {
      res.status(400).json({ message: 'You cannot follow yourself' });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const alreadyFollowing = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: user.id,
          followingId: userId,
        },
      },
    });

    if (alreadyFollowing) {
      res.status(400).json({ message: 'Already following this user' });
      return;
    }

    const follow = await prisma.follow.create({
      data: {
        followerId: user.id,
        followingId: userId,
      },
    });

    res.status(200).json({
      message: 'User followed successfully',
      follow,
    });
  };

  export const unfollowUser = async (req: Request, res: Response): Promise<void> => {
    const { user } = req as AuthenticatedRequest;
    const { userId } = req.params;

    if (!user?.id) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    try {
      await prisma.follow.delete({
        where: {
          followerId_followingId: {
            followerId: user.id,
            followingId: userId,
          },
        },
      });

      res.status(200).json({ message: 'User unfollowed successfully' });
    } catch (err) {
      res.status(404).json({ message: 'Follow relationship not found' });
    }
  };

  export const getFollowers = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const followers = await prisma.follow.findMany({
      where: { followingId: userId },
      skip: Number(offset),
      take: Number(limit),
      include: {
        follower: { select: { id: true, name: true } },
      },
    });

    res.status(200).json({
      message: 'Followers retrieved successfully',
      followers,
    });
  };

  export const getFollowing = async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;
    const { limit = 20, offset = 0 } = req.query;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      skip: Number(offset),
      take: Number(limit),
      include: {
        following: { select: { id: true, name: true } },
      },
    });

    res.status(200).json({
      message: 'Following users retrieved successfully',
      following,
    });
  };


