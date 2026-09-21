export function createPostgresAuthStore(pool) {
  return {
    async findUserByEmail(email) {
      const { rows } = await pool.query(
        'SELECT id, name, email, password_hash AS "passwordHash" FROM users WHERE email = $1 LIMIT 1',
        [email],
      );
      return rows[0] ?? null;
    },

    async createUser({ name, email, passwordHash }) {
      try {
        const { rows } = await pool.query(
          'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
          [name, email, passwordHash],
        );
        return rows[0];
      } catch (error) {
        if (error?.code === '23505') {
          throw Object.assign(new Error('El correo ya está registrado'), { statusCode: 409 });
        }
        throw error;
      }
    },

    async createSession({ userId, tokenHash, expiresAt }) {
      const { rows } = await pool.query(
        'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING id',
        [userId, tokenHash, expiresAt],
      );
      return rows[0];
    },

    async findValidSessionByTokenHash(tokenHash, now) {
      const { rows } = await pool.query(
        `SELECT u.id, u.name, u.email
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = $1 AND s.expires_at > $2
         LIMIT 1`,
        [tokenHash, now],
      );
      return rows[0] ?? null;
    },

    async deleteSessionByTokenHash(tokenHash) {
      await pool.query('DELETE FROM sessions WHERE token_hash = $1', [tokenHash]);
    },
  };
}
