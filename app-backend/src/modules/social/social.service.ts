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
  followId?: string; 
};

class SocialService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  // ────────────── POSTS ──────────────
  async createPost(
    userId: string,
    data: {
      imageUrl?: string;
      caption?: string;
      location?: string;
      weather?: any;
      closetItemId?: string;
      closetItemIds?: string[];
    }
  ) {
    // ! Alisha change
    //return this.prisma.post.create({

    const post = await this.prisma.post.create({
      data: {
        userId,
        imageUrl: data.imageUrl,
        caption: data.caption,
        location: data.location,
        weather: data.weather,
        closetItemId: data.closetItemId,
      },
    });

    // If closetItemIds are provided, create PostItem relations
    if (data.closetItemIds && data.closetItemIds.length > 0) {
      await this.prisma.postItem.createMany({
        data: data.closetItemIds.map(itemId => ({
          postId: post.id,
          closetItemId: itemId,
        })),
      });
    }

    return post;
  }

  async getPosts(options: {
    currentUserId: string;
    limit: number;
    offset: number;
    include: string[];
  }) {
    const { currentUserId, limit, offset, include } = options;
    
    //!Alsiha merge
    //const inc = (include ?? []).map((s) => s.toLowerCase());



    const inc = (include ?? []).map(s => s.toLowerCase());
    const incUser = inc.includes('user');
    const incComments = inc.includes('comments');
    const incCommentUser = inc.includes('comments.user');   // NEW
    const incLikes = inc.includes('likes');
    const incClosetItem = inc.includes('closetitem');
    const incPostItems = inc.includes('postitems') || inc.includes('clothing');

    const following = await this.prisma.follow.findMany({
      where: { followerId: currentUserId },
      select: { followingId: true },
    });
    const followingIds = [...following.map((f) => f.followingId), currentUserId];

    return this.prisma.post.findMany({
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
        
        //! Alisha change
        //likes: inc.includes("likes") ? true : undefined,
        //closetItem: inc.includes("closetitem") ? true : undefined,

        likes: incLikes ? true : undefined,
        closetItem: incClosetItem ? true : undefined,
        postItems: incPostItems 
          ? { 
            include: { 
              closetItem: { 
                select: { 
                  id: true, 
                  filename: true, 
                  category: true, 
                  layerCategory: true,
                  colorHex: true,
                  style: true 
                } 
              } 
            } 
          } 
          : undefined,
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
    const incPostItems = inc.includes('postitems') || inc.includes('clothing');

    return this.prisma.post.findUnique({
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
        
        // ! Alisha change
        //likes: inc.includes("likes") ? true : undefined,
        //closetItem: inc.includes("closetitem") ? true : undefined,

        likes: incLikes ? true : undefined,
        closetItem: incClosetItem ? true : undefined,
        postItems: incPostItems 
          ? { 
            include: { 
              closetItem: { 
                select: { 
                  id: true, 
                  filename: true, 
                  category: true, 
                  layerCategory: true,
                  colorHex: true,
                  style: true 
                } 
              } 
            } 
          } 
          : undefined,
      },
    });
  }

  async updatePost(
    id: string,
    userId: string,
    data: { imageUrl?: string; caption?: string; location?: string; weather?: any }
  ) {
    const existing = await this.prisma.post.findUnique({ where: { id } });
    if (!existing) throw new Error("Post not found");
    if (existing.userId !== userId) throw new Error("Forbidden");

    return this.prisma.post.update({ where: { id }, data });
  }

  async deletePost(id: string, userId: string) {
    console.log(`Deleting post ${id} for user ${userId}`);
    try {
      const existing = await this.prisma.post.findUnique({ 
        where: { id },
        include: {
          comments: true,
          likes: true,
          postItems: true
        }
      });

      if (!existing) {
        console.error(`Post not found: ${id}`);
        throw new Error('Post not found');
      }

      if (existing.userId !== userId) {
        console.error(`User ${userId} unauthorized to delete post ${id}`);
        throw new Error('Forbidden, token incorrect');
      }

      console.log(`Found post with ${existing.comments.length} comments, ${existing.likes.length} likes, ${existing.postItems.length} post items`);
      
      // Delete related records first - this prevents foreign key constraint errors
      
      // Delete all comments
      console.log(`Deleting ${existing.comments.length} comments for post ${id}`);
      if (existing.comments.length > 0) {
        await this.prisma.comment.deleteMany({ where: { postId: id } });
      }
      
      // Delete all likes
      console.log(`Deleting ${existing.likes.length} likes for post ${id}`);
      if (existing.likes.length > 0) {
        await this.prisma.like.deleteMany({ where: { postId: id } });
      }
      
      // Delete all post items
      console.log(`Deleting ${existing.postItems.length} post items for post ${id}`);
      if (existing.postItems.length > 0) {
        await this.prisma.postItem.deleteMany({ where: { postId: id } });
      }

      // Now it's safe to delete the post
      console.log(`Now deleting the post ${id}`);
      await this.prisma.post.delete({ where: { id } });
      console.log(`Post ${id} deleted successfully`);
    } catch (error) {
      console.error('Error in deletePost service:', error);
      throw error; // Re-throw the error to be handled by the controller
    }
  }

  // ────────────── COMMENTS ──────────────
  async addComment(postId: string, userId: string, content: string) {

    console.log(`Adding comment to post ${postId} by user ${userId}`);
    
    try {
      const post = await this.prisma.post.findUnique({ where: { id: postId } });
      if (!post) {
        console.error(`Post not found: ${postId}`);
        throw new Error('Post not found');
      }
      
      if (!content || content.trim() === '') {
        console.error('Empty content provided');
        throw new Error('Content is required');
      }

      console.log('Creating comment in database');
      const comment = await this.prisma.comment.create({
        data: { postId, userId, content },
        include: { user: { select: { id: true, name: true, profilePhoto: true } } },
      });
      
      console.log(`Comment created with ID: ${comment.id}`);
      //!Bemo Change
      //return comment;
      
      //!Alisha Return
       return this.prisma.comment.create({
          data: { postId, userId, content },
          include: { user: { select: { id: true, name: true, profilePhoto: true } } },
        });
    } catch (error) {
      console.error('Error in addComment service:', error);
      throw error; // Re-throw the error to be handled by the controller
    }
  }

  async getCommentsForPost(postId: string, limit = 20, offset = 0) {
    return this.prisma.comment.findMany({
      where: { postId },
      take: limit,
      skip: offset,
      orderBy: { createdAt: "asc" },
      include: { user: { select: { id: true, name: true, profilePhoto: true } } },
    });
  }

  async updateComment(id: string, userId: string, content: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new Error("Comment not found");
    if (comment.userId !== userId) throw new Error("Forbidden");
    if (!content.trim()) throw new Error("Content is required");

    return this.prisma.comment.update({ where: { id }, data: { content } });
  }

  async deleteComment(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new Error("Comment not found");
    if (comment.userId !== userId) throw new Error("Forbidden");

    await this.prisma.comment.delete({ where: { id } });
  }

  // ────────────── LIKES ──────────────
  async likePost(postId: string, userId: string) {
    // ! ALsiah change
    //const existingLike = await this.prisma.like.findUnique({

    const post = await this.prisma.post.findUnique({ 
      where: { id: postId },
      include: {
        postItems: {
          include: {
            closetItem: true
          }
        },
        closetItem: true // For backward compatibility if single item posts exist
      }
    });
    if (!post) throw new Error('Post not found');

    const existingLike = await this.prisma.like.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (existingLike) throw new Error("Already liked");


    const like = await this.prisma.like.create({ data: { userId, postId } });

    // Extract clothing items from the liked post and generate inspiration
    await this.generateInspirationFromLikedPost(userId, post);
    //!bemo change
    //return like;
    
    //! Alisha return
    return this.prisma.like.create({ data: { postId, userId } });
  }

  private async generateInspirationFromLikedPost(userId: string, post: any) {
    try {
      // Use require instead of dynamic import to avoid potential issues
      const inspoService = require('../inspo/inspo.service');
      
      // Get all clothing items from the post
      const clothingItems = [];
      
      // Add items from postItems relation
      if (post.postItems && post.postItems.length > 0) {
        clothingItems.push(...post.postItems.map((item: any) => item.closetItem));
      }
      
      // Add single closet item if it exists (backward compatibility)
      if (post.closetItem) {
        clothingItems.push(post.closetItem);
      }
      
      // If we have clothing items, store them as inspiration
      if (clothingItems.length > 0) {
        await inspoService.storeLikedOutfit(userId, clothingItems);
      }
    } catch (error) {
      // Don't fail the like operation if inspiration generation fails
      console.error('Failed to generate inspiration from liked post:', error);
    }
  }

  async unlikePost(postId: string, userId: string) {
    const existingLike = await this.prisma.like.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!existingLike) throw new Error("Like not found");

    await this.prisma.like.delete({ where: { postId_userId: { postId, userId } } });
  }

  async getLikesForPost(postId: string, limit = 20, offset = 0) {
    return this.prisma.like.findMany({
      where: { postId },
      skip: offset,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, name: true, profilePhoto: true } } },
    });
  }

  // ────────────── FOLLOWS ──────────────
  // async followUser(followerId: string, followingId: string) {
  //   if (followerId === followingId) throw new Error("Cannot follow yourself");

  //   const existingUser = await this.prisma.user.findUnique({ where: { id: followingId } });
  //   if (!existingUser) throw new Error("User not found");

  //   const alreadyFollowing = await this.prisma.follow.findUnique({
  //     where: { followerId_followingId: { followerId, followingId } },
  //   });
  //   if (alreadyFollowing) throw new Error("Already following");

  //   return this.prisma.follow.create({
  //     data: {
  //       followerId,
  //       followingId,
  //       status: existingUser.isPrivate ? "pending" : "accepted",
  //     },
  //   });
  // }

  // async followUser(followerId: string, followingId: string) {
  //   const targetUser = await this.prisma.user.findUnique({ where: { id: followingId } });
  //   if (!targetUser) throw new Error("User not found");

  //   const status = targetUser.isPrivate ? "pending" : "accepted";

  //   const follow = await this.prisma.follow.create({
  //     data: { followerId, followingId, status },
  //   });

  //   return follow; // frontend can display request notification manually
  // }

  async followUser(followerId: string, followingId: string) {
  // Check if target user exists
  const targetUser = await this.prisma.user.findUnique({ where: { id: followingId } });
  if (!targetUser) throw new Error("User not found");

  // Determine follow status based on privacy
  const status = targetUser.isPrivate ? "pending" : "accepted";

  // Check if follow already exists (prevent duplicate)
  const existingFollow = await this.prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });

  if (existingFollow) {
    // If follow exists, return consistent format
    return { 
      id: existingFollow.id, 
      followerId: existingFollow.followerId, 
      followingId: existingFollow.followingId, 
      status: existingFollow.status 
    };
  }

  // Create new follow
  const follow = await this.prisma.follow.create({
    data: { followerId, followingId, status },
  });

  // Return only needed info to frontend
  return { id: follow.id, followerId, followingId, status };
}


  async unfollowUser(followerId: string, followingId: string) {
    await this.prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    });
  }

  async getFollowers(userId: string, limit = 20, offset = 0) {
    return this.prisma.follow.findMany({
      where: { followingId: userId, status: "accepted" },
      skip: offset,
      take: limit,
      include: { follower: { select: { id: true, name: true, profilePhoto: true } } },
    });
  }

  async getFollowing(userId: string, limit = 20, offset = 0) {
    return this.prisma.follow.findMany({
      where: { followerId: userId, status: "accepted" },
      skip: offset,
      take: limit,
      include: { following: { select: { id: true, name: true, profilePhoto: true } } },
    });
  }

  async getFollowRequests(userId: string) {
    return this.prisma.follow.findMany({
      where: { followingId: userId, status: "pending" },
      include: { follower: { select: { id: true, name: true, profilePhoto: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

   // Accept a follow request
  async acceptFollowRequest(userId: string, followId: string) {
    const follow = await this.prisma.follow.update({
      where: { id: followId },
      data: { status: "accepted" },
    });

    return follow;
  }

  // Reject a follow request
  async rejectFollowRequest(userId: string, followId: string) {
    const follow = await this.prisma.follow.update({
      where: { id: followId },
      data: { status: "rejected" },
    });

    return follow;
  }

  // Get pending follow requests for a user
  async getPendingFollowRequests(userId: string) {
    return this.prisma.follow.findMany({
      where: { followingId: userId, status: "pending" },
      include: { follower: true }, // get info about the requester
    });
  }

  // ────────────── NOTIFICATIONS (DYNAMIC) ──────────────
 async getNotifications(userId: string): Promise<NotificationAPIItem[]> {
  const [likes, comments, followRequests] = await Promise.all([
    prisma.like.findMany({
      where: {
        post: { userId },
        AND: { userId: { not: userId } },
      },
      include: {
        user: { select: { id: true, name: true, profilePhoto: true } },
        post: { select: { id: true, caption: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.comment.findMany({
      where: {
        post: { userId },
        AND: { userId: { not: userId } },
      },
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
      profilePhoto: l.user.profilePhoto || undefined,
    },
    postId: l.postId || undefined,
    postContent: l.post?.caption || undefined, // keep post caption for likes
    createdAt: l.createdAt.toISOString(),
  })),
  ...comments.map((c) => ({
    id: c.id,
    type: "comment" as const,
    fromUser: {
      id: c.user.id,
      name: c.user.name,
      profilePhoto: c.user.profilePhoto || undefined,
    },
    postId: c.postId || undefined,
    postContent: c.content || undefined, // <-- CHANGE: use the actual comment text
    createdAt: c.createdAt.toISOString(),
  })),
  ...followRequests.map((f) => ({
    id: f.id,
    type: "follow" as const,
    fromUser: {
      id: f.follower.id,
      name: f.follower.name,
      profilePhoto: f.follower.profilePhoto || undefined,
    },
    postId: undefined,
    postContent: undefined,
    createdAt: f.createdAt.toISOString(),
    status: f.status as "pending" | "accepted" | "rejected", // ✅ include status
    followId: f.id, // ✅ include followId for accept/reject
  })),
];

  // sort newest first
  return notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}


  // ────────────── SEARCH ──────────────
  async searchUsers(currentUserId: string, q: string, limit = 20, offset = 0) {
    if (!q.trim()) return [];

    const users = await this.prisma.user.findMany({
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
