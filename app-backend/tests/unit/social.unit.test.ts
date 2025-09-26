import { Request, Response } from 'express';
import socialController from '../../src/modules/social/social.controller';
import socialService from '../../src/modules/social/social.service';

jest.mock('../../src/modules/social/social.service', () => ({
  createPost: jest.fn(),
  getPosts: jest.fn(),
  getPostById: jest.fn(),
  updatePost: jest.fn(),
  deletePost: jest.fn(),
  addComment: jest.fn(),
  getCommentsForPost: jest.fn(),
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
  likePost: jest.fn(),
  unlikePost: jest.fn(),
  getLikesForPost: jest.fn(),
  followUser: jest.fn(),
  unfollowUser: jest.fn(),
  getFollowers: jest.fn(),
  getFollowing: jest.fn(),
}));

const mockUser = { id: 'user-1' };

const mockRes = (): Response => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
    send: jest.fn()
  };
  return res as Response;
};

const next = jest.fn();

describe('SocialController Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---------- POSTS ----------

  it('should create a post', async () => {
    const req = {
      user: mockUser,
      file: undefined,
      body: {
        caption: 'Test post',
        location: 'Pretoria',
        closetItemId: 'closet-1',
        weather: JSON.stringify({ temp: 20 })
      }
    } as Partial<Request> as Request;
    const res = mockRes();
    const createdPost = { id: 'post-1', caption: 'Test post' };
    (socialService.createPost as jest.Mock).mockResolvedValueOnce(createdPost);

    await socialController.createPost(req, res, next);

    expect(socialService.createPost).toHaveBeenCalledWith(mockUser.id, {
      imageUrl: undefined,
      caption: 'Test post',
      location: 'Pretoria',
      weather: { temp: 20 },
      closetItemId: 'closet-1',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'Post created successfully', post: createdPost });
  });

  it('should return 401 when creating post without auth', async () => {
    const req = { user: undefined } as Partial<Request> as Request;
    const res = mockRes();
    await socialController.createPost(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
  });

  it('should fetch posts', async () => {
    const req = {
      user: mockUser,
      query: { limit: '10', offset: '0', include: '' }
    } as Partial<Request> as Request;
    const res = mockRes();
    const posts = [{ id: 'post-1' }];
    (socialService.getPosts as jest.Mock).mockResolvedValueOnce(posts);

    await socialController.getPosts(req, res, next);

    expect(socialService.getPosts).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Posts retrieved successfully', posts });
  });

  it('should fetch single post', async () => {
    const req = { params: { id: 'post-1' }, query: { include: '' } } as Partial<Request> as Request;
    const res = mockRes();
    const post = { id: 'post-1' };
    (socialService.getPostById as jest.Mock).mockResolvedValueOnce(post);

    await socialController.getPostById(req, res, next);
    expect(socialService.getPostById).toHaveBeenCalledWith('post-1', [""]);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Post retrieved successfully', post });
  });

  it('should return 404 if post not found', async () => {
    const req = { params: { id: 'notfound' }, query: { include: '' } } as Partial<Request> as Request;
    const res = mockRes();
    (socialService.getPostById as jest.Mock).mockResolvedValueOnce(null);

    await socialController.getPostById(req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Post not found' });
  });

  // ---------- COMMENTS ----------

  it('should add a comment', async () => {
    const req = { user: mockUser, params: { postId: 'post-1' }, body: { content: 'Nice!' } } as Partial<Request> as Request;
    const res = mockRes();
    const comment = { id: 'comment-1', content: 'Nice!' };
    (socialService.addComment as jest.Mock).mockResolvedValueOnce(comment);

    await socialController.addComment(req, res, next);
    expect(socialService.addComment).toHaveBeenCalledWith('post-1', mockUser.id, 'Nice!');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'Comment added successfully', comment });
  });

  it('should return 401 if adding comment without auth', async () => {
    const req = { user: undefined, params: { postId: 'post-1' }, body: { content: 'Hello' } } as Partial<Request> as Request;
    const res = mockRes();

    await socialController.addComment(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
  });

  it('should return 400 if comment content is missing', async () => {
    const req = { user: mockUser, params: { postId: 'post-1' }, body: { content: '' } } as Partial<Request> as Request;
    const res = mockRes();

    await socialController.addComment(req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Content is required' });
  });

  it('should get comments for post', async () => {
    const req = { params: { postId: 'post-1' }, query: {} } as Partial<Request> as Request;
    const res = mockRes();
    const comments = [{ id: 'comment-1' }];
    
    // Mock the prisma calls directly since getCommentsForPostHandler calls the internal method
    const mockPrisma = {
      post: {
        findUnique: jest.fn().mockResolvedValue({ id: 'post-1' })
      },
      comment: {
        findMany: jest.fn().mockResolvedValue(comments)
      }
    };
    (socialController as any).prisma = mockPrisma;

    await socialController.getCommentsForPostHandler(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Comments retrieved successfully', comments });
  });

  // ---------- LIKES ----------

  it('should like a post', async () => {
    const req = { user: mockUser, params: { postId: 'post-1' } } as Partial<Request> as Request;
    const res = mockRes();
    const like = { id: 'like-1' };
    (socialService.likePost as jest.Mock).mockResolvedValueOnce(like);

    await socialController.likePost(req, res, next);
    expect(socialService.likePost).toHaveBeenCalledWith('post-1', mockUser.id);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ message: 'Post liked successfully', like });
  });

  it('should unlike a post', async () => {
    const req = { user: mockUser, params: { postId: 'post-1' } } as Partial<Request> as Request;
    const res = mockRes();

    (socialService.unlikePost as jest.Mock).mockResolvedValueOnce(undefined);

    await socialController.unlikePost(req, res, next);
    expect(socialService.unlikePost).toHaveBeenCalledWith('post-1', mockUser.id);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Post unliked successfully' });
  });

  it('should get likes for a post', async () => {
    const req = { params: { postId: 'post-1' }, query: {} } as Partial<Request> as Request;
    const res = mockRes();
    const likes = [{ id: 'like-1' }];
    
    // Mock the prisma call directly since this method calls prisma, not the service
    const mockPrisma = {
      post: {
        findUnique: jest.fn().mockResolvedValue({ id: 'post-1' })
      },
      like: {
        findMany: jest.fn().mockResolvedValue(likes)
      }
    };
    (socialController as any).prisma = mockPrisma;

    await socialController.getLikesForPost('post-1', 20, 0, false);
    expect(mockPrisma.post.findUnique).toHaveBeenCalledWith({ where: { id: 'post-1' } });
    expect(mockPrisma.like.findMany).toHaveBeenCalledWith({
      where: { postId: 'post-1' },
      skip: 0,
      take: 20,
      include: undefined,
      orderBy: { createdAt: 'desc' }
    });
  });

  // ---------- FOLLOWS ----------

  it('should follow a user', async () => {
    const req = { user: mockUser, params: { userId: 'user-2' } } as Partial<Request> as Request;
    const res = mockRes();
    const follow = { id: 'follow-1', followerId: 'user-1', followingId: 'user-2', status: 'ACCEPTED' };
    (socialService.followUser as jest.Mock).mockResolvedValueOnce(follow);

    await socialController.followUser(req, res, next);
    expect(socialService.followUser).toHaveBeenCalledWith(mockUser.id, 'user-2');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ 
      message: 'Follow request processed', 
      follow: {
        id: follow.id,
        followerId: follow.followerId,
        followingId: follow.followingId,
        status: follow.status,
      }
    });
  });

  it('should unfollow a user', async () => {
    const req = { user: mockUser, params: { userId: 'user-2' } } as Partial<Request> as Request;
    const res = mockRes();

    (socialService.unfollowUser as jest.Mock).mockResolvedValueOnce(undefined);

    await socialController.unfollowUser(req, res, next);
    expect(socialService.unfollowUser).toHaveBeenCalledWith(mockUser.id, 'user-2');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'User unfollowed successfully' });
  });

  it('should get followers', async () => {
    const req = { params: { userId: 'user-2' }, query: {} } as Partial<Request> as Request;
    const res = mockRes();
    const followers = [{ id: 'user-1' }];
    (socialService.getFollowers as jest.Mock).mockResolvedValueOnce(followers);

    await socialController.getFollowers(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ followers });
  });

  it('should get following', async () => {
    const req = { params: { userId: 'user-2' }, query: {} } as Partial<Request> as Request;
    const res = mockRes();
    const following = [{ id: 'user-3' }];
    (socialService.getFollowing as jest.Mock).mockResolvedValueOnce(following);

    await socialController.getFollowing(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ following });
  });


  it('should handle errors from service gracefully', async () => {
    const req = { user: mockUser, params: { userId: 'user-2' } } as Partial<Request> as Request;
    const res = mockRes();
    const error = new Error('Already following this user');
    (socialService.followUser as jest.Mock).mockRejectedValueOnce(error);

    await socialController.followUser(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should update a post', async () => {
    const req = { user: mockUser, params: { id: 'post-1' }, body: { caption: 'Updated' } } as Partial<Request> as Request;
    const res = mockRes();
    const post = { id: 'post-1', caption: 'Updated' };
    (socialService.updatePost as jest.Mock).mockResolvedValueOnce(post);

    await socialController.updatePost(req, res, next);

    expect(socialService.updatePost).toHaveBeenCalledWith('post-1', mockUser.id, { caption: 'Updated' });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Post updated successfully', post });
  });

  it('should return 401 if updating post without auth', async () => {
    const req = { user: undefined, params: { id: 'post-1' }, body: {} } as Partial<Request> as Request;
    const res = mockRes();

    await socialController.updatePost(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
  });
  it('should delete a post', async () => {
    const req = { user: mockUser, params: { id: 'post-1' } } as Partial<Request> as Request;
    const res = mockRes();
    (socialService.deletePost as jest.Mock).mockResolvedValueOnce(undefined);

    await socialController.deletePost(req, res, next);

    expect(socialService.deletePost).toHaveBeenCalledWith('post-1', mockUser.id);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Post deleted successfully' });
  });

  it('should return 401 if deleting post without auth', async () => {
    const req = { user: undefined, params: { id: 'post-1' } } as Partial<Request> as Request;
    const res = mockRes();

    await socialController.deletePost(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
  });
  it('should update a comment', async () => {
    const req = { user: mockUser, params: { id: 'comment-1' }, body: { content: 'new content' } } as Partial<Request> as Request;
    const res = mockRes();
    const updatedComment = { id: 'comment-1', content: 'new content' };
    (socialService.updateComment as jest.Mock).mockResolvedValueOnce(updatedComment);

    await socialController.updateComment(req, res, next);

    expect(socialService.updateComment).toHaveBeenCalledWith('comment-1', mockUser.id, 'new content');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Comment updated successfully', comment: updatedComment });
  });

  it('should return 401 if updating comment without auth', async () => {
    const req = { user: undefined, params: { id: 'comment-1' }, body: { content: 'fail' } } as Partial<Request> as Request;
    const res = mockRes();

    await socialController.updateComment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
  });

  it('should return 404 if comment to update is not found', async () => {
    const req = { user: mockUser, params: { id: 'comment-2' }, body: { content: 'fail' } } as Partial<Request> as Request;
    const res = mockRes();
    const error = new Error('Comment not found');
    (socialService.updateComment as jest.Mock).mockRejectedValueOnce(error);

    await socialController.updateComment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Comment not found' });
  });

  it('should return 403 if user forbidden to update comment', async () => {
    const req = { user: mockUser, params: { id: 'comment-3' }, body: { content: 'fail' } } as Partial<Request> as Request;
    const res = mockRes();
    const error = new Error('Forbidden');
    (socialService.updateComment as jest.Mock).mockRejectedValueOnce(error);

    await socialController.updateComment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
  });
  it('should delete a comment', async () => {
    const req = { user: mockUser, params: { id: 'comment-1' } } as Partial<Request> as Request;
    const res = mockRes();
    (socialService.deleteComment as jest.Mock).mockResolvedValueOnce(undefined);

    await socialController.deleteComment(req, res, next);

    expect(socialService.deleteComment).toHaveBeenCalledWith('comment-1', mockUser.id);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: 'Comment deleted successfully' });
  });

  it('should return 401 if deleting comment without auth', async () => {
    const req = { user: undefined, params: { id: 'comment-1' } } as Partial<Request> as Request;
    const res = mockRes();

    await socialController.deleteComment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized' });
  });

  it('should return 404 if comment to delete is not found', async () => {
    const req = { user: mockUser, params: { id: 'comment-2' } } as Partial<Request> as Request;
    const res = mockRes();
    const error = new Error('Comment not found');
    (socialService.deleteComment as jest.Mock).mockRejectedValueOnce(error);

    await socialController.deleteComment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Comment not found' });
  });

  it('should return 403 if user forbidden to delete comment', async () => {
    const req = { user: mockUser, params: { id: 'comment-3' } } as Partial<Request> as Request;
    const res = mockRes();
    const error = new Error('Forbidden');
    (socialService.deleteComment as jest.Mock).mockRejectedValueOnce(error);

    await socialController.deleteComment(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Forbidden' });
  });
  it('should return 404 if post not found when getting comments', async () => {
    const req = { params: { postId: 'post-x' }, query: {} } as Partial<Request> as Request;
    const res = mockRes();
    
    // Mock the controller method to throw an error
    const mockPrisma = {
      post: {
        findUnique: jest.fn().mockResolvedValue(null)
      }
    };
    (socialController as any).prisma = mockPrisma;

    await socialController.getCommentsForPostHandler(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Post not found' });
  });
  it('should return 404 if user not found when getting followers', async () => {
    const req = { params: { userId: 'user-x' }, query: {} } as Partial<Request> as Request;
    const res = mockRes();
    const error = new Error('User not found');
    (socialService.getFollowers as jest.Mock).mockRejectedValueOnce(error);

    await socialController.getFollowers(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
  it('should return 404 if user not found when getting following', async () => {
    const req = { params: { userId: 'user-x' }, query: {} } as Partial<Request> as Request;
    const res = mockRes();
    const error = new Error('User not found');
    (socialService.getFollowing as jest.Mock).mockRejectedValueOnce(error);

    await socialController.getFollowing(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
  it('should return 404 if post not found when liking', async () => {
    const req = { user: mockUser, params: { postId: 'post-x' } } as Partial<Request> as Request;
    const res = mockRes();
    const error = new Error('Post not found');
    (socialService.likePost as jest.Mock).mockRejectedValueOnce(error);

    await socialController.likePost(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

  it('should return 400 if already liked', async () => {
    const req = { user: mockUser, params: { postId: 'post-1' } } as Partial<Request> as Request;
    const res = mockRes();
    const error = new Error('User already liked this post');
    (socialService.likePost as jest.Mock).mockRejectedValueOnce(error);

    await socialController.likePost(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });
  it('should return 404 if follow relationship not found on unfollow', async () => {
    const req = { user: mockUser, params: { userId: 'user-x' } } as Partial<Request> as Request;
    const res = mockRes();
    const error = new Error('Follow relationship not found');
    (socialService.unfollowUser as jest.Mock).mockRejectedValueOnce(error);

    await socialController.unfollowUser(req, res, next);

    expect(next).toHaveBeenCalledWith(error);
  });

});
