// import express, { Request } from 'express';
// import { signup, login , deleteUser } from './auth.controller';
// // use middleware on a test route
// import { authenticateToken } from './auth.middleware';

// const router = express.Router();

// // use middleware on a test route
// interface AuthenticatedRequest extends Request {
//   user?: any;
// }

// router.post('/signup', signup);
// router.post('/login', login); 
// router.post('/delete', deleteUser);

// // use middleware on a test route
// router.get('/profile', authenticateToken, (req: AuthenticatedRequest, res) => {
//   res.status(200).json({
//     message: 'You are authenticated!',
//     user: req.user
//   });
// });

// export default router;

import express, { Request } from 'express';
import { signup, login, deleteUser } from './auth.controller';
import { authenticateToken, signupPasswordValidation } from './auth.middleware';

const router = express.Router();

interface AuthenticatedRequest extends Request {
  user?: any;
}

// now runs the password‐check first, then your signup logic
router.post('/signup', signupPasswordValidation, signup);
router.delete('/users/:id', authenticateToken, deleteUser);
router.post('/login', login);

router.delete(
  '/users/:id',
  authenticateToken,
  deleteUser
);

router.get(
  '/profile',
  authenticateToken,
  (req: AuthenticatedRequest, res) => {
    res.status(200).json({
      message: 'You are authenticated!',
      user: req.user
    });
  }
);

export default router;
