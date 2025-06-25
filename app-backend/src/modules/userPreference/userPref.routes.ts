import { Router } from 'express';
import { getMyPreferences, updatePreferences } from '../userPreference/userPref.controller';
import { authenticateToken } from '../auth/auth.middleware';

const router = Router();

router.get('/', authenticateToken, getMyPreferences);

router.put('/', authenticateToken, updatePreferences);

export default router;
