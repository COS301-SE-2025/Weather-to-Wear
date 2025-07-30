import { Router } from 'express';
import {
  getLikesForPost,
  likePost,
  unlikePost,
} from '../like/like.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router({ mergeParams: true });

router.get('/:postId/likes', getLikesForPost);
router.post('/:postId/likes', authenticateToken, likePost);
router.delete('/:postId/likes', authenticateToken, unlikePost);

export default router;
