import { Router } from 'express';
import { authenticateToken } from '../auth/auth.middleware';
import { createOrUpdate, getOne, patchOne} from './daySelection.controller';

const router = Router();
router.post('/', authenticateToken, async (req, res, next) => {
	try {
		await createOrUpdate(req, res);
	} catch (err) {
		next(err);
	}
});      
router.get('/', authenticateToken, async (req, res, next) => {
	try {
		await getOne(req, res);
	} catch (err) {
		next(err);
	}
});               // ?date=YYYY-MM-DD
router.patch('/:id', authenticateToken, async (req, res, next) => {
	try {
		await patchOne(req, res);
	} catch (err) {
		next(err);
	}
});        // partial updates
export default router;
