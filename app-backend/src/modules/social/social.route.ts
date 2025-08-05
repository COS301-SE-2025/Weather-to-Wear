// src/modules/social/social.route.ts

import { Router } from 'express';
import socialController from './social.controller';
import { authenticateToken } from '../auth/auth.middleware';
import {getLikesForPost,likePost,unlikePost} from '../like/like.controller';
import multer from "multer";


const upload = multer({ dest: "uploads/" });
const router = Router();

// Public endpoints
router.get('/posts', socialController.getPosts);
router.get('/posts/:id', socialController.getPostById);

// Authenticated endpoints
router.post("/posts", authenticateToken, upload.single("image"), socialController.createPost);
router.patch('/posts/:id', authenticateToken, socialController.updatePost);
router.delete('/posts/:id', authenticateToken, socialController.deletePost);

//Comment endpoints
router.post('/posts/:postId/comments', authenticateToken, socialController.addComment);
router.get('/posts/:postId/comments', socialController.getCommentsForPost);
router.put('/comments/:id', authenticateToken, socialController.updateComment);
router.delete('/comments/:id', authenticateToken, socialController.deleteComment);

// Like endpoints
// Helper to wrap async route handlers
function asyncHandler(fn: any) {
	return function (req: any, res: any, next: any) {
		Promise.resolve(fn(req, res, next)).catch(next);
	};
}

router.get('/posts/:postId/likes', asyncHandler(socialController.getLikesForPost));
router.post('/posts/:postId/likes', authenticateToken, asyncHandler(socialController.likePost));
router.delete('/posts/:postId/likes', authenticateToken, asyncHandler(socialController.unlikePost));

export default router;
