import request from 'supertest';
import app from '../src/app'; // Adjust if your file path differs

describe('Auth Endpoints', () => {
  const testUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'testpass123'
  };

  let token: string;

  it('should register a new user', async () => {
    const res = await request(app).post('/api/auth/signup').send(testUser);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toEqual(testUser.email);
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
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.email).toEqual(testUser.email);
  });

  it('should reject access without token', async () => {
    const res = await request(app).get('/api/auth/profile');

    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('error');
  });

  it('should reject access with invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer invalidtoken');

    expect(res.statusCode).toEqual(403);
    expect(res.body).toHaveProperty('error');
  });
});
