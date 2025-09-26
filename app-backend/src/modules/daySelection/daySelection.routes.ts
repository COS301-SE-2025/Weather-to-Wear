import { Router } from 'express';
import { authenticateToken } from '../auth/auth.middleware';
import { createOrUpdate, getOne, patchOne} from './daySelection.controller';
import { deleteOneByDate } from './daySelection.controller';

const router = Router();
router.post('/', authenticateToken, async (req, res, next) => {
	try {
		await createOrUpdate(req, res);
	} catch (err) {
		next(err);
	}
});   
   
router.get('/:date', authenticateToken, async (req, res, next) => {
  try {
    (req as any).query = { date: req.params.date };
    await getOne(req, res);
  } catch (err) { next(err); }
});

router.get('/', authenticateToken, async (req, res, next) => {
  try {
    await getOne(req, res); 
  } catch (err) { next(err); }
});

router.patch('/:id', authenticateToken, async (req, res, next) => {
	try {
		await patchOne(req, res);
	} catch (err) {
		next(err);
	}
});        // partial updates
export default router;

router.delete('/:date', authenticateToken, async (req, res, next) => {
  try { await deleteOneByDate(req, res); } catch (err) { next(err); }
});