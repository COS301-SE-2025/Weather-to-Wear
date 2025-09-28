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
    // Create a new request object with the date parameter as query
    const modifiedReq = { ...req, query: { ...req.query, date: req.params.date } };
    await getOne(modifiedReq as any, res);
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