import { User } from './auth.types';
import { comparePasswords, hashPassword } from './auth.utils';
import { v4 as uuidv4 } from 'uuid';

const users: User[] = []; // Mock DB

export async function registerUser(name: string, email: string, password: string): Promise<User> {
  const existing = users.find((u) => u.email === email);
  if (existing) throw new Error('User already exists');

  const hashedPassword = await hashPassword(password);
  const newUser: User = {
    id: uuidv4(),
    name,
    email,
    password: hashedPassword
  };

  users.push(newUser);
  return newUser;
}

export async function loginUser(email: string, password: string): Promise<User> {
  const user = users.find((u) => u.email === email);
  if (!user) throw new Error('User not found');

  const match = await comparePasswords(password, user.password);
  if (!match) throw new Error('Invalid credentials');

  return user;
}
