import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || 'defaultsecret';

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export function generateToken(payload: object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

export function validatePassword(password: string): boolean {
  //   (?=.*[a-z])  → at least one lowercase
  //   (?=.*[A-Z])  → at least one uppercase
  //   (?=.*\W)     → at least one non-word character (special)
  //   .{8,}        → at least 8 total chars
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\W).{8,}$/;
  return re.test(password);
}
