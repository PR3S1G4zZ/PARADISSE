import { Router } from 'express';
import { hashPassword, verifyPassword, createSessionToken, hashSessionToken } from '../auth/crypto.js';
import { SESSION_COOKIE, sessionCookieOptions, readSessionToken } from '../auth/cookies.js';
import { validateLoginBody, validateRegisterBody } from '../auth/validation.js';

function toPublicUser(user) {
  return { id: user.id ?? user.userId, name: user.name, email: user.email };
}

export function createAuthRouter({
  store = null,
  cookieSecure = false,
  sessionTtlMs,
  now = () => new Date(),
} = {}) {
  const router = Router();

  const cookieOptions = () => sessionCookieOptions({
    secure: cookieSecure,
    maxAgeMs: sessionTtlMs,
  });

  const requireStore = (_request, response, next) => {
    if (!store) {
      return response.status(503).json({ error: 'Autenticación no disponible.' });
    }
    return next();
  };

  router.use(requireStore);

  async function issueSession(response, userId) {
    const token = createSessionToken();
    const expiresAt = new Date(now().getTime() + sessionTtlMs);
    await store.createSession({
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt,
    });
    response.cookie(SESSION_COOKIE, token, cookieOptions());
  }

  async function currentUser(request) {
    const token = readSessionToken(request);
    if (!token) return null;
    return store.findValidSessionByTokenHash(hashSessionToken(token), now());
  }

  router.post('/register', async (request, response, next) => {
    try {
      const parsed = validateRegisterBody(request.body);
      if (parsed.error) {
        return response.status(400).json({ error: parsed.error });
      }

      const passwordHash = await hashPassword(parsed.password);
      const user = await store.createUser({
        name: parsed.name,
        email: parsed.email,
        passwordHash,
      });
      await issueSession(response, user.id);
      return response.status(201).json(toPublicUser(user));
    } catch (error) {
      if (error?.statusCode === 409) {
        return response.status(409).json({ error: error.message });
      }
      return next(error);
    }
  });

  router.post('/login', async (request, response, next) => {
    try {
      const parsed = validateLoginBody(request.body);
      if (parsed.error) {
        return response.status(400).json({ error: parsed.error });
      }

      const user = await store.findUserByEmail(parsed.email);
      const passwordOk = await verifyPassword(parsed.password, user?.passwordHash);
      if (!user || !passwordOk) {
        return response.status(401).json({ error: 'Correo o contraseña incorrectos.' });
      }

      await issueSession(response, user.id);
      return response.json(toPublicUser(user));
    } catch (error) {
      return next(error);
    }
  });

  router.post('/logout', async (request, response, next) => {
    try {
      const token = readSessionToken(request);
      if (token) {
        await store.deleteSessionByTokenHash(hashSessionToken(token));
      }
      response.clearCookie(SESSION_COOKIE, sessionCookieOptions({
        secure: cookieSecure,
        maxAgeMs: 0,
      }));
      return response.json({ ok: true });
    } catch (error) {
      return next(error);
    }
  });

  router.get('/me', async (request, response, next) => {
    try {
      const user = await currentUser(request);
      if (!user) {
        return response.status(401).json({ error: 'No autenticado.' });
      }
      return response.json(toPublicUser(user));
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
