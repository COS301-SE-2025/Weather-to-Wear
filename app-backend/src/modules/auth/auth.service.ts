import { User } from './auth.types';
import { hashPassword } from './auth.utils';
import { v4 as uuidv4 } from 'uuid';

const users: User[] = []; // Mock DB for now, create actual DB later

export async function registerUser(name: string, email: string, password: string): Promise<User> {
  // check if da user already exists
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
