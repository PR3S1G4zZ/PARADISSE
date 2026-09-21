import { randomUUID } from 'node:crypto';

export function createMemoryAuthStore() {
  const users = new Map();
  const sessions = new Map();

  return {
    async findUserByEmail(email) {
      return [...users.values()].find((user) => user.email === email) ?? null;
    },

    async createUser({ name, email, passwordHash }) {
      if ([...users.values()].some((user) => user.email === email)) {
        const error = Object.assign(new Error('El correo ya está registrado'), { statusCode: 409 });
        throw error;
      }
      const user = {
        id: randomUUID(),
        name,
        email,
        passwordHash,
      };
      users.set(user.id, user);
      return { id: user.id, name: user.name, email: user.email };
    },

    async createSession({ userId, tokenHash, expiresAt }) {
      const session = {
        id: randomUUID(),
        userId,
        tokenHash,
        expiresAt,
      };
      sessions.set(tokenHash, session);
      return session;
    },

    async findValidSessionByTokenHash(tokenHash, now) {
      const session = sessions.get(tokenHash);
      if (!session || session.expiresAt <= now) return null;
      const user = users.get(session.userId);
      if (!user) return null;
      return {
        id: user.id,
        name: user.name,
        email: user.email,
      };
    },

    async deleteSessionByTokenHash(tokenHash) {
      sessions.delete(tokenHash);
    },
  };
}
