import { Router } from 'express';
import UserPrefController from '../userPreference/userPref.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

router.get(
    '/',
    authenticateToken,
    UserPrefController.getUserPref

);

router.put(
    '/',
    authenticateToken,
    UserPrefController.updateUserPref
);

export default router;