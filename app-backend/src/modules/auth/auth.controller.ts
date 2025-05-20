import { Request, Response } from 'express';
import { registerUser, loginUser, removeUser } from './auth.service';
import { generateToken } from './auth.utils';
import { User } from './auth.types';

interface AuthenticatedRequest extends Request {
  user?: User;
}

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const user = await registerUser(name, email, password);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Missing email or password' });
      return;
    }

    const user = await loginUser(email, password);
    const token = generateToken({ id: user.id, email: user.email });

    res.status(200).json({
      message: 'Login successful',
      token,  
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err: any) {
    res.status(401).json({ error: err.message });
  }
};

export const deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.params.id; // Changed from req.body.userId to match route parameter
    console.log('Delete request for userId:', userId, 'by user:', req.user);
    
    if (!userId) {
      res.status(400).json({ error: 'Missing user ID' });
      return;
    }

    // Type safety with User interface
    const authenticatedUser = req.user as User;
    
    if (authenticatedUser.id !== userId) {
      res.status(403).json({ error: 'Cannot delete another user\'s account' });
      return;
    }

    const deletedUser = await removeUser(userId);
    res.status(200).json({
      message: 'User deleted successfully',
      user: {
        id: deletedUser.id,
        name: deletedUser.name,
        email: deletedUser.email
      }
    });
  } catch (err: any) {
    console.error('Delete error:', err);
    res.status(err.message === 'User not found' ? 404 : 400).json({ error: err.message });
  }
};