// src/modules/social/social.route.ts

import { Router } from 'express';
import socialController from './social.controller';
import { authenticateToken } from '../auth/auth.middleware';
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

export default router;
