import { PrismaClient, User } from '@prisma/client';
import { comparePasswords, hashPassword } from './auth.utils';

const prisma = new PrismaClient();

export async function registerUser(name: string, email: string, password: string): Promise<User> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new Error('User already exists');

  const hashedPassword = await hashPassword(password);

  const newUser = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword
    }
  });

  return newUser;
}

export async function loginUser(email: string, password: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error('User not found');

  const match = await comparePasswords(password, user.password);
  if (!match) throw new Error('Invalid credentials');

  return user;
}
