import { Router } from 'express';
import UserPrefController from './userPref.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

router.get(
    '/api/preferences',
    authenticateToken,
    UserPrefController.getUserPref

);

router.put(
    '/api/preferences',
    authenticateToken,
    UserPrefController.updateUserPref
);

export default router;