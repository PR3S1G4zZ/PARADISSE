import { createHash, randomBytes } from 'node:crypto';
import { argon2id, argon2Verify } from 'hash-wasm';

const isTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);

const ARGON2ID = {
  iterations: isTest ? 2 : 3,
  parallelism: 1,
  memorySize: isTest ? 4096 : 65_536,
  hashLength: 32,
  outputType: 'encoded',
};

let dummyHashPromise;

function dummyHash() {
  dummyHashPromise ??= hashPassword('paradisse-timing-dummy');
  return dummyHashPromise;
}

export function createSessionToken() {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

export function hashPassword(password) {
  return argon2id({
    password,
    salt: randomBytes(16),
    ...ARGON2ID,
  });
}

export async function verifyPassword(password, passwordHash) {
  const hash = passwordHash ?? await dummyHash();
  try {
    return await argon2Verify({ password, hash });
  } catch {
    return false;
  }
}
