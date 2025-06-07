import { Request, Response } from 'express';
import { registerUser, loginUser, removeUser } from './auth.service';
import { generateToken } from './auth.utils';

export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const user = await registerUser(name, email, password);
    const token = generateToken({ id: user.id, email: user.email }); 

    res.status(201).json({
      message: 'User registered successfully',
      token, 
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

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.params.id;

    if (!userId) {
      res.status(400).json({ error: 'Missing user ID' });
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
    res.status(400).json({ error: err.message });
  }
};
