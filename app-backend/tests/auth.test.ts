import request from 'supertest';
import app from '../src/app';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Reset DB before tests
  execSync('npx prisma migrate reset --force --skip-generate --skip-seed', { stdio: 'inherit' });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Auth Endpoints', () => {
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'testPass123'
  };

  let token: string;
  let userId: string;

  it('should register a new user', async () => {
    const res = await request(app).post('/api/auth/signup').send(testUser);
    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toEqual(testUser.email);
    userId = res.body.user.id;
  });

  it('should log in the user and return a token', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: testUser.email,
      password: testUser.password
    });
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    token = res.body.token;
  });

  it('should access protected route with token', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body.user.email).toEqual(testUser.email);
  });

  it('should reject access without token', async () => {
    const res = await request(app).get('/api/auth/profile');
    expect(res.statusCode).toEqual(401);
  });

  it('should reject access with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer invalidtoken');
    expect(res.statusCode).toEqual(403);
  });

  it('should fail signup with invalid email', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Invalid Email User',
      email: 'invalid-email',
      password: 'Password1'
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Invalid email format/i);
  });

  it('should fail signup with weak password', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      name: 'Weak Password User',
      email: 'weak@example.com',
      password: 'abc'
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Password must be at least 8 characters/i);
  });

  it('should fail signup with missing name', async () => {
    const res = await request(app).post('/api/auth/signup').send({
      email: 'missing@example.com',
      password: 'Password1'
    });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Missing required fields/i);
  });

  it('should delete the authenticated user', async () => {
    const res = await request(app)
      .delete(`/api/auth/users/${userId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/User deleted successfully/i);
    expect(res.body.user.id).toBe(userId);
  });

  it('should fail to delete without token', async () => {
    const res = await request(app).delete(`/api/auth/users/${userId}`);
    expect(res.statusCode).toBe(401);
  });

  // it('should fail to delete with invalid UUID format', async () => {
  //   const res = await request(app)
  //     .delete(`/api/auth/users/invalid-id`)
  //     .set('Authorization', `Bearer ${token}`);
  //   expect(res.statusCode).toBe(404);
  //   expect(res.body.error).toMatch(/Invalid user ID format/i);
  // });
});
