import { Request, Response } from 'express';
import { registerUser, loginUser, removeUser } from './auth.service';
import { generateToken } from './auth.utils';

interface AuthenticatedRequest extends Request {
  user?: any;
}

// Validation helper functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number, allows special characters
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
  return passwordRegex.test(password);
};

const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    // Check for missing fields
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Missing required fields: name, email, password' });
      return;
    }

    // Validate field formats
    if (typeof name !== 'string' || name.length < 2 || name.length > 50) {
      res.status(400).json({ error: 'Name must be a string between 2 and 50 characters' });
      return;
    }
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }
    if (!isValidPassword(password)) {
      res.status(400).json({
        error: 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number. Special characters are allowed.'
      });
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

    // Check for missing fields
    if (!email || !password) {
      res.status(400).json({ error: 'Missing email or password' });
      return;
    }

    // Validate field formats
    if (!isValidEmail(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }
    if (typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
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
    const userId = req.user.id; // Use authenticated user's ID
    console.log('Delete request for userId:', userId, 'by user:', req.user);

    // Validate userId from JWT
    if (!userId) {
      res.status(401).json({ error: 'No authenticated user found' });
      return;
    }
    if (!isValidUUID(userId)) {
      res.status(400).json({ error: 'Invalid user ID format' });
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