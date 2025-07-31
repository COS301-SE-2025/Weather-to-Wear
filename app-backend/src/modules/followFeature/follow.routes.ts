import { Router } from 'express';
import {getFollowing, getFollowers, unfollowUser, followUser} from '../followFeature/follow.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

router.get('/:userId/following', authenticateToken, getFollowing);
router.get('/:userId/followers', authenticateToken, getFollowers);
router.post('/:userId/follow', authenticateToken, followUser);
router.delete('/:userId/unfollow', authenticateToken, unfollowUser);

export default router;