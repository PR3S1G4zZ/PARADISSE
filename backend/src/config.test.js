import { describe, expect, test } from 'vitest';
import { resolveCorsOrigin } from './config.js';

describe('resolveCorsOrigin', () => {
  test('keeps wildcard CORS in local development', () => {
    expect(resolveCorsOrigin('*', 'development')).toBe('*');
    expect(resolveCorsOrigin('*', 'test')).toBe('*');
  });

  test('defaults to the local Vite origin when unset', () => {
    expect(resolveCorsOrigin('', 'production')).toBe('http://localhost:5173');
    expect(resolveCorsOrigin(undefined, 'development')).toBe('http://localhost:5173');
  });

  test('rejects CORS_ORIGIN=* in production', () => {
    expect(() => resolveCorsOrigin('*', 'production')).toThrow(
      'CORS_ORIGIN=* is not allowed in production. Set an explicit origin.',
    );
    expect(() => resolveCorsOrigin(' * ', 'production')).toThrow(/CORS_ORIGIN=\*/);
  });

  test('allows an explicit production origin', () => {
    expect(resolveCorsOrigin('https://paradisse.example', 'production')).toBe(
      'https://paradisse.example',
    );
  });
});
