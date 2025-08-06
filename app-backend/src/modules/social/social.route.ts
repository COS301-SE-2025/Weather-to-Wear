// src/modules/social/social.route.ts

import { Router } from 'express';
import socialController from './social.controller';
import { authenticateToken } from '../auth/auth.middleware';
import multer from "multer";


const upload = multer({ dest: "uploads/" });
const router = Router();

// Public endpoints
router.get('/posts/:id', socialController.getPostById);

// Authenticated endpoints
router.get('/posts',  authenticateToken ,socialController.getPosts);
router.post("/posts", authenticateToken, upload.single("image"), socialController.createPost);
router.patch('/posts/:id', authenticateToken, socialController.updatePost);
router.delete('/posts/:id', authenticateToken, socialController.deletePost);

//Comment endpoints
router.post('/posts/:postId/comments', authenticateToken, socialController.addComment);
router.get('/posts/:postId/comments', socialController.getCommentsForPost);
router.put('/comments/:id', authenticateToken, socialController.updateComment);
router.delete('/comments/:id', authenticateToken, socialController.deleteComment);

// Like endpoints
function asyncHandler(fn: any) {
	return function (req: any, res: any, next: any) {
		Promise.resolve(fn(req, res, next)).catch(next);
	};
}

router.get('/posts/:postId/likes', asyncHandler(socialController.getLikesForPost));
router.post('/posts/:postId/likes', authenticateToken, asyncHandler(socialController.likePost));
router.delete('/posts/:postId/likes', authenticateToken, asyncHandler(socialController.unlikePost));

//follow endpoints
router.get('/:userId/following', authenticateToken, asyncHandler(socialController.getFollowing));
router.get('/:userId/followers', authenticateToken, asyncHandler(socialController.getFollowers));
router.post('/:userId/follow', authenticateToken, asyncHandler(socialController.followUser));
router.delete('/:userId/unfollow', authenticateToken, asyncHandler(socialController.unfollowUser));

export default router;
