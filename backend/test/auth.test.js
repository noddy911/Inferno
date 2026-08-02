import './with-db.js';
import { describe, it, expect, afterAll, vi } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/user.model.js';
import * as EmailService from '../src/services/email.service.js';
import { stopDb } from './with-db.js';

const registerBody = { name: 'Test User', email: 'test@example.com', password: 'Password123' };

async function login() {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: registerBody.email, password: registerBody.password })
    .expect(200);
  return res.body.data;
}

describe('Auth API', () => {
  afterAll(async () => {
    await User.deleteMany({});
    await stopDb();
  });

  it('registers a new account and returns tokens', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(registerBody).expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(registerBody.email);
    expect(res.body.data.user.role).toBe('client');
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
  });

  it('rejects an invalid registration body with 400', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ name: 'A' }).expect(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/api/v1/auth/register').send(registerBody).expect(409);
  });

  it('rejects invalid credentials with 401', async () => {
    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: registerBody.email, password: 'WrongPassword1' })
      .expect(401);
  });

  it('logs in and returns tokens', async () => {
    const data = await login();
    expect(data.accessToken).toBeTruthy();
    expect(data.refreshToken).toBeTruthy();
  });

  it('returns the authenticated user via /me', async () => {
    const { accessToken } = await login();
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.user.email).toBe(registerBody.email);
  });

  it('rejects /me without a token', async () => {
    await request(app).get('/api/v1/auth/me').expect(401);
  });

  it('rotates the refresh token on refresh', async () => {
    const { refreshToken } = await login();
    const res = await request(app)
      .post('/api/v1/auth/refresh-token')
      .send({ refreshToken })
      .expect(200);

    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).not.toBe(refreshToken);
  });

  it('rejects a refresh token that was already used (rotation)', async () => {
    const { refreshToken } = await login();
    await request(app).post('/api/v1/auth/refresh-token').send({ refreshToken }).expect(200);
    // Replaying the same token must fail.
    await request(app).post('/api/v1/auth/refresh-token').send({ refreshToken }).expect(401);
  });

  it('revokes the refresh token on logout', async () => {
    const { refreshToken } = await login();
    await request(app).post('/api/v1/auth/logout').send({ refreshToken }).expect(200);
    await request(app).post('/api/v1/auth/refresh-token').send({ refreshToken }).expect(401);
  });

  it('forgot-password returns 200 and reset-password works end to end', async () => {
    const spy = vi.spyOn(EmailService, 'sendResetPasswordEmail').mockResolvedValue(undefined);

    await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: registerBody.email })
      .expect(200);

    const token = spy.mock.calls[0][1];
    expect(token).toBeTruthy();

    await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'NewPassword123' })
      .expect(200);

    // Old password no longer works, new one does.
    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: registerBody.email, password: registerBody.password })
      .expect(401);
    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: registerBody.email, password: 'NewPassword123' })
      .expect(200);

    spy.mockRestore();
  });

  it('rejects reset-password with an invalid token', async () => {
    await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'bogus', password: 'AnotherPass123' })
      .expect(400);
  });
});
