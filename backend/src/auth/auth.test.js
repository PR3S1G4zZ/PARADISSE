import request from 'supertest';
import { describe, expect, test } from 'vitest';
import { createApp } from '../app.js';
import { hashSessionToken } from './crypto.js';
import { createMemoryAuthStore } from './memory-store.js';
import { SESSION_COOKIE } from './cookies.js';

const registerBody = {
  name: 'Ana Pérez',
  email: 'ana@example.com',
  password: 'Viaje2026',
};

function authApp(overrides = {}) {
  return createApp({
    authStore: createMemoryAuthStore(),
    corsOrigin: 'http://localhost:5173',
    ...overrides,
  });
}

function cookieValue(response, name = SESSION_COOKIE) {
  const header = response.headers['set-cookie'];
  const lines = Array.isArray(header) ? header : header ? [header] : [];
  const match = lines.find((line) => line.startsWith(`${name}=`));
  if (!match) return null;
  return match.slice(name.length + 1).split(';')[0];
}

function cookieLine(response, name = SESSION_COOKIE) {
  const header = response.headers['set-cookie'];
  const lines = Array.isArray(header) ? header : header ? [header] : [];
  return lines.find((line) => line.startsWith(`${name}=`)) ?? '';
}

describe('auth API', () => {
  test('registers, reads /me, logs out, and rejects a later /me', async () => {
    const app = authApp();
    const agent = request.agent(app);

    const created = await agent.post('/api/auth/register').send(registerBody);
    expect(created.status).toBe(201);
    expect(created.body).toEqual({
      id: expect.any(String),
      name: 'Ana Pérez',
      email: 'ana@example.com',
    });
    expect(JSON.stringify(created.body)).not.toMatch(/password/i);
    expect(JSON.stringify(created.body)).not.toContain(registerBody.password);

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body).toEqual(created.body);

    const logout = await agent.post('/api/auth/logout');
    expect(logout.status).toBe(200);

    const after = await agent.get('/api/auth/me');
    expect(after.status).toBe(401);
    expect(after.body).toEqual({ error: 'No autenticado.' });
  });

  test('logs in with a normalized email and rejects a bad password', async () => {
    const app = authApp();
    await request(app).post('/api/auth/register').send(registerBody);

    const agent = request.agent(app);
    const login = await agent.post('/api/auth/login').send({
      email: ' Ana@Example.COM ',
      password: 'Viaje2026',
    });
    expect(login.status).toBe(200);
    expect(login.body.email).toBe('ana@example.com');

    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);

    const bad = await request(app).post('/api/auth/login').send({
      email: 'ana@example.com',
      password: 'otra-clave',
    });
    expect(bad.status).toBe(401);
    expect(bad.body).toEqual({ error: 'Correo o contraseña incorrectos.' });
    expect(JSON.stringify(bad.body)).not.toContain('Viaje2026');
  });

  test('rejects a duplicate email regardless of casing', async () => {
    const app = authApp();
    await request(app).post('/api/auth/register').send(registerBody);

    const duplicate = await request(app).post('/api/auth/register').send({
      name: 'Otra Ana',
      email: 'ANA@EXAMPLE.COM',
      password: 'Viaje2027',
    });

    expect(duplicate.status).toBe(409);
    expect(duplicate.body).toEqual({ error: 'El correo ya está registrado' });
  });

  test('validates email and password on the API', async () => {
    const app = authApp();

    const invalidEmail = await request(app).post('/api/auth/register').send({
      name: 'Ana',
      email: 'invalido',
      password: 'Viaje2026',
    });
    expect(invalidEmail.status).toBe(400);
    expect(invalidEmail.body).toEqual({ error: 'Ingresa un correo válido.' });

    const shortPassword = await request(app).post('/api/auth/login').send({
      email: 'ana@example.com',
      password: '',
    });
    expect(shortPassword.status).toBe(400);
    expect(shortPassword.body).toEqual({ error: 'Ingresa tu contraseña.' });
  });

  test('rate-limits login and register more tightly than public routes', async () => {
    const app = authApp({
      authCredentialRateLimit: { windowMs: 60_000, limit: 1 },
    });

    const first = await request(app).post('/api/auth/register').send(registerBody);
    const second = await request(app).post('/api/auth/login').send({
      email: registerBody.email,
      password: 'wrong-password',
    });

    expect(first.status).toBe(201);
    expect(second.status).toBe(429);
    expect(second.body).toEqual({ error: 'Límite temporal de solicitudes alcanzado.' });
  });

  test('sets HttpOnly SameSite=Lax cookies and Secure in production mode', async () => {
    const production = authApp({ cookieSecure: true });
    const development = authApp({ cookieSecure: false });

    const secure = await request(production).post('/api/auth/register').send(registerBody);
    const insecure = await request(development).post('/api/auth/register').send({
      ...registerBody,
      email: 'otra@example.com',
    });

    expect(cookieLine(secure)).toMatch(/HttpOnly/i);
    expect(cookieLine(secure)).toMatch(/SameSite=Lax/i);
    expect(cookieLine(secure)).toMatch(/Secure/i);
    expect(cookieLine(insecure)).toMatch(/HttpOnly/i);
    expect(cookieLine(insecure)).toMatch(/SameSite=Lax/i);
    expect(cookieLine(insecure)).not.toMatch(/Secure/i);
  });

  test('stores only the hash of the opaque session token', async () => {
    const authStore = createMemoryAuthStore();
    const app = createApp({ authStore, corsOrigin: 'http://localhost:5173' });

    const created = await request(app).post('/api/auth/register').send(registerBody);
    const token = decodeURIComponent(cookieValue(created));

    expect(token).toBeTruthy();
    const me = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `${SESSION_COOKIE}=${token}`);
    expect(me.status).toBe(200);

    const hashed = hashSessionToken(token);
    expect(hashed).not.toBe(token);
    expect(hashed).toHaveLength(64);
    expect(cookieLine(created)).not.toContain(hashed);
    expect(JSON.stringify(created.body)).not.toContain(token);
  });

  test('does not log passwords or raw tokens when auth fails', async () => {
    const entries = [];
    const app = createApp({
      authStore: {
        findUserByEmail: async () => {
          throw Object.assign(new Error('password=Viaje2026 token=raw-session-token'), { statusCode: 500 });
        },
      },
      logger: { error: (...args) => entries.push(args) },
    });

    const response = await request(app).post('/api/auth/login').send(registerBody);

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Error interno del servidor.' });
    expect(entries).toEqual([[
      '[api] request failed',
      {
        method: 'POST',
        path: '/api/auth/login',
        statusCode: 500,
      },
    ]]);
    expect(JSON.stringify(entries)).not.toContain('Viaje2026');
    expect(JSON.stringify(entries)).not.toContain('raw-session-token');
  });

  test('keeps CORS credentials on an explicit origin', async () => {
    const app = authApp();
    const response = await request(app)
      .post('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .send({ email: 'ana@example.com', password: 'Viaje2026' });

    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-credentials']).toBe('true');
  });

  test('returns 503 for auth routes when DATABASE_URL is not configured', async () => {
    const app = createApp({ authStore: null, databaseUrl: '' });
    const response = await request(app).post('/api/auth/register').send(registerBody);
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: 'Autenticación no disponible.' });
  });
});
