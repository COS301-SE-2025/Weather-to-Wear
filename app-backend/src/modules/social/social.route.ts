// src/modules/social/social.route.ts
import { Router } from 'express';
import socialController from './social.controller';
import { authenticateToken } from '../auth/auth.middleware';
import { upload } from '../../middleware/upload.middleware';
import { nsfwText, nsfwImageFromReq } from '../../middleware/nsfw.middleware';

const router = Router();

// Public endpoints
router.get('/posts/:id', socialController.getPostById);

// Authenticated endpoints
router.get('/posts', authenticateToken, socialController.getPosts);

// CREATE POST: caption + image (file via upload.single('image') OR optional imageUrl in body)
router.post(
  '/posts',
  authenticateToken,
  upload.single('image'),
  nsfwText('caption'),
  nsfwImageFromReq('image', 'imageUrl'),
  socialController.createPost
);

// UPDATE POST: if you allow editing caption and/or replacing image, add moderation for whichever fields may be present
router.patch(
  '/posts/:id',
  authenticateToken,
  upload.single('image'),              // only if your update supports replacing image
  nsfwText('caption'),                 // will no-op if caption isn't provided
  nsfwImageFromReq('image', 'imageUrl'), // will no-op if no image provided
  socialController.updatePost
);

router.delete('/posts/:id', authenticateToken, socialController.deletePost);

// Comment endpoints
router.post(
  '/posts/:postId/comments',
  authenticateToken,
  nsfwText('content'),                    
  socialController.addComment
);
router.get('/posts/:postId/comments', asyncHandler(socialController.getCommentsForPostHandler));
router.put('/comments/:id', authenticateToken, nsfwText('content'), socialController.updateComment);
router.delete('/comments/:id', authenticateToken, socialController.deleteComment);

// Likes 
function asyncHandler(fn: any) {
  return function (req: any, res: any, next: any) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
router.get('/posts/:postId/likes', asyncHandler(socialController.getLikesForPost));
router.post('/posts/:postId/likes', authenticateToken, asyncHandler(socialController.likePost));
router.delete('/posts/:postId/likes', authenticateToken, asyncHandler(socialController.unlikePost));

// Follows 
router.get('/:userId/following', authenticateToken, asyncHandler(socialController.getFollowing));
router.get('/:userId/followers', authenticateToken, asyncHandler(socialController.getFollowers));
router.post('/:userId/follow', authenticateToken, asyncHandler(socialController.followUser));
router.delete('/:userId/unfollow', authenticateToken, asyncHandler(socialController.unfollowUser));

// User search 
router.get('/users/search', authenticateToken, socialController.searchUsers);
router.post('/users/search', authenticateToken, socialController.searchUsers);

router.post('/__debug/mod-text', authenticateToken, async (req, res) => {
  try {
    const { seCheckText } = await import('../../utils/sightengine');
    const out = await seCheckText(String(req.body?.content || ''));
    res.json(out);
  } catch (e: any) {
    res.status(500).json({ error: e?.response?.data || e?.message });
  }
});

// Notifications
router.get('/notifications', authenticateToken, asyncHandler(socialController.getNotifications));

// Accept / Reject follow requests
router.post('/follow/:followId/accept', authenticateToken, asyncHandler(socialController.acceptFollowRequest));
router.post('/follow/:followId/reject', authenticateToken, asyncHandler(socialController.rejectFollowRequest));


export default router;
