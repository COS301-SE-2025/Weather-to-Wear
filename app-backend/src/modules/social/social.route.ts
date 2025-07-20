// src/modules/social/social.route.ts

import { Router } from 'express';
import socialController from './social.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

// Public endpoints
router.get('/posts', socialController.getPosts);
router.get('/posts/:id', socialController.getPostById);

// Authenticated endpoints
router.post('/posts', authenticateToken, socialController.createPost);
router.put('/posts/:id', authenticateToken, socialController.updatePost);
router.delete('/posts/:id', authenticateToken, socialController.deletePost);

export default router;
