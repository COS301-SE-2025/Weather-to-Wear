import express, { Request } from 'express';
import { signup, login } from './auth.controller';
// use middleware on a test route
import { authenticateToken } from './auth.middleware';

const router = express.Router();

// use middleware on a test route
interface AuthenticatedRequest extends Request {
  user?: any;
}

router.post('/signup', signup);
router.post('/login', login); 

// use middleware on a test route
router.get('/profile', authenticateToken, (req: AuthenticatedRequest, res) => {
  res.status(200).json({
    message: 'You are authenticated!',
    user: req.user
  });
});

export default router;
